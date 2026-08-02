import type { Request, Response } from 'express'

import { asyncHandler } from '~/utils/async-handler'
import { ApiResponse } from '~/utils/api-response'

import { getCategories } from './category.service'

export const getCategoriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await getCategories()

  ApiResponse.success(res, categories)
})
