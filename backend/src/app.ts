import express from 'express'
import path from 'node:path'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'

import { env } from '~/configs/env'
import { notFoundHandler } from '~/middlewares/not-found'
import { errorHandler } from '~/middlewares/error-handler'
import { ApiResponse } from '~/utils/api-response'

// task 06
import partnerRoutes from '~/modules/partners/partner.routes'
import { devAuth } from '~/middlewares/dev-auth'
//

// task 007
import voucherRoutes from '~/modules/vouchers/voucher.routes'
// catalogy
import categoryRoutes from '~/modules/categories/category.routes'
import redemptionRoutes from '~/modules/redemptions/redemption.routes'

const app = express()

// Security
app.use(helmet())

// Cors
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))

// Body parsing
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

// Future: app.use('/api/v1', router)

//task 06
app.use('/api', devAuth, partnerRoutes)

app.use('/api', categoryRoutes)
//task 007
app.use('/api', devAuth, voucherRoutes)
app.use('/api', devAuth, redemptionRoutes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

export default app
