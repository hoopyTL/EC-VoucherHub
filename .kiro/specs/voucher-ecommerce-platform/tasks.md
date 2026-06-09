# Implementation Plan: Hệ thống Thương mại điện tử bán Voucher

## Overview

Kế hoạch triển khai theo hướng tăng dần (incremental) và kiểm thử dẫn dắt (test-driven) cho nền tảng bán voucher ba vai trò. Ngăn xếp công nghệ theo thiết kế: **TypeScript/Node (Express)**, **PostgreSQL** với **Prisma ORM**, **React + Vite** (FE responsive), xác thực **JWT + bcrypt/argon2**, sinh mã bằng **`crypto.randomBytes`**, kiểm thử đơn vị bằng **Vitest** và property-based testing bằng **fast-check**.

Mỗi bước xây dựng trên bước trước và kết thúc bằng việc kết nối (wiring) vào hệ thống — không để lại mã mồ côi. Logic nghiệp vụ được tách khỏi tầng I/O (dùng repository in-memory/mock) để chạy được property test ≥100 vòng với chi phí thấp.

Quy ước nhãn property test (theo Testing Strategy): **`Feature: voucher-ecommerce-platform, Property {số}: {nội dung}`**. Mỗi property test chạy **tối thiểu 100 vòng** (`fc.assert(..., { numRuns: 100 })`).

## Tasks

- [ ] 1. Khởi tạo cấu trúc dự án và công cụ kiểm thử
  - Repo đã có sẵn scaffold monorepo dùng npm workspaces tại gốc (`package.json` khai báo workspaces: `shared`, `backend`, `frontend`): `backend/` (`@voucher/backend`), `frontend/` (`@voucher/frontend`), `shared/` (`@voucher/shared`). Nhiệm vụ ở đây là hoàn thiện scaffold sẵn có, không tạo mới monorepo.
  - Điền các stub trong package dùng chung `shared/`: `shared/src/enums/index.ts` và `shared/src/dto/index.ts` (hiện đang `// TODO`) cần được điền các enum trạng thái (voucher sản phẩm, đơn hàng, voucher code, trạng thái tài khoản, phê duyệt/vận hành đối tác) và các DTO dùng chung, nhất quán với các máy trạng thái trong thiết kế.
  - [ ] 1.1 Hoàn thiện scaffold backend sẵn có (`@voucher/backend`)
    - Làm việc trên `backend/` (`@voucher/backend`) đã có `src/server.ts` placeholder; không tạo `apps/api`. npm workspaces đã được cấu hình ở gốc.
    - Cài và nối các dependency backend còn thiếu: **Express**, **@prisma/client + prisma**, **bcrypt/argon2**, **jsonwebtoken**, **zod**, **tsx**, **Vitest**, **fast-check** (scripts đã tham chiếu prisma + tsx nhưng dependency chưa được cài)
    - Thêm cấu hình **Vitest + fast-check** và tạo helper `assertProperty(numRuns=100)`
    - Bật TypeScript project references đúng cách: đặt `composite: true` trong `tsconfig.json` của package `shared/` để `references` từ backend/frontend tới `../shared` build được
    - _Requirements: 24.2, 24.5_
  - [ ] 1.2 Hoàn thiện scaffold frontend sẵn có (`@voucher/frontend`)
    - Làm việc trên `frontend/` (`@voucher/frontend`) đã có `src/main.ts` placeholder; không tạo `apps/web`
    - Cài và nối các dependency frontend còn thiếu: **vite**, **react**, **react-dom**, **tailwindcss**, **shadcn/ui** (scripts đã tham chiếu vite nhưng vite/react chưa được cài)
    - Thêm `index.html` và `vite.config.ts`; đổi/chuyển entry sang `main.tsx`
    - Thiết lập router cho 3 vùng giao diện (Khách hàng / Đối tác / Quản trị) với layout responsive cơ sở (desktop + mobile)
    - _Requirements: 24.4_

