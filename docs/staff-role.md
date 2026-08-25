# Vai trò nhân viên đối tác (STAFF)

## Mô hình dữ liệu

- `users`: thông tin đăng nhập chung; tài khoản nhân viên mang role `STAFF`.
- `partner_staff`: liên kết một tài khoản nhân viên với đúng một đối tác và lưu trạng thái `ACTIVE/INACTIVE`.
- `partner_staff_branches`: bảng nối nhiều-nhiều; một nhân viên có thể được phân công nhiều chi nhánh.

## Quyền của chủ đối tác

- `GET /api/partner/staff`: xem nhân viên thuộc đối tác hiện tại.
- `POST /api/partner/staff`: tạo tài khoản và phân công ít nhất một chi nhánh đang hoạt động.
- `PATCH /api/partner/staff/:id`: sửa thông tin, đổi mật khẩu, phân công lại chi nhánh, khóa/mở khóa hoặc ngừng/kích hoạt nhân viên.
- Không thể đọc hoặc cập nhật nhân viên của đối tác khác.
- Không thể xóa chi nhánh khi chi nhánh vẫn đang được phân công cho nhân viên.

## Quyền của nhân viên

- Đăng nhập bằng luồng đăng nhập chung.
- Chỉ truy cập trang `/partner/redeem`.
- Chỉ nhìn thấy các chi nhánh được phân công và đang hoạt động.
- Chỉ xác nhận sử dụng voucher của đúng đối tác và tại đúng chi nhánh được phân công.
- Có thể nhập mã hoặc quét QR bằng camera trên trang xác nhận sử dụng.
- Không được quản lý hồ sơ, chi nhánh, voucher, báo cáo hoặc nhân viên.

## Tài khoản demo

Sau khi chạy seed:

- Email: `staff@highlands.example`
- Mật khẩu: giá trị `DEMO_PASSWORD` trong `backend/prisma/seed/constants.ts`
- Phân công: hai chi nhánh Highlands trong dữ liệu demo.

## Cập nhật database

Chạy từ thư mục gốc:

```bash
npm run db:deploy --workspace=backend
npm run db:seed --workspace=backend
```

Lưu ý: lệnh seed xóa và tạo lại toàn bộ dữ liệu demo.
