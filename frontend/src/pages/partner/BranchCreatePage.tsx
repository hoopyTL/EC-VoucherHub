import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, MapPin, Save } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { createBranch, getPartnerApiError } from '../../services/partner'
import { VOUCHER_REGIONS } from '../../constants/voucher'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

export function BranchCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', address: '', region: '' })
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: createBranch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partner', 'branches'] })
      navigate('/partner/branches', { state: { notice: 'Đã thêm chi nhánh mới.' } })
    },
    onError: (cause) => setError(getPartnerApiError(cause, 'Không thể thêm chi nhánh.'))
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.address.trim() || !form.region)
      return setError('Vui lòng nhập đầy đủ thông tin bắt buộc.')
    mutation.mutate({ name: form.name.trim(), address: form.address.trim(), region: form.region })
  }
  return (
    <section className='partner-page partner-branch-form-page' style={{ maxWidth: 860, margin: '0 auto' }}>
      <Link to='/partner/branches' style={{ color: colors.slate, fontWeight: 700 }}>
        ← Quay lại danh sách chi nhánh
      </Link>
      <header style={{ margin: '24px 0' }}>
        <p style={{ color: colors.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Mở rộng điểm phục vụ
        </p>
        <h1 style={{ margin: 0, fontFamily: fonts.display, fontSize: 'clamp(30px, 4vw, 40px)' }}>Thêm chi nhánh</h1>
        <p style={{ color: colors.slate }}>
          Khai báo địa điểm áp dụng voucher và nơi nhân viên xác nhận mã cho khách hàng.
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
            <Building2 />
          </span>
          <div>
            <strong>Thông tin điểm kinh doanh</strong>
            <small style={{ display: 'block', color: colors.slate }}>
              Thông tin này sẽ hiển thị trong điều kiện sử dụng voucher.
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
        <Input
          label='Tên chi nhánh'
          required
          placeholder='Ví dụ: VoucherHub Nguyễn Huệ'
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label='Địa chỉ đầy đủ'
          required
          placeholder='Số nhà, đường, phường/xã, quận/huyện'
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
          <span>
            <MapPin size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Khu vực *
          </span>
          <select
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            style={{
              minHeight: 50,
              padding: '0 14px',
              borderRadius: radius.md,
              border: `1px solid ${colors.hairline}`,
              background: colors.surface
            }}
          >
            <option value=''>Chọn khu vực</option>
            {VOUCHER_REGIONS.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button type='button' variant='secondary' onClick={() => navigate('/partner/branches')}>
            Hủy
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Save size={17} /> Lưu chi nhánh
          </Button>
        </div>
      </form>
    </section>
  )
}
