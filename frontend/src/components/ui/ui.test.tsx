import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Button } from './Button'
import { Input } from './Input'
import { Badge, variantForStatus } from './Badge'
import { Modal } from './Modal'
import { LoadingSpinner } from './LoadingSpinner'
import { Pagination, buildPageRange } from './Pagination'
import { ToastProvider, useToast } from './Toast'

describe('Button', () => {
  it('renders its label and handles clicks', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    const btn = screen.getByRole('button', { name: /save/i })
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables interaction and shows a spinner while loading', () => {
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>
    )
    const btn = screen.getByRole('button')
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
    // status role comes from the embedded spinner
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('defaults to type="button"', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button').getAttribute('type')).toBe('button')
  })
})

describe('Input', () => {
  it('associates label with the control', () => {
    render(<Input label='Email' />)
    const input = screen.getByLabelText('Email')
    expect(input).toBeDefined()
  })

  it('shows an error message and marks the field invalid', () => {
    render(<Input label='Email' error='Required field' />)
    const input = screen.getByLabelText('Email')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Required field')
  })

  it('renders hint text when there is no error', () => {
    render(<Input label='Phone' hint='Optional' />)
    expect(screen.getByText('Optional')).toBeDefined()
  })
})

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge variant='success'>APPROVED</Badge>)
    expect(screen.getByText('APPROVED')).toBeDefined()
  })

  it('maps statuses to variants', () => {
    expect(variantForStatus('APPROVED')).toBe('success')
    expect(variantForStatus('PENDING_APPROVAL')).toBe('warning')
    expect(variantForStatus('REJECTED')).toBe('danger')
    expect(variantForStatus('PAUSED')).toBe('info')
    expect(variantForStatus('SOMETHING_ELSE')).toBe('neutral')
  })
})

describe('LoadingSpinner', () => {
  it('exposes an accessible status role and label', () => {
    render(<LoadingSpinner label='Loading data' />)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Loading data')).toBeDefined()
  })
})

describe('Modal', () => {
  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title='Hidden'>
        Body
      </Modal>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders title and body when open', () => {
    render(
      <Modal isOpen onClose={() => {}} title='Confirm'>
        Are you sure?
      </Modal>
    )
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Are you sure?')).toBeDefined()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title='Confirm'>
        Body
      </Modal>
    )
    fireEvent.click(screen.getByLabelText('Đóng hộp thoại'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title='Confirm'>
        Body
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on backdrop click but not on dialog click', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title='Confirm'>
        Body
      </Modal>
    )
    fireEvent.mouseDown(screen.getByText('Body'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(screen.getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('Pagination', () => {
  it('returns null for a single page', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('marks the current page with aria-current', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />)
    const current = screen.getByRole('button', { name: '2' })
    expect(current.getAttribute('aria-current')).toBe('page')
  })

  it('invokes onPageChange with the requested page', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('disables Previous on first page and Next on last page', () => {
    const { rerender } = render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />)
    expect((screen.getByLabelText('Trang trước') as HTMLButtonElement).disabled).toBe(true)
    rerender(<Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />)
    expect((screen.getByLabelText('Trang sau') as HTMLButtonElement).disabled).toBe(true)
  })

  describe('buildPageRange', () => {
    it('lists all pages when the count is small', () => {
      expect(buildPageRange(1, 5, 1)).toEqual([1, 2, 3, 4, 5])
    })

    it('inserts right dots near the start', () => {
      expect(buildPageRange(1, 10, 1)).toEqual([1, 2, 3, 4, 5, 'dots', 10])
    })

    it('inserts left dots near the end', () => {
      expect(buildPageRange(10, 10, 1)).toEqual([1, 'dots', 6, 7, 8, 9, 10])
    })

    it('inserts dots on both sides in the middle', () => {
      expect(buildPageRange(5, 10, 1)).toEqual([1, 'dots', 4, 5, 6, 'dots', 10])
    })
  })
})

function ToastTrigger() {
  const { success, error } = useToast()
  return (
    <div>
      <button type='button' onClick={() => success('Saved!')}>
        success
      </button>
      <button type='button' onClick={() => error('Failed!')}>
        fail
      </button>
    </div>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers())
    vi.useRealTimers()
  })

  it('shows a success toast when triggered', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    act(() => {
      fireEvent.click(screen.getByText('success'))
    })
    expect(screen.getByText('Saved!')).toBeDefined()
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('shows an error toast with the alert role', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    act(() => {
      fireEvent.click(screen.getByText('fail'))
    })
    expect(screen.getByRole('alert').textContent).toContain('Failed!')
  })

  it('auto-dismisses after the duration elapses', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    act(() => {
      fireEvent.click(screen.getByText('success'))
    })
    expect(screen.queryByText('Saved!')).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText('Saved!')).toBeNull()
  })

  it('throws if useToast is used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ToastTrigger />)).toThrow(/ToastProvider/)
    spy.mockRestore()
  })
})
