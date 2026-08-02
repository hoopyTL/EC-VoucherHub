# Figma workflow cho frontend MVP

## Nguồn chuẩn và chế độ preview

Code React trong `frontend/` là nguồn chuẩn. Figma dùng để đề xuất, thảo luận
và duyệt thay đổi giao diện; không xem Figma là bản triển khai và không giả định
có đồng bộ hai chiều.

Chạy UI bằng dữ liệu cố định, không cần backend:

```bash
npm ci
npm run dev:design --workspace=frontend -- --host 127.0.0.1
```

Mặc định Vite mở `http://127.0.0.1:5173`. Biến
`VITE_DESIGN_PREVIEW=true` kích hoạt adapter mock nội bộ, không gửi request tới
backend. Route `/partner/*` nhận role Partner, `/admin/*` nhận role Admin và các
route khách hàng nhận role Customer. Các route đăng nhập/đăng ký vẫn ở trạng
thái guest để capture đúng màn hình.

`frontend/src/types/ui-contracts.ts` chỉ là contract tương thích cho UI preview.
Module này sẽ được thay bằng contract API chính thức khi frontend được tích hợp
với backend `/api`.

## File và cấu trúc Figma

Tạo một file tên **EC-VoucherHub — UI Design** với các page theo đúng thứ tự:

1. `00 — Guide`
2. `01 — Foundations`
3. `02 — Components`
4. `03 — Customer`
5. `04 — Partner`
6. `05 — Admin`
7. `90 — Proposals`
8. `99 — Raw Imports`

Starter không dùng team library hoặc Code Connect. Variables, styles,
components và variants phải nằm trong chính file này. Khóa page
`99 — Raw Imports`; chỉ dùng các layer import làm tài liệu đối chiếu.

## Danh sách capture

Dùng `html.to.design` và browser extension để capture localhost. Mỗi lượt import
cả desktop `1440 × 900` và mobile `390 × 844`.

| # | Archetype | Route |
| --- | --- | --- |
| 1 | Home | `/` |
| 2 | Search | `/search?q=an` |
| 3 | Voucher detail | `/vouchers/voucher-1` |
| 4 | Login | `/login` |
| 5 | Cart | `/cart` |
| 6 | Checkout | `/checkout` |
| 7 | Partner dashboard | `/partner` |
| 8 | Partner voucher editor | `/partner/vouchers/voucher-1/edit` |
| 9 | Partner redeem | `/partner/redeem` |
| 10 | Admin users | `/admin/users` |

Sau khi import, chuyển raw frame vào `99 — Raw Imports`, đặt tên
`RAW/<route>/<viewport>/<commit-sha>` và khóa frame.

## Dọn và component hóa

Không dùng trực tiếp raw import làm màn hình Current. Dựng lại bằng Auto Layout,
constraints và local variables/styles:

- Foundations: màu, typography, spacing, radius và shadow.
- Controls: button, input, select, pagination.
- Feedback: badge, modal, toast.
- Content: voucher card và table.
- Navigation: header, footer và sidebar.

Tạo variants cho size, state và role khi có ý nghĩa. Dùng các component đã chuẩn
hóa để lắp các màn hình MVP chưa capture: partner profile, partner reports,
admin orders, partner voucher list/new và các trang duyệt admin.

Mỗi frame Current phải có annotation gồm route, viewport, trạng thái dữ liệu và
commit SHA. Ví dụ:

```text
CURRENT/Admin users/Desktop
route=/admin/users | viewport=1440x900 | state=mock-populated | sha=abc1234
```

## Quy trình cộng tác

1. Duplicate frame `Current` sang `90 — Proposals`.
2. Đặt tên `PROPOSAL/<issue-id>/<screen>` và chỉnh trên bản duplicate.
3. Dùng Figma comments để review; thiết kế được duyệt phải liên kết GitHub issue.
4. Developer triển khai React trên branch riêng và mở pull request.
5. Sau khi merge, chạy lại Design Preview, capture lại, cập nhật frame `Current`
   cùng commit SHA rồi lưu bản cũ trong lịch sử file.

Mọi thành viên cần quyền `Can edit` trên file. Một đề xuất chưa được merge vào
React không được thay thế frame Current.

## Checklist nghiệm thu hình ảnh

- Không tràn ngang ở `1440 × 900` và `390 × 844`.
- Header/sidebar và thao tác chính dùng được bằng chuột lẫn bàn phím.
- Font, icon và ảnh tải thành công.
- Không có request tới backend trong Design Preview.
- Frame sạch dùng component/local variables; raw import đã khóa.
- Annotation route, viewport, state và commit SHA đầy đủ.
