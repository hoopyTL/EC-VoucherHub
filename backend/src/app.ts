import path from 'node:path'

import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'

import { env } from './configs/env'
import adminRoutes from './routes/admin.routes'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware'

const app = express()

// Security
app.use(helmet())
app.use(express.json())
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// Routes
app.get('/health', (_req, res) => {
  ApiResponse.success(res, { status: 'ok' })
})

app.get('/', (_req, res) => {
  ApiResponse.success(res, { message: 'Welcome VoucherHub' })
})

app.use('/api/admin', adminRoutes)

// handling error
app.use(notFoundHandler)
app.use(errorHandler)

export default app
