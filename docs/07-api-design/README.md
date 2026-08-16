# API Design — REST Contract

> Hệ thống Thương mại điện tử bán Voucher (Hệ_thống)
> Nguồn: `docs/02-srs/` (FR-01..23).
> Mọi endpoint trả về response wrapper nhất quán. Xác thực bằng JWT Bearer.

## 1. Quy ước chung

### 1.1 Base path & versioning

- Base path: **`/api`** (ví dụ `http://localhost:4000/api`).
- Tài nguyên đặt tên **số nhiều, lowercase, kebab-case**: `/vouchers`, `/orders`, `/voucher-codes`.
- Không dùng động từ trong path — dùng HTTP method. Hành động nghiệp vụ không map gọn vào CRUD → sub-resource động từ hóa danh từ (vd `/orders/:id/payment`, `/vouchers/:id/submission`).

### 1.2 Response wrapper (bắt buộc)

Mọi response bọc trong một shape thống nhất (api-conventions §Response wrapper):

```jsonc
// thành công
{ "success": true, "data": <T> }
// lỗi đơn
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "<message>" } }
// lỗi nhiều trường
{ "success": false, "error": { "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [ { "field": "salePrice", "message": "phải nhỏ hơn giá gốc" } ] } }
```

Client luôn kiểm tra `success` trước khi đọc `data`. Không bao giờ trả object trần.

### 1.3 Xác thực & phân quyền

- Header: `Authorization: Bearer <JWT>`. Không bao giờ truyền token qua query string.
- JWT payload: `{ sub: userId, role, partnerId? }`. Middleware kiểm tra vai trò; phạm vi sở hữu được kiểm tra tại service (FR-03).
- Role sử dụng thống nhất trong API và database: `ADMIN`, `PARTNER`, `CUSTOMER`.
- Endpoint công khai (không cần token): `POST /auth/register`, `POST /auth/login`, `POST /auth/password-reset`, `POST /partners`, `GET /vouchers`, `GET /vouchers/:id`.

### 1.4 Phân trang, lọc

- Danh sách lớn dùng **cursor**: `?cursor=<id>&limit=<n>` (mặc định 20, cap 100), trả kèm `nextCursor`.
- Lọc đặt ở query string, AND mặc định: `GET /vouchers?category=food&region=hcm&minPrice=0&maxPrice=500000`.
- Endpoint auth giới hạn tần suất trả `429`, `Retry-After` và các header `X-RateLimit-*`.

### 1.5 Phân trang — shape dữ liệu danh sách

```jsonc
{ "success": true,
  "data": { "items": [ ... ], "nextCursor": "clx123" | null } }
```

## 2. Bảng endpoint

### 2.1 Auth & Users

| Method | Path | Mô tả | Auth | FR |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Đăng ký Khách hàng | công khai | FR-01 |
| POST | `/auth/login` | Đăng nhập → JWT | công khai | FR-02 |
| POST | `/auth/logout` | Đăng xuất stateless (client xoá token) | mọi vai trò | FR-02 |
| POST | `/auth/password-reset` | Yêu cầu mã đặt lại (mô phỏng) | công khai | FR-02 |
| PATCH | `/auth/password` | Đổi mật khẩu | mọi vai trò | FR-02 |
| GET | `/me` | Hồ sơ phiên hiện tại | mọi vai trò | FR-02 |
| PATCH | `/me` | Cập nhật hồ sơ | mọi vai trò | FR-02 |
| GET | `/admin/users` | Tra cứu người dùng | Admin | FR-17 |
| PATCH | `/admin/users/:id/lock` | Khoá tài khoản | Admin | FR-17 |
| PATCH | `/admin/users/:id/unlock` | Mở khoá | Admin | FR-17 |
| PATCH | `/admin/users/:id/role` | Đổi vai trò | Admin | FR-17 |

### 2.2 Vouchers (catalog + đối tác + duyệt)

