// ============================================================
// PaisaOffers.com - Main Script v2.0
// Google Sheets + Cashback + Wallet + User System
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
const GOOGLE_SHEET_API = "https://script.google.com/macros/s/AKfycbxfEfy9NGcCxrp8eRU2baDJdu302nA0YHug0N1NxziyWcGEGZwIJiLMhAyF5TqZUSSW_w/exec";
const TELEGRAM_CHANNEL = "https://t.me/paisaoffersdotcom";
const GA_ID = "G-Q1EHZH78QC";
const CASHBACK_RATE = 0.0125; // 1.25% user cashback
const MAX_CASHBACK = 100;     // ₹100 max per order
const MIN_WITHDRAW = 500;     // ₹500 minimum withdrawal

const AFFILIATE = {
  amazon1: "https://amzn.to/4t7XSrt",
  amazon2: "https://amzn.to/4voS5PM",
  amazon3: "https://amzn.to/4tJGSaX"
};

// ── STATIC FALLBACK DEALS ────────────────────────────────────
const STATIC_DEALS = [
  { title: "boAt Rockerz 450 Pro Wireless Headphone with 70H Playback", image: "https://m.media-amazon.com/images/I/71nVuD1Tg+L._SX679_.jpg", store: "Amazon", oldPrice: 2990, newPrice: 899, discount: 70, cashback: "8% Cashback", link: AFFILIATE.amazon1, category: "Electronics", expiry: new Date(Date.now() + 3600000 * 18).toISOString() },
  { title: "Fastrack Unisex Round Dial Analog Watch – Stylish & Sporty", image: "https://m.media-amazon.com/images/I/71VbYhfDpyL._SX679_.jpg", store: "Amazon", oldPrice: 2295, newPrice: 799, discount: 65, cashback: "6% Cashback", link: AFFILIATE.amazon2, category: "Fashion", expiry: new Date(Date.now() + 3600000 * 10).toISOString() },
  { title: "Prestige PKPW 5.0 Stainless Steel Pressure Cooker 5 Litres", image: "https://m.media-amazon.com/images/I/71oqyT9yYcL._SX679_.jpg", store: "Amazon", oldPrice: 2595, newPrice: 1049, discount: 60, cashback: "8% Cashback", link: AFFILIATE.amazon3, category: "Home", expiry: new Date(Date.now() + 3600000 * 6).toISOString() },
  { title: "Fire-Boltt Ninja Call Pro Plus 1.83\" Smart Watch with Bluetooth Calling", image: "https://m.media-amazon.com/images/I/71AxMRHF38L._SX679_.jpg", store: "Amazon", oldPrice: 6999, newPrice: 1299, discount: 81, cashback: "8% Cashback", link: AFFILIATE.amazon1, category: "Electronics", expiry: new Date(Date.now() + 3600000 * 24).toISOString() },
  { title: "Philips HL7756/00 600W Mixer Grinder with 4 Jars", image: "https://m.media-amazon.com/images/I/71iBJYR0xYL._SX679_.jpg", store: "Amazon", oldPrice: 4295, newPrice: 2199, discount: 49, cashback: "7% Cashback", link: AFFILIATE.amazon2, category: "Home", expiry: new Date(Date.now() + 3600000 * 36).toISOString() },
  { title: "ZEBRONICS Zeb-Sound Feast 700 Wireless Bluetooth Over Ear Headphone", image: "https://m.media-amazon.com/images/I/61BQS9QIEXL._SX679_.jpg", store: "Amazon", oldPrice: 3999, newPrice: 799, discount: 80, cashback: "8% Cashback", link: AFFILIATE.amazon3, category: "Electronics", expiry: new Date(Date.now() + 3600000 * 12).toISOString() },
  { title: "Allen Cooper Men's Leather Chelsea Boots (Brown)", image: "https://m.media-amazon.com/images/I/71qzJYV4VdL._SX679_.jpg", store: "Flipkart", oldPrice: 4999, newPrice: 1299, discount: 74, cashback: "6% Cashback", link: AFFILIATE.amazon1, category: "Fashion", expiry: new Date(Date.now() + 3600000 * 48).toISOString() },
  { title: "Kent Grand Plus 11L Water Purifier with RO+UV+UF+TDS Control", image: "https://m.media-amazon.com/images/I/713eFJGr4YL._SX679_.jpg", store: "Amazon", oldPrice: 19800, newPrice: 12999, discount: 34, cashback: "8% Cashback", link: AFFILIATE.amazon2, category: "Home", expiry: new Date(Date.now() + 3600000 * 72).toISOString() }
];

