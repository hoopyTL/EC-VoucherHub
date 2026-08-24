import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnnouncementBar } from './AnnouncementBar'
import { api } from '../../services/api'

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn()
  }
}))

const mockAnnouncements = [
  {
    id: 'ann-1',
    type: 'announcement',
    title: 'Khuyến mãi 2/9 - 50%',
    body: 'Ưu đãi ngập tràn mừng đại lễ',
    status: 'published',
    displayFrom: null,
    displayTo: null
  }
]

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AnnouncementBar />
    </QueryClientProvider>
  )
}

describe('AnnouncementBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders active announcement on top of the page', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { items: mockAnnouncements } }
    } as never)

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByTestId('announcement-bar')).toBeDefined()
      expect(screen.getByText('Khuyến mãi 2/9 - 50%')).toBeDefined()
      expect(screen.getByText(/Ưu đãi ngập tràn/)).toBeDefined()
    })
  })

  it('dismisses announcement when close button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { items: mockAnnouncements } }
    } as never)

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByText('Khuyến mãi 2/9 - 50%')).toBeDefined()
    })

    const closeBtn = screen.getByLabelText('Đóng thông báo')
    fireEvent.click(closeBtn)

    expect(screen.queryByTestId('announcement-bar')).toBeNull()
  })

  it('renders nothing when there are no announcements', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { items: [] } }
    } as never)

    renderWithClient()

    await waitFor(() => {
      expect(screen.queryByTestId('announcement-bar')).toBeNull()
    })
  })
})