| Method | Path | Mô tả | Auth | FR |
| --- | --- | --- | --- | --- |
| GET | `/vouchers` | Tìm/lọc voucher đang bán | công khai | FR-04 |
| GET | `/vouchers/:id` | Chi tiết voucher | công khai | FR-05 |
| POST | `/vouchers` | Tạo voucher (`nhap`) | Đối tác | FR-12 |
| PATCH | `/vouchers/:id` | Sửa voucher (`nhap`) | Đối tác | FR-12 |
| POST | `/vouchers/images` | Upload ảnh multipart field `image` | Đối tác | FR-12 |
| GET | `/partner/vouchers` | Voucher của đối tác + thống kê | Đối tác | FR-12 |
| GET | `/partner/vouchers/:id` | Chi tiết voucher thuộc đối tác | Đối tác | FR-12 |
| POST | `/vouchers/:id/submission` | Gửi duyệt → `cho_duyet` | Đối tác | FR-13 |
| POST | `/vouchers/:id/draft` | Đưa voucher bị từ chối về nháp | Đối tác | FR-13 |
| PATCH | `/vouchers/:id/status` | Tạm dừng/mở bán lại | Đối tác | FR-13 |
| GET | `/admin/vouchers` | Danh sách, lọc theo trạng thái | Admin | FR-19 |
| PATCH | `/admin/vouchers/:id/approval` | Duyệt/từ chối | Admin | FR-19 |
| PATCH | `/admin/vouchers/:id/status` | Công bố/tạm ngưng/ngừng bán | Admin | FR-19 |
| GET | `/categories` | Danh mục dùng khi tạo voucher | công khai | FR-12 |

### 2.3 Cart & Orders

| Method | Path | Mô tả | Auth | FR |
| --- | --- | --- | --- | --- |
| GET | `/cart` | Xem giỏ + tạm tính | Khách hàng | FR-06 |
| POST | `/cart/items` | Thêm mục | Khách hàng | FR-06 |
| PATCH | `/cart/items/:itemId` | Cập nhật số lượng | Khách hàng | FR-06 |
| DELETE | `/cart/items/:itemId` | Xoá mục | Khách hàng | FR-06 |
| POST | `/orders` | Tạo đơn từ giỏ | Khách hàng | FR-07 |
| GET | `/orders` | Lịch sử đơn của mình | Khách hàng | FR-09 |
| GET | `/orders/:id` | Chi tiết đơn + mã (nếu đã TT) | Khách hàng | FR-09 |
| POST | `/orders/:id/payment` | Thanh toán mô phỏng → phát hành mã | Khách hàng | FR-08 |
| GET | `/admin/orders` | Tra cứu đơn | Admin | FR-20 |
| PATCH | `/admin/orders/:id/cancel` | Huỷ đơn `cho_thanh_toan` | Admin | FR-20 |
| PATCH | `/admin/orders/:id/refund` | Hoàn tiền đơn `da_thanh_toan` | Admin | FR-20 |

### 2.4 Redemption (kiểm tra & sử dụng)

| Method | Path | Mô tả | Auth | FR |
| --- | --- | --- | --- | --- |
| GET | `/voucher-codes/:code` | Kiểm tra mã (validate) | Đối tác/NV | FR-14 |
| POST | `/voucher-codes/:code/redemption` | Xác nhận sử dụng | Đối tác/NV | FR-15 |

### 2.5 Reviews, Reports, Content, Dashboard, Audit

