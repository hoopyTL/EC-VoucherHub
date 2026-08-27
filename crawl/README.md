# EC-VoucherHub - Hướng Dẫn & Bộ Công Cụ Cào Dữ Liệu (crawl/)

Thư mục này chứa toàn bộ các công cụ Python để cào, bóc tách, chuẩn hóa và xuất dữ liệu voucher thành các file CSV sẵn sàng import trực tiếp 100% vào Database PostgreSQL theo đúng cấu trúc Prisma schema.

---

## 1. Danh sách các Tool trong thư mục `crawl/`

| Tool | File | Vị trí / Chức năng chính |
| :--- | :--- | :--- |
| **1. Universal Crawler** | [`voucher_crawler.py`](voucher_crawler.py) | Cào dữ liệu chi tiết thật 100% từ URL mục tiêu (hỗ trợ Hotdeal hoặc web khác), lưu vào `dataCrawl.csv`. |
| **2. Voucher Normalizer & Category Discovery** | [`normalizer.py`](normalizer.py) | Chuẩn hóa dữ liệu bảng `voucher_products` và **tự động phát hiện & sinh thêm danh mục mới (Auto-Discovery)** nếu gặp ngành nghề chưa có trong DB. |
| **3. Partner, User & Branch Generator** | [`generate_partners.py`](generate_partners.py) | **Tạo tài khoản `users.csv` (Mật khẩu Bcrypt, Phone UNIQUE, `role_id=3`, `status='active'`)**, hồ sơ đối tác `partners.csv`, chi nhánh `branches.csv` và đồng bộ `partner_id`. |
| **4. Data Enricher & Branch Relation** | [`fill_missing_data.py`](fill_missing_data.py) | Điền sạch 100% dữ liệu thời gian mở bán (`sale_start`/`sale_end`), tồn kho (`remaining_quantity`), `uses_per_code`, timestamps (`created_at`/`updated_at`) và **tạo bảng nối `voucher_product_branches.csv`**. |
| **5. Pipeline Orchestrator** | [`pipeline.py`](pipeline.py) | Chạy tự động toàn bộ quy trình từ cào mạng đến sinh tất cả các file CSV chỉ với 1 câu lệnh. |

---

## 2. Các điểm chuẩn hóa kỹ thuật quan trọng cho Database:
1. **Mật khẩu Đối tác (`users.csv`)**: Đã băm chuẩn **Bcrypt `$2b$10$...`** cho mật khẩu `12345678`, đảm bảo đăng nhập backend thành công.
2. **Số điện thoại (`users.csv`)**: Đảm bảo **100% UNIQUE**, không trùng lặp tránh vi phạm ràng buộc Unique Key trên DB.
3. **Role Đối tác (`users.csv`)**: Gán đúng `role_id = 3` (quyền PARTNER).
4. **Cơ chế Tự động sinh Danh mục (Auto-Discovery)**: Bắt đầu từ 10 danh mục chuẩn trên DB (ID 1-10). Nếu cào web khác có ngành nghề mới (Giáo Dục, Mẹ & Bé, Công Nghệ, Thú Cưng, Vé Phim...), tool tự cấp ID mới (11, 12...) và thêm vào `categories.csv`.
5. **Liên kết Chi nhánh (`voucher_product_branches.csv`)**: Tự động sinh bảng nối nhiều-nhiều liên kết `voucher_product_id` với toàn bộ `branch_id` tương ứng của đối tác.
6. **Đầy đủ Timestamps**: Bổ sung `created_at` và `updated_at` (ISO UTC) để không bị lỗi NOT NULL khi import.
7. **Giá trị Enum PostgreSQL**: Khớp chuẩn chữ thường (`active`, `approved`, `on_sale`, `discontinued`).

---

## 3. Cách chạy cào web khác hoặc cập nhật dữ liệu

### Cách 1: Chạy toàn bộ quy trình tự động (Khuyên dùng khi cào web mới)
```bash
python crawl/pipeline.py --url https://www.hotdeal.vn/ho-chi-minh/
```

### Cách 2: Chạy khi đã có sẵn file `dataCrawl.csv` (Chạy nội bộ không cào lại web)
```bash
python crawl/pipeline.py --skip-crawl
```

---

## 4. Thứ tự Import vào Database PostgreSQL (6 Bảng chuẩn)

| Thứ tự | File CSV | Bảng Database tương ứng | Mô tả dữ liệu |
| :---: | :--- | :--- | :--- |
| **1** | **[`categories.csv`](categories.csv)** | Bảng **`categories`** | Danh mục chuẩn theo DB (kèm danh mục mới nếu có). |
| **2** | **[`users.csv`](users.csv)** | Bảng **`users`** | 75 tài khoản đối tác (mật khẩu Bcrypt, phone UNIQUE, `role_id=3`, `status='active'`). |
| **3** | **[`partners.csv`](partners.csv)** | Bảng **`partners`** | 75 hồ sơ đối tác có `owner_user_id` trỏ sang `users.id`. |
| **4** | **[`branches.csv`](branches.csv)** | Bảng **`branches`** | 91 chi nhánh cơ sở có `partner_id` trỏ sang `partners.id`. |
| **5** | **[`vouchers.csv`](vouchers.csv)** | Bảng **`voucher_products`** | 129 voucher sạch 100% dữ liệu, có `id` UUID, `partner_id` và `category_id`. |
| **6** | **[`voucher_product_branches.csv`](voucher_product_branches.csv)** | Bảng **`voucher_product_branches`** | Bảng nối N-M gắn từng voucher với các chi nhánh áp dụng. |
