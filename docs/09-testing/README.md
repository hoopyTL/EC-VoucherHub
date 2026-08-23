# Kế hoạch kiểm thử — Testing Plan

> Hệ thống Thương mại điện tử bán Voucher giảm giá trực tuyến
> Nguồn: `docs/02-srs/` (FR + FLOW + NFR), `docs/06-architecture/` (22 correctness properties).
> Runner: **Vitest** (unit/integration) · **fast-check** (property-based, ≥100 vòng) · **Playwright** (E2E, tag `@FLOW-XXX`).

## 1. Chiến lược

Áp dụng **kiểm thử kép**: test ví dụ/biên cho hành vi cụ thể + **property-based testing (PBT)** cho các bất biến phổ quát. Logic nghiệp vụ tách khỏi I/O (repository in-memory) để PBT chạy ≥100 vòng với chi phí thấp.

| Tầng | Công cụ | Phạm vi | Ranh giới test |
| --- | --- | --- | --- |
| Unit / ví dụ | Vitest | hàm thuần, validation, máy trạng thái | gọi service trực tiếp |
| Property-based | fast-check | 22 bất biến nghiệp vụ | service + repo in-memory, ≥100 vòng |
| Integration | Vitest + supertest | luồng API đầu-cuối qua HTTP | real boundary + test DB (Prisma) |
| E2E | Playwright | 12 FLOW qua UI | trình duyệt thật, tag `@FLOW-XXX` |

Quy ước nhãn property test: **`Feature: voucher-ecommerce-platform, Property {số}: {nội dung}`**, `fc.assert(..., { numRuns: 100 })`.

## 2. Ma trận coverage chức năng

Mỗi FR phủ tối thiểu 3 trường hợp: **happy** (đường thành công), **error** (vi phạm validation/nghiệp vụ), **edge** (biên). Cột "Test file" co-locate dưới `backend/src` theo `testing.md`.

