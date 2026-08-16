import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { rateLimit } from '~/middlewares/rate-limit'
import { validate } from '~/middlewares/validate'
import { authController } from './auth.controller'
import {
  changePasswordSchema,
  loginSchema,
  passwordResetSchema,
  registerSchema,
  updateProfileSchema
} from './auth.validation'

export const authRoutes = Router()
const authWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20 })
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => {
    const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : 'unknown'
    return `${req.ip ?? req.socket.remoteAddress ?? 'unknown'}:${identifier}`
  }
})
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown'
})

authRoutes.post('/auth/register', authWriteLimiter, validate({ body: registerSchema }), authController.register)
authRoutes.post('/auth/login', loginLimiter, validate({ body: loginSchema }), authController.login)
authRoutes.post('/auth/logout', authenticate, authController.logout)
authRoutes.post(
  '/auth/password-reset',
  authWriteLimiter,
  validate({ body: passwordResetSchema }),
  authController.passwordReset
)
authRoutes.patch(
  '/auth/password',
  authenticate,
  passwordLimiter,
  validate({ body: changePasswordSchema }),
  authController.changePassword
)
authRoutes.get('/me', authenticate, authController.getMe)
authRoutes.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateMe)
