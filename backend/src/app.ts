// Express app set up
import express, { Request, Response } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { env } from './configs/env'

const app = express()

// init middlewares
app.use(helmet())
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

// handling error

export default app
