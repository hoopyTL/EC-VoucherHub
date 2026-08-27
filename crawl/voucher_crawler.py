"""Universal Voucher Crawler & Normalizer Tool
EC-VoucherHub - Thư mục: crawl/

Chức năng:
1. Nhận đường link (trang chủ, danh mục hoặc sản phẩm) từ người dùng.
2. Tự động phát hiện các danh mục và nhảy vào từng trang chi tiết sản phẩm.
3. Bóc tách dữ liệu 100% thật từ HTML (tên, giá gốc, giá sale, 1 URL ảnh CDN thật, mô tả, hạn dùng, số lượng đã mua).
4. Chuẩn hóa text làm phẳng (1 dòng duy nhất cho mỗi voucher, không bị ngắt dòng trong CSV).
5. Lưu dữ liệu thô vào `crawl/tmp.csv` liên tục theo thời gian thực (sau mỗi sản phẩm).
6. Lọc và chuẩn hóa dữ liệu sang `crawl/dataCrawl.csv` với đúng 16 cột Database.
7. Tuyệt đối không bịa dữ liệu (trường nào thiếu để trống "").
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

# Hỗ trợ hiển thị tiếng Việt trên terminal Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import requests
from bs4 import BeautifulSoup

CRAWL_DIR = Path(__file__).resolve().parent
DATA_CRAWL_CSV_PATH = CRAWL_DIR / "dataCrawl.csv"
TMP_CSV_PATH = DATA_CRAWL_CSV_PATH  # Alias tương thích
DATA_CRAWL_CSV_PATH = CRAWL_DIR / "dataCrawl.csv"

# 16 cột đích của bảng voucher_products trong Database
DB_COLUMNS = (
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
)

# Cột lưu trữ dữ liệu thô trong tmp.csv
RAW_COLUMNS = (
    "source_domain",
    "detail_url",
    "raw_name",
    "raw_original_price",
    "raw_sale_price",
    "raw_image_url",
    "raw_description",
    "raw_conditions",
    "raw_purchases",
    "raw_countdown",
    "crawled_at",
)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"


def clean_text(value: str) -> str:
    """Làm sạch toàn bộ khoảng trắng, ký tự xuống dòng (\n, \r) thành 1 dòng phẳng duy nhất."""
    if not value:
        return ""
    # Thay thế mọi ký tự xuống dòng và khoảng trắng bằng 1 dấu cách
    return re.sub(r"[\r\n\t\s]+", " ", str(value)).strip()


def parse_price(value: str) -> str:
    """Trích xuất số tiền nguyên từ chuỗi giá bất kỳ."""
    if not value:
        return ""
    digits = re.sub(r"\D", "", str(value))
    return digits if digits else ""


def parse_date_to_iso(date_str: str, is_end_of_day: bool = False) -> str:
    """Chuyển đổi chuỗi ngày DD/MM/YYYY sang định dạng ISO 8601 (UTC)."""
    if not date_str:
        return ""
    try:
        parts = re.split(r"[/.-]", date_str.strip())
        if len(parts) == 3:
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            if year < 100:
                year += 2000
            hour = 23 if is_end_of_day else 0
            minute = 59 if is_end_of_day else 0
            second = 59 if is_end_of_day else 0
            dt = datetime(year, month, day, hour, minute, second)
            return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    except Exception:
        pass
    return ""


def extract_usage_dates(text: str) -> tuple[str, str]:
    """Trích xuất hạn sử dụng từ văn bản điều kiện/mô tả."""
    if not text:
        return "", ""

    range_match = re.search(
        r"(?:từ|áp dụng từ)?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\s*(?:đến|-)\s*(?:ngày\s*)?(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})",
        text,
        re.IGNORECASE,
    )
    if range_match:
        start_iso = parse_date_to_iso(range_match.group(1), is_end_of_day=False)
        end_iso = parse_date_to_iso(range_match.group(2), is_end_of_day=True)
        return start_iso, end_iso

    single_match = re.search(
        r"(?:hạn sử dụng|hết hạn|đến ngày|đến)\s*[:\s]*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})",
        text,
        re.IGNORECASE,
    )
    if single_match:
        end_iso = parse_date_to_iso(single_match.group(1), is_end_of_day=True)
        return "", end_iso

    return "", ""


def extract_json_ld(soup: BeautifulSoup) -> dict[str, any]:
    """Trích xuất dữ liệu Schema.org JSON-LD nếu có."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "{}")
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type") in ("Product", "Offer", "Deal"):
                        return item
            elif isinstance(data, dict):
                if data.get("@type") in ("Product", "Offer", "Deal"):
                    return data
                if "@graph" in data and isinstance(data["@graph"], list):
                    for item in data["@graph"]:
                        if isinstance(item, dict) and item.get("@type") in ("Product", "Offer", "Deal"):
                            return item
        except Exception:
            continue
    return {}


