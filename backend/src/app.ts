import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { env } from '~/configs/env'
import { notFoundHandler } from '~/middlewares/not-found'
import { errorHandler } from '~/middlewares/error-handler'
import { ApiResponse } from '~/utils/api-response'

const app = express()

// Security
app.use(helmet())

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

// Future: app.use('/api/v1', router)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

export default app
