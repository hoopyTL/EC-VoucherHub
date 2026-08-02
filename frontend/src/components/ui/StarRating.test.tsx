import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StarRating } from './StarRating'

describe('StarRating', () => {
  it('renders a display-only rating with an accessible label', () => {
    render(<StarRating value={4} />)
    expect(screen.getByLabelText('4 out of 5 stars')).toBeDefined()
    // Display mode exposes no interactive radios.
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('renders five interactive stars when onChange is provided', () => {
    render(<StarRating value={0} onChange={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('calls onChange with the clicked star value', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('4 stars'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('marks the selected star as checked', () => {
    render(<StarRating value={3} onChange={() => {}} />)
    expect(screen.getByLabelText('3 stars').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByLabelText('5 stars').getAttribute('aria-checked')).toBe('false')
  })
})
