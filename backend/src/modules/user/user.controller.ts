import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { userService } from './user.service'
import type { ChangeRoleDto, SearchUsersDto, UserIdDto } from './user.validation'

export const userController = {
  search: asyncHandler(async (req, res) => {
    const data = await userService.searchUsers(req.validated?.query as SearchUsersDto)
    ApiResponse.success(res, data)
  }),

  lock: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as UserIdDto
    ApiResponse.success(res, await userService.lockUser(id))
  }),

  unlock: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as UserIdDto
    ApiResponse.success(res, await userService.unlockUser(id))
  }),

  changeRole: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as UserIdDto
    const data = await userService.changeRole(id, req.validated?.body as ChangeRoleDto)
    ApiResponse.success(res, data)
  })
}
