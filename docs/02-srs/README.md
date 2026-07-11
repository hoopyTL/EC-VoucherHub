# SRS — Software Requirements Specification

> Hệ thống Thương mại điện tử bán Voucher giảm giá trực tuyến (Hệ_thống)
> Nguồn: `docs/01-brd/brd.md` (BRD v1.0). 
> Đặc tả chức năng + phi chức năng + luồng nghiệp vụ FLOW-XXX.

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này chuyển hóa các yêu cầu nghiệp vụ (BRD) thành yêu cầu phần mềm có thể kiểm thử: yêu cầu chức năng (FR-XX), luồng nghiệp vụ đầu-cuối (FLOW-XXX) và yêu cầu phi chức năng (NFR-XX). Đây là nguồn sự thật cho thiết kế (`05`–`08`), kế hoạch kiểm thử (`09`) và kịch bản demo (`10`).

### 1.2 Phạm vi

Sàn trung gian ba vai trò kết nối Khách_hàng với Đối_tác, hỗ trợ trọn vòng đời: đăng ký đối tác → duyệt → tạo voucher → duyệt → công bố bán → mua → thanh toán mô phỏng → phát hành mã → sử dụng/xác thực → báo cáo. Thanh toán, OTP, email/SMS, quét QR đều **mô phỏng** (ASM-01..04). Dữ liệu lưu trong CSDL quan hệ (CON-02).

### 1.3 Actors

| Actor | Mô tả |
| --- | --- |
| **Khách_hàng** | Đăng ký, tìm/mua/sử dụng voucher, đánh giá |
| **Đối_tác** | Doanh nghiệp tạo/bán/xác thực voucher của mình |
| **Nhân_viên_đối_tác** | Thuộc một Đối_tác, kiểm tra + xác nhận sử dụng voucher trong phạm vi chi nhánh |
| **Quản_trị_viên** | Kiểm duyệt, quản lý người dùng/đối tác/voucher/đơn hàng, vận hành hệ thống |

### 1.4 Quy ước trạng thái

- **Voucher sản phẩm**: `nhap` → `cho_duyet` → `da_duyet` → `dang_ban` → `tam_ngung` / `ngung_ban`; nhánh `tu_choi` → `nhap` (sửa lại); `da_duyet` → `tu_choi` (thu hồi duyệt).
- **Đơn hàng**: `cho_thanh_toan` → `da_thanh_toan` → `da_hoan_tien`; nhánh `da_huy`.
- **Voucher code**: `chua_su_dung` → `da_su_dung` / `het_han` / `bi_huy` / `bi_khoa`; `bi_khoa` → `chua_su_dung` (mở khóa) / `het_han` (quá hạn khi đang khóa) / `bi_huy` (hủy trực tiếp).

## 2. Yêu cầu chức năng (Functional Requirements)

Mỗi FR truy vết về yêu cầu gốc `R<n>` trong BRD/requirements. Acceptance criteria viết dạng kiểm thử được.

### 2.1 Tài khoản & Xác thực

#### FR-01 — Đăng ký Khách hàng `(R1)`
- **Inputs**: email hoặc số điện thoại, mật khẩu, thông tin hồ sơ.
- **Processing**: kiểm tra trùng định danh; kiểm tra độ dài mật khẩu ≥ 8; băm mật khẩu; tạo tài khoản vai trò Khách_hàng; gửi mã xác thực mô phỏng (in-app).
- **Validation**: định danh duy nhất; mật khẩu ≥ 8 ký tự.
- **Edge**: định danh đã tồn tại → từ chối (trùng lặp); mật khẩu < 8 → từ chối (định dạng).
- **AC**:
  - AC1: định danh + mật khẩu hợp lệ → tạo tài khoản vai trò Khách_hàng.
  - AC2: định danh đã tồn tại → từ chối, thông báo trùng lặp.
  - AC3: mật khẩu < 8 ký tự → từ chối, thông báo định dạng.
  - AC4: mật khẩu luôn lưu dưới dạng băm (không lưu plaintext).
  - AC5: hoàn tất đăng ký → gửi mã xác thực mô phỏng in-app.

