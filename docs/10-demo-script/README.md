# Demo Script — Hệ thống Thương mại điện tử bán Voucher

> Kịch bản trình diễn bàn giao. Mỗi kịch bản gắn với một FLOW-XXX trong `docs/02-srs/`.

## 1. Chuẩn bị (Setup)

```bash
# Cài dependencies
npm ci

# Tạo file môi trường (điền DATABASE_URL trỏ tới Postgres local)
cp .env.example .env

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
| 1 | Đăng ký Đối tác mới (thông tin pháp lý + đại diện) | Hồ sơ `cho_duyet`; chưa được công bố voucher |
| 2 | Đăng nhập Admin → duyệt hồ sơ | Đối tác → `da_duyet`, ghi Nhật_ký_hệ_thống |

### Scenario 5 — Tạo voucher → gửi duyệt → công bố `@FLOW-006`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Đối tác tạo voucher (giá bán < giá gốc, đủ thời gian) | Voucher `nhap` |
| 2 | Gửi duyệt | Voucher → `cho_duyet` |
| 3 | Admin duyệt → công bố | Voucher → `da_duyet` → `dang_ban`, xuất hiện trong tìm kiếm |

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

### Scenario 8 — Dashboard & nhật ký quản trị `@FLOW-011` `@FLOW-012`

| Bước | Do | Expect |
| --- | --- | --- |
| 1 | Mở dashboard Admin | Tổng người dùng/đối tác/voucher/đơn/doanh thu/voucher đã dùng |
| 2 | Mở Nhật_ký_hệ_thống | Thấy bản ghi các thao tác quản trị từ Scenario 4 & 7 (người, hành động, thời điểm) |

## 3. Demo lỗi / edge (chứng minh ràng buộc nghiệp vụ)

| Tình huống | Do | Expect |
| --- | --- | --- |
| Vượt tồn kho | Đặt số lượng > số còn lại | Từ chối "vượt quá tồn kho" (RB-11, RB-15) |
| Giá bán ≥ giá gốc | Đối tác tạo voucher giá bán ≥ giá gốc | Từ chối "giá bán phải nhỏ hơn giá gốc" (RB-02) |
| Thanh toán thất bại | Chọn outcome thất bại ở Payment Sim | Đơn giữ `cho_thanh_toan`, **không** phát hành mã |
| Mã ngoài phạm vi | Đối tác A xác thực mã của Đối tác B | Từ chối "ngoài phạm vi" |
| Truy cập ngoài quyền | Khách hàng gọi API quản trị | 403 "không đủ quyền" (RBAC) |
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

> FLOW-004 (đánh giá), FLOW-008 (báo cáo đối tác), FLOW-009 (quản lý người dùng) có thể demo bổ sung nếu còn thời gian.
