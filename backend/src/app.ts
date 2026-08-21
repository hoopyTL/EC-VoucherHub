import path from 'node:path'

import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'

import { env } from '~/configs/env'
import { notFoundHandler } from '~/middlewares/not-found'
import { errorHandler } from '~/middlewares/error-handler'
import { ApiResponse } from '~/utils/api-response'
import apiRouter from '~/modules'
import cartRoutes from '~/modules/cart/cart.routes'
import orderRoutes from '~/modules/order/order.routes'

const app = express()

// Security
app.use(helmet())

// Cors
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))

// Body parsing
app.use('/api/orders/webhook/stripe', express.raw({ type: 'application/json' }))
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

// API routes
app.use('/api', apiRouter)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)

// Error handling must remain after all routes.
app.use(notFoundHandler)
app.use(errorHandler)

export default app
