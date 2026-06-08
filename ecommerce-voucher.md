# EC-VoucherHub — Hệ thống TMĐT bán voucher giảm giá trực tuyến

## Overview

Xây dựng nền tảng thương mại điện tử bán voucher giảm giá trực tuyến cho đồ án cuối kỳ môn TMĐT. Hệ thống đóng vai trò **sàn trung gian** giữa khách hàng và đối tác cung cấp dịch vụ, hỗ trợ toàn bộ vòng đời voucher: tạo → duyệt → bán → thanh toán → phát hành mã → xác thực sử dụng → báo cáo.

**Nguồn yêu cầu:** [BRD v1.0](file:///Users/hoopy/Downloads/EC-VoucherHub/docs/01-brd/brd.md)

---

## Project Type

**WEB** — Full-stack web application

---

## Success Criteria

| Mã | Tiêu chí | Đo lường |
|-----|----------|----------|
| SC-01 | Quy trình mua voucher end-to-end hoạt động | Customer tìm → thêm giỏ → thanh toán → nhận mã → sử dụng |
| SC-02 | Vòng đời voucher nhất quán | Trạng thái voucher, đơn hàng, voucher code đúng theo 15 business rules |
| SC-03 | Partner xác thực voucher thành công | Nhập mã hoặc QR → hệ thống xác minh → đánh dấu đã dùng |
| SC-04 | Dashboard admin hiển thị báo cáo | Doanh thu, đơn hàng, voucher, đối tác — có filter thời gian |
| SC-05 | 3 vai trò hoạt động độc lập | Customer, Partner, Admin với giao diện & quyền riêng |
| SC-06 | Dữ liệu mẫu demo đầy đủ | ≥ 5 đối tác, ≥ 20 voucher, ≥ 50 đơn hàng, ≥ 3 danh mục |

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Vite + React 19 (SPA) | Nhẹ, nhanh, phù hợp dashboard-heavy. 3 entry points riêng |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Modern, customizable, premium look, accessible components |
| **Backend** | Node.js + Express.js | Đơn giản, ecosystem lớn, phù hợp đồ án |
| **ORM** | Prisma | Type-safe, migration tốt, quan hệ phức tạp dễ quản lý |
| **Database** | PostgreSQL | CSDL quan hệ (CON-02), hỗ trợ transaction & locking tốt |
| **Auth** | JWT + bcrypt + Role-based middleware | Tự xây, hiểu sâu cơ chế (mục tiêu học tập) |
| **Monorepo** | npm workspaces | Share types giữa FE/BE, đơn giản, không cần thêm tooling |
| **Inventory** | Optimistic locking (version field) + Prisma transaction | Tránh bán vượt tồn kho (RB-15, RISK-03) |
| **Validation** | Zod | Schema validation chung cho FE & BE |
| **State Mgmt** | Zustand + TanStack Query | Zustand cho UI state, TanStack Query cho server state |
| **QR** | qrcode.js (generate) + html5-qrcode (scan mock) | QR mô phỏng cho voucher code |
| **Charts** | Recharts | Dashboard charts, nhẹ, React-native |

---

## File Structure

```plaintext
EC-VoucherHub/
├── docs/                           # Tài liệu dự án
│   ├── 01-brd/brd.md
│   ├── 02-srs/                     # (tương lai)
│   └── 03-erd/                     # (tương lai)
├── packages/
│   ├── shared/                     # Shared types, schemas, constants
│   │   ├── src/
│   │   │   ├── types/              # TypeScript interfaces
│   │   │   │   ├── user.ts
│   │   │   │   ├── voucher.ts
│   │   │   │   ├── order.ts
│   │   │   │   ├── partner.ts
│   │   │   │   └── index.ts
│   │   │   ├── schemas/            # Zod validation schemas
│   │   │   │   ├── auth.schema.ts
│   │   │   │   ├── voucher.schema.ts
│   │   │   │   ├── order.schema.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/          # Enums, status mappings
│   │   │   │   ├── roles.ts
│   │   │   │   ├── voucher-status.ts
│   │   │   │   ├── order-status.ts
│   │   │   │   └── index.ts
│   │   │   └── utils/              # Shared utilities
│   │   │       ├── format.ts
│   │   │       └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backend/                    # Express API Server
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   ├── migrations/
│   │   │   └── seed.ts             # Demo data seeder
│   │   ├── src/
│   │   │   ├── app.ts              # Express app setup
│   │   │   ├── server.ts           # Entry point
│   │   │   ├── config/
│   │   │   │   ├── env.ts          # Environment config
│   │   │   │   └── database.ts     # Prisma client instance
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # JWT verification
│   │   │   │   ├── rbac.ts         # Role-based access control
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── validate.ts     # Zod request validation
│   │   │   │   └── audit-log.ts    # Activity logging (BR-ADM-07)
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   └── auth.test.ts
│   │   │   │   ├── user/
│   │   │   │   │   ├── user.controller.ts
│   │   │   │   │   ├── user.service.ts
│   │   │   │   │   ├── user.routes.ts
│   │   │   │   │   └── user.test.ts
│   │   │   │   ├── partner/
│   │   │   │   │   ├── partner.controller.ts
│   │   │   │   │   ├── partner.service.ts
│   │   │   │   │   ├── partner.routes.ts
│   │   │   │   │   └── partner.test.ts
│   │   │   │   ├── voucher/
│   │   │   │   │   ├── voucher.controller.ts
│   │   │   │   │   ├── voucher.service.ts
│   │   │   │   │   ├── voucher.routes.ts
│   │   │   │   │   └── voucher.test.ts
│   │   │   │   ├── order/
│   │   │   │   │   ├── order.controller.ts
│   │   │   │   │   ├── order.service.ts
│   │   │   │   │   ├── order.routes.ts
│   │   │   │   │   └── order.test.ts
│   │   │   │   ├── voucher-code/
│   │   │   │   │   ├── voucher-code.controller.ts
│   │   │   │   │   ├── voucher-code.service.ts
│   │   │   │   │   ├── voucher-code.routes.ts
│   │   │   │   │   └── voucher-code.test.ts
│   │   │   │   ├── cart/
│   │   │   │   │   ├── cart.controller.ts
│   │   │   │   │   ├── cart.service.ts
│   │   │   │   │   └── cart.routes.ts
│   │   │   │   ├── category/
│   │   │   │   │   ├── category.controller.ts
│   │   │   │   │   ├── category.service.ts
│   │   │   │   │   └── category.routes.ts
│   │   │   │   ├── review/
│   │   │   │   │   ├── review.controller.ts
│   │   │   │   │   ├── review.service.ts
│   │   │   │   │   └── review.routes.ts
│   │   │   │   ├── content/
│   │   │   │   │   ├── content.controller.ts
│   │   │   │   │   ├── content.service.ts
│   │   │   │   │   └── content.routes.ts
│   │   │   │   └── dashboard/
│   │   │   │       ├── dashboard.controller.ts
│   │   │   │       ├── dashboard.service.ts
│   │   │   │       └── dashboard.routes.ts
│   │   │   └── utils/
│   │   │       ├── voucher-code-generator.ts  # Unique code gen (RB-06)
│   │   │       ├── pagination.ts
│   │   │       └── response.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                   # Vite + React SPA
│       ├── public/
│       ├── src/
│       │   ├── main.tsx            # Entry point
│       │   ├── App.tsx             # Root + Router
│       │   ├── api/                # API client (axios + interceptors)
│       │   │   ├── client.ts
│       │   │   ├── auth.api.ts
│       │   │   ├── voucher.api.ts
│       │   │   ├── order.api.ts
│       │   │   ├── partner.api.ts
│       │   │   └── admin.api.ts
│       │   ├── stores/             # Zustand stores
│       │   │   ├── auth.store.ts
│       │   │   ├── cart.store.ts
│       │   │   └── ui.store.ts
│       │   ├── hooks/              # Custom hooks (TanStack Query)
│       │   │   ├── useVouchers.ts
│       │   │   ├── useOrders.ts
│       │   │   ├── useAuth.ts
│       │   │   └── useCart.ts
│       │   ├── components/         # Shared UI components
│       │   │   ├── ui/             # shadcn/ui base components
│       │   │   ├── layout/
│       │   │   │   ├── Header.tsx
│       │   │   │   ├── Footer.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   └── ProtectedRoute.tsx
│       │   │   └── common/
│       │   │       ├── VoucherCard.tsx
│       │   │       ├── SearchBar.tsx
│       │   │       ├── QRCode.tsx
│       │   │       ├── StatusBadge.tsx
│       │   │       └── DataTable.tsx
│       │   ├── pages/
│       │   │   ├── customer/       # Customer-facing pages
│       │   │   │   ├── HomePage.tsx
│       │   │   │   ├── VoucherListPage.tsx
│       │   │   │   ├── VoucherDetailPage.tsx
│       │   │   │   ├── CartPage.tsx
│       │   │   │   ├── CheckoutPage.tsx
│       │   │   │   ├── OrderHistoryPage.tsx
│       │   │   │   ├── MyVouchersPage.tsx
│       │   │   │   └── ProfilePage.tsx
│       │   │   ├── partner/        # Partner portal pages
│       │   │   │   ├── PartnerDashboard.tsx
│       │   │   │   ├── VoucherManagePage.tsx
│       │   │   │   ├── CreateVoucherPage.tsx
│       │   │   │   ├── VerifyVoucherPage.tsx
│       │   │   │   ├── PartnerReportPage.tsx
│       │   │   │   └── BranchManagePage.tsx
│       │   │   ├── admin/          # Admin dashboard pages
│       │   │   │   ├── AdminDashboard.tsx
│       │   │   │   ├── UserManagePage.tsx
│       │   │   │   ├── PartnerApprovalPage.tsx
│       │   │   │   ├── VoucherApprovalPage.tsx
│       │   │   │   ├── OrderManagePage.tsx
│       │   │   │   ├── ContentManagePage.tsx
│       │   │   │   ├── AuditLogPage.tsx
│       │   │   │   └── ReportPage.tsx
│       │   │   └── auth/           # Auth pages (shared)
│       │   │       ├── LoginPage.tsx
│       │   │       ├── RegisterPage.tsx
│       │   │       ├── ForgotPasswordPage.tsx
│       │   │       └── PartnerRegisterPage.tsx
│       │   ├── lib/                # Utilities
│       │   │   ├── cn.ts           # classnames utility
│       │   │   └── format.ts
│       │   └── styles/
│       │       └── globals.css     # Tailwind + custom tokens
│       ├── index.html
│       ├── tailwind.config.ts
│       ├── vite.config.ts
│       ├── components.json         # shadcn/ui config
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                    # Root package.json (npm workspaces config)
├── .env.example                    # Environment template
├── .gitignore
└── ecommerce-voucher.md            # This plan file
```

---

## Database Schema (ERD Summary)

### Core Entities

```
User (DR-01)
├── id, email, phone, password_hash, full_name, avatar_url
├── role: CUSTOMER | PARTNER | STAFF | ADMIN
├── status: ACTIVE | LOCKED
└── created_at, updated_at

Partner (DR-02)
├── id, user_id (FK), business_name, tax_code, representative
├── logo_url, description, address, phone
├── status: PENDING | APPROVED | REJECTED | LOCKED
└── created_at, updated_at, approved_at, approved_by

Branch
├── id, partner_id (FK), name, address, phone
├── is_active
└── created_at, updated_at

Category
├── id, name, slug, icon, description
├── is_active, sort_order
└── created_at, updated_at

Voucher (DR-03) — Sản phẩm
├── id, partner_id (FK), category_id (FK)
├── title, description, image_url, terms_conditions
├── original_price, selling_price  (RB-02: selling < original)
├── quantity_issued, quantity_sold  (RB-11: sold <= issued)
├── sale_start_date, sale_end_date  (RB-03)
├── use_start_date, use_end_date   (RB-03)
├── max_uses_per_code (default: 1) (RB-07)
├── status: DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | ON_SALE | PAUSED | EXPIRED
├── version (optimistic locking)
├── applicable_branches: Branch[] (M2M)
└── created_at, updated_at

CartItem
├── id, user_id (FK), voucher_id (FK), quantity
└── created_at, updated_at

Order (DR-04)
├── id, order_code, user_id (FK)
├── recipient_name, recipient_email, recipient_phone (gift support)
├── total_amount, payment_method: MOCK_CREDIT | MOCK_BANK | MOCK_EWALLET
├── payment_status: PENDING | PAID | FAILED | REFUNDED
├── order_status: PENDING | CONFIRMED | CANCELLED | REFUNDED
├── cancelled_reason, refunded_at
└── created_at, updated_at

OrderItem
├── id, order_id (FK), voucher_id (FK)
├── quantity, unit_price, subtotal
└── created_at

VoucherCode (DR-05) — Mã phát hành
├── id, order_item_id (FK), voucher_id (FK), user_id (FK owner)
├── code (unique, crypto-random, RB-06)
├── qr_data
├── status: ACTIVE | USED | EXPIRED | CANCELLED
├── uses_remaining (RB-07)
├── used_at, used_by_partner_id, used_at_branch_id
├── issued_at, expires_at
└── created_at

Review (DR-06)
├── id, user_id (FK), voucher_id (FK), voucher_code_id (FK)
├── rating (1-5), comment
├── status: VISIBLE | HIDDEN
└── created_at, updated_at

Content (Banner, Article, Policy)
├── id, type: BANNER | ARTICLE | POLICY | POPUP
├── title, content, image_url, link_url
├── is_active, sort_order
├── start_date, end_date
└── created_at, updated_at

AuditLog (BR-ADM-07)
├── id, user_id (FK), action, entity_type, entity_id
├── old_value (JSON), new_value (JSON)
├── ip_address
└── created_at
```

### Key Relationships
```
User 1---N Partner (một user role PARTNER → một hồ sơ đối tác)
Partner 1---N Branch
Partner 1---N Voucher
Voucher N---M Branch (applicable_branches)
Category 1---N Voucher
User 1---N CartItem
User 1---N Order
Order 1---N OrderItem
OrderItem N---1 Voucher
OrderItem 1---N VoucherCode (mỗi item.quantity = số code phát hành)
User 1---N VoucherCode (owner)
User 1---N Review
Voucher 1---N Review
```

### Voucher Status Flow (State Machine)
```
DRAFT → PENDING_APPROVAL → APPROVED → ON_SALE → PAUSED ↔ ON_SALE
                        ↘ REJECTED → DRAFT (sửa & gửi lại)
                                     ON_SALE → EXPIRED (tự động)
```

### Order Status Flow
```
PENDING → CONFIRMED (sau thanh toán) → (phát hành VoucherCode)
       ↘ CANCELLED (user hủy hoặc admin hủy)
CONFIRMED → REFUNDED (admin hoàn tiền mô phỏng)
```

### VoucherCode Status Flow
```
ACTIVE → USED (đối tác xác nhận sử dụng)
      ↘ EXPIRED (hết hạn tự động)
      ↘ CANCELLED (đơn hàng bị hủy/hoàn, RB-13)
```

---

## Task Breakdown

### Phase 1: Foundation (P0) — `database-architect` + `backend-specialist`

- [ ] **T1.1: Khởi tạo Monorepo**
  - Agent: `backend-specialist` | Skill: `nodejs-best-practices`
  - INPUT: Tech stack decisions
  - OUTPUT: Root `package.json` (với npm workspaces config), 3 packages skeleton
  - VERIFY: `npm install` chạy thành công, `npm run build` không lỗi

- [ ] **T1.2: Shared package — Types + Schemas + Constants**
  - Agent: `backend-specialist` | Skill: `clean-code`
  - INPUT: ERD entities, business rules
  - OUTPUT: `packages/shared/` với types, Zod schemas, enums cho tất cả entities
  - VERIFY: `pnpm --filter shared build` pass, import từ backend/frontend OK

- [ ] **T1.3: Prisma Schema + Migration**
  - Agent: `database-architect` | Skill: `database-design`
  - INPUT: ERD Summary ở trên, 15 business rules
  - OUTPUT: `schema.prisma` đầy đủ models, relations, indexes, enums. Migration v1 chạy OK.
  - VERIFY: `pnpm prisma migrate dev` thành công, `pnpm prisma studio` hiển thị đúng tables

- [ ] **T1.4: Seed data — Dữ liệu mẫu demo**
  - Agent: `database-architect` | Skill: `database-design`
  - INPUT: SC-06 (≥ 5 đối tác, ≥ 20 voucher, ≥ 50 đơn hàng, ≥ 3 danh mục)
  - OUTPUT: `prisma/seed.ts` tạo dữ liệu thực tế (tên VN, giá VNĐ, ảnh placeholder)
  - VERIFY: `pnpm prisma db seed` chạy OK, kiểm tra Prisma Studio thấy đủ data

---

### Phase 2: Backend Core (P0) — `backend-specialist` + `security-auditor`

- [ ] **T2.1: Express Server Setup + Middleware Stack**
  - Agent: `backend-specialist` | Skill: `nodejs-best-practices`
  - INPUT: Package skeleton
  - OUTPUT: `app.ts`, `server.ts`, CORS, helmet, morgan, error-handler, validate middleware
  - VERIFY: Server start thành công tại `localhost:5000`, health check endpoint trả 200

- [ ] **T2.2: Auth Module (JWT + RBAC)**
  - Agent: `security-auditor` | Skill: `vulnerability-scanner`
  - INPUT: User model, 4 roles, BR-CUS-01/02
  - OUTPUT: `auth.controller.ts`, `auth.service.ts` (register, login, refresh, forgot/reset password mô phỏng), `auth.middleware.ts` (JWT verify), `rbac.middleware.ts` (role check)
  - VERIFY: Đăng ký → đăng nhập → nhận JWT → gọi protected route → 200. Gọi admin route với token customer → 403

- [ ] **T2.3: User Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`
  - INPUT: BR-CUS-02, BR-ADM-01
  - OUTPUT: CRUD user, profile update, admin user management (lock/unlock, role assign)
  - VERIFY: Customer cập nhật profile OK, Admin khóa user → user đăng nhập → 403

- [ ] **T2.4: Partner Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`
  - INPUT: BR-PAR-01, BR-ADM-02
  - OUTPUT: Partner registration, profile management, branch CRUD, admin approval flow
  - VERIFY: Đăng ký đối tác (PENDING) → Admin duyệt (APPROVED) → Partner login vào portal

- [ ] **T2.5: Category Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`
  - INPUT: BR-02
  - OUTPUT: Category CRUD (admin), list categories (public)
  - VERIFY: Admin tạo/sửa/xóa danh mục OK, public list trả đúng categories

- [ ] **T2.6: Voucher Module (core logic)**
  - Agent: `backend-specialist` | Skill: `api-patterns`, `clean-code`
  - INPUT: BR-02, BR-PAR-02/03/04, BR-ADM-03, RB-01→04, RB-11, RB-15
  - OUTPUT: Voucher CRUD (partner), approval flow (admin), public listing với search/filter, status state machine, optimistic locking
  - VERIFY: Partner tạo voucher (DRAFT) → gửi duyệt (PENDING) → Admin duyệt (APPROVED→ON_SALE). Thử cập nhật với version sai → 409 Conflict

- [ ] **T2.7: Cart Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`
  - INPUT: BR-CUS-05
  - OUTPUT: Add/update/remove cart items, validate voucher availability & stock
  - VERIFY: Thêm voucher vào giỏ OK, thêm voucher hết hàng → 400 error

- [ ] **T2.8: Order + Checkout Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`, `clean-code`
  - INPUT: BR-CUS-06/07, BR-ADM-04, RB-05, RB-13, RB-14, RB-15
  - OUTPUT: Create order from cart, mock payment, stock deduction (Prisma transaction + optimistic lock), order management, cancel/refund flow
  - VERIFY: Checkout → stock giảm → thanh toán mô phỏng → order CONFIRMED. Hủy đơn → stock hoàn lại

- [ ] **T2.9: VoucherCode Module (phát hành mã)**
  - Agent: `backend-specialist` | Skill: `clean-code`
  - INPUT: BR-04, RB-05/06/07/08, BR-PAR-05/06
  - OUTPUT: Auto-generate unique codes on payment success, QR data, partner verify endpoint, mark-as-used endpoint, usage log
  - VERIFY: Thanh toán → code phát hành (unique, 12 chars). Partner nhập code → valid → xác nhận → USED. Nhập lại → 400 "already used"

- [ ] **T2.10: Review Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`
  - INPUT: BR-CUS-08, RB-10
  - OUTPUT: Create review (chỉ khi đã mua/dùng), list reviews, rating aggregation
  - VERIFY: Review khi chưa mua → 403. Review sau mua → 201. Voucher detail hiển thị avg rating

- [ ] **T2.11: Dashboard/Report Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`
  - INPUT: BR-07, BR-PAR-07, BR-ADM-06
  - OUTPUT: Admin dashboard stats, partner reports, revenue/order aggregation queries
  - VERIFY: Admin dashboard trả tổng user, tổng voucher, tổng doanh thu. Partner report trả stats theo voucher

- [ ] **T2.12: Content Management Module**
  - Agent: `backend-specialist` | Skill: `api-patterns`
  - INPUT: BR-ADM-05
  - OUTPUT: Banner/article/policy CRUD, active/inactive toggle
  - VERIFY: Admin tạo banner → public homepage hiển thị

- [ ] **T2.13: Audit Log Middleware**
  - Agent: `security-auditor` | Skill: `vulnerability-scanner`
  - INPUT: BR-ADM-07, RB-12, NFR-06
  - OUTPUT: Auto-log middleware cho admin actions, query audit logs
  - VERIFY: Admin duyệt voucher → audit log ghi nhận action, user, timestamp, old/new values

---

### Phase 3: Frontend — Customer UI (P2) — `frontend-specialist`

- [ ] **T3.1: Vite + React + Tailwind + shadcn/ui Setup**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: Tech stack, file structure
  - OUTPUT: Working Vite project, Tailwind config, shadcn/ui initialized, API client (axios), auth store, router setup
  - VERIFY: `pnpm dev` chạy OK, trang trắng render không lỗi

- [ ] **T3.2: Auth Pages (Login, Register, Forgot Password)**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: Auth API endpoints
  - OUTPUT: Login, Register (customer + partner riêng), Forgot Password pages + form validation (Zod) + JWT storage + redirect logic
  - VERIFY: Register → Login → redirect to homepage với user info hiển thị

- [ ] **T3.3: Customer Layout + Navigation**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: Customer pages list
  - OUTPUT: Header (logo, search, cart icon, user menu), Footer, responsive layout, ProtectedRoute
  - VERIFY: Header responsive trên mobile, cart badge hiển thị số item, user menu dropdown hoạt động

- [ ] **T3.4: Homepage (Banners + Featured Vouchers + Categories)**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: Content API, Voucher API, Category API
  - OUTPUT: Hero banner carousel, category grid, featured vouchers grid, search bar
  - VERIFY: Banner auto-slide, categories click navigate đúng, vouchers hiển thị giá giảm

- [ ] **T3.5: Voucher List + Search/Filter Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-CUS-03, Voucher API
  - OUTPUT: Voucher grid/list view, search, filter sidebar (category, price range, discount, area, partner), pagination, sort
  - VERIFY: Search "spa" → kết quả đúng. Filter category → danh sách lọc đúng. Pagination hoạt động

- [ ] **T3.6: Voucher Detail Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-CUS-04, Voucher + Review API
  - OUTPUT: Ảnh, giá gốc/giá bán, mô tả, điều kiện, branches, countdown hết hạn, reviews, add-to-cart button
  - VERIFY: Hiển thị đầy đủ info, giá gốc gạch ngang, add to cart → toast notification

- [ ] **T3.7: Cart + Checkout Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-CUS-05/06, Cart API, Order API
  - OUTPUT: Cart list (qty update, remove), order summary, recipient info form (gift support), mock payment selection, place order flow
  - VERIFY: Cập nhật số lượng → tổng tiền thay đổi. Checkout → thanh toán mô phỏng → redirect order success

- [ ] **T3.8: My Vouchers + Order History**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-CUS-07, Order API, VoucherCode API
  - OUTPUT: Order history list + detail, my vouchers with QR code display, status badges, usage history
  - VERIFY: Đơn đã thanh toán → hiển thị voucher codes + QR. Status badge đúng màu

- [ ] **T3.9: Profile Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-CUS-02, User API
  - OUTPUT: Profile view/edit, change password, avatar upload mock
  - VERIFY: Cập nhật tên → save → reload → tên mới hiển thị

---

### Phase 4: Frontend — Partner Portal (P2) — `frontend-specialist`

- [ ] **T4.1: Partner Layout + Sidebar Navigation**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: Partner pages list
  - OUTPUT: Dashboard sidebar layout, navigation menu, partner-specific header
  - VERIFY: Sidebar collapse/expand, active page highlight, responsive

- [ ] **T4.2: Partner Dashboard**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-PAR-07, Dashboard API
  - OUTPUT: Stats cards (total vouchers, sold, used, revenue), charts (revenue trend, top vouchers), recent orders table
  - VERIFY: Dashboard load data từ API, charts render đúng

- [ ] **T4.3: Voucher Management (CRUD + Submit for Approval)**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-PAR-02/03/04, Voucher API
  - OUTPUT: Voucher list table (DataTable), create/edit form (multi-step), submit for approval, status filter, branch selection
  - VERIFY: Tạo voucher → DRAFT. Gửi duyệt → PENDING. Bảng hiển thị status badge đúng

- [ ] **T4.4: Verify Voucher Page (QR/Code)**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-PAR-05/06, VoucherCode API
  - OUTPUT: Code input field, QR scanner mock (html5-qrcode), voucher info display after lookup, confirm-use button
  - VERIFY: Nhập code → hiển thị thông tin voucher + owner. Confirm → status chuyển USED

- [ ] **T4.5: Partner Reports**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-PAR-07, Report API
  - OUTPUT: Revenue report, voucher performance table, usage rate charts, date range filter, export mock
  - VERIFY: Filter theo tháng → dữ liệu thay đổi. Charts hiển thị đúng

- [ ] **T4.6: Branch Management**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-PAR-01, Partner API
  - OUTPUT: Branch list, add/edit/deactivate branch
  - VERIFY: Thêm chi nhánh → hiển thị trong list + available khi tạo voucher

---

### Phase 5: Frontend — Admin Dashboard (P2) — `frontend-specialist`

- [ ] **T5.1: Admin Layout + Sidebar**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: Admin pages list
  - OUTPUT: Admin dashboard layout, sidebar menu with sections, breadcrumbs
  - VERIFY: Sidebar navigation correct, breadcrumbs update

- [ ] **T5.2: Admin Dashboard (Overview Stats)**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-ADM-06, Dashboard API
  - OUTPUT: KPI cards (users, partners, vouchers, orders, revenue), trend charts, recent activity feed
  - VERIFY: Dashboard hiển thị đúng tổng số, charts render, recent activity có data

- [ ] **T5.3: User Management Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-ADM-01, User API
  - OUTPUT: User table (search, filter by role/status), view detail, lock/unlock, role change
  - VERIFY: Search user → đúng kết quả. Lock user → status đổi → user không login được

- [ ] **T5.4: Partner Approval Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-ADM-02, Partner API
  - OUTPUT: Pending partners list, detail view (business info, docs), approve/reject buttons, reason input for reject
  - VERIFY: Approve partner → status APPROVED. Reject → REJECTED + reason saved

- [ ] **T5.5: Voucher Approval Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-ADM-03, Voucher API
  - OUTPUT: Pending vouchers list, detail preview, approve/reject, all vouchers management table
  - VERIFY: Approve voucher → ON_SALE. Reject → REJECTED + lý do

- [ ] **T5.6: Order Management Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-ADM-04, Order API
  - OUTPUT: Order table (search by code, filter by status/date), detail modal, cancel/refund actions
  - VERIFY: Search order code → đúng order. Cancel → order status CANCELLED, voucher codes CANCELLED

- [ ] **T5.7: Content Management Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-ADM-05, Content API
  - OUTPUT: Banner/article/policy management, WYSIWYG editor or rich text, image upload mock
  - VERIFY: Tạo banner → active → homepage hiển thị

- [ ] **T5.8: Audit Log Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-ADM-07, AuditLog API
  - OUTPUT: Log table (searchable, filterable by action/user/date), detail expand, export mock
  - VERIFY: Admin duyệt voucher ở T5.5 → log xuất hiện tại đây với đúng thông tin

- [ ] **T5.9: Admin Reports Page**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: BR-07, Dashboard API
  - OUTPUT: Detailed reports: revenue by time, voucher sales, partner performance, usage analytics. Date range + filters
  - VERIFY: Reports hiển thị charts + tables, filter thay đổi → data refresh

---

### Phase 6: Polish & Integration (P3) — `test-engineer` + `performance-optimizer`

- [ ] **T6.1: End-to-End Flow Testing**
  - Agent: `test-engineer` | Skill: `testing-patterns`
  - INPUT: All modules
  - OUTPUT: Test full flow: Register → Browse → Add to cart → Checkout → Receive code → Partner verify → Admin report reflects
  - VERIFY: Full flow hoàn tất không lỗi

- [ ] **T6.2: Responsive UI Polish**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: All pages
  - OUTPUT: Mobile-friendly on 375px+, tablet breakpoints, touch-friendly buttons
  - VERIFY: Chrome DevTools responsive mode — all pages usable on 375px width

- [ ] **T6.3: Error Handling & Loading States**
  - Agent: `frontend-specialist` | Skill: `frontend-design`
  - INPUT: All pages
  - OUTPUT: Skeleton loaders, error boundaries, toast notifications, empty states
  - VERIFY: Disconnect API → error state shown. Loading → skeleton visible

- [ ] **T6.4: Demo Data Verification**
  - Agent: `backend-specialist` | Skill: `clean-code`
  - INPUT: Seed data, SC-06
  - OUTPUT: Verify seed data realistic (Vietnamese names, VNĐ prices, real-looking vouchers), screenshots
  - VERIFY: Prisma Studio shows ≥ 5 partners, ≥ 20 vouchers, ≥ 50 orders, ≥ 3 categories

---

## Phase X: Final Verification

> 🔴 **DO NOT mark project complete until ALL checks pass.**

- [ ] `pnpm run build` — No errors in all packages
- [ ] `pnpm prisma migrate deploy` — Migrations clean
- [ ] `pnpm prisma db seed` — Seed data loads without errors
- [ ] `pnpm run dev` — Backend + Frontend start correctly
- [ ] Full E2E flow manual test (SC-01 through SC-06)
- [ ] 15 Business Rules (RB-01 → RB-15) — spot check each
- [ ] 3 roles authentication & authorization verified
- [ ] Responsive check on mobile viewport (375px)
- [ ] `python .agents/scripts/checklist.py .` — Pass
- [ ] `python .agents/skills/vulnerability-scanner/scripts/security_scan.py .` — No critical issues
- [ ] `python .agents/skills/frontend-design/scripts/ux_audit.py .` — Pass

---

## Notes

### Business Rules Mapping to Code

| Rule | Implementation Location |
|------|------------------------|
| RB-01 (Voucher chỉ bán khi đã duyệt) | `voucher.service.ts` — check status before listing as ON_SALE |
| RB-02 (Giá bán < giá gốc) | `voucher.schema.ts` — Zod `.refine()` |
| RB-03 (Thời gian rõ ràng) | `voucher.schema.ts` — required dates |
| RB-04 (Không bán khi hết) | `voucher.service.ts` — check quantity + date |
| RB-05 (Code chỉ phát sau thanh toán) | `order.service.ts` — trigger code gen on CONFIRMED |
| RB-06 (Mã duy nhất, khó đoán) | `voucher-code-generator.ts` — `crypto.randomBytes` |
| RB-07 (Không dùng lại) | `voucher-code.service.ts` — check uses_remaining |
| RB-08 (Hết hạn/hủy/khóa) | `voucher-code.service.ts` — check status + expiry |
| RB-09 (Đối tác chỉ xác thực voucher của mình) | `voucher-code.controller.ts` — partner scope check |
| RB-10 (Đánh giá sau khi mua) | `review.service.ts` — check ownership |
| RB-11 (Bán ≤ phát hành) | `order.service.ts` — check quantity before confirm |
| RB-12 (Audit log) | `audit-log.middleware.ts` — auto-log admin actions |
| RB-13 (Hủy → không phát code) | `order.service.ts` — cancel flow |
| RB-14 (Chính sách hủy/hoàn) | `order.service.ts` — refund policy check |
| RB-15 (Kiểm tra tồn kho) | `order.service.ts` — Prisma `$transaction` + optimistic lock |

### Key Design Decisions

1. **SPA (Vite) thay vì SSR (Next.js):** Dashboard-heavy app, SEO không quan trọng bằng admin UX. Nhẹ hơn cho demo.
2. **Monorepo:** Share TypeScript types giữa FE↔BE tránh type drift. npm workspaces đơn giản, không cần thêm tooling.
3. **Optimistic Locking:** Dùng `version` field trên Voucher, wrap checkout trong Prisma `$transaction`. Balance giữa tính đúng đắn và đơn giản.
4. **3 UI riêng biệt (route-based):** Cùng 1 SPA nhưng 3 layout riêng (`/`, `/partner/*`, `/admin/*`). Đỡ phải setup 3 project riêng.
5. **Mock payment:** Tạo payment flow giả lập với dropdown chọn phương thức + confirm button, không cần API gateway thật.
