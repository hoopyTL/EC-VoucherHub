import sys
import re
import urllib.request
from bs4 import BeautifulSoup

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sample_urls = [
    "https://www.lifelink.vn/e-voucher/voucher-buffet-danh-cho-4-nguoi-tai-spicy-box-p164548",
    "https://www.lifelink.vn/e-voucher/voucher-hs-chicken-set-tai-lotteria-p164523",
    "https://www.lifelink.vn/e-voucher/buffet-chay-tuoi-ngon-ap-dung-tai-nha-hang-chay-tam-vi-p164667",
]

def parse_lifelink(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
        soup = BeautifulSoup(html, "html.parser")

        # 1. Tên
        h1 = soup.find("h1")
        name = h1.text.strip() if h1 else ""

        # 2. Giá
        # Tìm các text dạng xxx.xxx đ
        price_texts = re.findall(r"([\d.,]+)\s*[đĐ]", html)
        prices = []
        for p in price_texts:
            clean_digits = re.sub(r"\D", "", p)
            if clean_digits and 1000 <= int(clean_digits) <= 10000000:
                prices.append(int(clean_digits))

        sale_price = min(prices) if prices else 0
        orig_price = max(prices) if len(prices) > 1 else int(sale_price * 1.1)

        # 3. Ảnh
        img_url = ""
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if "lifelink.vn/img/" in src and any(sz in src for sz in ("s800x400", "s600x600", "s400x400", "c280x280", "upload", "mp")):
                if src.startswith("//"):
                    src = "https:" + src
                img_url = src
                break

        # 4. Mô tả
        desc_parts = []
        for el in soup.find_all(["div", "section"]):
            cls = " ".join(el.get("class", []))
            if any(k in cls.lower() for k in ("content", "detail", "condition", "note", "highlight")):
                t = el.text.strip()
                if len(t) > 50 and len(t) < 3000:
                    desc_parts.append(re.sub(r"[\r\n\t\s]+", " ", t))
        description = " | ".join(desc_parts[:2]) if desc_parts else name

        return {
            "name": name,
            "sale_price": sale_price,
            "orig_price": orig_price,
            "img_url": img_url,
            "description": description[:150] + "...",
        }

for u in sample_urls:
    res = parse_lifelink(u)
    print(f"Name: {res['name']}")
    print(f"Price: {res['sale_price']:,}đ / {res['orig_price']:,}đ")
    print(f"Img: {res['img_url']}")
    print(f"Desc: {res['description']}\n")