| Method | Path | Mô tả | Auth | FR |
| --- | --- | --- | --- | --- |
| POST | `/vouchers/:id/reviews` | Gửi đánh giá/phản hồi | Khách hàng | FR-10 |
| GET | `/partner/reports` | Báo cáo đối tác | Đối tác | FR-16 |
| GET | `/partner` | Hồ sơ đối tác | Đối tác | FR-11 |
| POST | `/partners` | Đăng ký tài khoản + hồ sơ + chi nhánh ban đầu | công khai | FR-11 |
| PATCH | `/partner` | Cập nhật hồ sơ đối tác | Đối tác | FR-11 |
| GET | `/partner/branches` | Danh sách chi nhánh thuộc đối tác | Đối tác | FR-11 |
| POST | `/partner/branches` | Thêm chi nhánh | Đối tác | FR-11 |
| PATCH | `/partner/branches/:id` | Sửa chi nhánh | Đối tác | FR-11 |
| DELETE | `/partner/branches/:id` | Xoá chi nhánh chưa được tham chiếu | Đối tác | FR-11 |
| GET | `/admin/partners` | Danh sách hồ sơ đối tác | Admin | FR-18 |
| GET | `/admin/partners/pending` | Danh sách hồ sơ chờ duyệt | Admin | FR-18 |
| PATCH | `/admin/partners/:id/approval` | Duyệt/từ chối đối tác | Admin | FR-18 |
| PATCH | `/admin/partners/:id/lock` | Khoá/mở khoá đối tác | Admin | FR-18 |
| PATCH | `/admin/partners/:partnerId/branches/:id` | Sửa chi nhánh trong phạm vi đối tác | Admin | FR-18 |
| GET/POST/PATCH/DELETE | `/admin/content/:type` | CRUD nội dung | Admin | FR-21 |
| GET | `/admin/dashboard` | Dashboard tổng quan | Admin | FR-22 |
| GET | `/admin/audit-logs` | Tra cứu nhật ký | Admin | FR-23 |

## 3. Chi tiết các endpoint lõi

### 3.1 `POST /auth/register` (FR-01)

**Request**
```jsonc
{ "email": "an@example.com",   // email HOẶC phone, ít nhất một
  "password": "secret123",     // ≥ 8 ký tự
  "fullName": "Nguyễn An" }
```
**201 Created**
```jsonc
{ "success": true,
  "data": { "id": "clx...", "email": "an@example.com", "phone": null,
    "role": "CUSTOMER", "verificationCode": "123456" } }
```
**Validation & lỗi**: thiếu cả email+phone → 400; mật khẩu < 8 → 400 (`details`); định danh trùng → 409 (`email đã tồn tại`). Mật khẩu lưu băm, không trả về.

### 3.2 `POST /auth/login` (FR-02)

**Request** `{ "identifier": "an@example.com", "password": "secret123" }`
**200 OK**
```jsonc
{ "success": true,
  "data": { "token": "<JWT>", "user": { "id": "clx...", "role": "CUSTOMER" } } }
```
**Lỗi**: sai thông tin → 401; tài khoản `bi_khoa` → 403 (`tài khoản bị khoá`).

### 3.3 `GET /vouchers` (FR-04)

**Query**: `q`, `category`, `region`, `minPrice`, `maxPrice`, `partnerId`, `cursor`, `limit`.
**200 OK** — chỉ voucher `dang_ban`, thoả AND:
```jsonc
{ "success": true,
  "data": { "items": [
    { "id": "clx...", "name": "Giảm 20% buffet", "salePrice": 200000,
      "originalPrice": 250000, "remainingQuantity": 12, "partnerName": "Nhà hàng X" }
  ], "nextCursor": null } }
```
Không kết quả → `items: []` + 200 (không phải 404).

### 3.4 `POST /orders` (FR-07)

**Request**
```jsonc
{ "paymentMethod": "SIMULATED",
  "giftRecipient": { "name": "Bình", "phone": "090..." } }  // optional (FR-07 AC2)
```
**201 Created** — đơn `cho_thanh_toan`, tổng = tạm tính:
```jsonc
{ "success": true,
  "data": { "id": "clx...", "status": "cho_thanh_toan", "totalAmount": 400000,
    "items": [ { "voucherId": "clx...", "quantity": 2, "unitPrice": 200000 } ] } }
```
**Lỗi**: giỏ rỗng → 422 (`giỏ hàng rỗng`); bất kỳ mục vượt tồn kho → 422 (`vượt quá tồn kho` + `details` theo voucher).

