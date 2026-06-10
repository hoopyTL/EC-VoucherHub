# Hướng dẫn đóng góp — EC-VoucherHub

Tài liệu này là quy ước làm việc chung cho cả team. Nó tự chứa: bạn không cần công cụ hay tài liệu nào khác để bắt đầu đóng góp.

## Tổng quan dự án

EC-VoucherHub là hệ thống thương mại điện tử bán voucher giảm giá trực tuyến, tổ chức theo **npm workspaces monorepo**:

| Workspace | Vai trò | Stack |
|-----------|---------|-------|
| `backend/` | REST API | Express + Prisma (TypeScript, compile sang CommonJS) |
| `frontend/` | SPA | React + Vite (TypeScript, ESM) |
| `shared/` | DTO + enum dùng chung | TypeScript, import qua tên package `@voucher/shared` |

`docs/` chứa tài liệu SDLC (BRD, SRS, thiết kế, kế hoạch test, demo script) — nguồn sự thật về **cái gì cần xây và thiết kế ra sao**. Khi code và tài liệu mâu thuẫn, sửa tài liệu trong cùng PR.

## Yêu cầu môi trường

- Node.js >= 18, npm >= 9
- Cài dependencies: `npm ci` (từ thư mục gốc — cài cho cả 3 workspace)
- Sao chép `.env.example` thành `.env` và điền giá trị

## Lệnh thường dùng

Chạy từ thư mục gốc:

| Việc | Lệnh |
|------|------|
| Chạy dev (backend + frontend) | `npm run dev` |
| Build toàn bộ | `npm run build` |
| Kiểm tra kiểu | `npm run typecheck` |
| Lint | `npm run lint` (sửa tự động: `npm run lint:fix`) |
| Format | `npm run format` (kiểm tra: `npm run format:check`) |
| Test | `npm test` |
| E2E | `npm run test:e2e` |

Backend chạy ở cổng **4000** (`http://localhost:4000`), health check tại `/health`. Lưu ý: cổng 5000 trên macOS bị AirPlay Receiver chiếm — đừng dùng.

## Quy trình làm việc

1. **Tạo/nhận issue** — dùng template trong `.github/ISSUE_TEMPLATE/`.
2. **Tạo nhánh**: `<loại>/#<số-issue>-<mô-tả-kebab>`
   - Ví dụ: `feat/#12-add-login`, `fix/#34-deposit-rounding`, `chore/#7-ci-setup`
3. **Code**: giữ tài liệu `docs/` liên quan đồng bộ nếu thay đổi hành vi/route/schema.
4. **Commit** theo Conventional Commits (xem dưới).
5. **Push** và mở PR theo `.github/pull_request_template.md`.
6. **CI phải xanh** (lint → build → test) → xin review → merge.

**Không push thẳng vào `main`.**

## Quy ước commit (Conventional Commits)

Định dạng: `type(scope): mô tả`

| Type | Khi nào |
|------|---------|
| `feat` | Tính năng mới (hướng người dùng) |
| `fix` | Sửa lỗi |
| `refactor` | Đổi code, không đổi hành vi, không đổi test |
| `perf` | Cải thiện hiệu năng |
| `test` | Thêm/sửa test |
| `docs` | Chỉ tài liệu |
| `chore` | Build/dependencies/cấu hình |
| `ci` | Cấu hình CI |

Quy tắc:
- Tiêu đề ≤ 72 ký tự, chữ thường, thể mệnh lệnh hiện tại
- Phần thân giải thích **vì sao**, không phải làm gì
- Một thay đổi logic cho mỗi commit (tách nếu lẫn nhiều loại)
- Tham chiếu mã task khi áp dụng: `feat(auth): add login [TASK-005]`

## Quy ước code

### Nguyên tắc chung
- Hàm ≤ 30 dòng, một trách nhiệm; độ phức tạp vòng ≤ 10
- Không lồng ternary → dùng if/else
- Hằng số thay cho magic value (`const MAX_PRIORITY = 3`, không viết `if (x > 3)`)
- try/catch chỉ ở **biên** (route handler, entry async cấp cao). Không rải rác trong logic.
- Thông báo lỗi ngắn gọn, hướng người dùng — không lộ stack trace/nội bộ

### TypeScript
- **ESM trong source** (`import`/`export`), không `require`. Import quan hệ không kèm đuôi `.js`.
- Import chéo package qua tên (`@voucher/shared`), không dùng đường dẫn sâu `../../shared/src`.
- `shared` không được import từ `backend`/`frontend`. Không import vòng.
- `strict: true` — tránh `any`, dùng `unknown` rồi thu hẹp bằng type guard.
- Không có binding thừa (`noUnusedLocals`/`noUnusedParameters` đang bật) — tham số cố ý không dùng thì thêm tiền tố `_`.
- DTO/enum dùng chung lấy từ `@voucher/shared` — không khai báo lại type đã có ở đó.
- Parse rõ ràng: `Number.parseInt(x, 10)`, guard bằng `Number.isNaN`. Ưu tiên `??` và `?.` hơn `||` cho giá trị mặc định.

