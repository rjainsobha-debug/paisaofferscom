// ============================================================
// PaisaOffers.com - Main Script
// Google Sheets API + Dynamic Deals + All Features
// ============================================================

const GOOGLE_SHEET_API = "https://script.google.com/macros/s/AKfycbxfEfy9NGcCxrp8eRU2baDJdu302nA0YHug0N1NxziyWcGEGZwIJiLMhAyF5TqZUSSW_w/exec";
const TELEGRAM_CHANNEL = "https://t.me/paisaoffersdotcom";
const TELEGRAM_BOT = "https://t.me/paisaoffers_bot";
const GA_ID = "G-Q1EHZH78QC";

// Affiliate links
const AFFILIATE = {
  amazon1: "https://amzn.to/4t7XSrt",
  amazon2: "https://amzn.to/4voS5PM",
  amazon3: "https://amzn.to/4tJGSaX"
};

// Fallback static deals (shown if Sheets API fails)
const STATIC_DEALS = [
  {
    title: "boAt Rockerz 450 Pro Wireless Headphone with 70H Playback",
    image: "https://m.media-amazon.com/images/I/71nVuD1Tg+L._SX679_.jpg",
    store: "Amazon",
    oldPrice: 2990,
    newPrice: 899,
    discount: 70,
    cashback: "8% Cashback",
    link: AFFILIATE.amazon1,
    category: "Electronics",
    expiry: new Date(Date.now() + 3600000 * 18).toISOString()
  },
  {
    title: "Fastrack Unisex Round Dial Analog Watch – Stylish & Sporty",
    image: "https://m.media-amazon.com/images/I/71VbYhfDpyL._SX679_.jpg",
    store: "Amazon",
    oldPrice: 2295,
    newPrice: 799,
    discount: 65,
    cashback: "6% Cashback",
    link: AFFILIATE.amazon2,
    category: "Fashion",
    expiry: new Date(Date.now() + 3600000 * 10).toISOString()
  },
  {
    title: "Prestige PKPW 5.0 Stainless Steel Pressure Cooker 5 Litres",
    image: "https://m.media-amazon.com/images/I/71oqyT9yYcL._SX679_.jpg",
    store: "Amazon",
    oldPrice: 2595,
    newPrice: 1049,
    discount: 60,
    cashback: "8% Cashback",
    link: AFFILIATE.amazon3,
    category: "Home",
    expiry: new Date(Date.now() + 3600000 * 6).toISOString()
  },
  {
    title: "Fire-Boltt Ninja Call Pro Plus 1.83\" Smart Watch with Bluetooth Calling",
    image: "https://m.media-amazon.com/images/I/71AxMRHF38L._SX679_.jpg",
    store: "Amazon",
    oldPrice: 6999,
    newPrice: 1299,
    discount: 81,
    cashback: "8% Cashback",
    link: AFFILIATE.amazon1,
    category: "Electronics",
    expiry: new Date(Date.now() + 3600000 * 24).toISOString()
  },
  {
    title: "Philips HL7756/00 600W Mixer Grinder with 4 Jars",
    image: "https://m.media-amazon.com/images/I/71iBJYR0xYL._SX679_.jpg",
    store: "Amazon",
    oldPrice: 4295,
    newPrice: 2199,
    discount: 49,
    cashback: "7% Cashback",
    link: AFFILIATE.amazon2,
    category: "Home",
    expiry: new Date(Date.now() + 3600000 * 36).toISOString()
  },
  {
    title: "ZEBRONICS Zeb-Sound Feast 700 Wireless Bluetooth Over Ear Headphone",
    image: "https://m.media-amazon.com/images/I/61BQS9QIEXL._SX679_.jpg",
    store: "Amazon",
    oldPrice: 3999,
    newPrice: 799,
    discount: 80,
    cashback: "8% Cashback",
    link: AFFILIATE.amazon3,
    category: "Electronics",
    expiry: new Date(Date.now() + 3600000 * 12).toISOString()
  },
  {
    title: "Allen Cooper Men's Leather Chelsea Boots (Brown)",
    image: "https://m.media-amazon.com/images/I/71qzJYV4VdL._SX679_.jpg",
    store: "Flipkart",
    oldPrice: 4999,
    newPrice: 1299,
    discount: 74,
    cashback: "6% Cashback",
    link: AFFILIATE.amazon1,
    category: "Fashion",
    expiry: new Date(Date.now() + 3600000 * 48).toISOString()
  },
  {
    title: "Kent Grand Plus 11L Water Purifier with RO+UV+UF+TDS Control",
    image: "https://m.media-amazon.com/images/I/713eFJGr4YL._SX679_.jpg",
    store: "Amazon",
    oldPrice: 19800,
    newPrice: 12999,
    discount: 34,
    cashback: "8% Cashback",
    link: AFFILIATE.amazon2,
    category: "Home",
    expiry: new Date(Date.now() + 3600000 * 72).toISOString()
  }
];

