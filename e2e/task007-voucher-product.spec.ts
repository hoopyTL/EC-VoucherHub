import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { E2E_PASSWORD, e2eUsers } from './fixtures/task004'

const apiBaseUrl = 'http://127.0.0.1:4100/api'
const voucherName = 'E2E Voucher Product'

test.setTimeout(60_000)

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel(/email|phone/i).fill(email)
  await page.getByLabel(/mật khẩu|password/i).fill(E2E_PASSWORD)
  await page.getByRole('button', { name: /log in|đăng nhập/i }).click()
}

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { identifier: email, password: E2E_PASSWORD }
  })
  expect(response.status()).toBe(200)
  return (await response.json()).data.token as string
}

function localDateTime(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

test('@FLOW-006 partner creates a voucher, admin approves and publishes it, then partner pauses it', async ({
  page,
  request
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await login(page, e2eUsers.partner.email)
  await expect(page).toHaveURL(/\/partner$/)
  await page.getByRole('link', { name: 'Voucher', exact: true }).click()
  await page.getByRole('link', { name: 'Tạo voucher' }).click()
  await page.getByLabel('Tiêu đề').fill(voucherName)
  await page.getByLabel('Mô tả').fill('Voucher được tạo bởi kiểm thử E2E FLOW-006.')
  await page.getByLabel('Danh mục').selectOption({ label: 'E2E Ẩm thực' })
  await page.getByLabel('Giá gốc').fill('500000')
  await page.getByLabel('Giá bán').fill('350000')
  await page.getByLabel('Tổng số lượng').fill('100')
  await page.getByLabel('Bắt đầu mở bán').fill(localDateTime(1))
  await page.getByLabel('Kết thúc mở bán').fill(localDateTime(30))
  await page.getByLabel('Bắt đầu sử dụng').fill(localDateTime(1))
  await page.getByLabel('Kết thúc sử dụng').fill(localDateTime(60))
  await page.getByLabel(/E2E Main Branch/).check()

  const createResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/vouchers') && response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  const created = await createResponse
  expect(created.status()).toBe(201)
  const voucherId = ((await created.json()).data.id ?? '') as string
  await expect(page).toHaveURL(/\/partner\/vouchers$/)
  await expect(page.getByText(voucherName)).toBeVisible()

  const submitResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/vouchers/${voucherId}/submission`)
  )
  await page.getByTestId(`voucher-row-${voucherId}`).getByRole('button', { name: 'Gửi duyệt' }).click()
  expect((await submitResponse).status()).toBe(200)
  await expect(page.getByTestId(`voucher-row-${voucherId}`)).toContainText('Chờ duyệt')

  await page.getByRole('button', { name: /log out|đăng xuất/i }).click()
  await login(page, e2eUsers.admin.email)
  await page.getByRole('link', { name: 'Duyệt voucher' }).click()
  await expect(page.getByText(voucherName)).toBeVisible()
  const approvalResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/admin/vouchers/${voucherId}/approval`)
  )
  await page.getByRole('button', { name: `Approve ${voucherName}` }).click()
  expect((await approvalResponse).status()).toBe(200)
  await expect(page.getByText(new RegExp(`${voucherName}.*has been approved`, 'i'))).toBeVisible()

  const adminToken = await apiLogin(request, e2eUsers.admin.email)
  const published = await request.patch(`${apiBaseUrl}/admin/vouchers/${voucherId}/status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { action: 'publish' }
  })
  expect(published.status()).toBe(200)
  await expect(published.json()).resolves.toMatchObject({ data: { status: 'ON_SALE' } })

  await page.getByRole('button', { name: /log out|đăng xuất/i }).click()
  await login(page, e2eUsers.partner.email)
  await page.getByRole('link', { name: 'Voucher', exact: true }).click()
  const row = page.getByTestId(`voucher-row-${voucherId}`)
  await expect(row).toContainText('Đang bán')
  const pauseResponse = page.waitForResponse((response) => response.url().endsWith(`/api/vouchers/${voucherId}/status`))
  await row.getByRole('button', { name: 'Tạm dừng' }).click()
  expect((await pauseResponse).status()).toBe(200)
  await expect(row).toContainText('Tạm dừng')

  const resumeResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/vouchers/${voucherId}/status`)
  )
  await row.getByRole('button', { name: 'Mở bán lại' }).click()
  expect((await resumeResponse).status()).toBe(200)
  await expect(row).toContainText('Đang bán')

  const invalidPublish = await request.patch(`${apiBaseUrl}/admin/vouchers/${voucherId}/status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { action: 'publish' }
  })
  expect(invalidPublish.status()).toBe(422)

  expect(pageErrors).toEqual([])
})
