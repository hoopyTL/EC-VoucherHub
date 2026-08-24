/**
 * LoadingSpinner — accessible loading indicator for asynchronous operations.
 *
 * Satisfies Requirement 23.3 (display loading indicators during async operations).
 * Self-contained with inline styles and a one-time injected keyframe animation,
 * so it carries no dependency on a global stylesheet.
 */
import type { CSSProperties } from 'react'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface LoadingSpinnerProps {
  /** Diameter preset of the spinner. Defaults to `md`. */
  size?: SpinnerSize
  /** Stroke/track color. Defaults to `currentColor`. */
  color?: string
  /** Accessible label announced to assistive technology. Defaults to `Loading`. */
  label?: string
  /** Render an inline (non-centered) spinner. Defaults to `false` (centered block). */
  inline?: boolean
  /** Additional inline styles merged onto the wrapper. */
  style?: CSSProperties
  className?: string
}

const SIZE_MAP: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 40
}

const KEYFRAME_ID = 'ui-spinner-keyframes'

/** Inject the spin keyframes once per document. */
function ensureKeyframes(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(KEYFRAME_ID)) return
  const style = document.createElement('style')
  style.id = KEYFRAME_ID
  style.textContent = '@keyframes ui-spinner-rotate { to { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}

export function LoadingSpinner({
  size = 'md',
  color = 'currentColor',
  label = 'Đang tải',
  inline = false,
  style,
  className
}: LoadingSpinnerProps) {
  ensureKeyframes()

  const dimension = SIZE_MAP[size]
  const borderWidth = Math.max(2, Math.round(dimension / 8))

  const wrapperStyle: CSSProperties = {
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style
  }

  const circleStyle: CSSProperties = {
    width: dimension,
    height: dimension,
    border: `${borderWidth}px solid rgba(0, 0, 0, 0.12)`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'ui-spinner-rotate 0.8s linear infinite',
    boxSizing: 'border-box'
  }

  return (
    <span className={className} style={wrapperStyle} role='status' aria-live='polite' aria-busy='true'>
      <span style={circleStyle} aria-hidden='true' data-testid='spinner-circle' />
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        {label}
      </span>
    </span>
  )
}

export default LoadingSpinner
