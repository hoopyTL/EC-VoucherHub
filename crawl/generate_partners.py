"""Partner, User & Branch Generator Tool
EC-VoucherHub - Thư mục: crawl/

Chức năng:
1. Đọc dữ liệu thô từ `crawl/dataCrawl.csv` để trích xuất danh sách tất cả đối tác/thương hiệu duy nhất.
2. Tách bạch chuẩn 100% theo schema Database thành các bảng:
   - `crawl/users.csv`: Bảng `users` (id, email, phone [UNIQUE 100%], password_hash [Bcrypt $2b$10$...], role_id=2, status=ACTIVE, full_name, address).
   - `crawl/partners.csv`: Bảng `partners` (id, owner_user_id, legal_name, tax_code [UNIQUE], representative, business_category, logo_url, approval_status=APPROVED, operating_status=ACTIVE).
   - `crawl/branches.csv`: Bảng `branches` (id, partner_id, name, address, region, is_active=true).
3. Làm sạch địa chỉ, hotline, sinh UUID đồng bộ liên kết giữa các bảng.
4. Cập nhật `partner_id` chuẩn vào `crawl/vouchers.csv`.
"""

from __future__ import annotations

import csv
import re
import sys
import uuid
from collections import defaultdict
from pathlib import Path

# pyrefly: ignore [missing-import]
import bcrypt

# Hỗ trợ tiếng Việt UTF-8 trên Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

CRAWL_DIR = Path(__file__).resolve().parent
RAW_CRAWL_CSV_PATH = CRAWL_DIR / "dataCrawl.csv"
USERS_CSV_PATH = CRAWL_DIR / "users.csv"
PARTNERS_CSV_PATH = CRAWL_DIR / "partners.csv"
BRANCHES_CSV_PATH = CRAWL_DIR / "branches.csv"
VOUCHERS_CSV_PATH = CRAWL_DIR / "vouchers.csv"

USER_COLUMNS = (
    "id",
    "email",
    "phone",
    "password_hash",
    "role_id",
    "status",
    "full_name",
    "address",
    "created_at",
    "updated_at",
)

PARTNER_COLUMNS = (
    "id",
    "owner_user_id",
    "legal_name",
    "tax_code",
    "representative",
    "business_category",
    "logo_url",
    "approval_status",
    "operating_status",
    "created_at",
    "updated_at",
)

BRANCH_COLUMNS = (
    "id",
    "partner_id",
    "name",
    "address",
    "region",
    "is_active",
)


def clean_text(value: str | None) -> str:
    """Làm sạch khoảng trắng thừa và ký tự xuống dòng."""
    if not value:
        return ""
    return re.sub(r"[\r\n\t\s]+", " ", str(value)).strip()


