/**
 * Input — labeled text field with validation/error display.
 *
 * Surfaces inline error feedback (Requirement 23.4) and wires up accessible
 * label/error associations automatically.
 */
import { forwardRef, useId } from 'react'
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { colors, fonts, radius } from '../../theme/tokens'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible field label. */
  label?: ReactNode
  /** Error message; when present the field renders in an invalid state. */
  error?: string
  /** Helper text shown below the field when there is no error. */
  hint?: string
  /** Stretch the control to fill its container. Defaults to `true`. */
  fullWidth?: boolean
  /** Styles applied to the outer wrapper element. */
  containerStyle?: CSSProperties
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, fullWidth = true, id, required, disabled, style, containerStyle, onFocus, onBlur, ...rest },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const hasError = Boolean(error)

  const describedBy =
    [hasError ? errorId : null, hint && !hasError ? hintId : null].filter(Boolean).join(' ') || undefined

  const wrapperStyle: CSSProperties = {
    display: fullWidth ? 'block' : 'inline-block',
    width: fullWidth ? '100%' : undefined,
    ...containerStyle
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    background: disabled ? colors.surfaceMuted : colors.surface,
    border: `1px solid ${hasError ? colors.danger : colors.hairline}`,
    borderRadius: radius.md,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
    ...style
  }

  return (
    <div style={wrapperStyle}>
      {label != null && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: 6,
            fontFamily: fonts.display,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: colors.slate
          }}
        >
          {label}
          {required && (
            <span aria-hidden='true' style={{ color: colors.danger, marginLeft: 2 }}>
              *
            </span>
          )}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        style={inputStyle}
        onFocus={(e) => {
          if (!hasError) e.currentTarget.style.borderColor = colors.ink
          onFocus?.(e)
        }}
        onBlur={(e) => {
          if (!hasError) e.currentTarget.style.borderColor = colors.hairline
          onBlur?.(e)
        }}
        {...rest}
      />
      {hasError ? (
        <p id={errorId} role='alert' style={{ margin: '6px 0 0', fontSize: 12, color: colors.danger }}>
          {error}
        </p>
      ) : (
        hint != null && (
          <p id={hintId} style={{ margin: '6px 0 0', fontSize: 12, color: colors.slate }}>
            {hint}
          </p>
        )
      )}
    </div>
  )
})

export default Input