### 3.5 `POST /orders/:id/payment` (FR-08) — endpoint lõi

**Request** `{ "outcome": "SUCCESS" }` (mô phỏng; `SUCCESS`/`FAILURE`).
**200 OK** (thành công) — chạy trong **một transaction**: re-check + trừ tồn kho → đơn `da_thanh_toan` → phát hành N mã duy nhất:
```jsonc
{ "success": true,
  "data": { "orderId": "clx...", "status": "da_thanh_toan",
    "codes": [ { "code": "A1B2C3D4E5F6", "voucherId": "clx...",
                 "status": "chua_su_dung", "expiresAt": "2026-12-31T23:59:59Z" } ] } }
```
**Lỗi**: `outcome=FAILURE` → 200 `{ success:true, data:{ status:"cho_thanh_toan" } }` (giữ trạng thái, không phát hành — FR-08 AC7); đơn không thuộc khách → 403; đơn không `cho_thanh_toan` → 409. **Mã không bao giờ trả về nếu đơn chưa `da_thanh_toan`** (FR-08 AC8).

### 3.6 `GET /voucher-codes/:code` (FR-14)

**200 OK**
```jsonc
{ "success": true,
  "data": { "code": "A1B2C3D4E5F6", "status": "chua_su_dung",
    "valid": true, "voucher": { "name": "Giảm 20% buffet" }, "expiresAt": "..." } }
```
**Lỗi**: mã không tồn tại → 404 (`mã không hợp lệ`); mã thuộc đối tác khác → 403 (`ngoài phạm vi`). `valid=true` ⇔ `chua_su_dung` và chưa quá hạn.

### 3.7 `POST /voucher-codes/:code/redemption` (FR-15) — endpoint lõi

**Request** `{ "branchId": "clx..." }`
**200 OK** (một-lượt) — transaction: `da_su_dung` + ghi Nhật_ký_sử_dụng:
```jsonc
{ "success": true,
  "data": { "code": "A1B2C3D4E5F6", "status": "da_su_dung", "usedAt": "..." } }
```
**200 OK** (multi-use còn lượt): `{ status: "chua_su_dung", remainingUses: 2 }` (giảm lượt, chưa chuyển `da_su_dung` — FR-15 AC5).
**Lỗi**: đã dùng (một-lượt) → 409 (`mã đã sử dụng`); `het_han`/`bi_huy`/`bi_khoa` → 409 (`không sử dụng được`); ngoài phạm vi đối tác/chi nhánh → 403 (`ngoài phạm vi`).

### 3.8 `PATCH /admin/vouchers/:id/status` (FR-19)

**Request** `{ "action": "publish" }` (`publish`/`suspend`/`resume`/`discontinue`).
**200 OK** `{ success:true, data:{ id, status:"dang_ban" } }`.
**Lỗi**: công bố khi không phải `da_duyet` → 422 (`chuyển trạng thái voucher không hợp lệ`).

### 3.10 Contract quản lý voucher của Đối tác (FR-12, FR-13)

Request tạo/sửa dùng field canonical: `name`, `categoryId`, `saleStart`, `saleEnd`, `usageStart`, `usageEnd`, `branchIds: number[]`. Response luôn nằm trong `{ success: true, data }`; tiền là chuỗi Decimal, ngày là ISO-8601, và có `partner`, `category`, `branches`, `soldQuantity` cùng các bộ đếm mã.

Máy trạng thái: `DRAFT -> PENDING_REVIEW -> APPROVED|REJECTED`, `REJECTED -> DRAFT`, `APPROVED -> ON_SALE`, `ON_SALE <-> PAUSED`, và `ON_SALE|PAUSED -> DISCONTINUED`. Partner chỉ pause/resume voucher thuộc mình; Admin review/publish/suspend/discontinue. Transition sai trả `422`, thay đổi đồng thời trả `409`, sai ownership trả `403`.

