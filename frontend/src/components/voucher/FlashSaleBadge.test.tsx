import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { FlashSaleBadge } from './FlashSaleBadge'

afterEach(() => {
  vi.useRealTimers()
})

describe('FlashSaleBadge', () => {
  it('renders the flash-sale label and a countdown while time remains', () => {
    // Pin the clock so the rendered countdown is deterministic (no flake from
    // sub-second drift between computing endsAt and rendering).
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    const endsAt = new Date('2026-06-01T00:01:30.000Z').toISOString() // +1m30s
    render(<FlashSaleBadge endsAt={endsAt} />)
    const badge = screen.getByTestId('flash-sale-badge')
    expect(badge.textContent).toMatch(/flash sale/i)
    expect(badge.textContent).toMatch(/00:01:30/)
  })

  it('renders nothing once the end time has passed', () => {
    const endsAt = new Date(Date.now() - 1000).toISOString()
    render(<FlashSaleBadge endsAt={endsAt} />)
    expect(screen.queryByTestId('flash-sale-badge')).toBeNull()
  })

  it('calls onExpire when the countdown crosses zero', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()
    const endsAt = new Date(Date.now() + 2000).toISOString()
    render(<FlashSaleBadge endsAt={endsAt} onExpire={onExpire} />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(onExpire).toHaveBeenCalled()
    expect(screen.queryByTestId('flash-sale-badge')).toBeNull()
  })
})
