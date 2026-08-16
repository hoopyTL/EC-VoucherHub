import { env } from './configs/env'
import app from './app'
import { startOrderCleanupCron } from './modules/order/order.cron'

const server = app.listen(env.PORT, () => {
  console.log(`Server is running on ${env.PORT} (${env.NODE_ENV})`)
  startOrderCleanupCron()
})

process.on('SIGINT', () => {
  server.close(() => {
    console.log(`\nExit server Express`)
  })
})
