import { Router } from 'express'

import partnerRouter from './partners/partner.routes'

const router = Router()

router.use(partnerRouter)

export default router