// ── GLOBAL STATE ─────────────────────────────────────────────
let allDeals = [];
let filteredDeals = [];
let visibleCount = 8;
let currentCategory = "All";
let currentSlide = 0;
let slideTotal = 3;
let carouselInterval = null;
let countdownIntervals = {};

// ============================================================
// GA TRACKING
// ============================================================
function trackEvent(eventName, label) {
  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, { event_label: label, event_category: 'PaisaOffers' });
    }
  } catch (e) {}
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCarousel();
  initSearch();
  initScrollEffects();
  animateCounters();
  loadDeals();
  showTelegramPopup();
  initAuthSystem();
  updateNavForUser();
  syncApprovedCashbackToWallets(); // Sync any pending admin approvals on load
});

// ============================================================
// NAVBAR
// ============================================================
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

  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger?.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });
}

// ============================================================
// CAROUSEL
// ============================================================
function initCarousel() {
  document.getElementById('prevBtn')?.addEventListener('click', () => { prevSlide(); resetCarouselInterval(); });
  document.getElementById('nextBtn')?.addEventListener('click', () => { nextSlide(); resetCarouselInterval(); });

  // Touch/swipe support
  const track = document.getElementById('carouselTrack');
  if (track) {
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? nextSlide() : prevSlide(); resetCarouselInterval(); }
    }, { passive: true });
  }

  carouselInterval = setInterval(nextSlide, 5000);
}