| FR | Happy | Error | Edge | TASK | Test file |
| --- | --- | --- | --- | --- | --- |
| FR-01 Đăng ký KH | tạo tài khoản hợp lệ | định danh trùng → từ chối | mật khẩu = 8 (biên) | TASK-004 | `auth/register.test.ts` |
| FR-02 Đăng nhập & hồ sơ | đăng nhập + tạo phiên | sai thông tin → 401 | tài khoản `bi_khoa` → từ chối | TASK-004 | `auth/login.test.ts` |
| FR-03 RBAC | vai trò đúng → cho phép | ngoài quyền → 403 | chưa đăng nhập → redirect | TASK-004 | `auth/rbac.test.ts` |
| FR-04 Tìm/lọc voucher | từ khóa khớp → list `dang_ban` | — | không kết quả → list rỗng | TASK-008 | `voucher/search.test.ts` |
| FR-05 Chi tiết voucher | hiển thị đầy đủ | — | còn 0 → hết hàng, chặn thêm giỏ | TASK-008 | `voucher/detail.test.ts` |
| FR-06 Giỏ hàng | thêm/sửa/xóa + tạm tính | số lượng > tồn → từ chối | qty âm/0 → reject | TASK-009 | `cart/cart.test.ts` |
| FR-07 Tạo đơn | đơn `cho_thanh_toan` | giỏ rỗng → từ chối | mục vượt tồn kho → từ chối | TASK-009 | `order/create.test.ts` |
| FR-08 Thanh toán & phát hành | TX: trừ kho + phát mã | thanh toán fail → giữ `cho_thanh_toan` | đụng độ mã → retry | TASK-010 | `payment/issue.test.ts` |
| FR-09 Nhận mã & lịch sử | xem mã đơn đã trả | — | đơn khách khác → từ chối | TASK-012 | `order/codes.test.ts` |
| ~~FR-10 Đánh giá~~ | ~~đã mua → gửi sao~~ | ~~chưa mua → từ chối~~ | ~~điểm ngoài [1,5] → reject~~ | ~~TASK-014 [OUT]~~ | ~~review/review.test.ts~~ |
| FR-11 Hồ sơ Đối tác | đăng ký → `PENDING` | thiếu pháp lý/trùng định danh → từ chối | CRUD + ownership chi nhánh | TASK-006 | `modules/partner/partner.test.ts` |
| FR-12 Tạo/quản lý voucher | tạo → `nhap` | giá bán ≥ gốc → từ chối | branch ngoài ownership → rollback | TASK-007 | `modules/voucher/voucher.test.ts` |
| FR-13 Gửi duyệt voucher | `nhap` → `cho_duyet` | transition sai → 422 | re-submit: `tu_choi` → `nhap` → `cho_duyet` | TASK-007 | `modules/voucher/voucher.test.ts` |
| FR-14 Kiểm tra mã | hiển thị trạng thái mã | mã không tồn tại → invalid | mã đối tác khác → ngoài phạm vi | TASK-013 | `redeem/validate.test.ts` |
| FR-15 Xác nhận sử dụng | mã hợp lệ → `da_su_dung` + log | mã đã dùng → từ chối | multi-use giảm lượt | TASK-013 | `redeem/redeem.test.ts` |
| FR-16 Báo cáo Đối tác | tổng hợp trong phạm vi | — | đối tác khác → không thấy | TASK-016 | `report/partner.test.ts` |
| FR-17 Quản lý người dùng | tra cứu/khóa/đổi vai trò | non-admin → 403 | mở khóa idempotent | TASK-004 | `admin/users.test.ts` |
| FR-18 Quản lý Đối tác | duyệt → `APPROVED` | non-admin → 403, review lặp → 409 | khóa chặn token cũ | TASK-006 | `modules/partner/partner.test.ts` |
| FR-19 Duyệt voucher | duyệt/công bố | công bố khi chưa `da_duyet` → từ chối | tạm ngưng/mở lại/ngừng bán | TASK-007 | `modules/voucher/voucher.test.ts` |
| FR-20 Quản lý đơn | tra cứu/hủy/hoàn tiền | hủy đơn đã trả → từ chối | hoàn tiền → mã `bi_huy` + hoàn kho | TASK-015 | `admin/orders.test.ts` |
| ~~FR-21 Quản lý nội dung~~ | ~~CRUD nội dung~~ | ~~non-admin → 403~~ | ~~xóa mục không tồn tại~~ | ~~TASK-017 [OUT]~~ | ~~admin/content.test.ts~~ |
| FR-22 Dashboard | tổng hợp toàn hệ thống | non-admin → 403 | hệ thống rỗng → số 0 | TASK-016 | `admin/dashboard.test.ts` |
| ~~FR-23 Nhật ký hệ thống~~ | ~~ghi + tra cứu log~~ | ~~non-admin → 403~~ | ~~tra cứu rỗng~~ | ~~TASK-018 [OUT]~~ | ~~admin/audit.test.ts~~ |

## 3. Property-based tests (22 bất biến)

Mỗi property = **một** test fast-check ≥100 vòng. Cột Property ↔ TASK ánh xạ theo kế hoạch triển khai (đã phủ 22/22).

