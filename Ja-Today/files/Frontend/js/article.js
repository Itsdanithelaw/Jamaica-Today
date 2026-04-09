
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return 'Today';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-JM', { weekday:'long', month:'long', day:'numeric', year:'numeric' }); }
  catch(_) { return d; }
}

function render() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('data');

  if (!raw) {
    document.getElementById('article-wrap').innerHTML = `<p style="color:var(--muted)">No article found. <a href="ja-today.html" style="color:var(--green)">Go back to the feed.</a></p>`;
    return;
  }

  let a;
  try { a = JSON.parse(decodeURIComponent(raw)); }
  catch(_) {
    document.getElementById('article-wrap').innerHTML = `<p style="color:var(--muted)">Could not load article. <a href="ja-today.html" style="color:var(--green)">Go back.</a></p>`;
    return;
  }

  document.title = `${a.title} — JA Today`;

  const imgHTML = a.image
    ? `<img class="article-image" src="${esc(a.image)}" alt="" onerror="this.outerHTML='<div class=article-image-placeholder><span>JA TODAY</span></div>'">`
    : `<div class="article-image-placeholder"><span>JA TODAY</span></div>`;

  // Body: use a.body if present, otherwise expand excerpt into paragraphs
  const bodyText = a.body || a.excerpt || '';
  const bodyHTML = bodyText.split('\n').filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('');

  document.getElementById('article-wrap').innerHTML = `
    ${a.category ? `<div class="article-cat">${esc(a.category)}</div>` : ''}
    <h1 class="article-title">${esc(a.title)}</h1>
    ${a.excerpt ? `<p class="article-excerpt">${esc(a.excerpt)}</p>` : ''}
    <div class="article-meta">
      ${a.author ? `<span>By ${esc(a.author)}</span>` : ''}
      ${a.source ? `<span class="meta-source">${esc(a.source)}</span>` : ''}
      ${a.date ? `<span>${fmtDate(a.date)}</span>` : ''}
    </div>
    ${imgHTML}
    <div class="article-body">${bodyHTML}</div>
    ${a.url ? `<a class="external-link" href="${esc(a.url)}" target="_blank" rel="noopener">Read full story on ${esc(a.source||'source')} ↗</a>` : ''}
    <div class="subscribe-bar">
      <h3>Enjoying this journalist's work?</h3>
      <p>Subscribe to get notified every time ${esc(a.author||'this journalist')} publishes a new story.</p>
      <button class="subscribe-btn">Subscribe to Journalist</button>
    </div>
  `;
}

render();
