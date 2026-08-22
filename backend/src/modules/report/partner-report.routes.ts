import { RoleName } from '@voucher/shared'
import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { getPartnerReport } from './partner-report.service'

export const partnerReportRoutes = Router()
partnerReportRoutes.get(
  '/partner/reports',
  authenticate,
  authorize(RoleName.PARTNER),
  asyncHandler(async (req, res) => ApiResponse.success(res, await getPartnerReport(req.user!.sub)))
)
