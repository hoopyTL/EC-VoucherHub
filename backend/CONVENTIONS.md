# Backend Conventions

> Áp dụng cho toàn bộ code trong `backend/src/`. Cả team follow — không ngoại lệ.

## Import Paths

| Rule                                             | Example                                                    |
| ------------------------------------------------ | ---------------------------------------------------------- |
| **Internal imports dùng alias `~/`**             | `import { env } from '~/configs/env'`                      |
| **Không dùng relative `../..`** cho cross-folder | ❌ `import { AppError } from '../../utils/app-error'`      |
| **Relative `./` chỉ cho cùng folder**            | `import { ErrorCode } from './error-codes'` (trong utils/) |
| **External deps import bình thường**             | `import express from 'express'`                            |

tsconfig path alias: `"~/*": ["src/*"]` (đã config).

## Naming

| Element               | Convention            | Example                                    |
| --------------------- | --------------------- | ------------------------------------------ |
| Files                 | `kebab-case.ts`       | `app-error.ts`, `error-handler.ts`         |
| Classes               | `PascalCase`          | `AppError`, `ApiResponse`                  |
| Functions / variables | `camelCase`           | `asyncHandler`, `requestLogger`            |
| Constants / enums     | `UPPER_SNAKE_CASE`    | `ErrorCode.NOT_FOUND`, `JWT_SECRET`        |
| Interfaces / types    | `PascalCase`          | `ErrorCodeValue`, `PaginationMeta`         |
| DB models (Prisma)    | `PascalCase` singular | `VoucherProduct`, `IssuedVoucherCode`      |
| DB tables (SQL)       | `snake_case` plural   | `voucher_products`, `issued_voucher_codes` |

## Response Shape

Mọi endpoint trả về **một** trong hai dạng:

```jsonc
// Success (200, 201)
{
  "success": true,
  "data": { /* payload */ },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } // optional, chỉ cho paginated
}

// Error (4xx, 5xx)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",   // UPPER_SNAKE_CASE — from ErrorCode enum
    "message": "Email is required",
    "details": [...]              // optional — validation field errors, etc.
  }
}
```

**Không bao giờ** trả shape khác (không `{ error: "string" }`, không `{ msg: "..." }`).

Dùng `ApiResponse.success(res, data)` và `ApiResponse.created(res, data)` — không tự build JSON.

## Error Codes

Defined trong `src/utils/error-codes.ts`. Dùng `AppError` factory methods:

```ts
throw AppError.notFound('Voucher') // → 404, RESOURCE_NOT_FOUND
throw AppError.unauthorized() // → 401, UNAUTHORIZED
throw AppError.validation('...', details) // → 400, VALIDATION_ERROR
throw AppError.conflict('...') // → 409, CONFLICT
```

Thêm code mới → thêm vào `ErrorCode` + `ErrorHttpStatus` map.

## Module Layout

Feature modules nằm trong `src/modules/<domain>/`:

```
modules/
├── auth/
│   ├── auth.controller.ts   # Route handlers (thin — calls service)
│   ├── auth.service.ts       # Business logic
│   ├── auth.routes.ts        # Router definition
│   └── auth.validation.ts    # Zod schemas for request validation
├── voucher/
│   ├── voucher.controller.ts
│   ├── voucher.service.ts
│   ├── voucher.routes.ts
│   └── voucher.validation.ts
└── ...
```

**Rules:**

- Controller chỉ gọi service, không chứa logic
- Service chứa business logic, gọi Prisma
- Validation dùng Zod schema, áp qua middleware
- Mỗi module tự export router, mount tại `app.ts`

## Middleware Order

Trong `app.ts`, middleware **phải** theo thứ tự:

```
helmet → express.json → express.urlencoded → requestLogger → routes → notFoundHandler → errorHandler
```

## Async Handlers

Wrap async route handlers bằng `asyncHandler` — không cần try/catch thủ công:

```ts
import { asyncHandler } from '~/utils'

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await someService.findAll()
    ApiResponse.success(res, data)
  })
)
```
