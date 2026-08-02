import { Prisma } from '@prisma/client'
import prisma from '../../configs/prisma'
import { NotFoundError } from '../../middleware/error-handler'
import type { SearchVoucherQueryDto, VoucherResponse, VoucherListResponse } from '@voucher/shared'
import { Decimal } from '@prisma/client/runtime/library'

const formatDecimal = (d: Decimal): string => d.toFixed(2)

/**
 * Map raw Prisma VoucherProduct -> VoucherResponse DTO
 */
const toVoucherResponse = (vp: any): VoucherResponse => {
  return {
    id: vp.id,
    partnerId: vp.partnerId,
    categoryId: vp.categoryId,
    name: vp.name,
    description: vp.description,
    imageUrl: vp.imageUrl,
    originalPrice: formatDecimal(vp.originalPrice),
    salePrice: formatDecimal(vp.salePrice),
    saleStart: vp.saleStart.toISOString(),
    saleEnd: vp.saleEnd.toISOString(),
    usageStart: vp.usageStart.toISOString(),
    usageEnd: vp.usageEnd.toISOString(),
    totalQuantity: vp.totalQuantity,
    remainingQuantity: vp.remainingQuantity,
    isMultiUse: vp.isMultiUse,
    usesPerCode: vp.usesPerCode,
    status: vp.status,
    createdAt: vp.createdAt.toISOString(),
    updatedAt: vp.updatedAt.toISOString(),
  }
}

/**
 * Tìm kiếm và lọc voucher (chỉ lấy voucher ON_SALE)
 */
export const searchVouchers = async (
  query: SearchVoucherQueryDto
): Promise<VoucherListResponse> => {
  const { keyword, minPrice, maxPrice, page = 1, limit = 20 } = query
  const skip = (page - 1) * limit

  // Xây dựng điều kiện lọc (chỉ lấy voucher đang bán)
  const whereConditions: Prisma.VoucherProductWhereInput = {
    status: 'ON_SALE',
  }

  // Lọc theo từ khóa
  if (keyword) {
    whereConditions.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { description: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  // Lọc theo giá
  if (minPrice !== undefined || maxPrice !== undefined) {
    whereConditions.salePrice = {}
    if (minPrice !== undefined) whereConditions.salePrice.gte = minPrice
    if (maxPrice !== undefined) whereConditions.salePrice.lte = maxPrice
  }

  // TODO: Lọc theo danh mục và khu vực (khi TV3 thêm dữ liệu ở Đợt 2)
  // if (categoryId) whereConditions.categoryId = categoryId
  // if (region) whereConditions.voucherProductBranches = { some: { branch: { region } } }

  // Query DB lấy tổng số và danh sách
  const [total, vouchers] = await prisma.$transaction([
    prisma.voucherProduct.count({ where: whereConditions }),
    prisma.voucherProduct.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return {
    items: vouchers.map(toVoucherResponse),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Xem chi tiết voucher
 */
export const getVoucherDetail = async (id: string): Promise<VoucherResponse> => {
  const voucher = await prisma.voucherProduct.findFirst({
    where: { 
      id,
      status: 'ON_SALE' // Chỉ cho phép xem chi tiết voucher đang bán
    },
  })

  if (!voucher) {
    throw new NotFoundError('Voucher không tồn tại hoặc đã ngừng bán')
  }

  return toVoucherResponse(voucher)
}
