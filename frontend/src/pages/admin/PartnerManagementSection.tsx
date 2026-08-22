import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminPartnerDto, BranchDto } from '@voucher/shared'

import {
  Badge,
  Button,
  Input,
  LoadingSpinner,
  Modal,
  Pagination,
  useToast,
  variantForStatus
} from '../../components/ui'
import { changePartnerOperatingStatus, getAdminApiError, listPartners, updatePartnerBranch } from '../../services/admin'
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
        `${result.legalName} has been ${result.operatingStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`
      )
    },
    onError: (error) => toast.error(getAdminApiError(error, 'Could not change the Partner status.'))
  })
  const branchMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No branch selected')
      return updatePartnerBranch(editing.partner.id, editing.branch.id, branchForm)
    },
    onSuccess: async () => {
      await refresh()
      setEditing(null)
      toast.success('Branch information has been updated.')
    },
    onError: (error) => setFormError(getAdminApiError(error, 'Could not update the branch.'))
  })

  function submitBranch(event: FormEvent) {
    event.preventDefault()
    if (!branchForm.name.trim() || !branchForm.address.trim() || !branchForm.region.trim()) {
      setFormError('Name, address, and region are required.')
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
      <div>
        <h2 id='all-partners-heading' style={headingStyle}>
          All partners
        </h2>
        <p style={descriptionStyle}>Suspend or reactivate approved partners and correct their branch information.</p>
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
      {partnersQuery.isLoading && <LoadingSpinner label='Loading partners' />}
      {partnersQuery.isError && (
        <div role='alert' style={alertStyle}>
          Could not load partners.{' '}
          <button style={retryStyle} onClick={() => partnersQuery.refetch()}>
            Retry
          </button>
        </div>
      )}
      {partnersQuery.data?.partners.map((partner) => (
        <article key={partner.id} style={cardStyle}>
          <div style={topRowStyle}>
            <div>
              <strong style={{ fontFamily: fonts.display }}>{partner.legalName}</strong>
              <div style={metaStyle}>{partner.owner.email ?? partner.owner.phone ?? 'No contact'}</div>
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
                  {partner.operatingStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                </Button>
              )}
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
                  Edit
                </Button>
              </div>
            ))}
            {partner.branches.length === 0 && <span style={metaStyle}>No branches.</span>}
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
        title='Edit Partner branch'
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type='submit' form='admin-branch-form' isLoading={branchMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <form id='admin-branch-form' onSubmit={submitBranch} style={{ display: 'grid', gap: 16 }}>
          <Input
            label='Branch name'
            value={branchForm.name}
            onChange={(event) => setBranchForm((value) => ({ ...value, name: event.target.value }))}
            required
          />
          <Input
            label='Address'
            value={branchForm.address}
            onChange={(event) => setBranchForm((value) => ({ ...value, address: event.target.value }))}
            required
          />
          <Input
            label='Region'
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
