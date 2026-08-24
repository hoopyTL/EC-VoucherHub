import { api } from './api'

export interface ReviewItem {
  id: string
  customerId: string
  voucherProductId: string
  orderId: string
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    fullName: string
  }
}

export interface ReviewSummary {
  averageRating: number
  totalReviews: number
  distribution: Record<number, number>
}

export interface VoucherReviewsResponse {
  reviews: ReviewItem[]
  summary: ReviewSummary
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateReviewPayload {
  voucherProductId: string
  orderId?: string
  rating: number
  comment?: string
}

export interface EligibleVoucherItem {
  orderId: string
  voucher: {
    id: string
    name: string
    imageUrl: string | null
    salePrice: string
  }
}

/** Lấy danh sách đánh giá của voucher */
export async function getVoucherReviews(voucherId: string, page = 1, limit = 10): Promise<VoucherReviewsResponse> {
  const res = await api.get<{ success: boolean; data: VoucherReviewsResponse }>(
    `/vouchers/${voucherId}/reviews?page=${page}&limit=${limit}`
  )
  return res.data.data
}

/** Gửi đánh giá cho voucher */
export async function createReview(payload: CreateReviewPayload): Promise<ReviewItem> {
  const res = await api.post<{ success: boolean; data: ReviewItem }>('/reviews', payload)
  return res.data.data
}

/** Lấy danh sách các voucher đủ điều kiện đánh giá */
export async function getEligibleReviews(): Promise<EligibleVoucherItem[]> {
  const res = await api.get<{ success: boolean; data: EligibleVoucherItem[] }>('/reviews/eligible')
  return res.data.data
}

/** Lấy danh sách đánh giá của chính mình */
export async function getMyReviews(): Promise<ReviewItem[]> {
  const res = await api.get<{ success: boolean; data: ReviewItem[] }>('/reviews/me')
  return res.data.data
}

/** Cập nhật đánh giá */
export async function updateReview(
  reviewId: string,
  payload: { rating?: number; comment?: string }
): Promise<ReviewItem> {
  const res = await api.patch<{ success: boolean; data: ReviewItem }>(`/reviews/${reviewId}`, payload)
  return res.data.data
}

/** Xóa đánh giá */
export async function deleteReview(reviewId: string): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/reviews/${reviewId}`)
  return res.data.data
}
