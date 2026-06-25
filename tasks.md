# Phân công Task — 4 thành viên

> Chia 23 TASK (`memory/plan.md`) cho 4 thành viên theo **lát cắt dọc theo domain**: mỗi người sở hữu một mảng backend service + giao diện frontend tương ứng.
> Mã TASK, FR, FLOW giữ nguyên theo `docs/02-srs` + `memory/plan.md` — đây chỉ là lớp phân công, không định nghĩa lại task.

## Nguyên tắc chia

- **Nền tảng làm trước**: TASK-001..005 (scaffold, DB, domain core, Auth/RBAC) là blocker của mọi domain → Lead cầm, hoàn thành ở **Giai đoạn 0** trước khi nhóm toả ra.
- **Lát cắt dọc**: sau nền tảng, mỗi người sở hữu một domain trọn vẹn (service → API → màn hình FE) để giảm đụng độ và dễ quy trách nhiệm.
- **Tôn trọng dependency**: thứ tự trong cột "Phụ thuộc" lấy từ `memory/plan.md`; không bắt đầu một TASK khi TASK phụ thuộc chưa xong.
- **Checkpoint chung**: TASK-005, TASK-011, TASK-023 là điểm dừng cả nhóm cùng xác nhận test xanh.

## Bảng phân công tổng hợp

| Thành viên | Vai trò / Domain | TASK sở hữu | Số TASK |
| --- | --- | --- | --- |
| **TV1 — Lead** | Nền tảng, Auth & RBAC | 001, 002, 003, 004, 005 | 5 |
| **TV2** | Mua sắm — Khách hàng | 008, 009, 010, 011, 012, 020 | 6 |
| **TV3** | Đối tác & Voucher | 006, 007, 013, 014, 021 | 5 |
| **TV4** | Quản trị & Báo cáo | 015, 016, 017, 018, 019, 022 | 6 |
| **Cả nhóm** | Tích hợp đầu cuối | 023 | 1 |

---

## TV1 — Lead · Nền tảng + Auth & RBAC

> Làm **trước tiên** ở Giai đoạn 0. Toàn nhóm chờ mảng này, nên ưu tiên cao nhất.

| TASK | Tên | Source | Phụ thuộc |
| --- | --- | --- | --- |
| TASK-001 | Hoàn thiện scaffold monorepo + công cụ kiểm thử | NFR-04/05/08 | — |
| TASK-002 | Prisma schema + migration khởi tạo + tầng repository | FR-01, FR-08 | TASK-001 |
| TASK-003 | Nền tảng miền — máy trạng thái + xử lý lỗi tập trung | FR-07/08/12-15/19/20, NFR-03 | TASK-002 |
| TASK-004 | Auth & User Service + RBAC | FR-01, FR-02, FR-03, FR-17 | TASK-003 |
| TASK-005 | **Checkpoint** — Auth & RBAC | — | TASK-004 |

**Bàn giao cho nhóm**: schema DB ổn định, middleware Auth/RBAC + kiểm tra phạm vi sở hữu, máy trạng thái + khung lỗi dùng chung. Sau TASK-005, ba domain còn lại khởi động song song.

---

## TV2 — Mua sắm (Khách hàng)

> Sở hữu lõi giao dịch của hệ thống: giỏ hàng → đặt đơn → thanh toán → phát hành mã. TASK-010 là phần rủi ro nhất (chống oversell, mã duy nhất, giao dịch nguyên tử).

| TASK | Tên | Source | Phụ thuộc |
| --- | --- | --- | --- |
| TASK-008 | Tìm kiếm, lọc & chi tiết voucher | FR-04, FR-05 | TASK-007 (TV3) |
| TASK-009 | Cart & Order Service | FR-06, FR-07 | TASK-008 |
| TASK-010 | Payment Sim + phát hành Voucher_code (**lõi hệ thống**) | FR-08, R19.2, R24.3 | TASK-009 |
| TASK-011 | **Checkpoint** — Mua → Thanh toán → Phát hành | — | TASK-010 |
| TASK-012 | Nhận voucher đã mua & lịch sử đơn | FR-09 | TASK-010 |
| TASK-020 | Frontend — Giao diện Khách hàng (FLOW-001..004) | FR-01,02,04,05,06,07,08,09,10 | TASK-010, 012, 014 (TV3) |

