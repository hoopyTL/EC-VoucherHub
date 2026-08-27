/**
 * Pagination — page navigation control for paged lists (vouchers, orders, etc.).
 *
 * Renders Previous/Next controls plus a windowed set of page buttons with
 * ellipses for large page counts. Page numbers are 1-indexed to match the
 * backend `page`/`limit` query params described in the design.
 */
import type { CSSProperties } from 'react'
import { colors, fonts, radius } from '../../theme/tokens'

export interface PaginationProps {
  /** Current page (1-indexed). */
  currentPage: number
  /** Total number of pages (>= 1). */
  totalPages: number
  /** Called with the requested page when the user navigates. */
  onPageChange: (page: number) => void
  /** How many page buttons to show around the current page. Defaults to 1. */
  siblingCount?: number
  className?: string
  style?: CSSProperties
}

const DOTS = 'dots'

/**
 * Builds the list of page items to render. Returns page numbers interleaved
 * with `'dots'` markers where ranges are collapsed.
 */
export function buildPageRange(currentPage: number, totalPages: number, siblingCount = 1): Array<number | typeof DOTS> {
  // Pages that are always shown: first, last, current +/- siblings.
  // Total slots = first + last + current + 2*siblings + 2 dot placeholders.
  const totalPageNumbers = siblingCount * 2 + 5

  if (totalPageNumbers >= totalPages) {
    return range(1, totalPages)
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1)
  const rightSibling = Math.min(currentPage + siblingCount, totalPages)

  const showLeftDots = leftSibling > 2
  const showRightDots = rightSibling < totalPages - 1

  if (!showLeftDots && showRightDots) {
    const leftItemCount = 3 + 2 * siblingCount
    return [...range(1, leftItemCount), DOTS, totalPages]
  }

  if (showLeftDots && !showRightDots) {
    const rightItemCount = 3 + 2 * siblingCount
    return [1, DOTS, ...range(totalPages - rightItemCount + 1, totalPages)]
  }

  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, totalPages]
}

function range(start: number, end: number): number[] {
  const length = Math.max(end - start + 1, 0)
  return Array.from({ length }, (_, i) => start + i)
}

const buttonBase: CSSProperties = {
  minWidth: 38,
  height: 38,
  padding: '0 10px',
  fontSize: 14,
  fontFamily: fonts.display,
  fontWeight: 600,
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  color: colors.ink,
  cursor: 'pointer'
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  style
}: PaginationProps) {
  // Nothing to paginate.
  if (totalPages <= 1) return null

  const pages = buildPageRange(currentPage, totalPages, siblingCount)
  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  const navButtonStyle = (disabledState: boolean): CSSProperties => ({
    ...buttonBase,
    cursor: disabledState ? 'not-allowed' : 'pointer',
    opacity: disabledState ? 0.5 : 1
  })

  return (
    <nav
      className={className}
      aria-label='Phân trang'
      style={{ display: 'flex', alignItems: 'center', gap: 4, ...style }}
    >
      <button
        type='button'
        style={navButtonStyle(isFirst)}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirst}
        aria-label='Trang trước'
      >
        ‹
      </button>

      {pages.map((page, index) => {
        if (page === DOTS) {
          return (
            <span
              // Dots positions are stable for a given range, index key is fine.
              key={`dots-${index}`}
              aria-hidden='true'
              style={{ minWidth: 38, textAlign: 'center', color: colors.slateMuted }}
            >
              …
            </span>
          )
        }

        const isActive = page === currentPage
        return (
          <button
            key={page}
            type='button'
            onClick={() => onPageChange(page)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              ...buttonBase,
              background: isActive ? colors.ink : colors.surface,
              color: isActive ? colors.onInk : colors.ink,
              borderColor: isActive ? colors.ink : colors.hairline
            }}
          >
            {page}
          </button>
        )
      })}

      <button
        type='button'
        style={navButtonStyle(isLast)}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLast}
        aria-label='Trang sau'
      >
        ›
      </button>
    </nav>
  )
}

export default Pagination
