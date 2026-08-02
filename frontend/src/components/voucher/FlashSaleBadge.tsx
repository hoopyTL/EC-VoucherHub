/**
 * FlashSaleBadge — a "FLASH SALE" pill with a live countdown to the deal's end
 * (Phase 3). Renders nothing when the flash sale is not active or has no end.
 *
 * The countdown ticks every second via a local timer; when it reaches zero the
 * badge calls `onExpire` (so the parent can refetch the now-regular price) and
 * stops rendering. Monochrome per the design language — the inverted ink pill
 * gives it urgency without introducing colour.
 */
import { useEffect, useState } from 'react'
import { colors, fonts, radius } from '../../theme/tokens'

export interface FlashSaleBadgeProps {
  /** ISO timestamp when the flash sale ends. */
  endsAt: string
  /** Called once when the countdown crosses zero. */
  onExpire?: () => void
  size?: 'sm' | 'md'
}

/** Format milliseconds remaining as `D:HH:MM:SS` (omitting days when zero). */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days > 0 ? `${days}d ${hms}` : hms
}

export function FlashSaleBadge({ endsAt, onExpire, size = 'md' }: FlashSaleBadgeProps) {
  const end = new Date(endsAt).getTime()
  const [remaining, setRemaining] = useState(() => end - Date.now())

  useEffect(() => {
    const tick = () => {
      const next = end - Date.now()
      setRemaining(next)
      if (next <= 0) onExpire?.()
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [endsAt])

  if (remaining <= 0) return null

  const fontSize = size === 'sm' ? 11 : 12

  return (
    <span
      data-testid='flash-sale-badge'
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: fonts.display,
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: colors.onInk,
        background: colors.ink,
        borderRadius: radius.full,
        padding: size === 'sm' ? '3px 10px' : '5px 12px'
      }}
    >
      <span aria-hidden='true'>⚡ Flash sale</span>
      <span
        style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}
        aria-label={`Flash sale ends in ${formatRemaining(remaining)}`}
      >
        {formatRemaining(remaining)}
      </span>
    </span>
  )
}

export default FlashSaleBadge
