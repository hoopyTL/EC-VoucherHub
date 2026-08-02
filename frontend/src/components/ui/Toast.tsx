/**
 * Toast — transient success/error/info feedback messages.
 *
 * Supports Requirement 23.4 (success or error feedback after user actions).
 * Exposes three pieces:
 *  - `Toast`: the presentational notification.
 *  - `ToastProvider`: app-level provider that renders a fixed-position viewport.
 *  - `useToast`: hook to push toasts from anywhere in the tree.
 *
 * Toasts render synchronously on the next paint after `showToast` is called, so
 * feedback appears effectively immediately once the server response is handled.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  /** Visual style. Defaults to `info`. */
  variant?: ToastVariant
  /** Auto-dismiss delay in ms. Use 0 to disable auto-dismiss. Defaults to 4000. */
  duration?: number
}

export interface ToastItem extends Required<ToastOptions> {
  id: string
  message: ReactNode
}

interface VariantStyle {
  background: string
  color: string
  border: string
  icon: string
}

const VARIANT_STYLES: Record<ToastVariant, VariantStyle> = {
  success: { background: '#ecfdf5', color: '#065f46', border: '#a7f3d0', icon: '✓' },
  error: { background: '#fef2f2', color: '#991b1b', border: '#fecaca', icon: '✕' },
  info: { background: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: 'ℹ' },
  warning: { background: '#fffbeb', color: '#92400e', border: '#fde68a', icon: '!' }
}

/* ------------------------------------------------------------------ */
/* Presentational Toast                                                */
/* ------------------------------------------------------------------ */

export interface ToastProps {
  message: ReactNode
  variant?: ToastVariant
  /** Called when the user dismisses the toast via the close button. */
  onClose?: () => void
  style?: CSSProperties
}

export function Toast({ message, variant = 'info', onClose, style }: ToastProps) {
  const colors = VARIANT_STYLES[variant]
  // Errors are assertive (interrupt), others are polite.
  const isAssertive = variant === 'error' || variant === 'warning'

  return (
    <div
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        minWidth: 260,
        maxWidth: 380,
        padding: '12px 14px',
        borderRadius: 8,
        background: colors.background,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontSize: 14,
        ...style
      }}
    >
      <span aria-hidden='true' style={{ fontWeight: 700, lineHeight: 1.4 }}>
        {colors.icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      {onClose && (
        <button
          type='button'
          onClick={onClose}
          aria-label='Đóng thông báo'
          style={{
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
            opacity: 0.7
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Provider + hook                                                     */
/* ------------------------------------------------------------------ */

export interface ToastContextValue {
  /** Push a toast and return its generated id. */
  showToast: (message: ReactNode, options?: ToastOptions) => string
  /** Convenience helper for success toasts. */
  success: (message: ReactNode, options?: ToastOptions) => string
  /** Convenience helper for error toasts. */
  error: (message: ReactNode, options?: ToastOptions) => string
  /** Dismiss a toast by id. */
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 4000

let toastCounter = 0
function nextToastId(): string {
  toastCounter += 1
  return `toast-${toastCounter}`
}

export interface ToastProviderProps {
  children: ReactNode
  /** Viewport corner. Defaults to `top-right`. */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function ToastProvider({ children, position = 'top-right' }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  // Track active dismiss timers so we can clear them on unmount/manual dismiss.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message: ReactNode, options?: ToastOptions): string => {
      const id = nextToastId()
      const duration = options?.duration ?? DEFAULT_DURATION
      const item: ToastItem = {
        id,
        message,
        variant: options?.variant ?? 'info',
        duration
      }

      setToasts((current) => [...current, item])

      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration)
        timers.current.set(id, timer)
      }

      return id
    },
    [dismissToast]
  )

  const success = useCallback(
    (message: ReactNode, options?: ToastOptions) => showToast(message, { ...options, variant: 'success' }),
    [showToast]
  )

  const error = useCallback(
    (message: ReactNode, options?: ToastOptions) => showToast(message, { ...options, variant: 'error' }),
    [showToast]
  )

  // Clear any outstanding timers when the provider unmounts.
  useEffect(() => {
    const timersMap = timers.current
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer))
      timersMap.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, success, error, dismissToast }),
    [showToast, success, error, dismissToast]
  )

  const isTop = position.startsWith('top')
  const isRight = position.endsWith('right')

  const viewportStyle: CSSProperties = {
    position: 'fixed',
    top: isTop ? 16 : undefined,
    bottom: isTop ? undefined : 16,
    right: isRight ? 16 : undefined,
    left: isRight ? undefined : 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 1100,
    pointerEvents: 'none'
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={viewportStyle} aria-label='Thông báo'>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast message={toast.message} variant={toast.variant} onClose={() => dismissToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Access the toast API. Must be used within a {@link ToastProvider}. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default Toast
