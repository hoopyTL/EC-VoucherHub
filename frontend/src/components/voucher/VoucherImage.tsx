import { useEffect, useState, type CSSProperties } from 'react'

interface VoucherImageProps {
  src?: string | null
  alt: string
  style?: CSSProperties
  fallback?: string
}

function spriteCell(src: string) {
  if (!src.startsWith('/assets/voucher-catalogue-sprite.png')) return null
  const cell = Number(new URLSearchParams(src.split('?')[1] ?? '').get('cell'))
  return Number.isFinite(cell) ? cell : null
}

export function VoucherImage({ src, alt, style, fallback = 'VH' }: VoucherImageProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const cell = src ? spriteCell(src) : null
  if (cell !== null) {
    return (
      <div
        role='img'
        aria-label={alt}
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: "url('/assets/voucher-catalogue-sprite.png')",
          backgroundSize: '1000% 700%',
          backgroundPosition: `${((cell % 10) * 100) / 9}% ${(Math.floor(cell / 10) * 100) / 6}%`,
          backgroundRepeat: 'no-repeat',
          ...style
        }}
      />
    )
  }
  if (src && !failed) return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />
  return (
    <span style={style} aria-label={alt}>
      {fallback}
    </span>
  )
}
