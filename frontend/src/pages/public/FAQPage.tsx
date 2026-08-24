import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../services/api'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { ContentSkeleton } from '../../components/ui'

interface FAQItem {
  id: string
  title: string
  body: string
}

export function FAQPage() {
  const [openIds, setOpenIds] = useState<string[]>([])

  const { data: faqs = [], isLoading } = useQuery<FAQItem[]>({
    queryKey: ['public-faqs'],
    queryFn: async () => {
      const response = await api.get('/content', { params: { type: 'faq' } })
      return response.data.data?.items ?? []
    }
  })

  const toggleFAQ = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 0 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 9999,
            background: '#d1fae5',
            color: '#047857',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 12
          }}
        >
          <HelpCircle size={16} /> Trợ giúp & Hỏi đáp
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
          Câu hỏi thường gặp (FAQ)
        </h1>
        <p style={{ fontSize: '1rem', color: colors.slate, margin: 0 }}>
          Giải đáp các thắc mắc phổ biến về quy trình đặt mua, sử dụng mã và bảo hành voucher.
        </p>
      </div>

      {isLoading ? (
        <ContentSkeleton rows={6} label='Đang tải câu hỏi thường gặp...' />
      ) : faqs.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            padding: 48,
            textAlign: 'center',
            borderRadius: radius.lg,
            border: `1px solid ${colors.hairline}`
          }}
        >
          <HelpCircle size={40} color={colors.slateMuted} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.1rem', color: colors.ink, marginBottom: 6 }}>Chưa có câu hỏi thường gặp</h3>
          <p style={{ fontSize: '0.9rem', color: colors.slate }}>Hệ thống đang tổng hợp các câu hỏi phổ biến.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((item) => {
            const isOpen = openIds.includes(item.id)
            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  borderRadius: radius.md,
                  border: `1px solid ${colors.hairline}`,
                  boxShadow: shadows.sm,
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => toggleFAQ(item.id)}
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isOpen ? '#f8fafc' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: colors.ink,
                    fontFamily: fonts.body
                  }}
                >
                  <span>{item.title}</span>
                  {isOpen ? (
                    <ChevronUp size={18} color={colors.slate} />
                  ) : (
                    <ChevronDown size={18} color={colors.slate} />
                  )}
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '16px 22px 20px',
                      fontSize: '0.95rem',
                      lineHeight: 1.65,
                      color: colors.slate,
                      borderTop: `1px solid ${colors.hairline}`,
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {item.body}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
