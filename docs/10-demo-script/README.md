# Demo Script — Hệ thống Thương mại điện tử bán Voucher

> Kịch bản trình diễn bàn giao. Mỗi kịch bản gắn với một FLOW-XXX trong `docs/02-srs/`.

## 1. Chuẩn bị (Setup)

```bash
# Cài dependencies
npm ci

# Tạo file môi trường cho từng workspace (điền DATABASE_URL của backend trỏ tới Postgres local)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Tạo schema + chạy migration
npm run db:migrate

# Nạp dữ liệu mẫu (TASK-019 — phủ mọi trạng thái + 3 vai trò)
npm run db:seed

# Khởi động backend + frontend
npm run dev
```

| Thành phần | URL |
| --- | --- |
| Frontend (SPA) | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

### Tài khoản demo (từ seed)

| Vai trò | Định danh | Ghi chú |
| --- | --- | --- |
| Khách_hàng | `customer@demo.test` | có lịch sử mua + voucher đã phát hành |
| Đối_tác (đã duyệt) | `partner@demo.test` | có voucher `dang_ban` |
| Đối_tác (chờ duyệt) | `partner-pending@demo.test` | minh chứng chặn công bố |
| Nhân_viên_đối_tác | `staff@demo.test` | giới hạn theo chi nhánh |
| Quản_trị_viên | `admin@demo.test` | quyền cao nhất |

> Mật khẩu mặc định trong seed — xem `backend/prisma/seed.ts`. Không dùng cho production.

## 2. Kịch bản trình diễn

> Mỗi kịch bản: **Do** (thao tác) → **Expect** (kết quả mong đợi). Thứ tự thiết kế để kể trọn vòng đời nghiệp vụ.

### Scenario 1 — Đăng ký & đăng nhập Khách hàng `@FLOW-001`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Mở trang đăng ký, nhập email mới + mật khẩu ≥ 8 ký tự | Tạo tài khoản vai trò Khách_hàng, hiện thông báo xác thực mô phỏng in-app |
| 2 | Đăng nhập bằng tài khoản vừa tạo | Vào được khu vực Khách hàng, tạo phiên |

### Scenario 2 — Tìm kiếm → xem chi tiết voucher `@FLOW-002`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Nhập từ khóa + áp bộ lọc (danh mục + khu vực) | Chỉ hiện voucher `dang_ban` thỏa **tất cả** tiêu chí |
| 2 | Mở chi tiết một voucher | Hiển thị giá gốc/giá bán, điều kiện, thời gian, số còn lại, chi nhánh, chính sách hoàn hủy |

### Scenario 3 — Mua → thanh toán → nhận mã (LÕI) `@FLOW-003`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Thêm voucher vào giỏ, chỉnh số lượng | Tổng tạm tính = Σ(giá bán × số lượng) |
| 2 | Tạo đơn từ giỏ | Đơn `cho_thanh_toan`, tổng đúng |
| 3 | Thanh toán mô phỏng **thành công** | Đơn → `da_thanh_toan`; phát hành 1 mã/đơn vị; tồn kho giảm; hiện mã + QR mô phỏng |
| 4 | Mở lại lịch sử đơn | Mã chỉ hiện sau khi đã thanh toán; thuộc đúng đơn của khách |

> **Talking point**: phát hành mã + trừ tồn kho + chuyển trạng thái chạy trong **một transaction** → không oversell, không lộ mã trước thanh toán.

### Scenario 4 — Đăng ký Đối tác → Admin duyệt `@FLOW-005`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Mở `/register/partner`, nhập tài khoản, tên pháp lý, mã số thuế, người đại diện và ít nhất một chi nhánh | Tạo nguyên tử tài khoản `PARTNER`, hồ sơ `PENDING` và chi nhánh; chuyển về login |
| 2 | Thử đăng nhập bằng tài khoản vừa tạo | Bị chặn `403` với thông báo hồ sơ đang chờ duyệt |
| 3 | Đăng nhập Admin, mở **Duyệt đối tác**, kiểm tra pháp lý/chi nhánh rồi bấm **Approve** | Hồ sơ chuyển `APPROVED` và biến mất khỏi danh sách pending |
| 4 | Đăng xuất Admin, đăng nhập lại bằng tài khoản Partner | Vào workspace `/partner` thành công |
| 5 | Mở **Chi nhánh**, thêm một branch, sửa tên rồi xoá | POST/PATCH/DELETE thành công; danh sách được refetch sau mỗi thao tác |

> **Talking point**: trạng thái Partner được đọc lại từ database ở cả login và mỗi request. Vì vậy Admin khóa/từ chối hồ sơ sẽ chặn ngay token cũ; frontend không thể vượt qua bằng JWT đã cấp trước đó.

### Scenario 5 — Tạo voucher → gửi duyệt → công bố `@FLOW-006`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Đối tác tạo voucher (giá bán < giá gốc, đủ thời gian) | Voucher `nhap` |
| 2 | Gửi duyệt | Voucher → `cho_duyet` |
| 3 | Admin từ chối + lý do | Voucher → `tu_choi`, đối tác thấy lý do |
| 4 | Đối tác sửa lại | Voucher → `nhap` (về nháp, sửa thoải mái, lưu nhiều lần) |
| 5 | Gửi duyệt lại | Voucher → `cho_duyet` |
| 6 | Admin duyệt | Voucher → `da_duyet` |
| 7 | Admin công bố | Voucher → `dang_ban`; public search/detail sẽ được nối ở TASK-008 |
| 8 | Đối tác mở danh sách và bấm **Tạm dừng** | Voucher `dang_ban` → `tam_ngung`; có thể **Mở bán lại** |

