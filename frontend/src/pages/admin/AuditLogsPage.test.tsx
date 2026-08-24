import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuditLogsPage } from './AuditLogsPage'
import * as adminService from '../../services/admin'

vi.mock('../../services/admin', async () => {
  const actual = await vi.importActual<typeof import('../../services/admin')>('../../services/admin')
  return {
    ...actual,
    listAdminAuditLogs: vi.fn()
  }
})

const mockLogs: adminService.AdminAuditLogItem[] = [
  {
    id: 'log-1',
    action: 'voucher.approve',
    entityType: 'voucher_product',
    entityId: 'voucher-123',
    metadata: { voucherName: 'Buffet Sen Tây Hồ', status: 'ACTIVE' },
    createdAt: '2026-08-24T10:00:00.000Z',
    actor: {
      fullName: 'Quản Trị Viên',
      email: 'admin@voucherhub.com',
      phone: '0901234567'
    }
  },
  {
    id: 'log-2',
    action: 'user.lock',
    entityType: 'user',
    entityId: 'user-456',
    metadata: { reason: 'Vi phạm chính sách lạm dụng mã' },
    createdAt: '2026-08-24T09:30:00.000Z',
    actor: {
      fullName: 'Quản Trị Viên',
      email: 'admin@voucherhub.com',
      phone: '0901234567'
    }
  }
]

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuditLogsPage />
    </QueryClientProvider>
  )
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders audit logs page header, KPI stats, and data table', async () => {
    vi.mocked(adminService.listAdminAuditLogs).mockResolvedValue(mockLogs)

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByText('Nhật ký kiểm toán hệ thống')).toBeDefined()
      expect(screen.getByText('Duyệt voucher')).toBeDefined()
      expect(screen.getByText('Khóa người dùng')).toBeDefined()
      expect(screen.getAllByText('admin@voucherhub.com').length).toBeGreaterThan(0)
    })
  })

  it('opens metadata inspector modal on clicking view button', async () => {
    vi.mocked(adminService.listAdminAuditLogs).mockResolvedValue(mockLogs)

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByText('Duyệt voucher')).toBeDefined()
    })

    const viewButtons = screen.getAllByRole('button', { name: /Xem/i })
    fireEvent.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Chi tiết bản ghi kiểm toán')).toBeDefined()
      expect(screen.getByText(/Buffet Sen Tây Hồ/)).toBeDefined()
    })
  })

  it('allows filtering by entity type and action', async () => {
    vi.mocked(adminService.listAdminAuditLogs).mockResolvedValue(mockLogs)

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByText('Nhật ký kiểm toán hệ thống')).toBeDefined()
    })

    const entitySelect = screen.getByLabelText('Lọc theo loại thực thể')
    fireEvent.change(entitySelect, { target: { value: 'voucher_product' } })

    await waitFor(() => {
      expect(adminService.listAdminAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'voucher_product' })
      )
    })
  })

  it('renders empty state when no audit logs match', async () => {
    vi.mocked(adminService.listAdminAuditLogs).mockResolvedValue([])

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByText('Không có bản ghi nhật ký')).toBeDefined()
    })
  })
})
