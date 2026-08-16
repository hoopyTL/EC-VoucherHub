import { Router } from 'express'
import { authRoutes } from './auth/auth.routes'
import { partnerRoutes } from './partner/partner.routes'
import { userRoutes } from './user/user.routes'

const apiRouter = Router()

apiRouter.use(authRoutes)
apiRouter.use(partnerRoutes)
apiRouter.use(userRoutes)

export default apiRouter