// Global state
let allDeals = [];
let filteredDeals = [];
let visibleCount = 8;
let currentCategory = "All";
let currentSlide = 0;
let slideTotal = 3;
let carouselInterval = null;
let countdownIntervals = {};

// ============================================================ GA TRACKING
function trackEvent(eventName, label) {
  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, { event_label: label, event_category: 'PaisaOffers' });
    }
  } catch (e) {}
}

// ============================================================ INIT
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCarousel();
  initSearch();
  initScrollEffects();
  animateCounters();
  loadDeals();
  showTelegramPopup();
});

// ============================================================ NAVBAR
function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    if (navLinks.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // Close menu on link click
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger?.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });
}

// ============================================================ CAROUSEL
function initCarousel() {
  const track = document.getElementById('carouselTrack');
  document.getElementById('prevBtn')?.addEventListener('click', () => { prevSlide(); resetCarouselInterval(); });
  document.getElementById('nextBtn')?.addEventListener('click', () => { nextSlide(); resetCarouselInterval(); });

  carouselInterval = setInterval(nextSlide, 5000);
}

function goToSlide(n) {
  currentSlide = n;
  document.getElementById('carouselTrack').style.transform = `translateX(-${currentSlide * 100}%)`;
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
  resetCarouselInterval();
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % slideTotal;
  goToSlide(currentSlide);
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + slideTotal) % slideTotal;
  goToSlide(currentSlide);
}

function resetCarouselInterval() {
  clearInterval(carouselInterval);
  carouselInterval = setInterval(nextSlide, 5000);
}

// ============================================================ SCROLL EFFECTS
function initScrollEffects() {
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar?.classList.add('scrolled');
      backToTop?.classList.add('show');
    } else {
      navbar?.classList.remove('scrolled');
      backToTop?.classList.remove('show');
    }
  }, { passive: true });
}

// ============================================================ ANIMATED COUNTERS
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        let current = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          current += step;
          if (current >= target) { current = target; clearInterval(timer); }
          el.textContent = Math.floor(current).toLocaleString('en-IN');
        }, 20);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

