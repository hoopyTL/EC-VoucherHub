import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, FileText } from 'lucide-react'
import { api } from '../../services/api'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { ContentSkeleton } from '../../components/ui'
import { formatDate } from '../../utils/format'

interface PolicyItem {
  id: string
  title: string
  body: string
  updatedAt: string
}

export function PolicyPage() {
  const { data: policies = [], isLoading } = useQuery<PolicyItem[]>({
    queryKey: ['public-policies'],
    queryFn: async () => {
      const response = await api.get('/content', { params: { type: 'policy' } })
      return response.data.data?.items ?? []
    }
  })

  return (
    <div
      className='content-page content-page--policy'
      style={{ maxWidth: 880, margin: '0 auto', padding: '20px 0 60px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 9999,
            background: '#e0e7ff',
            color: '#4338ca',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 12
          }}
        >
          <ShieldCheck size={16} /> Quy định & Điều khoản
        </span>
        <h1
          style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            fontFamily: fonts.display,
            color: colors.ink,
            margin: '0 0 10px'
          }}
        >
          Chính sách hệ thống VoucherHub
        </h1>
        <p style={{ fontSize: '1rem', color: colors.slate, margin: 0 }}>
          Các điều khoản sử dụng, chính sách hoàn tiền và cam kết bảo vệ quyền lợi người mua.
        </p>
      </div>

      {isLoading ? (
        <ContentSkeleton rows={6} label='Đang tải chính sách...' />
      ) : policies.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            padding: 48,
            textAlign: 'center',
            borderRadius: radius.lg,
            border: `1px solid ${colors.hairline}`
          }}
        >
          <FileText size={40} color={colors.slateMuted} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.1rem', color: colors.ink, marginBottom: 6 }}>Chưa có nội dung chính sách</h3>
          <p style={{ fontSize: '0.9rem', color: colors.slate }}>
            Nội dung chính sách đang được ban quản trị cập nhật.
          </p>
        </div>
      ) : (
        <div className='policy-list' style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {policies.map((item) => (
            <article
              key={item.id}
              className='policy-item'
              style={{
                background: '#ffffff',
                padding: '28px 32px',
                borderRadius: radius.lg,
                border: `1px solid ${colors.hairline}`,
                boxShadow: shadows.sm
              }}
            >
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: colors.ink, margin: '0 0 12px' }}>
                {item.title}
              </h2>
              <div
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  color: colors.slate,
                  whiteSpace: 'pre-line',
                  marginBottom: 16
                }}
              >
                {item.body}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: colors.slateMuted,
                  borderTop: `1px solid ${colors.hairline}`,
                  paddingTop: 12
                }}
              >
                Cập nhật lần cuối: {formatDate(item.updatedAt)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