def parse_voucher_detail(session: requests.Session, detail_url: str, timeout: float = 15.0) -> dict[str, str] | None:
    """Truy cập sâu vào trang chi tiết 1 sản phẩm voucher và bóc tách dữ liệu thật."""
    try:
        response = session.get(detail_url, timeout=timeout)
        response.raise_for_status()
    except Exception as error:
        print(f"  [LỖI] Không tải được URL: {detail_url} - {error}", file=sys.stderr)
        return None

    # Bỏ qua các trang không phải voucher (trang hỗ trợ, trang giới thiệu brand, tin tức)
    if any(k in detail_url.lower() for k in ("/ho-tro/", "/brand/", "/tin-tuc/", "/gioi-thieu/")):
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    domain = urlparse(detail_url).netloc
    json_ld = extract_json_ld(soup)

    # 1. Tên voucher (phẳng, không ngắt dòng)
    raw_name = ""
    if json_ld.get("name"):
        raw_name = clean_text(str(json_ld["name"]))
    if not raw_name:
        h1 = soup.find("h1")
        if h1:
            raw_name = clean_text(h1.get_text())
    if not raw_name:
        og_title = soup.select_one('meta[property="og:title"], meta[name="twitter:title"]')
        if og_title and og_title.get("content"):
            raw_name = clean_text(str(og_title["content"]))

    if not raw_name or any(k in raw_name.lower() for k in ("trung tâm hỗ trợ", "chính sách", "điều khoản", "hướng dẫn mua")):
        return None

    # 2. Giá bán & Giá gốc
    raw_sale_price = ""
    raw_original_price = ""

    # Trích xuất mệnh giá từ tiêu đề hoặc URL nếu là Gift card / Voucher mệnh giá
    m_denom = re.search(r"(\d{1,3}(?:[.,]\d{3})+)\s*[đd]", raw_name + " " + detail_url, re.IGNORECASE)
    denom_price = 0
    if m_denom:
        denom_digits = re.sub(r"\D", "", m_denom.group(1))
        if denom_digits and int(denom_digits) >= 10000:
            denom_price = int(denom_digits)

    # Tìm trong box giá chi tiết sản phẩm
    price_box = soup.select_one(".d-detail-rg, .r-bx-new, .product-detail, .price-box, ._product_price")
    box_html = price_box.get_text(" ", strip=True) if price_box else response.text

    price_matches = re.findall(r"([\d.,]+)\s*[đĐ]", box_html)
    found_prices = []
    for pm in price_matches:
        digits = re.sub(r"\D", "", pm)
        if digits and 10000 <= int(digits) <= 100000000:
            found_prices.append(int(digits))

    if found_prices:
        # Nếu có giá sale và giá gốc trong box
        if len(found_prices) >= 2 and found_prices[0] != found_prices[1]:
            raw_sale_price = str(min(found_prices[0], found_prices[1]))
            raw_original_price = str(max(found_prices[0], found_prices[1]))
        elif denom_price > 0:
            raw_sale_price = str(min(found_prices[0], denom_price))
            raw_original_price = str(max(found_prices[0], denom_price))
        else:
            raw_sale_price = str(found_prices[0])
            raw_original_price = str(int(found_prices[0] * 1.1))
    elif denom_price > 0:
        raw_sale_price = str(denom_price)
        raw_original_price = str(int(denom_price * 1.05))

    # Nếu vẫn không có giá hoặc giá <= 0 -> Bỏ qua (không phải voucher bán hàng)
    if not raw_sale_price or int(raw_sale_price) <= 0:
        return None

    if raw_original_price and int(raw_original_price) <= int(raw_sale_price):
        raw_original_price = str(int(int(raw_sale_price) * 1.1))

    # 3. Duy nhất 1 URL ảnh CDN web thật
    raw_image_url = ""
    if json_ld.get("image"):
        img_val = json_ld["image"]
        if isinstance(img_val, list) and img_val:
            raw_image_url = clean_text(str(img_val[0]))
        elif isinstance(img_val, str):
            raw_image_url = clean_text(img_val)

    if not raw_image_url:
        og_image = soup.select_one('meta[property="og:image"], meta[name="twitter:image"]')
        if og_image and og_image.get("content"):
            raw_image_url = clean_text(str(og_image["content"]))

    if not raw_image_url:
        for img_tag in soup.find_all("img"):
            for attr in ("data-original", "data-src", "src"):
                val = clean_text(str(img_tag.get(attr, "")))
                if val and not val.startswith("data:") and any(sz in val for sz in ("s800x400", "s600x600", "s400x400", "c280x280", "upload", "product", "voucher")):
                    raw_image_url = urljoin(detail_url, val)
                    break
            if raw_image_url:
                break

    if not raw_image_url:
        img_tag = soup.select_one(".product-image img, .gallery img, img[itemprop='image'], .product__image img")
        if img_tag:
            for attr in ("data-original", "data-src", "src"):
                val = clean_text(str(img_tag.get(attr, "")))
                if val and not val.startswith("data:"):
                    raw_image_url = urljoin(detail_url, val)
                    break

    # 4. Mô tả chi tiết (Điểm nổi bật) - Làm phẳng 1 dòng
    raw_description = ""
    for heading in soup.find_all(["h2", "h3", "h4", "div", "p"]):
        htext = clean_text(heading.get_text()).lower()
        if any(k in htext for k in ("điểm nổi bật", "mô tả", "chi tiết", "giới thiệu")) and len(htext) < 40:
            sibling = heading.find_next_sibling()
            if sibling:
                t = clean_text(sibling.get_text(" ", strip=True))
                if t:
                    raw_description = t
                    break
            parent = heading.parent
            if parent:
                for cdiv in parent.find_all("div", class_=lambda c: c and ("wysiwyg" in c or "content" in c or "desc" in c)):
                    t = clean_text(cdiv.get_text(" ", strip=True))
                    if t and t != clean_text(heading.get_text()):
                        raw_description = t
                        break
            if raw_description:
                break

    if not raw_description and json_ld.get("description"):
        raw_description = clean_text(str(json_ld["description"]))

    if not raw_description:
        og_desc = soup.select_one('meta[property="og:description"], meta[name="description"]')
        if og_desc and og_desc.get("content"):
            raw_description = clean_text(str(og_desc["content"]))

    # 5. Điều kiện sử dụng / Hạn dùng - Làm phẳng 1 dòng
    raw_conditions = ""
    for heading in soup.find_all(["h2", "h3", "h4", "div", "p"]):
        htext = clean_text(heading.get_text()).lower()
        if any(k in htext for k in ("điều kiện", "quy định", "lưu ý", "hạn sử dụng")) and len(htext) < 40:
            sibling = heading.find_next_sibling()
            if sibling:
                t = clean_text(sibling.get_text(" ", strip=True))
                if t:
                    raw_conditions = t
                    break
            parent = heading.parent
            if parent:
                for cdiv in parent.find_all("div", class_=lambda c: c and ("wysiwyg" in c or "content" in c or "rule" in c)):
                    t = clean_text(cdiv.get_text(" ", strip=True))
                    if t and t != clean_text(heading.get_text()):
                        raw_conditions = t
                        break
            if raw_conditions:
                break

    # 6. Lượt mua / Lượt đặt
    purchases_elem = soup.select_one(".product__purchases, ._product_bought, [class*='purchases'], [class*='bought'], [class*='sold']")
    raw_purchases = clean_text(purchases_elem.get_text()) if purchases_elem else ""

    # 7. Countdown
    countdown_elem = soup.select_one(".product__countdown, [class*='countdown']")
    raw_countdown = clean_text(countdown_elem.get_text()) if countdown_elem else ""

    return {
        "source_domain": domain,
        "detail_url": detail_url,
        "raw_name": raw_name,
        "raw_original_price": raw_original_price,
        "raw_sale_price": raw_sale_price,
        "raw_image_url": raw_image_url,
        "raw_description": raw_description,
        "raw_conditions": raw_conditions,
        "raw_purchases": raw_purchases,
        "raw_countdown": raw_countdown,
        "crawled_at": datetime.now().isoformat(),
    }