> **Talking point**: Voucher bị từ chối trở về trạng thái nháp (không gửi duyệt lại trực tiếp), giúp đối tác sửa kỹ trước khi re-submit. Admin cũng có thể thu hồi duyệt (`da_duyet` → `tu_choi`) nếu phát hiện sai sót trước khi công bố.

Chạy automation đúng scenario này trước demo:

```bash
npm run test:e2e -- --grep @FLOW-006
```

### Scenario 6 — Kiểm tra → xác nhận sử dụng voucher `@FLOW-007`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Nhân viên đối tác nhập mã/QR voucher đã mua ở Scenario 3 | Hiển thị trạng thái + thông tin voucher |
| 2 | Xác nhận sử dụng | Mã → `da_su_dung`, ghi Nhật_ký_sử_dụng |
| 3 | Xác nhận lại lần 2 (mã một-lượt) | Từ chối "mã đã sử dụng" |

### Scenario 7 — Hủy / hoàn tiền đơn (Admin) `@FLOW-010`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Admin hoàn tiền một đơn `da_thanh_toan` | Đơn → `da_hoan_tien`; mã liên quan → `bi_huy`; tồn kho hoàn trả |

### Scenario 8 — Dashboard quản trị `@FLOW-011`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Mở dashboard Admin | Tổng người dùng/đối tác/voucher/đơn/doanh thu/voucher đã dùng |

> **Talking point**: Dashboard tổng hợp toàn bộ các số liệu thống kê thực tế theo thời gian thực (doanh thu, người dùng, voucher đã bán và sử dụng). (Chức năng Nhật ký hệ thống `@FLOW-012` được hoãn lại sau MVP).

## 3. Demo lỗi / edge (chứng minh ràng buộc nghiệp vụ)

| Tình huống | Do | Expect |
| --- | --- | --- |
| Vượt tồn kho | Đặt số lượng > số còn lại | Từ chối "vượt quá tồn kho" (RB-11, RB-15) |
| Giá bán ≥ giá gốc | Đối tác tạo voucher giá bán ≥ giá gốc | Từ chối "giá bán phải nhỏ hơn giá gốc" (RB-02) |
| Thanh toán thất bại | Chọn outcome thất bại ở Payment Sim | Đơn giữ `cho_thanh_toan`, **không** phát hành mã |
| Mã ngoài phạm vi | Đối tác A xác thực mã của Đối tác B | Từ chối "ngoài phạm vi" |
| Truy cập ngoài quyền | Khách hàng gọi API quản trị | 403 "không đủ quyền" (RBAC) |
| Đối tác chưa duyệt | Partner `PENDING` thử đăng nhập | 403 "hồ sơ đối tác đang chờ duyệt" |
| Sửa chi nhánh chéo | Partner A dùng ID branch của Partner B | 403 "ngoài phạm vi đối tác" |
| Xoá branch đang dùng | Xoá branch đã gắn voucher/usage log | 409, dữ liệu được giữ nguyên |
| Đánh giá khi chưa mua | Gửi đánh giá voucher chưa mua | Từ chối "chưa đủ điều kiện đánh giá" |

## 4. Dọn dẹp (Teardown)

```bash
# Dừng dev server: Ctrl+C

# (tùy chọn) reset DB demo về trạng thái sạch
npm run db:migrate -- reset   # hoặc xóa volume Postgres rồi migrate + seed lại
```

## 5. Talking points (điểm nhấn thuyết trình)

- **Toàn vẹn dữ liệu**: 3 máy trạng thái tường minh (voucher sản phẩm / đơn / mã) + transaction ACID → mọi chuyển trạng thái không hợp lệ đều bị chặn (KPI-02).
- **Chống oversell + mã duy nhất**: kiểm tra/trừ tồn kho nguyên tử + ràng buộc `UNIQUE` ở DB + mã CSPRNG ≥ 12 ký tự (RISK-02, RISK-03).
- **Bảo mật**: mật khẩu băm, RBAC theo vai trò + phạm vi sở hữu, không lộ voucher code trước thanh toán (NFR-02).
- **Chất lượng kiểm chứng được**: 22 correctness properties phủ bằng property-based testing (fast-check, ≥100 vòng/property) — xem `docs/09-testing/`.
- **Truy vết đầu-cuối**: BRD → SRS (FR/FLOW) → thiết kế (05–08) → TASK-XXX → test → demo, mọi yêu cầu đều lần ngược được.

## 6. Ánh xạ kịch bản → FLOW

| Scenario | FLOW | FR liên quan |
| --- | --- | --- |
| 1 | FLOW-001 | FR-01, FR-02 |
| 2 | FLOW-002 | FR-04, FR-05 |
| 3 | FLOW-003 | FR-06, FR-07, FR-08, FR-09 |
| 4 | FLOW-005 | FR-11, FR-18 |
| 5 | FLOW-006 | FR-12, FR-13, FR-19 |
| 6 | FLOW-007 | FR-14, FR-15 |
| 7 | FLOW-010 | FR-20 |
| 8 | FLOW-011, FLOW-012 | FR-22, FR-23 |

## 7. TV4 verification command

After `npm run db:migrate`, `npm run db:seed`, and `npm run dev`, run:

```bash
npm run tv4:verify
```

The script checks:

- `GET /api/admin/dashboard` exposes order, content, and audit totals.
- `GET /api/admin/orders`, `/content`, and `/audit-logs` return database-backed lists.
- `POST/PATCH/DELETE /api/admin/content` can create, publish, and archive content.
- `GET /api/admin/audit-logs` contains the generated content archive audit record.

> FLOW-004 (đánh giá), FLOW-008 (báo cáo đối tác), FLOW-009 (quản lý người dùng) có thể demo bổ sung nếu còn thời gian.