#### FR-02 — Đăng nhập & Quản lý hồ sơ Khách hàng `(R2)`
- **Inputs**: thông tin đăng nhập; yêu cầu đổi/quên mật khẩu; dữ liệu hồ sơ.
- **Processing**: xác thực; tạo/kết thúc phiên theo vai trò; reset/đổi mật khẩu; cập nhật hồ sơ.
- **Edge**: sai thông tin → từ chối; tài khoản `bi_khoa` → từ chối kèm thông báo khóa.
- **AC**:
  - AC1: thông tin khớp tài khoản hoạt động → tạo phiên gắn vai trò.
  - AC2: thông tin sai → từ chối, thông báo sai thông tin.
  - AC3: tài khoản bị khóa → từ chối, thông báo bị khóa.
  - AC4: đăng xuất → kết thúc phiên hiện tại.
  - AC5: quên mật khẩu với định danh đã đăng ký → gửi mã đặt lại mô phỏng.
  - AC6: đổi mật khẩu với mật khẩu hiện tại đúng + mới hợp lệ → cập nhật băm.
  - AC7: cập nhật hồ sơ hợp lệ → lưu hồ sơ.

#### FR-03 — Kiểm soát truy cập theo vai trò (RBAC) `(R23)`
- **Processing**: mọi yêu cầu chức năng đi qua kiểm tra vai trò + phạm vi sở hữu trước khi tới logic.
- **AC**:
  - AC1: vai trò được phân quyền → cho phép.
  - AC2: ngoài quyền vai trò → từ chối, "không đủ quyền".
  - AC3: chưa đăng nhập gọi chức năng cần xác thực → từ chối, chuyển hướng đăng nhập.

### 2.2 Mua sắm (Khách hàng)

#### FR-04 — Tìm kiếm & Lọc voucher `(R3)`
- **Inputs**: từ khóa; bộ lọc (danh mục, khu vực, giá, mức giảm, đối tác, trạng thái hiệu lực).
- **Processing**: chỉ truy vấn voucher `dang_ban`; áp dụng AND trên các tiêu chí.
- **AC**:
  - AC1: từ khóa → trả voucher có tên/mô tả khớp và đang bán.
  - AC2: nhiều bộ lọc → kết quả thỏa **tất cả** tiêu chí (AND).
  - AC3: chỉ hiển thị voucher `dang_ban`.
  - AC4: không có kết quả → danh sách rỗng + thông báo.

#### FR-05 — Xem chi tiết voucher `(R4)`
- **AC**:
  - AC1: mở voucher đang bán → hiển thị tên, ảnh, giá gốc, giá bán, điều kiện, thời gian sử dụng, số lượng còn lại, chi nhánh áp dụng, chính sách hoàn hủy.
  - AC2: số lượng còn lại = 0 → hiển thị hết hàng + vô hiệu hóa "thêm vào giỏ".

#### FR-06 — Quản lý giỏ hàng `(R5)`
- **AC**:
  - AC1: thêm voucher đang bán → thêm vào giỏ kèm số lượng.
  - AC2: cập nhật số lượng (nguyên dương) → cập nhật mục.
  - AC3: xóa mục → loại khỏi giỏ.
  - AC4: hiển thị tổng tạm tính = Σ(giá bán × số lượng).
  - AC5: số lượng > tồn kho → từ chối, thông báo vượt tồn kho.