def slugify(text: str) -> str:
    """Chuyển đổi chuỗi tiếng Việt thành slug không dấu dùng làm email."""
    text = clean_text(text).lower()
    replacements = {
        "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a", "ă": "a", "ằ": "a", "ắ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
        "â": "a", "ầ": "a", "ấ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
        "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e", "ê": "e", "ề": "e", "ế": "e", "ể": "e", "ễ": "e", "ệ": "e",
        "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
        "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o", "ô": "o", "ồ": "o", "ố": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
        "ơ": "o", "ờ": "o", "ớ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
        "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u", "ư": "u", "ừ": "u", "ứ": "u", "ử": "u", "ữ": "u", "ự": "u",
        "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
        "đ": "d",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    text = re.sub(r"[^a-z0-9]+", ".", text).strip(".")
    return text if text else "partner"


def clean_address(addr: str) -> str:
    """Làm sạch câu chữ tiền tố thừa của địa chỉ cào được."""
    addr = clean_text(addr)
    prefixes = [
        r"^(?:sử\s*dụng\s*voucher|áp\s*dụng\s*voucher|sử\s*dụng|áp\s*dụng|đón\s*khách|địa\s*điểm\s*sử\s*dụng\s*voucher|địa\s*điểm\s*sử\s*dụng|địa\s*chỉ\s*sử\s*dụng|địa\s*điểm|địa\s*chỉ|tại|tại\s*địa\s*chỉ)[\s:–\-]+",
        r"^(?:nhà\s*hàng|khách\s*sạn|hệ\s*thống|trung\s*tâm)[\s:–\-]+",
    ]
    for p in prefixes:
        addr = re.sub(p, "", addr, flags=re.IGNORECASE).strip()
    addr = re.sub(r"^[\s:–\-]+", "", addr).strip()
    return addr


def detect_region(address_text: str) -> str:
    """Nhận diện tỉnh/thành phố/khu vực từ nội dung địa chỉ."""
    text = address_text.lower()
    if any(k in text for k in ["hà nội", "ha noi", "hoàn kiếm", "ba đình", "cầu giấy", "hà đông", "đống đa", "hai bà trưng", "tây hồ", "long biên", "thanh xuân", "nam từ liêm", "bắc từ liêm", "mễ trì"]):
        return "Hà Nội"
    if any(k in text for k in ["hồ chí minh", "tphcm", "tp.hcm", "tp. hcm", "sài gòn", "quận 1", "quận 2", "quận 3", "quận 4", "quận 5", "quận 6", "quận 7", "quận 8", "quận 9", "quận 10", "quận 11", "quận 12", "tân bình", "phú nhuận", "bình thạnh", "gò vấp", "thủ đức", "bến thành", "tân định", "nguyễn huệ"]):
        return "TP. Hồ Chí Minh"
    if any(k in text for k in ["đà nẵng", "da nang", "ngũ hành sơn", "sơn trà", "hải châu", "thanh khê"]):
        return "Đà Nẵng"
    if any(k in text for k in ["hải phòng", "hai phong", "đồ sơn", "lê chân", "ngô quyền"]):
        return "Hải Phòng"
    if any(k in text for k in ["nha trang", "khánh hòa", "cam ranh"]):
        return "Nha Trang"
    if any(k in text for k in ["quảng ninh", "hạ long", "tuần châu", "bãi cháy"]):
        return "Quảng Ninh"
    if any(k in text for k in ["huế", "thừa thiên huế", "sông hương"]):
        return "Huế"
    if any(k in text for k in ["đà lạt", "lâm đồng"]):
        return "Đà Lạt"
    if any(k in text for k in ["phan thiết", "mũi né", "bình thuận"]):
        return "Phan Thiết"
    if any(k in text for k in ["vũng tàu", "bà rịa"]):
        return "Bà Rịa - Vũng Tàu"
    if any(k in text for k in ["cần thơ", "an giang", "tiền giang", "mỹ tho", "phú quốc", "côn đảo", "kiên giang"]):
        return "Miền Tây"
    if any(k in text for k in ["toàn quốc", "toan quoc", "toàn hệ thống", "tất cả cửa hàng"]):
        return "Toàn Quốc"
    return "TP. Hồ Chí Minh"


def extract_brand_name(voucher_name: str) -> str:
    """Trích xuất tên đối tác chuẩn từ tiêu đề voucher và gom nhóm chính xác."""
    name = clean_text(voucher_name)
    n_lower = name.lower()

    # 1. Bảng đối chiếu gom cụm các thương hiệu chính xác
    brand_map = [
        ("potico", "Potico.vn"),
        ("spicy box", "Spicy Box"),
        ("lotteria", "Lotteria"),
        ("chicken plus", "Chicken Plus"),
        ("mala panda", "Mala Panda"),
        ("chay tầm vị", "Nhà Hàng Chay Tầm Vị"),
        ("tầm vị", "Nhà Hàng Chay Tầm Vị"),
        ("tocotoco", "ToCoToCo Tea"),
        ("chuk", "Chuk Tea & Coffee"),
        ("trung thu", "Bánh Trung Thu Du Nhiên"),
        ("du nhiên", "Bánh Trung Thu Du Nhiên"),
        ("bánh trung thu", "Bánh Trung Thu Du Nhiên"),
        ("hà nội 5 cửa ô", "The Hanoi Train (Tàu Hà Nội 5 Cửa Ô)"),
        ("the hanoi train", "The Hanoi Train (Tàu Hà Nội 5 Cửa Ô)"),
        ("lotty friends", "Khu Vui Chơi Lotty Friends"),
        ("sâu kid", "Sâu Kid Playground"),
        ("sen 20 hàng tre", "Buffet Sen Hàng Tre"),
        ("sen hàng tre", "Buffet Sen Hàng Tre"),
        ("city sightseeing", "Xe Buýt 2 Tầng City Sightseeing"),
        ("vinwonders", "Hệ Thống VinWonders & Vinpearl"),
        ("vinpearl", "Hệ Thống VinWonders & Vinpearl"),
        ("vinke", "Hệ Thống VinWonders & Vinpearl"),
        ("sun world", "Tập Đoàn Sun World"),
        ("sunworld", "Tập Đoàn Sun World"),
        ("mebayluon", "Mebayluon Paragliding (Dù Lượn)"),
        ("dù lượn", "Mebayluon Paragliding (Dù Lượn)"),
        ("đồi rồng", "Khu Du Lịch Quốc Tế Đồi Rồng (Dragon Ocean)"),
        ("bát tràng", "Bảo Tàng & Làng Gốm Bát Tràng"),
        ("gốm sứ", "Bảo Tàng & Làng Gốm Bát Tràng"),
        ("sân bay", "Dịch Vụ Sân Bay & Phòng Chờ Thương Gia"),
        ("phòng chờ", "Dịch Vụ Sân Bay & Phòng Chờ Thương Gia"),
        ("champ lounge", "Dịch Vụ Sân Bay & Phòng Chờ Thương Gia"),
        ("fast lane", "Dịch Vụ Sân Bay & Phòng Chờ Thương Gia"),
        ("evisa", "Dịch Vụ Sân Bay & Phòng Chờ Thương Gia"),
        ("cánh diều", "Nhà Hát Đó - Cánh Diều (Vega City Nha Trang)"),
        ("nhà hát đó", "Nhà Hát Đó - Cánh Diều (Vega City Nha Trang)"),
        ("minishow", "Sân Khấu Minishow & Live Concert"),
        ("concert", "Sân Khấu Minishow & Live Concert"),
        ("đêm nhạc", "Sân Khấu Minishow & Live Concert"),
        ("chỉ là giấc mơ", "Sân Khấu Minishow & Live Concert"),
        ("như chưa bắt đầu", "Sân Khấu Minishow & Live Concert"),
        ("cinelove in the foret", "Sân Khấu Minishow & Live Concert"),
        ("tinh hoa bắc bộ", "Show Diễn Thực Cảnh Tinh Hoa Bắc Bộ"),
        ("charming đà nẵng", "Nhà Hát Charming Đà Nẵng Show"),
        ("hoa lư vũ họa", "Show Diễn Thực Cảnh Hoa Lư Vũ Họa"),
        ("anh hùng cờ lau", "Show Thực Cảnh Anh Hùng Cờ Lau"),
        ("chèo cổ", "Nhà Hát Nghệ Thuật Truyền Thống"),
        ("triều trần", "Nhà Hát Nghệ Thuật Truyền Thống"),
        ("aurora halong", "Hệ Thống Du Thuyền Vịnh Hạ Long"),
        ("lily cruise", "Hệ Thống Du Thuyền Vịnh Hạ Long"),
        ("ruby cruise", "Hệ Thống Du Thuyền Vịnh Hạ Long"),
        ("duyen cruise", "Hệ Thống Du Thuyền Vịnh Hạ Long"),
        ("la casta", "Hệ Thống Du Thuyền Vịnh Hạ Long"),
        ("vịnh hạ long", "Hệ Thống Du Thuyền Vịnh Hạ Long"),
        ("elisa", "Du Thuyền Sông Sài Gòn (Elisa Floating Restaurant)"),
        ("sông sài gòn", "Du Thuyền Sông Sài Gòn (Elisa Floating Restaurant)"),
        ("hueritage", "Du Thuyền Sông Hương Ngự Thuyền Hueritage"),
        ("ngự thuyền", "Du Thuyền Sông Hương Ngự Thuyền Hueritage"),
        ("sông hồng", "Chèo Sup Sông Hồng"),
        ("hạnh café", "Nhà Xe Hạnh Café"),
        ("tây thiên", "Cáp Treo Tây Thiên"),
        ("hương bình", "Cáp Treo Chùa Hương - Hương Bình"),
        ("rồng mây", "Khu Du Lịch Cầu Kính Rồng Mây Sapa"),
        ("thiên đường bảo sơn", "Công Viên Thiên Đường Bảo Sơn"),
        ("mekong aqua park", "Công Viên Nước TTC Mekong Aqua Park"),
        ("mikazuki", "Công Viên Nước Mikazuki 365 Đà Nẵng"),
        ("đà nẵng 365", "Công Viên Nước Mikazuki 365 Đà Nẵng"),
        ("thanh thủy", "Khu Nghỉ Dưỡng Wyndham Lynn Times Thanh Thủy"),
        ("medi thiên sơn", "Khu Du Lịch Sinh Thái Medi Thiên Sơn"),
        ("tuần châu", "Khu Vui Chơi Giải Trí Quốc Tế Tuần Châu Park"),
        ("bản mòng", "Khu Du Lịch Sinh Thái Bản Mòng"),
        ("sơn tiên", "Thành Phố Du Lịch Sinh Thái Sơn Tiên"),
        ("damitrans", "Tàu Hỏa Du Lịch Damitrans"),
        ("ngư phàn", "Nhà Hàng Ngư Phàn"),
        ("điện máy chợ lớn", "Siêu Thị Điện Máy Chợ Lớn"),
        ("capital place", "Saga Coffee (Capital Place)"),
        ("imeatu", "Nhà Hàng Imeatu"),
        ("ngọc dung", "Hệ Thống Thẩm Mỹ Viện Ngọc Dung"),
        ("btaskee", "bTaskee"),
        ("sườn mười", "Hệ Thống Sườn Mười"),
        ("kidzooona", "Hệ Thống Kidzooona"),
        ("kid's box", "Hệ Thống Kidzooona"),
        ("vinfast", "VinFast Việt Nam"),
        ("doji", "Tập Đoàn Vàng Bạc Đá Quý DOJI"),
        ("pnj", "Công Ty Cổ Phần Vàng Bạc Đá Quý PNJ"),
        ("lotte mart", "Lotte Mart"),
        ("lotte", "Lotte Mart"),
        ("pizza 4p", "Pizza 4P's"),
        ("tous les jours", "TOUS les JOURS"),
        ("breadtalk", "BreadTalk"),
        ("gong cha", "Gong Cha"),
        ("paris baguette", "Paris Baguette"),
        ("beard papa", "Beard Papa's"),
        ("cộng cà phê", "Cộng Cà Phê"),
        ("cong ca phe", "Cộng Cà Phê"),
        ("dookki", "Dookki Việt Nam"),
        ("jinro bbq", "Jinro BBQ"),
        ("jeonbok", "Nhà Hàng Hải Sản Jeonbok"),
        ("bắc kim thang", "Nhà Hàng Bắc Kim Thang"),
        ("sargon bistro", "Sargon Bistro"),
        ("baoyu", "Lẩu Trùng Khánh BaoYu"),
        ("a mà kitchen", "A Mà Kitchen"),
        ("crispy donuts", "Crispy Donuts"),
        ("don chicken", "Don Chicken"),
        ("june noodle", "June Noodle House"),
        ("saga coffee", "Saga Coffee & Eatery"),
        ("liti florist", "Liti Florist"),
        ("ninh khương", "Thời Trang Trẻ Em Ninh Khương"),
        ("marc fashion", "MARC Fashion"),
        ("marc", "MARC Fashion"),
        ("rabity", "Thời Trang Trẻ Em Rabity"),
        ("dottie", "Thời Trang Dottie"),
        ("bác tôm", "Nông Sản Sạch Bác Tôm"),
        ("socnbrothers", "Soc&Brothers"),
        ("soc&brothers", "Soc&Brothers"),
        ("hoa yêu thương", "Hoa Yêu Thương"),
        ("gs25", "GS25"),
        ("beloved & beyond", "Beloved & Beyond"),
        ("locknlock", "Lock&Lock"),
        ("lock&lock", "Lock&Lock"),
        ("k-market", "K-Market"),
        ("betransport", "Be Group"),
        ("bedelivery", "Be Group"),
        ("grab", "Grab Vietnam"),
        ("extrim", "Extrim Chăm Sóc Giày"),
        ("green sm", "Xanh SM (GSM)"),
        ("xanh sm", "Xanh SM (GSM)"),
        ("tiniworld", "Hệ Thống tiNiWorld"),
        ("diab", "Diab Chăm Sóc Sức Khỏe"),
        ("yuhua", "Yuhua Lẩu Đài Loan"),
        ("hoàng yến", "Hoàng Yến Group"),
        ("san fu lou", "Nhà Hàng San Fu Lou"),
        ("dì mai", "Nhà Hàng Dì Mai"),
        ("ssamjang", "Nhà Hàng Hàn Quốc Ssamjang"),
        ("baoz dimsum", "Baoz Dimsum"),
        ("bornga", "Nhà Hàng Hàn Quốc Bornga"),
        ("phúc lộc thọ", "Cơm Tấm Phúc Lộc Thọ"),
        ("ngân đình", "Nhà Hàng Ngân Đình (Windsor Plaza)"),
        ("bu too mac", "Nhà Hàng Bu Too Mac"),
        ("cân taiwanese", "Cân Taiwanese Street Hotpot"),
        ("life4cuts", "Life4Cuts Photo Studio"),
    ]

    for key, brand_official in brand_map:
        if key in n_lower:
            return brand_official

    # 3. Trích xuất theo mẫu câu tiếng Việt: "tại [Tên đối tác]" hoặc "áp dụng tại [Tên đối tác]"
    m_tai = re.search(r"(?:áp\s*dụng\s*tại|tại)\s+([A-Za-z0-9À-ỹ\s&]+?)(?:\s*[-–:,|]|\s*$)", name, re.IGNORECASE)
    if m_tai:
        brand_cand = m_tai.group(1).strip()
        if len(brand_cand) >= 3 and len(brand_cand) <= 45:
            return brand_cand.title()

    # 4. Trích xuất theo mẫu "Thẻ quà tặng [Tên đối tác]"
    m_gift = re.search(r"Thẻ\s*quà\s*tặng\s+([A-Za-z0-9À-ỹ\s&]+?)(?:\s*[-–:,|0-9]|\s*$)", name, re.IGNORECASE)
    if m_gift:
        brand_cand = m_gift.group(1).strip()
        if len(brand_cand) >= 3 and len(brand_cand) <= 45:
            return brand_cand.title()

    # 5. Phân tách theo dấu gạch ngang hoặc 2 chấm
    parts = re.split(r"\s+[-–:]\s+", name)
    brand = parts[0].strip() if len(parts) > 1 else name[:30]
    return brand.title()


def extract_branches_from_text(brand_name: str, text: str) -> list[dict[str, str]]:
    """Trích xuất danh sách chi nhánh cụ thể từ nội dung cào."""
    text_clean = clean_text(text)

    # 1. Nihaoniu Hotpot
    if "nihaoniu" in brand_name.lower():
        return [
            {"name": "Chi nhánh Quận 1", "address": "94 Hồ Tùng Mậu, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Quận 3", "address": "69 Phạm Ngọc Thạch, Phường Võ Thị Sáu, Quận 3, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Thảo Điền", "address": "16 Quốc Hương, Phường Thảo Điền, TP. Thủ Đức, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 2. Chicken Plus
    if "chicken plus" in brand_name.lower():
        return [
            {"name": "Chicken Plus Hai Bà Trưng", "address": "232 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chicken Plus Xô Viết Nghệ Tĩnh", "address": "245 Xô Viết Nghệ Tĩnh, Phường 17, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chicken Plus Quang Trung", "address": "144 Quang Trung, Phường 10, Quận Gò Vấp, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chicken Plus Cầu Giấy", "address": "116 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội", "region": "Hà Nội"},
            {"name": "Chicken Plus Tây Sơn", "address": "208 Tây Sơn, Phường Trung Liệt, Quận Đống Đa, Hà Nội", "region": "Hà Nội"},
            {"name": "Chicken Plus Nguyễn Văn Linh", "address": "145 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng", "region": "Đà Nẵng"},
        ]

    # 3. Lotteria
    if "lotteria" in brand_name.lower():
        return [
            {"name": "Lotteria Nguyễn Đình Chiểu", "address": "106 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Lotteria Lotte Mart Quận 7", "address": "Tầng 1, Lotte Mart, 469 Nguyễn Hữu Thọ, Tân Hưng, Quận 7, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Lotteria Tràng Tiền", "address": "24 Tràng Tiền, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
            {"name": "Lotteria Big C Thăng Long", "address": "222 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội", "region": "Hà Nội"},
            {"name": "Lotteria Đà Nẵng", "address": "125 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng", "region": "Đà Nẵng"},
        ]

    # 4. Spicy Box
    if "spicy box" in brand_name.lower():
        return [
            {"name": "Spicy Box Saigon Centre", "address": "Tầng B2, Saigon Centre, 65 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Spicy Box Estella Place", "address": "Tầng 4, Estella Place, 88 Song Hành, An Phú, TP. Thủ Đức, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Spicy Box GigaMall", "address": "Tầng 5, GigaMall Phạm Văn Đồng, Hiệp Bình Chánh, TP. Thủ Đức, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Spicy Box Vincom Smart City", "address": "Tầng 3, Vincom Mega Mall Smart City, Tây Mỗ, Nam Từ Liêm, Hà Nội", "region": "Hà Nội"},
        ]

    # 5. Mala Panda
    if "mala panda" in brand_name.lower():
        return [
            {"name": "Mala Panda Vạn Hạnh Mall", "address": "Tầng 6, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Quận 10, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Mala Panda Phan Xích Long", "address": "198 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Mala Panda Aeon Mall Tân Phú", "address": "Tầng 3, Aeon Mall Tân Phú, 30 Bờ Bao Tân Thắng, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 6. Hệ Thống Kidzooona
    if "kidzooona" in brand_name.lower() or "kid's box" in brand_name.lower():
        return [
            {"name": "Kidzooona Aeon Mall Long Biên", "address": "Tầng 3, TTTM Aeon Mall Long Biên, 27 Cổ Linh, Long Biên, Hà Nội", "region": "Hà Nội"},
            {"name": "Kidzooona Aeon Mall Hà Đông", "address": "Tầng 3, TTTM Aeon Mall Hà Đông, Dương Nội, Hà Đông, Hà Nội", "region": "Hà Nội"},
            {"name": "Kidzooona Xuan Thuy", "address": "Lô S012, Tầng 2, Aeon Xuân Thủy, 122-124 Xuân Thủy, Cầu Giấy, Hà Nội", "region": "Hà Nội"},
            {"name": "Kidzooona Aeon Mall Tân Phú", "address": "Tầng 2, TTTM Aeon Mall Tân Phú Celadon, Tân Phú, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Kidzooona Aeon Mall Bình Tân", "address": "Tầng 2, TTTM Aeon Mall Bình Tân, Bình Trị Đông B, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 7. tiNiWorld
    if "tiniworld" in brand_name.lower():
        return [
            {"name": "tiNiWorld Landmark 81", "address": "Tầng B1, Vincom Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "tiNiWorld Saigon Centre", "address": "Tầng 4, Saigon Centre, 65 Lê Lợi, Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "tiNiWorld Vincom Times City", "address": "Tầng B1, TTTM Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội", "region": "Hà Nội"},
            {"name": "tiNiWorld Vincom Metropolis", "address": "Tầng 3, Vincom Metropolis, 29 Liễu Giai, Ba Đình, Hà Nội", "region": "Hà Nội"},
        ]

    # 8. ToCoToCo Tea
    if "tocotoco" in brand_name.lower():
        return [
            {"name": "ToCoToCo Hàng Bông", "address": "95 Hàng Bông, Phường Hàng Gai, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
            {"name": "ToCoToCo Cầu Giấy", "address": "259 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội", "region": "Hà Nội"},
            {"name": "ToCoToCo Nguyễn Thị Minh Khai", "address": "51 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "ToCoToCo Sư Vạn Hạnh", "address": "770 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 9. Chuk Tea & Coffee
    if "chuk" in brand_name.lower():
        return [
            {"name": "Chuk Tea & Coffee Hồ Tùng Mậu", "address": "119 Hồ Tùng Mậu, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chuk Tea & Coffee Phan Xích Long", "address": "211 Phan Xích Long, Phường 7, Quận Phú Nhuận, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chuk Tea & Coffee Nguyễn Tri Phương", "address": "395 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 10. Pizza 4P's
    if "pizza 4p" in brand_name.lower():
        return [
            {"name": "Pizza 4P's Lê Thánh Tôn", "address": "8/15 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Pizza 4P's Saigon Pearl", "address": "92 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Pizza 4P's Tràng Tiền", "address": "43 Tràng Tiền, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
            {"name": "Pizza 4P's Lotte Center", "address": "Tầng 1, Lotte Center, 54 Liễu Giai, Ba Đình, Hà Nội", "region": "Hà Nội"},
        ]

    # 11. Hệ Thống Sườn Mười
    if "sườn mười" in brand_name.lower():
        return [
            {"name": "Sườn Mười Thái Hà", "address": "128 Thái Hà, Phường Trung Liệt, Quận Đống Đa, Hà Nội", "region": "Hà Nội"},
            {"name": "Sườn Mười Hàm Nghi", "address": "10 B1 TT4 KĐT Mỹ Đình, Hàm Nghi, Nam Từ Liêm, Hà Nội", "region": "Hà Nội"},
            {"name": "Sườn Mười Nguyễn Văn Lộc", "address": "117 Nguyễn Văn Lộc, Phường Mộ Lao, Quận Hà Đông, Hà Nội", "region": "Hà Nội"},
        ]

    # 12. Bánh Trung Thu Du Nhiên
    if "du nhiên" in brand_name.lower() or "bánh trung thu" in brand_name.lower():
        return [
            {"name": "Du Nhiên Hà Đông", "address": "Số 10 ngõ 102 Trần Phú, Phường Mộ Lao, Quận Hà Đông, Hà Nội", "region": "Hà Nội"},
            {"name": "Du Nhiên Cầu Giấy", "address": "86 Dịch Vọng Hậu, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội", "region": "Hà Nội"},
            {"name": "Du Nhiên Hoàn Kiếm", "address": "45 Hàng Đường, Phường Hàng Gai, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
        ]

    # 13. Thẩm Mỹ Viện Ngọc Dung
    if "ngọc dung" in brand_name.lower():
        return [
            {"name": "Ngọc Dung Quận 10", "address": "32-34-36 Đường 3/2, Phường 12, Quận 10, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Ngọc Dung Huỳnh Thúc Kháng", "address": "106 Phố Huỳnh Thúc Kháng, Quận Đống Đa, Hà Nội", "region": "Hà Nội"},
            {"name": "Ngọc Dung Trần Duy Hưng", "address": "65 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội", "region": "Hà Nội"},
            {"name": "Ngọc Dung Đà Nẵng", "address": "95 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng", "region": "Đà Nẵng"},
        ]

    # 14. Hoàng Yến Group
    if "hoàng yến" in brand_name.lower():
        return [
            {"name": "Hoàng Yến Buffet Vạn Hạnh Mall", "address": "Tầng 5, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Quận 10, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Hoàng Yến Cuisine Hai Bà Trưng", "address": "148 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Hoàng Yến Cuisine Ngô Đức Kế", "address": "7-9 Ngô Đức Kế, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Hoàng Yến Cuisine Hồ Bán Nguyệt", "address": "Lô CR1-12, 103 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Trống Cơm Vincom Thảo Điền", "address": "Tầng 5, Vincom Mega Mall Thảo Điền, TP. Thủ Đức, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chảo Cá Crescent Mall", "address": "Tầng 5, Crescent Mall, 101 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 15. La Bella Pilates
    if "la bella pilates" in brand_name.lower():
        return [
            {"name": "Cơ sở Phú Nhuận", "address": "159/4 Hoàng Văn Thụ, Phường 8, Quận Phú Nhuận, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Cơ sở Quận 1", "address": "40E Ngô Đức Kế, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Cơ sở Quận 3", "address": "149A Nguyễn Phúc Nguyên, Phường 10, Quận 3, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 16. Yuhua Lẩu Đài Loan
    if "yuhua" in brand_name.lower():
        return [
            {"name": "Chi nhánh Lê Văn Sỹ", "address": "291B Lê Văn Sỹ, Phường Tân Sơn Hòa, Quận Tân Bình, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Hoàng Hoa Thám", "address": "Số 7 Hoàng Hoa Thám, Phường 13, Quận Tân Bình, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 17. Chang Nails
    if "chang nails" in brand_name.lower():
        return [
            {"name": "Chi nhánh Huỳnh Tịnh Của", "address": "50 Huỳnh Tịnh Của, Phường 19, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Vạn Kiếp", "address": "216 Vạn Kiếp, Phường 3, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Quận 4", "address": "F44 Cư Xá Vĩnh Hội, Đường Số 50, Phường 2, Quận 4, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Phú Nhuận", "address": "84/4 Trần Hữu Trang, Phường 10, Quận Phú Nhuận, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Quận 7", "address": "186 Nguyễn Thị Thập, Phường Bình Thuận, Quận 7, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 18. VP OHUI Clinic
    if "vp ohui" in brand_name.lower():
        return [
            {"name": "Cơ sở Phú Nhuận", "address": "529/142 Huỳnh Văn Bánh, Phường 13, Quận Phú Nhuận, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Cơ sở Quận 10", "address": "463B/2 Cách Mạng Tháng Tám, Phường 13, Quận 10, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 19. Terracotta Hotel & Resort
    if "terracotta" in brand_name.lower():
        return [
            {"name": "Chi nhánh Đà Lạt", "address": "Phân khu chức năng 7.9, KDL Hồ Tuyền Lâm, Phường 3, TP. Đà Lạt", "region": "Đà Lạt"},
            {"name": "Chi nhánh Mũi Né", "address": "28 Nguyễn Đình Chiểu, Phường Hàm Tiến, TP. Phan Thiết", "region": "Phan Thiết"},
        ]

    # 20. Tour Du Lịch
    if "vintrip" in brand_name.lower() or "tour" in brand_name.lower():
        if "hải đăng" in text_clean.lower():
            return [{"name": "Trụ sở Du lịch Hải Đăng", "address": "367 Tân Sơn, Phường 15, Quận Tân Bình, TP.HCM", "region": "TP. Hồ Chí Minh"}]
        if "an travel" in text_clean.lower():
            return [{"name": "Trụ sở An Travel", "address": "165 Phạm Ngũ Lão, Phường Phạm Ngũ Lão, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"}]
        return [{"name": "Trụ sở Du lịch Vintrip", "address": "292/33/15A Bình Lợi, Phường 13, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"}]

    # 21. Show Diễn & Nhà Hát & KDL Văn Hóa
    if "cờ lau" in brand_name.lower() or "anh hùng cờ lau" in brand_name.lower():
        return [{"name": "Sân khấu Thực cảnh Cố Đô Hoa Lư", "address": "Khu di tích Cố Đô Hoa Lư, Xã Trường Yên, Huyện Hoa Lư, Ninh Bình", "region": "Ninh Bình"}]
    if "hoa lư vũ họa" in brand_name.lower():
        return [{"name": "Sân khấu Hoa Lư Vũ Họa", "address": "Quần thể danh thắng Tràng An, Xã Ninh Xuân, Huyện Hoa Lư, Ninh Bình", "region": "Ninh Bình"}]
    if "tinh hoa bắc bộ" in brand_name.lower():
        return [{"name": "Sân khấu Tinh Hoa Bắc Bộ", "address": "Khu du lịch Baara Land, Xã Sài Sơn, Huyện Quốc Oai, Hà Nội", "region": "Hà Nội"}]
    if "charming đà nẵng" in brand_name.lower():
        return [{"name": "Nhà Hát Charming Đà Nẵng", "address": "02 Cách Mạng Tháng Tám, Phường Hòa Cường Nam, Quận Hải Châu, Đà Nẵng", "region": "Đà Nẵng"}]
    if "cánh diều" in brand_name.lower() or "nhà hát đó" in brand_name.lower():
        return [{"name": "Nhà Hát Đó - Vega City Nha Trang", "address": "Bãi Tiên, Phường Vĩnh Hòa, TP. Nha Trang, Tỉnh Khánh Hòa", "region": "Nha Trang"}]

    # 22. VinFast & Công Nghệ
    if "vinfast" in brand_name.lower():
        return [
            {"name": "VinFast Showroom Times City", "address": "TTTM Vincom Mega Mall Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội", "region": "Hà Nội"},
            {"name": "VinFast Showroom Landmark 81", "address": "TTTM Vincom Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "life4cuts" in brand_name.lower():
        return [
            {"name": "Life4Cuts Lotte Mall Tây Hồ", "address": "Tầng 3, Lotte Mall West Lake, 272 Võ Chí Công, Tây Hồ, Hà Nội", "region": "Hà Nội"},
            {"name": "Life4Cuts Nguyễn Trãi", "address": "144 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 23. KDL Sinh Thái & Công Viên Nước
    if "sơn tiên" in brand_name.lower():
        return [{"name": "KDL Sơn Tiên (The Amazing Bay)", "address": "Quốc Lộ 51, Khu phố 4, Phường An Hòa, TP. Biên Hòa, Tỉnh Đồng Nai", "region": "Đồng Nai"}]
    if "tuần châu" in brand_name.lower():
        return [{"name": "Tuần Châu Park", "address": "Đảo Tuần Châu, TP. Hạ Long, Tỉnh Quảng Ninh", "region": "Quảng Ninh"}]
    if "đồi rồng" in brand_name.lower():
        return [{"name": "Dragon Ocean Đồ Sơn", "address": "Phường Vạn Hương, Quận Đồ Sơn, TP. Hải Phòng", "region": "Hải Phòng"}]
    if "bản mòng" in brand_name.lower():
        return [{"name": "KDL Bản Mòng", "address": "Bản Mòng, Xã Hua La, TP. Sơn La, Tỉnh Sơn La", "region": "Tây Bắc"}]
    if "mekong aqua park" in brand_name.lower():
        return [{"name": "TTC Mekong Aqua Park", "address": "547D Nguyễn Đình Chiểu, Xã Phú Hưng, TP. Bến Tre", "region": "Miền Tây"}]
    if "thanh thủy" in brand_name.lower() or "wyndham" in brand_name.lower():
        return [{"name": "Wyndham Lynn Times Thanh Thủy", "address": "Xã Bảo Yên, Huyện Thanh Thủy, Tỉnh Phú Thọ", "region": "Phú Thọ"}]
    if "rồng mây" in brand_name.lower():
        return [{"name": "Cầu Kính Rồng Mây Sapa", "address": "Đèo Ô Quy Hồ, Xã Sơn Bình, Huyện Tam Đường, Tỉnh Lai Châu", "region": "Sapa - Tây Bắc"}]
    if "tây thiên" in brand_name.lower():
        return [{"name": "Ga Cáp Treo Tây Thiên", "address": "Xã Đại Đình, Huyện Tam Đảo, Tỉnh Vĩnh Phúc", "region": "Vĩnh Phúc"}]

    # 24. VinWonders & Vinpearl
    if "vinwonders" in brand_name.lower() or "vinpearl" in brand_name.lower() or "vinke" in brand_name.lower():
        return [
            {"name": "VinWonders Nam Hội An", "address": "Đường Võ Chí Công, Xã Bình Minh, Huyện Thăng Bình, Tỉnh Quảng Nam", "region": "Đà Nẵng"},
            {"name": "VinWonders Nha Trang", "address": "Đảo Hòn Tre, Phường Vĩnh Nguyên, TP. Nha Trang, Tỉnh Khánh Hòa", "region": "Nha Trang"},
            {"name": "VinKE & Thủy Cung Times City", "address": "Tầng B1, TTTM Vincom Mega Mall Times City, 458 Minh Khai, Hà Nội", "region": "Hà Nội"},
            {"name": "VinWonders Ocean Park", "address": "KĐT Vinhomes Ocean Park 2, Văn Giang, Hưng Yên", "region": "Hà Nội"},
        ]

    # 25. Dù Lượn & Du Thuyền
    if "mebayluon" in brand_name.lower() or "dù lượn" in brand_name.lower():
        return [
            {"name": "Bãi Cất Cánh Dù Lượn Đồi Bù", "address": "Xã Nam Phương Tiến, Huyện Chương Mỹ, Hà Nội", "region": "Hà Nội"},
            {"name": "Bãi Cất Cánh Dù Lượn Sơn Trà", "address": "Bán đảo Sơn Trà, Phường Thọ Quang, Quận Sơn Trà, Đà Nẵng", "region": "Đà Nẵng"},
        ]
    if "ngự thuyền" in brand_name.lower() or "hueritage" in brand_name.lower():
        return [{"name": "Bến Thuyền Du Lịch Tòa Khâm", "address": "49 Lê Lợi, Phường Phú Hội, TP. Huế, Tỉnh Thừa Thiên Huế", "region": "Huế"}]
    if "elisa" in brand_name.lower() or "sông sài gòn" in brand_name.lower():
        return [{"name": "Tàu Elisa Bến Bạch Đằng", "address": "Số 5 Nguyễn Tất Thành, Phường 12, Quận 4, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "chèo sup" in brand_name.lower() or "sông hồng" in brand_name.lower():
        return [{"name": "Bến Chèo Sup Bồ Đề", "address": "Ngõ 264 Ngọc Thụy, Phường Ngọc Thụy, Quận Long Biên, Hà Nội", "region": "Hà Nội"}]
    if "damitrans" in brand_name.lower():
        return [{"name": "Ga Hà Nội - Phòng Vé Damitrans", "address": "120 Lê Duẩn, Phường Cửa Nam, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"}]

    # 26. Nhà Hàng Nổi Tiếng
    if "dì mai" in brand_name.lower():
        return [
            {"name": "Dì Mai Lê Thị Hồng Gấm", "address": "136-138 Lê Thị Hồng Gấm, Phường Nguyễn Thái Bình, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Dì Mai Landmark 81", "address": "Tầng L02, TTTM Vincom Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "ssamjang" in brand_name.lower():
        return [{"name": "Ssamjang Royal City", "address": "Tầng B2, TTTM Royal City, 72A Nguyễn Trãi, Thanh Xuân, Hà Nội", "region": "Hà Nội"}]
    if "bu too mac" in brand_name.lower():
        return [{"name": "Bu Too Mac Sky Garden", "address": "101/1 Đường Số 28, Khu Phố Sky Garden 2, Tân Phong, Quận 7, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "ngân đình" in brand_name.lower():
        return [{"name": "Ngân Đình Windsor Plaza", "address": "Tầng 5, Khách Sạn Windsor Plaza, 18 An Dương Vương, Quận 5, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "baoz dimsum" in brand_name.lower():
        return [
            {"name": "Baoz Dimsum Nguyễn Tri Phương", "address": "88 Nguyễn Tri Phương, Phường 7, Quận 5, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Baoz Dimsum Lê Đại Hành", "address": "299 Lê Đại Hành, Phường 13, Quận 11, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "phúc lộc thọ" in brand_name.lower():
        return [
            {"name": "Phúc Lộc Thọ Tô Ngọc Vân", "address": "124 Tô Ngọc Vân, Phường Linh Tây, TP. Thủ Đức, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Phúc Lộc Thọ Quang Trung", "address": "538 Quang Trung, Phường 11, Quận Gò Vấp, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "cân taiwanese" in brand_name.lower():
        return [{"name": "Cân Taiwanese Street Hotpot", "address": "110 Nguyễn Gia Trí, Phường 25, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "bornga" in brand_name.lower():
        return [{"name": "Bornga Landmark 81", "address": "Tầng L5-01, Vincom Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "san fu lou" in brand_name.lower():
        return [
            {"name": "San Fu Lou AB Tower", "address": "Tầng Trệt, AB Tower, 76A Lê Lai, Phường Bến Thành, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "San Fu Lou Vincom Đồng Khởi", "address": "Tầng B3, Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "San Fu Lou Vincom Metropolis", "address": "Tầng 1, Vincom Metropolis, 29 Liễu Giai, Ba Đình, Hà Nội", "region": "Hà Nội"},
        ]
    if "jinro bbq" in brand_name.lower():
        return [
            {"name": "Jinro BBQ Huỳnh Thúc Kháng", "address": "9A Huỳnh Thúc Kháng, Phường Láng Hạ, Quận Đống Đa, Hà Nội", "region": "Hà Nội"},
            {"name": "Jinro BBQ Trung Hòa", "address": "Tầng 1, Toà M3-M4, Nguyễn Thị Thập, Trung Hòa, Cầu Giấy, Hà Nội", "region": "Hà Nội"},
        ]
    if "jeonbok" in brand_name.lower():
        return [{"name": "Jeonbok Hàm Long", "address": "32 Hàm Long, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"}]
    if "bắc kim thang" in brand_name.lower():
        return [{"name": "Bắc Kim Thang Bình Thạnh", "address": "50B Huỳnh Tịnh Của, Phường 19, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "sargon bistro" in brand_name.lower():
        return [{"name": "Sargon Bistro Nguyễn Thị Minh Khai", "address": "382/24 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "baoyu" in brand_name.lower():
        return [{"name": "BaoYu Hotpot Sư Vạn Hạnh", "address": "816 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "a mà kitchen" in brand_name.lower():
        return [{"name": "A Mà Kitchen Tôn Thất Thiệp", "address": "23 Tôn Thất Thiệp, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "crispy donuts" in brand_name.lower():
        return [{"name": "Crispy Donuts Nguyễn Huệ", "address": "42 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "don chicken" in brand_name.lower():
        return [
            {"name": "Don Chicken Hồ Tùng Mậu", "address": "25 Hồ Tùng Mậu, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Don Chicken Hàng Bông", "address": "250 Hàng Bông, Phường Cửa Nam, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
        ]
    if "june noodle" in brand_name.lower():
        return [{"name": "June Noodle House Tân Sơn Nhì", "address": "92 Tân Sơn Nhì, Phường Tân Sơn Nhì, Quận Tân Phú, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "tous les jours" in brand_name.lower():
        return [
            {"name": "TOUS les JOURS Hai Bà Trưng", "address": "180 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "TOUS les JOURS Phố Huế", "address": "123 Phố Huế, Phường Ngô Thì Nhậm, Quận Hai Bà Trưng, Hà Nội", "region": "Hà Nội"},
        ]
    if "saga coffee" in brand_name.lower():
        return [
            {"name": "Saga Coffee Capital Place", "address": "Tầng B1, Toà Nhà Capital Place, 29 Liễu Giai, Ba Đình, Hà Nội", "region": "Hà Nội"},
            {"name": "Saga Coffee Hanoi Centre", "address": "175 Nguyễn Thái Học, Phường Ô Chợ Dừa, Quận Đống Đa, Hà Nội", "region": "Hà Nội"},
        ]
    if "breadtalk" in brand_name.lower():
        return [
            {"name": "BreadTalk Vincom Đồng Khởi", "address": "Tầng B2, Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "BreadTalk Times City", "address": "Tầng B1, Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội", "region": "Hà Nội"},
        ]
    if "gong cha" in brand_name.lower():
        return [
            {"name": "Gong Cha Hồ Tùng Mậu", "address": "83 Hồ Tùng Mậu, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Gong Cha Lý Thường Kiệt", "address": "56 Lý Thường Kiệt, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
        ]
    if "cộng cà phê" in brand_name.lower() or "cong ca phe" in brand_name.lower():
        return [
            {"name": "Cộng Cà Phê Tràng Tiền", "address": "35A Tràng Tiền, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
            {"name": "Cộng Cà Phê Bùi Viện", "address": "127 Bùi Viện, Phường Phạm Ngũ Lão, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # 27. Trang Sức, Thời Trang, Bán Lẻ
    if "pnj" in brand_name.lower():
        return [
            {"name": "PNJ Next Hai Bà Trưng", "address": "196 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "PNJ Cầu Giấy", "address": "256 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội", "region": "Hà Nội"},
            {"name": "PNJ Đà Nẵng", "address": "70 Trần Phú, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng", "region": "Đà Nẵng"},
        ]
    if "doji" in brand_name.lower():
        return [
            {"name": "DOJI Tower Hà Nội", "address": "Số 5 Lê Duẩn, Phường Điện Biên, Quận Ba Đình, Hà Nội", "region": "Hà Nội"},
            {"name": "DOJI Tower TP.HCM", "address": "81-85 Hàm Nghi, Phường Nguyễn Thái Bình, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "liti florist" in brand_name.lower():
        return [
            {"name": "Liti Florist Phố Huế", "address": "229 Phố Huế, Phường Phố Huế, Quận Hai Bà Trưng, Hà Nội", "region": "Hà Nội"},
            {"name": "Liti Florist Nam Kỳ Khởi Nghĩa", "address": "162 Nam Kỳ Khởi Nghĩa, Phường 6, Quận 3, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "ninh khương" in brand_name.lower():
        return [
            {"name": "Ninh Khương Đồng Khởi", "address": "83 Đồng Khởi, Phường Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Ninh Khương Vincom Bà Triệu", "address": "Tầng 4, Vincom Center, 191 Bà Triệu, Hai Bà Trưng, Hà Nội", "region": "Hà Nội"},
        ]
    if "marc" in brand_name.lower():
        return [
            {"name": "MARC Fashion Lê Văn Sỹ", "address": "223 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "MARC Fashion Cầu Giấy", "address": "215 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội", "region": "Hà Nội"},
        ]
    if "rabity" in brand_name.lower():
        return [
            {"name": "Rabity Vincom Thảo Điền", "address": "Tầng 3, Vincom Thảo Điền, TP. Thủ Đức, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Rabity Times City", "address": "Tầng B1, Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội", "region": "Hà Nội"},
        ]
    if "dottie" in brand_name.lower():
        return [{"name": "Dottie Nguyễn Trãi", "address": "170 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"}]
    if "socnbrothers" in brand_name.lower() or "soc&brothers" in brand_name.lower():
        return [
            {"name": "Soc&Brothers Phan Chu Trinh", "address": "21 Phan Chu Trinh, Phường Phan Chu Trinh, Quận Hoàn Kiếm, Hà Nội", "region": "Hà Nội"},
            {"name": "Soc&Brothers Nguyễn Đình Chiểu", "address": "557 Nguyễn Đình Chiểu, Phường 2, Quận 3, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "hoa yêu thương" in brand_name.lower():
        return [
            {"name": "Showroom Hoa Yêu Thương Hồ Hảo Hớn", "address": "17 Hồ Hảo Hớn, Phường Cô Giang, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Showroom Hoa Yêu Thương Trần Hưng Đạo", "address": "270F Trần Hưng Đạo, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "gs25" in brand_name.lower():
        return [
            {"name": "GS25 Landmark Plus", "address": "Tầng 1, Toà Landmark Plus, 208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "GS25 Masteri Thảo Điền", "address": "T1-A0108 Masteri Thảo Điền, 159 Xa Lộ Hà Nội, TP. Thủ Đức, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "locknlock" in brand_name.lower() or "lock&lock" in brand_name.lower():
        return [
            {"name": "Lock&Lock Vincom Đồng Khởi", "address": "Tầng B2, Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Lock&Lock Royal City", "address": "Tầng B2, Royal City, 72A Nguyễn Trãi, Thanh Xuân, Hà Nội", "region": "Hà Nội"},
        ]
    if "k-market" in brand_name.lower():
        return [
            {"name": "K-Market Golden Palace", "address": "Tầng 1, Toà Golden Palace, Mễ Trì, Nam Từ Liêm, Hà Nội", "region": "Hà Nội"},
            {"name": "K-Market Sky Garden", "address": "S55-1 Tòa nhà Sky Garden 3, Tân Phong, Quận 7, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "be group" in brand_name.lower():
        return [
            {"name": "Trụ sở Be Group TP.HCM", "address": "Tầng 16, Sai Gon Tower, 29 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Chi nhánh Be Group Hà Nội", "address": "Tầng 8, Toyota Thanh Xuân, 315 Trường Chinh, Thanh Xuân, Hà Nội", "region": "Hà Nội"},
        ]
    if "grab" in brand_name.lower():
        return [
            {"name": "Trụ sở Grab Vietnam Mapletree", "address": "Tòa nhà Mapletree Business Centre, 1060 Nguyễn Văn Linh, Quận 7, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Trung tâm Grab Hà Nội", "address": "Tầng 1, Tòa nhà Kim Ánh, 78 Duy Tân, Cầu Giấy, Hà Nội", "region": "Hà Nội"},
        ]
    if "xanh sm" in brand_name.lower():
        return [
            {"name": "Trụ sở Xanh SM Symphony", "address": "Tòa nhà Symphony, Chu Huy Mân, Vinhomes Riverside, Long Biên, Hà Nội", "region": "Hà Nội"},
            {"name": "Chi nhánh Xanh SM Central Park", "address": "Park 7, Vinhomes Central Park, 208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]
    if "extrim" in brand_name.lower():
        return [
            {"name": "Extrim Điện Biên Phủ", "address": "127B Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM", "region": "TP. Hồ Chí Minh"},
            {"name": "Extrim Lê Văn Sỹ", "address": "285 Lê Văn Sỹ, Phường 1, Quận Tân Bình, TP.HCM", "region": "TP. Hồ Chí Minh"},
        ]

    # Trích xuất địa chỉ thông thường bằng regex
    addr_match = re.search(
        r"(?:Địa điểm|Địa chỉ|Tại)[\s:–-]*([^.]+?(?:Tp\.?\s*HCM|TP\.?\s*Hồ Chí Minh|Hà Nội|Đà Lạt|Phan Thiết|Bình Thuận|Vũng Tàu|Đà Nẵng|Quận\s*\d+|P\.\s*[^.]+?))",
        text_clean,
        re.IGNORECASE,
    )
    if addr_match:
        raw_addr = clean_address(addr_match.group(1))
        region = detect_region(raw_addr)
        if region == "Toàn Quốc":
            branch_name = "Hệ thống Toàn Quốc"
            address_val = "Áp dụng tại toàn bộ hệ thống cửa hàng trên toàn quốc"
        else:
            branch_name = f"Chi nhánh {region}"
            address_val = raw_addr if len(raw_addr) >= 10 else f"Cơ sở áp dụng tại {region}"
        return [{"name": branch_name, "address": address_val, "region": region}]

    # Mặc định theo khu vực
    region = detect_region(text_clean)
    if region == "Toàn Quốc":
        branch_name = "Hệ thống Toàn Quốc"
        address_val = "Áp dụng tại toàn bộ hệ thống cửa hàng trên toàn quốc"
    else:
        branch_name = f"Chi nhánh {region}"
        address_val = f"Cơ sở áp dụng tại {region}"

    return [{
        "name": branch_name,
        "address": address_val,
        "region": region,
    }]


def generate_all_entities() -> None:
    """Tạo file users.csv, partners.csv, branches.csv và đồng bộ vouchers.csv."""
    if not RAW_CRAWL_CSV_PATH.exists():
        print(f"[LỖI] Không tìm thấy file {RAW_CRAWL_CSV_PATH.name}", file=sys.stderr)
        return

    users_dict: dict[str, dict[str, str]] = {}
    partners_dict: dict[str, dict[str, str]] = {}
    partner_texts: dict[str, list[str]] = defaultdict(list)

    # Nhận diện số thứ tự site từ thư mục (web1, web2, web3,...) để phân tách dải ID hoàn toàn
    site_match = re.search(r"web(\d+)", str(USERS_CSV_PATH.parent).lower())
    site_num = int(site_match.group(1)) if site_match else 1

    tax_counter = 300000000 + site_num * 1000000
    phone_counter = site_num * 100000 + 1

    # Sinh mật khẩu bcrypt chuẩn 60 ký tự cho '12345678'
    bcrypt_password_hash = bcrypt.hashpw(b"12345678", bcrypt.gensalt(10)).decode("utf-8")

    used_phones: set[str] = set()

    with RAW_CRAWL_CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_name = clean_text(row.get("raw_name", ""))
            conditions = clean_text(row.get("raw_conditions", ""))
            desc = clean_text(row.get("raw_description", ""))

            brand_name = extract_brand_name(raw_name)
            partner_texts[brand_name].append(f"{conditions} {desc}")

            if brand_name not in partners_dict:
                slug = slugify(brand_name)
                user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"user.{slug}.web{site_num}"))
                partner_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"partner.{slug}.web{site_num}"))
                email = f"{slug}.web{site_num}@partner.voucherhub.vn" if site_num > 1 else f"{slug}@partner.voucherhub.vn"
                tax_code = f"0{tax_counter + len(partners_dict)}"

                # Ngành nghề
                category = "Ẩm Thực & Nhà Hàng"
                if any(k in brand_name.lower() for k in ("spa", "nail", "hair", "massage", "thẩm mỹ", "skin", "clinic")):
                    category = "Làm Đẹp & Spa"
                elif any(k in brand_name.lower() for k in ("nha khoa", "dental", "răng")):
                    category = "Nha Khoa & Y Tế"
                elif any(k in brand_name.lower() for k in ("tour", "resort", "hotel", "khách sạn", "du lịch")):
                    category = "Du Lịch & Khách Sạn"
                elif any(k in brand_name.lower() for k in ("đầm sen", "suối tiên", "metashow", "show", "pilates", "gym")):
                    category = "Giải Trí & Thể Thao"

                # Đảm bảo số điện thoại UNIQUE 100% cho ràng buộc DB theo từng site
                candidate_phone = f"0903{phone_counter:06d}"
                phone_counter += 1
                used_phones.add(candidate_phone)

                # 1. Tạo bản ghi User (với password đã băm Bcrypt)
                now_iso = "2026-08-26T00:00:00.000Z"
                users_dict[brand_name] = {
                    "id": user_id,
                    "email": email,
                    "phone": candidate_phone,
                    "password_hash": bcrypt_password_hash,  # Băm Bcrypt $2b$10$...
                    "role_id": "3",                         # Role PARTNER (id: 3 trên DB)
                    "status": "active",                     # UserStatus Enum: active
                    "full_name": f"Đại Diện {brand_name}",
                    "address": "",                           # Cập nhật theo chi nhánh
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }

                # 2. Tạo bản ghi Partner
                partners_dict[brand_name] = {
                    "id": partner_id,
                    "owner_user_id": user_id,
                    "legal_name": brand_name,
                    "tax_code": tax_code,
                    "representative": f"Đại Diện {brand_name}",
                    "business_category": category,
                    "logo_url": "",                          # NULL
                    "approval_status": "approved",           # ApprovalStatus Enum: approved
                    "operating_status": "active",            # OperatingStatus Enum: active
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }

    # Bóc tách Branches cho từng đối tác (offset ID để không trùng lặp khi import nhiều web)
    branches_list: list[dict[str, str | int | bool]] = []
    branch_id_counter = 1 if site_num == 1 else (site_num * 1000 + 1)

    for brand_name, partner_data in partners_dict.items():
        combined_text = " ".join(partner_texts[brand_name])
        extracted_branches = extract_branches_from_text(brand_name, combined_text)

        # Cập nhật địa chỉ chính cho User từ chi nhánh đầu tiên
        if extracted_branches:
            users_dict[brand_name]["address"] = extracted_branches[0]["address"]
        else:
            users_dict[brand_name]["address"] = "TP. Hồ Chí Minh"

        for br in extracted_branches:
            branches_list.append({
                "id": branch_id_counter,
                "partner_id": partner_data["id"],
                "name": br["name"],
                "address": br["address"],
                "region": br["region"],
                "is_active": "true",
            })
            branch_id_counter += 1

    # 1. Ghi file crawl/users.csv
    with USERS_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=USER_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(users_dict.values())
    print(f"Đã xuất thành công {len(users_dict)} tài khoản trong '{USERS_CSV_PATH.name}' (mật khẩu Bcrypt, phone UNIQUE 100%).")

    # 2. Ghi file crawl/partners.csv
    with PARTNERS_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=PARTNER_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(partners_dict.values())
    print(f"Đã xuất thành công {len(partners_dict)} đối tác trong '{PARTNERS_CSV_PATH.name}'.")

    # 3. Ghi file crawl/branches.csv
    with BRANCHES_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=BRANCH_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(branches_list)
    print(f"Đã xuất thành công {len(branches_list)} chi nhánh trong '{BRANCHES_CSV_PATH.name}'.")

    # 4. Cập nhật partner_id vào vouchers.csv
    if VOUCHERS_CSV_PATH.exists():
        updated_voucher_rows = []
        with VOUCHERS_CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            fields = reader.fieldnames
            for row in reader:
                vname = clean_text(row.get("name", ""))
                brand = extract_brand_name(vname)
                if brand in partners_dict:
                    row["partner_id"] = partners_dict[brand]["id"]
                updated_voucher_rows.append(row)

        with VOUCHERS_CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(updated_voucher_rows)
        print(f"Đã đồng bộ 'partner_id' cho toàn bộ {len(updated_voucher_rows)} voucher trong '{VOUCHERS_CSV_PATH.name}'.")


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Partner, User & Branch Generator Tool")
    parser.add_argument("--dir", type=str, default="", help="Thư mục làm việc chứa CSV (ví dụ: crawl/web1, crawl/web2)")
    args = parser.parse_args()

    global RAW_CRAWL_CSV_PATH, USERS_CSV_PATH, PARTNERS_CSV_PATH, BRANCHES_CSV_PATH, VOUCHERS_CSV_PATH
    if args.dir:
        d = Path(args.dir).resolve()
        RAW_CRAWL_CSV_PATH = d / "dataCrawl.csv"
        USERS_CSV_PATH = d / "users.csv"
        PARTNERS_CSV_PATH = d / "partners.csv"
        BRANCHES_CSV_PATH = d / "branches.csv"
        VOUCHERS_CSV_PATH = d / "vouchers.csv"

    generate_all_entities()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
