import { useEffect, useState } from 'react'

export function CountUpValue({ value, duration = 700 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (import.meta.env.MODE === 'test' || reduced || value.includes('/')) {
      setDisplay(value)
      return
    }
    const target = Number(value.replace(/[^0-9]/g, ''))
    if (!Number.isFinite(target) || target <= 0) return
    const currency = value.includes('₫')
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(target * eased)
      setDisplay(currency ? `${new Intl.NumberFormat('vi-VN').format(current)} ₫` : String(current))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, value])

  return <>{display}</>
}