- [ ] 2. Lược đồ cơ sở dữ liệu và tầng truy cập dữ liệu
  - [ ] 2.1 Định nghĩa Prisma schema và migration khởi tạo
    - Khai báo toàn bộ thực thể theo ERD: ROLES, USERS, PARTNERS, BRANCHES, PARTNER_STAFF, CATEGORIES, VOUCHER_PRODUCTS, VOUCHER_PRODUCT_BRANCHES, ORDERS, ORDER_ITEMS, ISSUED_VOUCHER_CODES, USAGE_LOGS, REVIEWS, AUDIT_LOGS, CONTENT_ITEMS
    - Khai báo enum trạng thái (voucher sản phẩm, đơn hàng, voucher code, trạng thái tài khoản, phê duyệt/vận hành đối tác)
    - Ràng buộc `UNIQUE` cho `ISSUED_VOUCHER_CODES.code`, `USERS.email`, `USERS.phone`; FK và index lọc khu vực/danh mục
    - Chạy migration khởi tạo
    - _Requirements: 1.2, 7.3, 24.2_
  - [ ] 2.2 Tầng repository và repository in-memory cho PBT
    - Định nghĩa interface repository cho từng aggregate; hiện thực bản Prisma
    - Hiện thực bản in-memory tương đương để chạy property test không cần DB thật
    - Helper transaction (`runInTransaction`) bọc thao tác đa bước
    - _Requirements: 24.2, 24.3_
  - [ ]* 2.3 Viết unit test cho ràng buộc DB
    - Kiểm tra UNIQUE của `code`, `email`, `phone`; FK toàn vẹn
    - _Requirements: 1.2, 7.3_

- [ ] 3. Nền tảng miền nghiệp vụ và xử lý lỗi
  - [ ] 3.1 Máy trạng thái và bộ kiểm tra chuyển trạng thái
    - Định nghĩa bảng cạnh hợp lệ cho 3 máy trạng thái (voucher sản phẩm, đơn hàng, voucher code)
    - Hiện thực `canTransition(machine, from, to)` và `applyTransition(...)` từ chối cạnh không hợp lệ
    - _Requirements: 6.1, 7.1, 11.2, 12.1, 14.1, 18.1, 18.5, 19.2, 19.3_
  - [ ] 3.2 Khung xử lý lỗi và phản hồi tập trung
    - Định nghĩa lớp lỗi theo phân loại (validation/nghiệp vụ/xác thực/phân quyền/không tồn tại/xung đột/trùng lặp/hệ thống) và ánh xạ mã HTTP
    - Middleware xử lý lỗi tập trung: rollback transaction, ghi log server, trả thông báo rõ ràng, không mất dữ liệu đã lưu
    - _Requirements: 24.3_