**Lưu ý phối hợp**: TASK-008 chờ TASK-007 (voucher product của TV3); TASK-020 chờ thêm TASK-014 (review của TV3). Đồng bộ lịch với TV3.

---

## TV3 — Đối tác & Voucher

> Sở hữu vòng đời voucher (tạo → duyệt) và luồng xác thực sử dụng tại chi nhánh.

| TASK | Tên | Source | Phụ thuộc |
| --- | --- | --- | --- |
| TASK-006 | Partner Service | FR-11, FR-18 | TASK-004 (TV1) |
| TASK-007 | Voucher Product Service + máy trạng thái sản phẩm | FR-12, FR-13, FR-19 | TASK-006 |
| TASK-013 | Redemption Service (kiểm tra + xác nhận sử dụng) | FR-14, FR-15 | TASK-010 (TV2) |
| TASK-014 | Review Service | FR-10 | TASK-013 |
| TASK-021 | Frontend — Giao diện Đối tác / Nhân viên (FLOW-005..008) | FR-11,12,13,14,15,16 | TASK-007, 013, 016 (TV4) |

**Lưu ý phối hợp**: TASK-007 là dependency của TASK-008 (TV2) → ưu tiên làm sớm. TASK-013 chờ TASK-010 (lõi của TV2).

---

## TV4 — Quản trị & Báo cáo

> Sở hữu mảng vận hành: quản lý đơn, báo cáo, nội dung, nhật ký, dữ liệu mẫu.

| TASK | Tên | Source | Phụ thuộc |
| --- | --- | --- | --- |
| TASK-015 | Quản lý đơn hàng (Quản trị viên) | FR-20 | TASK-010 (TV2) |
| TASK-016 | Reporting & Dashboard Service | FR-16, FR-22 | TASK-013 (TV3), TASK-015 |
| TASK-017 | Content Service | FR-21 | TASK-004 (TV1) |
| TASK-018 | Audit Log Service | FR-23 | TASK-006 (TV3), 007 (TV3), 015 |
| TASK-019 | Dữ liệu mẫu (seed) | NFR-08, CON-04, AC-04 | TASK-018 |
| TASK-022 | Frontend — Giao diện Quản trị viên (FLOW-009..012) | FR-17,18,19,20,21,22,23 | TASK-015, 016, 017, 018 |

**Lưu ý phối hợp**: TASK-017 chỉ cần nền tảng (TASK-004) → có thể bắt đầu sớm khi chờ TASK-010. TASK-019 (seed) cần dữ liệu mọi domain → làm gần cuối.

---

## Cả nhóm — Tích hợp

| TASK | Tên | Source | Phụ thuộc |
| --- | --- | --- | --- |
| TASK-023 | Kiểm thử tích hợp đầu cuối + **Checkpoint cuối** | FLOW-003, FLOW-007 | TASK-020, 021, 022 |

Cả 4 thành viên cùng tham gia: chạy luồng mua → thanh toán → phát hành → xác thực end-to-end, xác minh transaction + ràng buộc DB, chốt toàn bộ test xanh trước demo.

---

## Tiến trình theo giai đoạn (gợi ý)

| Giai đoạn | Ai làm | Nội dung |
| --- | --- | --- |
| **0 — Nền tảng** | TV1 (cả nhóm hỗ trợ) | TASK-001..005 — scaffold, DB, domain core, Auth/RBAC. Nhóm chờ điểm này. |
| **1 — Toả domain** | TV2/3/4 song song | TV3 ưu tiên TASK-006→007 (mở khoá TV2). TV4 bắt đầu TASK-017. TV2 chờ 007 rồi chạy 008→009→010. |
| **2 — Lõi giao dịch** | TV2 + checkpoint | TASK-010 + TASK-011 (cả nhóm xác nhận). Mở khoá TASK-012/013/015. |
| **3 — Hoàn thiện service** | TV3/TV4 | TASK-013/014, 015/016/018/019. |
| **4 — Frontend** | TV2/3/4 | TASK-020/021/022 theo domain. |
| **5 — Tích hợp** | Cả nhóm | TASK-023 + checkpoint cuối → demo. |

