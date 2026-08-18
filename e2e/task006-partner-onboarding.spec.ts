import { expect, test } from '@playwright/test'

import { E2E_PASSWORD, e2eUsers } from './fixtures/task004'

const applicantBase = {
  legalName: 'E2E Partner Applicant',
  representative: 'E2E Representative',
  branchName: 'E2E Registration Branch'
}

async function login(page: import('@playwright/test').Page, email: string) {
  await page.getByLabel(/email|phone/i).fill(email)
  await page.getByLabel(/mật khẩu|password/i).fill(E2E_PASSWORD)
  await page.getByRole('button', { name: /log in|đăng nhập/i }).click()
}

test('@FLOW-005 partner registers, gets approved, then manages branches', async ({ page }, testInfo) => {
  // A failed attempt can already have created the applicant before Playwright
  // retries the complete scenario. Give every retry its own unique account so
  // the next attempt is isolated instead of failing with duplicate email/tax.
  const attempt = `${testInfo.workerIndex}-${testInfo.retry}`
  const applicant = {
    ...applicantBase,
    email: `partner-applicant-${attempt}.e2e@voucherhub.test`,
    taxCode: `E2E-TAX-006-${attempt}`
  }

  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/register/partner')
  await page.getByLabel('Email').fill(applicant.email)
  await page.getByLabel('Password').fill(E2E_PASSWORD)
  await page.getByLabel('Legal business name').fill(applicant.legalName)
  await page.getByLabel('Tax code').fill(applicant.taxCode)
  await page.getByLabel('Representative name').fill(applicant.representative)
  await page.getByLabel('Branch name').fill(applicant.branchName)
  await page.getByLabel('Address').fill('6 Integration Street')
  await page.getByLabel('Region').fill('Hồ Chí Minh')

  const registerResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/partners') && response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Submit registration' }).click()
  const registration = await registerResponse
  expect(registration.status(), `Partner registration failed: ${await registration.text()}`).toBe(201)
  await expect(page).toHaveURL(/\/login$/)

  const pendingLoginResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/login'))
  await login(page, applicant.email)
  expect((await pendingLoginResponse).status()).toBe(403)
  await expect(page.getByRole('alert')).toContainText('chờ duyệt')

  await page.goto('/admin/partners')
  await expect(page).toHaveURL(/\/login$/)
  await login(page, e2eUsers.admin.email)
  await expect(page).toHaveURL(/\/admin\/partners$/)
  await expect(page.getByText(applicant.legalName)).toBeVisible()

  const approvalResponse = page.waitForResponse(
    (response) => response.url().includes('/api/admin/partners/') && response.url().endsWith('/approval')
  )
  await page.getByRole('button', { name: `Approve ${applicant.legalName}` }).click()
  expect((await approvalResponse).status()).toBe(200)
  await expect(page.getByText(`${applicant.legalName} has been approved.`)).toBeVisible()

  await page.getByRole('button', { name: /log out|đăng xuất/i }).click()
  await page.goto('/login')
  await login(page, applicant.email)
  await expect(page).toHaveURL(/\/partner$/)
  await page.getByRole('link', { name: 'Chi nhánh', exact: true }).click()
  await expect(page).toHaveURL(/\/partner\/branches$/)
  await expect(page.getByText(applicant.branchName)).toBeVisible()

  await page.getByRole('button', { name: 'Add branch' }).click()
  await page.getByLabel('Branch name').fill('E2E Secondary Branch')
  await page.getByLabel('Address').fill('7 Integration Street')
  await page.getByLabel('Region').selectOption('Đà Nẵng')
  await page.getByRole('dialog').getByRole('button', { name: 'Add branch' }).click()
  await expect(page.getByText('Branch added.')).toBeVisible()

  await page.getByRole('button', { name: 'Edit E2E Secondary Branch' }).click()
  await page.getByLabel('Branch name').fill('E2E Secondary Branch Updated')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Branch updated.')).toBeVisible()

  await page.getByRole('button', { name: 'Delete E2E Secondary Branch Updated' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Branch deleted.')).toBeVisible()
  await expect(page.getByText('E2E Secondary Branch Updated')).not.toBeVisible()
  expect(pageErrors).toEqual([])
})
