"""Crawl & Data Normalization Pipeline Tool
EC-VoucherHub - Thư mục: crawl/

Chức năng:
Chạy toàn bộ quy trình tự động từ A-Z theo từng trang web riêng biệt:
1. Cào dữ liệu từ URL mục tiêu (voucher_crawler.py) -> crawl/<site>/dataCrawl.csv
2. Chuẩn hóa voucher & Auto-Discovery danh mục (normalizer.py) -> crawl/<site>/vouchers.csv, crawl/<site>/categories.csv
3. Sinh tài khoản & đối tác & chi nhánh (generate_partners.py) -> crawl/<site>/users.csv, crawl/<site>/partners.csv, crawl/<site>/branches.csv
4. Làm giàu dữ liệu, khớp Enum, timestamps & sinh bảng nối (fill_missing_data.py) -> crawl/<site>/vouchers.csv, crawl/<site>/voucher_product_branches.csv

Cách dùng:
    # 1. Cào web mới (ví dụ web2) không sợ ghi đè dữ liệu cũ:
    python crawl/pipeline.py --url https://example.com/deals --site web2

    # 2. Xử lý lại nội bộ một web đã có:
    python crawl/pipeline.py --skip-crawl --site web1
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

# Hỗ trợ UTF-8 tiếng Việt
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

CRAWL_DIR = Path(__file__).resolve().parent
PYTHON_EXE = sys.executable


def run_command(script_name: str, args: list[str] | None = None) -> None:
    """Thực thi một tool python trong thư mục crawl/."""
    script_path = CRAWL_DIR / script_name
    cmd = [PYTHON_EXE, str(script_path)]
    if args:
        cmd.extend(args)

    print(f"\n▶ ĐANG CHẠY: {script_name}...")
    result = subprocess.run(cmd, check=True)
    if result.returncode != 0:
        print(f"[LỖI] Tool '{script_name}' thất bại với mã lỗi {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def main() -> int:
    parser = argparse.ArgumentParser(description="EC-VoucherHub Multi-Site Crawl & Data Pipeline")
    parser.add_argument("--url", type=str, default="", help="URL mục tiêu cần cào")
    parser.add_argument("--site", type=str, default="web1", help="Tên thư mục lưu dữ liệu web (ví dụ: web1, web2, web3...)")
    parser.add_argument("--skip-crawl", action="store_true", help="Bỏ qua bước cào, chỉ chuẩn hóa lại từ dataCrawl.csv có sẵn trong thư mục web")
    args = parser.parse_args()

    site_dir = CRAWL_DIR / args.site
    site_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print(f"🚀 BẮT ĐẦU QUY TRÌNH XỬ LÝ DỮ LIỆU CÀO VOUCHER - SITE: [{args.site.upper()}]")
    print(f"📁 Thư mục lưu trữ: {site_dir}")
    print("=" * 60)

    # Bước 1: Cào dữ liệu
    if not args.skip_crawl and args.url:
        run_command("voucher_crawler.py", ["--urls", args.url, "--out-dir", str(site_dir)])
    elif not args.skip_crawl and not (site_dir / "dataCrawl.csv").exists():
        if args.site == "web1" and (CRAWL_DIR / "dataCrawl.csv").exists():
            # Copy từ root sang web1 nếu có
            import shutil
            shutil.copy(CRAWL_DIR / "dataCrawl.csv", site_dir / "dataCrawl.csv")
            print("⏩ Sử dụng dữ liệu dataCrawl.csv hiện có cho web1.")
        else:
            target_url = args.url or "https://www.hotdeal.vn/ho-chi-minh/"
            run_command("voucher_crawler.py", ["--urls", target_url, "--out-dir", str(site_dir)])
    else:
        print(f"⏩ Bỏ qua bước cào mạng (sử dụng dữ liệu dataCrawl.csv sẵn có trong '{args.site}').")

    # Bước 2: Chuẩn hóa voucher & category
    run_command("normalizer.py", ["--dir", str(site_dir)])

    # Bước 3: Sinh users, partners, branches và đồng bộ khóa ngoại
    run_command("generate_partners.py", ["--dir", str(site_dir)])

    # Bước 4: Điền đầy đủ dữ liệu thời gian mở bán, tồn kho, uses_per_code & sinh bảng nối
    run_command("fill_missing_data.py", ["--dir", str(site_dir)])

    print("\n" + "=" * 60)
    print(f" HOÀN THÀNH TẤT CẢ CÁC BƯỚC CHO [{args.site.upper()}] THÀNH CÔNG!")
    print(f"Bộ 6 file CSV đã được lưu an toàn tại thư mục '{args.site}':")
    print(f"  1. Bảng 'categories':                 {site_dir / 'categories.csv'}\n"
          f"  2. Bảng 'users':                      {site_dir / 'users.csv'}\n"
          f"  3. Bảng 'partners':                   {site_dir / 'partners.csv'}\n"
          f"  4. Bảng 'branches':                   {site_dir / 'branches.csv'}\n"
          f"  5. Bảng 'voucher_products':           {site_dir / 'vouchers.csv'}\n"
          f"  6. Bảng 'voucher_product_branches':   {site_dir / 'voucher_product_branches.csv'}\n"
          f"  7. Dữ liệu cào thô ban đầu:           {site_dir / 'dataCrawl.csv'}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
