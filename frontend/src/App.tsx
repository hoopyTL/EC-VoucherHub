/**
 * Application shell and route definitions (task 10.1).
 *
 * Wires up React Router with the full route tree for the Voucher System:
 *   - Public routes (home, browse, voucher detail, auth) inside a public layout
 *     with the global Header/Footer.
 *   - Customer routes (cart, checkout, payment, orders, codes, account) guarded
 *     by `ProtectedRoute` requiring the CUSTOMER role.
 *   - Partner routes inside a workspace layout (Header + partner Sidebar),
 *     guarded for the PARTNER role.
 *   - Admin routes inside a workspace layout (Header + admin Sidebar), guarded
 *     for the ADMIN role.
 *
 * The concrete page components are implemented in later tasks (11–14). Until
 * they exist, each route renders a lightweight placeholder so the router is
 * fully navigable and the client builds. Page tasks replace the placeholders
 * with their real page imports.
 */
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar, type SidebarVariant } from './components/layout/Sidebar'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { GuestRoute } from './components/layout/GuestRoute'
import { RegisterCustomerPage } from './pages/public/RegisterCustomerPage'
import { RegisterPartnerPage } from './pages/public/RegisterPartnerPage'
import { LoginPage } from './pages/public/LoginPage'
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage'
import { AccountPage } from './pages/public/AccountPage'
import { HomePage } from './pages/public/HomePage'
import { RegisterChooserPage } from './pages/public/RegisterChooserPage'
import { VoucherBrowsePage } from './pages/public/VoucherBrowsePage'
import { VoucherDetailPage } from './pages/public/VoucherDetailPage'
import { OrderDetailPage } from './pages/customer/OrderDetailPage'
import { CheckoutPage } from './pages/customer/CheckoutPage'
import { CustomerCartHubPage } from './pages/customer/CustomerCartHubPage'
import { PaymentResultPage } from './pages/customer/PaymentResultPage'
import { VouchersPage as PartnerVouchersPage } from './pages/partner/VouchersPage'
import { CreateVoucherPage as PartnerCreateVoucherPage } from './pages/partner/CreateVoucherPage'
import { DashboardPage as PartnerDashboardPage } from './pages/partner/DashboardPage'
import { BranchesPage as PartnerBranchesPage } from './pages/partner/BranchesPage'
import { RedeemCodePage } from './pages/partner/RedeemCodePage'
import { ProfilePage as PartnerProfilePage } from './pages/partner/ProfilePage'
import { PartnerReportsPage } from './pages/partner/PartnerReportsPage'
import { DashboardPage as AdminDashboardPage } from './pages/admin/DashboardPage'
import { UsersPage as AdminUsersPage } from './pages/admin/UsersPage'
import { PartnerApprovalsPage as AdminPartnerApprovalsPage } from './pages/admin/PartnerApprovalsPage'
import { VoucherApprovalsPage as AdminVoucherApprovalsPage } from './pages/admin/VoucherApprovalsPage'
import { OrdersPage as AdminOrdersPage } from './pages/admin/OrdersPage'
import { ToastProvider } from './components/ui'

/* -------------------------------------------------------------------------- */
/* Layout shells                                                              */
/* -------------------------------------------------------------------------- */

