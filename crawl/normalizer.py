"""Voucher Normalizer & Dynamic Category Auto-Discovery Tool
EC-VoucherHub - Thư mục: crawl/

Chức năng:
1. Đọc dữ liệu thô từ `crawl/dataCrawl.csv` (dữ liệu cào từ bất kỳ web nào).
2. Tự động nhận diện ngành nghề & kích hoạt Cơ chế Tự động sinh thêm Danh mục mới (Auto-Discovery):
   - Bắt đầu từ 10 danh mục chuẩn của Database (ID 1-10).
   - Nếu phát hiện sản phẩm thuộc ngành nghề mới chưa có trong Database (VD: Giáo Dục & Khóa Học, Mẹ & Bé, Công Nghệ, Thời Trang, Thú Cưng, Vé Phim...):
     -> Tự động cấp ID tiếp theo (11, 12, 13...) và tự động ghi thêm vào file `crawl/categories.csv`.
3. Chuẩn hóa theo đúng cấu trúc bảng `voucher_products` trong Prisma schema:
   - id: UUID duy nhất
   - partner_id: UUID từ partners.csv
   - category_id: Gán số ID tương ứng (1-10 hoặc ID mới tự sinh)
   - name: Tiêu đề voucher
   - description: Điểm nổi bật & điều kiện sử dụng
   - image_url: Link ảnh CDN thật từ raw_image_url
   - original_price: Giá gốc (số)
   - sale_price: Giá bán khuyến mãi (số)
   - sale_start, sale_end, usage_start, usage_end: Chuỗi thời gian ISO UTC
   - total_quantity, remaining_quantity: Số nguyên
   - is_multi_use: Boolean
   - uses_per_code: Số nguyên
   - status: 'on_sale' / 'discontinued'
   - created_at, updated_at: Mốc thời gian ISO UTC
4. Lưu kết quả ra file `crawl/vouchers.csv` và `crawl/categories.csv`.
"""

from __future__ import annotations

import csv
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Hỗ trợ hiển thị tiếng Việt UTF-8
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

CRAWL_DIR = Path(__file__).resolve().parent
RAW_CRAWL_CSV_PATH = CRAWL_DIR / "dataCrawl.csv"
VOUCHERS_CSV_PATH = CRAWL_DIR / "vouchers.csv"
CATEGORIES_CSV_PATH = CRAWL_DIR / "categories.csv"
PARTNERS_CSV_PATH = CRAWL_DIR / "partners.csv"

VOUCHER_PRODUCT_COLUMNS = (
    "id",
    "partner_id",
    "category_id",
    "name",
    "description",
    "image_url",
    "original_price",
    "sale_price",
    "sale_start",
    "sale_end",
    "usage_start",
    "usage_end",
    "total_quantity",
    "remaining_quantity",
    "is_multi_use",
    "uses_per_code",
    "status",
    "created_at",
    "updated_at",
)

# 10 Danh mục cơ sở chuẩn trên Database của người dùng
BASE_DB_CATEGORIES = [
    {"id": 1, "name": "Ẩm Thực", "parent_id": ""},
    {"id": 2, "name": "Tour du lịch", "parent_id": ""},
    {"id": 3, "name": "Spa & Làm đẹp", "parent_id": ""},
    {"id": 4, "name": "Cà phê & Trà sữa", "parent_id": "1"},
    {"id": 5, "name": "Buffet", "parent_id": ""},
    {"id": 6, "name": "Mua sắm", "parent_id": ""},
    {"id": 7, "name": "Giải Trí & Thể Thao", "parent_id": ""},
    {"id": 8, "name": "Massage Nam Nữ", "parent_id": ""},
    {"id": 9, "name": "Nha Khoa", "parent_id": ""},
    {"id": 10, "name": "Hotel & Resort", "parent_id": ""},
]


