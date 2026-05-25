from __future__ import annotations

import json
import re
import time
from collections import Counter
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
SHEET_NAME = "SiteStripe Queue"
EXCEL_CANDIDATES = [
    ROOT / "tools" / "amazon_deal_queue.xlsx",
    ROOT / "data" / "exports" / "amazon_deal_queue.xlsx",
]
OUTPUT_JSON = ROOT / "data" / "deals.json"
REPORT_PATH = ROOT / "tools" / "publish_report.txt"
IMAGE_CACHE_PATH = ROOT / "tools" / "image_cache.json"
FALLBACK_IMAGE = "/opengraph.jpg"
REQUEST_TIMEOUT_SECONDS = 10
FETCH_DELAY_SECONDS = 0.75
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36 PaisaOffersPublisher/1.0"
)
ALLOWED_LINK_HOST_PARTS = ("amazon.in", "amzn.in", "amazon.com")


class ImageResolver:
    def __init__(self, cache_path: Path):
        self.cache_path = cache_path
        self.cache: dict[str, dict[str, str]] = self._load_cache()
        self.images_fetched = 0
        self.images_from_cache = 0
        self.image_fetch_failed = 0
        self.fallback_images_used = 0
        self._last_fetch_at = 0.0

    def resolve(self, asin: str, product_url: str) -> str:
        asin = (asin or "").strip().upper()
        cached = self.cache.get(asin)
        if cached and cached.get("image_url"):
            self.images_from_cache += 1
            if cached.get("source") == "fallback":
                self.fallback_images_used += 1
            return cached["image_url"]

        image_url = ""
        source = ""
        try:
            image_url, source = self._fetch_image(asin, product_url)
        except Exception:
            image_url = ""

        if image_url:
            self.images_fetched += 1
            self.cache[asin] = {
                "asin": asin,
                "image_url": image_url,
                "fetched_at": _now_iso(),
                "source": source or "amazon_page",
            }
            return image_url

        self.image_fetch_failed += 1
        self.fallback_images_used += 1
        self.cache[asin] = {
            "asin": asin,
            "image_url": FALLBACK_IMAGE,
            "fetched_at": _now_iso(),
            "source": "fallback",
        }
        return FALLBACK_IMAGE

    def save(self) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(json.dumps(self.cache, indent=2, ensure_ascii=False), encoding="utf-8")

    def _fetch_image(self, asin: str, product_url: str) -> tuple[str, str]:
        url = product_url or f"https://www.amazon.in/dp/{asin}"
        self._polite_delay()
        response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        html = response.text or ""
        if _looks_blocked(html):
            return "", ""
        soup = BeautifulSoup(html, "html.parser")

        og_image = _clean_image_url((soup.find("meta", property="og:image") or {}).get("content"), url)
        if og_image:
            return og_image, "og:image"

        landing_image = soup.find("img", id="landingImage")
        if landing_image:
            src_image = _clean_image_url(landing_image.get("src"), url)
            if src_image:
                return src_image, "landingImage:src"
            dynamic_image = _dynamic_image_url(landing_image.get("data-a-dynamic-image"), url)
            if dynamic_image:
                return dynamic_image, "landingImage:data-a-dynamic-image"
        return "", ""

    def _polite_delay(self) -> None:
        elapsed = time.monotonic() - self._last_fetch_at
        if elapsed < FETCH_DELAY_SECONDS:
            time.sleep(FETCH_DELAY_SECONDS - elapsed)
        self._last_fetch_at = time.monotonic()

    def _load_cache(self) -> dict[str, dict[str, str]]:
        if not self.cache_path.exists():
            return {}
        try:
            data = json.loads(self.cache_path.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except (OSError, json.JSONDecodeError):
            return {}


def main() -> int:
    excel_path = _find_excel_file()
    if not excel_path:
        print("ERROR: Could not find tools/amazon_deal_queue.xlsx or data/exports/amazon_deal_queue.xlsx")
        return 1

    rows = _read_rows(excel_path)
    image_resolver = ImageResolver(IMAGE_CACHE_PATH)
    skipped = Counter()
    approved_rows = []
    candidates_by_asin: dict[str, dict[str, Any]] = {}

    for row in rows:
        if str(row.get("review_status", "")).strip().upper() != "APPROVED":
            skipped["not_approved"] += 1
            continue
        approved_rows.append(row)

        reason = _validation_skip_reason(row)
        if reason:
            skipped[reason] += 1
            continue

        asin = str(row.get("asin", "")).strip().upper()
        existing = candidates_by_asin.get(asin)
        if existing is None or _row_sort_date(row) > _row_sort_date(existing):
            candidates_by_asin[asin] = row

    deals = []
    for row in candidates_by_asin.values():
        asin = str(row.get("asin", "")).strip().upper()
        normalized_url = str(row.get("normalized_amazon_url", "")).strip() or f"https://www.amazon.in/dp/{asin}"
        image_url = image_resolver.resolve(asin, normalized_url)
        deal = _deal_from_row(row, image_url)
        deals.append(deal)

    image_resolver.save()
    deals.sort(key=lambda item: _parse_date(item.get("date_added")), reverse=True)
    hot_deals = sorted(deals, key=lambda item: _number(item.get("discount_percent")), reverse=True)[:6]
    for item in hot_deals:
        item["is_hot_deal"] = True

    payload = {
        "generated_at": _now_iso(),
        "total_deals": len(deals),
        "hot_deals": hot_deals,
        "all_deals": deals,
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    published_count = len(deals)
    skipped_count = sum(skipped.values())
    _write_report(
        excel_path=excel_path,
        total_rows=len(rows),
        approved_rows=len(approved_rows),
        published_count=published_count,
        skipped_count=skipped_count,
        skipped=skipped,
        image_resolver=image_resolver,
    )
    _print_summary(len(rows), len(approved_rows), published_count, skipped_count, skipped, image_resolver)
    return 0


def _find_excel_file() -> Path | None:
    for path in EXCEL_CANDIDATES:
        if path.exists():
            return path
    return None


def _read_rows(excel_path: Path) -> list[dict[str, Any]]:
    workbook = load_workbook(excel_path, read_only=True, data_only=True)
    try:
        if SHEET_NAME not in workbook.sheetnames:
            raise SystemExit(f"ERROR: Missing required sheet: {SHEET_NAME}")
        sheet = workbook[SHEET_NAME]
        headers = [str(cell.value or "").strip() for cell in next(sheet.iter_rows(min_row=1, max_row=1))]
        rows = []
        for values in sheet.iter_rows(min_row=2, values_only=True):
            row = {headers[index]: value for index, value in enumerate(values) if index < len(headers)}
            if any(value not in (None, "") for value in row.values()):
                rows.append(row)
        return rows
    finally:
        workbook.close()


def _validation_skip_reason(row: dict[str, Any]) -> str:
    required = {
        "asin": row.get("asin"),
        "deal_price": row.get("deal_price"),
        "original_price": row.get("original_price"),
        "site_stripe_affiliate_link": row.get("site_stripe_affiliate_link"),
    }
    for field, value in required.items():
        if value in (None, ""):
            return f"missing_{field}"
    if not _is_allowed_amazon_link(str(row.get("site_stripe_affiliate_link", ""))):
        return "invalid_affiliate_link"
    if not str(row.get("clean_title", "")).strip():
        return "missing_clean_title"
    if _number(row.get("deal_price")) <= 0:
        return "invalid_deal_price"
    if _number(row.get("original_price")) <= 0:
        return "invalid_original_price"
    return ""


def _deal_from_row(row: dict[str, Any], image_url: str) -> dict[str, Any]:
    source_name = str(row.get("source_name", "") or "").strip()
    return {
        "asin": str(row.get("asin", "") or "").strip().upper(),
        "title": str(row.get("clean_title", "") or "").strip(),
        "image_url": image_url or FALLBACK_IMAGE,
        "deal_price": _number(row.get("deal_price")),
        "original_price": _number(row.get("original_price")),
        "discount_percent": _number(row.get("discount_pct")),
        "category": str(row.get("category", "") or source_name).strip(),
        "affiliate_link": str(row.get("site_stripe_affiliate_link", "") or "").strip(),
        "description": str(row.get("short_message", "") or "").strip(),
        "date_added": _date_text(row.get("collected_at")),
        "expiry_date": str(row.get("expiry_date", "") or "").strip(),
        "tags": [],
        "is_hot_deal": False,
    }


def _is_allowed_amazon_link(url: str) -> bool:
    lowered = (url or "").lower()
    return any(part in lowered for part in ALLOWED_LINK_HOST_PARTS)


def _row_sort_date(row: dict[str, Any]) -> datetime:
    return max(_parse_date(row.get("reviewed_at")), _parse_date(row.get("collected_at")))


def _parse_date(value: Any) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    text = str(value or "").strip()
    if not text:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def _date_text(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    return str(value or "").strip()


def _number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "")
    match = re.search(r"-?\d+(?:,\d{2,3})*(?:\.\d+)?|-?\d+(?:\.\d+)?", text)
    return float(match.group(0).replace(",", "")) if match else 0.0


def _clean_image_url(value: str | None, base_url: str) -> str:
    if not value:
        return ""
    value = unescape(str(value)).strip().strip("\"'")
    if value.startswith("//"):
        value = f"https:{value}"
    if value.startswith("/"):
        value = urljoin(base_url, value)
    if not value.startswith(("http://", "https://")):
        return ""
    return value.split()[0]


def _dynamic_image_url(raw_value: str | None, base_url: str) -> str:
    if not raw_value:
        return ""
    try:
        data = json.loads(unescape(raw_value))
    except json.JSONDecodeError:
        return ""
    if not isinstance(data, dict):
        return ""
    for url in data:
        cleaned = _clean_image_url(url, base_url)
        if cleaned:
            return cleaned
    return ""


def _looks_blocked(html: str) -> bool:
    lowered = (html or "").lower()
    return "captcha" in lowered or "robot check" in lowered or "enter the characters you see below" in lowered


def _now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _write_report(
    *,
    excel_path: Path,
    total_rows: int,
    approved_rows: int,
    published_count: int,
    skipped_count: int,
    skipped: Counter,
    image_resolver: ImageResolver,
) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"excel_path: {excel_path}",
        f"sheet_name: {SHEET_NAME}",
        f"total rows read: {total_rows}",
        f"approved rows found: {approved_rows}",
        f"published count: {published_count}",
        f"skipped count: {skipped_count}",
        "skipped reasons:",
    ]
    if skipped:
        lines.extend(f"  {reason}: {count}" for reason, count in sorted(skipped.items()))
    else:
        lines.append("  none: 0")
    lines.extend(
        [
            f"images_fetched: {image_resolver.images_fetched}",
            f"images_from_cache: {image_resolver.images_from_cache}",
            f"image_fetch_failed: {image_resolver.image_fetch_failed}",
            f"fallback_images_used: {image_resolver.fallback_images_used}",
        ]
    )
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _print_summary(
    total_rows: int,
    approved_rows: int,
    published_count: int,
    skipped_count: int,
    skipped: Counter,
    image_resolver: ImageResolver,
) -> None:
    print("PaisaOffers publish summary")
    print(f"Rows read: {total_rows}")
    print(f"Approved rows found: {approved_rows}")
    print(f"Published deals: {published_count}")
    print(f"Skipped rows: {skipped_count}")
    if skipped:
        print("Skipped reasons:")
        for reason, count in sorted(skipped.items()):
            print(f"  {reason}: {count}")
    print(f"images_fetched: {image_resolver.images_fetched}")
    print(f"images_from_cache: {image_resolver.images_from_cache}")
    print(f"image_fetch_failed: {image_resolver.image_fetch_failed}")
    print(f"fallback_images_used: {image_resolver.fallback_images_used}")
    print(f"Wrote: {OUTPUT_JSON}")
    print(f"Report: {REPORT_PATH}")


if __name__ == "__main__":
    raise SystemExit(main())
