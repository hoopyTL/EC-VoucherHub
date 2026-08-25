import { useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, ContentSkeleton, Input, Modal } from '../../components/ui'
import {
  createStaff,
  getPartnerApiError,
  listBranches,
  listStaff,
  updateStaff,
  type PartnerStaff,
  type StaffInput
} from '../../services/partner'
import type { Branch } from '../../types/partner'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

interface StaffForm {
  fullName: string
  email: string
  phone: string
  password: string
  branchIds: number[]
}

const EMPTY_FORM: StaffForm = { fullName: '', email: '', phone: '', password: '', branchIds: [] }

function BranchChecklist({
  branches,
  selectedIds,
  onChange
}: {
  branches: Branch[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>Chi nhánh được phân công</legend>
      {branches.length === 0 ? (
        <p style={{ margin: 0, color: colors.slate }}>Bạn cần tạo chi nhánh trước khi phân công nhân viên.</p>
      ) : (
        <div style={branchGridStyle}>
          {branches.map((branch) => (
            <label key={branch.id} style={branchOptionStyle}>
              <input
                type='checkbox'
                checked={selectedIds.includes(branch.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked ? [...selectedIds, branch.id] : selectedIds.filter((id) => id !== branch.id)
                  )
                }
              />
              <span>
                <strong style={{ display: 'block', color: colors.ink }}>{branch.name}</strong>
                <small style={{ color: colors.slate }}>{branch.region}</small>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

function StaffCard({
  item,
  branches,
  saving,
  onSave
}: {
  item: PartnerStaff
  branches: Branch[]
  saving: boolean
  onSave: (id: string, body: StaffInput) => Promise<PartnerStaff>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<StaffForm>({
    fullName: item.user.fullName,
    email: item.user.email,
    phone: item.user.phone ?? '',
    password: '',
    branchIds: item.assignments.map((assignment) => assignment.branchId)
  })
  const isLocked = item.user.status === 'LOCKED'
  const isInactive = item.status === 'INACTIVE'
  const status = isLocked
    ? { label: 'Đã khóa', variant: 'danger' as const }
    : isInactive
      ? { label: 'Ngừng hoạt động', variant: 'neutral' as const }
      : { label: 'Đang hoạt động', variant: 'success' as const }

  return (
    <article style={staffCardStyle}>
      <div style={staffHeaderStyle}>
        <div>
          <h2 style={staffNameStyle}>{item.user.fullName}</h2>
          <p style={staffContactStyle}>
            {item.user.email}
            {item.user.phone ? ` · ${item.user.phone}` : ''}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div style={assignmentStyle}>
        <span style={assignmentLabelStyle}>Chi nhánh phụ trách</span>
        <span>{item.assignments.map((assignment) => assignment.branch.name).join(', ') || 'Chưa phân công'}</span>
      </div>

      {editing && (
        <div style={editPanelStyle}>
          <div style={formGridStyle}>
            <Input
              label='Họ tên'
              value={draft.fullName}
              onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
            />
            <Input
              label='Email'
              type='email'
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
            <Input
              label='Số điện thoại'
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
            />
            <Input
              label='Mật khẩu mới (để trống nếu giữ nguyên)'
              type='password'
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </div>
          <BranchChecklist
            branches={branches}
            selectedIds={draft.branchIds}
            onChange={(branchIds) => setDraft({ ...draft, branchIds })}
          />
          <div style={editActionsStyle}>
            <Button variant='secondary' onClick={() => setEditing(false)}>
              Hủy
            </Button>
            <Button
              disabled={!draft.fullName.trim() || !draft.email.trim() || draft.branchIds.length === 0}
              isLoading={saving}
              onClick={async () => {
                try {
                  await onSave(item.id, {
                    ...draft,
                    fullName: draft.fullName.trim(),
                    email: draft.email.trim(),
                    phone: draft.phone.trim() || undefined,
                    password: draft.password || undefined
                  })
                  setEditing(false)
                } catch {
                  // Keep the editor open so the partner can correct and retry.
                }
              }}
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}

      {!editing && (
        <div style={cardActionsStyle}>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => {
              const activeIds = new Set(branches.map((branch) => branch.id))
              setDraft((current) => ({
                ...current,
                branchIds: item.assignments
                  .map((assignment) => assignment.branchId)
                  .filter((branchId) => activeIds.has(branchId))
              }))
              setEditing(true)
            }}
          >
            Chỉnh sửa
          </Button>
          <Button
            variant='secondary'
            size='sm'
            disabled={saving}
            onClick={() => void onSave(item.id, { locked: !isLocked }).catch(() => undefined)}
          >
            {isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
          </Button>
          <Button
            variant='secondary'
            size='sm'
            disabled={saving}
            onClick={() => void onSave(item.id, { status: isInactive ? 'ACTIVE' : 'INACTIVE' }).catch(() => undefined)}
          >
            {isInactive ? 'Kích hoạt lại' : 'Ngừng hoạt động'}
          </Button>
        </div>
      )}
    </article>
  )
}

export function StaffPage() {
  const queryClient = useQueryClient()
  const staffQuery = useQuery({ queryKey: ['partner', 'staff'], queryFn: listStaff })
  const branchesQuery = useQuery({ queryKey: ['partner', 'branches'], queryFn: listBranches })
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM)
  const [createError, setCreateError] = useState<string | null>(null)
  const [changeError, setChangeError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partner', 'staff'] })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      setCreateError(null)
      setNotice('Đã tạo tài khoản nhân viên thành công.')
    },
    onError: (error) => setCreateError(getPartnerApiError(error, 'Không thể tạo nhân viên.'))
  })
  const changeMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateStaff>[1] }) => updateStaff(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partner', 'staff'] })
      setChangeError(null)
      setNotice('Đã cập nhật nhân viên.')
    },
    onError: (error) => setChangeError(getPartnerApiError(error, 'Không thể cập nhật nhân viên.'))
  })

  function closeCreate() {
    if (createMutation.isPending) return
    setCreateOpen(false)
    setForm(EMPTY_FORM)
    setCreateError(null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 8 || form.branchIds.length === 0) {
      setCreateError('Vui lòng nhập đủ thông tin, mật khẩu tối thiểu 8 ký tự và chọn ít nhất một chi nhánh.')
      return
    }
    createMutation.mutate({
      ...form,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined
    })
  }

  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive)
  const staff = staffQuery.data ?? []

  return (
    <section style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Quản lý nhân viên</h1>
          <p style={subtitleStyle}>Quản lý tài khoản và phạm vi chi nhánh của nhân viên đối tác.</p>
        </div>
        <Button
          onClick={() => {
            setCreateError(null)
            setNotice(null)
            setCreateOpen(true)
            window.history.pushState({}, '', '/partner/staff/new')
            window.dispatchEvent(new PopStateEvent('popstate'))
          }}
        >
          Thêm nhân viên
        </Button>
      </div>

      {notice && (
        <div role='status' style={noticeStyle}>
          {notice}
        </div>
      )}
      {changeError && (
        <div role='alert' style={alertStyle}>
          {changeError}
        </div>
      )}

      {(staffQuery.isLoading || branchesQuery.isLoading) && (
        <ContentSkeleton rows={4} variant='cards' label='Đang tải nhân viên' />
      )}

      {(staffQuery.isError || branchesQuery.isError) && (
        <div role='alert' style={alertStyle}>
          Không thể tải dữ liệu nhân viên.{' '}
          <button
            type='button'
            style={retryButtonStyle}
            onClick={() => {
              staffQuery.refetch()
              branchesQuery.refetch()
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {!staffQuery.isLoading &&
        !branchesQuery.isLoading &&
        !staffQuery.isError &&
        !branchesQuery.isError &&
        staff.length === 0 && (
          <div style={emptyStyle}>
            <p style={{ margin: 0 }}>Bạn chưa có nhân viên nào.</p>
            <Button
              variant='secondary'
              onClick={() => {
                setCreateOpen(true)
                window.history.pushState({}, '', '/partner/staff/new')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
            >
              Tạo nhân viên đầu tiên
            </Button>
          </div>
        )}

      {!staffQuery.isLoading &&
        !branchesQuery.isLoading &&
        !staffQuery.isError &&
        !branchesQuery.isError &&
        staff.length > 0 && (
          <div style={staffListStyle}>
            {staff.map((item) => (
              <StaffCard
                key={item.id}
                item={item}
                branches={branches}
                saving={changeMutation.isPending}
                onSave={(id, body) => changeMutation.mutateAsync({ id, body })}
              />
            ))}
          </div>
        )}

      <Modal
        isOpen={createOpen}
        onClose={closeCreate}
        title='Thêm nhân viên'
        size='lg'
        closeOnBackdropClick={!createMutation.isPending}
        closeOnEscape={!createMutation.isPending}
        footer={
          <>
            <Button variant='secondary' onClick={closeCreate} disabled={createMutation.isPending}>
              Hủy
            </Button>
            <Button
              type='submit'
              form='create-staff-form'
              isLoading={createMutation.isPending}
              disabled={branches.length === 0}
            >
              Tạo nhân viên
            </Button>
          </>
        }
      >
        <form id='create-staff-form' onSubmit={submit} style={{ display: 'grid', gap: 16 }} noValidate>
          {createError && (
            <div role='alert' style={alertStyle}>
              {createError}
            </div>
          )}
          <div style={formGridStyle}>
            <Input
              label='Họ tên'
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            />
            <Input
              label='Email'
              type='email'
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <Input
              label='Số điện thoại'
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <Input
              label='Mật khẩu ban đầu'
              type='password'
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </div>
          <BranchChecklist
            branches={branches}
            selectedIds={form.branchIds}
            onChange={(branchIds) => setForm({ ...form, branchIds })}
          />
        </form>
      </Modal>
    </section>
  )
}

const pageStyle: CSSProperties = { maxWidth: 980, margin: '0 auto' }
const pageHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
  marginBottom: 24
}
const titleStyle: CSSProperties = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-0.03em'
}
const subtitleStyle: CSSProperties = { margin: '8px 0 0', color: colors.slate }
const staffListStyle: CSSProperties = { display: 'grid', gap: 14 }
const staffCardStyle: CSSProperties = {
  padding: 22,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card
}
const staffHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap'
}
const staffNameStyle: CSSProperties = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 20
}
const staffContactStyle: CSSProperties = { margin: '5px 0 0', color: colors.slate, fontSize: 14 }
const assignmentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  margin: '18px 0',
  padding: 14,
  background: colors.surfaceMuted,
  borderRadius: radius.md,
  color: colors.ink
}
const assignmentLabelStyle: CSSProperties = {
  color: colors.slate,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}
const cardActionsStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
const editPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 16,
  marginTop: 18,
  paddingTop: 18,
  borderTop: `1px solid ${colors.hairline}`
}
const editActionsStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }
const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14
}
const fieldsetStyle: CSSProperties = {
  margin: 0,
  padding: 16,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.md
}
const legendStyle: CSSProperties = {
  padding: '0 7px',
  color: colors.ink,
  fontFamily: fonts.display,
  fontWeight: 700
}
const branchGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 8
}
const branchOptionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: 10,
  borderRadius: radius.md,
  background: colors.surfaceMuted,
  cursor: 'pointer'
}
const noticeStyle: CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: radius.md,
  background: colors.successSurface,
  color: colors.onSuccessSurface
}
const alertStyle: CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface
}
const retryButtonStyle: CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontWeight: 700
}
const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 12,
  padding: 32,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  color: colors.slate
}

export default StaffPage
