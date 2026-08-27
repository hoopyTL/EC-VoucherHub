import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Badge, Button, Input, LoadingSpinner, variantForStatus } from '../../components/ui'
import {
  getPartnerApiError,
  getPartnerProfile,
  updatePartnerProfile,
  type PartnerProfile
} from '../../services/partner'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatStatus } from '../../utils/format'

const PROFILE_QUERY_KEY = ['partner', 'profile'] as const
interface ProfileForm {
  legalName: string
  taxCode: string
  representative: string
}
const EMPTY_FORM: ProfileForm = { legalName: '', taxCode: '', representative: '' }

export function ProfilePage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const profileQuery = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: getPartnerProfile })

  useEffect(() => {
    if (!profileQuery.data) return
    setForm({
      legalName: profileQuery.data.legalName,
      taxCode: profileQuery.data.taxCode,
      representative: profileQuery.data.representative
    })
  }, [profileQuery.data])

  const updateMutation = useMutation({
    mutationFn: updatePartnerProfile,
    onSuccess: async (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile)
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
      setNotice('Đã cập nhật hồ sơ đối tác.')
      setError(null)
    },
    onError: (err) => {
      setError(getPartnerApiError(err, 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'))
      setNotice(null)
    }
  })

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
    setNotice(null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.legalName.trim() || !form.taxCode.trim() || !form.representative.trim()) {
      setError('Tên doanh nghiệp, mã số thuế và người đại diện là bắt buộc.')
      return
    }
    updateMutation.mutate({
      legalName: form.legalName.trim(),
      taxCode: form.taxCode.trim(),
      representative: form.representative.trim()
    })
  }

  if (profileQuery.isLoading) return <LoadingSpinner label='Đang tải hồ sơ đối tác' />
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div role='alert' style={alertStyle}>
        Không thể tải hồ sơ đối tác.{' '}
        <button type='button' style={retryStyle} onClick={() => profileQuery.refetch()}>
          Thử lại
        </button>
      </div>
    )
  }

  const profile: PartnerProfile = profileQuery.data
  return (
    <section className='partner-page partner-profile-page' style={{ maxWidth: 820, margin: '0 auto' }}>
      <p style={eyebrowStyle}>● Hồ sơ đối tác</p>
      <div style={headingRowStyle}>
        <h1 style={titleStyle}>{profile.legalName}</h1>
        <div style={badgeRowStyle}>
          <Badge variant={variantForStatus(profile.approvalStatus)}>{formatStatus(profile.approvalStatus)}</Badge>
          <Badge variant={variantForStatus(profile.operatingStatus)}>{formatStatus(profile.operatingStatus)}</Badge>
        </div>
      </div>
      <p style={subtitleStyle}>Quản lý thông tin pháp lý và người đại diện của doanh nghiệp.</p>
      {profile.rejectReason && (
        <div role='alert' style={rejectStyle}>
          Lý do từ chối: {profile.rejectReason}
        </div>
      )}
      {error && (
        <div role='alert' style={alertStyle}>
          {error}
        </div>
      )}
      {notice && (
        <div role='status' style={noticeStyle}>
          {notice}
        </div>
      )}

      <form style={cardStyle} onSubmit={submit} noValidate>
        <div style={gridStyle}>
          <Input
            label='Tên doanh nghiệp'
            value={form.legalName}
            onChange={(event) => updateField('legalName', event.target.value)}
            required
          />
          <Input
            label='Mã số thuế'
            value={form.taxCode}
            onChange={(event) => updateField('taxCode', event.target.value)}
            required
          />
          <Input
            label='Người đại diện'
            value={form.representative}
            onChange={(event) => updateField('representative', event.target.value)}
            required
          />
          <Input label='Số điện thoại tài khoản' value={profile.owner.phone ?? ''} disabled />
          <Input label='Email tài khoản' value={profile.owner.email ?? ''} disabled />
        </div>
        <p style={helperStyle}>Email và số điện thoại được quản lý tại trang tài khoản cá nhân.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button type='submit' isLoading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </section>
  )
}

const eyebrowStyle: CSSProperties = {
  margin: '0 0 10px',
  color: colors.slate,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
}
const headingRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center'
}
const badgeRowStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
const titleStyle: CSSProperties = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 'clamp(30px, 4vw, 42px)',
  fontWeight: 800,
  letterSpacing: '-0.03em'
}
const subtitleStyle: CSSProperties = { color: colors.slate, maxWidth: 620, lineHeight: 1.6 }
const cardStyle: CSSProperties = {
  marginTop: 28,
  padding: 28,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: shadows.card
}
const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 20
}
const alertStyle: CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface
}
const rejectStyle: CSSProperties = { ...alertStyle, lineHeight: 1.5 }
const noticeStyle: CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: radius.md,
  background: colors.successSurface,
  color: colors.onSuccessSurface
}
const helperStyle: CSSProperties = { margin: '14px 0 0', color: colors.slate, fontSize: 13 }
const retryStyle: CSSProperties = {
  border: 0,
  padding: 0,
  background: 'transparent',
  color: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer'
}

export default ProfilePage
