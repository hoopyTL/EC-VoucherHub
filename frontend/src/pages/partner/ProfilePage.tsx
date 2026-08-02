import { Button, Input } from '../../components/ui'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

export function ProfilePage() {
  return (
    <section style={{ maxWidth: 820, margin: '0 auto' }}>
      <p style={eyebrowStyle}>● Hồ sơ đối tác</p>
      <h1 style={titleStyle}>Saigon Select</h1>
      <p style={subtitleStyle}>Quản lý thông tin doanh nghiệp và đầu mối liên hệ hiển thị trên VoucherHub.</p>
      <div style={cardStyle}>
        <div style={gridStyle}>
          <Input label='Tên doanh nghiệp' defaultValue='Saigon Select' />
          <Input label='Mã số thuế' defaultValue='0312345678' disabled />
          <Input label='Người đại diện' defaultValue='Lê Thanh Hà' />
          <Input label='Số điện thoại' defaultValue='0909 123 456' />
          <Input label='Email' defaultValue='hello@saigonselect.vn' />
          <Input label='Mã đăng ký kinh doanh' defaultValue='0312345678' disabled />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button>Lưu thay đổi</Button>
        </div>
      </div>
    </section>
  )
}

const eyebrowStyle = {
  margin: '0 0 10px',
  color: colors.slate,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const
}
const titleStyle = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 48,
  fontWeight: 800,
  letterSpacing: '-0.03em'
}
const subtitleStyle = { color: colors.slate, maxWidth: 620, lineHeight: 1.6 }
const cardStyle = {
  marginTop: 28,
  padding: 28,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: shadows.card
}
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 20
}

export default ProfilePage