/** Public/customer layout: header, routed content, footer. */
function PublicLayout() {
  return (
    <div id='top' data-theme='customer' style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className='public-main' style={{ flex: 1, padding: '40px 24px', width: '100%' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/** Full-bleed presentation shell shared by all guest authentication screens. */
function AuthLayout() {
  return (
    <section className='auth-shell'>
      <div className='auth-shell__form'>
        <Outlet />
      </div>
      <aside className='auth-shell__brand' aria-label='VoucherHub'>
        <div className='auth-shell__brand-content'>
          <span className='auth-shell__eyebrow'>VoucherHub Marketplace</span>
          <h2>Ưu đãi thật. Trải nghiệm đáng nhớ.</h2>
          <p>Kết nối người mua với những thương hiệu Việt được tuyển chọn kỹ lưỡng.</p>
          <div className='auth-shell__stats'>
            <span>
              <strong>100+</strong> voucher đang bán
            </span>
            <span>
              <strong>12</strong> đối tác uy tín
            </span>
            <span>
              <strong>5</strong> khu vực phục vụ
            </span>
          </div>
        </div>
      </aside>
    </section>
  )
}

/** Workspace layout for admin/partner: header, sidebar + content, footer. */
function WorkspaceLayout({ variant }: { variant: SidebarVariant }) {
  return (
    <div id='top' data-theme={variant} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div className='workspace-shell' style={{ display: 'flex', flex: 1 }}>
        <Sidebar variant={variant} />
        <main
          className={`workspace-main workspace-main--${variant}`}
          style={{ flex: 1, padding: '2rem', minWidth: 0, background: 'var(--workspace-background)' }}
        >
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Placeholder pages (replaced by tasks 11–14)                                */
/* -------------------------------------------------------------------------- */

function NotFound() {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>404 — Không tìm thấy trang</h1>
      <p style={{ color: 'rgba(0, 0, 0, 0.6)' }}>Trang bạn đang tìm không tồn tại.</p>
    </section>
  )
}

/** Landing page for `/register` letting visitors choose an account type. */
/* RegisterChooser moved to pages/public/RegisterChooserPage.tsx */

/* -------------------------------------------------------------------------- */
/* Route tree                                                                 */
/* -------------------------------------------------------------------------- */

export function AppRoutes() {
  return (
    <Routes>
      {/* Public + customer-facing routes share the public layout. */}
      <Route element={<PublicLayout />}>
        {/* Public */}
        <Route index element={<HomePage />} />
        <Route path='search' element={<VoucherBrowsePage />} />
        <Route path='vouchers' element={<Navigate to='/search' replace />} />
        <Route path='vouchers/:id' element={<VoucherDetailPage />} />

        {/* Guest-only auth routes: signed-in users are redirected to their home. */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path='login' element={<LoginPage />} />
            <Route path='forgot-password' element={<ForgotPasswordPage />} />
            <Route path='register' element={<RegisterChooserPage />} />
            <Route path='register/customer' element={<RegisterCustomerPage />} />
            <Route path='partner/register' element={<RegisterPartnerPage />} />
            <Route path='register/partner' element={<RegisterPartnerPage />} />
          </Route>
        </Route>

        {/* Customer-only routes */}
        <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
          <Route path='cart' element={<CustomerCartHubPage />} />
          <Route path='checkout' element={<CheckoutPage />} />
          <Route path='orders' element={<Navigate to='/cart?tab=orders' replace />} />
          <Route path='orders/:id' element={<OrderDetailPage />} />
        </Route>

        {/* Any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route path='profile' element={<AccountPage />} />
          <Route path='account' element={<Navigate to='/profile' replace />} />
        </Route>

        {/* Màn hình kết quả thanh toán mở tự do (tránh bị kẹt vì mất JWT) */}
        <Route path='payment-result' element={<PaymentResultPage />} />
      </Route>

      {/* Partner workspace */}
      <Route
        path='partner'
        element={
          <ProtectedRoute allowedRoles={['PARTNER']}>
            <WorkspaceLayout variant='partner' />
          </ProtectedRoute>
        }
      >
        <Route index element={<PartnerDashboardPage />} />
        <Route path='profile' element={<PartnerProfilePage />} />
        <Route path='branches' element={<PartnerBranchesPage />} />
        <Route path='vouchers' element={<PartnerVouchersPage />} />
        <Route path='vouchers/new' element={<PartnerCreateVoucherPage />} />
        <Route path='vouchers/:id/edit' element={<PartnerCreateVoucherPage />} />
        <Route path='redeem' element={<RedeemCodePage />} />
        <Route path='reports' element={<PartnerReportsPage />} />
      </Route>

      {/* Admin console */}
      <Route
        path='admin'
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <WorkspaceLayout variant='admin' />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path='users' element={<AdminUsersPage />} />
        <Route path='partners' element={<AdminPartnerApprovalsPage />} />
        <Route path='vouchers' element={<AdminVoucherApprovalsPage />} />
        <Route path='orders' element={<AdminOrdersPage />} />
      </Route>

      {/* Fallbacks */}
      <Route path='404' element={<NotFound />} />
      <Route path='*' element={<Navigate to='/404' replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
