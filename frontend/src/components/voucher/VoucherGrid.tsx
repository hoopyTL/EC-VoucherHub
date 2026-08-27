/**
 * VoucherGrid — responsive grid of {@link VoucherCard}s (task 12.1).
 *
 * Handles the three presentational states of a catalogue listing: loading
 * (spinner), empty (friendly "no results" message), and populated (auto-fitting
 * card grid). Data fetching lives in the page; the grid is purely presentational.
 *
 * _Requirements: 11.1, 23.3_
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { VoucherCard } from './VoucherCard'
import type { VoucherListItem } from '../../services/voucher.service'

export interface VoucherGridProps {
  vouchers: VoucherListItem[]
  /** When true, shows a centered loading spinner instead of the grid. */
  isLoading?: boolean
  /** Message shown when there are no vouchers and not loading. */
  emptyMessage?: string
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 12
}

function RevealCard({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (!('IntersectionObserver' in window)) {
      element.classList.add('is-visible')
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible')
          observer.unobserve(element)
        }
      },
      { threshold: 0.12 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className='voucher-reveal' style={{ '--reveal-delay': `${(index % 4) * 45}ms` } as CSSProperties}>
      {children}
    </div>
  )
}

export function VoucherGrid({
  vouchers,
  isLoading = false,
  emptyMessage = 'Không tìm thấy voucher phù hợp. Hãy thử điều chỉnh bộ lọc.'
}: VoucherGridProps) {
  if (isLoading) {
    return (
      <div role='status' style={gridStyle} aria-label='Đang tải voucher' aria-busy='true'>
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className='voucher-skeleton' style={{ height: 390, borderRadius: 16 }} />
        ))}
      </div>
    )
  }

  if (vouchers.length === 0) {
    return (
      <p data-testid='voucher-grid-empty' style={{ padding: '48px 0', textAlign: 'center', color: '#6b7280' }}>
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className='voucher-grid-list' style={gridStyle} data-testid='voucher-grid'>
      {vouchers.map((voucher, index) => (
        <RevealCard key={voucher.id} index={index}>
          <VoucherCard voucher={voucher} />
        </RevealCard>
      ))}
    </div>
  )
}

export default VoucherGrid