class DynamicCategoryManager:
    """Quản lý danh mục động: Giữ 10 danh mục gốc và tự sinh ID mới khi phát hiện ngành nghề lạ."""

    def __init__(self) -> None:
        self.categories: list[dict[str, str | int]] = [dict(c) for c in BASE_DB_CATEGORIES]
        self.name_to_id: dict[str, int] = {str(c["name"]).lower(): int(c["id"]) for c in self.categories}
        self.max_id: int = max(int(c["id"]) for c in self.categories)

    def get_or_create(self, category_name: str, parent_id: str = "") -> int:
        """Lấy ID nếu đã có, hoặc tự động sinh ID mới tiếp theo nếu là danh mục mới."""
        clean_name = category_name.strip()
        name_key = clean_name.lower()
        if name_key in self.name_to_id:
            return self.name_to_id[name_key]

        self.max_id += 1
        new_cat = {
            "id": self.max_id,
            "name": clean_name,
            "parent_id": parent_id,
        }
        self.categories.append(new_cat)
        self.name_to_id[name_key] = self.max_id
        print(f"✨ [Auto-Discovery] Phát hiện ngành nghề mới: '{clean_name}' -> Đã tự động cấp category_id = {self.max_id}")
        return self.max_id

    def export_csv(self, file_path: Path) -> None:
        """Xuất toàn bộ danh sách danh mục và file danh mục mới riêng biệt nếu có."""
        with file_path.open("w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["id", "name", "parent_id"], quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(self.categories)
        print(f"Đã xuất '{file_path.name}' (Tổng cộng {len(self.categories)} danh mục bao gồm Auto-Discovery).")

        # Tự động xuất thêm file chỉ chứa các danh mục mới sinh (ID > 10)
        new_only = [c for c in self.categories if int(c["id"]) > 10]
        if new_only:
            new_file_path = file_path.parent / "new_categories_only.csv"
            with new_file_path.open("w", encoding="utf-8-sig", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=["id", "name", "parent_id"], quoting=csv.QUOTE_ALL)
                writer.writeheader()
                writer.writerows(new_only)
            print(f"✨ Đã xuất riêng '{new_file_path.name}' (Chỉ gồm {len(new_only)} danh mục mới sinh để import an toàn vào DB).")


def clean_single_line_text(value: str | None) -> str:
    """Loại bỏ ký tự xuống dòng (\n, \r), gộp khoảng trắng thừa thành 1 dòng duy nhất."""
    if not value:
        return ""
    text = re.sub(r"[\r\n\t\s]+", " ", str(value))
    return text.strip()


def parse_usage_dates(conditions_text: str) -> tuple[str, str]:
    """Trích xuất ngày bắt đầu và kết thúc sử dụng từ điều kiện của voucher sang định dạng ISO."""
    text = conditions_text or ""

    # Dạng: "từ DD/MM/YYYY đến DD/MM/YYYY"
    m1 = re.search(r"từ\s*(?:ngày\s*)?(\d{1,2}/\d{1,2}/\d{4})\s*đến\s*(?:ngày\s*)?(\d{1,2}/\d{1,2}/\d{4})", text, re.IGNORECASE)
    if m1:
        try:
            d_start = datetime.strptime(m1.group(1), "%d/%m/%Y").replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT00:00:00.000Z")
            d_end = datetime.strptime(m1.group(2), "%d/%m/%Y").replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT23:59:59.000Z")
            return d_start, d_end
        except Exception:
            pass

    # Dạng: "đến/hết ngày DD/MM/YYYY"
    m2 = re.search(r"(?:đến|hết)\s*(?:ngày\s*)?(\d{1,2}/\d{1,2}/\d{4})", text, re.IGNORECASE)
    if m2:
        try:
            d_end = datetime.strptime(m2.group(1), "%d/%m/%Y").replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT23:59:59.000Z")
            return "", d_end
        except Exception:
            pass

    return "", ""


def classify_category_id(name: str, url: str, cat_mgr: DynamicCategoryManager) -> int:
    """Tự động phân loại danh mục hoặc tự sinh thêm danh mục mới khi phát hiện ngành nghề lạ."""
    n = name.lower()
    u = url.lower()

    # 1. Phát hiện các ngành nghề mới (Auto-Discovery ID 11+)
    if any(k in n or k in u for k in ("sân bay", "phòng chờ", "champ lounge", "fast lane", "evisa")):
        return cat_mgr.get_or_create("Dịch Vụ Sân Bay & Phòng Chờ")

    if any(k in n or k in u for k in ("vé tàu", "tàu hỏa", "the hanoi train", "damitrans", "xe khách", "hạnh café", "betransport", "bedelivery", "grab", "green sm", "xanh sm", "city sightseeing", "cáp treo")):
        return cat_mgr.get_or_create("Vận Tải & Di Chuyển")

    if any(k in n or k in u for k in ("minishow", "concert", "đêm nhạc", "show thực cảnh", "tinh hoa bắc bộ", "anh hùng cờ lau", "hoa lư vũ họa", "charming đà nẵng", "chèo cổ", "triều trần", "nhà hát")):
        return cat_mgr.get_or_create("Vé Xem Phim & Sự Kiện Âm Nhạc")

    if any(k in u or k in n for k in ("khóa học", "khoa-hoc", "học tiếng", "ielts", "tiếng anh", "luyện thi", "đào tạo", "gia sư")):
        return cat_mgr.get_or_create("Giáo Dục & Khóa Học")

    if any(k in u or k in n for k in ("mẹ & bé", "mẹ và bé", "me-va-be", "tã bỉm", "sữa bột")):
        return cat_mgr.get_or_create("Mẹ & Bé")

    if any(k in u or k in n for k in ("thú cưng", "thu-cung", "pet spa", "chó mèo")):
        return cat_mgr.get_or_create("Chăm Sóc Thú Cưng")

    # 2. 10 Danh mục chuẩn có sẵn trong Database
    if any(k in n or k in u for k in ("cà phê", "coffee", "trà sữa", "tocotoco", "chuk", "gong cha", "cộng cà phê", "paris baguette", "breadtalk", "beard papa", "tiệm bánh", "kem", "tráng miệng", "donuts")):
        return 4  # Cà phê & Trà sữa

    if any(k in n or k in u for k in ("buffet", "spicy box", "lẩu tự chọn", "sen 20 hàng tre", "sen hàng tre")):
        return 5  # Buffet

    if any(k in n or k in u for k in ("lotte mart", "gs25", "k-market", "bác tôm", "locknlock", "lock&lock", "socnbrothers", "doji", "pnj", "vàng bạc", "trang sức", "thời trang", "ninh khương", "marc", "rabity", "dottie", "hoa tươi", "hoa yêu thương", "beloved", "liti florist", "potico", "điện máy", "chợ lớn", "giày", "extrim", "quần áo", "túi xách", "đồng hồ")):
        return 6  # Mua sắm

    if any(k in n or k in u for k in ("du thuyền", "cruise", "tour", "ngắm sông", "chèo sup", "dù lượn", "mebayluon", "cầu kính rồng mây")):
        return 2  # Tour du lịch

    if any(k in n or k in u for k in ("resort", "khách sạn", "hotel", "nghỉ dưỡng", "homestay", "wyndham", "thanh thủy", "2n1đ", "3n2đ")):
        return 10  # Hotel & Resort

    if any(k in n or k in u for k in ("kidzooona", "tiniworld", "sâu kid", "lotty friends", "vinwonders", "sun world", "sunworld", "bảo sơn", "tuần châu", "đồi rồng", "bát tràng", "bảo tàng", "sơn tiên", "aqua park", "mikazuki", "công viên nước", "life4cuts", "gym", "pilates", "triển lãm")):
        return 7  # Giải Trí & Thể Thao

    if any(k in n or k in u for k in ("nha khoa", "dental", "trám răng", "tẩy trắng răng", "cạo vôi", "răng sứ")):
        return 9  # Nha Khoa

    if any(k in n or k in u for k in ("massage", "đả thông kinh lạc", "ngâm chân")):
        return 8  # Massage Nam Nữ

    if any(k in n or k in u for k in ("ngọc dung", "thẩm mỹ", "spa", "làm đẹp", "chăm sóc da", "tiem-nail", "nail", "móng", "gội đầu", "cắt tóc", "hair salon", "trị mụn", "triệt lông", "diab", "sức khỏe")):
        return 3  # Spa & Làm đẹp

    # Mặc định về Ẩm Thực (ID: 1)
    return 1


def normalize_dataset() -> None:
    """Chuẩn hóa dữ liệu từ dataCrawl.csv thành vouchers.csv và tự sinh categories.csv."""
    if not RAW_CRAWL_CSV_PATH.exists():
        print(f"[LỖI] Không tìm thấy file {RAW_CRAWL_CSV_PATH.name}", file=sys.stderr)
        return

    cat_mgr = DynamicCategoryManager()
    normalized_rows: list[dict[str, str]] = []

    with RAW_CRAWL_CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_name = clean_single_line_text(row.get("raw_name", ""))
            raw_desc = clean_single_line_text(row.get("raw_description", ""))
            raw_conditions = clean_single_line_text(row.get("raw_conditions", ""))
            raw_img = clean_single_line_text(row.get("raw_image_url", "") or row.get("image_url", ""))
            raw_orig_price = clean_single_line_text(row.get("raw_original_price", "") or row.get("original_price", ""))
            raw_sale_price = clean_single_line_text(row.get("raw_sale_price", "") or row.get("sale_price", ""))
            raw_purchases = clean_single_line_text(row.get("raw_purchases", ""))
            detail_url = clean_single_line_text(row.get("detail_url", ""))

            # Mô tả = Ghép Điểm nổi bật + Điều kiện sử dụng
            description_parts = []
            if raw_desc:
                description_parts.append(raw_desc)
            if raw_conditions:
                description_parts.append(raw_conditions)
            description = " | ".join(description_parts) if description_parts else raw_name

            # Phân loại category_id với cơ chế Dynamic Auto-Discovery
            category_id = str(classify_category_id(raw_name, detail_url, cat_mgr))

            # Trích xuất hạn sử dụng ISO
            usage_start, usage_end = parse_usage_dates(raw_conditions)

            # Lấy số nguyên cho giá
            orig_p_digits = re.sub(r"[^\d.]", "", raw_orig_price)
            sale_p_digits = re.sub(r"[^\d.]", "", raw_sale_price)

            # Số lượng đã mua (chỉ lấy số nguyên)
            total_qty_digits = re.sub(r"\D", "", raw_purchases)

            voucher_id = str(uuid.uuid4())

            normalized_rows.append({
                "id": voucher_id,
                "partner_id": "",
                "category_id": category_id,
                "name": raw_name,
                "description": description,
                "image_url": raw_img,
                "original_price": orig_p_digits if orig_p_digits else "0",
                "sale_price": sale_p_digits if sale_p_digits else "0",
                "sale_start": "",
                "sale_end": "",
                "usage_start": usage_start,
                "usage_end": usage_end,
                "total_quantity": total_qty_digits if total_qty_digits else "0",
                "remaining_quantity": "",
                "is_multi_use": "false",
                "uses_per_code": "",
                "status": "on_sale",
                "created_at": "2026-08-26T00:00:00.000Z",
                "updated_at": "2026-08-26T00:00:00.000Z",
            })

    # 1. Xuất file categories.csv (kèm các danh mục mới sinh ra nếu có)
    cat_mgr.export_csv(CATEGORIES_CSV_PATH)

    # 2. Ghi ra vouchers.csv
    with VOUCHERS_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=VOUCHER_PRODUCT_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(normalized_rows)

    print(f"Đã chuẩn hóa {len(normalized_rows)} voucher vào '{VOUCHERS_CSV_PATH.name}'.")


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Voucher Normalizer & Dynamic Category Auto-Discovery Tool")
    parser.add_argument("--dir", type=str, default="", help="Thư mục làm việc chứa CSV (ví dụ: crawl/web1, crawl/web2)")
    args = parser.parse_args()

    global RAW_CRAWL_CSV_PATH, VOUCHERS_CSV_PATH, CATEGORIES_CSV_PATH, PARTNERS_CSV_PATH
    if args.dir:
        d = Path(args.dir).resolve()
        RAW_CRAWL_CSV_PATH = d / "dataCrawl.csv"
        VOUCHERS_CSV_PATH = d / "vouchers.csv"
        CATEGORIES_CSV_PATH = d / "categories.csv"
        PARTNERS_CSV_PATH = d / "partners.csv"

    normalize_dataset()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
