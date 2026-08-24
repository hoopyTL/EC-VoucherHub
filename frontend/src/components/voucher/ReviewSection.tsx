import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, LoadingSpinner, StarRating, useToast } from '../ui'
import { ReviewForm } from './ReviewForm'
import { deleteReview, getEligibleReviews, getVoucherReviews, type ReviewItem } from '../../services/review.service'
import { useAuth } from '../../hooks/useAuth'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatDate } from '../../utils/format'

export interface ReviewSectionProps {
  voucherId: string
  voucherTitle?: string
}

export function ReviewSection({ voucherId }: ReviewSectionProps) {
  const [page, setPage] = useState(1)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null)
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['voucher-reviews', voucherId, page],
    queryFn: () => getVoucherReviews(voucherId, page, 5),
    staleTime: 30_000
  })

  // Check if current user has an unreviewed purchase of this voucher
  const { data: eligibleVouchers } = useQuery({
    queryKey: ['eligible-reviews'],
    queryFn: getEligibleReviews,
    enabled: !!user && user.role === 'CUSTOMER',
    staleTime: 30_000
  })

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      showToast('Đã xóa đánh giá.', { variant: 'info' })
      queryClient.invalidateQueries({ queryKey: ['voucher-reviews', voucherId] })
      queryClient.invalidateQueries({ queryKey: ['eligible-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
    },
    onError: () => {
      showToast('Không thể xóa đánh giá. Vui lòng thử lại.', { variant: 'error' })
    }
  })

  const isEligible = eligibleVouchers?.some((item) => item.voucher.id === voucherId)
  const summary = data?.summary
  const reviews = data?.reviews ?? []
  const pagination = data?.pagination

  // Find if current user already has a review in this list
  const myReviewInList = reviews.find(
    (r) => (user?.id && r.customerId === user.id) || (user?.id && r.customer?.id === user.id)
  )

  const handleDelete = (reviewId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) {
      deleteMutation.mutate(reviewId)
    }
  }

  return (
    <section
      id='reviews'
      data-testid='voucher-review-section'
      style={{
        marginTop: '32px',
        padding: '24px',
        background: '#ffffff',
        borderRadius: radius.md,
        boxShadow: shadows.card,
        border: '1px solid #e5e7eb'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, fontFamily: fonts.display, color: colors.ink }}>
          Đánh giá từ khách hàng ({summary?.totalReviews ?? 0})
        </h3>

        {user?.role === 'CUSTOMER' && !myReviewInList && isEligible && (
          <div>
            {!showCreateForm ? (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => setShowCreateForm(true)}
                data-testid='write-review-btn'
              >
                ★ Viết đánh giá
              </Button>
            ) : (
              <Button variant='secondary' size='sm' onClick={() => setShowCreateForm(false)}>
                Đóng form
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Form: Create or Edit */}
      {showCreateForm && (
        <div style={{ marginBottom: '24px' }}>
          <ReviewForm
            voucherId={voucherId}
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {editingReview && (
        <div style={{ marginBottom: '24px' }}>
          <ReviewForm
            voucherId={voucherId}
            initialData={{
              id: editingReview.id,
              rating: editingReview.rating,
              comment: editingReview.comment
            }}
            onSuccess={() => setEditingReview(null)}
            onCancel={() => setEditingReview(null)}
          />
        </div>
      )}

      {/* Summary Box */}
      {summary && summary.totalReviews > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            alignItems: 'center',
            padding: '16px 20px',
            background: '#f9fafb',
            borderRadius: radius.sm,
            marginBottom: '24px'
          }}
          data-testid='review-summary-box'
        >
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '36px', fontWeight: 900, color: colors.accent, lineHeight: 1 }}>
              {summary.averageRating.toFixed(1)}
            </div>
            <div style={{ marginTop: '6px' }}>
              <StarRating value={summary.averageRating} size={18} />
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {summary.totalReviews} lượt đánh giá
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star] || 0
              const percent = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0
              return (
                <div
                  key={star}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', margin: '3px 0' }}
                >
                  <span style={{ width: '38px', color: '#4b5563', fontWeight: 600 }}>{star} sao</span>
                  <div
                    style={{ flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}
                  >
                    <div style={{ width: `${percent}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }} />
                  </div>
                  <span style={{ width: '28px', textAlign: 'right', color: '#9ca3af' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div style={{ padding: '30px 0', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner size='md' label='Đang tải đánh giá...' />
        </div>
      ) : isError ? (
        <div style={{ color: '#dc2626', fontSize: '14px', padding: '16px 0' }}>
          Không thể tải danh sách đánh giá. Vui lòng thử lại sau.
        </div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            color: '#6b7280',
            fontSize: '14px',
            background: '#fafafa',
            borderRadius: radius.sm
          }}
          data-testid='no-reviews-msg'
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
          Chưa có đánh giá nào cho voucher này.
          {user?.role === 'CUSTOMER' && isEligible && ' Hãy là người đầu tiên trải nghiệm và chia sẻ nhận xét!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid='reviews-list'>
          {reviews.map((r) => {
            const isOwner = (user?.id && r.customerId === user.id) || (user?.id && r.customer?.id === user.id)
            const canDelete = isOwner || user?.role === 'ADMIN'

            return (
              <div
                key={r.id}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #f3f4f6',
                  background: isOwner ? '#f8fafc' : 'transparent',
                  borderRadius: radius.sm
                }}
                data-testid={`review-item-${r.id}`}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--accent-light, #e0e7ff)',
                        color: 'var(--accent, #4338ca)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px'
                      }}
                    >
                      {r.customer?.fullName?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: colors.ink }}>
                        {r.customer?.fullName || 'Khách hàng'}
                        {isOwner && (
                          <span
                            style={{
                              marginLeft: '6px',
                              fontSize: '11px',
                              padding: '1px 6px',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}
                          >
                            Bạn
                          </span>
                        )}
                      </span>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDate(r.createdAt)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StarRating value={r.rating} size={16} />

                    {isOwner && (
                      <button
                        type='button'
                        onClick={() => {
                          setEditingReview(r)
                          setShowCreateForm(false)
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: '3px 8px'
                        }}
                        title='Chỉnh sửa đánh giá'
                        data-testid={`edit-review-${r.id}`}
                      >
                        Sửa
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type='button'
                        onClick={() => handleDelete(r.id)}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          color: '#dc2626',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: '3px 8px'
                        }}
                        title='Xóa đánh giá'
                        data-testid={`delete-review-${r.id}`}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>

                {r.comment && (
                  <p style={{ margin: '8px 0 0 40px', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
                    {r.comment}
                  </p>
                )}
              </div>
            )
          })}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <Button
                variant='secondary'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#6b7280' }}>
                Trang {page} / {pagination.totalPages}
              </span>
              <Button
                variant='secondary'
                size='sm'
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
