import { expect, test } from '@playwright/test'

import { E2E_NEW_PASSWORD, E2E_PASSWORD } from './fixtures/task004'

test('@FLOW-001 password reset request stays generic through the UI', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByLabel('Email or phone').fill('unknown.browser.e2e@voucherhub.test')
  const resetResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/password-reset'))
  await page.getByRole('button', { name: 'Send reset link' }).click()

  expect((await resetResponse).status()).toBe(200)
  await expect(page.getByRole('status')).toContainText('If the account exists')
})

test('@FLOW-001 customer registers, logs in and changes password through the UI', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/register/customer')
  await page.getByLabel('Full name').fill('Browser E2E Customer')
  await page.getByLabel('Email').fill('browser.customer.e2e@voucherhub.test')
  await page.getByLabel('Password').fill(E2E_PASSWORD)

  const registerResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/register'))
  await page.getByRole('button', { name: 'Create account' }).click()
  expect((await registerResponse).status()).toBe(201)
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel(/email|phone/i).fill('browser.customer.e2e@voucherhub.test')
  await page.getByLabel(/mật khẩu|password/i).fill(E2E_PASSWORD)
  await page.getByRole('button', { name: /log in|đăng nhập/i }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('link', { name: 'Browser E2E Customer' }).click()
  await expect(page.getByRole('heading', { name: 'Browser E2E Customer' })).toBeVisible()
  await page.locator('input[name="currentPassword"]').fill(E2E_PASSWORD)
  await page.locator('input[name="newPassword"]').fill(E2E_NEW_PASSWORD)
  await page.locator('input[name="confirmNewPassword"]').fill(E2E_NEW_PASSWORD)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password changed successfully.')).toBeVisible()

  expect(pageErrors).toEqual([])
})