## Quy ước làm việc

- Branch: `type/#<issue>-<slug>` · Commit: `type(scope): mô tả [TASK-XXX]` (xem `CONTRIBUTING.md`).
- Mỗi TASK lấy **acceptance criteria** từ `docs/02-srs` (không diễn giải lại) và tham chiếu contract ở `docs/05-database-design` / `07-api-design` / `08-frontend-design`.
- Sub-task gắn `*` trong `.kiro/tasks.md` (property/unit test) là tùy chọn cho MVP nhanh; phần không gắn `*` là bắt buộc.
- Khi đổi schema/API/UI → cập nhật deliverable `docs/` tương ứng trong **cùng** thay đổi.

---

# MVP theo 2 đợt — đích đến 13 bảng (phủ trọn ưu tiên CAO trong BRD)

> **Chiến lược**: dựng dần theo migration cộng dồn. **Đợt 1** dựng 9 bảng core cho CHẠY thông đường tiền; **Đợt 2** nối thêm 4 bảng (additive, không sửa schema cũ) để phủ hết các BR đánh dấu **Cao** trong BRD. Xong đợt 2 = nghiệm thu được KPI-01..04 + AC-01..04.
>
> **13 bảng IN** = 9 core + 4 nối: `branches`, `voucher_product_branches`, `usage_logs`, `categories`.
> **4 bảng OUT** (BRD đánh dấu **Trung bình** → hoãn ngoài MVP): `reviews` (BR-CUS-08), `content_items` (BR-ADM-05), `audit_logs` (BR-ADM-07), `partner_staff` (CON-03 chỉ buộc 3 vai trò; BR-PAR-05/06 cho phép "đối tác **hoặc** nhân viên" → chủ đối tác tự redeem).
> **3 TASK bỏ khỏi MVP**: TASK-014 (review), TASK-017 (content), TASK-018 (audit).
>
> **Một bảng `users` duy nhất cho mọi login** (khách / chủ đối tác / admin). `partners` là **hồ sơ doanh nghiệp** (không có mật khẩu), `partners.owner_user_id → users`. KHÔNG tách `User`/`Partner` thành hai bảng đăng nhập. Khi nối `partner_staff` về sau (mỗi NV = 1 dòng `users` + 1 dòng `partner_staff`), auth giữ nguyên — không migrate lại.

---

## Phần LÀM CHUNG — không tính vào chia điểm

> Ba mảng này cả nhóm cùng làm / một người chốt, **không đếm vào cân tải** giữa 4 thành viên.

| Mảng | Ai | Ghi chú |
| --- | --- | --- |
| **Scaffold** (TASK-001) | cả nhóm (TV1 chốt) | dựng monorepo + tooling một lần ở đầu |
| **DB schema + migration** (TASK-002 phần schema, cả 2 đợt) | **TV1 (bạn) viết** | TV1 sở hữu `schema.prisma` — người khác cần model mới thì báo, KHÔNG tự sửa |
| **Report / Dashboard** (TASK-016) | cả nhóm | query tổng hợp, cụm độc lập — ghép cuối khi số liệu các domain đã có |

---

## Chia 13 TASK code (đã trừ phần chung) — theo DOMAIN

> Nguyên tắc: **domain để chia code** (gom flow dùng-chung-service về một người → ít đụng nhau nhất). **Flow để chia test e2e** (xem mục dưới). Mỗi người một lát dọc `services/<domain>/` + `pages/<role>/`, không sửa file của nhau.

| Thành viên | Domain | TASK code | FLOW phủ | Điểm |
| --- | --- | --- | --- | --- |
| **TV1 — bạn** | Nền tảng code + Auth | 003, 004, 012, **020 (FE khách)** | 001, 009 | ~11 |
| **TV2** | Shopping BE (lõi giao dịch) | 008, 009, 010 | 002, 003 | ~8.5 |
| **TV3** | Đối tác & Voucher (BE+FE) | 006, 007, 013, 021 | 005, 006, 007 | ~10.5 |
| **TV4** | Admin + Seed (BE+FE) + **dẫn integration/e2e** | 015, 019, 022, **023** | 010 + sở hữu toàn bộ FLOW-tag | ~10.5 |

