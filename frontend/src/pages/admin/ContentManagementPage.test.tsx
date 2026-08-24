import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContentManagementPage } from './ContentManagementPage'
import * as adminService from '../../services/admin'
import { ToastProvider } from '../../components/ui'

vi.mock('../../services/admin', async () => {
  const actual = await vi.importActual('../../services/admin')
  return {
    ...actual,
    listAdminContent: vi.fn(),
    createAdminContent: vi.fn(),
    updateAdminContent: vi.fn(),
    archiveAdminContent: vi.fn()
  }
})

const mockItems: adminService.AdminContentItem[] = [
  {
    id: 'c-1',
    type: 'banner',
    title: 'Khuyến mãi mùa hè',
    body: 'Giảm 30% tất cả dịch vụ',
    status: 'published',
    displayFrom: '2026-08-01T00:00:00.000Z',
    displayTo: '2026-08-31T23:59:59.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    author: { email: 'admin@voucherhub.com', phone: null, fullName: 'Admin Hub' }
  },
  {
    id: 'c-2',
    type: 'announcement',
    title: 'Bảo trì hệ thống',
    body: 'Hệ thống bảo trì lúc 0h ngày 25/08',
    status: 'draft',
    displayFrom: null,
    displayTo: null,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    author: { email: 'admin@voucherhub.com', phone: null, fullName: 'Admin Hub' }
  }
]

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <ContentManagementPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('ContentManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminService.listAdminContent).mockResolvedValue(mockItems)
  })

  it('renders content management page with title and KPI stats', async () => {
    renderWithProviders()

    expect(screen.getByText('Quản lý nội dung hệ thống')).toBeDefined()
    expect(screen.getByText('Tổng nội dung')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByText('Khuyến mãi mùa hè')).toBeDefined()
      expect(screen.getByText('Bảo trì hệ thống')).toBeDefined()
    })
  })

  it('opens modal to create new content item', async () => {
    vi.mocked(adminService.createAdminContent).mockResolvedValue({
      id: 'c-3',
      type: 'policy',
      title: 'Chính sách hoàn tiền mới',
      body: 'Hoàn tiền trong 24h',
      status: 'published',
      displayFrom: null,
      displayTo: null,
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
      author: null
    })

    renderWithProviders()

    const createBtn = screen.getByTestId('create-content-btn')
    fireEvent.click(createBtn)

    expect(screen.getByText('Tạo nội dung truyền thông mới')).toBeDefined()

    const titleInput = screen.getByTestId('form-title-input')
    const bodyTextarea = screen.getByTestId('form-body-textarea')

    fireEvent.change(titleInput, { target: { value: 'Chính sách hoàn tiền mới' } })
    fireEvent.change(bodyTextarea, { target: { value: 'Hoàn tiền trong 24h' } })

    const submitBtn = screen.getByTestId('form-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(adminService.createAdminContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chính sách hoàn tiền mới',
          body: 'Hoàn tiền trong 24h'
        })
      )
    })
  })

  it('opens modal to edit existing content item', async () => {
    vi.mocked(adminService.updateAdminContent).mockResolvedValue({
      ...mockItems[0],
      title: 'Khuyến mãi mùa thu'
    })

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('edit-content-btn-c-1')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('edit-content-btn-c-1'))

    expect(screen.getByText('Chỉnh sửa nội dung')).toBeDefined()

    const titleInput = screen.getByTestId('form-title-input')
    fireEvent.change(titleInput, { target: { value: 'Khuyến mãi mùa thu' } })

    const submitBtn = screen.getByTestId('form-submit-btn')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(adminService.updateAdminContent).toHaveBeenCalledWith(
        'c-1',
        expect.objectContaining({
          title: 'Khuyến mãi mùa thu'
        })
      )
    })
  })

  it('allows archiving a content item', async () => {
    vi.mocked(adminService.archiveAdminContent).mockResolvedValue({
      ...mockItems[0],
      status: 'archived'
    })

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('archive-content-btn-c-1')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('archive-content-btn-c-1'))

    expect(screen.getByText('Lưu trữ nội dung này?')).toBeDefined()

    const confirmBtn = screen.getByRole('button', { name: 'Đồng ý lưu trữ' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(adminService.archiveAdminContent).toHaveBeenCalledWith('c-1')
    })
  })

  it('shows empty state when no content items returned', async () => {
    vi.mocked(adminService.listAdminContent).mockResolvedValue([])

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('empty-content-state')).toBeDefined()
      expect(screen.getByText('Chưa có nội dung nào')).toBeDefined()
    })
  })
})
