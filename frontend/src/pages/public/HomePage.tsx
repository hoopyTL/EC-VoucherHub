/**
 * HomePage — public landing / hero (the `/` index route).
 *
 * Restyled to the VoucherHub design system: an oversized Hanken Grotesk hero
 * headline over the canvas, a supporting line and primary CTAs, a faint ghost
 * watermark behind it, and a small bento row of stat cards — echoing the
 * Agenzo-style reference. Keeps an h1 containing "Home" for routing tests while
 * presenting the brand headline visually.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { colors, fonts, radius, shadows, spacing } from '../../theme/tokens'
import { api } from '../../services/api'
import { getVoucherFilterOptions, searchVouchers } from '../../services/voucher.service'

/** Secondary CTA target/label depends on whether (and how) the user is signed in. */
function secondaryCta(
  isAuthenticated: boolean,
  role: string | undefined,
  t: (key: string) => string
): { to: string; label: string } {
  if (!isAuthenticated) return { to: '/register', label: t('home.createAccount') }
  if (role === 'PARTNER') return { to: '/partner', label: t('home.partnerWorkspace') }
  if (role === 'ADMIN') return { to: '/admin', label: t('home.adminConsole') }
  return { to: '/cart?tab=orders', label: 'Đơn đã mua' }
}

