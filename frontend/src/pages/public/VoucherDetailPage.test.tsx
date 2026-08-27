import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserRole } from '@ui-contracts'
import { VoucherDetailPage } from './VoucherDetailPage'
import { AuthProvider } from '../../store/AuthContext'
import { ToastProvider } from '../../components/ui'
import * as voucherService from '../../services/voucher.service'
import * as ordersService from '../../services/orders'
import { setAccessToken, clearAccessToken, USER_STORAGE_KEY } from '../../services/api'
import { makeVoucherDetail } from '../../test-utils/voucherFixtures'

/** Seed an in-memory authenticated session so AuthProvider restores a user. */
function seedSession(role: UserRole = UserRole.CUSTOMER) {
  setAccessToken('test-token')
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 'u1', name: 'Test User', role }))
}

function renderDetail(id = 'v1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/vouchers/${id}`]}>
            <Routes>
              <Route path='/vouchers/:id' element={<VoucherDetailPage />} />
              <Route path='/vouchers' element={<div>Browse</div>} />
              <Route path='/login' element={<div>Login Page</div>} />
              <Route path='/checkout' element={<div>Checkout Page</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('VoucherDetailPage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    clearAccessToken()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all voucher detail information', async () => {
    const spy = vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(makeVoucherDetail())

    renderDetail('v1')

    expect(await screen.findByRole('heading', { name: 'Spa Day Package' })).toBeDefined()
    // Description, periods, partner, remaining quantity, branches, terms.
    expect(screen.getByText(/relaxing full-day spa/i)).toBeDefined()
    expect(screen.getByText(/Serenity Spa/)).toBeDefined()
    expect(screen.getByText(/60 \/ 100/)).toBeDefined()
    expect(screen.getByText(/Serenity Downtown/)).toBeDefined()
    expect(screen.getByText(/Valid on weekdays only/i)).toBeDefined()
    expect(screen.getByText('Thời gian mở bán')).toBeDefined()
    expect(screen.getByText('Thời gian sử dụng')).toBeDefined()
    // The detail-provided discount percentage is shown.
    expect(screen.getByTestId('discount-badge').textContent).toBe('-25%')
    expect(spy).toHaveBeenCalledWith('v1')
  })

  it('shows a not-found state on a 404 response', async () => {
    vi.spyOn(voucherService, 'getVoucherDetail').mockRejectedValue({
      response: { status: 404 }
    })

    renderDetail('missing')

    expect(await screen.findByRole('heading', { name: /không tìm thấy/i })).toBeDefined()
  })

  it('falls back to a default terms message when none are provided', async () => {
    vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(makeVoucherDetail({ terms: null }))

    renderDetail('v1')

    expect(await screen.findByText(/chưa có điều khoản và điều kiện riêng/i)).toBeDefined()
  })

  it('formats dash-separated description items and lets the customer expand long content', async () => {
    const description = `- Mục đầu tiên ${'nội dung '.repeat(45)} - Mục thứ hai - Khung giờ 14:00 – 20:00`
    vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(makeVoucherDetail({ description }))

    renderDetail('v1')

    const toggle = await screen.findByRole('button', { name: 'Xem thêm' })
    const content = document.getElementById('voucher-description-content')
    expect(content?.textContent).toContain('\n- Mục thứ hai')
    expect(content?.textContent).toContain('14:00 – 20:00')
    expect(content?.classList.contains('is-collapsed')).toBe(true)

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Thu gọn' })).toBeDefined()
    expect(content?.classList.contains('is-collapsed')).toBe(false)
  })

  it('adds the voucher to the cart for an authenticated customer', async () => {
    seedSession(UserRole.CUSTOMER)
    vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(makeVoucherDetail())
    const addSpy = vi.spyOn(ordersService, 'addToCart').mockResolvedValue({ items: [], total: 0 })

    renderDetail('v1')

    const addButton = await screen.findByRole('button', { name: /thêm vào giỏ/i })
    // Bump quantity to 2 via the stepper, then add.
    fireEvent.click(screen.getByLabelText('Tăng số lượng'))
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('v1', 2)
    })
  })

  it('buys the currently selected quantity and opens checkout', async () => {
    seedSession(UserRole.CUSTOMER)
    vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(makeVoucherDetail())
    const buyNowSpy = vi.spyOn(ordersService, 'prepareBuyNow').mockResolvedValue({
      cart: {
        items: [{ id: '17', voucherId: 'v1', title: 'Spa Day Package', unitPrice: 75, quantity: 3, subtotal: 225 }],
        total: 225
      },
      cartItemId: '17'
    })

    renderDetail('v1')

    await screen.findByRole('button', { name: /mua ngay/i })
    fireEvent.click(screen.getByLabelText('Tăng số lượng'))
    fireEvent.click(screen.getByLabelText('Tăng số lượng'))
    fireEvent.click(screen.getByRole('button', { name: /mua ngay/i }))

    await waitFor(() => expect(buyNowSpy).toHaveBeenCalledWith('v1', 3))
    expect(await screen.findByText('Checkout Page')).toBeDefined()
    expect(JSON.parse(sessionStorage.getItem('voucherhub_checkout_selection') || '[]')).toEqual(['17'])
  })

  it('redirects an unauthenticated visitor to login instead of adding', async () => {
    vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(makeVoucherDetail())
    const addSpy = vi.spyOn(ordersService, 'addToCart')

    renderDetail('v1')

    fireEvent.click(await screen.findByRole('button', { name: /thêm vào giỏ/i }))

    expect(await screen.findByText('Login Page')).toBeDefined()
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('disables purchasing when the voucher is sold out', async () => {
    seedSession(UserRole.CUSTOMER)
    vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(
      makeVoucherDetail({ totalQuantity: 100, soldQuantity: 100 })
    )

    renderDetail('v1')

    const soldOutButtons = await screen.findAllByRole('button', { name: /hết hàng/i })
    expect(soldOutButtons).toHaveLength(2)
    expect(soldOutButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
  })

  it('does not offer purchasing to a non-customer (partner) account', async () => {
    seedSession(UserRole.PARTNER)
    vi.spyOn(voucherService, 'getVoucherDetail').mockResolvedValue(makeVoucherDetail())

    renderDetail('v1')

    await screen.findByRole('heading', { name: 'Spa Day Package' })
    expect(screen.queryByRole('button', { name: /thêm vào giỏ/i })).toBeNull()
    expect(screen.getByText(/chỉ khách hàng được phép mua/i)).toBeDefined()
  })
})
