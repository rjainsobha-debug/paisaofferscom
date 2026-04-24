/* ============================================================
PaisaOffers - FINAL PRODUCTION SCRIPT
Source: WEB_SHEET (status_web = YES)
============================================================ */

const API_URL = "https://script.google.com/macros/s/AKfycbya_hYfV16Uvm23mikMRX37Mc5yWSDyqno1reghCFU_eXQKLydm0FOG2CIljnKAhEUe/exec";

let allDeals = [];
let filteredDeals = [];
let visibleCount = 12;

/* ================= LOAD DATA ================= */
async function loadDeals() {
try {
const res = await fetch(API_URL + "?t=" + new Date().getTime());
const data = await res.json();

```
// 🔥 FILTER ONLY APPROVED DEALS
allDeals = data
  .map(normalize)
  .filter(d => d.status_web === "YES");

// 🔥 SORT BY BEST DISCOUNT
allDeals.sort((a, b) => b.discount - a.discount);

filteredDeals = [...allDeals];

renderHotDeals();
renderDeals();
updateCount();
```

} catch (err) {
console.error("Error:", err);
document.getElementById("dealsGrid").innerHTML =
"<div class='empty-state'>⚠️ Failed to load deals</div>";
}
}

/* ================= NORMALIZE ================= */
function normalize(row) {
const oldP = Number(row.old_price || 0);
const newP = Number(row.new_price || 0);

return {
title: row.title || "Deal",
image: row.image || "https://via.placeholder.com/300",
link: row.link || "#",
hook: row.hook || "",
old: oldP,
new: newP,
discount: oldP ? Math.round(((oldP - newP) / oldP) * 100) : 0,
status_web: (row.status_web || "").toUpperCase()
};
}

/* ================= HOT DEALS ================= */
function renderHotDeals() {
const container = document.getElementById("hotGrid");

const hotDeals = allDeals.slice(0, 6);

container.innerHTML = hotDeals.map(card).join("");
}

/* ================= ALL DEALS ================= */
function renderDeals() {
const grid = document.getElementById("dealsGrid");

const dealsToShow = filteredDeals.slice(0, visibleCount);

if (dealsToShow.length === 0) {
grid.innerHTML = "<div class='empty-state'>No deals found</div>";
return;
}

grid.innerHTML = dealsToShow.map(card).join("");

// Load More Button
document.getElementById("loadMoreWrap").style.display =
filteredDeals.length > visibleCount ? "block" : "none";
}

/* ================= CARD ================= */
function card(d) {
const waLink = "https://wa.me/?text=" + encodeURIComponent(
`🔥 ${d.title}\n\n💰 ₹${d.new} (MRP ₹${d.old})\n\n👉 Buy Now: ${d.link}`
);

return `

  <div class="deal-card">

```
<div class="deal-img-wrap">
  <img src="${d.image}" alt="${d.title}" loading="lazy">
  <span class="discount-badge">${d.discount}% OFF</span>
</div>

<div class="deal-body">
  <div class="deal-title">${d.title}</div>

  ${d.hook ? `<div class="deal-hook">${d.hook}</div>` : ""}

  <div class="deal-prices">
    <span class="new-price">₹${format(d.new)}</span>
    <span class="old-price">₹${format(d.old)}</span>
  </div>

  <div class="deal-actions">
    <a href="${d.link}" target="_blank" class="btn-buy"
       onclick="trackClick('${escapeStr(d.title)}')">
       🛒 Buy
    </a>

    <a href="${waLink}" target="_blank" class="btn-wa">📲</a>
  </div>
</div>
```

  </div>
  `;
}

/* ================= LOAD MORE ================= */
function loadMore() {
visibleCount += 12;
renderDeals();
}

/* ================= COUNT ================= */
function updateCount() {
document.getElementById("dealCount").innerText =
`${filteredDeals.length} deals`;
}

/* ================= SEARCH ================= */
function handleSearch(q) {
const query = q.toLowerCase();

filteredDeals = allDeals.filter(d =>
d.title.toLowerCase().includes(query)
);

visibleCount = 12;
renderDeals();
updateCount();
}

/* ================= SORT ================= */
function applyFilters() {
const val = document.getElementById("filterSort").value;

if (val === "discount") {
filteredDeals.sort((a,b) => b.discount - a.discount);
} else {
filteredDeals.reverse(); // latest
}

renderDeals();
}

/* ================= TRACKING ================= */
function trackClick(title) {
console.log("Clicked:", title);

// Optional: send to Google Sheet later
}

/* ================= HELPERS ================= */
function format(num) {
return Number(num).toLocaleString("en-IN");
}

function escapeStr(str) {
return str.replace(/'/g, "\'");
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", loadDeals);
