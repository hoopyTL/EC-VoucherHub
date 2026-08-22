import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CartPage } from './CartPage'
import { OrdersPage } from './OrdersPage'
import { colors, fonts, radius } from '../../theme/tokens'

/** Customer commerce hub: the cart icon owns both the active cart and purchase history. */
export function CustomerCartHubPage() {
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const activeTab =
    requestedTab === 'processing' ||
    requestedTab === 'purchased' ||
    requestedTab === 'history' ||
    requestedTab === 'orders'
      ? requestedTab === 'orders'
        ? 'history'
        : requestedTab
      : 'cart'

  function selectTab(tab: 'cart' | 'processing' | 'purchased' | 'history') {
    setParams(tab === 'cart' ? {} : { tab }, { replace: true })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div role='tablist' aria-label='Giỏ hàng và lịch sử mua hàng' style={tabListStyle}>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'cart'}
          onClick={() => selectTab('cart')}
          style={tabStyle(activeTab === 'cart')}
        >
          Giỏ hàng
        </button>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'processing'}
          onClick={() => selectTab('processing')}
          style={tabStyle(activeTab === 'processing')}
        >
          Chờ thanh toán
        </button>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'purchased'}
          onClick={() => selectTab('purchased')}
          style={tabStyle(activeTab === 'purchased')}
        >
          Đã mua
        </button>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'history'}
          onClick={() => selectTab('history')}
          style={tabStyle(activeTab === 'history')}
        >
          Lịch sử
        </button>
      </div>
      <div role='tabpanel'>{activeTab === 'cart' ? <CartPage /> : <OrdersPage view={activeTab} />}</div>
    </div>
  )
}

const tabListStyle: CSSProperties = {
  display: 'flex',
  maxWidth: '100%',
  overflowX: 'auto',
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