Upload ảnh dùng `multipart/form-data`, field `image`, tối đa 2 MB và chỉ nhận JPEG/PNG/WebP. Server kiểm tra MIME cùng header/trailer cấu trúc, sinh tên UUID, giới hạn 20 upload/15 phút và quota 100 MB/Partner, rồi trả `{ "url": "/uploads/vouchers/<file>" }`.

### 3.9 `POST /partners` và duyệt đối tác (FR-11, FR-18)

**Đăng ký công khai**

```jsonc
{
  "email": "partner@example.com",
  "phone": "0901234567",
  "password": "ValidPassword123!",
  "legalName": "Công ty Voucher Demo",
  "taxCode": "TAX-001",
  "representative": "Nguyễn Đại Diện",
  "branches": [{ "name": "Chi nhánh Quận 1", "address": "1 Nguyễn Huệ", "region": "Hồ Chí Minh" }]
}
```

API tạo `User(PARTNER)`, `Partner(PENDING)` và toàn bộ `Branch` trong một transaction. Email hoặc phone phải có ít nhất một; định danh hoặc mã số thuế trùng trả `409` và không để lại bản ghi dở dang. Partner `PENDING`/`REJECTED` không được đăng nhập.

**Duyệt/từ chối**

```jsonc
{ "action": "approve" }
{ "action": "reject", "reason": "Mã số thuế không hợp lệ" }
```

Chỉ hồ sơ `PENDING` được review; thao tác lặp trả `409`. Khoá đối tác bằng `PATCH /admin/partners/:id/lock` với `{ "action": "lock" }`; token đã cấp bị chặn ngay và voucher `ON_SALE` của đối tác được chuyển `PAUSED` trong cùng transaction. `{ "action": "unlock" }` mở lại quyền truy cập nhưng không tự công bố lại voucher.

Branch dùng ID số. Partner chỉ được sửa/xoá branch thuộc chính mình; truy cập chéo trả `403`. `DELETE` trả `204`; branch đang gắn voucher, usage log hoặc chịu phạm vi voucher toàn hệ thống trả `409`.

## 4. Bản đồ mã trạng thái

| Tình huống | HTTP | Ví dụ |
| --- | --- | --- |
| Đọc thành công | 200 | `GET /vouchers` |
| Tạo thành công | 201 | `POST /orders`, `POST /auth/register` |
| Xoá thành công, không body | 204 | `DELETE /cart/items/:id` |
| Lỗi định dạng/validation đầu vào | 400 | mật khẩu < 8, thiếu trường |
| Chưa xác thực | 401 | sai thông tin đăng nhập, thiếu token |
| Không đủ quyền / ngoài phạm vi | 403 | tài khoản bị khoá, mã đối tác khác |
| Không tồn tại | 404 | mã voucher không tồn tại |
| Xung đột dữ liệu / cập nhật đồng thời | 409 | email trùng, mã đã dùng, trạng thái vừa bị request khác đổi |
| Vi phạm quy tắc nghiệp vụ | 422 | giỏ rỗng, vượt tồn kho, giá bán ≥ giá gốc, chuyển trạng thái sai |
| Lỗi hệ thống | 500 | lỗi không lường, rollback |

## 5. Cross-cutting

- **Validation tại boundary**: Zod schema trong handler → trả 400/422 sớm trước khi vào service (api-conventions §Validation flow).
- **Error middleware tập trung**: service ném typed error → middleware map sang status + wrapper `{success:false,error}`. Không `try/catch` rải rác trong logic.
- **Async**: handler async forward lỗi qua `next(err)` (hoặc `asyncHandler`).
- **Headers nhạy cảm**: `Cache-Control: no-store` cho response chứa voucher code; `X-Request-Id` để truy vết.
- **CORS**: whitelist origin của SPA (`CORS_ORIGIN`), không dùng `*` khi có auth.
