import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'

import { env } from '~/configs/env'
import { errorHandler } from './middleware/error-handler'

// Route imports
import cartRoutes from './modules/cart/cart.routes'
import orderRoutes from './modules/order/order.routes'
import searchRoutes from './modules/search/search.routes'
import { notFoundHandler } from '~/middlewares/not-found'
import { ApiResponse } from '~/utils/api-response'
import apiRouter from '~/modules'

// task 06
import partnerRoutes from '~/modules/partners/partner.routes'
import { devAuth } from '~/middlewares/dev-auth'
//

// task 007
import voucherRoutes from '~/modules/vouchers/voucher.routes'
// catalogy
import categoryRoutes from '~/modules/categories/category.routes'

const app = express()

// Security
app.use(helmet())

// Cors
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))

// Body parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

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

// API routes
app.use('/api', apiRouter)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/vouchers', searchRoutes)

//task 06
app.use('/api', devAuth, partnerRoutes)

app.use('/api', categoryRoutes)
//task 007
app.use('/api', devAuth, voucherRoutes)

// handling error — phải ở cuối, sau tất cả routes
app.use(notFoundHandler)
app.use(errorHandler)

export default app
