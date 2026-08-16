import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { authService } from './auth.service'
import type { ChangePasswordDto, LoginDto, PasswordResetDto, RegisterDto, UpdateProfileDto } from './auth.validation'

export const authController = {
  register: asyncHandler(async (req, res) => {
    const data = await authService.register(req.validated?.body as RegisterDto)
    ApiResponse.created(res, data)
  }),

  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.validated?.body as LoginDto)
    ApiResponse.success(res, data)
  }),

  logout: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, authService.logout())
  }),

  passwordReset: asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.validated?.body as PasswordResetDto)
    const publicData = { requested: result.requested, resetCode: result.resetCode }
    ApiResponse.success(res, publicData)
  }),

  changePassword: asyncHandler(async (req, res) => {
    const data = await authService.changePassword(req.user!.sub, req.validated?.body as ChangePasswordDto)
    ApiResponse.success(res, data)
  }),

  getMe: asyncHandler(async (req, res) => {
    const data = await authService.getProfile(req.user!.sub)
    ApiResponse.success(res, data)
  }),

  updateMe: asyncHandler(async (req, res) => {
    const data = await authService.updateProfile(req.user!.sub, req.validated?.body as UpdateProfileDto)
    ApiResponse.success(res, data)
  })
}