#### FR-07 — Tạo đơn hàng `(R6)`
- **AC**:
  - AC1: tạo đơn từ giỏ có ≥ 1 mục → đơn `cho_thanh_toan`, tổng = tổng tạm tính.
  - AC2: chọn quà tặng → lưu thông tin người nhận cùng đơn.
  - AC3: ghi nhận phương thức thanh toán mô phỏng.
  - AC4: giỏ rỗng → từ chối, thông báo giỏ rỗng.
  - AC5: bất kỳ mục vượt tồn kho → từ chối, thông báo vượt tồn kho.

#### FR-08 — Thanh toán mô phỏng & Phát hành voucher code `(R7)`
- **Processing**: trong **một transaction**: khóa + re-check tồn kho → trừ tồn kho → chuyển đơn `da_thanh_toan` → phát hành N mã duy nhất.
- **AC**:
  - AC1: đơn `cho_thanh_toan` thanh toán thành công → `da_thanh_toan`.
  - AC2: khi `da_thanh_toan` → phát hành 1 mã cho mỗi đơn vị voucher.
  - AC3: mỗi mã duy nhất toàn hệ thống.
  - AC4: mã sinh từ CSPRNG, độ dài ≥ 12 ký tự.
  - AC5: mã khởi tạo `chua_su_dung` + `issued_at` + `expires_at` theo thời gian sử dụng voucher.
  - AC6: khi `da_thanh_toan` → giảm tồn kho theo số lượng mua.
  - AC7: thanh toán thất bại → giữ `cho_thanh_toan`, không phát hành mã.
  - AC8: không hiển thị giá trị mã trước khi đơn `da_thanh_toan`.

#### FR-09 — Nhận voucher đã mua & Lịch sử đơn `(R8)`
- **AC**:
  - AC1: mở đơn đã thanh toán của mình → hiển thị mã, QR mô phỏng, trạng thái mã.
  - AC2: hiển thị danh sách đơn của chính khách kèm trạng thái.
  - AC3: chỉ cho xem mã thuộc đơn của chính khách (phạm vi sở hữu).

#### FR-10 — Đánh giá & Phản hồi `(R9)`
- **AC**:
  - AC1: đã mua/đã dùng voucher → cho gửi đánh giá (sao + nhận xét).
  - AC2: chưa mua/chưa dùng → từ chối, thông báo chưa đủ điều kiện.
  - AC3: điểm chấp nhận trong [1, 5].
  - AC4: phản hồi/khiếu nại hợp lệ → lưu kèm liên kết voucher/đơn.

### 2.3 Đối tác

#### FR-11 — Đăng ký & Quản lý hồ sơ Đối tác `(R10)`
- **AC**:
  - AC1: đăng ký với thông tin pháp lý + người đại diện hợp lệ → hồ sơ `cho_duyet`.
  - AC2: trong khi `cho_duyet` → không cho công bố bán voucher.
  - AC3: cập nhật thông tin hợp lệ → lưu.
  - AC4: thêm/sửa/xóa chi nhánh hợp lệ → cập nhật danh sách chi nhánh.
  - AC5: thiếu thông tin pháp lý bắt buộc → từ chối, thông báo thiếu.

#### FR-12 — Tạo & Quản lý voucher (Đối tác) `(R11)`
- **AC**:
  - AC1: hồ sơ đã duyệt → cho tạo voucher (giá gốc, giá bán, mô tả, thời gian bán/sử dụng, chi nhánh, số lượng).
  - AC2: voucher mới khởi tạo `nhap`.
  - AC3: giá bán ≥ giá gốc → từ chối, thông báo giá bán phải nhỏ hơn giá gốc.
  - AC4: thiếu thời gian bán/sử dụng → từ chối, thông báo thiếu thời gian.
  - AC5: chỉ cho cập nhật khi `nhap`. (Voucher `tu_choi` phải chuyển về `nhap` trước khi sửa.)
  - AC6: hiển thị số đã bán/đã dùng/hết hạn mỗi voucher.
  - AC7: chỉ quản lý voucher thuộc chính đối tác (phạm vi sở hữu).