**Chi tiết từng người**

- **TV1** — `domain/state-machine` (3 máy trạng thái + middleware lỗi, 003); `auth/user-service` + RBAC + admin lock/unlock/role (004 — gom FLOW-001 login KH **và** FLOW-009 admin quản user vì cùng service); nhận mã + lịch sử đơn BE (012); **FE khách (020)** vì TV1 dựng layout/shared nên nối FE khách hợp.
- **TV2** — search/filter + chi tiết (008); cart + order (009); **payment sim + phát hành mã nguyên tử (010 — lõi P1–P5/P21)**. Gánh phần rủi ro nhất → không thêm FE để dồn sức cho transaction.
- **TV3** — partner + admin duyệt (006); voucher product trọn máy trạng thái (007 — **xong sớm vì TV2 chờ** để có voucher `dang_ban`); **redeem (013 — P8–P11 → KPI-03)** ở đợt 2; FE đối tác (021).
- **TV4** — admin quản đơn + hủy/hoàn (015 — P6/P15); seed (019, tối thiểu→đầy đủ); FE admin (022); **dẫn integration cuối (023) + sở hữu toàn bộ test e2e theo FLOW** → đây là phần bù cho domain admin bị mỏng (report làm chung, content/audit bỏ khỏi MVP).

`⊂` trong các bảng waves = bản cắt scope của TASK gốc (đợt 1 thu hẹp, đợt 2 mở đủ).

---

## Domain để CODE, Flow để TEST

> Code chia theo domain (ít đụng nhất). Test e2e chia theo FLOW (rule `@FLOW-XXX` trong `testing.md`). **TV4 dẫn integration nên sở hữu toàn bộ FLOW-tag e2e**; mỗi domain-owner tự viết unit/property test của mình.

| FLOW | Nội dung | Code-owner | TASK |
| --- | --- | --- | --- |
| FLOW-001 | Đăng ký/login KH | TV1 | 004 |
| FLOW-002 | Tìm kiếm → chi tiết | TV2 | 008 |
| FLOW-003 | Giỏ→đặt→thanh toán→nhận mã (lõi) | TV2 | 009+010+012 |
| FLOW-005 | Đăng ký đối tác → admin duyệt | TV3 | 006 |
| FLOW-006 | Tạo voucher → duyệt → công bố | TV3 | 007 |
| FLOW-007 | Kiểm tra → xác nhận dùng (redeem) | TV3 | 013 |
| FLOW-009 | Admin quản lý/phân quyền user | TV1 | 004 |
| FLOW-010 | Hủy / hoàn đơn | TV4 | 015 |
| FLOW-004/008/011/012 | Đánh giá / báo cáo / nội dung+dashboard / nhật ký | — | OUT hoặc làm chung (016) |

Lý do gom flow theo domain: FLOW-001+009 cùng đụng `auth-service` → một người (TV1); FLOW-003+007+010 cùng đọc/ghi `issued_voucher_codes` + máy trạng thái code → gom về vòng đời voucher (TV2 phát hành, TV3 redeem, TV4 hủy) nhưng **cùng máy trạng thái do TV1 sở hữu** → tránh ba người sửa chung chỗ nhạy cảm.

---

## ĐỢT 1 — Core 9 bảng (cho CHẠY đường tiền)

> **Mục tiêu**: chạy thông `đăng ký → đối tác tạo voucher → admin duyệt → khách tìm → thêm giỏ → đặt đơn → thanh toán mô phỏng → nhận mã`.
>
> **9 bảng**: `roles`, `users`, `partners`, `voucher_products`, `carts`, `cart_items`, `orders`, `order_items`, `issued_voucher_codes`.
>
> **DỪNG ở**: khách nhận mã. CHƯA có redeem (đợt 2), CHƯA lọc danh mục/khu vực (đợt 2).
>
> **Quy tắc cắt**: không bảng core nào có FK **NOT NULL** trỏ tới bảng chưa dựng. `voucher_products.category_id` giữ **nullable** (categories ở đợt 2). Filter `region`/`category` tạm bỏ (nằm ở `branches`/`categories`).

