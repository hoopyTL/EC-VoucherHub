/**
 * Modal — accessible dialog overlay.
 *
 * Renders a centered dialog over a dimmed backdrop. Closes on Escape and on
 * backdrop click (configurable), restores body scroll on unmount, and exposes
 * `role="dialog"` with `aria-modal` for assistive technology.
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  /** Whether the modal is visible. */
  isOpen: boolean
  /** Invoked when the user requests to close (Escape, backdrop, close button). */
  onClose: () => void
  /** Optional title rendered in the header and used as the accessible name. */
  title?: ReactNode
  /** Dialog body. */
  children: ReactNode
  /** Optional footer area, typically action buttons. */
  footer?: ReactNode
  /** Max-width preset. Defaults to `md`. */
  size?: ModalSize
  /** Close when the backdrop is clicked. Defaults to `true`. */
  closeOnBackdropClick?: boolean
  /** Close when Escape is pressed. Defaults to `true`. */
  closeOnEscape?: boolean
  /** Show the header close (×) button. Defaults to `true`. */
  showCloseButton?: boolean
}

const MAX_WIDTH: Record<ModalSize, number> = {
  sm: 360,
  md: 520,
  lg: 760
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const closeOnEscapeRef = useRef(closeOnEscape)
  onCloseRef.current = onClose
  closeOnEscapeRef.current = closeOnEscape

  // Handle Escape key + lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null

    function handleKeyDown(event: KeyboardEvent) {
      if (closeOnEscapeRef.current && event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) {
          event.preventDefault()
          dialogRef.current.focus()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href]'
      )
      ;(firstFocusable ?? dialogRef.current)?.focus()
    })

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(11, 11, 11, 0.45)',
    backdropFilter: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000
  }

  const dialogStyle: CSSProperties = {
    width: '100%',
    maxWidth: MAX_WIDTH[size],
    maxHeight: 'calc(100vh - 32px)',
    background: colors.surface,
    borderRadius: radius.xl,
    boxShadow: shadows.overlay,
    display: 'flex',
    flexDirection: 'column',
    outline: 'none',
    overflow: 'hidden'
  }

  return (
    <div
      style={backdropStyle}
      onMouseDown={(event) => {
        // Only close when the backdrop itself is the mousedown target, so a
        // drag that ends on the backdrop (started inside) does not dismiss.
        if (closeOnBackdropClick && event.target === event.currentTarget) {
          onClose()
        }
      }}
      data-testid='modal-backdrop'
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        style={dialogStyle}
      >
        {(title != null || showCloseButton) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '20px 24px',
              borderBottom: `1px solid ${colors.hairline}`
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: colors.ink
              }}
            >
              {title}
            </h2>
            {showCloseButton && (
              <button
                type='button'
                onClick={onClose}
                aria-label='Đóng hộp thoại'
                style={{
                  border: `1px solid ${colors.hairline}`,
                  background: colors.surface,
                  width: 32,
                  height: 32,
                  borderRadius: radius.md,
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: colors.slate,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        <div style={{ padding: 24, overflowY: 'auto', color: colors.slate, fontFamily: fonts.body }}>{children}</div>

        {footer != null && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '16px 24px',
              borderTop: `1px solid ${colors.hairline}`
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