#### FR-13 — Gửi duyệt voucher `(R12)`
- **AC**:
  - AC1: gửi duyệt voucher `nhap` → `cho_duyet`. (Voucher `tu_choi` phải chuyển về `nhap` trước khi gửi duyệt lại.)
  - AC2: hiển thị kết quả phê duyệt mỗi voucher đã gửi.
  - AC3: giá bán ≥ giá gốc hoặc thiếu thời gian → từ chối chuyển `cho_duyet`, báo lỗi tương ứng.

#### FR-14 — Kiểm tra voucher code `(R13)`
- **AC**:
  - AC1: nhập mã/quét QR mô phỏng → hiển thị trạng thái mã + thông tin voucher.
  - AC2: mã không tồn tại → "mã không hợp lệ".
  - AC3: mã thuộc đối tác khác → từ chối, "ngoài phạm vi".
  - AC4: hợp lệ để dùng ⇔ `chua_su_dung` và chưa quá `expires_at`.

#### FR-15 — Xác nhận sử dụng voucher `(R14)`
- **Processing**: trong transaction; kiểm tra phạm vi đối tác/chi nhánh; xử lý multi-use.
- **AC**:
  - AC1: xác nhận mã hợp lệ trong phạm vi → `da_su_dung` + ghi Nhật_ký_sử_dụng.
  - AC2: mã đã dùng (loại một-lượt) → từ chối, "mã đã sử dụng".
  - AC3: mã `het_han`/`bi_huy`/`bi_khoa` → từ chối, "không sử dụng được".
  - AC4: mã thuộc phạm vi đối tác/chi nhánh khác → từ chối, "ngoài phạm vi".
  - AC5: multi-use còn lượt > 0 → ghi log + giảm lượt 1, **không** chuyển `da_su_dung` cho tới khi lượt = 0.

#### FR-16 — Báo cáo Đối tác `(R15)`
- **AC**:
  - AC1: mở báo cáo → doanh thu, số phát hành, số đã bán, tỷ lệ sử dụng theo từng voucher của mình.
  - AC2: chỉ tổng hợp dữ liệu trong phạm vi đối tác đang xem.

### 2.4 Quản trị viên

#### FR-17 — Quản lý người dùng `(R16)`
- **AC**: AC1 tra cứu theo tiêu chí → danh sách + vai trò + trạng thái; AC2 khóa → `bi_khoa`; AC3 mở khóa → `hoat_dong`; AC4 đổi vai trò → cập nhật; AC5 chỉ Quản_trị_viên truy cập.

#### FR-18 — Quản lý Đối tác `(R17)`
- **AC**: AC1 duyệt hồ sơ `cho_duyet` → `da_duyet`; AC2 từ chối → `tu_choi` + lý do; AC3 khóa đối tác → `bi_khoa` + dừng công bố voucher; AC4 mở khóa → `hoat_dong`; AC5 cập nhật chi nhánh → lưu.

#### FR-19 — Duyệt voucher `(R18)`
- **AC**: AC1 duyệt `cho_duyet` → `da_duyet`; AC2 từ chối → `tu_choi` + lý do; AC3 công bố `da_duyet` → `dang_ban`; AC4 tạm ngưng `dang_ban` → `tam_ngung` + ẩn khỏi danh sách; AC5 chỉ chuyển `dang_ban` khi đang `da_duyet`; AC6 thu hồi duyệt `da_duyet` → `tu_choi` + lý do (admin phát hiện sai sót trước khi công bố).

#### FR-20 — Quản lý đơn hàng `(R19)`
- **AC**: AC1 tra cứu → danh sách + trạng thái đơn/thanh toán; AC2 hủy đơn `cho_thanh_toan` → `da_huy`, không phát hành mã; AC3 hoàn tiền đơn `da_thanh_toan` → `da_hoan_tien` + mã liên quan → `bi_huy`; AC4 đơn `da_huy`/`da_hoan_tien` → hoàn trả tồn kho.

