/**
 * StarRating — monochrome star rating, display or interactive (Phase 3).
 *
 * In display mode (default) it renders five stars filled to `value` (supports
 * halves visually by rounding) and is purely presentational. In interactive
 * mode (`onChange` provided) each star is a button so the customer can pick a
 * 1–5 rating with mouse or keyboard.
 *
 * Stays within the VoucherHub monochrome language: filled = ink, empty =
 * hairline. No colour is introduced.
 */
import { useState, type CSSProperties } from 'react'
import { colors } from '../../theme/tokens'

export interface StarRatingProps {
  /** Current rating value (0–5). */
  value: number
  /** When provided, the control is interactive and calls back with 1–5. */
  onChange?: (value: number) => void
  /** Star glyph size in px. */
  size?: number
  /** Accessible label for the group (interactive mode). */
  label?: string
}

const STAR_FILLED = '★'
const STAR_EMPTY = '☆'

export function StarRating({ value, onChange, size = 18, label = 'Rating' }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const interactive = typeof onChange === 'function'
  const shown = hover ?? value

  const stars = [1, 2, 3, 4, 5]

  if (!interactive) {
    // Display-only: a single accessible label, stars are decorative.
    return (
      <span role='img' aria-label={`${value} out of 5 stars`} style={{ display: 'inline-flex', gap: 1, lineHeight: 1 }}>
        {stars.map((s) => (
          <span
            key={s}
            aria-hidden='true'
            style={{ fontSize: size, color: s <= Math.round(value) ? colors.ink : colors.hairlineStrong }}
          >
            {s <= Math.round(value) ? STAR_FILLED : STAR_EMPTY}
          </span>
        ))}
      </span>
    )
  }

  return (
    <span
      role='radiogroup'
      aria-label={label}
      style={{ display: 'inline-flex', gap: 2 }}
      onMouseLeave={() => setHover(null)}
    >
      {stars.map((s) => {
        const filled = s <= shown
        const btnStyle: CSSProperties = {
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: size,
          lineHeight: 1,
          color: filled ? colors.ink : colors.hairlineStrong
        }
        return (
          <button
            key={s}
            type='button'
            role='radio'
            aria-checked={value === s}
            aria-label={`${s} star${s === 1 ? '' : 's'}`}
            style={btnStyle}
            onMouseEnter={() => setHover(s)}
            onClick={() => onChange?.(s)}
          >
            {filled ? STAR_FILLED : STAR_EMPTY}
          </button>
        )
      })}
    </span>
  )
}

export default StarRating
