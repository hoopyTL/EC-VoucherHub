import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input } from '../../components/ui'
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

function StaffCard({
  item,
  branches,
  saving,
  onSave
}: {
  item: PartnerStaff
  branches: Branch[]
  saving: boolean
  onSave: (id: string, body: StaffInput) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    fullName: item.user.fullName,
    email: item.user.email,
    phone: item.user.phone ?? '',
    password: '',
    branchIds: item.assignments.map((assignment) => assignment.branchId)
  })
  const toggleBranch = (branchId: number, checked: boolean) =>
    setDraft((current) => ({
      ...current,
      branchIds: checked ? [...current.branchIds, branchId] : current.branchIds.filter((id) => id !== branchId)
    }))
  return (
    <article style={{ background: '#fff', padding: 18, borderRadius: 16 }}>
      <strong>{item.user.fullName}</strong> · {item.user.email}
      <p>{item.assignments.map((assignment) => assignment.branch.name).join(', ') || 'Chưa phân công chi nhánh'}</p>
      {editing && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
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
          <fieldset>
            <legend>Chi nhánh được phân công</legend>
            {branches.map((branch) => (
              <label key={branch.id} style={{ display: 'block', margin: 8 }}>
                <input
                  type='checkbox'
                  checked={draft.branchIds.includes(branch.id)}
                  onChange={(event) => toggleBranch(branch.id, event.target.checked)}
                />{' '}
                {branch.name}
              </label>
            ))}
          </fieldset>
          <Button
            disabled={draft.branchIds.length === 0}
            isLoading={saving}
            onClick={() => {
              onSave(item.id, { ...draft, phone: draft.phone || undefined, password: draft.password || undefined })
              setEditing(false)
            }}
          >
            Lưu thay đổi
          </Button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant='secondary' onClick={() => setEditing((value) => !value)}>
          {editing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa'}
        </Button>
        <Button variant='secondary' onClick={() => onSave(item.id, { locked: item.user.status !== 'LOCKED' })}>
          {item.user.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
        </Button>
        <Button
          variant='secondary'
          onClick={() => onSave(item.id, { status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
        >
          {item.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}
        </Button>
      </div>
    </article>
  )
}

export function StaffPage() {
  const qc = useQueryClient()
  const staff = useQuery({ queryKey: ['partner', 'staff'], queryFn: listStaff })
  const branches = useQuery({ queryKey: ['partner', 'branches'], queryFn: listBranches })
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', branchIds: [] as number[] })
  const [error, setError] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: createStaff,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['partner', 'staff'] })
      setForm({ fullName: '', email: '', phone: '', password: '', branchIds: [] })
      setError(null)
    },
    onError: (err) => setError(getPartnerApiError(err, 'Không thể tạo nhân viên.'))
  })
  const change = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateStaff>[1] }) => updateStaff(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner', 'staff'] }),
    onError: (err) => setError(getPartnerApiError(err, 'Không thể cập nhật nhân viên.'))
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.fullName || !form.email || form.password.length < 8 || form.branchIds.length === 0) {
      setError('Vui lòng nhập đủ thông tin, mật khẩu tối thiểu 8 ký tự và chọn ít nhất một chi nhánh.')
      return
    }
    create.mutate({ ...form, phone: form.phone || undefined })
  }
  return (
    <section style={{ maxWidth: 980, margin: '0 auto' }}>
      <h1>Quản lý nhân viên</h1>
      <p>Tạo tài khoản và phân công một nhân viên làm việc tại nhiều chi nhánh.</p>
      {error && (
        <div role='alert' style={{ padding: 12, background: '#fee2e2', marginBottom: 16 }}>
          {error}
        </div>
      )}
      <form onSubmit={submit} style={{ background: '#fff', padding: 20, borderRadius: 16, display: 'grid', gap: 12 }}>
        <Input label='Họ tên' value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Input
          label='Email'
          type='email'
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input label='Số điện thoại' value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label='Mật khẩu ban đầu'
          type='password'
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <fieldset>
          <legend>Chi nhánh được phân công</legend>
          {branches.data?.map((branch) => (
            <label key={branch.id} style={{ display: 'block', margin: 8 }}>
              <input
                type='checkbox'
                checked={form.branchIds.includes(branch.id)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    branchIds: e.target.checked
                      ? [...form.branchIds, branch.id]
                      : form.branchIds.filter((id) => id !== branch.id)
                  })
                }
              />{' '}
              {branch.name}
            </label>
          ))}
        </fieldset>
        <Button type='submit' isLoading={create.isPending}>
          Tạo nhân viên
        </Button>
      </form>
      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {staff.data?.map((item) => (
          <StaffCard
            key={item.id}
            item={item}
            branches={branches.data ?? []}
            saving={change.isPending}
            onSave={(id, body) => change.mutate({ id, body })}
          />
        ))}
      </div>
    </section>
  )
}
