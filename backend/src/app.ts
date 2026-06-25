// Express app set up
import express, { Request, Response } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { env } from './configs/env'
import { errorHandler } from './middleware/error-handler'

// Route imports
import cartRoutes from './modules/cart/cart.routes'
import orderRoutes from './modules/order/order.routes'

const app = express()

// init middlewares
app.use(helmet())
app.use(express.json())

if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// init db

// init routes
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'ok' } })
})

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { message: 'Welcome VoucherHub' } })
})

// API routes
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)

// handling error — phải ở cuối, sau tất cả routes
app.use(errorHandler)

export default app
