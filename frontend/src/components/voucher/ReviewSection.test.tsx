import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewSection } from './ReviewSection'
import { AuthProvider } from '../../store/AuthContext'
import { ToastProvider } from '../ui'
import * as reviewService from '../../services/review.service'
import { clearAccessToken, setAccessToken, USER_STORAGE_KEY } from '../../services/api'

function renderReviewSection(voucherId = 'v-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastProvider>
          <ReviewSection voucherId={voucherId} voucherTitle='Test Voucher' />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('ReviewSection', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders empty state when there are no reviews', async () => {
    vi.spyOn(reviewService, 'getVoucherReviews').mockResolvedValue({
      reviews: [],
      summary: {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      },
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 }
    })

    renderReviewSection('v-1')

    expect(await screen.findByTestId('no-reviews-msg')).toBeDefined()
    expect(screen.getByText(/Chưa có đánh giá nào cho voucher này/i)).toBeDefined()
  })

  it('renders review summary and review list when reviews exist', async () => {
    vi.spyOn(reviewService, 'getVoucherReviews').mockResolvedValue({
      reviews: [
        {
          id: 'r-1',
          customerId: 'c-1',
          voucherProductId: 'v-1',
          orderId: 'o-1',
          rating: 5,
          comment: 'Dịch vụ rất tốt và nhân viên nhiệt tình',
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
          customer: { id: 'c-1', fullName: 'Nguyen Van A' }
        },
        {
          id: 'r-2',
          customerId: 'c-2',
          voucherProductId: 'v-1',
          orderId: 'o-2',
          rating: 4,
          comment: 'Tạm ổn, đồ uống ngon',
          createdAt: '2026-08-21T11:00:00.000Z',
          updatedAt: '2026-08-21T11:00:00.000Z',
          customer: { id: 'c-2', fullName: 'Tran Thi B' }
        }
      ],
      summary: {
        averageRating: 4.5,
        totalReviews: 2,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 }
      },
      pagination: { page: 1, limit: 5, total: 2, totalPages: 1 }
    })

    renderReviewSection('v-1')

    expect(await screen.findByTestId('review-summary-box')).toBeDefined()
    expect(screen.getByText('4.5')).toBeDefined()
    expect(screen.getByText(/2 lượt đánh giá/i)).toBeDefined()
    expect(screen.getByText('Nguyen Van A')).toBeDefined()
    expect(screen.getByText('Dịch vụ rất tốt và nhân viên nhiệt tình')).toBeDefined()
    expect(screen.getByText('Tran Thi B')).toBeDefined()
  })
})
