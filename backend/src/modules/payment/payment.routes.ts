import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { RoleName } from '@voucher/shared'
import * as paymentController from './payment.controller'

const router = Router()

// Tất cả route payment yêu cầu đăng nhập + vai trò Khách hàng
router.use(authenticate, authorize(RoleName.CUSTOMER))

// GET /api/payments/:id — Chi tiết một giao dịch thanh toán
router.get('/:id', paymentController.getPaymentDetail)

export default router
