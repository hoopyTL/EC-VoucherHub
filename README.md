# EC-VoucherHub 🎫

> **Hệ thống Thương mại Điện tử Phân phối & Quản lý Voucher Giảm giá Trực tuyến**  
> Kiến trúc Monorepo Full-stack: Express API + React SPA + Shared DTOs + Crawler Pipeline + E2E Playwright.

[![Node.js Version](https://img.shields.io/badge/node-22.x-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/postgresql-16%20(Prisma%206)-indigo.svg)](https://www.prisma.io/)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-273%20passed%20(100%25)-success.svg)](./frontend)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

---

## 📌 Tổng quan Dự án

**EC-VoucherHub** là giải pháp sàn thương mại điện tử chuyên biệt cho sản phẩm số (voucher / e-coupon) phục vụ 4 nhóm đối tượng: **Khách hàng (Customer)**, **Đối tác phát hành (Partner)**, **Nhân viên quầy (Staff)** và **Quản trị viên sàn (Admin)**. 

Hệ thống giải quyết triệt để các bài toán cốt lõi trong phân phối voucher:
- **Chống bán vượt tồn kho (Zero-Oversell)** và **Phát hành mã nguyên tử (Atomic Issuance)** thông qua cơ chế Transaction ACID kết hợp khóa hàng tại CSDL PostgreSQL.
- **Mã voucher bảo mật cao (CSPRNG)** kèm mã **QR động** phục vụ xác thực tức thì tại quầy.
- **Tích hợp 4 Cổng thanh toán Sandbox thực tế** (VNPay, PayPal, OnePay, Stripe) kèm cơ chế xác thực kép (Client Direct Return Verification + Polling Exponential Fallback).
- **Phân quyền chặt chẽ (RBAC)** 2 lớp: Middleware cấp vai trò + Service layer kiểm soát phạm vi sở hữu dữ liệu (Scope-based Ownership).

---

## 🛠️ Ngăn xếp Công nghệ (Tech Stack)

| Tầng / Thành phần | Công nghệ sử dụng | Vai trò & Đặc tính kỹ thuật |
|---|---|---|
| **Monorepo Architecture** | npm workspaces | Quản lý đa gói (`shared`, `backend`, `frontend`), chia sẻ kiểu type-safe |
| **Backend API** | Node.js (v22) + Express.js 5 + TypeScript | RESTful API, validation Zod, bảo mật Helmet, CORS, Morgan |
| **Database & ORM** | PostgreSQL 16 + Prisma ORM 6.19.3 | 20 models quan hệ, Composite Performance Indexes, migrations tự động |
| **Frontend SPA** | React 18 + Vite 5 + TypeScript | Responsive SPA, TanStack React Query v5, React Router v6, Lucide Icons |
| **UI Design System** | Vanilla CSS Tokens + i18next | Design Token hiện đại, hỗ trợ đa ngôn ngữ (VI/EN), Design Preview Mode |
| **Authentication & AuthZ** | JWT + bcryptjs + RBAC | Stateless JWT, Token Revocation khi đổi mật khẩu, phân quyền 4 vai trò |
| **Cổng thanh toán** | VNPay, PayPal, OnePay, Stripe, Mock | Sandbox SDK / Hashing SHA256 / Webhooks & IPN verification |
| **QR & Scanner** | `qrcode` + `qr-scanner` | Sinh mã QR voucher và quét trực tiếp qua camera thiết bị tại quầy |
| **Data Crawler** | Python (BeautifulSoup4, Requests) | Thu thập ưu đãi ngoài sàn (`ExternalPromotion`) phục vụ so sánh giá |
| **Testing & Quality** | Vitest + Playwright + Supertest + fast-check | Unit/Integration (273 tests FE pass 100%), Property-based & E2E flows |
| **DevOps & Container** | Docker Compose + Husky + ESLint 9 + Prettier | Postgres 16 Alpine containerized, pre-commit hooks, strict typechecking |

---

## 📂 Cấu trúc Thư mục Monorepo

```plaintext
EC-VoucherHub/
├── shared/                     # @voucher/shared — Single Source of Truth
│   └── src/
│       ├── enums/              # Enum hệ thống (RoleName, OrderStatus, VoucherStatus, ...)
│       └── dto/                # Data Transfer Objects, Zod schemas dùng chung
├── backend/                    # @voucher/backend — Express API Server
│   ├── prisma/                 # schema.prisma (20 bảng + composite indexes), seed.ts
│   └── src/
│       ├── modules/            # Modules nghiệp vụ (auth, voucher, order, payment, ...)
│       ├── middlewares/        # Authenticate, authorize, error-handler, rate-limit
│       └── configs/            # Validate env qua Zod, fail-closed khi thiếu secret
├── frontend/                   # @voucher/frontend — React + Vite SPA
│   └── src/
│       ├── pages/              # public, customer, partner, admin
│       ├── components/         # UI components tái sử dụng (QR, Modal, Table, Review, ...)
│       ├── design-preview/     # Mock data độc lập review UI không cần server/database
│       └── i18n/               # Cấu hình bản địa hóa đa ngôn ngữ
├── crawl/                      # Python Crawler Pipeline thu thập ưu đãi ngoài sàn
├── docs/                       # Bộ tài liệu bàn giao chuẩn SDLC 10 tập (01-brd -> 10-demo-script)
├── e2e/                        # Playwright End-to-End test suites
├── memory/                     # Memory Bank (active state, decisions/ADR, progress log)
├── scripts/                    # Script dev runner, verify TV4, đóng gói bàn giao, xuất PPTX
├── docker-compose.yml          # PostgreSQL 16 container cho môi trường dev
└── package.json                # Root package configuration & npm workspaces scripts
```

---

## 🎯 Tính năng Cốt lõi theo 4 Vai trò (RBAC)

### 1. Khách hàng (Customer)
- **Khám phá & Tìm kiếm nâng cao**: Lọc theo danh mục (Ẩm thực, Spa, Du lịch, Giải trí,...), khoảng giá, chi nhánh gần nhất và ưu đãi ngoài sàn (`ExternalPromotion`).
- **Giỏ hàng Server-Side**: Đồng bộ phiên đăng nhập trên nhiều thiết bị; tính toán tổng tiền realtime từ `sale_price` hiện hành.
- **Đặt hàng & Thanh toán Sandbox**:
  - Hỗ trợ thanh toán qua **VNPay**, **PayPal**, **OnePay**, **Stripe** hoặc phương thức Mô phỏng (Mock).
  - Giao diện `PaymentResultPage` xác thực tức thì và polling tự động (`confirmPaidOrder`) với exponential backoff.
  - Bảo vệ tuyệt đối: Không phát hành hay để lộ mã voucher khi đơn chưa chuyển sang trạng thái `PAID`.
- **Kho Voucher Cá nhân (My Vouchers)**: Xem danh sách voucher còn hạn/đã dùng, mã bảo mật CSPRNG và mã QR để xuất trình tại quầy.
- **Đánh giá & Xếp hạng (Reviews)**: Đánh giá 1–5 sao kèm bình luận cho voucher đã mua; tính điểm trung bình và phân bố sao thời gian thực; hỗ trợ chỉnh sửa/xóa nhận xét cá nhân.

### 2. Đối tác Phát hành (Partner)
- **Hồ sơ Đối tác & Chi nhánh**: Quản lý thông tin thương hiệu và mạng lưới chi nhánh (`branches`) áp dụng voucher.
- **Quản lý Vòng đời Voucher**:
  - Máy trạng thái hữu hạn (FSM): `DRAFT` ➔ `PENDING_REVIEW` ➔ `APPROVED` ➔ `ON_SALE` ➔ `PAUSED` ➔ `DISCONTINUED`.
  - Thiết lập tồn kho, hạn dùng, khung giờ áp dụng, điều khoản và chi nhánh áp dụng.
- **Phân cấp Nhân viên Chi nhánh**: Tạo tài khoản cho nhân viên (`PartnerStaff`) và phân công quản lý theo từng chi nhánh cụ thể (`PartnerStaffBranch`).
- **Báo cáo & Thống kê**: Biểu đồ doanh thu, số lượt sử dụng voucher, tỷ lệ quy đổi và hiệu suất bán hàng.

### 3. Nhân viên Quầy (Staff)
- **Xác thực Voucher tại quầy**: Tra cứu trạng thái mã voucher (hợp lệ, đã dùng, hết hạn, sai chi nhánh).
- **Quét mã Camera QR**: Tích hợp module camera (`QrCameraScanner`) quét trực tiếp QR từ điện thoại khách hàng.
- **Xử lý Đổi voucher (Redemption)**: Khóa chi nhánh xác thực nghiêm ngặt theo phân công của nhân viên; tự động ghi nhật ký sử dụng (`usage_logs`) với 6 trạng thái xử lý chi tiết.

### 4. Quản trị viên Sàn (Admin)
- **Phê duyệt Nghiệp vụ**: Duyệt hồ sơ đối tác đăng ký mới; thẩm định nội dung và chiết khấu voucher trước khi mở bán công khai.
- **Quản lý Danh mục & Người dùng**: Quản lý cây danh mục; khóa/mở khóa tài khoản; phân quyền vai trò.
- **CMS Nội dung Hệ thống**: Quản lý Banner khuyến mãi trang chủ, Thanh thông báo toàn sàn (`AnnouncementBar`), Điều khoản chính sách (`PolicyPage`) và Hỏi đáp thường gặp (`FAQPage`).
- **Nhật ký Kiểm toán (Audit Logs Viewer)**: Tra cứu toàn văn nhật ký thao tác quan trọng kèm Modal tra cứu Metadata JSON chi tiết.
- **Admin Dashboard**: Thống kê KPIs toàn diện về doanh thu sàn, số lượng đơn hàng, giao dịch thanh toán và tăng trưởng người dùng.

---

## 🗄️ Thiết kế Cơ sở Dữ liệu & Tối ưu Hiệu năng

Cơ sở dữ liệu gồm **20 bảng quan hệ** quản lý bởi Prisma ORM:
- **Người dùng & Phân quyền**: `roles`, `users`, `partners`, `branches`, `partner_staff`, `partner_staff_branches`.
- **Sản phẩm & Khuyến mãi**: `categories`, `voucher_products`, `voucher_product_branches`, `external_promotions`.
- **Giao dịch & Đơn hàng**: `carts`, `cart_items`, `orders`, `order_items`, `payment_transactions`.
- **Voucher & Sử dụng**: `issued_voucher_codes`, `usage_logs`.
- **Tương tác & Hệ thống**: `reviews`, `content_items`, `audit_logs`.

> **Chỉ mục Hiệu năng cao (Composite Performance Indexes)** đã được kích hoạt:
> - `orders(customer_id, created_at)`: Tăng tốc độ tải lịch sử đơn hàng của khách.
> - `orders(status, created_at)` & `orders(status, paid_at)`: Tối ưu bộ lọc đơn hàng và thống kê doanh thu.
> - `voucher_products(partner_id, status)`: Tối ưu tra cứu danh mục voucher đối tác.
> - `payment_transactions(order_id, status, paid_at)`: Đối soát giao dịch thanh toán.
> - `issued_voucher_codes(voucher_product_id, status)`: Tăng tốc đếm tồn kho và mã đã phát hành.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy (Quick Start)

### 1. Yêu cầu Hệ thống (Prerequisites)
- **Node.js**: >= `22.0.0`
- **npm**: >= `9.0.0`
- **PostgreSQL**: 16.x (khuyến nghị chạy qua Docker Compose đi kèm)

### 2. Cài đặt Dependencies

```bash
# Clone repository
git clone https://github.com/hoopyTL/EC-VoucherHub.git
cd EC-VoucherHub

# Cài đặt toàn bộ dependencies cho tất cả workspaces
npm install
```

### 3. Cấu hình Biến Môi trường (.env)

Tạo file môi trường cho từng workspace từ template:

```bash
# Backend .env
cp backend/.env.example backend/.env

# Frontend .env
cp frontend/.env.example frontend/.env
```

*Chỉnh sửa file `backend/.env` nếu bạn muốn đổi port hoặc sử dụng thông tin kết nối database riêng.*

### 4. Khởi động Cơ sở Dữ liệu & Nạp Dữ liệu Mẫu

**Cách 1: Sử dụng Docker Compose (Khuyên dùng)**
```bash
# Khởi động PostgreSQL 16 Alpine ở background
docker compose up -d

# Áp dụng migration CSDL
npm run db:migrate

# Nạp dữ liệu mẫu đầy đủ các vai trò & trạng thái
npm run db:seed
```

**Cách 2: Sử dụng PostgreSQL có sẵn trên máy**
- Đảm bảo service PostgreSQL đang chạy tại cổng `5432` với database `voucherhub`.
- Chạy `npm run db:migrate` và `npm run db:seed`.

### 5. Khởi chạy Môi trường Phát triển (Development)

Chạy đồng thời cả Backend API và Frontend SPA chỉ với một lệnh:

```bash
npm run dev
```

| Thành phần | Địa chỉ truy cập | Ghi chú |
|---|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Giao diện khách hàng, đối tác, nhân viên, admin |
| **Backend REST API** | [http://localhost:4000/api](http://localhost:4000/api) | API endpoints phục vụ hệ thống |
| **API Health Check** | [http://localhost:4000/health](http://localhost:4000/health) | Kiểm tra trạng thái máy chủ (`{"status":"ok"}`) |

---

## 🎨 Chế độ Xem trước Giao diện (Design Preview Mode)

Nếu muốn review nhanh toàn bộ UI/UX, layouts, screens của cả 4 vai trò với dữ liệu mẫu độc lập mà **không cần kết nối Backend hay Database**:

```bash
npm run dev:design --workspace=frontend
```

*Trong chế độ này, Frontend tự động mock các phiên đăng nhập và định tuyến theo URL (`/partner/*`, `/admin/*`, `/customer/*`). Xem chi tiết tại [`docs/08-frontend-design/figma-workflow.md`](docs/08-frontend-design/figma-workflow.md).*

---

## 🔑 Tài khoản Dữ liệu Mẫu (Demo Accounts)

Tất cả tài khoản demo sau khi chạy `npm run db:seed` đều sử dụng chung mật khẩu: **`12345678`**

| Vai trò | Email đăng nhập | Mật khẩu | Dữ liệu mẫu sẵn có |
|---|---|---|---|
| **Quản trị viên (Admin)** | `admin@voucherhub.com` | `12345678` | Quyền duyệt đối tác, duyệt voucher, xem audit logs, CMS banner/policy |
| **Khách hàng (Customer)** | `customer@voucherhub.com` | `12345678` | Có lịch sử đơn hàng, voucher đã mua, đánh giá review |
| **Khách hàng 2 (Customer)** | `linh.customer@voucherhub.com` | `12345678` | Tài khoản khách hàng phụ để test tương tác đánh giá |
| **Đối tác (Partner - Đã duyệt)** | `owner@highlands.example` | `12345678` | Sở hữu chuỗi chi nhánh, voucher đang mở bán (`ON_SALE`), báo cáo |
| **Đối tác 2 (Partner - Đã duyệt)** | `owner@lotus-spa.example` | `12345678` | Sở hữu danh mục voucher dịch vụ làm đẹp / massage |
| **Đối tác (Chờ duyệt)** | `pending.partner@voucherhub.com` | `12345678` | Tài khoản đối tác mới đăng ký, chờ admin phê duyệt |
| **Nhân viên quầy (Staff)** | `staff@highlands.example` | `12345678` | Thuộc Highlands Coffee, phân công chi nhánh, giao diện quét QR đổi voucher |

---

## 📜 Danh sách Lệnh hữu ích (Scripts Reference)

| Lệnh | Ý nghĩa & Mục đích |
|---|---|
| `npm run dev` | Khởi động backend + frontend đồng thời |
| `npm run build` | Build production cho toàn bộ workspaces (`shared` ➔ `backend` ➔ `frontend`) |
| `npm run typecheck` | Kiểm tra lỗi kiểu dữ liệu TypeScript trên toàn bộ repo |
| `npm test` | Chạy toàn bộ Unit & Integration tests (Vitest) |
| `npm run test:e2e` | Chạy bộ kiểm thử tự động giao diện End-to-End (Playwright) |
| `npm run lint` | Quét quy chuẩn mã nguồn bằng ESLint 9 |
| `npm run format` | Tự động định dạng mã nguồn bằng Prettier |
| `npm run tv4:verify` | Chạy script kiểm thử nghiệm thu kỹ thuật TV4 (CMS + Audit Logs) |
| `npm run db:migrate` | Áp dụng các file Prisma migrations vào cơ sở dữ liệu |
| `npm run db:seed` | Nạp dữ liệu mẫu ban đầu vào database |
| `npm run db:seed:full` | Nạp dữ liệu mẫu mở rộng (nhiều danh mục, đối tác và đơn hàng phong phú) |
| `npm run package` | Đóng gói toàn bộ source code và tài liệu phục vụ bàn giao |

---

## 🤝 Quy chuẩn Đóng góp (Contributing)

Mọi đóng góp cho dự án cần tuân thủ quy chuẩn về Branching, Conventional Commits, Code Style và quy trình Review tại [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 Bản quyền (License)

Dự án được phân phối dưới giấy phép **MIT License**. Xem file `LICENSE` để biết thêm chi tiết.