- [ ] 4. Auth & User Service và RBAC
  - [ ] 4.1 Tiện ích băm mật khẩu
    - Hiện thực `hashPassword` / `verifyPassword` dùng bcrypt/argon2
    - _Requirements: 1.4, 2.6_
  - [ ]* 4.2 Property test băm mật khẩu
    - **Property 18: Mật khẩu luôn được lưu dưới dạng băm**
    - **Validates: Requirements 1.4, 2.6**
  - [ ] 4.3 Đăng ký, đăng nhập/đăng xuất, hồ sơ, mật khẩu
    - `register` (email|phone, mật khẩu ≥8, băm, thông báo xác thực mô phỏng), kiểm tra trùng định danh
    - `login`/`logout` (phiên JWT), từ chối khi sai thông tin hoặc tài khoản bị khóa
    - `requestPasswordReset`, `changePassword`, `updateProfile`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [ ]* 4.4 Property test duy nhất định danh tài khoản
    - **Property 19: Tính duy nhất định danh tài khoản**
    - **Validates: Requirements 1.2**
  - [ ]* 4.5 Property test khóa/mở khóa và đăng nhập tài khoản bị khóa
    - **Property 22: Round-trip khóa/mở khóa và đăng nhập tài khoản bị khóa**
    - **Validates: Requirements 2.3, 16.2, 16.3**
  - [ ] 4.6 Quản lý người dùng (Quản trị viên)
    - `adminSearchUsers`, `lockUser`, `unlockUser`, `changeRole`
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [ ] 4.7 Middleware Auth + RBAC + kiểm tra phạm vi sở hữu
    - Xác thực phiên; guard RBAC theo ma trận phân quyền; kiểm tra ownership/scope; chuyển hướng đăng nhập khi chưa xác thực
    - _Requirements: 16.5, 20.2, 22.3, 23.1, 23.2, 23.3_
  - [ ]* 4.8 Property test kiểm soát truy cập theo vai trò
    - **Property 13: Kiểm soát truy cập theo vai trò (RBAC)**
    - **Validates: Requirements 16.5, 20.2, 22.3, 23.1, 23.2**
  - [ ]* 4.9 Unit/edge test xác thực
    - Mật khẩu <8 (1.3), sai thông tin đăng nhập (2.2), yêu cầu không phiên (23.3), gửi mã mô phỏng (1.5, 2.5)
    - _Requirements: 1.3, 1.5, 2.2, 2.5, 23.3_

- [ ] 5. Checkpoint — Auth & RBAC
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Partner Service
  - [ ] 6.1 Đăng ký và quản lý hồ sơ Đối tác
    - `registerPartner` (thông tin pháp lý + người đại diện → `cho_duyet`), kiểm tra thiếu thông tin bắt buộc
    - `updatePartnerProfile`, `manageBranch` (thêm/cập nhật/xóa Chi_nhánh)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ] 6.2 Quản lý Đối tác (Quản trị viên)
    - `approvePartner`, `rejectPartner(reason)`, `lockPartner` (dừng công bố voucher), `unlockPartner`, cập nhật danh sách Chi_nhánh
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  - [ ]* 6.3 Unit/edge test Đối tác
    - Thiếu thông tin pháp lý bắt buộc (10.5), không công bố khi chờ duyệt (10.2), CRUD chi nhánh (10.4)
    - _Requirements: 10.2, 10.4, 10.5_

- [ ] 7. Voucher Product Service và máy trạng thái sản phẩm
  - [ ] 7.1 Tạo/cập nhật voucher và ràng buộc giá/thời gian
    - `createVoucher` (→ `nhap`), `updateVoucher` chỉ khi `nhap|tu_choi`; kiểm tra giá bán < giá gốc và đủ thời gian bán/sử dụng; chỉ Đối tác đã duyệt mới tạo
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7_
  - [ ] 7.2 Gửi duyệt và duyệt voucher (Quản trị viên)
    - `submitForApproval` (→ `cho_duyet`) với re-validate giá/thời gian; `approve`, `reject(reason)`, `publish` (chỉ từ `da_duyet`), `suspend` (ẩn khỏi danh sách bán)
    - _Requirements: 12.1, 12.2, 12.3, 18.1, 18.2, 18.3, 18.4, 18.5_
  - [ ] 7.3 Thống kê voucher của Đối tác
    - `getPartnerVoucherStats` (đã bán/đã dùng/hết hạn) trong phạm vi sở hữu
    - _Requirements: 11.6, 11.7_
  - [ ]* 7.4 Property test máy trạng thái voucher sản phẩm
    - **Property 14: Bất biến chuyển trạng thái voucher sản phẩm**
    - **Validates: Requirements 3.1, 3.3, 11.2, 11.5, 12.1, 18.1, 18.2, 18.3, 18.4, 18.5**
  - [ ]* 7.5 Unit/edge test voucher sản phẩm
    - Giá bán ≥ giá gốc (11.3), thiếu thời gian (11.4, 12.3), hiển thị kết quả phê duyệt (12.2)
    - _Requirements: 11.3, 11.4, 12.2, 12.3_

