import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = 'http://127.0.0.1:5173'
const outputDir = path.resolve('review-screenshots')

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const page = await context.newPage()

  const login = await context.request.post(`${baseURL}/api/auth/login`, {
    data: { identifier: 'customer@gmail.com', password: '12345678' }
  })
  if (!login.ok()) throw new Error(`Login failed: ${login.status()} ${await login.text()}`)
  const loginBody = await login.json()
  const token = loginBody.data.token as string

  const profileResponse = await context.request.get(`${baseURL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const profile = (await profileResponse.json()).data

  await page.addInitScript(
    ({ accessToken, user }) => {
      sessionStorage.setItem('v_access_token', accessToken)
      localStorage.setItem('voucher_system_auth_user', JSON.stringify(user))
    },
    { accessToken: token, user: { id: profile.id, name: profile.fullName, role: profile.role.name } }
  )

  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' })
  await page.mouse.move(720, 500)
  await page.screenshot({ path: path.join(outputDir, '00-trang-chu-moi.png'), fullPage: true })

  await page.goto(`${baseURL}/search`, { waitUntil: 'networkidle' })
  await page.mouse.move(720, 500)
  const topPixel = await page.evaluate(() => {
    const element = document.elementFromPoint(2, 2)
    if (!element) return null
    const style = getComputedStyle(element)
    return {
      tag: element.tagName,
      id: element.id,
      className: element.className,
      background: style.backgroundColor,
      borderTop: style.borderTop
    }
  })
  console.log('TOP_PIXEL', JSON.stringify(topPixel))
  await page.screenshot({ path: path.join(outputDir, '01-kham-pha-voucher.png'), fullPage: true })

  await page.selectOption('#filter-category', { label: 'Cà phê & Trà sữa' })
  await page.getByRole('button', { name: 'Tìm kiếm' }).click()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(outputDir, '02-ket-qua-tim-kiem.png'), fullPage: true })

  const cartBefore = await context.request.get(`${baseURL}/api/cart`, { headers: { Authorization: `Bearer ${token}` } })
  const cartPayload = (await cartBefore.json()).data
  let addedItemId: number | null = null
  if (!cartPayload.items?.length) {
    const vouchers = await context.request.get(`${baseURL}/api/vouchers?limit=1`)
    const voucherId = (await vouchers.json()).data.vouchers[0].id
    const added = await context.request.post(`${baseURL}/api/cart/items`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { voucherProductId: voucherId, quantity: 1 }
    })
    const addedCart = (await added.json()).data
    addedItemId = addedCart.items[0]?.id ?? null
  }

  await page.goto(`${baseURL}/cart`, { waitUntil: 'networkidle' })
  await page.mouse.move(720, 500)
  await page.screenshot({ path: path.join(outputDir, '03-gio-hang.png'), fullPage: true })
  await page.goto(`${baseURL}/cart?tab=orders`, { waitUntil: 'networkidle' })
  await page.mouse.move(720, 500)
  await page.screenshot({ path: path.join(outputDir, '03b-don-da-mua-trong-gio-hang.png'), fullPage: true })
  await page.goto(`${baseURL}/checkout`, { waitUntil: 'networkidle' })
  await page.mouse.move(720, 500)
  await page.screenshot({ path: path.join(outputDir, '04-thanh-toan.png'), fullPage: true })
  await page.goto(`${baseURL}/profile`, { waitUntil: 'networkidle' })
  await page.mouse.move(720, 500)
  await page.screenshot({ path: path.join(outputDir, '05-tai-khoan.png'), fullPage: true })
  await page.getByRole('tab', { name: /Bảo mật/ }).click()
  await page.screenshot({ path: path.join(outputDir, '05b-bao-mat-tai-khoan.png'), fullPage: true })

  if (addedItemId != null) {
    await context.request.delete(`${baseURL}/api/cart/items/${addedItemId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  }

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