#### FR-21 — Quản lý nội dung `(R20)`
- **AC**: AC1 CRUD danh mục/banner/bài viết/popup/chính sách hợp lệ → lưu; AC2 chỉ Quản_trị_viên truy cập.

#### FR-22 — Dashboard quản trị `(R21)`
- **AC**: AC1 mở dashboard → tổng người dùng, đối tác, voucher, đơn, doanh thu, voucher đã dùng; AC2 tổng hợp từ toàn bộ dữ liệu hệ thống.

#### FR-23 — Nhật ký hệ thống & Kiểm toán `(R22)`
- **AC**: AC1 thao tác quản trị quan trọng (duyệt đối tác/voucher, khóa tài khoản, hủy đơn, hoàn tiền) → ghi Nhật_ký_hệ_thống (người, hành động, thời điểm); AC2 tra cứu theo tiêu chí → danh sách; AC3 chỉ Quản_trị_viên truy cập.

## 3. Luồng nghiệp vụ (Business Flows)

> FLOW-XXX là hành trình đầu-cuối, độc lập. Đây là nơi canonical định nghĩa FLOW. Mỗi FLOW có một activity diagram trong `docs/04-activity-diagrams/`.

| FLOW | Tên | Actor | FR liên quan |
| --- | --- | --- | --- |
| **FLOW-001** | Đăng ký & đăng nhập Khách hàng | Khách_hàng | FR-01, FR-02 |
| **FLOW-002** | Tìm kiếm → xem chi tiết voucher | Khách_hàng | FR-04, FR-05 |
| **FLOW-003** | Giỏ hàng → đặt đơn → thanh toán → nhận mã | Khách_hàng | FR-06, FR-07, FR-08, FR-09 |
| **FLOW-004** | Đánh giá voucher đã mua/dùng | Khách_hàng | FR-10 |
| **FLOW-005** | Đăng ký Đối tác → Admin duyệt | Đối_tác, Quản_trị_viên | FR-11, FR-18 |
| **FLOW-006** | Tạo voucher → gửi duyệt → duyệt → công bố | Đối_tác, Quản_trị_viên | FR-12, FR-13, FR-19 |
| **FLOW-007** | Kiểm tra → xác nhận sử dụng voucher | Đối_tác, Nhân_viên_đối_tác | FR-14, FR-15 |
| **FLOW-008** | Xem báo cáo Đối tác | Đối_tác | FR-16 |
| **FLOW-009** | Quản lý & phân quyền người dùng | Quản_trị_viên | FR-17 |
| **FLOW-010** | Hủy / hoàn tiền đơn hàng | Quản_trị_viên | FR-20 |
| **FLOW-011** | Quản lý nội dung & xem dashboard | Quản_trị_viên | FR-21, FR-22 |
| **FLOW-012** | Ghi & tra cứu nhật ký hệ thống | Quản_trị_viên | FR-23 |

### Mô tả tóm tắt từng FLOW

