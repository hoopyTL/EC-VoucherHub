# EC-VoucherHub 🎫

> Hệ thống thương mại điện tử bán voucher giảm giá trực tuyến

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19 + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt + Role-based middleware |
| Validation | Zod |

## Project Structure

```
EC-VoucherHub/
├── shared/       # @voucher/shared — Enums, DTOs, types chung
├── backend/      # @voucher/backend — Express API
├── frontend/     # @voucher/frontend — Vite + React SPA
├── docs/         # Tài liệu dự án (BRD, SRS, ERD, ...)
└── package.json  # npm workspaces root
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

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development
npm run dev
```

### Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start backend + frontend in dev mode |
| `npm run build` | Build all workspaces (shared → server → client) |
| `npm test` | Run tests across all workspaces |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |

## Roles

| Role | Description |
|------|------------|
| **Customer** | Mua voucher, quản lý đơn hàng, đánh giá |
| **Partner** | Tạo/quản lý voucher, xác thực sử dụng, báo cáo |
| **Admin** | Duyệt đối tác/voucher, quản lý hệ thống, dashboard |

## License

MIT
