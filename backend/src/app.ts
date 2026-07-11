import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'

import { env } from '~/configs/env'
import { errorHandler } from './middleware/error-handler'

// Route imports
import cartRoutes from './modules/cart/cart.routes'
import orderRoutes from './modules/order/order.routes'
import { notFoundHandler } from '~/middlewares/not-found'
import { errorHandler } from '~/middlewares/error-handler'
import { ApiResponse } from '~/utils/api-response'

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
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)

// handling error — phải ở cuối, sau tất cả routes
app.use(errorHandler)
app.use(notFoundHandler)


export default app
