import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { addCartItemSchema, updateCartItemSchema } from '@voucher/shared'
import * as cartController from './cart.controller'

const router = Router()

// Tất cả route cart yêu cầu đăng nhập + vai trò Khách hàng
router.use(requireAuth, requireRole('KHACH_HANG'))

router.get('/', cartController.getCart)
router.post('/items', validate(addCartItemSchema), cartController.addItem)
router.patch('/items/:itemId', validate(updateCartItemSchema), cartController.updateItem)
router.delete('/items/:itemId', cartController.removeItem)

export default router
