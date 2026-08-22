import { expect, test, type Page } from '@playwright/test'
import { E2E_PASSWORD, e2eUsers } from './fixtures/task004'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email|phone/i).fill(e2eUsers.partner.email)
  await page.getByLabel(/mật khẩu|password/i).fill(E2E_PASSWORD)
  await page.getByRole('button', { name: /log in|đăng nhập/i }).click()
  await expect(page).toHaveURL(/\/partner$/)
}

test('@FLOW-007 partner validates and redeems an issued voucher code', async ({ page }) => {
  await login(page)
  await page.goto('/partner/redeem?code=VH-E2E-REDEEM-001')
  await page.getByTestId('validate-code-btn').click()
  await expect(page.getByTestId('code-status')).toContainText('Mã hợp lệ')
  await page.getByTestId('branch-select').selectOption({ index: 1 })
  await page.getByTestId('confirm-redeem-btn').click()
  await expect(page.getByTestId('redeem-success')).toContainText('Đã xác nhận sử dụng mã')
})

test('@FLOW-008 partner sees scoped live business report', async ({ page }) => {
  await login(page)
  await page.goto('/partner/reports')
  await expect(page.getByRole('heading', { name: 'Hiệu quả kinh doanh' })).toBeVisible()
  await expect(page.getByTestId('partner-report-table')).toContainText('E2E Redeem Voucher')
  await expect(page.getByText('80.000 ₫').first()).toBeVisible()
})