| Property | Nội dung | Validates (R) | TASK |
| --- | --- | --- | --- |
| P1 | Tính duy nhất của Voucher_code | 7.3 | TASK-010 |
| P2 | Mã khó đoán, ≥12 ký tự CSPRNG | 7.4 | TASK-010 |
| P3 | Phát hành đúng sau thanh toán | 7.1, 7.2, 7.5 | TASK-010 |
| P4 | Không phát hành khi chưa/không thanh toán | 7.7, 7.8, 19.2 | TASK-010 |
| P5 | Chống oversell | 5.5, 6.5, 7.6 | TASK-010 |
| P6 | Bảo toàn tồn kho qua phát hành/hủy/hoàn | 7.6, 19.3, 19.4 | TASK-015 |
| P7 | Tổng tiền tạm tính chính xác | 5.4, 6.1 | TASK-009 |
| P8 | Hợp lệ & không tái sử dụng mã | 13.4, 14.2, 14.3 | TASK-013 |
| P9 | Một-lượt idempotent sau lần đầu | 14.1, 14.2 | TASK-013 |
| P10 | Nhiều-lượt giảm đúng + chuyển khi cạn | 14.5 | TASK-013 |
| P11 | Xác thực giới hạn phạm vi Đối tác/Chi nhánh | 13.3, 14.4 | TASK-013 |
| P12 | Truy cập theo phạm vi sở hữu | 8.2, 8.3, 11.7, 15.2 | TASK-012 |
| P13 | RBAC | 16.5, 20.2, 22.3, 23.1, 23.2 | TASK-004 |
| P14 | Bất biến máy trạng thái voucher sản phẩm | 3.1, 3.3, 11.2, 11.5, 12.1, 18.* | TASK-007 |
| P15 | Bất biến máy trạng thái đơn hàng | 6.1, 7.1, 19.2, 19.3 | TASK-015 |
| P16 | Bộ lọc trả kết quả thỏa mọi tiêu chí | 3.1, 3.2, 3.3 | TASK-008 |
| ~~P17~~ | ~~Điều kiện đánh giá theo mua/dùng~~ | ~~9.1, 9.2~~ | ~~TASK-014 [OUT]~~ |
| P18 | Mật khẩu luôn lưu băm | 1.4, 2.6 | TASK-004 |
| P19 | Duy nhất định danh tài khoản | 1.2 | TASK-004 |
| ~~P20~~ | ~~Ghi audit cho thao tác quản trị quan trọng~~ | ~~22.1~~ | ~~TASK-018 [OUT]~~ |
| P21 | Tính nguyên tử khi xử lý lỗi (rollback) | 24.3 | TASK-010 |
| P22 | Round-trip khóa/mở khóa + chặn đăng nhập | 2.3, 16.2, 16.3 | TASK-004 |

## 4. Map FLOW → E2E (`@FLOW-XXX`)

Mỗi FLOW trong `docs/02-srs` → một test Playwright tag `@FLOW-XXX`, chạy qua UI thật. Selector ưu tiên `data-testid` (xem `docs/08-frontend-design`).

| FLOW | Tên | E2E file | Tag |
| --- | --- | --- | --- |
| FLOW-001 | Đăng ký & đăng nhập KH | `e2e/auth.spec.ts` | `@FLOW-001` |
| FLOW-002 | Tìm kiếm → chi tiết | `e2e/browse.spec.ts` | `@FLOW-002` |
| FLOW-003 | Giỏ → đơn → thanh toán → nhận mã | `e2e/purchase.spec.ts` | `@FLOW-003` |
| ~~FLOW-004~~ | ~~Đánh giá voucher~~ | ~~e2e/review.spec.ts~~ | ~~@FLOW-004 [OUT]~~ |
| FLOW-005 | Đăng ký Đối tác → duyệt → CRUD chi nhánh | `e2e/task006-partner-onboarding.spec.ts` | `@FLOW-005` |
| FLOW-006 | Tạo → gửi duyệt → duyệt → công bố | `e2e/voucher-lifecycle.spec.ts` | `@FLOW-006` |
| FLOW-007 | Kiểm tra → xác nhận sử dụng | `e2e/redeem.spec.ts` | `@FLOW-007` |
| FLOW-008 | Báo cáo Đối tác | `e2e/partner-report.spec.ts` | `@FLOW-008` |
| FLOW-009 | Quản lý & phân quyền người dùng | `e2e/admin-users.spec.ts` | `@FLOW-009` |
| FLOW-010 | Hủy / hoàn tiền đơn | `e2e/admin-orders.spec.ts` | `@FLOW-010` |
| ~~FLOW-011~~ | ~~Quản lý nội dung & dashboard~~ | ~~e2e/admin-content.spec.ts~~ | ~~@FLOW-011 [OUT]~~ |
| ~~FLOW-012~~ | ~~Ghi & tra cứu nhật ký~~ | ~~e2e/admin-audit.spec.ts~~ | ~~@FLOW-012 [OUT]~~ |

Chạy một flow: `npm run test:e2e -- --grep @FLOW-003`.

### TASK-004 automation hiện có

