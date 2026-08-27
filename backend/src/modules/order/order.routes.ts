import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate'
import { authorize } from '../../middlewares/authorize'
import { RoleName } from '@voucher/shared'
import { validate } from '../../middlewares/validate'
import { createOrderSchema, paymentOutcomeSchema } from '@voucher/shared'
import * as orderController from './order.controller'
import * as paymentController from '../payment/payment.controller'

const router = Router()

// Route ngầm IPN cho Server VNPay gọi vào (không có Bearer token)
router.get('/vnpay-ipn', orderController.vnpayIpn)

// Route ngầm IPN cho Server OnePay gọi vào (không có Bearer token)
router.get('/onepay-ipn', orderController.onepayIpn)

// Route ngầm Webhook cho Stripe Server bắn tín hiệu về (Kiểm soát bằng chữ ký số trong Controller)
router.post('/webhook/stripe', orderController.stripeWebhookHandler)

// Stripe redirects the browser back to a public result page. This endpoint does
// not depend on the browser JWT: the paid Checkout Session itself is verified
// with Stripe, including its order id, currency and exact amount.
router.post('/:id/stripe/confirm', orderController.confirmStripePayment)

// Tất cả route order yêu cầu đăng nhập + vai trò Khách hàng
router.use(authenticate, authorize(RoleName.CUSTOMER))

router.post('/', validate(createOrderSchema), orderController.createOrder)
router.get('/', orderController.getMyOrders)
router.get('/:id/vnpay', orderController.createVNPayPayment)
router.get('/:id/onepay', orderController.createOnePayPayment)
router.get('/:id/stripe', orderController.createStripePayment)
router.get('/:id/paypal', orderController.createPayPalPayment)
router.post('/:id/paypal/capture', orderController.capturePayPalPayment)
router.get('/:id', orderController.getOrderDetail)
router.get('/:orderId/payments', paymentController.getPaymentsByOrder)
router.post('/:id/cancel', orderController.cancelOrder)
router.post('/:id/payment', validate(paymentOutcomeSchema), orderController.processPayment)

export default router
