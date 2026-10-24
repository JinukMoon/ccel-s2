/* CCEL candidate s2-chapters: landing page (lean, like the current Welcome.html).
   Hero -> research chapter stage (visual, title, one line each) -> News | Open Position -> Selected Publications
   -> About CCEL -> contact footer. Every fact from window.CCEL; no counts or totals are displayed here. */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$;

  S.chrome();

  // ---------- hero ----------
  $('#hero-affil').textContent = D.lab.affiliation;
  $('#hero-title').textContent = D.lab.name;
  $('#hero-tagline').textContent = D.welcome.tagline;
  Promise.resolve(window.CCEL_MANIFEST).then(man => {
    const h = man && man.sequences && man.sequences.hero;
    if (h && h.poster) $('#hero-poster').src = '_shared/scroll/' + h.poster;
  });

  // ---------- research stage: one chapter per area, the visual plus its title and one line ----------
  const n = S.areas.length;
  const last = S.areas[n - 1].numeral;
  const navHTML = label => '<nav class="chapter-nav" aria-label="' + label + '" style="--n:' + n + '"><ol>' + S.areas.map(a =>
    '<li><a href="#research-' + esc(a.numeral) + '" aria-label="Research area ' + esc(a.numeral) + ': ' + esc(a.title) + '" title="' + esc(a.title) + '">' +
    esc(a.numeral) + '<span class="track"><span class="fill"></span></span></a></li>').join('') + '</ol></nav>';

  const chaptersHTML = S.areas.map(a => {
    const id = esc(a.numeral);
    return '<article class="chapter" id="research-' + id + '" aria-labelledby="ch-' + id + '-t">' +
      '<div class="ch-inner">' +
        '<figure class="ch-fig"><img alt="Illustration for research area ' + id + ': ' + esc(a.title) + '" decoding="async"><canvas aria-hidden="true"></canvas></figure>' +
        '<div class="ch-panel">' +
          '<p class="ch-num">Research area ' + id + '</p>' +
          '<h3 class="ch-title" id="ch-' + id + '-t">' + esc(a.title) + '</h3>' +
          '<p class="ch-line">' + S.rich(S.areaFirstSentence(a)) + '</p>' +
          '<p class="ch-more"><a href="research.html#area-' + id + '" aria-label="Research area ' + id + ' in detail: summary, keywords and key papers">Summary and key papers →</a></p>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');

  const stage = $('#stage');
  stage.innerHTML =
    '<div class="stage-mbar">' + navHTML('Research areas I to ' + last) + '</div>' +
    '<div class="stage-aside"><div class="stage-pin">' +
      '<div class="stage-head"><h2 class="stage-title">Research areas</h2><a href="research.html">Research overview →</a></div>' +
      navHTML('Research areas I to ' + last + ', progress') +
      '<div class="stage-plate"><div class="layer"><img alt=""><canvas aria-hidden="true"></canvas></div><div class="layer"><img alt=""><canvas aria-hidden="true"></canvas></div></div>' +
    '</div></div>' +
    '<div class="chapters">' + chaptersHTML + '</div>';

  // ---------- news | open position ----------
  $('#news-list').innerHTML = D.welcome.news.map(x =>
    '<li>' + (x.date ? '<time>' + esc(x.date) + '</time>' : '') + esc(x.text) + '</li>').join('');
  $('#opening').textContent = D.welcome.opening_ko;
  const mail = D.contact.email || D.professor.email;
  $('#opening-mail').innerHTML = 'Contact: <a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a>';

  // ---------- selected publications: curation.selected_pins as given, compact (title, journal line, DOI) ----------
  $('#sel-list').innerHTML = D.curation.selected_pins.map(pin => {
    const p = S.pubByNo.get(pin.no);
    if (!p) return '';
    const a = S.areaBy.get(pin.area);
    const link = S.paperLink(p);
    const title = S.rich(p.title);
    const status = p.status && p.status !== 'published' ? '<span class="tag status">' + esc(S.STATUS_LABEL[p.status] || p.status) + '</span>' : '';
    const doi = p.doi ? ' · <a href="https://doi.org/' + esc(p.doi) + '">doi:' + esc(p.doi) + '</a>' : '';
    return '<li><div class="sel-body">' +
      (a || status ? '<div class="tags">' + (a ? '<span class="tag area" title="' + esc(a.title) + '">Area ' + esc(a.numeral) + '</span>' : '') + status + '</div>' : '') +
      '<h3 class="sel-title">' + (link ? '<a href="' + esc(link) + '">' + title + '</a>' : title) + '</h3>' +
      '<p class="sel-src">' + S.journalLine(p) + doi + '</p>' +
    '</div></li>';
  }).join('');

  // ---------- about ----------
  $('#about-name').textContent = D.lab.name;
  $('#about-affil').textContent = D.lab.affiliation;
  $('#about-ko').textContent = D.welcome.about_ko;

  // ---------- go ----------
  const keys = S.areas.map(a => 'area_' + a.numeral);
  const titles = S.areas.map(a => '<span class="num">' + esc(a.numeral) + '</span>' + esc(a.title));
  window.Stage.init(stage, keys, titles);
  S.settleHash();
})();
