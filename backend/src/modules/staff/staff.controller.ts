import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { staffService } from './staff.service'
import type { CreateStaffInput, UpdateStaffInput } from './staff.validation'
export const staffController = {
  list: asyncHandler(async (req, res) => ApiResponse.success(res, await staffService.list(req.user!.sub))),
  create: asyncHandler(async (req, res) =>
    ApiResponse.created(res, await staffService.create(req.user!.sub, req.validated?.body as CreateStaffInput))
  ),
  update: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await staffService.update(req.user!.sub, id, req.validated?.body as UpdateStaffInput))
  })
}
