import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { createOrderSchema } from '@voucher/shared'
import * as orderController from './order.controller'

const router = Router()

// Tất cả route order yêu cầu đăng nhập + vai trò Khách hàng
router.use(requireAuth, requireRole('KHACH_HANG'))

router.post('/', validate(createOrderSchema), orderController.createOrder)
router.get('/', orderController.getMyOrders)
router.get('/:id', orderController.getOrderDetail)

export default router
