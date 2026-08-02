import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App routing', () => {
  it('renders the public layout with primary navigation', () => {
    render(<App />)

    const primaryNav = screen.getByRole('navigation', { name: /điều hướng chính/i })
    expect(within(primaryNav).getByRole('link', { name: /browse/i })).toBeDefined()
    expect(within(primaryNav).getByRole('link', { name: /home/i })).toBeDefined()
  })

  it('renders the home page at the index route', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /home/i })).toBeDefined()
  })

  it('shows login/sign up actions for unauthenticated visitors', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /log in/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeDefined()
  })
})
