import { Router } from 'express'
import { authRoutes } from './auth/auth.routes'
import { categoryRoutes } from './category/category.routes'
import { partnerRoutes } from './partner/partner.routes'
import { userRoutes } from './user/user.routes'
import { voucherRoutes } from './voucher/voucher.routes'

const apiRouter = Router()

apiRouter.use(authRoutes)
apiRouter.use(categoryRoutes)
apiRouter.use(partnerRoutes)
apiRouter.use(voucherRoutes)
apiRouter.use(userRoutes)

export default apiRouter
