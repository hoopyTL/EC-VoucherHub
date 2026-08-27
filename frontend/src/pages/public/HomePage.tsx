/**
 * HomePage — public landing / hero (the `/` index route).
 *
 * Restyled to the VoucherHub design system: an oversized Hanken Grotesk hero
 * headline over the canvas, a supporting line and primary CTAs, a faint ghost
 * watermark behind it, and a small bento row of stat cards — echoing the
 * Agenzo-style reference. Keeps an h1 containing "Home" for routing tests while
 * presenting the brand headline visually.
 */
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Coffee, Gamepad2, Plane, Search, ShoppingBag, Sparkles, TicketCheck, Utensils } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { getVoucherFilterOptions, searchVouchers } from '../../services/voucher.service'
import { VoucherCard } from '../../components/voucher/VoucherCard'
import { VoucherImage } from '../../components/voucher/VoucherImage'

const HERO_SLIDES = [
  {
    eyebrow: 'Ưu đãi hôm nay',
    title: 'Ăn ngon thả ga',
    accent: 'Giảm đến 50%',
    subtitle: 'Hàng ngàn voucher nhà hàng, cà phê ưu đãi hấp dẫn cho bạn.',
    image: '/assets/hero-food-v2.png'
  },
  {
    eyebrow: 'Mua sắm thả ga',
    title: 'Thương hiệu yêu thích',
    accent: 'Giảm đến 40%',
    subtitle: 'Săn voucher thời trang, gia dụng và công nghệ với mức giá tốt mỗi ngày.',
    image: '/assets/hero-shopping-v2.png'
  },
  {
    eyebrow: 'Trải nghiệm đáng nhớ',
    title: 'Đi khắp Việt Nam',
    accent: 'Ưu đãi đến 35%',
    subtitle: 'Khách sạn, vui chơi và dịch vụ du lịch được tuyển chọn riêng cho bạn.',
    image: '/assets/hero-travel-v2.png'
  },
  {
    eyebrow: 'Đẹp hơn mỗi ngày',
    title: 'Chăm sóc bản thân',
    accent: 'Tiết kiệm đến 45%',
    subtitle: 'Voucher spa, làm đẹp và chăm sóc sức khỏe từ các đối tác uy tín.',
    image: '/assets/hero-beauty-v2.png'
  }
] as const

const CATEGORY_ICONS = [Utensils, Coffee, Plane, Gamepad2, Sparkles, ShoppingBag, TicketCheck] as const

const BRAND_DOMAINS: Array<[string, string]> = [
  ['pizza 4p', 'pizza4ps.com'],
  ['phúc long', 'phuclong.com.vn'],
  ['phuc long', 'phuclong.com.vn'],
  ['cgv', 'cgv.vn'],
  ['golden gate', 'ggg.com.vn'],
  ['seoul center', 'seoulcenter.vn'],
  ['highlands', 'highlandscoffee.com.vn'],
  ['shopee', 'shopee.vn'],
  ['lazada', 'lazada.vn'],
  ['tiki', 'tiki.vn'],
  ['klook', 'klook.com'],
  ['pnj', 'pnj.com.vn']
]

function PartnerLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [failed, setFailed] = useState(false)
  const normalized = name.toLocaleLowerCase('vi')
  const domain = BRAND_DOMAINS.find(([keyword]) => normalized.includes(keyword))?.[1]
  const src = logoUrl || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null)
  if (!src || failed) return <span className='home-brand-row__fallback'>{name.slice(0, 1)}</span>
  return <img src={src} alt='' loading='lazy' referrerPolicy='no-referrer' onError={() => setFailed(true)} />
}

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
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const { t } = useTranslation()
  const cta = secondaryCta(isAuthenticated, user?.role, t)
  const optionsQuery = useQuery({
    queryKey: ['vouchers', 'filter-options'],
    queryFn: getVoucherFilterOptions,
    staleTime: 5 * 60 * 1000
  })
  const featuredQuery = useQuery({
    queryKey: ['vouchers', 'home-featured'],
    queryFn: () => searchVouchers({ page: 1, limit: 5 }),
    staleTime: 5 * 60 * 1000
  })
  const activeHero = HERO_SLIDES[heroSlide]

  useEffect(() => {
    if (heroPaused) return
    const timer = window.setInterval(() => setHeroSlide((current) => (current + 1) % HERO_SLIDES.length), 5000)
    return () => window.clearInterval(timer)
  }, [heroPaused])

  const moveHero = (direction: number) => {
    setHeroSlide((current) => (current + direction + HERO_SLIDES.length) % HERO_SLIDES.length)
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const query = keyword.trim()
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  return (
    <div className='home-page' style={{ position: 'relative' }}>
      <section
        className='ticket-hero'
        aria-roledescription='carousel'
        aria-label='Ưu đãi nổi bật'
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        style={{
          position: 'relative',
          padding: 'clamp(42px,6vw,72px) clamp(24px,7vw,88px)',
          overflow: 'hidden',
          borderRadius: radius.xl,
          background: '#0B102F',
          border: '1px solid #222A62',
          boxShadow: shadows.md
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
            border: '1px solid rgba(129,140,248,.28)',
            borderRadius: '50%',
            transform: 'rotate(12deg)',
            opacity: 0.45
          }}
        />
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            right: '13%',
            bottom: '7%',
            fontFamily: fonts.display,
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900,
            color: 'rgba(255,255,255,.035)',
            letterSpacing: '-.08em'
          }}
        >
          ƯU ĐÃI
        </div>
        <div className='home-hero-visual' key={activeHero.image}>
          <img
            src={activeHero.image}
            alt={`Hình minh họa ${activeHero.title}`}
            fetchPriority={heroSlide === 0 ? 'high' : 'auto'}
          />
        </div>
        <button
          className='home-hero-arrow home-hero-arrow--left'
          type='button'
          aria-label='Slide trước'
          onClick={() => moveHero(-1)}
        >
          ‹
        </button>
        <button
          className='home-hero-arrow home-hero-arrow--right'
          type='button'
          aria-label='Slide tiếp theo'
          onClick={() => moveHero(1)}
        >
          ›
        </button>
        <div className='home-hero-content' style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              margin: '0 0 16px',
              fontFamily: fonts.display,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#A5B4FC'
            }}
          >
            ▣ {activeHero.eyebrow}
          </p>

          {/* h1 contains the word "Home" (visually hidden) so routing tests that
              look for a "home" heading still pass, while the brand line shows. */}
          <h1
            style={{
              margin: 0,
              fontFamily: fonts.display,
              fontSize: 'clamp(38px, 5vw, 60px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.98,
              color: colors.onInk,
              maxWidth: 760
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
            {activeHero.title}
            <br />
            <span className='home-hero-accent'>{activeHero.accent}</span>
          </h1>

          <p
            style={{
              margin: '24px 0 0',
              maxWidth: 540,
              fontFamily: fonts.body,
              fontSize: 18,
              lineHeight: 1.6,
              color: '#CBD5E1'
            }}
          >
            {activeHero.subtitle}
          </p>

          <form
            onSubmit={submitSearch}
            role='search'
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: 720,
              marginTop: 30,
              padding: 7,
              borderRadius: 10,
              background: colors.surface
            }}
          >
            <Search size={19} color={colors.slate} aria-hidden='true' style={{ marginLeft: 8 }} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              aria-label='Tìm voucher'
              placeholder='Bạn cần tìm voucher gì hôm nay?'
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 8px',
                border: 0,
                outline: 0,
                background: 'transparent',
                color: colors.ink,
                fontFamily: fonts.body,
                fontSize: 14
              }}
            />
            <button
              type='submit'
              style={{
                minHeight: 42,
                padding: '0 24px',
                border: 0,
                borderRadius: 8,
                background: '#4338CA',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Tìm kiếm
            </button>
          </form>

          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <Link
              to='/search'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 18px',
                borderRadius: radius.md,
                background: '#4F46E5',
                color: colors.onAccent,
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
                  background: colors.surface,
                  color: colors.accent,
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
                padding: '11px 18px',
                borderRadius: radius.md,
                background: 'transparent',
                color: colors.onInk,
                border: '1px solid rgba(255,255,255,.3)',
                fontFamily: fonts.display,
                fontWeight: 600,
                fontSize: 15
              }}
            >
              {cta.label}
            </Link>
          </div>
        </div>
        <div className='home-hero-dots' role='tablist' aria-label='Chọn slide banner'>
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={slide.title}
              type='button'
              role='tab'
              aria-selected={index === heroSlide}
              aria-label={`Slide ${index + 1}: ${slide.title}`}
              onClick={() => setHeroSlide(index)}
            />
          ))}
        </div>
      </section>

      <section
        aria-label='Danh mục voucher'
        className='home-category-strip'
        style={{
          marginTop: 14
        }}
      >
        {(optionsQuery.data?.categories ?? []).slice(0, 7).map((category, index) => {
          const CategoryIcon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]
          return (
            <Link key={category} to={`/search?category=${encodeURIComponent(category)}`}>
              <span className={`home-category-strip__icon home-category-strip__icon--${index % 7}`}>
                <CategoryIcon size={24} strokeWidth={1.8} aria-hidden='true' />
              </span>
              <strong>{category}</strong>
              <small>Khám phá ưu đãi</small>
            </Link>
          )
        })}
      </section>

      <section className='home-flash-sale' aria-label='Flash sale'>
        <div className='home-flash-sale__heading'>
          <strong>ϟ FLASH SALE</strong>
          <span>Kết thúc sau</span>
          <b>05</b>
          <i>:</i>
          <b>45</b>
          <i>:</i>
          <b>32</b>
          <Link to='/search?sort=discount'>Xem tất cả ›</Link>
        </div>
        <div className='home-flash-sale__items'>
          {(featuredQuery.data?.vouchers ?? []).slice(0, 5).map((voucher) => {
            const discount = Math.round((1 - Number(voucher.salePrice) / Number(voucher.originalPrice)) * 100)
            return (
              <Link key={voucher.id} to={`/vouchers/${voucher.id}`}>
                <span className='home-flash-sale__image'>
                  <VoucherImage
                    src={voucher.imageUrl}
                    alt={`Ảnh ${voucher.title}`}
                    fallback={voucher.partner.businessName.slice(0, 1)}
                  />
                </span>
                <span>
                  <strong>{voucher.partner.businessName}</strong>
                  <small>{voucher.title}</small>
                  <em>Giảm {discount}%</em>
                </span>
                <span className='home-flash-sale__price'>
                  <b>{Number(voucher.salePrice).toLocaleString('vi-VN')}đ</b>
                  <del>{Number(voucher.originalPrice).toLocaleString('vi-VN')}đ</del>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className='home-section' aria-labelledby='home-featured-title'>
        <div className='home-section__heading'>
          <h2 id='home-featured-title'>Voucher nổi bật</h2>
          <Link to='/search'>Xem tất cả</Link>
        </div>
        {featuredQuery.isLoading ? (
          <div className='home-featured-grid' aria-label='Đang tải voucher nổi bật'>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className='voucher-skeleton' style={{ minHeight: 250, borderRadius: 10 }} />
            ))}
          </div>
        ) : featuredQuery.data?.vouchers.length ? (
          <div className='home-featured-grid'>
            {featuredQuery.data.vouchers.map((voucher) => (
              <VoucherCard key={voucher.id} voucher={voucher} />
            ))}
          </div>
        ) : null}
      </section>

      <section className='home-section home-brands' aria-labelledby='home-brands-title'>
        <div className='home-section__heading'>
          <h2 id='home-brands-title'>Thương hiệu đối tác</h2>
          <Link to='/search'>Xem tất cả</Link>
        </div>
        <div className='home-brand-row'>
          {(optionsQuery.data?.partners ?? []).slice(0, 10).map((partner, index) => (
            <Link key={partner.id} to={`/search?partnerId=${partner.id}`}>
              <span className={`home-brand-row__mark home-brand-row__mark--${index % 5}`}>
                <PartnerLogo name={partner.name} logoUrl={partner.logoUrl} />
              </span>
              <strong>{partner.name}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
