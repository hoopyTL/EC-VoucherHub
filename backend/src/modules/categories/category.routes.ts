import { Router } from 'express'

import { getCategoriesHandler } from './category.controller'

const router = Router()

router.get('/categories', getCategoriesHandler)

export default router
