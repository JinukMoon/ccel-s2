/* CCEL candidate s2-chapters: publications page (all entries, Selected, Journal covers). */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$, $$ = S.$$;
  S.chrome('Publications');

  const P = D.publications;
  const st = S.stats;
  const counts = D.publication_counts || {};
  const other = P.length - st.published;
  $('#pub-summary').textContent = P.length + ' entries: ' + st.published + ' published papers (' + st.firstYear + '–' + st.lastYear + ')' +
    (other ? ' and ' + other + ' submitted, in revision or in press.' : '.') + ' CCEL members in bold.';
  fetch('_shared/scroll/manifest.json').then(r => (r.ok ? r.json() : null)).then(m => {
    const h = m && m.sequences && m.sequences.hero;
    if (h && h.poster) $('#strip-img').src = '_shared/scroll/' + h.poster;
  }).catch(() => {});

  // ---------- views (hash) ----------
  const views = ['all', 'selected', 'covers'];
  function showView() {
    const v = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'all';
    views.forEach(id => { $('#' + id).hidden = id !== v; });
    $$('.tabs a').forEach(a => a.setAttribute('aria-current', String(a.dataset.view === v)));
  }
  addEventListener('hashchange', showView);
  showView();

  // ---------- all publications: render once, filter by toggling hidden ----------
  const years = Array.from(new Set(Object.keys(counts).map(Number).concat(P.map(p => p.year).filter(Boolean)))).sort((a, b) => b - a);
  const byYear = new Map(years.map(y => [y, []]));
  P.forEach((p, i) => { if (byYear.has(p.year)) byYear.get(p.year).push(i); });
  const undated = P.map((p, i) => i).filter(i => !P[i].year);

  const group = (label, idx, total) =>
    '<section class="year-group" data-year="' + esc(label) + '"><div class="year-head"><h2>' + esc(label) + '</h2><span data-count data-total="' + total + '">' + total + ' entries</span></div>' +
    idx.map(i => '<div class="pub" data-i="' + i + '"><span class="pub-no">No. ' + esc(P[i].no) + '</span>' + S.citation(P[i], { area: true, coverTag: true, h: 'h3' }) + '</div>').join('') +
    '</section>';
  $('#pub-list').innerHTML = years.map(y => group(y, byYear.get(y), counts[y] != null ? counts[y] : byYear.get(y).length)).join('') +
    (undated.length ? group('Year not given', undated, undated.length) : '');

  const rows = $$('#pub-list .pub');
  const groups = $$('#pub-list .year-group');
  const hay = P.map(p => (S.plain(p.title) + ' ' + S.plain(p.authors) + ' ' + (p.journal || '') + ' ' + (p.citation_tail || '') + ' ' + (p.doi || '')).toLowerCase());

  // filter options from the data
  $('#f-year').innerHTML = '<option value="">All years</option>' + years.map(y => '<option value="' + y + '">' + y + ' (' + (counts[y] != null ? counts[y] : byYear.get(y).length) + ')</option>').join('');
  const statuses = Array.from(new Set(P.map(p => p.status).filter(Boolean)));
  $('#f-status').innerHTML = '<option value="">All statuses</option>' + statuses.map(s => '<option value="' + esc(s) + '">' + esc(S.STATUS_LABEL[s] || s) + ' (' + P.filter(p => p.status === s).length + ')</option>').join('');
  $('#f-area').innerHTML = '<option value="">All areas</option>' + S.areas.map(a => '<option value="' + esc(a.numeral) + '">' + esc(a.numeral + '. ' + a.title) + '</option>').join('') +
    '<option value="none">Not assigned to an area</option>';

  const params = new URLSearchParams(location.search);
  if (params.get('q')) $('#q').value = params.get('q');
  if (params.get('year')) $('#f-year').value = params.get('year');
  if (params.get('status')) $('#f-status').value = params.get('status');
  if (params.get('area')) $('#f-area').value = params.get('area');
  if (params.get('labled') === '1') $('#f-labled').checked = true;

  function apply() {
    const q = $('#q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const y = $('#f-year').value, s = $('#f-status').value, a = $('#f-area').value, ll = $('#f-labled').checked;
    let shown = 0;
    rows.forEach(r => {
      const i = +r.dataset.i, p = P[i];
      const ok = (!y || String(p.year) === y) && (!s || p.status === s) &&
        (!a || (a === 'none' ? !p.area : p.area === a)) && (!ll || p.lab_led) &&
        q.every(t => hay[i].includes(t));
      r.hidden = !ok;
      if (ok) shown++;
    });
    const filtered = q.length || y || s || a || ll;
    groups.forEach(g => {
      const vis = g.querySelectorAll('.pub:not([hidden])').length;
      g.hidden = vis === 0;
      const c = g.querySelector('[data-count]');
      c.textContent = filtered ? vis + ' of ' + c.dataset.total + ' entries' : c.dataset.total + ' entries';
    });
    $('#result-line').textContent = filtered ? 'Showing ' + shown + ' of ' + P.length + ' entries' : 'All ' + P.length + ' entries, newest first';
    $('#empty').hidden = shown > 0;
    const u = new URLSearchParams();
    if (q.length) u.set('q', $('#q').value.trim());
    if (y) u.set('year', y); if (s) u.set('status', s); if (a) u.set('area', a); if (ll) u.set('labled', '1');
    const qs = u.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  let t = 0;
  $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 90); });
  ['#f-year', '#f-status', '#f-area', '#f-labled'].forEach(id => $(id).addEventListener('change', apply));
  apply();

  // ---------- selected (curation, as given) ----------
  $('#sel-pins').innerHTML = D.curation.selected_pins.map(pin => {
    const p = S.pubByNo.get(pin.no);
    if (!p) return '';
    const a = S.areaBy.get(pin.area);
    const cite = S.citation(p, { areaLabel: a ? a.numeral + ' · ' + a.title : '', h: 'h3' });
    const cover = S.coverFor(p, 'front');
    return '<li>' + (cover ? '<div class="pin-with-cover">' + cite + '<a class="cover-thumb" href="' + esc(S.src(cover.image)) + '"><img src="' + esc(S.src(cover.image)) + '" alt="Journal cover: ' + esc(S.plain(p.title)) + '" loading="lazy" width="300" height="400"></a></div>' : cite) + '</li>';
  }).join('');
  // Recent Highlights (curation.recent_highlights, as given): cover cards, moved here from the landing page
  $('#sel-hl').innerHTML = D.curation.recent_highlights.map(no => {
    const p = S.pubByNo.get(no);
    if (!p) return '';
    const cover = S.coverFor(p, 'front');
    return '<div class="hl-card' + (cover ? '' : ' no-cover') + '">' +
      (cover ? '<a class="cover-thumb" href="' + esc(S.paperLink(p) || S.src(cover.image)) + '"><img src="' + esc(S.src(cover.image)) + '" alt="Journal cover: ' + esc(S.plain(p.title)) + '" loading="lazy" decoding="async" width="300" height="400"></a>' : '') +
      S.citation(p, { area: true, h: 'h3' }) + '</div>';
  }).join('');
  $('#sel-rules').textContent = D.curation.rules + (D.curation.updated_at ? ' (updated ' + D.curation.updated_at + ')' : '');
  $('#sel-earlier').innerHTML = (D.selected_publications || []).map(sp => {
    const link = sp.doi ? 'https://doi.org/' + sp.doi : S.safeUrl(sp.url);
    return '<article class="cite"><h3 class="cite-title">' + (link ? '<a href="' + esc(link) + '">' + S.rich(sp.title) + '</a>' : S.rich(sp.title)) + '</h3>' +
      '<p class="cite-authors">' + S.rich(sp.authors_citation) + '</p>' +
      (sp.highlight ? '<p class="cite-note">' + esc(sp.highlight) + '</p>' : '') +
      (sp.abstract ? '<details class="rules" style="margin-top:6px"><summary>Abstract</summary><p>' + S.rich(sp.abstract) + '</p></details>' : '') +
      '</article>';
  }).join('');

  // ---------- covers: complete archive (front and back pages), matched to papers by DOI / URL only ----------
  const covers = D.cover_publications || [];
  $('#cover-line').textContent = covers.length + ' journal covers and cover pages, newest first.';
  $('#cover-grid').innerHTML = covers.map(c => {
    const p = S.paperForCover(c);
    const href = p ? S.paperLink(p) : S.safeUrl(c.url);
    const label = p ? S.plain(p.title) : 'Journal cover';
    return '<figure class="cover-card"><a class="img" href="' + esc(href || S.src(c.image)) + '"><img src="' + esc(S.src(c.image)) + '" alt="' + esc((c.kind === 'back_page' ? 'Cover page: ' : 'Journal cover: ') + label) + '" loading="lazy" decoding="async" width="300" height="400"></a>' +
      '<p>' + (p ? S.rich(p.title) : '') + '<span class="jr">' + (p ? esc((p.journal || '') + (p.year ? ' · ' + p.year : '')) : '') + (c.kind === 'back_page' ? (p ? ' · ' : '') + 'Back / inside cover page' : '') + '</span></p></figure>';
  }).join('');

  S.settleHash();
})();
