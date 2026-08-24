import { chromium } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import path from 'node:path'

const prisma = new PrismaClient()
const baseURL = 'http://127.0.0.1:5173'
const secret = 'dev-only-secret-change-me'
const tokenFor = (sub: string, role: string, partnerId?: string) =>
  jwt.sign({ sub, role, partnerId, ver: 0 }, secret, {
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer: 'voucherhub-api',
    audience: 'voucherhub-client'
  })

async function contextFor(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  user: { id: string; fullName: string; role: { name: string } },
  partnerId?: string
) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
  const isAdmin = ['QUAN_TRI_VIEN', 'ADMIN'].includes(user.role.name)
  await context.addInitScript(
    ({ token, profile }) => {
      sessionStorage.setItem('v_access_token', token)
      localStorage.setItem('voucher_system_auth_user', JSON.stringify(profile))
    },
    {
      token: tokenFor(user.id, isAdmin ? 'ADMIN' : 'PARTNER', partnerId),
      profile: { id: user.id, name: user.fullName, role: isAdmin ? 'ADMIN' : 'PARTNER' }
    }
  )
  return context
}

async function partnerContextForLogin(browser: Awaited<ReturnType<typeof chromium.launch>>, email: string) {
  const response = await fetch('http://127.0.0.1:4000/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: email, password: '12345678' })
  })
  const payload = (await response.json()) as { data: { token: string; user: { id: string; role: string } } }
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
  await context.addInitScript(
    ({ token, user }) => {
      sessionStorage.setItem('v_access_token', token)
      localStorage.setItem(
        'voucher_system_auth_user',
        JSON.stringify({ id: user.id, name: 'Đối tác VoucherHub', role: user.role })
      )
    },
    { token: payload.data.token, user: payload.data.user }
  )
  return context
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: { name: { in: ['QUAN_TRI_VIEN', 'ADMIN'] } } },
    include: { role: true }
  })
  const adminContext = await contextFor(browser, admin)
  const adminPage = await adminContext.newPage()
  adminPage.on('pageerror', (error) => console.error('ADMIN_PAGE_ERROR', error.message))
  adminPage.on('console', (message) => message.type() === 'error' && console.error('ADMIN_CONSOLE', message.text()))
  await adminPage.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' })
  await adminPage.mouse.move(1100, 500)
  await adminPage.screenshot({
    path: path.resolve('review-screenshots/10-admin-dashboard-analytics.png'),
    fullPage: true
  })

  const code = await prisma.issuedVoucherCode.findFirstOrThrow({
    where: {
      status: 'UNUSED',
      voucherProduct: { partner: { owner: { email: 'owner@goldengate.vn' }, branches: { some: {} } } }
    },
    include: { voucherProduct: { include: { partner: { include: { owner: { include: { role: true } } } } } } }
  })
  const partner = code.voucherProduct.partner
  const partnerContext = await partnerContextForLogin(browser, partner.owner.email!)
  const partnerPage = await partnerContext.newPage()
  partnerPage.on('pageerror', (error) => console.error('PARTNER_PAGE_ERROR', error.message))
  partnerPage.on('request', (request) => {
    if (request.url().includes('redeem-code')) console.error('REDEEM_REQUEST', request.postData())
  })
  partnerPage.on('response', async (response) => {
    if (response.url().includes('redeem-code'))
      console.error('REDEEM_RESPONSE', response.status(), await response.text())
  })
  await partnerPage.goto(`${baseURL}/partner`, { waitUntil: 'networkidle' })
  await partnerPage.screenshot({
    path: path.resolve('review-screenshots/11-partner-dashboard-data.png'),
    fullPage: true
  })
  await partnerPage.goto(`${baseURL}/partner/branches`, { waitUntil: 'networkidle' })
  await partnerPage.screenshot({
    path: path.resolve('review-screenshots/12-partner-branches-data.png'),
    fullPage: true
  })
  await partnerPage.goto(`${baseURL}/partner/vouchers`, { waitUntil: 'networkidle' })
  await partnerPage.screenshot({
    path: path.resolve('review-screenshots/13-partner-vouchers-data.png'),
    fullPage: true
  })
  await partnerPage.goto(`${baseURL}/partner/redeem?code=${code.code}`, { waitUntil: 'networkidle' })
  const options = partnerPage.locator('#redeem-branch option')
  if ((await options.count()) > 1) {
    await partnerPage.locator('#redeem-branch').selectOption({ index: 1 })
    await partnerPage.getByRole('button', { name: 'Xác nhận sử dụng' }).click()
    await partnerPage.waitForTimeout(1200)
    if (
      await partnerPage
        .getByTestId('redeem-error')
        .isVisible()
        .catch(() => false)
    )
      console.error('REDEEM_ERROR', await partnerPage.getByTestId('redeem-error').textContent())
  }
  await partnerPage.mouse.move(1100, 500)
  await partnerPage.screenshot({
    path: path.resolve('review-screenshots/14-partner-redeem-success.png'),
    fullPage: true
  })
  await browser.close()
}

main().finally(() => prisma.$disconnect())