function goToSlide(n) {
  currentSlide = n;
  const track = document.getElementById('carouselTrack');
  if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
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

// ============================================================
// SCROLL EFFECTS
// ============================================================
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

// ============================================================
// ANIMATED COUNTERS
// ============================================================
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

// ============================================================
// LOAD DEALS — Google Sheets (DO NOT MODIFY)
// ============================================================
async function loadDeals() {
  try {
    const response = await fetch(GOOGLE_SHEET_API, { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();

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
    console.warn('Using static deals:', err.message);
    allDeals = STATIC_DEALS;
  }

  filteredDeals = [...allDeals];
  updateDealCount();
  renderDeals();
  renderEditorPicks();
}

function normalizeSheetDeal(row) {
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

// ============================================================
// RENDER DEALS (DO NOT MODIFY)
// ============================================================
function renderDeals() {
  const grid = document.getElementById('dealsGrid');
  if (!grid) return;

  if (filteredDeals.length === 0) {
    grid.innerHTML = '<div class="loading-spinner"><p>No deals found. Try different filters.</p></div>';
    return;
  }

  const toShow = filteredDeals.slice(0, visibleCount);
  grid.innerHTML = toShow.map((deal, i) => createDealCard(deal, `deal-${i}`)).join('');
  toShow.forEach((deal, i) => startCountdown(deal, `deal-${i}`));

  const loadMoreWrap = document.getElementById('loadMoreWrap');
  if (loadMoreWrap) {
    loadMoreWrap.style.display = filteredDeals.length > visibleCount ? 'block' : 'none';
  }

  lazyLoadImages();
}

function createDealCard(deal, id) {
  const discount = Math.round(deal.discount) || Math.round(((deal.oldPrice - deal.newPrice) / deal.oldPrice) * 100) || 0;
  const savings = deal.oldPrice && deal.newPrice ? Math.round(deal.oldPrice - deal.newPrice) : 0;
  const cbAmt = deal.newPrice ? Math.min(deal.newPrice * CASHBACK_RATE, MAX_CASHBACK).toFixed(0) : 0;

  const badges = [];
  if (discount >= 70) badges.push(`<span class="badge badge-hot">🔥 Limited Deal</span>`);
  if (discount >= 50 && discount < 70) badges.push(`<span class="badge badge-cashback">⚡ Selling Fast</span>`);
  badges.push(`<span class="badge badge-store">✔ Verified</span>`);

  return `
    <div class="deal-card">
      <div class="deal-image-wrap">
        <img
          src="${escapeHtml(deal.image)}"
          alt="${escapeHtml(deal.title)}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x300/f5f7fa/999?text=Deal'"
        >
        <div class="deal-badges">
          ${discount > 0 ? `<span class="badge badge-discount">🔥 ${discount}% OFF</span>` : ''}
          ${deal.cashback ? `<span class="badge badge-cashback">💰 ${escapeHtml(deal.cashback)}</span>` : ''}
        </div>
        <div class="deal-store-badge">${escapeHtml(deal.store)}</div>
      </div>

      <div class="deal-body">
        <div class="deal-title">${escapeHtml(deal.title)}</div>
        <div class="deal-prices">
          ${deal.oldPrice ? `<span class="price-old">₹${formatPrice(deal.oldPrice)}</span>` : ''}
          ${deal.newPrice ? `<span class="price-new">₹${formatPrice(deal.newPrice)}</span>` : ''}
          ${savings > 0 ? `<span class="price-save">Save ₹${formatPrice(savings)}</span>` : ''}
        </div>
        ${cbAmt > 0 ? `<div class="deal-cashback-info">💸 Earn ₹${cbAmt} cashback on this deal</div>` : ''}
        <div class="deal-countdown">
          <i class="fas fa-clock"></i>
          <span class="countdown-timer" id="timer-${id}">Loading...</span>
        </div>
      </div>

      <div class="deal-footer">
        <a href="${escapeHtml(deal.link)}" target="_blank" rel="noopener"
           class="deal-cta"
           onclick="handleDealClick('${escapeHtml(deal.title).replace(/'/g,"\\'")}', '${escapeHtml(deal.link)}', ${deal.newPrice || 0}, '${escapeHtml(deal.store)}', '${escapeHtml(deal.category)}')">
          🔥 Get Cashback + Deal →
        </a>
      </div>
    </div>
  `;
}

function renderEditorPicks() {
  const grid = document.getElementById('editorDealsGrid');
  if (!grid || allDeals.length < 3) return;

  const picks = [...allDeals]
    .sort((a, b) => (b.discount || 0) - (a.discount || 0))
    .slice(0, 4);

  grid.innerHTML = picks.map((deal, i) => createDealCard(deal, `ep-${i}`)).join('');
  picks.forEach((deal, i) => startCountdown(deal, `ep-${i}`));
}

// ============================================================
// COUNTDOWN TIMER
// ============================================================
function startCountdown(deal, id) {
  if (!deal.expiry) return;
  if (countdownIntervals[id]) clearInterval(countdownIntervals[id]);

  function update() {
    const el = document.getElementById(`timer-${id}`);
    if (!el) { clearInterval(countdownIntervals[id]); return; }

    const diff = new Date(deal.expiry).getTime() - Date.now();
    if (diff <= 0) { el.textContent = 'Expired'; clearInterval(countdownIntervals[id]); return; }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    el.textContent = h > 48
      ? `${Math.floor(h / 24)}d left`
      : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} left`;
  }

  update();
  countdownIntervals[id] = setInterval(update, 1000);
}

// ============================================================
// SEARCH
// ============================================================
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

      if (!results.length) { dropdown.classList.remove('show'); return; }

      dropdown.innerHTML = results.map(d => `
        <a href="${escapeHtml(d.link)}" target="_blank" class="search-result-item" rel="noopener"
           onclick="trackEvent('deal_click','Search')">
          <i class="fas fa-tag" style="color:var(--primary)"></i>
          <span>${escapeHtml(d.title)}</span>
        </a>
      `).join('');
      dropdown.classList.add('show');
    }, 250);
  });

  input.addEventListener('keyup', e => {
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

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) dropdown.classList.remove('show');
  });
}

// ============================================================
// FILTERS & CATEGORY
// ============================================================
function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.category-chip').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().includes(
      cat === 'All' ? 'All' : cat
    ));
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
    if (sort === 'discount') return (b.discount || 0) - (a.discount || 0);
    if (sort === 'ending') return new Date(a.expiry) - new Date(b.expiry);
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

// ============================================================
// CLICK TRACKING (ADDED ON TOP — does not modify deal loading)
// ============================================================
function handleDealClick(title, link, price, store, category) {
  const user = getCurrentUser();
  const clickData = {
    user_id: user ? user.id : 'guest',
    deal_id: btoa(link).slice(0, 16),
    title,
    link,
    price,
    store,
    category,
    timestamp: new Date().toISOString()
  };

  // Store click in localStorage
  const clicks = JSON.parse(localStorage.getItem('po_clicks') || '[]');
  clicks.unshift(clickData);
  if (clicks.length > 50) clicks.pop();
  localStorage.setItem('po_clicks', JSON.stringify(clicks));

  trackEvent('deal_click', `${store}: ${title.slice(0, 40)}`);
}

// ============================================================
// USER / AUTH SYSTEM
// ============================================================
function initAuthSystem() {
  // Auth modal open triggers
  document.getElementById('loginBtnNav')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('signupBtnNav')?.addEventListener('click', () => openAuthModal('signup'));
  document.getElementById('authTabLogin')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('authTabSignup')?.addEventListener('click', () => switchAuthTab('signup'));
  document.getElementById('authOverlay')?.addEventListener('click', closeAuthModal);

  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Wallet triggers
  document.getElementById('walletBtn')?.addEventListener('click', openWalletModal);
  document.getElementById('walletOverlay')?.addEventListener('click', closeWalletModal);
  document.getElementById('claimCashbackBtn')?.addEventListener('click', () => switchWalletTab('claim'));
  document.getElementById('withdrawBtn')?.addEventListener('click', () => switchWalletTab('withdraw'));

  document.getElementById('claimForm')?.addEventListener('submit', handleClaimSubmit);
  document.getElementById('withdrawForm')?.addEventListener('submit', handleWithdrawSubmit);

  document.querySelectorAll('.wallet-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchWalletTab(btn.dataset.tab));
  });
}

function getCurrentUser() {
  try {
    const u = localStorage.getItem('po_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function saveUser(user) {
  localStorage.setItem('po_user', JSON.stringify(user));
}

function updateNavForUser() {
  const user = getCurrentUser();
  const loginBtn = document.getElementById('loginBtnNav');
  const signupBtn = document.getElementById('signupBtnNav');
  const userMenu = document.getElementById('userMenu');
  const userNameEl = document.getElementById('navUserName');
  const walletBalEl = document.getElementById('navWalletBal');

  if (user) {
    loginBtn && (loginBtn.style.display = 'none');
    signupBtn && (signupBtn.style.display = 'none');
    userMenu && (userMenu.style.display = 'flex');
    if (userNameEl) userNameEl.textContent = user.name.split(' ')[0];
    if (walletBalEl) walletBalEl.textContent = `₹${(user.wallet_balance || 0).toFixed(0)}`;
  } else {
    loginBtn && (loginBtn.style.display = '');
    signupBtn && (signupBtn.style.display = '');
    userMenu && (userMenu.style.display = 'none');
  }
}

function openAuthModal(tab) {
  document.getElementById('authModal')?.classList.add('show');
  document.getElementById('authOverlay')?.classList.add('show');
  switchAuthTab(tab || 'login');
}

function closeAuthModal() {
  document.getElementById('authModal')?.classList.remove('show');
  document.getElementById('authOverlay')?.classList.remove('show');
}

function switchAuthTab(tab) {
  document.getElementById('authTabLogin')?.classList.toggle('active', tab === 'login');
  document.getElementById('authTabSignup')?.classList.toggle('active', tab === 'signup');
  document.getElementById('loginForm')?.classList.toggle('hidden', tab !== 'login');
  document.getElementById('signupForm')?.classList.toggle('hidden', tab !== 'signup');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value.trim();
  const pass = document.getElementById('loginPass')?.value;

  const users = JSON.parse(localStorage.getItem('po_users') || '[]');
  const user = users.find(u => u.email === email && u.password === btoa(pass));

  if (!user) {
    showAuthError('loginError', 'Invalid email or password.');
    return;
  }

  saveUser(user);
  closeAuthModal();
  updateNavForUser();
  showToast(`Welcome back, ${user.name.split(' ')[0]}! 🎉`);
  trackEvent('login', 'User Login');
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName')?.value.trim();
  const email = document.getElementById('signupEmail')?.value.trim();
  const mobile = document.getElementById('signupMobile')?.value.trim();
  const pass = document.getElementById('signupPass')?.value;

  if (!name || !email || !pass) { showAuthError('signupError', 'Please fill all fields.'); return; }

  const users = JSON.parse(localStorage.getItem('po_users') || '[]');
  if (users.find(u => u.email === email)) { showAuthError('signupError', 'Email already registered.'); return; }

  const newUser = {
    id: 'u_' + Date.now(),
    name,
    email,
    mobile: mobile || '',
    password: btoa(pass),
    wallet_balance: 0,
    pending_cashback: 0,
    confirmed_cashback: 0,
    joined: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem('po_users', JSON.stringify(users));
  saveUser(newUser);
  closeAuthModal();
  updateNavForUser();
  showToast(`Welcome to PaisaOffers, ${name.split(' ')[0]}! 🎉`);
  trackEvent('signup', 'User Signup');
}

function handleLogout() {
  localStorage.removeItem('po_user');
  updateNavForUser();
  showToast('Logged out successfully.');
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ============================================================
// WALLET SYSTEM
// ============================================================
function openWalletModal() {
  const user = getCurrentUser();
  if (!user) { openAuthModal('login'); return; }

  refreshWalletUI();
  document.getElementById('walletModal')?.classList.add('show');
  document.getElementById('walletOverlay')?.classList.add('show');
  switchWalletTab('overview');
}

function closeWalletModal() {
  document.getElementById('walletModal')?.classList.remove('show');
  document.getElementById('walletOverlay')?.classList.remove('show');
}

function switchWalletTab(tab) {
  document.querySelectorAll('.wallet-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.wallet-tab-pane').forEach(p => p.classList.toggle('active', p.dataset.tab === tab));
}

function refreshWalletUI() {
  const user = getCurrentUser();
  if (!user) return;

  const txns = getUserTransactions(user.id);

  const totalCb = txns.reduce((s, t) => s + (t.cashback_amount || 0), 0);
  const pending = txns.filter(t => t.status === 'pending').reduce((s, t) => s + (t.cashback_amount || 0), 0);
  const confirmed = txns.filter(t => t.status === 'approved').reduce((s, t) => s + (t.cashback_amount || 0), 0);
  const withdrawable = confirmed;

  setEl('wTotalCb', `₹${totalCb.toFixed(2)}`);
  setEl('wPending', `₹${pending.toFixed(2)}`);
  setEl('wConfirmed', `₹${confirmed.toFixed(2)}`);
  setEl('wWithdrawable', `₹${withdrawable.toFixed(2)}`);
  setEl('walletUserName', user.name);
  setEl('walletUserEmail', user.email);

  // Render transactions
  const txnList = document.getElementById('txnList');
  if (txnList) {
    if (!txns.length) {
      txnList.innerHTML = '<div class="empty-state">No transactions yet. Start shopping to earn cashback!</div>';
    } else {
      txnList.innerHTML = txns.slice(0, 20).map(t => `
        <div class="txn-item">
          <div class="txn-info">
            <div class="txn-title">${escapeHtml(t.order_id || 'Order')}</div>
            <div class="txn-meta">₹${t.order_amount} order • ${new Date(t.created_at).toLocaleDateString('en-IN')}</div>
          </div>
          <div class="txn-right">
            <div class="txn-amount">+₹${(t.cashback_amount || 0).toFixed(2)}</div>
            <span class="txn-status status-${t.status}">${t.status}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

// ============================================================
// ORDER CLAIM (CASHBACK)
// ============================================================
function handleClaimSubmit(e) {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) { openAuthModal('login'); return; }

  const orderId = document.getElementById('claimOrderId')?.value.trim();
  const productLink = document.getElementById('claimProductLink')?.value.trim();
  const orderAmount = parseFloat(document.getElementById('claimOrderAmount')?.value);

  if (!orderId || !productLink || !orderAmount || orderAmount <= 0) {
    showToast('Please fill all fields correctly.', 'error');
    return;
  }

  const cashback = Math.min(orderAmount * CASHBACK_RATE, MAX_CASHBACK);

  const transaction = {
    transaction_id: 'txn_' + Date.now(),
    user_id: user.id,
    deal_id: null,
    order_id: orderId,
    product_link: productLink,
    order_amount: orderAmount,
    cashback_amount: parseFloat(cashback.toFixed(2)),
    status: 'pending',
    created_at: new Date().toISOString()
  };

  saveTransaction(transaction);
  showToast(`Cashback claim of ₹${cashback.toFixed(2)} submitted! 🎉`);

  document.getElementById('claimForm').reset();
  switchWalletTab('transactions');
  refreshWalletUI();
  trackEvent('cashback_claim', `₹${orderAmount}`);
}

// ============================================================
// WITHDRAW SYSTEM
// ============================================================
function handleWithdrawSubmit(e) {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const txns = getUserTransactions(user.id);
  const withdrawable = txns.filter(t => t.status === 'approved').reduce((s, t) => s + t.cashback_amount, 0);

  const amount = parseFloat(document.getElementById('withdrawAmount')?.value);
  const upi = document.getElementById('withdrawUPI')?.value.trim();

  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (!upi) { showToast('Enter your UPI ID or bank details.', 'error'); return; }
  if (amount < MIN_WITHDRAW) { showToast(`Minimum withdrawal is ₹${MIN_WITHDRAW}.`, 'error'); return; }
  if (amount > withdrawable) { showToast('Insufficient confirmed balance.', 'error'); return; }

  const request = {
    id: 'wd_' + Date.now(),
    user_id: user.id,
    amount,
    upi,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const requests = JSON.parse(localStorage.getItem('po_withdrawals') || '[]');
  requests.push(request);
  localStorage.setItem('po_withdrawals', JSON.stringify(requests));

  // Deduct from user wallet in po_users so balance reflects the pending withdrawal
  const users = JSON.parse(localStorage.getItem('po_users') || '[]');
  const uIdx = users.findIndex(u => u.id === user.id);
  if (uIdx !== -1) {
    users[uIdx].wallet_balance = Math.max(0, (users[uIdx].wallet_balance || 0) - amount);
    localStorage.setItem('po_users', JSON.stringify(users));
    saveUser(users[uIdx]); // Refresh session
    updateNavForUser();
  }

  showToast(`Withdrawal of ₹${amount} requested. Processing in 2-3 business days. 💸`);
  document.getElementById('withdrawForm').reset();
  refreshWalletUI();
  trackEvent('withdraw_request', `₹${amount}`);
}

// ============================================================
// TRANSACTION HELPERS
// ============================================================
function saveTransaction(txn) {
  const txns = JSON.parse(localStorage.getItem('po_transactions') || '[]');
  txns.unshift(txn);
  localStorage.setItem('po_transactions', JSON.stringify(txns));
}

function getUserTransactions(userId) {
  const txns = JSON.parse(localStorage.getItem('po_transactions') || '[]');
  return txns.filter(t => t.user_id === userId);
}

function getAllTransactions() {
  return JSON.parse(localStorage.getItem('po_transactions') || '[]');
}

// ============================================================
// ADMIN INTEGRATION — Task 6
// When admin approves a transaction (via admin.html updateTxn),
// this syncs the cashback to the user's wallet_balance in po_users.
// Called automatically on storage events and on page visibility.
// ============================================================
function syncApprovedCashbackToWallets() {
  const txns = JSON.parse(localStorage.getItem('po_transactions') || '[]');
  const users = JSON.parse(localStorage.getItem('po_users') || '[]');
  let changed = false;

  txns.forEach(txn => {
    if (txn.status === 'approved' && !txn.wallet_credited) {
      const userIdx = users.findIndex(u => u.id === txn.user_id);
      if (userIdx !== -1) {
        users[userIdx].wallet_balance = (users[userIdx].wallet_balance || 0) + (txn.cashback_amount || 0);
        users[userIdx].confirmed_cashback = (users[userIdx].confirmed_cashback || 0) + (txn.cashback_amount || 0);
        txn.wallet_credited = true;
        changed = true;
      }
    }
    if (txn.status === 'rejected' && !txn.wallet_credited) {
      // Mark as processed so we don't re-check
      txn.wallet_credited = false; // stays false but we flag as processed
      txn.rejection_processed = true;
    }
  });

  if (changed) {
    localStorage.setItem('po_transactions', JSON.stringify(txns));
    localStorage.setItem('po_users', JSON.stringify(users));

    // If current session user was updated, refresh their session object
    const currentUser = getCurrentUser();
    if (currentUser) {
      const updated = users.find(u => u.id === currentUser.id);
      if (updated) {
        saveUser(updated);
        updateNavForUser();
        refreshWalletUI();
      }
    }
  }
}

// Listen for cross-tab localStorage changes (admin panel in separate tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'po_transactions') {
    syncApprovedCashbackToWallets();
  }
});

// Also sync on page visibility restore (user comes back from admin tab)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    syncApprovedCashbackToWallets();
  }
});

