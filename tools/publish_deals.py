from __future__ import annotations

import json
import math
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
INPUT_FILE = ROOT_DIR / "tools" / "amazon_deal_queue.xlsx"
OUTPUT_FILE = ROOT_DIR / "data" / "deals.json"
REPORT_FILE = ROOT_DIR / "tools" / "publish_report.txt"

REQUIRED_COLUMNS = {
    "asin",
    "product_title",
    "product_image_url",
    "deal_price",
    "original_price",
    "site_stripe_affiliate_link",
    "review_status",
}

OPTIONAL_DEFAULTS = {
    "discount_percent": "",
    "category": "",
    "deal_description": "",
    "expiry_date": "",
    "date_added": "",
    "is_hot_deal": False,
    "tags": "",
}


def clean_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def parse_number(value: Any) -> float | None:
    raw = clean_string(value)
    if not raw:
        return None
    cleaned = (
        raw.replace(",", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .replace("INR", "")
        .replace("₹", "")
        .strip()
    )
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_date(value: Any) -> date | None:
    raw = clean_string(value)
    if not raw:
        return None
    parsed = pd.to_datetime(raw, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date()


def parse_datetime(value: Any) -> datetime:
    raw = clean_string(value)
    if not raw:
        return datetime.min
    parsed = pd.to_datetime(raw, errors="coerce")
    if pd.isna(parsed):
        return datetime.min
    if hasattr(parsed, "to_pydatetime"):
        return parsed.to_pydatetime().replace(tzinfo=None)
    return datetime.min


def date_to_string(value: Any) -> str:
    parsed = parse_date(value)
    return parsed.isoformat() if parsed else clean_string(value)


def bool_from_cell(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and not (isinstance(value, float) and math.isnan(value)):
        return value == 1
    raw = clean_string(value).lower()
    return raw in {"1", "1.0", "true", "yes", "y", "hot", "approved"}


def split_tags(value: Any) -> list[str]:
    raw = clean_string(value)
    if not raw:
        return []
    normalized = raw.replace("|", ",")
    return [tag.strip() for tag in normalized.split(",") if tag.strip()]


def valid_affiliate_link(link: str) -> bool:
    lowered = link.lower()
    return "amazon.in" in lowered or "amazon.com" in lowered


def row_to_deal(row: pd.Series) -> tuple[dict[str, Any] | None, str | None]:
    asin = clean_string(row.get("asin"))
    title = clean_string(row.get("product_title"))
    image_url = clean_string(row.get("product_image_url"))
    affiliate_link = clean_string(row.get("site_stripe_affiliate_link"))
    deal_price = parse_number(row.get("deal_price"))
    original_price = parse_number(row.get("original_price"))

    if not asin:
        return None, "missing asin"
    if not title:
        return None, "missing product_title"
    if not image_url:
        return None, "missing product_image_url"
    if deal_price is None:
        return None, "missing or invalid deal_price"
    if original_price is None:
        return None, "missing or invalid original_price"
    if not affiliate_link:
        return None, "missing site_stripe_affiliate_link"
    if not valid_affiliate_link(affiliate_link):
        return None, "affiliate link is not amazon.in or amazon.com"

    expiry = parse_date(row.get("expiry_date"))
    if expiry and expiry < date.today():
        return None, "expired deal"

    discount = parse_number(row.get("discount_percent"))
    if discount is None:
        if original_price > 0 and original_price > deal_price:
            discount = round(((original_price - deal_price) / original_price) * 100)
        else:
            discount = 0

    deal = {
        "asin": asin,
        "title": title,
        "image_url": image_url,
        "deal_price": deal_price,
        "original_price": original_price,
        "discount_percent": int(round(discount)),
        "category": clean_string(row.get("category")),
        "affiliate_link": affiliate_link,
        "description": clean_string(row.get("deal_description")),
        "date_added": date_to_string(row.get("date_added")),
        "expiry_date": date_to_string(row.get("expiry_date")),
        "tags": split_tags(row.get("tags")),
        "is_hot_deal": bool_from_cell(row.get("is_hot_deal")),
        "_date_added_sort": parse_datetime(row.get("date_added")),
    }
    return deal, None


def write_report(lines: list[str]) -> None:
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    report_lines: list[str] = []

    if not INPUT_FILE.exists():
        message = f"ERROR: Missing Excel file: {INPUT_FILE}"
        report_lines.append(message)
        report_lines.append("Put the reviewed workbook at tools/amazon_deal_queue.xlsx and run again.")
        write_report(report_lines)
        print(message)
        print("Put the reviewed workbook at tools/amazon_deal_queue.xlsx and run again.")
        return 1

    try:
        df = pd.read_excel(INPUT_FILE, engine="openpyxl")
    except Exception as exc:
        message = f"ERROR: Could not read {INPUT_FILE}: {exc}"
        report_lines.append(message)
        write_report(report_lines)
        print(message)
        return 1

    df.columns = [clean_string(col).lower() for col in df.columns]
    missing_columns = sorted(REQUIRED_COLUMNS - set(df.columns))
    if missing_columns:
        message = "ERROR: Missing required column(s): " + ", ".join(missing_columns)
        report_lines.append(message)
        report_lines.append("Required columns: " + ", ".join(sorted(REQUIRED_COLUMNS)))
        write_report(report_lines)
        print(message)
        return 1

    for column, default in OPTIONAL_DEFAULTS.items():
        if column not in df.columns:
            df[column] = default

    total_rows = len(df)
    approved = df[df["review_status"].map(lambda value: clean_string(value).upper() == "APPROVED")]
    approved_count = len(approved)

    skipped = Counter()
    deals_by_asin: dict[str, dict[str, Any]] = {}

    for _, row in approved.iterrows():
        deal, reason = row_to_deal(row)
        if reason:
            skipped[reason] += 1
            continue

        assert deal is not None
        existing = deals_by_asin.get(deal["asin"])
        if not existing or deal["_date_added_sort"] >= existing["_date_added_sort"]:
            deals_by_asin[deal["asin"]] = deal
        else:
            skipped["duplicate older asin"] += 1

    published_deals = list(deals_by_asin.values())
    published_deals.sort(key=lambda item: item["_date_added_sort"], reverse=True)

    for deal in published_deals:
        deal.pop("_date_added_sort", None)

    hot_deals = [deal for deal in published_deals if deal.get("is_hot_deal")]
    hot_deals.sort(key=lambda item: (item.get("discount_percent", 0), item.get("date_added", "")), reverse=True)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_deals": len(published_deals),
        "hot_deals": hot_deals,
        "all_deals": published_deals,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    skipped_count = sum(skipped.values())
    report_lines.extend(
        [
            "PaisaOffers publish report",
            f"Generated at: {payload['generated_at']}",
            f"Total rows read: {total_rows}",
            f"Approved rows found: {approved_count}",
            f"Published count: {len(published_deals)}",
            f"Skipped count: {skipped_count}",
            "Skip reasons:",
        ]
    )
    if skipped:
        for reason, count in sorted(skipped.items()):
            report_lines.append(f"- {reason}: {count}")
    else:
        report_lines.append("- none")

    write_report(report_lines)

    for line in report_lines:
        print(line)

    return 0


if __name__ == "__main__":
    sys.exit(main())