| Wave | TASK | Ai |
| --- | --- | --- |
| 0 | TASK-001 scaffold | cả nhóm (TV1 chốt) |
| 1 | DB schema 9 bảng + 002 repository | **TV1 (không tính điểm)** |
| 2 | TASK-003 máy trạng thái + middleware | TV1 |
| 3 | TASK-004 auth + RBAC | TV1 |
| 4 | **TASK-005** checkpoint | cả nhóm |
| 5 | TASK-006⊂ partner | TV3 · (TV4 dựng khung FE admin) |
| 6 | TASK-007 voucher product | TV3 |
| 7 | TASK-008⊂ search | TV2 |
| 8 | TASK-009 cart/order | TV2 |
| 9 | TASK-010 (lõi) payment+phát hành | TV2 |
| 10 | **TASK-011** checkpoint | cả nhóm |
| 11 | TASK-012⊂ nhận mã + seed tối thiểu | TV1 · TV4 |
| 12 | FE đợt 1 (TV1=020⊂ · TV3=021⊂ · TV4=022⊂) | TV1/3/4 |

---

## ĐỢT 2 — Nối +4 bảng → 13 (phủ trọn ưu tiên CAO)

> **Mục tiêu**: bổ sung mọi BR đánh dấu **Cao** mà đợt 1 chưa phủ — redeem (BR-05/PAR-05/PAR-06 + KPI-03), lọc danh mục/khu vực (BR-CUS-03), chi nhánh (BR-PAR-01/ADM-02), admin quản đơn/hoàn tiền (BR-ADM-04), dashboard (BR-ADM-06).
>
> **+4 bảng** (mỗi cái chỉ *trỏ vào* core, một `prisma migrate` mới, KHÔNG sửa schema cũ): `categories`, `branches`, `voucher_product_branches`, `usage_logs`.

| Wave | TASK | Ai |
| --- | --- | --- |
| 13 | DB migration +4 bảng | **TV1 (không tính điểm)** |
| 14 | TASK-008 (filter) · TASK-006 (branch) · TASK-015 | TV2 · TV3 · TV4 |
| 15 | TASK-013 redeem · TASK-016 dashboard | TV3 · cả nhóm (chung) |
| 16 | FE mở đủ (020/021/022) + TASK-019 seed đầy đủ | TV1/3/4 |
| 17 | **TASK-023** integration + checkpoint cuối | TV4 dẫn · cả nhóm |

---

## Lưu ý cân tải & zero-conflict

- Điểm đã trừ phần chung: TV1 ~11 · TV2 ~8.5 · TV3 ~10.5 · TV4 ~10.5. TV2 nhẹ-số nhưng **gánh TASK-010 khó nhất** (oversell, mã duy nhất, transaction) → nặng-độ-khó, cân về thực chất.
- **TV3** xong TASK-007 sớm là điều kiện để TV2 chạy 008 → ưu tiên cao đầu đợt 1.
- **TV4** mỏng phần code (report chung + content/audit bỏ) được bù bằng **toàn bộ integration + e2e theo FLOW** (TASK-023 + FLOW-tag).
- **Zero-conflict — 4 file nóng, TV1 gác hết**:
  - `schema.prisma` → chỉ TV1 sửa (TV1 viết DB). Cần model mới → báo TV1.
  - `shared/enums` + `dto` → TV1 gác; mỗi domain **thêm file mới**, không sửa file người khác.
  - `routes/index.ts` (mount router) → TV1 gác; người khác chỉ thêm 1 dòng.
  - `seed.ts` → một mình TV4.
  - Máy trạng thái code (`issued_voucher_codes`) → TV1 sở hữu; TV2/TV3/TV4 gọi `canTransition/applyTransition`, không tự viết chuyển trạng thái.
