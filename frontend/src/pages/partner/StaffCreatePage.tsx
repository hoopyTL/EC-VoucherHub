import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, UserPlus } from 'lucide-react'
import { Button, ContentSkeleton, Input } from '../../components/ui'
import { createStaff, getPartnerApiError, listBranches } from '../../services/partner'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

export function StaffCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const branches = useQuery({ queryKey: ['partner', 'branches'], queryFn: listBranches })
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', branchIds: [] as number[] })
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: createStaff,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partner', 'staff'] })
      navigate('/partner/staff')
    },
    onError: (cause) => setError(getPartnerApiError(cause, 'Không thể tạo nhân viên.'))
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 8 || !form.branchIds.length)
      return setError('Nhập đủ thông tin, mật khẩu tối thiểu 8 ký tự và chọn chi nhánh.')
    mutation.mutate({ ...form, phone: form.phone.trim() || undefined })
  }
  return (
    <section className='partner-page partner-staff-form-page' style={{ maxWidth: 900, margin: '0 auto' }}>
      <Link to='/partner/staff' style={{ color: colors.slate, fontWeight: 700 }}>
        ← Quay lại danh sách nhân viên
      </Link>
      <header style={{ margin: '24px 0' }}>
        <p style={{ color: colors.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Phân quyền vận hành
        </p>
        <h1 style={{ margin: 0, fontFamily: fonts.display, fontSize: 'clamp(30px, 4vw, 40px)' }}>Thêm nhân viên</h1>
        <p style={{ color: colors.slate }}>
          Tạo tài khoản và chỉ định chính xác những chi nhánh nhân viên được phép xác nhận voucher.
        </p>
      </header>
      <form
        onSubmit={submit}
        style={{
          display: 'grid',
          gap: 22,
          padding: 32,
          borderRadius: radius.xl,
          background: colors.surface,
          border: `1px solid ${colors.hairline}`,
          boxShadow: shadows.card
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 48,
              height: 48,
              borderRadius: radius.md,
              background: colors.accentSurface,
              color: colors.accentHover
            }}
          >
            <UserPlus />
          </span>
          <div>
            <strong>Thông tin tài khoản</strong>
            <small style={{ display: 'block', color: colors.slate }}>
              Nhân viên dùng email và mật khẩu này để đăng nhập.
            </small>
          </div>
        </div>
        {error && (
          <div
            role='alert'
            style={{
              padding: 14,
              borderRadius: radius.md,
              background: colors.dangerSurface,
              color: colors.onDangerSurface
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}>
          <Input
            label='Họ và tên'
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            label='Email đăng nhập'
            required
            type='email'
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label='Số điện thoại'
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label='Mật khẩu ban đầu'
            required
            type='password'
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <fieldset style={{ border: `1px solid ${colors.hairline}`, borderRadius: radius.lg, padding: 18 }}>
          <legend style={{ padding: '0 8px', fontWeight: 800 }}>
            <ShieldCheck size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Chi nhánh được phân công
          </legend>
          {branches.isLoading ? (
            <ContentSkeleton rows={2} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
              {(branches.data ?? []).map((branch) => (
                <label
                  key={branch.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: 14,
                    borderRadius: radius.md,
                    background: colors.surfaceMuted
                  }}
                >
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
                  />
                  <span>
                    <strong style={{ display: 'block' }}>{branch.name}</strong>
                    <small style={{ color: colors.slate }}>{branch.region}</small>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button type='button' variant='secondary' onClick={() => navigate('/partner/staff')}>
            Hủy
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            Tạo tài khoản nhân viên
          </Button>
        </div>
      </form>
    </section>
  )
}