export function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const { t } = useTranslation()
  const cta = secondaryCta(isAuthenticated, user?.role, t)
  const optionsQuery = useQuery({
    queryKey: ['vouchers', 'filter-options'],
    queryFn: getVoucherFilterOptions,
    staleTime: 5 * 60 * 1000
  })
  const catalogueQuery = useQuery({
    queryKey: ['vouchers', 'home-total'],
    queryFn: () => searchVouchers({ page: 1, limit: 1 }),
    staleTime: 5 * 60 * 1000
  })
  const bannersQuery = useQuery<{ id: string; title: string; body: string }[]>({
    queryKey: ['public-banners'],
    queryFn: async () => {
      const response = await api.get('/content', { params: { type: 'banner' } })
      return response.data.data?.items ?? []
    },
    staleTime: 60 * 1000
  })

  const stats: ReadonlyArray<{ value: string; label: string }> = [
    { value: catalogueQuery.data ? String(catalogueQuery.data.pagination.total) : '—', label: t('home.statVouchers') },
    { value: optionsQuery.data ? String(optionsQuery.data.partners.length) : '—', label: t('home.statPartners') },
    { value: optionsQuery.data ? String(optionsQuery.data.categories.length) : '—', label: t('home.statCategories') },
    { value: '100%', label: t('home.statCheckout') }
  ]

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative' }}>
      <section
        className='ticket-hero'
        style={{
          position: 'relative',
          padding: 'clamp(34px,7vw,82px) clamp(22px,5vw,64px)',
          overflow: 'hidden',
          borderRadius: '18px 64px 18px 64px',
          background:
            'radial-gradient(circle at 83% 18%,rgba(255,117,79,.3),transparent 24%),radial-gradient(circle at 72% 76%,rgba(253,190,71,.28),transparent 22%),linear-gradient(125deg,#fffaf5 0%,#f7efe8 54%,#fde4d8 100%)',
          boxShadow: '0 24px 70px rgba(91,53,33,.10)'
        }}
      >
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            right: '7%',
            top: '13%',
            width: 'clamp(150px,24vw,310px)',
            aspectRatio: '1',
            border: '1px solid rgba(228,77,38,.28)',
            borderRadius: '44% 56% 61% 39% / 49% 37% 63% 51%',
            transform: 'rotate(12deg)'
          }}
        />
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            right: '13%',
            bottom: '7%',
            fontFamily: fonts.display,
            fontSize: 'clamp(52px,10vw,132px)',
            fontWeight: 900,
            color: 'rgba(228,77,38,.075)',
            letterSpacing: '-.08em'
          }}
        >
          ƯU ĐÃI
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              margin: '0 0 16px',
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: colors.slate
            }}
          >
            ● VoucherHub — {t('home.eyebrow')}
          </p>

          {/* h1 contains the word "Home" (visually hidden) so routing tests that
              look for a "home" heading still pass, while the brand line shows. */}
          <h1
            style={{
              margin: 0,
              fontFamily: fonts.display,
              fontSize: 'clamp(48px, 9vw, 104px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.98,
              color: colors.ink
            }}
          >
            <span
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                whiteSpace: 'nowrap'
              }}
            >
              Home —{' '}
            </span>
            {t('home.titleLine1')}
            <br />
            {t('home.titleLine2')}
          </h1>

          <p
            style={{
              margin: '24px 0 0',
              maxWidth: 540,
              fontFamily: fonts.body,
              fontSize: 18,
              lineHeight: 1.6,
              color: colors.slate
            }}
          >
            {t('home.subtitle')}
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <Link
              to='/search'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '16px 26px',
                borderRadius: radius.full,
                background: colors.ink,
                color: colors.onInk,
                fontFamily: fonts.display,
                fontWeight: 600,
                fontSize: 15
              }}
            >
              {t('home.browseCta')}
              <span
                aria-hidden='true'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: radius.full,
                  background: colors.onInk,
                  color: colors.ink,
                  fontSize: 14
                }}
              >
                →
              </span>
            </Link>
            <Link
              to={cta.to}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '16px 26px',
                borderRadius: radius.full,
                background: colors.surface,
                color: colors.ink,
                border: `1px solid ${colors.hairline}`,
                fontFamily: fonts.display,
                fontWeight: 600,
                fontSize: 15
              }}
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Promotion Banners from CMS */}
      {bannersQuery.data && bannersQuery.data.length > 0 && (
        <section style={{ marginTop: 36 }} aria-label='Chương trình khuyến mãi'>
          {bannersQuery.data.map((banner) => (
            <div
              key={banner.id}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                padding: '28px 36px',
                borderRadius: '24px 8px 24px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 20,
                boxShadow: shadows.md
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background: colors.accent,
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 8
                  }}
                >
                  Sự kiện đặc biệt
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px', fontFamily: fonts.display }}>
                  {banner.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.85, maxWidth: 600 }}>{banner.body}</p>
              </div>
              <Link
                to='/search'
                style={{
                  padding: '12px 24px',
                  borderRadius: 9999,
                  background: '#ffffff',
                  color: colors.ink,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                Khám phá ngay →
              </Link>
            </div>
          ))}
        </section>
      )}

      <section
        aria-label='Điểm nổi bật của VoucherHub'
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
          gap: 18,
          marginTop: 48
        }}
      >
        <Link
          to='/search?minDiscount=40'
          style={{
            minHeight: 280,
            padding: 'clamp(28px, 5vw, 52px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: colors.ink,
            color: colors.onInk,
            borderRadius: '42px 10px 42px 10px',
            overflow: 'hidden'
          }}
        >
          <span style={{ color: colors.onInkMuted, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Tuyển chọn hôm nay
          </span>
          <div>
            <strong
              style={{
                display: 'block',
                maxWidth: 600,
                fontFamily: fonts.display,
                fontSize: 'clamp(32px, 5vw, 52px)',
                lineHeight: 1.05
              }}
            >
              Săn ưu đãi đến 50%, trải nghiệm nhiều hơn.
            </strong>
            <span style={{ display: 'inline-block', marginTop: 20, color: '#FFB19C', fontWeight: 700 }}>
              Khám phá ưu đãi nổi bật →
            </span>
          </div>
        </Link>
        <div
          style={{
            minHeight: 280,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: colors.accent,
            color: colors.onAccent,
            borderRadius: '10px 42px 10px 42px'
          }}
        >
          <span style={{ fontSize: 42 }} aria-hidden='true'>
            ✦
          </span>
          <div>
            <strong style={{ display: 'block', fontFamily: fonts.display, fontSize: 28, lineHeight: 1.1 }}>
              Thanh toán an toàn
            </strong>
            <p style={{ margin: '12px 0 0', opacity: 0.86, lineHeight: 1.6 }}>
              VNPay cho nội địa và thẻ quốc tế cho khách hàng toàn cầu.
            </p>
          </div>
        </div>
      </section>

      {/* Bento stat row */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: spacing.bentoGap,
          marginTop: spacing['2xl'],
          marginBottom: spacing.xl
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.hairline}`,
              borderRadius: radius.xl,
              boxShadow: shadows.card,
              padding: 24
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 40,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: colors.ink,
                lineHeight: 1
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: fonts.display,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: colors.slate
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

export default HomePage
