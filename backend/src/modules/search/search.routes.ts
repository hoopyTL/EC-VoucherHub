import { Router } from 'express'
import * as searchController from './search.controller'

const router = Router()

// Route tìm kiếm (Public cho Khách hàng chưa đăng nhập xem được)
router.get('/', searchController.searchVouchers)

// Route chi tiết
router.get('/:id', searchController.getVoucherDetail)

export default router
