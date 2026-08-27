"""Voucher Data Enricher & Branch Relation Generator Tool
EC-VoucherHub - Thư mục: crawl/

Chức năng:
1. Tính toán và điền 100% dữ liệu sạch cho bảng `voucher_products` trong `crawl/vouchers.csv`:
   - `id`: UUID duy nhất.
   - `sale_start` & `sale_end`:
     - Nếu voucher còn hạn sử dụng (usage_end >= Hiện tại): sale_start từ ngày mở chiến dịch (trước hiện tại), sale_end kéo dài đến đúng ngày hết hạn voucher (usage_end) để khách mua được trên web.
     - Nếu voucher đã hết hạn trong quá khứ: sale_end theo mốc cũ trong quá khứ.
   - `remaining_quantity`: Tồn kho thực tế từ 2 đến 99 (> 0 cho voucher ON_SALE).
   - `total_quantity`: Số lượng đã bán thật + remaining_quantity.
   - `uses_per_code` & `is_multi_use`: Phân tầng theo giá bán:
     - Giá >= 1.500.000đ -> uses_per_code = 1 (is_multi_use = false)
     - Giá 800.000đ - 1.499.999đ -> uses_per_code = 2 (is_multi_use = true)
     - Giá 300.000đ - 799.999đ -> uses_per_code = 3 (is_multi_use = true)
     - Giá 100.000đ - 299.999đ -> uses_per_code = 4 (is_multi_use = true)
     - Giá < 100.000đ -> uses_per_code = 5 (is_multi_use = true)
   - `status`: Khớp 100% Enum `VoucherStatus` của Database:
     - **'ON_SALE'**: Cho các voucher còn hạn sử dụng để hiển thị và mua bán được trên web.
     - **'DISCONTINUED'**: Cho các voucher đã hết hạn trong quá khứ.
2. Sinh file bảng nối `crawl/voucher_product_branches.csv` (voucher_product_id, branch_id) liên kết voucher với các chi nhánh áp dụng.
"""

from __future__ import annotations

import csv
import random
import re
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Hỗ trợ UTF-8 tiếng Việt
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

CRAWL_DIR = Path(__file__).resolve().parent
VOUCHERS_CSV_PATH = CRAWL_DIR / "vouchers.csv"
BRANCHES_CSV_PATH = CRAWL_DIR / "branches.csv"
VOUCHER_BRANCHES_CSV_PATH = CRAWL_DIR / "voucher_product_branches.csv"

VOUCHER_BRANCH_COLUMNS = (
    "voucher_product_id",
    "branch_id",
)


