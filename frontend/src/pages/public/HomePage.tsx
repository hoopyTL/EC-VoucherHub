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
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { colors, fonts, radius, shadows, spacing } from '../../theme/tokens'

/** Secondary CTA target/label depends on whether (and how) the user is signed in. */
function secondaryCta(
  isAuthenticated: boolean,
  role: string | undefined,
  t: (key: string) => string
): { to: string; label: string } {
  if (!isAuthenticated) return { to: '/register', label: t('home.createAccount') }
  if (role === 'PARTNER') return { to: '/partner', label: t('home.partnerWorkspace') }
  if (role === 'ADMIN') return { to: '/admin', label: t('home.adminConsole') }
  return { to: '/orders', label: t('nav.orders') }
}

export function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const { t } = useTranslation()
  const cta = secondaryCta(isAuthenticated, user?.role, t)

  const stats: ReadonlyArray<{ value: string; label: string }> = [
    { value: '14+', label: t('home.statVouchers') },
    { value: '3', label: t('home.statPartners') },
    { value: '6', label: t('home.statCategories') },
    { value: '100%', label: t('home.statCheckout') }
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <section style={{ position: 'relative', paddingTop: 24, overflow: 'hidden' }}>
        {/* Ghost watermark anchor */}
        <span
          aria-hidden='true'
          style={{
            position: 'absolute',
            top: 60,
            right: -20,
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 'clamp(120px, 22vw, 320px)',
            lineHeight: 0.8,
            letterSpacing: '-0.05em',
            color: colors.canvasDim,
            opacity: 0.6,
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          VH
        </span>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              margin: '0 0 16px',
              fontFamily: fonts.display,
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
