import type { CSSProperties } from 'react'
import { colors, fonts, radius } from '../../theme/tokens'

type CheckoutStep = 'cart' | 'checkout' | 'complete'

const steps: Array<{ id: CheckoutStep; label: string }> = [
  { id: 'cart', label: 'Giỏ hàng' },
  { id: 'checkout', label: 'Thanh toán' },
  { id: 'complete', label: 'Hoàn tất' }
]

export function CheckoutProgress({ current }: { current: CheckoutStep }) {
  const currentIndex = steps.findIndex((step) => step.id === current)

  return (
    <ol aria-label='Tiến trình thanh toán' style={listStyle}>
      {steps.map((step, index) => {
        const active = index === currentIndex
        const done = index < currentIndex
        return (
          <li key={step.id} style={{ ...itemStyle, color: active || done ? colors.ink : colors.slateMuted }}>
            <span
              style={{
                ...numberStyle,
                background: active ? colors.accent : done ? colors.ink : colors.surface,
                color: active ? colors.onAccent : done ? colors.onInk : colors.slate,
                borderColor: active ? colors.accent : done ? colors.ink : colors.hairlineStrong
              }}
            >
              {done ? '✓' : index + 1}
            </span>
            <span>{step.label}</span>
            {index < steps.length - 1 && <span aria-hidden='true' style={lineStyle} />}
          </li>
        )
      })}
    </ol>
  )
}

const listStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  listStyle: 'none',
  margin: '0 0 28px',
  padding: 0,
  width: '100%'
}

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flex: 1,
  fontFamily: fonts.display,
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap'
}

const numberStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 30,
  height: 30,
  flexShrink: 0,
  border: '1px solid',
  borderRadius: radius.full
}

const lineStyle: CSSProperties = {
  height: 1,
  flex: 1,
  minWidth: 16,
  margin: '0 12px',
  background: colors.hairlineStrong
}

export default CheckoutProgress
