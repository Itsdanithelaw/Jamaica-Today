

const STORE_KEY = 'newsdesk-articles';
const PAGE_SIZE = 8;

let allArticles    = [];
let filtered       = [];
let activeCategory = 'all';
let searchQuery    = '';
let pageIndex      = 0;
let isLoading      = false;

async function init() {
  document.getElementById('date-display').textContent =
    new Date().toLocaleDateString('en-JM', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase();
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  await loadArticles();
  applyFilters();
  buildCatNav();
  renderFeed(true);
  buildTicker();
  setupScroll();
  renderAuthArea();
  checkBreaking();
}

async function loadArticles() {
  try {
    const res  = await fetch('http://127.0.0.1:5000/api/articles');
    allArticles = await res.json();
  } catch(_) {
    const today = new Date().toISOString().split('T')[0];
    allArticles = [
      {
        title:   'Blue Mountains Coffee Farmers Celebrate Record Harvest Season',
        excerpt: 'Farmers across the Blue Mountains are reporting the best coffee yield in over a decade, driven by favorable rainfall and improved cultivation techniques.',
        category:'Agriculture', source:'JA Today', author:'Staff Reporter',
        image:   'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80',
        date: today, url: '',
        body: 'Farmers across the Blue Mountains region are reporting the best coffee yield in over a decade.\n\nThe harvest has seen production volumes increase by nearly 40% compared to the previous year.',
      },
      {
        title:   'Kingston Tech Hub Opens Its Doors to Caribbean Developers',
        excerpt: 'A brand new technology co-working space in New Kingston is welcoming developers and founders from across the Caribbean.',
        category:'Technology', source:'JA Today', author:'Tech Desk',
        image:   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
        date: today, url: '',
        body: 'A brand new technology co-working space in New Kingston officially opened its doors this week.\n\nThe hub boasts high-speed fibre internet, private meeting rooms, and a rooftop event space.',
      },
      {
        title:   'Reggae Sumfest 2026 Lineup Announcement Breaks Social Media Records',
        excerpt: 'The official lineup reveal shattered engagement records, reaching over five million impressions within six hours.',
        category:'Culture', source:'JA Today', author:'Entertainment Desk',
        image:   'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
        date: today, url: '',
        body: 'The official lineup reveal for Reggae Sumfest 2026 shattered social media engagement records.\n\nThis year\'s festival is scheduled for July in Montego Bay.',
      },
    ];
  }
  allArticles.sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
}

function applyFilters() {
  filtered = allArticles.filter(a => {
    const catOk  = activeCategory === 'all' || (a.category||'').toLowerCase() === activeCategory.toLowerCase();
    const srchOk = !searchQuery ||
      (a.title||'').toLowerCase().includes(searchQuery) ||
      (a.excerpt||'').toLowerCase().includes(searchQuery) ||
      (a.source||'').toLowerCase().includes(searchQuery);
    return catOk && srchOk;
  });
  pageIndex = 0;
}

function handleSearch(val) {
  searchQuery = val.toLowerCase().trim();
  applyFilters();
  document.getElementById('feed').innerHTML = '';
  renderFeed(true);
}

function buildCatNav() {
  const cats = [...new Set(allArticles.map(a => a.category).filter(Boolean))];
  const nav = document.getElementById('cat-nav');
  nav.innerHTML = `<button class="cat-btn active" onclick="filterCat('all',this)">All</button>`;
  cats.forEach(c => {
    const b = document.createElement('button');
    b.className = 'cat-btn';
    b.textContent = c;
    b.onclick = function(){ filterCat(c, this); };
    nav.appendChild(b);
  });
}

function filterCat(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
  document.getElementById('feed').innerHTML = '';
  renderFeed(true);
}

function getNextBatch() {
  if (!filtered.length) return [];
  const batch = [];
  for (let i = 0; i < PAGE_SIZE; i++) {
    const absIdx = pageIndex + i;
    const artIdx = absIdx % filtered.length;
    batch.push({ article: filtered[artIdx] });
  }
  pageIndex += PAGE_SIZE;
  return batch;
}

function renderFeed(reset = false) {
  const feed = document.getElementById('feed');

  if (reset && filtered.length === 0) {
    feed.innerHTML = `<div class="empty"><h2>No stories right now.</h2><p>Check back soon — new stories drop daily.</p></div>`;
    return;
  }

  const batch = getNextBatch();
  batch.forEach(({ article: a, }, i) => {
   
    const card = buildCard(a, reset ? i : 99);
    feed.appendChild(card);
  });
}

function buildCard(a, animIdx) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${Math.min(animIdx, 5) * 0.07}s`;

  // Encode article data in URL so article.html can read it
  const encoded = encodeURIComponent(JSON.stringify(a));
  const wrap  = `<a href="article.html?data=${encoded}">`;
  const wrapE = `</a>`;

  const imgHTML = a.image
    ? `<div class="card-image-wrap"><img class="card-img" src="${esc(a.image)}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='<div class=card-img-placeholder></div>'"></div>`
    : `<div class="card-image-wrap"><div class="card-img-placeholder"></div></div>`;

  const footer = `
    <div class="card-footer">
      <div class="card-meta">
        ${a.source ? `<span class="card-source">${esc(a.source)}</span>` : ''}
        <span class="card-date">${fmtDate(a.date)}</span>
      </div>
      <span class="card-read">Read story →</span>
    </div>`;

  card.innerHTML = `
    ${wrap}
      <div class="card-title-area">
        ${a.category ? `<div class="card-cat">${esc(a.category)}</div>` : ''}
        <div class="card-title">${esc(a.title)}</div>
      </div>
      ${imgHTML}
      <div class="card-body">
        ${a.excerpt ? `<div class="card-excerpt">${esc(a.excerpt)}</div>` : ''}
        ${footer}
      </div>
    ${wrapE}`;

  return card;
}

// ── AUTH ──
const AUTH_KEY = 'ja-today-session';
const USERS_KEY = 'ja-today-users';

function getSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch(_) { return null; }
}

function renderAuthArea() {
  const session = getSession();
  const area = document.getElementById('auth-area');
  if (session) {
    area.innerHTML = `
      <span class="auth-user">👤 ${esc(session.name)}</span>
      ${session.role === 'admin' ? `<a class="auth-btn" href="admin.html">⚙ Admin</a>` : ''}
      <button class="auth-btn" onclick="logout()">Logout</button>`;
  } else {
    area.innerHTML = `
      <a class="auth-btn" href="login.html">Login</a>
      <a class="auth-btn primary" href="register.html">Register</a>`;
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  renderAuthArea();
}

function buildTicker() {
  const el = document.getElementById('ticker-scroll');
  if (!allArticles.length) {
    el.innerHTML = '<span class="ticker-item">Stay tuned for today\'s stories</span>';
    return;
  }
  const titles = allArticles.slice(0, 10).map(a => a.title);
  const doubled = [...titles, ...titles];
  el.innerHTML = doubled.map(t => `<span class="ticker-item">▸ ${esc(t)}</span>`).join('');
}

function setupScroll() {
  const loader   = document.getElementById('loader');
  const sentinel = document.createElement('div');
  sentinel.style.height = '1px';
  document.querySelector('.site-footer').before(sentinel);

  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !isLoading && filtered.length > 0) {
      isLoading = true;
      loader.style.display = 'flex';
      setTimeout(() => {
        renderFeed(false);
        loader.style.display = 'none';
        isLoading = false;
      }, 700);
    }
  }, { rootMargin: '300px' }).observe(sentinel);

  // Smart header — hide on scroll down, reveal on scroll up
  let lastY = 0;
  const hdr = document.querySelector('header');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > 120) {
      hdr.classList.add('header-hidden');    // scrolling down → hide
    } else {
      hdr.classList.remove('header-hidden'); // scrolling up → show
    }
    lastY = y;
  }, { passive: true });
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return 'Today';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-JM', { month:'short', day:'numeric', year:'numeric' }); }
  catch(_) { return d; }
}
// ── BOTTOM BREAKING NEWS BANNER ──
async function checkBreaking() {
  try {
    const res  = await fetch('http://127.0.0.1:5000/api/breaking');
    const data = await res.json();

    if (!data.message || !data.active || !data.pushed_at) return;

    // Check how long ago it was pushed
    const pushedAt  = new Date(data.pushed_at); // already has timezone info
    const now       = new Date();
    const elapsed   = (now - pushedAt) / 1000; // seconds
    const remaining = (3 * 60) - elapsed;      // 180 seconds minus elapsed

    // If 3 minutes already passed — don't show it
    if (remaining <= 0) return;

    const banner = document.getElementById('breaking-banner');
    const scroll = document.getElementById('breaking-banner-scroll');

    const text = `▸ ${data.message} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`;
    scroll.innerHTML = text + text + text + text;

    banner.style.display = 'block';

    // Hide after whatever time is remaining
    setTimeout(() => {
      banner.style.display = 'none';
    }, remaining * 1000);

  } catch(_) {}
}
init();