- `e2e/task004-api.spec.ts`: kiểm tra API auth/profile/RBAC/admin users qua HTTP thật.
- `e2e/task004-auth.spec.ts`: FLOW-001 đăng ký, đăng nhập và đổi mật khẩu qua Chromium.
- `e2e/task004-admin-users.spec.ts`: FLOW-009 đăng nhập Admin, tìm kiếm, khóa và mở khóa qua Chromium.
- `npm run test:e2e`: kiểm tra URL database, migrate và reset chính xác `voucherhub_test`, seed fixture, sau đó khởi động backend/frontend test trên cổng `4100/5174`.
- Khi lỗi, Playwright giữ screenshot/video; CI retry giữ trace và upload `playwright-report/` cùng `test-results/`.

Không chạy E2E nếu `backend/.env.test` không trỏ chính xác tới PostgreSQL local `voucherhub_test`. Runner chủ động từ chối database khác trước thao tác reset.

### TASK-006 automation hiện có

- `backend/src/modules/partner/partner.test.ts`: 8 integration tests qua Express + Prisma test DB, không mock database. Phủ validation trước ghi DB, transaction đăng ký, duplicate rollback, pending login, approval/rejection, RBAC, branch ownership/CRUD và lock/unlock áp dụng ngay lên token cũ.
- `frontend/src/pages/public/RegisterPartnerPage.test.tsx`: kiểm tra form và payload đăng ký canonical (`legalName`, `taxCode`, `representative`, branches).
- `frontend/src/pages/admin/PartnerApprovalsPage.test.tsx`: kiểm tra envelope, danh sách pending và endpoint approval dùng `{ action, reason? }`.
- `frontend/src/pages/partner/BranchesPage.test.tsx`: kiểm tra GET/POST/PATCH/DELETE, validation và refetch cache.
- `e2e/task006-partner-onboarding.spec.ts`: FLOW-005 chạy trình duyệt thật từ đăng ký → login bị chặn khi pending → Admin duyệt → Partner đăng nhập → thêm/sửa/xoá branch.
- Runner tổng quát là `e2e/run-e2e.ts`; trước mỗi suite, runner xác minh đúng database `voucherhub_test`, migrate, reset và seed fixture có Partner `APPROVED` hợp lệ.
- Kết quả backend coverage ngày 2026-08-16 sau TASK-006: 11 test files, 110 tests qua; tổng coverage 91,86% statements, 79,91% branches, 95,04% functions và 93,75% lines. Riêng `modules/partner` đạt 91,79% statements, 72% branches, 97,14% functions và 96% lines.

Lệnh kiểm tra riêng TASK-006:

```bash
npm test --workspace=backend -- --run src/modules/partner/partner.test.ts
npm test --workspace=frontend -- --run src/pages/public/RegisterPartnerPage.test.tsx src/pages/admin/PartnerApprovalsPage.test.tsx src/pages/partner/BranchesPage.test.tsx
npm run test:e2e -- --grep @FLOW-005
```

### TASK-007 automation hiện có

- `backend/src/modules/voucher/voucher.test.ts`: 12 integration tests qua Express + PostgreSQL thật; phủ partner approval/status, validation, transaction rollback, category/branch ownership, CRUD draft, state machine, Admin RBAC/review/publish, pagination/filter, race giữa khóa Partner và publish, magic bytes cùng rate limit upload.
- Frontend tests khóa mapper field/envelope, category/branch ID boundary, endpoint canonical, action theo trạng thái và dashboard `ON_SALE`.
- `e2e/task007-voucher-product.spec.ts`: FLOW-006 chạy Chromium thật từ Partner tạo/gửi duyệt, Admin duyệt/công bố, đến Partner tạm dừng.
- Kết quả ngày 2026-08-16: backend 12 files/126 tests pass, coverage 89,42% statements / 76,08% branches / 95,72% functions / 92,43% lines; frontend 33 files/228 tests pass; lint, typecheck, build và toàn bộ E2E 7/7 đều pass.
- Audit riêng backend không có lỗ hổng. Audit toàn monorepo còn 8 cảnh báo kế thừa từ toolchain frontend Vite/Vitest/React Router; cách sửa tự động yêu cầu nâng major và được tách khỏi TASK-007 để tránh breaking change ngoài phạm vi.
- TASK-008 public search/detail không nằm trong coverage hoàn thành của TASK-007.

