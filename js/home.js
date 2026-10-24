/* CCEL candidate s2-chapters: landing page. Renders every section from window.CCEL, then starts the stage. */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$;
  const KEY_PAPERS_MAX = 2;   // a chapter panel has to fit one 1440x900 screen next to its figure

  S.chrome();

  // ---------- hero ----------
  $('#hero-affil').textContent = D.lab.affiliation;
  $('#hero-title').textContent = D.lab.name;
  $('#hero-tagline').textContent = D.welcome.tagline;
  const st = S.stats;
  $('#hero-meta').innerHTML =
    '<span><b>' + st.published + '</b>published papers, ' + st.firstYear + '–' + st.lastYear + '</span>' +
    '<span><b>' + st.members + '</b>current members</span>' +
    '<span><b>' + st.alumni + '</b>alumni</span>';
  $('#area-index').innerHTML = S.areas.map(a =>
    '<li><a href="#research-' + esc(a.numeral) + '"><span class="num">' + esc(a.numeral) + '</span><span class="ttl">' + esc(a.title) + '</span></a></li>').join('');
  Promise.resolve(window.CCEL_MANIFEST).then(man => {
    const h = man && man.sequences && man.sequences.hero;
    if (h && h.poster) $('#hero-poster').src = '_shared/scroll/' + h.poster;
  });

  // ---------- research intro ----------
  $('#research-headline').textContent = D.research.headline;
  $('#research-intro').innerHTML = D.research.intro.map(p => '<p>' + S.rich(p) + '</p>').join('');
  $('#about-ko').textContent = D.welcome.about_ko;
  if (D.research.image) {
    // a large original (~0.9 MB): fetch it when it is about to scroll in, not with the first screen
    $('#research-fig').innerHTML = '<img alt="CCEL research approach: artificial intelligence, computational materials design and experimental validation" decoding="async" width="3646" height="2240">' +
      '<figcaption>Research approach</figcaption>';
    const im = $('#research-fig img'), url = S.src(D.research.image);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { im.src = url; io.disconnect(); } }, { rootMargin: '0px 0px 300px 0px' });
      io.observe(im);
    } else im.src = url;
  }

  // ---------- research stage ----------
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
  const navHTML = label => '<nav class="chapter-nav" aria-label="' + label + '" style="--n:' + n + '"><ol>' + S.areas.map(a =>
    '<li><a href="#research-' + esc(a.numeral) + '" aria-label="Research area ' + esc(a.numeral) + ': ' + esc(a.title) + '" title="' + esc(a.title) + '">' +
    esc(a.numeral) + '<span class="track"><span class="fill"></span></span></a></li>').join('') + '</ol></nav>';

  const chaptersHTML = S.areas.map((a, i) => {
    const kp = keyPapers(a.numeral);
    const count = st.areaCount(a.numeral);
    return '<article class="chapter" id="research-' + esc(a.numeral) + '" aria-labelledby="ch-' + esc(a.numeral) + '-t">' +
      '<div class="ch-inner">' +
        '<figure class="ch-fig"><img alt="Illustration for research area ' + esc(a.numeral) + ': ' + esc(a.title) + '" decoding="async"><canvas aria-hidden="true"></canvas></figure>' +
        '<div class="ch-panel">' +
          '<p class="ch-num">Research area ' + esc(a.numeral) + ' <span class="label">· ' + (i + 1) + ' of ' + n + '</span></p>' +
          '<h3 class="ch-title" id="ch-' + esc(a.numeral) + '-t">' + esc(a.title) + '</h3>' +
          '<p class="ch-summary">' + S.rich(S.areaSummary(a)) + '</p>' +
          '<ul class="keywords" aria-label="Keywords">' + a.keywords.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>' +
          (kp.length ? '<div class="ch-papers"><span class="label">Key papers</span>' +
            kp.map(x => S.citation(x.p, { pin: x.kind === 'pin', highlightTag: x.kind === 'hl', note: false })).join('') + '</div>' : '') +
          '<p class="ch-more"><a href="publications.html?area=' + encodeURIComponent(a.numeral) + '#all">All ' + count + ' published papers in area ' + esc(a.numeral) + ' →</a></p>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');

  const stage = $('#stage');
  stage.innerHTML =
    '<div class="stage-mbar">' + navHTML('Research areas I to ' + S.areas[n - 1].numeral) + '</div>' +
    '<div class="stage-aside"><div class="stage-pin">' +
      navHTML('Research areas I to ' + S.areas[n - 1].numeral + ', progress') +
      '<div class="stage-plate"><div class="layer"><img alt=""><canvas aria-hidden="true"></canvas></div><div class="layer"><img alt=""><canvas aria-hidden="true"></canvas></div></div>' +
      '<p class="stage-caption" aria-hidden="true"></p>' +
    '</div></div>' +
    '<div class="chapters">' + chaptersHTML + '</div>';

  // ---------- selected publications (curation.selected_pins, as given) ----------
  $('#pub-more').textContent = 'All ' + st.published + ' published papers →';
  $('#pin-list').innerHTML = D.curation.selected_pins.map(pin => {
    const p = S.pubByNo.get(pin.no);
    if (!p) return '';
    const a = S.areaBy.get(pin.area);
    const cite = S.citation(p, { areaLabel: a ? a.numeral + ' · ' + a.title : '' });
    const cover = S.coverFor(p, 'front');
    return '<li>' + (cover
      ? '<div class="pin-with-cover">' + cite + '<a class="cover-thumb" href="' + esc(S.paperLink(p) || S.src(cover.image)) + '"><img src="' + esc(S.src(cover.image)) + '" alt="Journal cover: ' + esc(S.plain(p.title)) + '" loading="lazy" decoding="async" width="300" height="400"></a></div>'
      : cite) + '</li>';
  }).join('');
  $('#curation-rules').textContent = D.curation.rules;

  // ---------- recent highlights (curation.recent_highlights, as given) ----------
  $('#hl-grid').innerHTML = D.curation.recent_highlights.map(no => {
    const p = S.pubByNo.get(no);
    if (!p) return '';
    const cover = S.coverFor(p, 'front');
    return '<div class="hl-card' + (cover ? '' : ' no-cover') + '">' +
      (cover ? '<a class="cover-thumb" href="' + esc(S.paperLink(p) || S.src(cover.image)) + '"><img src="' + esc(S.src(cover.image)) + '" alt="Journal cover: ' + esc(S.plain(p.title)) + '" loading="lazy" decoding="async" width="300" height="400"></a>' : '') +
      S.citation(p, { area: true, h: 'h3' }) + '</div>';
  }).join('');

  // ---------- people preview ----------
  const pr = D.professor;
  const profLinks = { scholar: pr.links && pr.links.google_scholar, cv: pr.links && pr.links.cv ? S.src(pr.links.cv) : null };
  const groups = D.members;
  const first = groups[0];
  $('#people-body').innerHTML =
    '<div class="prof">' +
      '<img class="prof-photo" src="' + esc(S.src(pr.photo)) + '" alt="' + esc(pr.name) + '" loading="lazy" decoding="async" width="413" height="531">' +
      '<div><h3>' + esc(pr.name) + '</h3>' +
        '<p>' + esc(pr.title) + '</p>' +
        (pr.roles || []).map(r => '<p>' + esc(r) + '</p>').join('') +
        '<p><a href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a></p>' +
        S.linkIcons(profLinks, pr.name) +
        '<p style="margin-top:12px"><a href="members.html#professor">Profile, education and experience →</a></p>' +
      '</div>' +
    '</div>' +
    '<p class="group-summary"><span><b>' + st.members + '</b> current members</span>' +
      groups.map(g => '<span>' + esc(g.group) + ' <b>' + g.people.length + '</b></span>').join('') +
      '<span>Alumni <b>' + st.alumni + '</b></span></p>' +
    (first ? '<h3 class="subhead">' + esc(first.group) + '<span class="count">' + first.people.length + '</span></h3>' +
      '<div class="people-grid">' + first.people.map(personCard).join('') + '</div>' : '');

  function personCard(p) {
    const nm = S.splitName(p.name);
    return '<article class="person">' + S.photo(p) +
      '<h4>' + esc(nm.name) + (nm.note ? '<span class="note">' + esc(nm.note) + '</span>' : '') + '</h4>' +
      S.typeBadge(p.type) +
      (p.research_area ? '<p class="ra">' + esc(p.research_area) + '</p>' : '') +
      S.linkIcons(p.links, nm.name) + '</article>';
  }

  // ---------- news / join / contact ----------
  $('#news-list').innerHTML = D.welcome.news.map(x =>
    '<li>' + (x.date ? '<time>' + esc(x.date) + '</time>' : '') + esc(x.text) + '</li>').join('');
  $('#opening').textContent = D.welcome.opening_ko;
  const mail = D.contact.email || pr.email;
  $('#opening-mail').innerHTML = '<a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a>';
  const c = D.contact;
  $('#contact-name').innerHTML = '<b>' + esc(c.lab_name) + '</b>';
  $('#contact-address').textContent = c.address;
  $('#contact-list').innerHTML = [
    ['Email', '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>'],
    ['Professor office', esc(c.professor_office)],
    ['Laboratory', esc(c.laboratory)],
    ['Student office', esc(c.student_office)]
  ].filter(r => r[1]).map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');

  // ---------- go ----------
  const keys = S.areas.map(a => 'area_' + a.numeral);
  const titles = S.areas.map(a => '<span class="num">' + esc(a.numeral) + '</span>' + esc(a.title));
  window.Stage.init(stage, keys, titles);
  S.settleHash();
})();
