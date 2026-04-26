/* ============================================================
   PaisaOffers — script.js  PRODUCTION
   Source: WEB_SHEET  |  Filter: status_web = YES
   ============================================================ */

const API_URL = "https://script.google.com/macros/s/AKfycbzR8WO3FsNJ7mek1nrSm3-V2YLafqjEJLYl1arATB2DiM8eQUaUc-ca7qplnDgmVCJ2/exec";

let allDeals      = [];
let filteredDeals = [];
let visibleCount  = 12;

/* ================= HELPERS ================= */
function fmt(num) {
  return Number(num || 0).toLocaleString("en-IN");
}

function safeStr(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function escHtml(str) {
  return safeStr(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  return safeStr(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ================= NORMALIZE ROW ================= */
/*
  WEB_SHEET columns (by header name):
  id | title | link | image | old_price | new_price | hook | status_web

  getField() does case-insensitive, space-tolerant key lookup so minor
  header variations ("status web", "Status_Web", etc.) are handled safely.
*/
function getField(row, ...candidates) {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const target = c.toLowerCase().replace(/[\s_]+/g, "_");
    const found  = keys.find(
      k => k.toLowerCase().replace(/[\s_]+/g, "_") === target
    );
    if (
      found !== undefined &&
      row[found] !== "" &&
      row[found] !== null &&
      row[found] !== undefined
    ) {
      return row[found];
    }
  }
  return "";
}

function normalize(row) {
  const oldP = parseFloat(getField(row, "old_price", "old price", "mrp")) || 0;
  const newP = parseFloat(getField(row, "new_price", "new price", "price")) || 0;

  const discount =
    oldP > 0 && oldP > newP
      ? Math.round(((oldP - newP) / oldP) * 100)
      : 0;

  const statusRaw = String(
    getField(row, "status_web", "status web", "statusweb", "status") || ""
  )
    .trim()
    .toUpperCase();

  return {
    title:      safeStr(getField(row, "title"))  || "Deal",
    image:      safeStr(getField(row, "image"))  || "",
    link:       safeStr(getField(row, "link"))   || "#",
    hook:       safeStr(getField(row, "hook")),
    old:        oldP,
    new:        newP,
    discount:   discount,
    status_web: statusRaw   // normalised to "YES" / "NO" / ""
  };
}

/* ================= LOAD DATA ================= */
async function loadDeals() {
  try {
    const url = API_URL + "?t=" + Date.now();
    console.log("[PaisaOffers] Fetching:", url);

    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);

    let raw;
    try {
      raw = await res.json();
    } catch (e) {
      throw new Error("JSON parse failed: " + e.message);
    }

    if (!Array.isArray(raw)) {
      console.error("[PaisaOffers] API did not return an array:", raw);
      throw new Error("Expected array from API");
    }

    console.log("[PaisaOffers] Raw rows from API:", raw.length);

    const normalised = raw.map(normalize);

    // ★ CORE FILTER — only approved deals
    allDeals = normalised.filter(d => d.status_web === "YES");

    console.log("[PaisaOffers] Deals with status_web=YES:", allDeals.length);

    if (allDeals.length === 0) {
      console.warn(
        "[PaisaOffers] ⚠️  0 deals passed the YES filter.\n" +
        "In WEB_SHEET, column 'status_web' must contain exactly: YES"
      );
    }

    // Sort: highest discount first
    allDeals.sort((a, b) => b.discount - a.discount);

    filteredDeals = [...allDeals];

    renderHotDeals();
    renderDeals();
    updateCount();

  } catch (err) {
    console.error("[PaisaOffers] Load failed:", err);
    const grid = document.getElementById("dealsGrid");
    if (grid) {
      grid.innerHTML =
        "<div class='empty-state'>⚠️ Failed to load deals. Check browser console.</div>";
    }
  }
}

/* ================= HOT DEALS (top 6) ================= */
function renderHotDeals() {
  const container = document.getElementById("hotGrid");
  if (!container) return;
  container.innerHTML = allDeals.slice(0, 6).map(card).join("");
}

/* ================= ALL DEALS ================= */
function renderDeals() {
  const grid = document.getElementById("dealsGrid");
  if (!grid) return;

  const slice = filteredDeals.slice(0, visibleCount);

  if (slice.length === 0) {
    grid.innerHTML = "<div class='empty-state'>No deals found</div>";
    setLoadMoreVisible(false);
    return;
  }

  grid.innerHTML = slice.map(card).join("");
  setLoadMoreVisible(filteredDeals.length > visibleCount);
}

function setLoadMoreVisible(show) {
  const wrap = document.getElementById("loadMoreWrap");
  if (wrap) wrap.style.display = show ? "block" : "none";
}

/* ================= CARD ================= */
function card(d) {
  const imgSrc = d.image || "https://via.placeholder.com/300x300?text=No+Image";

  const waText = encodeURIComponent(
    "🔥 " + d.title +
    "\n\n💰 ₹" + d.new + " (MRP ₹" + d.old + ")" +
    "\n\n👉 Buy Now: " + d.link
  );
  const waLink = "https://wa.me/?text=" + waText;

  const badge  = d.discount > 0
    ? `<span class="discount-badge">${d.discount}% OFF</span>`
    : "";

  const hookEl = d.hook
    ? `<div class="deal-hook">${escHtml(d.hook)}</div>`
    : "";

  const oldEl  = d.old > 0
    ? `<span class="old-price">₹${fmt(d.old)}</span>`
    : "";

  return `<div class="deal-card">
  <div class="deal-img-wrap">
    <img src="${escAttr(imgSrc)}" alt="${escAttr(d.title)}" loading="lazy"
         onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
    ${badge}
  </div>
  <div class="deal-body">
    <div class="deal-title">${escHtml(d.title)}</div>
    ${hookEl}
    <div class="deal-prices">
      <span class="new-price">₹${fmt(d.new)}</span>
      ${oldEl}
    </div>
    <div class="deal-actions">
      <a href="${escAttr(d.link)}" target="_blank" rel="noopener" class="btn-buy"
         onclick="trackClick('${escAttr(d.title)}')">🛒 Buy</a>
      <a href="${escAttr(waLink)}" target="_blank" rel="noopener" class="btn-wa">📲</a>
    </div>
  </div>
</div>`;
}

/* ================= LOAD MORE ================= */
function loadMore() {
  visibleCount += 12;
  renderDeals();
}

/* ================= COUNT ================= */
function updateCount() {
  const el = document.getElementById("dealCount");
  if (el) el.innerText = filteredDeals.length + " deals";
}

/* ================= SEARCH ================= */
function handleSearch(q) {
  const query = safeStr(q).toLowerCase();

  filteredDeals = query
    ? allDeals.filter(d => d.title.toLowerCase().includes(query))
    : [...allDeals];

  visibleCount = 12;
  renderDeals();
  updateCount();

  console.log("[PaisaOffers] Search:", JSON.stringify(query), "→", filteredDeals.length, "results");
}

/* ================= SORT ================= */
function applyFilters() {
  const el  = document.getElementById("filterSort");
  const val = el ? el.value : "discount";

  if (val === "discount") {
    filteredDeals.sort((a, b) => b.discount - a.discount);
  } else {
    filteredDeals.sort((a, b) => a.discount - b.discount);
  }

  visibleCount = 12;
  renderDeals();
}

/* ================= TRACKING ================= */
function trackClick(title) {
  console.log("[PaisaOffers] Clicked:", title);
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", loadDeals);