- **FLOW-001**: nhập định danh + mật khẩu → kiểm tra trùng/độ dài → tạo tài khoản (băm) → gửi mã mô phỏng → đăng nhập → tạo phiên (chặn nếu `bi_khoa`).
- **FLOW-002**: nhập từ khóa + bộ lọc → trả voucher `dang_ban` thỏa AND → mở chi tiết → nếu hết hàng vô hiệu "thêm giỏ".
- **FLOW-003** (lõi): thêm giỏ → tính tạm tính → tạo đơn (`cho_thanh_toan`, check tồn kho) → thanh toán mô phỏng → [thành công] TX: khóa+trừ tồn kho, đơn `da_thanh_toan`, phát hành mã duy nhất, hiển thị mã / [thất bại] giữ `cho_thanh_toan`.
- **FLOW-004**: chọn voucher đã mua/dùng → kiểm tra điều kiện → gửi sao [1–5] + nhận xét → lưu.
- **FLOW-005**: đối tác đăng ký (pháp lý + đại diện) → hồ sơ `cho_duyet` → admin duyệt/từ chối → `da_duyet`/`tu_choi`+lý do.
- **FLOW-006**: tạo voucher `nhap` (validate giá/thời gian) → gửi duyệt `cho_duyet` → admin duyệt `da_duyet` / từ chối `tu_choi` → `nhap` (sửa lại) → gửi duyệt lại; admin thu hồi duyệt `da_duyet` → `tu_choi`; công bố `dang_ban`.
- **FLOW-007**: nhập mã/QR → validate (tồn tại? phạm vi? trạng thái? hạn?) → xác nhận → TX: `da_su_dung` (hoặc giảm lượt multi-use) + ghi log.
- **FLOW-008**: đối tác mở báo cáo → tổng hợp doanh thu/phát hành/đã bán/tỷ lệ dùng trong phạm vi của mình.
- **FLOW-009**: admin tra cứu người dùng → khóa/mở khóa/đổi vai trò → ghi audit.
- **FLOW-010**: admin tra cứu đơn → hủy (`cho_thanh_toan`) hoặc hoàn tiền (`da_thanh_toan`) → cập nhật mã + hoàn tồn kho → ghi audit.
- **FLOW-011**: admin CRUD nội dung; mở dashboard tổng hợp toàn hệ thống.
- **FLOW-012**: mọi thao tác quản trị quan trọng tự động ghi Nhật_ký_hệ_thống; admin tra cứu theo tiêu chí.

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)

| NFR | Nhóm | Yêu cầu | Nguồn |
| --- | --- | --- | --- |
| **NFR-01** | Hiệu năng | Tra cứu voucher/đơn trả kết quả trong ≤ 3 giây (môi trường demo) | R24.1, NFR-01 |
| **NFR-02** | Bảo mật | Mật khẩu băm; RBAC theo vai trò; không lộ voucher code khi chưa thanh toán; bảo vệ trang quản trị | R1.4, R7.8, R23, NFR-02 |
| **NFR-03** | Tính ổn định | Thao tác đa bước chạy trong transaction; lỗi → rollback, không mất/không để dữ liệu một phần | R24.3, NFR-03 |
| **NFR-04** | Toàn vẹn dữ liệu | Lưu toàn bộ dữ liệu nghiệp vụ trong CSDL quan hệ | R24.2, CON-02 |
| **NFR-05** | Khả năng sử dụng | Giao diện responsive trên desktop + mobile; luồng mua rõ ràng | R24.4, NFR-05 |
| **NFR-06** | Khả năng mở rộng | Mở rộng loại voucher, báo cáo, tích hợp thanh toán thật trong tương lai | NFR-04 |
| **NFR-07** | Kiểm toán | Thao tác quản trị/giao dịch quan trọng có nhật ký truy vết | R22, NFR-06 |
| **NFR-08** | Vai trò | Hỗ trợ tối thiểu 3 vai trò: Khách_hàng, Đối_tác, Quản_trị_viên | R24.5, CON-03 |

## 5. Ma trận truy vết FR ↔ R gốc

| FR | R | FR | R | FR | R |
| --- | --- | --- | --- | --- | --- |
| FR-01 | R1 | FR-09 | R8 | FR-17 | R16 |
| FR-02 | R2 | FR-10 | R9 | FR-18 | R17 |
| FR-03 | R23 | FR-11 | R10 | FR-19 | R18 |
| FR-04 | R3 | FR-12 | R11 | FR-20 | R19 |
| FR-05 | R4 | FR-13 | R12 | FR-21 | R20 |
| FR-06 | R5 | FR-14 | R13 | FR-22 | R21 |
| FR-07 | R6 | FR-15 | R14 | FR-23 | R22 |
| FR-08 | R7 | FR-16 | R15 | NFR-* | R24 |
