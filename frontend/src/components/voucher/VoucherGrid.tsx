/**
 * VoucherGrid — responsive grid of {@link VoucherCard}s (task 12.1).
 *
 * Handles the three presentational states of a catalogue listing: loading
 * (spinner), empty (friendly "no results" message), and populated (auto-fitting
 * card grid). Data fetching lives in the page; the grid is purely presentational.
 *
 * _Requirements: 11.1, 23.3_
 */
import type { CSSProperties } from 'react'
import { LoadingSpinner } from '../ui/LoadingSpinner'
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 16
}

export function VoucherGrid({
  vouchers,
  isLoading = false,
  emptyMessage = 'No vouchers match your search. Try adjusting the filters.'
}: VoucherGridProps) {
  if (isLoading) {
    return (
      <div style={{ padding: '48px 0' }}>
        <LoadingSpinner size='lg' label='Đang tải voucher' />
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
    <div style={gridStyle} data-testid='voucher-grid'>
      {vouchers.map((voucher) => (
        <VoucherCard key={voucher.id} voucher={voucher} />
      ))}
    </div>
  )
}

export default VoucherGrid