- [ ] 8. Tìm kiếm, lọc và chi tiết voucher
  - [ ] 8.1 Tìm kiếm, lọc và xem chi tiết
    - Tìm theo từ khóa; lọc theo danh mục/khu vực/giá/mức giảm/đối tác/hiệu lực; chỉ trả voucher `dang_ban`; danh sách rỗng kèm thông báo
    - Chi tiết voucher (giá, điều kiện, thời gian, số còn lại, chi nhánh, chính sách); trạng thái hết hàng khi còn 0 và vô hiệu thêm giỏ
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2_
  - [ ]* 8.2 Property test bộ lọc tìm kiếm
    - **Property 16: Bộ lọc tìm kiếm trả về kết quả thỏa mọi tiêu chí**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ]* 8.3 Unit/edge test chi tiết và hết hàng
    - Không có kết quả (3.4), hết hàng vô hiệu thêm giỏ (4.2)
    - _Requirements: 3.4, 4.2_

- [ ] 9. Cart & Order Service
  - [ ] 9.1 Giỏ hàng và tổng tạm tính
    - `addToCart`, `updateQty`, `removeItem`, `getSubtotal`; từ chối khi số lượng vượt tồn kho
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 9.2 Tạo đơn hàng và kiểm tra tồn kho
    - `createOrder` từ giỏ ≥1 mục (→ `cho_thanh_toan`, tổng = tạm tính, ghi phương thức Thanh_toán_mô_phỏng, lưu thông tin quà tặng); từ chối giỏ rỗng; kiểm tra tồn kho từng mục
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 9.3 Property test tổng tiền tạm tính và tổng đơn
    - **Property 7: Tổng tiền tạm tính chính xác**
    - **Validates: Requirements 5.4, 6.1**
  - [ ]* 9.4 Unit/edge test giỏ hàng và đơn hàng
    - Giỏ rỗng (6.4), vượt tồn kho khi cập nhật/đặt (5.5, 6.5)
    - _Requirements: 5.5, 6.4, 6.5_

- [ ] 10. Payment Sim và phát hành Voucher_code (giao dịch nguyên tử)
  - [ ] 10.1 Payment Sim Service
    - `simulatePayment(orderId, outcome)` trả thành công/thất bại; thất bại giữ `cho_thanh_toan`, không phát hành mã
    - _Requirements: 7.1, 7.7_
  - [ ] 10.2 Sinh Voucher_code duy nhất, khó đoán
    - `generateUniqueCode` dùng `crypto.randomBytes` (≥12 ký tự, CSPRNG); retry giới hạn khi đụng độ UNIQUE
    - _Requirements: 7.3, 7.4_
  - [ ] 10.3 Phát hành mã trong transaction cùng chuyển trạng thái đã thanh toán
    - Khi thanh toán thành công: khóa & re-check tồn kho, trừ `remaining_quantity`, chuyển đơn `da_thanh_toan`, phát hành 1 mã/đơn vị (`chua_su_dung`, `issued_at`, `expires_at` theo thời gian sử dụng); không lộ mã trước thanh toán
    - _Requirements: 7.2, 7.5, 7.6, 7.8_
  - [ ]* 10.4 Property test tính duy nhất của mã
    - **Property 1: Tính duy nhất của Voucher_code**
    - **Validates: Requirements 7.3**
  - [ ]* 10.5 Property test mã khó đoán và đúng định dạng
    - **Property 2: Voucher_code khó đoán và đúng định dạng**
    - **Validates: Requirements 7.4**
  - [ ]* 10.6 Property test phát hành sau thanh toán
    - **Property 3: Phát hành mã chỉ sau thanh toán thành công, đúng số lượng, đúng khởi tạo**
    - **Validates: Requirements 7.1, 7.2, 7.5**
  - [ ]* 10.7 Property test không phát hành khi chưa/không thanh toán
    - **Property 4: Không phát hành mã khi chưa thanh toán hoặc thanh toán thất bại**
    - **Validates: Requirements 7.7, 7.8, 19.2**
  - [ ]* 10.8 Property test chống oversell
    - **Property 5: Không bán vượt tồn kho (chống oversell)**
    - **Validates: Requirements 5.5, 6.5, 7.6**
  - [ ]* 10.9 Property test tính nguyên tử khi xử lý lỗi
    - **Property 21: Tính nguyên tử khi xử lý lỗi**
    - **Validates: Requirements 24.3**

