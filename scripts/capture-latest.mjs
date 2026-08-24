import { chromium } from 'playwright'
import path from 'node:path'

const out = path.resolve('review-screenshots')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })

async function login(identifier, password) {
  await page.goto('http://localhost:5173/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('http://localhost:5173/login')
  await page.locator('input').first().fill(identifier)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: /đăng nhập/i }).click()
  await page.waitForTimeout(1000)
}
async function shot(name, url) {
  await page.goto(url)
  await page.waitForTimeout(1300)
  await page.screenshot({ path: path.join(out, name), fullPage: true })
}

await shot('15-home-commerce-refresh.png', 'http://localhost:5173/')
await login('admin@voucherhub.com', 'DemoAdmin123!')
await shot('16-admin-pending-partners.png', 'http://localhost:5173/admin/partners')
await shot('17-admin-pending-vouchers.png', 'http://localhost:5173/admin/vouchers')
await shot('18-admin-orders-live-data.png', 'http://localhost:5173/admin/orders')
await login('owner@goldengate.vn', '12345678')
await shot('19-partner-dashboard-refresh.png', 'http://localhost:5173/partner')
await shot('20-profile-initial-avatar.png', 'http://localhost:5173/profile')
await browser.close()
