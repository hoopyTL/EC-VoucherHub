import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { RoleName } from '@voucher/shared'
import { validate } from '../../middleware/validate'
import { createOrderSchema, paymentOutcomeSchema } from '@voucher/shared'
import * as orderController from './order.controller'

const router = Router()

// Public route for VNPay return (does not have Bearer token)
router.get('/vnpay-return', orderController.vnpayReturn)

// Tất cả route order yêu cầu đăng nhập + vai trò Khách hàng
router.use(authenticate, authorize(RoleName.CUSTOMER))

router.post('/', validate(createOrderSchema), orderController.createOrder)
router.get('/', orderController.getMyOrders)
router.get('/:id/vnpay', orderController.createVNPayPayment)
router.get('/:id', orderController.getOrderDetail)
router.post('/:id/payment', validate(paymentOutcomeSchema), orderController.processPayment)

export default router
