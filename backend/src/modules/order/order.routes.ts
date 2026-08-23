import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { RoleName } from '@voucher/shared'
import { validate } from '../../middleware/validate'
import { createOrderSchema, paymentOutcomeSchema } from '@voucher/shared'
import * as orderController from './order.controller'
import * as paymentController from '../payment/payment.controller'

const router = Router()

// Route ngầm IPN cho Server VNPay gọi vào (không có Bearer token)
router.get('/vnpay-ipn', orderController.vnpayIpn)

// Route ngầm Webhook cho Stripe Server bắn tín hiệu về (Kiểm soát bằng chữ ký số trong Controller)
router.post('/webhook/stripe', orderController.stripeWebhookHandler)

// Tất cả route order yêu cầu đăng nhập + vai trò Khách hàng
router.use(authenticate, authorize(RoleName.CUSTOMER))

router.post('/', validate(createOrderSchema), orderController.createOrder)
router.get('/', orderController.getMyOrders)
router.get('/:id/vnpay', orderController.createVNPayPayment)
router.get('/:id/stripe', orderController.createStripePayment)
router.get('/:id/paypal', orderController.createPayPalPayment)
router.post('/:id/paypal/capture', orderController.capturePayPalPayment)
router.get('/:id', orderController.getOrderDetail)
router.get('/:orderId/payments', paymentController.getPaymentsByOrder)
router.post('/:id/cancel', orderController.cancelOrder)
router.post('/:id/payment', validate(paymentOutcomeSchema), orderController.processPayment)

export default router
