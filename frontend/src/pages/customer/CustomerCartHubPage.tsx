import { useSearchParams } from 'react-router-dom'
import { CartPage } from './CartPage'
import { OrdersPage } from './OrdersPage'

/** Customer commerce hub: the cart icon owns both the active cart and purchase history. */
export function CustomerCartHubPage() {
  const [params] = useSearchParams()
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

  return (
    <div className='customer-commerce-hub customer-cart-hub-page' style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div role='tabpanel'>{activeTab === 'cart' ? <CartPage /> : <OrdersPage view={activeTab} />}</div>
    </div>
  )
}

export default CustomerCartHubPage