- [ ] 11. Checkpoint — Mua → Thanh toán → Phát hành
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Nhận voucher đã mua và lịch sử đơn hàng
  - [ ] 12.1 Xem đơn đã thanh toán và mã voucher
    - `getCustomerOrderCodes` chỉ trả mã của đơn `da_thanh_toan` thuộc chính khách; hiển thị QR_mô_phỏng và trạng thái mã; danh sách đơn của khách kèm trạng thái
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 12.2 Property test phạm vi sở hữu tài nguyên
    - **Property 12: Truy cập tài nguyên bị giới hạn theo phạm vi sở hữu**
    - **Validates: Requirements 8.2, 8.3, 11.7, 15.2**
  - [ ]* 12.3 Unit test hiển thị đơn/mã của khách
    - Không lộ mã của đơn chưa thanh toán hoặc của khách khác
    - _Requirements: 8.1, 8.3_

- [ ] 13. Redemption Service (kiểm tra và xác nhận sử dụng)
  - [ ] 13.1 Kiểm tra Voucher_code
    - `validateCode` hiển thị trạng thái + thông tin; mã không tồn tại → không hợp lệ; mã của đối tác khác → ngoài phạm vi; hợp lệ khi `chua_su_dung` và chưa quá hạn
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [ ] 13.2 Xác nhận sử dụng (một-lượt và nhiều-lượt)
    - `redeemCode` trong transaction: một-lượt → `da_su_dung` + ghi Nhật_ký_sử_dụng; nhiều-lượt → giảm lượt + ghi log, chuyển `da_su_dung` khi cạn; từ chối mã đã dùng/hết hạn/bị hủy/bị khóa/ngoài phạm vi
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - [ ]* 13.3 Property test hợp lệ và không tái sử dụng
    - **Property 8: Tính hợp lệ của Voucher_code và không tái sử dụng**
    - **Validates: Requirements 13.4, 14.2, 14.3**
  - [ ]* 13.4 Property test idempotent sau lần dùng đầu (một-lượt)
    - **Property 9: Xác nhận sử dụng một-lượt là idempotent sau lần đầu**
    - **Validates: Requirements 14.1, 14.2**
  - [ ]* 13.5 Property test giảm lượt voucher nhiều-lượt
    - **Property 10: Voucher nhiều lượt giảm lượt đúng và chuyển trạng thái khi cạn**
    - **Validates: Requirements 14.5**
  - [ ]* 13.6 Property test phạm vi Đối tác/Chi nhánh
    - **Property 11: Xác thực voucher bị giới hạn theo phạm vi Đối_tác/Chi_nhánh**
    - **Validates: Requirements 13.3, 14.4**
  - [ ]* 13.7 Unit/edge test redemption
    - Mã không tồn tại (13.2), mã hết hạn/bị khóa (14.3)
    - _Requirements: 13.2, 14.3_

- [ ] 14. Review Service
  - [ ] 14.1 Gửi đánh giá và phản hồi/khiếu nại
    - Cho phép đánh giá (sao 1–5 + nhận xét) khi đã mua/đã dùng; từ chối khi chưa đủ điều kiện; lưu phản hồi/khiếu nại liên kết voucher/đơn
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ]* 14.2 Property test điều kiện đánh giá
    - **Property 17: Điều kiện đánh giá theo lịch sử mua/sử dụng**
    - **Validates: Requirements 9.1, 9.2**
  - [ ]* 14.3 Unit/edge test đánh giá
    - Điểm ngoài [1,5] (9.3), lưu phản hồi/khiếu nại có liên kết (9.4)
    - _Requirements: 9.3, 9.4_