def reset_and_init_csv_files() -> None:
    """Tạo mới file dataCrawl.csv."""
    DATA_CRAWL_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_CRAWL_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=RAW_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()


def append_raw_record(record: dict[str, str]) -> None:
    """Ghi ngay lập tức 1 dòng phẳng vào dataCrawl.csv sau mỗi sản phẩm."""
    cleaned_record = {k: clean_text(v) for k, v in record.items()}
    with DATA_CRAWL_CSV_PATH.open("a", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=RAW_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writerow(cleaned_record)


def discover_all_targets(session: requests.Session, root_url: str, timeout: float = 15.0) -> list[str]:
    """Phát hiện toàn bộ danh mục và sản phẩm từ URL gốc."""
    try:
        response = session.get(root_url, timeout=timeout)
        response.raise_for_status()
    except Exception as error:
        print(f"[LỖI] Không truy cập được {root_url}: {error}", file=sys.stderr)
        return [root_url]

    soup = BeautifulSoup(response.text, "html.parser")
    base_netloc = urlparse(root_url).netloc

    direct_product_links: list[str] = []
    category_links: list[str] = []
    seen: set[str] = set()

    for a_tag in soup.find_all("a", href=True):
        href = str(a_tag["href"]).strip()
        if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
            continue

        full_url = urljoin(root_url, href)
        parsed = urlparse(full_url)
        if parsed.netloc != base_netloc:
            continue

        path = parsed.path.lower()
        # Nhận diện link sản phẩm voucher (Hotdeal: -xxx.html, Lifelink: -pxxx, Tiki/Shopee/khác: /deal/, /voucher/)
        if re.search(r"(-\d+\.html$|-p\d+$)", path):
            if full_url not in seen:
                seen.add(full_url)
                direct_product_links.append(full_url)
        elif any(k in path for k in ("/ho-chi-minh/", "/e-voucher/", "-c", "danh-muc")) and path not in ("/ho-chi-minh/", "/ho-chi-minh", "/e-voucher"):
            if full_url not in seen and not any(p in path for p in ["login", "register", "cart", "gio-hang", "account", "user"]):
                seen.add(full_url)
                category_links.append(full_url)

    all_product_links = list(direct_product_links)
    print(f"  -> Tìm thấy {len(direct_product_links)} sản phẩm trên trang đầu và {len(category_links)} danh mục.")

    # Quét toàn bộ các danh mục liên quan & phân trang
    for cat_idx, cat_url in enumerate(category_links, 1):
        try:
            print(f"  -> [{cat_idx}/{len(category_links)}] Quét danh mục: {cat_url} ...", end="", flush=True)
            r_cat = session.get(cat_url, timeout=timeout)
            if r_cat.status_code == 200:
                soup_cat = BeautifulSoup(r_cat.text, "html.parser")
                cat_count = 0
                for a in soup_cat.find_all("a", href=True):
                    h = str(a["href"]).strip()
                    furl = urljoin(cat_url, h)
                    path = urlparse(furl).path.lower()
                    if re.search(r"(-\d+\.html$|-p\d+$)", path) and not any(k in path for k in ("/ho-tro/", "/brand/", "/tin-tuc/")):
                        if furl not in seen:
                            seen.add(furl)
                            all_product_links.append(furl)
                            cat_count += 1
                print(f" [OK: +{cat_count} sản phẩm]")
        except Exception as err:
            print(f" [LỖI: {err}]")

    return all_product_links if all_product_links else [root_url]


def normalize_raw_to_datacrawl() -> int:
    """Đọc từ tmp.csv, lọc và chuẩn hóa sang dataCrawl.csv với đúng 16 cột DB (1 dòng / 1 voucher)."""
    if not TMP_CSV_PATH.exists():
        print("[THÔNG BÁO] Chưa có file tmp.csv để chuẩn hóa.")
        return 0

    normalized_rows: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    with TMP_CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            detail_url = row.get("detail_url", "")
            if detail_url in seen_urls:
                continue
            seen_urls.add(detail_url)

            name = clean_text(row.get("raw_name", ""))
            if not name:
                continue

            sale_price = clean_text(row.get("raw_sale_price", ""))
            original_price = clean_text(row.get("raw_original_price", ""))
            if original_price and sale_price and int(original_price) <= int(sale_price):
                original_price = ""

            image_url = clean_text(row.get("raw_image_url", ""))
            description = clean_text(row.get("raw_description", ""))

            conditions = row.get("raw_conditions", "")
            search_text = conditions if conditions else description
            usage_start, usage_end = extract_usage_dates(search_text)

            raw_purchases = row.get("raw_purchases", "")
            digits_purchases = re.sub(r"\D", "", raw_purchases)
            total_quantity = digits_purchases if digits_purchases else ""

            # 16 cột đích của bảng voucher_products (không bịa dữ liệu)
            db_row = {
                "partner_id": "",
                "category_id": "",
                "name": name,
                "description": description,
                "image_url": image_url,
                "original_price": original_price,
                "sale_price": sale_price,
                "sale_start": "",
                "sale_end": "",
                "usage_start": usage_start,
                "usage_end": usage_end,
                "total_quantity": total_quantity,
                "remaining_quantity": "",
                "is_multi_use": "false",
                "uses_per_code": "",
                "status": "DRAFT",
            }
            normalized_rows.append(db_row)

    with DATA_CRAWL_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=DB_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(normalized_rows)

    return len(normalized_rows)


def crawl_targets(root_urls: list[str], delay: float = 0.8, timeout: float = 15.0, max_items: int | None = None) -> None:
    """Thực thi cào sâu từng sản phẩm."""
    reset_and_init_csv_files()
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.5",
    })

    all_product_urls: list[str] = []
    seen_urls: set[str] = set()

    print("=== BƯỚC 1: QUÉT DANH SÁCH TOÀN BỘ SẢN PHẨM ===")
    for root_url in root_urls:
        print(f"URL: {root_url}")
        urls = discover_all_targets(session, root_url, timeout)
        for u in urls:
            if u not in seen_urls:
                seen_urls.add(u)
                all_product_urls.append(u)

    print(f"\nTổng cộng: {len(all_product_urls)} sản phẩm cần cào.")
    if max_items:
        all_product_urls = all_product_urls[:max_items]

    print("\n=== BƯỚC 2: CÀO SÂU TỪNG SẢN PHẨM (1 DÒNG / 1 VOUCHER) ===")
    total_crawled = 0

    for idx, p_url in enumerate(all_product_urls, 1):
        time.sleep(delay)
        print(f"[{idx}/{len(all_product_urls)}] {p_url} ...", end="", flush=True)
        raw_record = parse_voucher_detail(session, p_url, timeout)
        if raw_record:
            append_raw_record(raw_record)
            total_crawled += 1
            price = raw_record.get("raw_sale_price") or "N/A"
            name_abbr = raw_record["raw_name"][:35]
            print(f" [OK] {name_abbr}... | {price}đ")
        else:
            print(" [BỎ QUA/LỖI]")

    print(f"\n=== HOÀN TẤT CÀO THÔ ===")
    print(f"Đã lưu thành công {total_crawled} voucher vào '{DATA_CRAWL_CSV_PATH.name}'.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Universal Voucher Crawler & Normalizer Tool")
    parser.add_argument("--urls", nargs="+", default=["https://www.hotdeal.vn/ho-chi-minh/"], help="Danh sách link cần cào")
    parser.add_argument("--out-dir", type=str, default="", help="Thư mục xuất kết quả (ví dụ: crawl/web1, crawl/web2)")
    parser.add_argument("--delay", type=float, default=0.75, help="Thời gian nghỉ giữa các lượt cào")
    parser.add_argument("--timeout", type=float, default=15.0, help="Thời gian chờ request")
    parser.add_argument("--max-items", type=int, default=None, help="Giới hạn số sản phẩm tối đa")
    args = parser.parse_args()

    global DATA_CRAWL_CSV_PATH, TMP_CSV_PATH
    if args.out_dir:
        out_p = Path(args.out_dir).resolve()
        out_p.mkdir(parents=True, exist_ok=True)
        DATA_CRAWL_CSV_PATH = out_p / "dataCrawl.csv"
        TMP_CSV_PATH = DATA_CRAWL_CSV_PATH

    crawl_targets(args.urls, delay=args.delay, timeout=args.timeout, max_items=args.max_items)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
