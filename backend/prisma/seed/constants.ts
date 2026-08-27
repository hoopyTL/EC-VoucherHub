export const SEED_ROLES = {
  ADMIN: 'ADMIN',
  PARTNER: 'PARTNER',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER'
} as const

export type SeedRoleName = (typeof SEED_ROLES)[keyof typeof SEED_ROLES]

export const LEGACY_ROLE_MAP: Readonly<Record<string, SeedRoleName>> = {
  QUAN_TRI_VIEN: SEED_ROLES.ADMIN,
  DOI_TAC: SEED_ROLES.PARTNER,
  NHAN_VIEN: SEED_ROLES.STAFF,
  KHACH_HANG: SEED_ROLES.CUSTOMER
}

export const ROLE_ALIASES = {
  ADMIN: [SEED_ROLES.ADMIN, 'QUAN_TRI_VIEN'],
  PARTNER: [SEED_ROLES.PARTNER, 'DOI_TAC'],
  STAFF: [SEED_ROLES.STAFF, 'NHAN_VIEN'],
  CUSTOMER: [SEED_ROLES.CUSTOMER, 'KHACH_HANG']
} as const

export function normalizeSeedRoleName(roleName: string): SeedRoleName | undefined {
  if (Object.values(SEED_ROLES).includes(roleName as SeedRoleName)) return roleName as SeedRoleName
  return LEGACY_ROLE_MAP[roleName]
}

export const SEED_CATEGORIES = {
  FOOD: 'Ẩm Thực',
  BUFFET: 'Buffet',
  BEAUTY: 'Spa & Làm đẹp',
  MASSAGE: 'Massage Nam Nữ',
  ENTERTAINMENT: 'Giải Trí & Thể Thao',
  TOUR: 'Tour du lịch',
  HOTEL: 'Hotel & Resort',
  DENTAL: 'Nha Khoa'
} as const

export const SEED_CATEGORY_NAMES = Object.values(SEED_CATEGORIES)

export const DEMO_PASSWORD = '12345678'
