import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { RoleName } from '@voucher/shared'
import { validate } from '../../middleware/validate'
import { createOrderSchema, paymentOutcomeSchema } from '@voucher/shared'
import * as orderController from './order.controller'

const router = Router()

// Route ngầm IPN cho Server VNPay gọi vào (không có Bearer token)
router.get('/vnpay-ipn', orderController.vnpayIpn)

// Tất cả route order yêu cầu đăng nhập + vai trò Khách hàng
router.use(authenticate, authorize(RoleName.CUSTOMER))

router.post('/', validate(createOrderSchema), orderController.createOrder)
router.get('/', orderController.getMyOrders)
router.get('/:id/vnpay', orderController.createVNPayPayment)
router.get('/:id', orderController.getOrderDetail)
router.post('/:id/cancel', orderController.cancelOrder)
router.post('/:id/payment', validate(paymentOutcomeSchema), orderController.processPayment)

export default router