- [ ] 15. Quản lý đơn hàng (Quản trị viên)
  - [ ] 15.1 Tra cứu, hủy và hoàn tiền đơn
    - `adminSearchOrders`; `cancelOrder` (chỉ `cho_thanh_toan` → `da_huy`, không phát hành mã); `refundOrder` (`da_thanh_toan` → `da_hoan_tien`, chuyển mã liên quan → `bi_huy`); hoàn trả tồn kho khi hủy/hoàn tiền
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  - [ ]* 15.2 Property test máy trạng thái đơn hàng và hoàn tiền
    - **Property 15: Bất biến chuyển trạng thái đơn hàng**
    - **Validates: Requirements 6.1, 7.1, 19.2, 19.3**
  - [ ]* 15.3 Property test bảo toàn tồn kho
    - **Property 6: Bảo toàn tồn kho qua phát hành, hủy và hoàn tiền**
    - **Validates: Requirements 7.6, 19.3, 19.4**

- [ ] 16. Reporting & Dashboard Service
  - [ ] 16.1 Báo cáo Đối tác
    - Doanh thu, số phát hành, số đã bán, tỷ lệ sử dụng theo voucher; chỉ tổng hợp trong phạm vi Đối tác đang xem
    - _Requirements: 15.1, 15.2_
  - [ ] 16.2 Dashboard quản trị
    - Tổng số người dùng, đối tác, voucher, đơn hàng, doanh thu, voucher đã dùng — tổng hợp toàn hệ thống
    - _Requirements: 21.1, 21.2_
  - [ ]* 16.3 Unit test báo cáo/dashboard
    - Báo cáo đối tác giới hạn phạm vi (15.2); chỉ số dashboard toàn hệ thống (21.2)
    - _Requirements: 15.2, 21.2_

- [ ] 17. Content Service
  - [ ] 17.1 CRUD nội dung (Quản trị viên)
    - Tạo/cập nhật/xóa danh mục, banner, bài viết, popup, chính sách; chỉ Quản_trị_viên truy cập
    - _Requirements: 20.1, 20.2_
  - [ ]* 17.2 Unit test quản lý nội dung
    - Lưu thay đổi nội dung (20.1); chặn vai trò khác (20.2)
    - _Requirements: 20.1, 20.2_

- [ ] 18. Audit Log Service
  - [ ] 18.1 Ghi và tra cứu Nhật_ký_hệ_thống
    - Ghi log cho thao tác quản trị quan trọng (duyệt đối tác, duyệt voucher, khóa tài khoản, hủy đơn, hoàn tiền) kèm người thực hiện/hành động/thời điểm; tra cứu theo tiêu chí; chỉ Quản_trị_viên truy cập
    - _Requirements: 22.1, 22.2, 22.3_
  - [ ]* 18.2 Property test ghi nhật ký kiểm toán
    - **Property 20: Ghi nhật ký kiểm toán cho thao tác quản trị quan trọng**
    - **Validates: Requirements 22.1**
  - [ ]* 18.3 Unit test truy cập nhật ký
    - Tra cứu theo tiêu chí (22.2); chặn vai trò không phải admin (22.3)
    - _Requirements: 22.2, 22.3_

- [ ] 19. Dữ liệu mẫu (seed)
  - [ ] 19.1 Script seed minh chứng toàn bộ luồng
    - Nhiều Đối tác (đã duyệt/chờ duyệt/bị khóa), voucher ở mọi trạng thái, đơn hàng ở mọi trạng thái thanh toán, voucher một-lượt và nhiều-lượt, đủ ba vai trò người dùng
    - _Requirements: 24.5_