```bash
npm test --workspace=backend -- voucher.test.ts
npm test --workspace=frontend -- CreateVoucherPage.test.tsx VouchersPage.test.tsx VoucherApprovalsPage.test.tsx
npm run test:e2e -- --grep @FLOW-006
```

## 5. Integration test (luồng lõi)

| Kịch bản | Phủ | TASK |
| --- | --- | --- |
| Mua → thanh toán → phát hành → xác thực sử dụng (1–3 biến thể) | R6.1, R7.1, R7.2, R7.6, R8.1, R13.1, R14.1 | TASK-021 |
| Hủy/hoàn tiền → hoàn kho + mã `bi_huy` | R19.2, R19.3, R19.4 | TASK-021 |

Test qua HTTP boundary (supertest) với test DB Prisma riêng; reset `deleteMany` trong `beforeEach`; không mock Prisma (chỉ mock Payment Sim).

## 6. Kiểm tra phi chức năng

| NFR | Cách kiểm | Tiêu chí đạt |
| --- | --- | --- |
| NFR-01 Hiệu năng | đo thời gian tra cứu voucher/đơn (demo) | ≤ 3 giây |
| NFR-02 Bảo mật | review: mật khẩu băm; mã không lộ trước thanh toán; RBAC trên route admin | P13, P18, P4 xanh + manual |
| NFR-03 Ổn định | fault injection giữa thao tác đa bước | rollback toàn bộ (P21 xanh) |
| NFR-04 Toàn vẹn dữ liệu | toàn bộ qua Prisma + CSDL quan hệ | smoke check |
| NFR-05 Khả năng dùng | responsive desktop + mobile | manual qua 3 viewport (Playwright) |
| NFR-07 Kiểm toán | thao tác quản trị → audit log | P20 xanh |
| NFR-08 Vai trò | seed đủ 4 vai trò, STAFF bị giới hạn theo chi nhánh | dữ liệu mẫu + kiểm tra RBAC/ownership |

## 7. Lệnh chạy

| Việc | Lệnh |
| --- | --- |
| Toàn bộ unit/integration | `npm test` |
| Một workspace | `npm test --workspace=backend` |
| Một file/test | `npx vitest run path/x.test.ts -t "name"` |
| Coverage | `npx vitest run --coverage` |
| E2E toàn bộ | `npm run test:e2e` |
| E2E một flow | `npm run test:e2e -- --grep @FLOW-003` |

## 8. Anti-patterns (theo `CONTRIBUTING.md`)

- ❌ Mock Prisma trong integration → dùng test DB thật (chỉ mock Payment Sim/notification).
- ❌ Hard sleep trong E2E → dùng auto-retry assertion + `waitForResponse`.
- ❌ Test phụ thuộc thứ tự → reset state trong `beforeEach`.
- ❌ Bundle nhiều assertion logic vào 1 test.
- ❌ Property test < 100 vòng hoặc thiếu nhãn property.

## 9. TASK-004 verification record (2026-08-16)

TASK-004 uses a real PostgreSQL database named exactly `voucherhub_test`. The test bootstrap rejects non-local hosts and any other database pathname before cleanup. Copy `backend/.env.test.example` to the ignored `backend/.env.test`, create/apply migrations to the test database, then run:

```bash
npm run typecheck:test --workspace=backend
npm run test:coverage --workspace=backend
```

Recorded result after synchronizing with `main`: 10 test files and 99 tests passed. Overall coverage is 91.98% statements, 81.6% branches, 93.97% functions, and 93.08% lines; `modules/auth` and `modules/user` both reach 100% statements/functions/lines. P13, P18, P19, and P22 run at least 100 generated cases where specified, backed by Prisma rather than a mocked database. Password-change coverage proves both that the old password fails and that the previously issued access token returns 401.

Static/release gates also pass: root typecheck, test typecheck, lint with zero warnings, production build, `git diff --check`, and high-severity dependency audit. The release workflow provisions PostgreSQL, applies migrations, and runs the coverage gate.
