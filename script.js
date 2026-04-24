/* ============================================================
PaisaOffers - PIPELINE BASED SCRIPT
Works with: TG_SHEET → WEB_SHEET → WA_SHEET
Website ONLY shows WEB_SHEET where transfer_to_web = YES
============================================================ */

const GOOGLE_SHEET_API = "PUT_YOUR_WEB_SHEET_API_URL_HERE";

let allDeals = [];
let filteredDeals = [];
let visibleCount = 8;
let currentCategory = "All";

/* ========================= LOAD DEALS ========================= */
async function loadDeals() {
try {
const res = await fetch(GOOGLE_SHEET_API + "?t=" + new Date().getTime());
const data = await res.json();

```
// 🔥 ONLY SHOW APPROVED DEALS
allDeals = data
  .map(normalizeDeal)
  .filter(d =>
    d &&
    d.transfer_to_web === "YES"
  );

// 🔥 SORT: BEST DEALS FIRST
allDeals.sort((a, b) => b.discount - a.discount);

filteredDeals = [...allDeals];

updateDealCount();
renderDeals();
```

} catch (err) {
console.error("Error loading deals:", err);
document.getElementById("dealsGrid").innerHTML =
"<p style='text-align:center'>Failed to load deals</p>";
}
}

/* ========================= NORMALIZE ========================= */
function normalizeDeal(row) {
if (!row) return null;

const oldPrice = parseFloat(row.old_price || row.oldPrice || 0) || 0;
const newPrice = parseFloat(row.new_price || row.newPrice || 0) || 0;

const discount = oldPrice
? Math.round(((oldPrice - newPrice) / oldPrice) * 100)
: 0;

return {
title: row.title || "Product Deal",
image: row.image || "https://placehold.co/400x300",
store: row.store || "Amazon",
oldPrice,
newPrice,
discount,
link: row.link || "#",
category: row.category || "General",
expiry: row.expiry || "",
transfer_to_web: (row.transfer_to_web || "").toUpperCase()
};
}

/* ========================= RENDER ========================= */
function renderDeals() {
const grid = document.getElementById("dealsGrid");
if (!grid) return;

if (filteredDeals.length === 0) {
grid.innerHTML = "<p style='text-align:center'>No deals available</p>";
return;
}

const dealsToShow = filteredDeals.slice(0, visibleCount);

grid.innerHTML = dealsToShow.map(d => createCard(d)).join("");
}

/* ========================= CARD ========================= */
function createCard(d) {
return `

  <div class="deal-card">
    <div class="deal-img-wrap">
      <img src="${d.image}" alt="${d.title}" loading="lazy">
      <span class="disc-badge">${d.discount}% OFF</span>
    </div>

```
<div class="deal-body">
  <div class="deal-title">${d.title}</div>

  <div class="deal-prices">
    <span class="price-new">₹${formatPrice(d.newPrice)}</span>
    <span class="price-old">₹${formatPrice(d.oldPrice)}</span>
  </div>
</div>

<a href="${d.link}" target="_blank" class="deal-cta">
  🔥 Grab Deal
</a>
```

  </div>
  `;
}

/* ========================= FILTER ========================= */
function filterCategory(cat) {
currentCategory = cat;

filteredDeals = allDeals.filter(d => {
return cat === "All" || d.category.toLowerCase() === cat.toLowerCase();
});

visibleCount = 8;
updateDealCount();
renderDeals();
}

/* ========================= LOAD MORE ========================= */
function loadMoreDeals() {
visibleCount += 8;
renderDeals();
}

/* ========================= COUNT ========================= */
function updateDealCount() {
const el = document.getElementById("dealCount");
if (el) el.textContent = `${filteredDeals.length} deals`;
}

/* ========================= HELPERS ========================= */
function formatPrice(n) {
return Number(n).toLocaleString("en-IN");
}

/* ========================= INIT ========================= */
document.addEventListener("DOMContentLoaded", () => {
loadDeals();
});
