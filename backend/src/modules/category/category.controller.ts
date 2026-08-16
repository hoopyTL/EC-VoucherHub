import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { categoryService } from './category.service'

export const categoryController = {
  list: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, await categoryService.list())
  })
}