// ============================================================ LOAD DEALS (Google Sheets)
async function loadDeals() {
  try {
    const response = await fetch(GOOGLE_SHEET_API, { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();

    // Try to parse Sheets data - handle various formats
    if (Array.isArray(data) && data.length > 0) {
      allDeals = data.map(normalizeSheetDeal).filter(Boolean);
    } else if (data && data.deals && Array.isArray(data.deals)) {
      allDeals = data.deals.map(normalizeSheetDeal).filter(Boolean);
    } else if (data && typeof data === 'object' && data.values) {
      allDeals = parseSheetValues(data.values);
    } else {
      throw new Error('Unknown format');
    }

    if (allDeals.length === 0) throw new Error('No deals');
  } catch (err) {
    console.warn('Using static deals (Sheet API unavailable or empty):', err.message);
    allDeals = STATIC_DEALS;
  }

  filteredDeals = [...allDeals];
  updateDealCount();
  renderDeals();
  renderEditorPicks();
}

function normalizeSheetDeal(row) {
  // Handles object rows from Google Apps Script JSON
  if (!row) return null;
  return {
    title: row.title || row.Title || row.name || row.Name || 'Product Deal',
    image: row.image || row.Image || row.imageUrl || row.img || 'https://placehold.co/400x300/f5f7fa/6b7280?text=Deal',
    store: row.store || row.Store || row.platform || 'Amazon',
    oldPrice: parseFloat(row.oldPrice || 0) || 0,
    newPrice: parseFloat(row.newPrice || row.price || 0) || 0,
    discount: parseFloat(row.discount || row.discountPercent || row.Discount || 0) || 0,
    cashback: row.cashback || row.Cashback || '8% Cashback',
    link: row.link || row.url || row.affiliateLink || row.Link || AFFILIATE.amazon1,
    category: row.category || row.Category || 'Electronics',
    expiry: row.expiry || row.Expiry || row.validTill || new Date(Date.now() + 86400000).toISOString()
  };
}

function parseSheetValues(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(h => h.toLowerCase().trim());
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return normalizeSheetDeal(obj);
  }).filter(Boolean);
}

// ============================================================ RENDER DEALS
function renderDeals() {
  const grid = document.getElementById('dealsGrid');
  if (!grid) return;

  if (filteredDeals.length === 0) {
    grid.innerHTML = '<div class="loading-spinner"><p>No deals found. Try different filters.</p></div>';
    return;
  }

  const toShow = filteredDeals.slice(0, visibleCount);
  grid.innerHTML = toShow.map(deal => createDealCard(deal)).join('');

  // Start countdown timers
  toShow.forEach((deal, i) => startCountdown(deal, `deal-${i}`));

  // Show/hide load more
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  if (loadMoreWrap) {
    loadMoreWrap.style.display = filteredDeals.length > visibleCount ? 'block' : 'none';
  }

  // Lazy load images
  lazyLoadImages();
}

function createDealCard(deal, id) {
  const discount = Math.round(deal.discount) || Math.round(((deal.oldPrice - deal.newPrice) / deal.oldPrice) * 100) || 0;
  const savings = deal.oldPrice && deal.newPrice ? Math.round(deal.oldPrice - deal.newPrice) : 0;
  const index = id || Math.random().toString(36).substr(2, 6);

  return `
    <div class="deal-card">

      <div class="deal-image-wrap">
        <img 
          src="${escapeHtml(deal.image)}" 
          alt="${escapeHtml(deal.title)}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x300'"
        >

        <div class="deal-badges">
          ${discount > 0 ? `<span class="badge badge-discount">🔥 ${discount}% OFF</span>` : ''}
          ${deal.cashback ? `<span class="badge badge-cashback">💰 ${escapeHtml(deal.cashback)}</span>` : ''}
          <span class="badge badge-store">${escapeHtml(deal.store)}</span>
        </div>
      </div>

      <div class="deal-body">
        <div class="deal-title">${escapeHtml(deal.title)}</div>

        <div class="deal-prices">
          ${deal.oldPrice ? `<span class="price-old">₹${deal.oldPrice}</span>` : ''}
          ${deal.newPrice ? `<span class="price-new">₹${deal.newPrice}</span>` : ''}
          ${savings > 0 ? `<span class="price-save">Save ₹${savings}</span>` : ''}
        </div>
      </div>

      <div class="deal-footer">
        <a href="${deal.link}" target="_blank" class="deal-cta">
          Get This Deal
        </a>
      </div>

    </div>
  `;
}

function renderEditorPicks() {
  const grid = document.getElementById('editorDealsGrid');
  if (allDeals.length < 3) return;
  if (!grid || allDeals.length === 0) return;

  const picks = allDeals.length > 4
  ? [...allDeals]
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(2, 6)
  : [...allDeals];   // fallback if less deals
  grid.innerHTML = picks.map((deal, i) => createDealCard(deal, `ep-${i}`)).join('');
  picks.forEach((deal, i) => startCountdown(deal, `ep-${i}`));
}

