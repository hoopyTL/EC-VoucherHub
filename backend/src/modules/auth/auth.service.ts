import { randomInt } from 'node:crypto'
import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import { createDummyPasswordHash, hashPassword, verifyPassword } from '~/utils/password'
import { signAccessToken } from '~/utils/jwt'
import { ApprovalStatus, OperatingStatus, RoleName } from '@voucher/shared'
import { getCompatibleRoleNames, normalizeRoleName } from '~/utils/role'
import type { ChangePasswordDto, LoginDto, PasswordResetDto, RegisterDto, UpdateProfileDto } from './auth.validation'

const profileSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  address: true,
  status: true,
  role: { select: { name: true } },
  createdAt: true,
  updatedAt: true
} as const

const createVerificationCode = (): string => randomInt(100000, 1000000).toString()
const DUMMY_PASSWORD_HASH = createDummyPasswordHash()
const normalizeProfileRole = <T extends { role: { name: string } }>(user: T) => ({
  ...user,
  role: { name: normalizeRoleName(user.role.name) }
})

const assertPartnerCanAccess = (
  partner: {
    approvalStatus: string
    operatingStatus: string
  } | null
) => {
  if (!partner || partner.approvalStatus === ApprovalStatus.PENDING) {
    throw AppError.forbidden('Hồ sơ đối tác đang chờ duyệt')
  }
  if (partner.approvalStatus === ApprovalStatus.REJECTED) {
    throw AppError.forbidden('Hồ sơ đối tác đã bị từ chối')
  }
  if (partner.operatingStatus === OperatingStatus.SUSPENDED) {
    throw AppError.forbidden('Hồ sơ đối tác đang bị tạm khóa')
  }
}

export const authService = {
  async register(dto: RegisterDto) {
    const { email, phone, password, fullName, address } = dto
    const identifiers = [email ? { email } : undefined, phone ? { phone } : undefined].filter(
      (value): value is { email: string } | { phone: string } => value !== undefined
    )

    const existingUser = await prisma.user.findFirst({
      where: { OR: identifiers }
    })

    if (existingUser) {
      throw AppError.duplicate('Email hoặc số điện thoại đã được sử dụng')
    }

    const customerRole = await prisma.role.findFirst({
      where: { name: { in: getCompatibleRoleNames(RoleName.CUSTOMER) } }
    })
    if (!customerRole) {
      throw AppError.internal('Vai trò CUSTOMER chưa được cấu hình')
    }

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: await hashPassword(password),
        fullName,
        address,
        roleId: customerRole.id
      }
    })

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: RoleName.CUSTOMER,
      verificationCode: createVerificationCode()
    }
  },

  async login(dto: LoginDto) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier }, { phone: dto.identifier }] },
      include: {
        role: true,
        partner: { select: { id: true, approvalStatus: true, operatingStatus: true } },
        staffProfile: {
          select: {
            status: true,
            partner: { select: { id: true, approvalStatus: true, operatingStatus: true } }
          }
        }
      }
    })

    const isPasswordValid = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
    if (!user || !isPasswordValid) {
      throw AppError.unauthorized('Sai thông tin đăng nhập')
    }
    if (user.status === 'LOCKED') {
      throw AppError.forbidden('Tài khoản đã bị khoá')
    }

    const role = normalizeRoleName(user.role.name)
    if (role === RoleName.PARTNER) {
      assertPartnerCanAccess(user.partner)
    }
    if (role === RoleName.STAFF) {
      if (!user.staffProfile || user.staffProfile.status !== 'ACTIVE') {
        throw AppError.forbidden('Tài khoản nhân viên đã ngừng hoạt động')
      }
      assertPartnerCanAccess(user.staffProfile.partner)
    }
    const token = signAccessToken({
      sub: user.id,
      role,
      ver: user.tokenVersion,
      ...(user.partner && { partnerId: user.partner.id }),
      ...(user.staffProfile && { partnerId: user.staffProfile.partner.id })
    })

    return { token, user: { id: user.id, role } }
  },

  logout() {
    return { loggedOut: true }
  },

  async requestPasswordReset(dto: PasswordResetDto) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier }, { phone: dto.identifier }] },
      select: { id: true }
    })

    // The simulation returns an indistinguishable decoy for unknown identifiers.
    return { requested: true, resetCode: createVerificationCode(), deliverable: Boolean(user) }
  },

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw AppError.notFound('Người dùng')
    }
    if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw AppError.unauthorized('Mật khẩu hiện tại không đúng')
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        tokenVersion: { increment: 1 }
      }
    })
    return { changed: true }
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect
    })
    if (!user) {
      throw AppError.notFound('Người dùng')
    }
    return normalizeProfileRole(user)
  },

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: dto,
      select: profileSelect
    })
    return normalizeProfileRole(user)
  }
}
