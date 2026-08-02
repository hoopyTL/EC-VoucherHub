/**
 * QRCodeDisplay — a *real*, scannable QR code (task 12.4, Req 17.2).
 *
 * Encodes the voucher code value into an actual QR symbol using the `qrcode`
 * library, so the rendered image can be scanned by any standard QR reader and
 * resolves back to the human-readable code (which remains the source of truth).
 *
 * Rendering strategy: we generate an inline SVG string via `QRCode.toString`
 * and inject it with `dangerouslySetInnerHTML`. The SVG generator runs
 * synchronously (no canvas required), which keeps the component renderable in
 * jsdom and lets the container appear on first paint — no async/effect needed.
 *
 * Visuals follow the VoucherHub "Canvas and Ink" system: a monochrome symbol
 * (ink foreground on a white field) inside a rounded, hairline-framed white
 * card.
 */
import type { CSSProperties } from 'react'
import QRCode from 'qrcode'
import { colors, radius } from '../../theme/tokens'

export interface QRCodeDisplayProps {
  /** The voucher code value the QR encodes. */
  value: string
  /** Overall pixel size (width and height) of the rendered block. Defaults to 192. */
  size?: number
  /**
   * Accepted for backwards compatibility. The previous simulated grid used this
   * to control its module count; a real QR derives its module count from the
   * encoded data, so this prop is now ignored.
   */
  gridSize?: number
  className?: string
  style?: CSSProperties
}

/** Ink foreground / white field — strictly monochrome per the design system. */
const FG = colors.ink
const BG = colors.surface

/**
 * Synchronously build an inline SVG QR symbol for `value`.
 *
 * `QRCode.toString` with `type: 'svg'` performs no async work, so the callback
 * fires immediately and we can return the markup inline. Returns `null` when
 * the value cannot be encoded (e.g. an empty string), so callers can still
 * render the surrounding container.
 */
export function buildQrSvg(value: string): string | null {
  let svg: string | null = null
  QRCode.toString(
    value,
    {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: FG, light: BG }
    },
    (error, result) => {
      if (!error && result) {
        // Make the symbol fill the (padded) container; the source SVG only
        // carries a viewBox, so we add explicit sizing and block display.
        svg = result.replace('<svg ', '<svg width="100%" height="100%" style="display:block" ')
      }
    }
  )
  return svg
}

export function QRCodeDisplay({ value, size = 192, className, style }: QRCodeDisplayProps) {
  const markup = buildQrSvg(value)

  const wrapperStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    padding: 8,
    background: BG,
    border: `1px solid ${colors.hairline}`,
    borderRadius: radius.md,
    boxSizing: 'border-box',
    ...style
  }

  return (
    <div
      className={className}
      style={wrapperStyle}
      role='img'
      aria-label={`QR code for voucher code ${value}`}
      data-testid='qr-code-display'
      data-value={value}
      {...(markup ? { dangerouslySetInnerHTML: { __html: markup } } : {})}
    />
  )
}

export default QRCodeDisplay