def parse_iso_datetime(iso_str: str) -> datetime | None:
    """Parse chuỗi ISO datetime sang timezone-aware UTC datetime."""
    if not iso_str or iso_str == "MISS":
        return None
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def format_iso(dt: datetime) -> str:
    """Format datetime sang định dạng ISO UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def enrich_vouchers_and_generate_branches() -> None:
    """Điền hoàn chỉnh vouchers.csv và xuất voucher_product_branches.csv."""
    if not VOUCHERS_CSV_PATH.exists():
        print(f"[LỖI] Không tìm thấy file {VOUCHERS_CSV_PATH.name}", file=sys.stderr)
        return

    voucher_rows: list[dict[str, str]] = []
    with VOUCHERS_CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        for r in reader:
            voucher_rows.append(r)

    # Đọc danh sách chi nhánh theo từng partner_id
    partner_branches: dict[str, list[str]] = defaultdict(list)
    if BRANCHES_CSV_PATH.exists():
        with BRANCHES_CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
            b_reader = csv.DictReader(f)
            for b_row in b_reader:
                pid = b_row.get("partner_id", "")
                bid = b_row.get("id", "")
                if pid and bid:
                    partner_branches[pid].append(bid)

    # Đặt seed cố định để kết quả luôn ổn định
    random.seed(42)

    updated_vouchers: list[dict[str, str]] = []
    voucher_branch_links: list[dict[str, str]] = []

    now_utc = datetime.now(timezone.utc)

    for row in voucher_rows:
        # 1. Đảm bảo ID UUID cho voucher
        v_id = row.get("id", "")
        if not v_id or v_id == "MISS":
            v_id = str(uuid.uuid4())
            row["id"] = v_id

        # 2. Xử lý giá bán sale_price và original_price (đảm bảo sale_price < original_price)
        raw_sale_price = row.get("sale_price", "0")
        try:
            sale_price = float(re.sub(r"[^\d.]", "", raw_sale_price))
        except ValueError:
            sale_price = 100000.0

        raw_orig_price = row.get("original_price", "0")
        try:
            orig_price = float(re.sub(r"[^\d.]", "", raw_orig_price))
        except ValueError:
            orig_price = sale_price * 1.25

        if sale_price >= orig_price or orig_price <= 0:
            orig_price = sale_price * 1.25

        row["sale_price"] = f"{sale_price:.2f}"
        row["original_price"] = f"{orig_price:.2f}"

        # 3. Xử lý uses_per_code & is_multi_use theo phân tầng giá
        if sale_price >= 1_500_000:
            uses_per_code = 1
            is_multi_use = "false"
        elif sale_price >= 800_000:
            uses_per_code = 2
            is_multi_use = "true"
        elif sale_price >= 300_000:
            uses_per_code = 3
            is_multi_use = "true"
        elif sale_price >= 100_000:
            uses_per_code = 4
            is_multi_use = "true"
        else:
            uses_per_code = 5
            is_multi_use = "true"

        row["uses_per_code"] = str(uses_per_code)
        row["is_multi_use"] = is_multi_use

        # 4. Xử lý thời gian sử dụng (usage_start & usage_end)
        u_start = parse_iso_datetime(row.get("usage_start", ""))
        u_end = parse_iso_datetime(row.get("usage_end", ""))

        if u_start is None and u_end is not None:
            u_start = u_end - timedelta(days=60)
            row["usage_start"] = format_iso(u_start)
        elif u_start is None and u_end is None:
            # Nếu web không ghi ngày, gán hạn dùng trong tương lai đến 31/12/2026
            u_start = datetime(2026, 8, 1, 0, 0, 0, tzinfo=timezone.utc)
            u_end = datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
            row["usage_start"] = format_iso(u_start)
            row["usage_end"] = format_iso(u_end)
        elif u_start is not None and u_end is None:
            u_end = u_start + timedelta(days=90)
            row["usage_end"] = format_iso(u_end)

        # 5. Xử lý thời gian mở bán (sale_start & sale_end) và trạng thái (status)
        is_still_valid = u_end is not None and u_end >= now_utc

        if is_still_valid:
            # Voucher CÒN HẠN: Mở bán trên sàn để khách mua được ngay
            # sale_start: từ 15 ngày trước hoặc từ usage_start
            s_start = min(u_start if u_start else now_utc, now_utc - timedelta(days=15))
            # sale_end: bán đến tận ngày hết hạn sử dụng voucher (usage_end)
            s_end = u_end

            row["sale_start"] = format_iso(s_start)
            row["sale_end"] = format_iso(s_end)
            row["status"] = "on_sale"  # Enum VoucherStatus chuẩn: on_sale

            # Tồn kho hợp lệ > 0
            rem_qty = random.randint(2, 99)
            row["remaining_quantity"] = str(rem_qty)
        else:
            # Voucher ĐÃ HẾT HẠN trong quá khứ (ví dụ bài viết 2020-2021)
            s_start = u_start - timedelta(days=30) if u_start else u_end - timedelta(days=60)
            s_end = u_end if u_end else now_utc - timedelta(days=30)

            row["sale_start"] = format_iso(s_start)
            row["sale_end"] = format_iso(s_end)
            row["status"] = "discontinued"  # Enum VoucherStatus chuẩn: discontinued

            row["remaining_quantity"] = "0"

        # 6. Tổng số lượng phát hành (total_quantity)
        raw_total_qty = row.get("total_quantity", "")
        clean_total_digits = re.sub(r"\D", "", raw_total_qty)
        current_rem = int(row["remaining_quantity"])
        if clean_total_digits:
            total_qty = max(int(clean_total_digits) + current_rem, current_rem + 10)
        else:
            total_qty = current_rem + random.randint(20, 80)
        row["total_quantity"] = str(total_qty)

        # 7. Timestamps
        row["created_at"] = row.get("created_at") or "2026-08-26T00:00:00.000Z"
        row["updated_at"] = row.get("updated_at") or "2026-08-26T00:00:00.000Z"

        updated_vouchers.append(row)

        # 7. Tạo liên kết voucher <-> chi nhánh trong voucher_product_branches
        p_id = row.get("partner_id", "")
        branches = partner_branches.get(p_id, [])
        for b_id in branches:
            voucher_branch_links.append({
                "voucher_product_id": v_id,
                "branch_id": str(b_id),
            })

    # 1. Ghi lại file vouchers.csv
    with VOUCHERS_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(updated_vouchers)
    print(f" ĐÃ CẬP NHẬT '{VOUCHERS_CSV_PATH.name}' ({len(updated_vouchers)} voucher - Enum ON_SALE/DISCONTINUED chuẩn).")

    # 2. Ghi file voucher_product_branches.csv
    with VOUCHER_BRANCHES_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=VOUCHER_BRANCH_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(voucher_branch_links)
    print(f" ĐÃ XUẤT THÀNH CÔNG '{VOUCHER_BRANCHES_CSV_PATH.name}' ({len(voucher_branch_links)} liên kết chi nhánh áp dụng).")


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Voucher Data Enricher & Branch Relation Generator Tool")
    parser.add_argument("--dir", type=str, default="", help="Thư mục làm việc chứa CSV (ví dụ: crawl/web1, crawl/web2)")
    args = parser.parse_args()

    global VOUCHERS_CSV_PATH, BRANCHES_CSV_PATH, VOUCHER_BRANCHES_CSV_PATH
    if args.dir:
        d = Path(args.dir).resolve()
        VOUCHERS_CSV_PATH = d / "vouchers.csv"
        BRANCHES_CSV_PATH = d / "branches.csv"
        VOUCHER_BRANCHES_CSV_PATH = d / "voucher_product_branches.csv"

    enrich_vouchers_and_generate_branches()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
