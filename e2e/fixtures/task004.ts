export const E2E_PASSWORD = 'E2ePassword123!'
export const E2E_NEW_PASSWORD = 'E2ePassword456!'

export const e2eUsers = {
  admin: { email: 'admin.e2e@voucherhub.test', fullName: 'E2E Administrator', role: 'ADMIN' },
  customer: { email: 'customer.e2e@voucherhub.test', fullName: 'E2E Customer', role: 'CUSTOMER' },
  partner: { email: 'partner.e2e@voucherhub.test', fullName: 'E2E Partner', role: 'PARTNER' },
  lockTarget: { email: 'lock-target.e2e@voucherhub.test', fullName: 'E2E Lock Target', role: 'CUSTOMER' },
  roleTarget: { email: 'role-target.e2e@voucherhub.test', fullName: 'E2E Role Target', role: 'CUSTOMER' }
} as const
