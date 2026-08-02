import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import fc from 'fast-check'
import { QRCodeDisplay, buildQrSvg } from './QRCodeDisplay'

describe('QRCodeDisplay', () => {
  it('renders an accessible img labelled with the code value', () => {
    render(<QRCodeDisplay value='ABC-123' />)
    const el = screen.getByTestId('qr-code-display')
    expect(el.getAttribute('role')).toBe('img')
    expect(el.getAttribute('aria-label')).toMatch(/ABC-123/)
    expect(el.getAttribute('data-value')).toBe('ABC-123')
  })

  it('renders a real <svg> QR symbol for the value', () => {
    const { container } = render(<QRCodeDisplay value='XYZ' />)
    const svg = container.querySelector('[data-testid="qr-code-display"] svg')
    expect(svg).not.toBeNull()
    // A real QR symbol draws its modules as <path> elements.
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('still accepts the legacy gridSize prop without affecting the API', () => {
    render(<QRCodeDisplay value='LEGACY' gridSize={21} />)
    expect(screen.getByTestId('qr-code-display').getAttribute('data-value')).toBe('LEGACY')
  })

  it('renders the container even when the value cannot be encoded (empty)', () => {
    render(<QRCodeDisplay value='' />)
    const el = screen.getByTestId('qr-code-display')
    expect(el).not.toBeNull()
    expect(el.getAttribute('data-value')).toBe('')
  })

  it('produces a stable SVG for the same value (deterministic)', () => {
    expect(buildQrSvg('VOUCHER-CODE-1')).toEqual(buildQrSvg('VOUCHER-CODE-1'))
  })

  it('produces different SVGs for different values', () => {
    expect(buildQrSvg('VALUE-A')).not.toEqual(buildQrSvg('VALUE-B'))
  })

  // Property: encoding is deterministic — equal inputs always yield equal
  // output. This underpins the guarantee that scanning the same code always
  // shows the same image, and that the markup is render-stable across paints.
  it('buildQrSvg is deterministic across arbitrary values (property)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 64 }), (value) => {
        const first = buildQrSvg(value)
        const second = buildQrSvg(value)
        expect(first).toEqual(second)
        expect(first).not.toBeNull()
        expect(first).toContain('<svg')
      })
    )
  })
})
