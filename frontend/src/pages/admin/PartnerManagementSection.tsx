import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminPartnerDto, BranchDto } from '@voucher/shared'

import {
  Badge,
  Button,
  ConfirmDialog,
  Input,
  LoadingSpinner,
  Modal,
  Pagination,
  useToast,
  variantForStatus
} from '../../components/ui'
import {
  changePartnerOperatingStatus,
  createPartnerAsAdmin,
  deletePartnerAsAdmin,
  getAdminApiError,
  listPartners,
  updatePartnerAsAdmin,
  updatePartnerBranch,
  type AdminPartnerFormValues
} from '../../services/admin'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatStatus } from '../../utils/format'

const ALL_PARTNERS_KEY = ['admin-partners'] as const
const PAGE_LIMIT = 10
type ApprovalFilter = '' | 'PENDING' | 'APPROVED' | 'REJECTED'
type OperatingFilter = '' | 'ACTIVE' | 'SUSPENDED'

export function PartnerManagementSection() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [approvalStatus, setApprovalStatus] = useState<ApprovalFilter>('')
  const [operatingStatus, setOperatingStatus] = useState<OperatingFilter>('')
  const [editing, setEditing] = useState<{ partner: AdminPartnerDto; branch: BranchDto } | null>(null)
  const [branchForm, setBranchForm] = useState({ name: '', address: '', region: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<AdminPartnerDto | null>(null)
  const [editingPartner, setEditingPartner] = useState<AdminPartnerDto | null>(null)
  const [createForm, setCreateForm] = useState<AdminPartnerFormValues>({
    legalName: '',
    representative: '',
    email: '',
    phone: '',
    taxCode: '',
    businessCategory: 'F&B',
    logoUrl: '',
    address: '',
    region: 'TP. Hồ Chí Minh',
    operatingStatus: 'ACTIVE'
  })
  const partnersQuery = useQuery({
    queryKey: [...ALL_PARTNERS_KEY, { page, query, approvalStatus, operatingStatus }],
    queryFn: () =>
      listPartners({
        page,
        limit: PAGE_LIMIT,
        q: query || undefined,
        approvalStatus: approvalStatus || undefined,
        operatingStatus: operatingStatus || undefined
      })
  })

  useEffect(() => {
    if (!editing) return
    setBranchForm({ name: editing.branch.name, address: editing.branch.address, region: editing.branch.region })
    setFormError(null)
  }, [editing])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ALL_PARTNERS_KEY })
  const statusMutation = useMutation({
    mutationFn: ({ partner, action }: { partner: AdminPartnerDto; action: 'lock' | 'unlock' }) =>
      changePartnerOperatingStatus(partner.id, action),
    onSuccess: async (result) => {
      await refresh()
      toast.success(
        `${result.legalName} đã được ${result.operatingStatus === 'SUSPENDED' ? 'tạm khóa' : 'kích hoạt lại'}.`
      )
    },
    onError: (error) => toast.error(getAdminApiError(error, 'Không thể thay đổi trạng thái đối tác.'))
  })
  const branchMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('Chưa chọn chi nhánh')
      return updatePartnerBranch(editing.partner.id, editing.branch.id, branchForm)
    },
    onSuccess: async () => {
      await refresh()
      setEditing(null)
      toast.success('Đã cập nhật thông tin chi nhánh.')
    },
    onError: (error) => setFormError(getAdminApiError(error, 'Không thể cập nhật chi nhánh.'))
  })
  const createMutation = useMutation({
    mutationFn: createPartnerAsAdmin,
    onSuccess: async (partner) => {
      await refresh()
      setCreateOpen(false)
      toast.success(`Đã tạo đối tác ${partner.legalName}. Mật khẩu tạm thời: 12345678`)
    },
    onError: (error) => setFormError(getAdminApiError(error, 'Không thể tạo đối tác.'))
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePartnerAsAdmin(id),
    onSuccess: async () => {
      await refresh()
      setDeleting(null)
      toast.success('Đã xóa đối tác chưa phát sinh giao dịch.')
    },
    onError: (error) => {
      toast.error(getAdminApiError(error, 'Không thể xóa đối tác.'))
      setDeleting(null)
    }
  })
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingPartner) throw new Error('Chưa chọn đối tác')
      return updatePartnerAsAdmin(editingPartner.id, {
        legalName: createForm.legalName,
        representative: createForm.representative,
        email: createForm.email,
        phone: createForm.phone,
        businessCategory: createForm.businessCategory,
        logoUrl: createForm.logoUrl || undefined
      })
    },
    onSuccess: async () => {
      await refresh()
      setEditingPartner(null)
      toast.success('Đã cập nhật thông tin đối tác.')
    },
    onError: (error) => setFormError(getAdminApiError(error, 'Không thể cập nhật đối tác.'))
  })

  function openPartnerEdit(partner: AdminPartnerDto) {
    const mainBranch = partner.branches[0]
    setCreateForm({
      legalName: partner.legalName,
      representative: partner.representative,
      email: partner.owner.email ?? '',
      phone: partner.owner.phone ?? '',
      taxCode: partner.taxCode,
      businessCategory: partner.businessCategory ?? '',
      logoUrl: partner.logoUrl ?? '',
      address: mainBranch?.address ?? '',
      region: mainBranch?.region ?? '',
      operatingStatus: partner.operatingStatus
    })
    setFormError(null)
    setEditingPartner(partner)
  }

  function submitCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    createMutation.mutate(createForm)
  }

  function submitBranch(event: FormEvent) {
    event.preventDefault()
    if (!branchForm.name.trim() || !branchForm.address.trim() || !branchForm.region.trim()) {
      setFormError('Tên, địa chỉ và khu vực là bắt buộc.')
      return
    }
    branchMutation.mutate()
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setQuery(searchInput.trim())
  }

  function clearFilters() {
    setPage(1)
    setSearchInput('')
    setQuery('')
    setApprovalStatus('')
    setOperatingStatus('')
  }

  const totalPages = Math.max(1, Math.ceil((partnersQuery.data?.pagination.total ?? 0) / PAGE_LIMIT))

  return (
    <section aria-labelledby='all-partners-heading' style={{ display: 'grid', gap: 16, marginTop: 24 }}>
      <div style={topRowStyle}>
        <div>
          <h2 id='all-partners-heading' style={headingStyle}>
            Quản lý đối tác
          </h2>
          <p style={descriptionStyle}>Tạo tài khoản, cập nhật chi nhánh và quản lý trạng thái hoạt động.</p>
        </div>
        <Button
          onClick={() => {
            setFormError(null)
            setCreateOpen(true)
          }}
        >
          + Thêm đối tác
        </Button>
      </div>
      <form onSubmit={submitSearch} style={filterStyle}>
        <div style={{ flex: '1 1 300px' }}>
          <Input
            label='Tìm kiếm đối tác'
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder='Tên doanh nghiệp, mã số thuế, người đại diện, email hoặc số điện thoại'
          />
        </div>
        <label style={filterLabelStyle}>
          Trạng thái duyệt
          <select
            value={approvalStatus}
            onChange={(event) => {
              setApprovalStatus(event.target.value as ApprovalFilter)
              setPage(1)
            }}
            style={selectStyle}
          >
            <option value=''>Tất cả</option>
            <option value='PENDING'>Chờ duyệt</option>
            <option value='APPROVED'>Đã duyệt</option>
            <option value='REJECTED'>Từ chối</option>
          </select>
        </label>
        <label style={filterLabelStyle}>
          Hoạt động
          <select
            value={operatingStatus}
            onChange={(event) => {
              setOperatingStatus(event.target.value as OperatingFilter)
              setPage(1)
            }}
            style={selectStyle}
          >
            <option value=''>Tất cả</option>
            <option value='ACTIVE'>Đang hoạt động</option>
            <option value='SUSPENDED'>Đang khóa</option>
          </select>
        </label>
        <div style={filterActionsStyle}>
          <Button type='submit'>Tìm kiếm</Button>
          <Button type='button' variant='secondary' onClick={clearFilters}>
            Xóa lọc
          </Button>
        </div>
      </form>
      {partnersQuery.isLoading && <LoadingSpinner label='Đang tải đối tác' />}
      {partnersQuery.isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải danh sách đối tác.{' '}
          <button style={retryStyle} onClick={() => partnersQuery.refetch()}>
            Thử lại
          </button>
        </div>
      )}
      {partnersQuery.data?.partners.map((partner) => (
        <article key={partner.id} style={cardStyle}>
          <div style={topRowStyle}>
            <div>
              <strong style={{ fontFamily: fonts.display }}>{partner.legalName}</strong>
              <div style={metaStyle}>{partner.owner.email ?? partner.owner.phone ?? 'Chưa có thông tin liên hệ'}</div>
            </div>
            <div style={actionStyle}>
              <Badge variant={variantForStatus(partner.approvalStatus)}>{formatStatus(partner.approvalStatus)}</Badge>
              <Badge variant={variantForStatus(partner.operatingStatus)}>{formatStatus(partner.operatingStatus)}</Badge>
              {partner.approvalStatus === 'APPROVED' && (
                <Button
                  size='sm'
                  variant={partner.operatingStatus === 'ACTIVE' ? 'danger' : 'secondary'}
                  isLoading={statusMutation.isPending && statusMutation.variables?.partner.id === partner.id}
                  onClick={() =>
                    statusMutation.mutate({ partner, action: partner.operatingStatus === 'ACTIVE' ? 'lock' : 'unlock' })
                  }
                >
                  {partner.operatingStatus === 'ACTIVE' ? 'Tạm khóa' : 'Kích hoạt'}
                </Button>
              )}
              <Button size='sm' variant='secondary' onClick={() => openPartnerEdit(partner)}>
                Sửa hồ sơ
              </Button>
              <Button size='sm' variant='danger' onClick={() => setDeleting(partner)}>
                Xóa
              </Button>
            </div>
          </div>
          <div style={branchGridStyle}>
            {partner.branches.map((branch) => (
              <div key={branch.id} style={branchStyle}>
                <div>
                  <strong>{branch.name}</strong>
                  <div style={metaStyle}>
                    {branch.address} · {branch.region}
                  </div>
                </div>
                <Button size='sm' variant='secondary' onClick={() => setEditing({ partner, branch })}>
                  Chỉnh sửa
                </Button>
              </div>
            ))}
            {partner.branches.length === 0 && <span style={metaStyle}>Chưa có chi nhánh.</span>}
          </div>
          {partner.approvalStatus === 'REJECTED' && partner.rejectReason && (
            <div style={rejectReasonStyle}>
              <strong>Lý do từ chối:</strong> {partner.rejectReason}
            </div>
          )}
        </article>
      ))}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title='Chỉnh sửa chi nhánh đối tác'
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button type='submit' form='admin-branch-form' isLoading={branchMutation.isPending}>
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <form id='admin-branch-form' onSubmit={submitBranch} style={{ display: 'grid', gap: 16 }}>
          <Input
            label='Tên chi nhánh'
            value={branchForm.name}
            onChange={(event) => setBranchForm((value) => ({ ...value, name: event.target.value }))}
            required
          />
          <Input
            label='Địa chỉ'
            value={branchForm.address}
            onChange={(event) => setBranchForm((value) => ({ ...value, address: event.target.value }))}
            required
          />
          <Input
            label='Khu vực'
            value={branchForm.region}
            onChange={(event) => setBranchForm((value) => ({ ...value, region: event.target.value }))}
            required
          />
          {formError && (
            <div role='alert' style={alertStyle}>
              {formError}
            </div>
          )}
        </form>
      </Modal>
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title='Thêm đối tác mới'
        size='lg'
        footer={
          <>
            <Button variant='secondary' onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button type='submit' form='create-partner-form' isLoading={createMutation.isPending}>
              Tạo tài khoản đối tác
            </Button>
          </>
        }
      >
        <form
          id='create-partner-form'
          onSubmit={submitCreate}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}
        >
          <Input
            label='Tên đối tác / thương hiệu'
            value={createForm.legalName}
            onChange={(e) => setCreateForm((v) => ({ ...v, legalName: e.target.value }))}
            required
          />
          <Input
            label='Người đại diện'
            value={createForm.representative}
            onChange={(e) => setCreateForm((v) => ({ ...v, representative: e.target.value }))}
            required
          />
          <Input
            label='Email đăng nhập'
            type='email'
            value={createForm.email}
            onChange={(e) => setCreateForm((v) => ({ ...v, email: e.target.value }))}
            required
          />
          <Input
            label='Số điện thoại'
            value={createForm.phone}
            onChange={(e) => setCreateForm((v) => ({ ...v, phone: e.target.value }))}
            placeholder='0901234567'
          />
          <Input
            label='Mã số thuế'
            value={createForm.taxCode}
            onChange={(e) => setCreateForm((v) => ({ ...v, taxCode: e.target.value }))}
            required
          />
          <Input
            label='Danh mục kinh doanh'
            value={createForm.businessCategory}
            onChange={(e) => setCreateForm((v) => ({ ...v, businessCategory: e.target.value }))}
            placeholder='F&B, bán lẻ, du lịch...'
            required
          />
          <Input
            label='Logo / ảnh đại diện (URL)'
            type='url'
            value={createForm.logoUrl}
            onChange={(e) => setCreateForm((v) => ({ ...v, logoUrl: e.target.value }))}
          />
          <Input
            label='Khu vực'
            value={createForm.region}
            onChange={(e) => setCreateForm((v) => ({ ...v, region: e.target.value }))}
            required
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label='Địa chỉ chi nhánh chính'
              value={createForm.address}
              onChange={(e) => setCreateForm((v) => ({ ...v, address: e.target.value }))}
              required
            />
          </div>
          <label style={filterLabelStyle}>
            Trạng thái
            <select
              style={selectStyle}
              value={createForm.operatingStatus}
              onChange={(e) =>
                setCreateForm((v) => ({ ...v, operatingStatus: e.target.value as 'ACTIVE' | 'SUSPENDED' }))
              }
            >
              <option value='ACTIVE'>Đang hoạt động</option>
              <option value='SUSPENDED'>Tạm khóa</option>
            </select>
          </label>
          <p style={{ ...metaStyle, gridColumn: '1 / -1' }}>
            Mật khẩu tạm thời: <strong>12345678</strong>. Đối tác nên đổi mật khẩu sau lần đăng nhập đầu tiên.
          </p>
          {formError && (
            <div role='alert' style={{ ...alertStyle, gridColumn: '1 / -1' }}>
              {formError}
            </div>
          )}
        </form>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title='Xóa đối tác?'
        message={`Chỉ đối tác chưa có voucher hoặc nhân viên mới có thể xóa. Bạn muốn xóa ${deleting?.legalName ?? ''}?`}
        cancelLabel='Không xóa'
        confirmLabel='Xóa đối tác'
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
      <Modal
        isOpen={editingPartner !== null}
        onClose={() => setEditingPartner(null)}
        title='Sửa hồ sơ đối tác'
        size='lg'
        footer={
          <>
            <Button variant='secondary' onClick={() => setEditingPartner(null)}>
              Hủy
            </Button>
            <Button onClick={() => updateMutation.mutate()} isLoading={updateMutation.isPending}>
              Lưu hồ sơ
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <Input
            label='Tên đối tác / thương hiệu'
            value={createForm.legalName}
            onChange={(e) => setCreateForm((v) => ({ ...v, legalName: e.target.value }))}
            required
          />
          <Input
            label='Người đại diện'
            value={createForm.representative}
            onChange={(e) => setCreateForm((v) => ({ ...v, representative: e.target.value }))}
            required
          />
          <Input
            label='Email đăng nhập'
            type='email'
            value={createForm.email}
            onChange={(e) => setCreateForm((v) => ({ ...v, email: e.target.value }))}
            required
          />
          <Input
            label='Số điện thoại'
            value={createForm.phone}
            onChange={(e) => setCreateForm((v) => ({ ...v, phone: e.target.value }))}
          />
          <Input
            label='Danh mục kinh doanh'
            value={createForm.businessCategory}
            onChange={(e) => setCreateForm((v) => ({ ...v, businessCategory: e.target.value }))}
          />
          <Input
            label='Logo / ảnh đại diện (URL)'
            type='url'
            value={createForm.logoUrl}
            onChange={(e) => setCreateForm((v) => ({ ...v, logoUrl: e.target.value }))}
          />
          {formError && (
            <div role='alert' style={{ ...alertStyle, gridColumn: '1 / -1' }}>
              {formError}
            </div>
          )}
        </div>
      </Modal>
    </section>
  )
}