// ============================================================
// COUPON COPY
// ============================================================
function copyCode(code, elemId, btn) {
  navigator.clipboard.writeText(code).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  });

  const codeEl = document.getElementById(elemId);
  if (codeEl) { const orig = codeEl.textContent; codeEl.textContent = '✓ Copied!'; setTimeout(() => codeEl.textContent = orig, 2000); }
  if (btn) {
    btn.classList.add('copied');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  }
  trackEvent('coupon_copy', code);
}

// ============================================================
// NEWSLETTER
// ============================================================
function subscribeNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail')?.value;
  if (!email) return;

  trackEvent('signup_click', 'Newsletter Subscribe');

  fetch(GOOGLE_SHEET_API, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'newsletter', email })
  }).catch(() => {});

  document.getElementById('newsletterForm').style.display = 'none';
  document.getElementById('newsletterSuccess').style.display = 'block';
}

// ============================================================
// TELEGRAM POPUP
// ============================================================
function showTelegramPopup() {
  if (localStorage.getItem('telegramPopupClosed')) return;
  setTimeout(() => {
    document.getElementById('telegramPopup')?.classList.add('show');
    document.getElementById('popupOverlay')?.classList.add('show');
  }, 6000);
}

function closePopup() {
  document.getElementById('telegramPopup')?.classList.remove('show');
  document.getElementById('popupOverlay')?.classList.remove('show');
  localStorage.setItem('telegramPopupClosed', '1');
}

// ============================================================
// LAZY LOAD IMAGES
// ============================================================
function lazyLoadImages() {
  if (!('IntersectionObserver' in window)) return;
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  const io = new IntersectionObserver(entries => {
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

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'success') {
  const existing = document.getElementById('poToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'poToast';
  toast.className = `po-toast po-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatPrice(n) {
  return Number(n).toLocaleString('en-IN');
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
