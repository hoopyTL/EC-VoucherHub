import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CartPage } from './CartPage'
import { OrdersPage } from './OrdersPage'
import { colors, fonts, radius } from '../../theme/tokens'

/** Customer commerce hub: the cart icon owns both the active cart and purchase history. */
export function CustomerCartHubPage() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') === 'orders' ? 'orders' : 'cart'

  function selectTab(tab: 'cart' | 'orders') {
    setParams(tab === 'orders' ? { tab: 'orders' } : {}, { replace: true })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div role='tablist' aria-label='Giỏ hàng và đơn đã mua' style={tabListStyle}>
        <button type='button' role='tab' aria-selected={activeTab === 'cart'} onClick={() => selectTab('cart')} style={tabStyle(activeTab === 'cart')}>
          Giỏ hàng
        </button>
        <button type='button' role='tab' aria-selected={activeTab === 'orders'} onClick={() => selectTab('orders')} style={tabStyle(activeTab === 'orders')}>
          Đơn đã mua
        </button>
      </div>
      <div role='tabpanel'>{activeTab === 'cart' ? <CartPage /> : <OrdersPage />}</div>
    </div>
  )
}

const tabListStyle: CSSProperties = {
  display: 'inline-flex',
  gap: 4,
  marginBottom: 28,
  padding: 5,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.full,
  background: colors.surface
}

function tabStyle(active: boolean): CSSProperties {
  return {
    minHeight: 40,
    padding: '8px 18px',
    border: 0,
    borderRadius: radius.full,
    background: active ? colors.accentSurface : 'transparent',
    color: active ? colors.accentHover : colors.slate,
    fontFamily: fonts.display,
    fontWeight: 700,
    cursor: 'pointer'
  }
}

export default CustomerCartHubPage
