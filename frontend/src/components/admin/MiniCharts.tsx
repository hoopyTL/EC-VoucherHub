/**
 * MiniCharts — dependency-free inline SVG charts for the admin BI dashboard
 * (Phase 3, §3.6).
 *
 * Deliberately tiny and chart-library-free: a monochrome line/area chart and a
 * horizontal bar list, styled with the VoucherHub tokens. They take plain
 * number series so they stay decoupled from the analytics DTOs. Good enough for
 * an admin overview without adding a charting dependency to the bundle.
 */
import type { CSSProperties } from 'react'
import { colors, fonts, radius } from '../../theme/tokens'

/** A single labelled value for the bar list. */
export interface BarDatum {
  label: string
  value: number
  /** Optional secondary caption shown under the label. */
  caption?: string
}

/**
 * A monochrome area+line chart for a daily series. Renders an SVG that scales
 * to its container width via a viewBox. Empty/flat series render a baseline.
 */
export function LineChart({
  points,
  height = 120,
  ariaLabel
}: {
  points: number[]
  height?: number
  ariaLabel: string
}) {
  const width = 600 // viewBox width; SVG scales to container.
  const pad = 8
  const max = Math.max(1, ...points)
  const n = points.length

  // Map each point to an (x, y) within the padded plot area.
  const coords = points.map((v, i) => {
    const x = n <= 1 ? pad : pad + (i * (width - pad * 2)) / (n - 1)
    const y = height - pad - (v / max) * (height - pad * 2)
    return [x, y] as const
  })

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1][0].toFixed(1)} ${height - pad} L ${coords[0][0].toFixed(1)} ${height - pad} Z`
      : ''

  return (
    <svg
      role='img'
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio='none'
      style={{ width: '100%', height, display: 'block' }}
    >
      {/* Baseline */}
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={colors.hairline} strokeWidth={1} />
      {areaPath && <path d={areaPath} fill={colors.surfaceMuted} />}
      {linePath && <path d={linePath} fill='none' stroke={colors.ink} strokeWidth={2} />}
    </svg>
  )
}

/**
 * A horizontal bar list — each row shows a label, a proportional ink bar, and a
 * formatted value. Used for the category revenue breakdown.
 */
export function BarList({
  data,
  formatValue,
  emptyLabel = 'No data yet.'
}: {
  data: BarDatum[]
  formatValue: (value: number) => string
  emptyLabel?: string
}) {
  if (data.length === 0) {
    return <p style={{ color: colors.slate, margin: 0 }}>{emptyLabel}</p>
  }
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={rowHeaderStyle}>
            <span style={{ fontWeight: 600, color: colors.ink }}>{d.label}</span>
            <span style={{ color: colors.slate }}>{formatValue(d.value)}</span>
          </div>
          <div style={trackStyle}>
            <div
              style={{
                ...fillStyle,
                width: `${Math.max(2, (d.value / max) * 100)}%`
              }}
            />
          </div>
          {d.caption ? <span style={{ fontSize: 12, color: colors.slateMuted }}>{d.caption}</span> : null}
        </div>
      ))}
    </div>
  )
}

/** A responsive vertical column chart for discrete totals. */
export function ColumnChart({ points, ariaLabel, height = 120 }: { points: number[]; ariaLabel: string; height?: number }) {
  const max = Math.max(1, ...points)
  return (
    <div role='img' aria-label={ariaLabel} style={{ height, display: 'flex', alignItems: 'end', gap: 6, borderBottom: `1px solid ${colors.hairline}`, padding: '4px 4px 0' }}>
      {points.map((value, index) => (
        <div key={index} title={String(value)} style={{ flex: 1, minWidth: 4, height: `${Math.max(value ? 8 : 2, (value / max) * 100)}%`, borderRadius: '5px 5px 0 0', background: 'linear-gradient(180deg, #ff7043 0%, #e74720 100%)', opacity: value ? 1 : 0.18, transition: 'height 220ms ease' }} />
      ))}
    </div>
  )
}

const rowHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 14,
  marginBottom: 4
}

const trackStyle: CSSProperties = {
  height: 10,
  borderRadius: radius.full,
  background: colors.surfaceMuted,
  overflow: 'hidden'
}

const fillStyle: CSSProperties = {
  height: '100%',
  borderRadius: radius.full,
  background: 'linear-gradient(90deg, #ff7043, #e74720)'
}

/** A compact donut-free funnel/ratio gauge rendered as a labelled bar. */
export function RatioGauge({ label, ratio }: { label: string; ratio: number }) {
  const pct = Math.round(ratio * 100)
  return (
    <div>
      <div style={rowHeaderStyle}>
        <span style={{ fontWeight: 600, color: colors.ink }}>{label}</span>
        <span style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.ink }}>{pct}%</span>
      </div>
      <div style={trackStyle}>
        <div style={{ ...fillStyle, width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  )
}