### Quy ước đặt tên
| Mục | Quy ước | Ví dụ |
|-----|---------|-------|
| File module | kebab-case `.ts` | `voucher-service.ts` |
| File React component | PascalCase `.tsx` | `VoucherCard.tsx` |
| Hàm / biến | camelCase | `getVoucherById` |
| Type / Interface / Class / Component | PascalCase | `VoucherDto` |
| Hằng số | SCREAMING_SNAKE | `MAX_PRIORITY` |
| Nhánh | `type/description` | `feat/user-auth` |

### Cơ sở dữ liệu (Prisma)
- **Prisma là đường truy cập DB duy nhất.** Không dùng SQL nối chuỗi. Nếu buộc dùng `$queryRaw`, dùng dạng tagged-template để tham số hóa.
- **Một** instance `PrismaClient` duy nhất, export từ một module, import khắp nơi.
- Schema ở `backend/prisma/schema.prisma`. Migration qua `prisma migrate`, đã apply thì forward-only — không sửa tay.
- Bọc nhiều thao tác ghi phải thành công cùng nhau trong `prisma.$transaction`.

## Quy ước API (khi có HTTP API)

### Đặt tên resource
- Số nhiều, chữ thường: `/vouchers` ✅, không `/voucher`, không `/getVouchers`
- Không động từ trong path — dùng HTTP method. Lồng nhau: `/users/:id/vouchers`. Nhiều từ: kebab-case.

### Mã trạng thái HTTP
| Mã | Khi nào |
|----|---------|
| 200 | Đọc thành công, có body |
| 201 | Tạo thành công, trả resource mới |
| 204 | Thành công, không body (thường là DELETE) |
| 400 | Lỗi định dạng/thiếu trường bắt buộc/parse fail |
| 401 | Thiếu/sai xác thực |
| 403 | Đã xác thực nhưng không đủ quyền |
| 404 | Resource không tồn tại |
| 409 | Xung đột (trùng, sai version) |
| 422 | Đúng định dạng nhưng vi phạm quy tắc nghiệp vụ |
| 429 | Vượt rate limit (kèm `Retry-After`) |
| 500 | Lỗi server |

### Wrapper phản hồi (bắt buộc)
Mọi endpoint trả về một hình dạng nhất quán — **không bao giờ trả object trần**:
```json
{ "success": true,  "data": <T> }
{ "success": false, "error": "<message>" }
```
Lỗi nhiều trường:
```json
{ "success": false, "error": "validation failed",
  "details": [ { "field": "title", "message": "required" } ] }
```

### Luồng xử lý handler (3 bước)
1. Parse + validate ở biên (dùng Zod) → trả lỗi sớm
2. Logic/persistence trong service (service sở hữu Prisma, ném lỗi có kiểu)
3. Chuẩn hóa + trả wrapper

Handler ≤ 30 dòng — đẩy logic vào service. Handler async phải forward lỗi qua `next(err)`. Một middleware lỗi tập trung map lỗi sang status + wrapper `{ success:false, error }`.

### Khác
- Validate **trước** khi chạm DB/logic. Lọc ở query string, không ở body.
- Phân trang: cursor (`?cursor=X&limit=N`) cho tập lớn/biến động; offset cho tập nhỏ. Mặc định limit 20–50, trần 100.
- Ngày: ISO 8601 UTC. Auth: header `Authorization: Bearer` / `X-API-Key` — không bao giờ để token trong query string.
- CORS: whitelist origin cụ thể, không dùng `*` khi có cookie/auth.

## Quy ước test

### Phải phủ (mỗi feature/resource)
- **Happy path**: create → 201; list/read → 200; update → 200; delete → 204
- **Error path**: thiếu trường bắt buộc → 400; enum/format sai → 400; id không tồn tại → 404; update bản ghi không có → 404
- **Edge case**: chuỗi toàn khoảng trắng → từ chối; số biên (0, âm, MAX); null vs undefined; side-effect (`updated_at`) đúng

### Quy tắc
- 1 test = 1 khẳng định logic; mỗi test độc lập, không phụ thuộc thứ tự
- Reset state trong `beforeEach`, dọn dẹp trong teardown — không rò rỉ giữa các test
- Test qua **biên thật** (HTTP) bằng `supertest`, dùng **DB test riêng** (không phải DB dev), không mock Prisma
- Khẳng định cả **status code AND cờ `success`** trên mọi API test
- Không hard sleep để "chờ" → flaky

### E2E (Playwright)
- Gắn nhãn mỗi test với mã flow nghiệp vụ: `describe('@FLOW-001 <tên>', ...)`
- Selector ưu tiên: `data-testid` → role + tên → text → CSS (cuối cùng)
- Dùng auto-retrying assertion, không `waitForTimeout(N)`

## Quy trình Pull Request

1. Cập nhật tài liệu `docs/` liên quan nếu hành vi/route/schema thay đổi; xác nhận `docs/02-srs/` vẫn phản ánh đúng cái đã build.
2. Thêm/cập nhật test.
3. Chạy lint, build, test ở local trước khi push.
4. Điền PR template.
5. Xin review; xử lý phản hồi. CI xanh mới merge.