// ============================================================ COUNTDOWN TIMER
function startCountdown(deal, id) {
  if (!deal.expiry) return;
  if (countdownIntervals[id]) clearInterval(countdownIntervals[id]);

  function update() {
    const el = document.getElementById(`timer-${id}`);
    if (!el) { clearInterval(countdownIntervals[id]); return; }

    const expiry = new Date(deal.expiry).getTime();
    const now = Date.now();
    const diff = expiry - now;

    if (diff <= 0) {
      el.textContent = 'Expired';
      el.style.color = '#9CA3AF';
      clearInterval(countdownIntervals[id]);
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (h > 48) {
      el.textContent = `${Math.floor(h / 24)}d left`;
    } else {
      el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} left`;
    }
  }

  update();
  countdownIntervals[id] = setInterval(update, 1000);
}

// ============================================================ SEARCH
function initSearch() {
  const input = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { dropdown.classList.remove('show'); return; }

      const results = allDeals.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.store.toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      ).slice(0, 5);

      if (results.length === 0) { dropdown.classList.remove('show'); return; }

      dropdown.innerHTML = results.map(d => `
        <a href="${escapeHtml(d.link)}" target="_blank" class="search-result-item"
           onclick="trackEvent('deal_click', 'Search: ${escapeHtml(d.title.slice(0,30))}')" rel="noopener">
          <i class="fas fa-tag" style="color:var(--primary)"></i>
          <span>${escapeHtml(d.title)}</span>
        </a>
      `).join('');
      dropdown.classList.add('show');
    }, 250);
  });

  // Also filter main grid on Enter
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      dropdown.classList.remove('show');
      const q = input.value.trim().toLowerCase();
      filteredDeals = q.length < 2 ? [...allDeals] : allDeals.filter(d =>
        d.title.toLowerCase().includes(q) || d.store.toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q)
      );
      applySort();
      visibleCount = 8;
      updateDealCount();
      renderDeals();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) dropdown.classList.remove('show');
  });
}

// ============================================================ FILTERS & CATEGORY
function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.category-chip').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === cat);
  });
  applyFilters();
  document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' });
}

function applyFilters() {
  const store = document.getElementById('filterStore')?.value || 'All';
  const minDiscount = parseInt(document.getElementById('filterDiscount')?.value || '0');

  filteredDeals = allDeals.filter(deal => {
    const discount = deal.discount || Math.round(((deal.oldPrice - deal.newPrice) / deal.oldPrice) * 100) || 0;
    const catMatch = currentCategory === 'All' || (deal.category || '').toLowerCase() === currentCategory.toLowerCase();
    const storeMatch = store === 'All' || deal.store.toLowerCase().includes(store.toLowerCase());
    const discountMatch = discount >= minDiscount;
    return catMatch && storeMatch && discountMatch;
  });

  applySort();
  visibleCount = 8;
  updateDealCount();
  renderDeals();
}

function applySort() {
  const sort = document.getElementById('filterSort')?.value || 'latest';
  filteredDeals.sort((a, b) => {
    if (sort === 'discount') {
      return (b.discount || 0) - (a.discount || 0);
    } else if (sort === 'ending') {
      return new Date(a.expiry) - new Date(b.expiry);
    }
    return 0;
  });
}

function updateDealCount() {
  const el = document.getElementById('dealCount');
  if (el) el.textContent = `${filteredDeals.length} deals found`;
}

function loadMoreDeals() {
  visibleCount += 8;
  renderDeals();
  trackEvent('deal_click', 'Load More Deals');
}

// ============================================================ COUPON COPY
function copyCode(code, elemId, btn) {
  navigator.clipboard.writeText(code).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  });

  const codeEl = document.getElementById(elemId);
  if (codeEl) { const orig = codeEl.textContent; codeEl.textContent = '✓ Copied!'; setTimeout(() => codeEl.textContent = orig, 2000); }
  if (btn) {
    btn.classList.add('copied');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = origText; btn.classList.remove('copied'); }, 2000);
  }

  trackEvent('coupon_copy', code);
}

// ============================================================ NEWSLETTER
function subscribeNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail')?.value;
  if (!email) return;

  // Track
  trackEvent('signup_click', 'Newsletter Subscribe');

  // Try to send to Google Sheet
  fetch(GOOGLE_SHEET_API, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'newsletter', email })
  }).catch(() => {});

  document.getElementById('newsletterForm').style.display = 'none';
  document.getElementById('newsletterSuccess').style.display = 'block';
}

// ============================================================ TELEGRAM POPUP
function showTelegramPopup() {
  if (localStorage.getItem('telegramPopupClosed')) return;

  setTimeout(() => {
    const popup = document.getElementById('telegramPopup');
    const overlay = document.getElementById('popupOverlay');
    popup?.classList.add('show');
    overlay?.classList.add('show');
  }, 5000);
}

function closePopup() {
  document.getElementById('telegramPopup')?.classList.remove('show');
  document.getElementById('popupOverlay')?.classList.remove('show');
  localStorage.setItem('telegramPopupClosed', '1');
}

// ============================================================ LAZY LOAD IMAGES
function lazyLoadImages() {
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const img = e.target;
          if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
          io.unobserve(img);
        }
      });
    });
    imgs.forEach(img => io.observe(img));
  }
}

// ============================================================ HELPERS
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatPrice(n) {
  return Number(n).toLocaleString('en-IN');
}

function isNewDeal(deal) {
  if (!deal.addedAt) return false;
  return (Date.now() - new Date(deal.addedAt).getTime()) < 86400000;
}

function getStoreClass(store) {
  const s = (store || '').toLowerCase();
  if (s.includes('amazon')) return 'store-amazon';
  if (s.includes('flipkart')) return 'store-flipkart';
  if (s.includes('myntra')) return 'store-myntra';
  if (s.includes('ajio')) return 'store-ajio';
  return 'store-default';
}
function trackClick(product) {
  localStorage.setItem("last_clicked", JSON.stringify(product));
}
// ================= CLICK TRACKING (SAFE ADDITION)
function trackClick(title, link, price, store, category) {
  const data = {
    title: title || "",
    link: link || "",
    price: price || 0,
    store: store || "",
    category: category || "",
    time: new Date()
  };

  localStorage.setItem("last_clicked", JSON.stringify(data));
}

// Prevent breaking due to quotes
function escapeForOnclick(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
// ===============================
// AUTO LOAD DEALS FROM WORKER
// ===============================
async function loadDynamicDeals() {
  try {
    const API_URL = "https://deals-api.rjain-sobha.workers.dev";

    const res = await fetch(API_URL);
    const data = await res.json();

    const container = document.getElementById("dealsGrid");
    if (!container) return;

    container.innerHTML = "";

    // 🔥 SORT BEST DEALS FIRST
    data.sort((a,b) => 
      (b.old_price - b.new_price) - (a.old_price - a.new_price)
    );

    data.forEach(deal => {

      const oldPrice = Number(deal.old_price);
      const newPrice = Number(deal.new_price);

      const discount = oldPrice
        ? Math.round(((oldPrice - newPrice) / oldPrice) * 100)
        : 0;

      let img = deal.image || "";
      if (img.includes("_SL")) {
        img = img.replace(/_SL\d+_/, "_SL500_");
      }

      const card = `
      <div class="deal-card">
        <div class="deal-img">
          <img src="${img}" alt="${deal.title}">
          <span class="discount-badge">${discount}% OFF</span>
        </div>

        <div class="deal-body">
          <h3>${deal.title}</h3>

          <div class="price-row">
            <span class="new-price">₹${newPrice}</span>
            <span class="old-price">₹${oldPrice}</span>
          </div>

          <div class="deal-meta">
            ⏳ Limited Time Deal
          </div>

          <a href="${deal.link}" target="_blank" class="deal-btn">
            🔥 Grab Deal Now
          </a>

          <div class="trust">
            ✔ Verified Deal
          </div>
        </div>
      </div>
      `;// ===============================
// NEW API SYSTEM (FULL)
// ===============================
let allDeals = [];

async function loadDealsFromAPI() {
  try {
    const API_URL = "https://deals-api.rjain-sobha.workers.dev";

    const res = await fetch(API_URL);
    allDeals = await res.json();

    applyFilters();

  } catch (err) {
    console.log("API ERROR:", err);
  }
}

// ===============================
// APPLY FILTERS
// ===============================
function applyFilters() {

  const searchText = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const storeFilter = document.getElementById("filterStore")?.value || "All";
  const discountFilter = Number(document.getElementById("filterDiscount")?.value || 0);
  const sortType = document.getElementById("filterSort")?.value || "latest";

  let filtered = allDeals.filter(deal => {

    const title = (deal.title || "").toLowerCase();

    // SEARCH
    if (searchText && !title.includes(searchText)) return false;

    // STORE FILTER
    if (storeFilter !== "All" && !(deal.link || "").toLowerCase().includes(storeFilter.toLowerCase())) return false;

    // DISCOUNT FILTER
    const oldPrice = Number(deal.old_price);
    const newPrice = Number(deal.new_price);
    const discount = oldPrice ? ((oldPrice - newPrice) / oldPrice) * 100 : 0;

    if (discount < discountFilter) return false;

    return true;
  });

  // SORT
  if (sortType === "discount") {
    filtered.sort((a,b) => (b.old_price - b.new_price) - (a.old_price - a.new_price));
  } else {
    filtered.reverse();
  }

  renderDeals(filtered);
}

// ===============================
// RENDER
// ===============================
function renderDeals(data) {
  const container = document.getElementById("dealsGrid");

  if (!container) return;

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<p>No deals found</p>";
    return;
  }

  data.forEach(deal => {

    const oldPrice = Number(deal.old_price);
    const newPrice = Number(deal.new_price);

    const discount = oldPrice
      ? Math.round(((oldPrice - newPrice) / oldPrice) * 100)
      : 0;

    let img = deal.image || "";
    if (img.includes("_SL")) {
      img = img.replace(/_SL\d+_/, "_SL500_");
    }

    const card = `
    <div class="deal-card">
      <div class="deal-img">
        <img src="${img}">
        <span class="discount-badge">${discount}% OFF</span>
      </div>

      <div class="deal-body">
        <h3>${deal.title}</h3>

        <div class="price-row">
          <span class="new-price">₹${newPrice}</span>
          <span class="old-price">₹${oldPrice}</span>
        </div>

        <div class="deal-meta">⏳ Limited Time Deal</div>

        <a href="${deal.link}" target="_blank" class="deal-btn">
          🔥 Grab Deal Now
        </a>

        <div class="trust">✔ Verified Deal</div>
      </div>
    </div>
    `;

    container.innerHTML += card;
  });

  const countEl = document.getElementById("dealCount");
  if (countEl) countEl.innerText = data.length + " Deals Found";
}

// ===============================
// CATEGORY FILTER
// ===============================
function filterCategory(category) {

  if (category === "All") {
    applyFilters();
    return;
  }

  const filtered = allDeals.filter(deal =>
    (deal.title || "").toLowerCase().includes(category.toLowerCase())
  );

  renderDeals(filtered);
}

// ===============================
// LIVE SEARCH
// ===============================
document.getElementById("searchInput")?.addEventListener("input", applyFilters);

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", loadDealsFromAPI);

      container.innerHTML += card;
    });

  } catch (err) {
    console.log("Deals load error:", err);
  }
}

// RUN AFTER PAGE LOAD
document.addEventListener("DOMContentLoaded", loadDynamicDeals);
