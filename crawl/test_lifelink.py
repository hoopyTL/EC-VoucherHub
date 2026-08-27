import sys
import urllib.request
from bs4 import BeautifulSoup

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

url = "https://www.lifelink.vn/e-voucher/voucher-buffet-danh-cho-4-nguoi-tai-spicy-box-p164548"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
try:
    with urllib.request.urlopen(req, timeout=15) as response:
        html = response.read().decode("utf-8", errors="ignore")
        soup = BeautifulSoup(html, "html.parser")
        
        # 1. Tên voucher
        h1 = soup.find("h1")
        print("Tên voucher:", h1.text.strip() if h1 else "Không tìm thấy")

        # 2. Giá
        print("\n--- CÁC THẺ GIÁ ---")
        for el in soup.find_all(["span", "div", "p", "strong"]):
            cls = " ".join(el.get("class", []))
            txt = el.text.strip()
            if any(k in cls.lower() for k in ("price", "gia", "amount", "cost")) and len(txt) < 30 and any(c.isdigit() for c in txt):
                print(f"[{cls}]: {txt}")

        # 3. Ảnh
        print("\n--- CÁC ẢNH SẢN PHẨM ---")
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src")
            alt = img.get("alt", "")
            if src and not any(k in src.lower() for k in ("icon", "logo", "banner-top", "footer")):
                print(f"Src: {src} | Alt: {alt}")

        # 4. Mô tả / Điểm nổi bật / Điều kiện
        print("\n--- NỘI DUNG MÔ TẢ & ĐIỀU KIỆN ---")
        desc_containers = soup.find_all(["div", "section", "article"])
        for c in desc_containers:
            cls = " ".join(c.get("class", []))
            cid = c.get("id", "")
            if any(k in (cls + " " + cid).lower() for k in ("detail", "description", "content", "condition", "highlight", "thong-tin", "dieu-kien")):
                text = c.text.strip()
                if len(text) > 100:
                    print(f"[{cls or cid}]: {text[:300]}...\n")
                    break

except Exception as e:
    print("Lỗi:", e)
