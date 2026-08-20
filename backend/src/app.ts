import path from 'node:path'

import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'

import { env } from '~/configs/env'
import adminRoutes from './routes/admin.routes'
import { errorHandler } from './middleware/error-handler'
import cartRoutes from './modules/cart/cart.routes'
import orderRoutes from './modules/order/order.routes'
import searchRoutes from './modules/search/search.routes'
import { notFoundHandler } from '~/middlewares/not-found'
import { ApiResponse } from '~/utils/api-response'
import apiRouter from '~/modules'
import partnerRoutes from '~/modules/partners/partner.routes'
import { devAuth } from '~/middlewares/dev-auth'
import voucherRoutes from '~/modules/vouchers/voucher.routes'
import categoryRoutes from '~/modules/categories/category.routes'

const app = express()

// Security
app.use(helmet())

// Cors
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))

// Webhook của Stripe bắt buộc phải là Raw Body để kiểm tra chữ ký (Signature) an toàn
app.use('/api/orders/webhook/stripe', express.raw({ type: 'application/json' }))

// Body parsing cho tất cả các API bình thường khác
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// Routes
app.get('/health', (_req, res) => {
  ApiResponse.success(res, { status: 'ok' })
})

app.get('/', (_req, res) => {
  ApiResponse.success(res, { message: 'Welcome VoucherHub' })
})

app.use('/api/admin', adminRoutes)
app.use('/api', apiRouter)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/vouchers', searchRoutes)
app.use('/api', devAuth, partnerRoutes)
app.use('/api', categoryRoutes)
app.use('/api', devAuth, voucherRoutes)

// handling error
app.use(notFoundHandler)
app.use(errorHandler)

export default app
