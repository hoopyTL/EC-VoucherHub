# EC-VoucherHub 🎫

> Hệ thống thương mại điện tử bán voucher giảm giá trực tuyến

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite 5 + React 18 + TypeScript (responsive SPA) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt + Role-based middleware |
| Validation | Zod |

## Project Structure

```
EC-VoucherHub/
├── shared/           # @voucher/shared — Enums, DTOs, types chung
├── backend/          # @voucher/backend — Express API
├── frontend/         # @voucher/frontend — Vite + React SPA
├── docs/             # Tài liệu dự án (BRD, SRS, ERD, ...)
├── CONTRIBUTING.md   # Quy ước đóng góp (branch, commit, PR, code style)
└── package.json      # npm workspaces root
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL

### Installation

```bash
# Clone repo
git clone https://github.com/hoopyTL/EC-VoucherHub.git
cd EC-VoucherHub

# Install all dependencies
npm install

# Copy environment variables (per workspace)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit backend/.env with your database credentials + JWT secret

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development
npm run dev
```

Để xem toàn bộ UI với dữ liệu mẫu, không cần backend hoặc database:

```bash
npm run dev:design --workspace=frontend
```

Design Preview không gửi request tới backend và tự cấp vai trò theo nhóm route
`/partner` hoặc `/admin`. Xem quy trình thiết kế tại
[`docs/08-frontend-design/figma-workflow.md`](docs/08-frontend-design/figma-workflow.md).

### Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start backend + frontend in dev mode |
| `npm run dev:design --workspace=frontend` | Chạy frontend với mock data cố định để review/capture thiết kế |
| `npm run build` | Build all workspaces (shared → server → client) |
| `npm test` | Run tests across all workspaces |
| `npm run lint` | Lint all workspaces (ESLint) |
| `npm run format` | Format code (Prettier) |
| `npm run typecheck` | Type-check all workspaces |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |

## Roles

| Role | Description |
|------|------------|
| **Customer** | Mua voucher, quản lý đơn hàng, đánh giá |
| **Partner** | Tạo/quản lý voucher, xác thực sử dụng, báo cáo |
| **Admin** | Duyệt đối tác/voucher, quản lý hệ thống, dashboard |

## Contributing

Quy ước branch, commit, PR và code style nằm trong [CONTRIBUTING.md](CONTRIBUTING.md). Vui lòng đọc trước khi mở pull request — không push trực tiếp lên `main`.

## License

MIT
