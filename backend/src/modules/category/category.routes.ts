import { Router } from 'express'
import { categoryController } from './category.controller'

export const categoryRoutes = Router()

categoryRoutes.get('/categories', categoryController.list)
