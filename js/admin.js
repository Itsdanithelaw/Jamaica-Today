
const API = 'http://127.0.0.1:5000/api';

function toggleSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');
  const isOpen   = sidebar.classList.contains('open');
 
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    hamburger.classList.add('open');
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }
}
 
function closeSidebar() {
  const sidebar   = document.querySelector('.sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');
 
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
}
 
// Close sidebar when a nav item is clicked on mobile
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeSidebar();
  });
});
 
// Close sidebar on resize to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeSidebar();
});
async function init() {
  const session = JSON.parse(localStorage.getItem('ja-today-session') || 'null');
  if (!session) { window.location.href = 'login.html'; return; }
  document.getElementById('sidebar-user').textContent = '👤 ' + session.name;
  document.getElementById('a-date').value = today();
  await loadStats();
  await loadArticles();
}

function today() { return new Date().toISOString().split('T')[0]; }

function showPanel(name, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'users')    loadUsers();
  if (name === 'visitors') loadVisitors();
  if (name === 'breaking') loadBreakingStatus();
  if (name === 'articles') loadArticles();
}

async function loadStats() {
  try {
    const [arts, users, visitors] = await Promise.all([
      fetch(API + '/articles').then(r => r.json()),
      fetch(API + '/users').then(r => r.json()),
      fetch(API + '/visitors').then(r => r.json()),
    ]);
    document.getElementById('stat-articles').textContent = arts.length;
    document.getElementById('stat-users').textContent    = users.length;
    document.getElementById('stat-visitors').textContent = visitors.length;
  } catch(_) {}
}

