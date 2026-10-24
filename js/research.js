/* CCEL candidate s2-chapters: Research page. The full chapter content that used to sit in the landing stage:
   approach (research.intro + research.image), then each area I-V with its figure, summary, keywords and key papers.
   Calm reading page: still figures, no scrubbing; a sticky I-V bar shows where the reader is. */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$, $$ = S.$$;
  const KEY_PAPERS_MAX = 3;
  S.chrome('Research');

  // ---------- head + approach ----------
  $('#research-headline').textContent = D.research.headline;
  fetch('_shared/scroll/manifest.json').then(r => (r.ok ? r.json() : null)).then(m => {
    const h = m && m.sequences && m.sequences.hero;
    if (h && h.poster) $('#strip-img').src = '_shared/scroll/' + h.poster;
    // an area without its own figure in the data falls back to its sequence poster
    S.areas.forEach(a => {
      const im = $('#area-' + CSS.escape(a.numeral) + ' .area-fig img');
      const sp = m && m.sequences && m.sequences['area_' + a.numeral];
      if (im && !im.getAttribute('src') && sp && sp.poster) im.src = '_shared/scroll/' + sp.poster;
    });
  }).catch(() => {});
  $('#research-intro').innerHTML = D.research.intro.map(p => '<p>' + S.rich(p) + '</p>').join('');
  $('#area-index').innerHTML = S.areas.map(a =>
    '<li><a href="#area-' + esc(a.numeral) + '"><span class="num">' + esc(a.numeral) + '</span><span class="ttl">' + esc(a.title) + '</span></a></li>').join('');
  if (D.research.image) {
    $('#research-fig').innerHTML = '<img src="' + esc(S.src(D.research.image)) + '" alt="CCEL research approach: artificial intelligence, computational materials design and experimental validation" loading="lazy" decoding="async" width="3646" height="2240">' +
      '<figcaption>Research approach</figcaption>';
  } else {
    $('#research-fig').remove();
  }

  // ---------- areas ----------
  // key papers per area: the professor's pins for that area first, then that area's recent highlights
  // (both from curation, in their given order). Only if both are empty: the area's newest published papers.
  function keyPapers(num) {
    const out = [], seen = new Set();
    const add = (p, kind) => { if (p && !seen.has(p.no) && out.length < KEY_PAPERS_MAX) { seen.add(p.no); out.push({ p, kind }); } };
    D.curation.selected_pins.filter(x => x.area === num).forEach(x => add(S.pubByNo.get(x.no), 'pin'));
    D.curation.recent_highlights.map(n => S.pubByNo.get(n)).filter(p => p && p.area === num).forEach(p => add(p, 'hl'));
    if (!out.length) D.publications.filter(p => p.area === num && p.status === 'published').forEach(p => add(p, ''));
    return out;
  }

  const n = S.areas.length;
  $('#area-bar').innerHTML = '<div class="wrap"><nav class="chapter-nav" aria-label="Research areas I to ' + esc(S.areas[n - 1].numeral) + '" style="--n:' + n + '"><ol>' +
    S.areas.map(a => '<li><a href="#area-' + esc(a.numeral) + '" aria-label="Research area ' + esc(a.numeral) + ': ' + esc(a.title) + '" title="' + esc(a.title) + '">' +
      esc(a.numeral) + '<span class="track"><span class="fill"></span></span></a></li>').join('') +
    '</ol></nav></div>';

  $('#area-list').innerHTML = S.areas.map(a => {
    const id = esc(a.numeral);
    const kp = keyPapers(a.numeral);
    return '<article class="area-row" id="area-' + id + '" aria-labelledby="area-' + id + '-t">' +
      '<div class="wrap area-grid">' +
        '<figure class="area-fig"><img' + (a.image ? ' src="' + esc(S.src(a.image)) + '"' : '') +
          ' alt="Figure for research area ' + id + ': ' + esc(a.title) + '" loading="lazy" decoding="async" width="800" height="800"></figure>' +
        '<div class="area-text">' +
          '<p class="ch-num">Research area ' + id + '</p>' +
          '<h2 class="area-title" id="area-' + id + '-t">' + esc(a.title) + '</h2>' +
          '<p class="area-summary">' + S.rich(S.areaSummary(a)) + '</p>' +
          '<ul class="keywords" aria-label="Keywords">' + a.keywords.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>' +
          (kp.length ? '<div class="area-papers"><h3 class="label">Key papers</h3>' +
            kp.map(x => S.citation(x.p, { pin: x.kind === 'pin', highlightTag: x.kind === 'hl', note: false })).join('') + '</div>' : '') +
          '<p class="ch-more"><a href="publications.html?area=' + encodeURIComponent(a.numeral) + '#all">All papers in research area ' + id + ' →</a></p>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');

  // ---------- I-V bar: current area and progress through it (native scroll, rAF) ----------
  const rows = $$('#area-list .area-row');
  const links = $$('#area-bar a');
  let raf = 0, curK = -2, curP = '';
  function update() {
    raf = 0;
    const line = innerHeight * 0.4;
    let k = -1, p = 0;
    rows.forEach((r, i) => {
      const b = r.getBoundingClientRect();
      if (b.top <= line) { k = i; p = Math.min(1, Math.max(0, (line - b.top) / b.height)); }
    });
    if (k !== curK) {
      curK = k;
      links.forEach((a, i) => {
        if (i === k) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
        a.classList.toggle('is-done', k >= 0 && i < k);
      });
    }
    const v = p.toFixed(3);
    if (k >= 0 && v !== curP) { curP = v; links[k].style.setProperty('--p', v); }
  }
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();

  S.settleHash();
})();
