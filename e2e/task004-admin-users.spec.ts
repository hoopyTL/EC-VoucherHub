import { expect, test } from '@playwright/test'

import { E2E_PASSWORD, e2eUsers } from './fixtures/task004'

test('@FLOW-009 admin searches, locks and unlocks a user through the UI', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel(/email|phone/i).fill(e2eUsers.admin.email)
  await page.getByLabel(/mật khẩu|password/i).fill(E2E_PASSWORD)
  await page.getByRole('button', { name: /log in|đăng nhập/i }).click()

  await expect(page).toHaveURL(/\/admin\/users$/)
  await expect(page.getByRole('heading', { name: 'Quản lý người dùng' })).toBeVisible()
  await page.getByLabel('Tìm kiếm tài khoản').fill(e2eUsers.lockTarget.email)
  await page.getByRole('button', { name: 'Tìm kiếm' }).click()
  await expect(page.getByText(e2eUsers.lockTarget.fullName)).toBeVisible()

  await page.getByRole('button', { name: `Khóa ${e2eUsers.lockTarget.fullName}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Khóa' }).click()
  await expect(page.getByText(`Đã khóa ${e2eUsers.lockTarget.fullName}.`)).toBeVisible()
  await expect(page.getByRole('button', { name: `Mở khóa ${e2eUsers.lockTarget.fullName}` })).toBeVisible()

  await page.getByRole('button', { name: `Mở khóa ${e2eUsers.lockTarget.fullName}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mở khóa' }).click()
  await expect(page.getByText(`Đã mở khóa ${e2eUsers.lockTarget.fullName}.`)).toBeVisible()
  await expect(page.getByRole('button', { name: `Khóa ${e2eUsers.lockTarget.fullName}` })).toBeVisible()

  expect(pageErrors).toEqual([])
})