- [ ] 20. Kết nối Frontend với các luồng nghiệp vụ
  - [ ] 20.1 Giao diện Khách hàng
    - Đăng ký/đăng nhập, tìm kiếm/lọc/chi tiết, giỏ hàng, tạo đơn, thanh toán mô phỏng, xem mã + QR, lịch sử đơn, đánh giá
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 24.4_
  - [ ] 20.2 Giao diện Đối tác / Nhân viên
    - Đăng ký/hồ sơ/chi nhánh, tạo/quản lý/gửi duyệt voucher, kiểm tra & xác nhận sử dụng mã, báo cáo
    - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1, 15.1, 24.4_
  - [ ] 20.3 Giao diện Quản trị viên
    - Quản lý người dùng/đối tác/voucher/đơn hàng, quản lý nội dung, dashboard, nhật ký hệ thống
    - _Requirements: 16.1, 17.1, 18.1, 19.1, 20.1, 21.1, 22.2, 24.4_

- [ ] 21. Kiểm thử tích hợp đầu cuối
  - [ ]* 21.1 Integration test luồng mua → thanh toán → phát hành → xác thực sử dụng
    - 1–3 kịch bản đại diện; xác minh transaction và ràng buộc DB end-to-end
    - _Requirements: 6.1, 7.1, 7.2, 7.6, 8.1, 13.1, 14.1_

- [ ] 22. Checkpoint cuối — Toàn bộ test xanh
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Các sub-task gắn `*` là tùy chọn (kiểm thử) và có thể bỏ qua cho MVP nhanh; sub-task không gắn `*` là bắt buộc.
- Mỗi property test hiện thực bằng **một** test fast-check chạy **≥100 vòng**, gắn nhãn `Feature: voucher-ecommerce-platform, Property {số}: {nội dung}`.
- Logic nghiệp vụ tách khỏi I/O; property test dùng repository in-memory/mock để chạy nhanh trên dải input rộng.
- Mỗi task tham chiếu requirement và/hoặc property cụ thể để truy vết.
- Checkpoint bảo đảm xác thực tăng dần tại các điểm dừng hợp lý.
- 22/22 correctness properties được phủ bởi các property test: P1→10.4, P2→10.5, P3→10.6, P4→10.7, P5→10.8, P6→15.3, P7→9.3, P8→13.3, P9→13.4, P10→13.5, P11→13.6, P12→12.2, P13→4.8, P14→7.4, P15→15.2, P16→8.2, P17→14.2, P18→4.2, P19→4.4, P20→18.2, P21→10.9, P22→4.5.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2"] },
    { "id": 3, "tasks": ["2.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.7"] },
    { "id": 5, "tasks": ["4.4", "4.5", "4.6", "4.8", "4.9"] },
    { "id": 6, "tasks": ["6.1", "7.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "7.2", "7.3"] },
    { "id": 8, "tasks": ["6.4", "6.5", "7.4", "7.5", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3", "9.1"] },
    { "id": 10, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 11, "tasks": ["10.1", "10.2"] },
    { "id": 12, "tasks": ["10.3"] },
    { "id": 13, "tasks": ["10.4", "10.5", "10.6", "10.7", "10.8", "10.9", "12.1"] },
    { "id": 14, "tasks": ["12.2", "12.3", "13.1"] },
    { "id": 15, "tasks": ["13.2"] },
    { "id": 16, "tasks": ["13.3", "13.4", "13.5", "13.6", "13.7", "14.1"] },
    { "id": 17, "tasks": ["14.2", "14.3", "15.1"] },
    { "id": 18, "tasks": ["15.2", "15.3", "16.1", "16.2", "17.1", "18.1"] },
    { "id": 19, "tasks": ["16.3", "17.2", "18.2", "18.3", "19.1"] },
    { "id": 20, "tasks": ["20.1", "20.2", "20.3"] },
    { "id": 21, "tasks": ["21.1"] }
  ]
}
```
