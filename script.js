/* ============================================================
   PaisaOffers — script.js  PRODUCTION
   Source: WEB_SHEET (status_web = YES)
   API: your deployed Google Apps Script Web App URL
   ============================================================ */

const API_URL = "https://script.google.com/macros/s/AKfycbzR8WO3FsNJ7mek1nrSm3-V2YLafqjEJLYl1arATB2DiM8eQUaUc-ca7qplnDgmVCJ2/exec";

let allDeals      = [];   // approved + sorted
let filteredDeals = [];   // after search/filter
let visibleCount  = 12;

/* ================= LOAD DATA ================= */
async function loadDeals() {
  try {
    const url = API_URL + "?t=" + Date.now();
    console.log("[PaisaOffers] Fetching:", url);

    const res  = await fetch(url);
    const raw  = await res.json();

    console.log("[PaisaOffers] Raw rows from API:", raw.length);

    // Normalise every row
    const normalised = raw.map(normalize);

    // Filter: only rows where status_web === "YES"
    allDeals = normalised.filter(d => d.status_web === "YES");

    console.log("[PaisaOffers] Deals after YES filter:", allDeals.length);

    if (allDeals.length === 0) {
      console.warn(
        "[PaisaOffers] ⚠️  0 deals passed the filter. " +
        "Check that WEB_SHEET rows have status_web = YES (uppercase)."
      );
    }

    // Sort: highest discount first
    allDeals.sort((a, b) => b.discount - a.discount);

    filteredDeals = [...allDeals];

    renderHotDeals();
    renderDeals();
    updateCount();

  } catch (err) {
    console.error("[PaisaOffers] Load error:", err);
    const grid = document.getElementById("dealsGrid");
    if (grid) {
      grid.innerHTML = "<div class='empty-state'>⚠️ Failed to load deals. Check console.</div>";
    }
  }
}

/* ================= NORMALIZE ================= */
function normalize(row) {
  const oldP = parseFloat(row.old_price) || 0;
  const newP = parseFloat(row.new_price) || 0;

  const discount = (oldP > 0 && oldP > newP)
    ? Math.round(((oldP - newP) / oldP) * 100)
    : 0;

  // Trim and uppercase status_web so "yes", " YES ", etc. all match
  const statusRaw = String(row.status_web || "").trim().toUpperCase();

  return {
    title:      String(row.title  || "Deal").trim(),
    image:      String(row.image  || "https://via.placeholder.com/300").trim(),
    link:       String(row.link   || "#").trim(),
    hook:       String(row.hook   || "").trim(),
    old:        oldP,
    new:        newP,
    discount:   discount,
    status_web: statusRaw
  };
}

/* ================= HOT DEALS (top 6) ================= */
function renderHotDeals() {
  const container = document.getElementById("hotGrid");
  if (!container) return;

  const hotDeals = allDeals.slice(0, 6);
  container.innerHTML = hotDeals.map(card).join("");
}

/* ================= ALL DEALS ================= */
function renderDeals() {
  const grid = document.getElementById("dealsGrid");
  if (!grid) return;

  const slice = filteredDeals.slice(0, visibleCount);

  if (slice.length === 0) {
    grid.innerHTML = "<div class='empty-state'>No deals found</div>";
    document.getElementById("loadMoreWrap").style.display = "none";
    return;
  }

  grid.innerHTML = slice.map(card).join("");

  const loadMoreWrap = document.getElementById("loadMoreWrap");
  if (loadMoreWrap) {
    loadMoreWrap.style.display =
      filteredDeals.length > visibleCount ? "block" : "none";
  }
}

/* ================= CARD ================= */
function card(d) {
  const waText = encodeURIComponent(
    "🔥 " + d.title +
    "\n\n💰 ₹" + d.new + " (MRP ₹" + d.old + ")" +
    "\n\n👉 Buy Now: " + d.link
  );
  const waLink = "https://wa.me/?text=" + waText;

  const badgeHTML = d.discount > 0
    ? `<span class="discount-badge">${d.discount}% OFF</span>`
    : "";

  const hookHTML = d.hook
    ? `<div class="deal-hook">${escapeHtml(d.hook)}</div>`
    : "";

  const oldPriceHTML = d.old > 0
    ? `<span class="old-price">₹${format(d.old)}</span>`
    : "";

  return `
<div class="deal-card">
  <div class="deal-img-wrap">
    <img src="${escapeAttr(d.image)}" alt="${escapeAttr(d.title)}" loading="lazy"
         onerror="this.src='https://via.placeholder.com/300'">
    ${badgeHTML}
  </div>
  <div class="deal-body">
    <div class="deal-title">${escapeHtml(d.title)}</div>
    ${hookHTML}
    <div class="deal-prices">
      <span class="new-price">₹${format(d.new)}</span>
      ${oldPriceHTML}
    </div>
    <div class="deal-actions">
      <a href="${escapeAttr(d.link)}" target="_blank" rel="noopener" class="btn-buy"
         onclick="trackClick('${escapeAttr(d.title)}')">🛒 Buy</a>
      <a href="${escapeAttr(waLink)}" target="_blank" rel="noopener" class="btn-wa">📲</a>
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
  const query = String(q || "").toLowerCase().trim();

  filteredDeals = query
    ? allDeals.filter(d => d.title.toLowerCase().includes(query))
    : [...allDeals];

  visibleCount = 12;
  renderDeals();
  updateCount();
}

/* ================= SORT ================= */
function applyFilters() {
  const el  = document.getElementById("filterSort");
  const val = el ? el.value : "discount";

  if (val === "discount") {
    filteredDeals.sort((a, b) => b.discount - a.discount);
  } else {
    // "latest" = reverse of discount sort (original sheet order, roughly)
    filteredDeals.sort((a, b) => a.discount - b.discount);
  }

  visibleCount = 12;
  renderDeals();
}

/* ================= TRACKING ================= */
function trackClick(title) {
  console.log("[PaisaOffers] Clicked:", title);
}

/* ================= HELPERS ================= */
function format(num) {
  return Number(num).toLocaleString("en-IN");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", loadDeals);