const headingStyle: CSSProperties = { margin: 0, fontFamily: fonts.display, fontSize: 28, color: colors.ink }
const descriptionStyle: CSSProperties = { margin: '6px 0 0', color: colors.slate }
const filterStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  padding: 16,
  borderRadius: radius.lg,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`
}
const filterActionsStyle: CSSProperties = { display: 'flex', gap: 8, paddingBottom: 1 }
const filterLabelStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  minWidth: 165,
  fontSize: 12,
  fontWeight: 600,
  color: colors.slate
}
const selectStyle: CSSProperties = {
  minHeight: 42,
  padding: '0 12px',
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`,
  color: colors.ink,
  background: colors.surface
}
const cardStyle: CSSProperties = {
  padding: 20,
  borderRadius: radius.lg,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  boxShadow: shadows.card
}
const topRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap'
}
const actionStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
const branchGridStyle: CSSProperties = { display: 'grid', gap: 8, marginTop: 16 }
const branchStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  padding: 12,
  borderRadius: radius.md,
  background: colors.surfaceMuted
}
const metaStyle: CSSProperties = { marginTop: 3, color: colors.slate, fontSize: 13 }
const rejectReasonStyle: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: radius.md,
  color: colors.onDangerSurface,
  background: colors.dangerSurface
}
const alertStyle: CSSProperties = {
  padding: 12,
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface
}
const retryStyle: CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer'
}