async function loadArticles() {
  const list = document.getElementById('articles-list');
  try {
    const articles = await fetch(API + '/articles').then(r => r.json());
    if (!articles.length) {
      list.innerHTML = '<div class="empty-msg">No articles yet — add your first one!</div>';
      return;
    }
    list.innerHTML = articles.map(a => `
      <div class="article-row">
        ${a.image ? `<img class="article-row-img" src="${esc(a.image)}" onerror="this.style.opacity='0'">` : `<div class="article-row-img"></div>`}
        <div class="article-row-info">
          <div class="article-row-title">${esc(a.title)}</div>
          <div class="article-row-meta">
            ${a.category ? `<span class="article-row-cat">${esc(a.category)}</span>` : ''}
            ${a.source   ? `<span>${esc(a.source)}</span>` : ''}
            ${a.date     ? `<span>${fmtDate(a.date)}</span>` : ''}
          </div>
        </div>
        <div class="article-row-actions">
          <button class="btn btn-ghost btn-small" onclick='openEdit(${JSON.stringify(a)})'>Edit</button>
          <button class="btn btn-danger btn-small" onclick="deleteArticle(${a.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch(_) {
    list.innerHTML = '<div class="empty-msg">Could not load articles. Is the server running?</div>';
  }
}

async function addArticle() {
  const title = document.getElementById('a-title').value.trim();
  if (!title) { toast('Headline is required', true); return; }

  const body = JSON.stringify({
    title,
    excerpt:  document.getElementById('a-excerpt').value.trim(),
    body:     document.getElementById('a-body').value.trim(),
    category: document.getElementById('a-category').value.trim(),
    source:   document.getElementById('a-source').value.trim(),
    author:   document.getElementById('a-author').value.trim(),
    date:     document.getElementById('a-date').value || today(),
    image:    document.getElementById('a-image').value.trim(),
    url:      document.getElementById('a-url').value.trim(),
  });

  try {
    const res  = await fetch(API + '/articles', { method:'POST', headers:{'Content-Type':'application/json'}, body });
    const data = await res.json();
    if (!res.ok) { toast(data.error, true); return; }
    toast('Article published!');
    clearForm();
    loadStats();
  } catch(_) { toast('Could not connect to server', true); }
}

async function deleteArticle(id) {
  if (!confirm('Delete this article? This cannot be undone.')) return;
  try {
    await fetch(API + '/articles/' + id, { method: 'DELETE' });
    toast('Article deleted');
    loadArticles();
    loadStats();
  } catch(_) { toast('Could not delete', true); }
}

function clearForm() {
  ['a-title','a-excerpt','a-body','a-category','a-source','a-author','a-image','a-url'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('a-date').value = today();
}

function openEdit(a) {
  document.getElementById('e-id').value       = a.id;
  document.getElementById('e-title').value    = a.title    || '';
  document.getElementById('e-excerpt').value  = a.excerpt  || '';
  document.getElementById('e-body').value     = a.body     || '';
  document.getElementById('e-category').value = a.category || '';
  document.getElementById('e-source').value   = a.source   || '';
  document.getElementById('e-author').value   = a.author   || '';
  document.getElementById('e-date').value     = a.date     || '';
  document.getElementById('e-image').value    = a.image    || '';
  document.getElementById('e-url').value      = a.url      || '';
  document.getElementById('edit-modal').classList.add('open');
}

function closeModal() { document.getElementById('edit-modal').classList.remove('open'); }

async function saveEdit() {
  const id   = document.getElementById('e-id').value;
  const body = JSON.stringify({
    title:    document.getElementById('e-title').value.trim(),
    excerpt:  document.getElementById('e-excerpt').value.trim(),
    body:     document.getElementById('e-body').value.trim(),
    category: document.getElementById('e-category').value.trim(),
    source:   document.getElementById('e-source').value.trim(),
    author:   document.getElementById('e-author').value.trim(),
    date:     document.getElementById('e-date').value,
    image:    document.getElementById('e-image').value.trim(),
    url:      document.getElementById('e-url').value.trim(),
  });

  try {
    const res = await fetch(API + '/articles/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body });
    if (!res.ok) { toast('Could not save changes', true); return; }
    toast('Article updated!');
    closeModal();
    loadArticles();
  } catch(_) { toast('Could not connect to server', true); }
}

async function loadUsers() {
  const tbody = document.getElementById('users-body');
  try {
    const users = await fetch(API + '/users').then(r => r.json());
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No users yet.</td></tr>'; return; }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:0.7rem;">${u.id}</td>
        <td>${esc(u.name)}</td>
        <td style="color:var(--gold);font-family:'JetBrains Mono',monospace;font-size:0.75rem;">${esc(u.email)}</td>
        <td style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:0.68rem;">${fmtDate(u.joined)}</td>
      </tr>
    `).join('');
  } catch(_) { tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">Could not load users.</td></tr>'; }
}

async function loadVisitors() {
  const list = document.getElementById('visitors-list');
  try {
    const visitors = await fetch(API + '/visitors').then(r => r.json());
    if (!visitors.length) { list.innerHTML = '<div class="empty-msg">No visitors tracked yet.</div>'; return; }
    list.innerHTML = visitors.map(v => `
      <div class="visitor-row">
        <span class="visitor-ip">${esc(v.ip)}</span>
        <span class="visitor-count">${v.visits} visit${v.visits !== 1 ? 's' : ''}</span>
        <span class="visitor-time">Last seen: ${fmtDateTime(v.last_seen)}</span>
      </div>
    `).join('');
  } catch(_) { list.innerHTML = '<div class="empty-msg">Could not load visitors.</div>'; }
}

function logout() {
  localStorage.removeItem('ja-today-session');
  window.location.href = 'login.html';
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-JM', { month:'short', day:'numeric', year:'numeric' }); }
  catch(_) { return d; }
}

function fmtDateTime(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-JM', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch(_) { return d; }
}

let toastTimer;
function toast(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (err ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = 'toast', 2800);
}

document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

init();

// ── BREAKING NEWS ──
async function loadBreakingStatus() {
  try {
    const res  = await fetch(API + '/breaking');
    const data = await res.json();
    const el   = document.getElementById('breaking-status');
    if (data.message) {
      el.style.color = 'var(--green)';
      el.textContent = '🔴 LIVE: ' + data.message;
    } else {
      el.style.color = 'var(--muted)';
      el.textContent = 'No active breaking news broadcast.';
    }
  } catch(_) {}
}

async function pushBreaking() {
  const msg = document.getElementById('breaking-msg').value.trim();
  if (!msg) { toast('Type a message first', true); return; }

  try {
    const res = await fetch(API + '/breaking', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: msg })
    });
    if (!res.ok) { toast('Could not push breaking news', true); return; }
    toast('Breaking news is live! 📡');
    loadBreakingStatus();
  } catch(_) { toast('Could not connect to server', true); }
}

async function clearBreaking() {
  try {
    await fetch(API + '/breaking', { method: 'DELETE' });
    toast('Broadcast cleared');
    document.getElementById('breaking-msg').value = '';
    loadBreakingStatus();
  } catch(_) { toast('Could not connect to server', true); }
}
