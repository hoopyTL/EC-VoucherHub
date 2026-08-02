/**
 * Button — reusable action button with variants and a built-in loading state.
 *
 * Restyled to the VoucherHub design system (see src/theme/tokens.ts): buttons
 * are always pill-shaped. The primary variant is a solid ink fill; the optional
 * trailing circular arrow (`withArrow`) echoes the design's "Connect Us →"
 * treatment.
 *
 * When `isLoading` is true the button shows a {@link LoadingSpinner} and becomes
 * non-interactive, supporting Requirement 23.3 (loading indicators during async
 * operations) at the action level.
 */
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { colors, fonts, radius } from '../../theme/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Defaults to `primary`. */
  variant?: ButtonVariant
  /** Padding/font preset. Defaults to `md`. */
  size?: ButtonSize
  /** Show a spinner and disable interaction while an async action runs. */
  isLoading?: boolean
  /** Stretch the button to fill its container width. */
  fullWidth?: boolean
  /** Optional leading icon/element rendered before the label. */
  leftIcon?: ReactNode
  /** Render a trailing circular arrow chip inside the pill (design accent). */
  withArrow?: boolean
  children?: ReactNode
}

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '8px 16px', fontSize: 13 },
  md: { padding: '12px 22px', fontSize: 14 },
  lg: { padding: '16px 30px', fontSize: 16 }
}

const ARROW_SIZE: Record<ButtonSize, number> = { sm: 18, md: 22, lg: 26 }

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: { background: colors.ink, color: colors.onInk, border: `1px solid ${colors.ink}` },
  secondary: {
    background: colors.surface,
    color: colors.ink,
    border: `1px solid ${colors.hairline}`
  },
  danger: { background: colors.danger, color: colors.onDanger, border: `1px solid ${colors.danger}` },
  ghost: { background: 'transparent', color: colors.ink, border: '1px solid transparent' }
}

/** A small circular chip with an arrow glyph, tinted to contrast its pill. */
function ArrowChip({ size, variant }: { size: number; variant: ButtonVariant }) {
  const onDark = variant === 'primary' || variant === 'danger'
  return (
    <span
      aria-hidden='true'
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius.full,
        background: onDark ? colors.onInk : colors.ink,
        color: onDark ? colors.ink : colors.onInk,
        fontSize: Math.round(size * 0.6),
        lineHeight: 1,
        marginLeft: 2,
        flexShrink: 0
      }}
    >
      →
    </span>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leftIcon,
    withArrow = false,
    children,
    disabled,
    style,
    type,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || isLoading

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: fonts.display,
    fontWeight: 600,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
    borderRadius: radius.full,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    whiteSpace: 'nowrap',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
    ...SIZE_STYLES[size],
    ...VARIANT_STYLES[variant],
    ...style
  }

  return (
    <button
      ref={ref}
      // Default to "button" so the component never submits a form unexpectedly.
      type={type ?? 'button'}
      style={baseStyle}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <LoadingSpinner size='sm' inline color='currentColor' label='Đang xử lý' /> : leftIcon}
      {children != null && <span>{children}</span>}
      {!isLoading && withArrow && <ArrowChip size={ARROW_SIZE[size]} variant={variant} />}
    </button>
  )
})

export default Button
