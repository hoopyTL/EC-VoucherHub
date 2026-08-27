import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, StarRating, useToast } from '../ui'
import { createReview, updateReview } from '../../services/review.service'
import { colors, radius, fonts } from '../../theme/tokens'

export interface ReviewFormProps {
  voucherId: string
  orderId?: string
  initialData?: {
    id: string
    rating: number
    comment?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({ voucherId, orderId, initialData, onSuccess, onCancel }: ReviewFormProps) {
  const isEdit = Boolean(initialData?.id)
  const [rating, setRating] = useState<number>(initialData?.rating ?? 5)
  const [comment, setComment] = useState<string>(initialData?.comment ?? '')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit && initialData?.id) {
        return updateReview(initialData.id, {
          rating,
          comment: comment.trim() || undefined
        })
      }
      return createReview({
        voucherProductId: voucherId,
        orderId,
        rating,
        comment: comment.trim() || undefined
      })
    },
    onSuccess: () => {
      showToast(isEdit ? 'Đánh giá đã được cập nhật thành công!' : 'Đánh giá của bạn đã được gửi thành công!', {
        variant: 'success'
      })
      queryClient.invalidateQueries({ queryKey: ['voucher-reviews', voucherId] })
      queryClient.invalidateQueries({ queryKey: ['eligible-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Không thể lưu đánh giá. Vui lòng thử lại.'
      setErrorMsg(msg)
      showToast(msg, { variant: 'error' })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (rating < 1 || rating > 5) {
      setErrorMsg('Vui lòng chọn số sao từ 1 đến 5.')
      return
    }
    mutation.mutate()
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.md,
        padding: '20px',
        marginTop: '16px'
      }}
      data-testid='review-form'
    >
      <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, fontFamily: fonts.display }}>
        {isEdit ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá của bạn'}
      </h4>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: colors.ink }}>
          Chất lượng voucher & dịch vụ:
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StarRating value={rating} onChange={setRating} size={24} label='Chọn số sao' />
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.accent }}>{rating} sao</span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor='review-comment'
          style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: colors.ink }}
        >
          Nhận xét chi tiết (tùy chọn):
        </label>
        <textarea
          id='review-comment'
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder='Chia sẻ trải nghiệm của bạn khi sử dụng voucher này...'
          rows={3}
          maxLength={1000}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            borderRadius: radius.sm,
            border: `1px solid ${colors.hairlineStrong}`,
            fontFamily: fonts.body,
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ textAlign: 'right', fontSize: '12px', color: colors.slate, marginTop: '4px' }}>
          {comment.length}/1000 ký tự
        </div>
      </div>

      {errorMsg && (
        <div
          role='alert'
          style={{
            padding: '8px 12px',
            marginBottom: '14px',
            background: colors.dangerSurface,
            color: colors.onDangerSurface,
            borderRadius: radius.sm,
            fontSize: '13px'
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button type='button' variant='secondary' onClick={onCancel} disabled={mutation.isPending}>
            Hủy
          </Button>
        )}
        <Button type='submit' variant='primary' disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang lưu...' : isEdit ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
        </Button>
      </div>
    </form>
  )
}
