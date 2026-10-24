/* CCEL candidate s2-chapters: People page (professor, current members by group, alumni). Names and labels stay in English. */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$, $$ = S.$$;
  S.chrome('People');
  const st = S.stats;

  $('#people-summary').textContent = st.members + ' current members in ' + D.members.length + ' groups and ' + st.alumni + ' alumni.';
  fetch('_shared/scroll/manifest.json').then(r => (r.ok ? r.json() : null)).then(m => {
    const h = m && m.sequences && m.sequences.hero;
    if (h && h.poster) $('#strip-img').src = '_shared/scroll/' + h.poster;
  }).catch(() => {});

  // ---------- professor ----------
  const pr = D.professor;
  const profLinks = { scholar: pr.links && pr.links.google_scholar, cv: pr.links && pr.links.cv ? S.src(pr.links.cv) : null };
  const edu = ((pr.sections && pr.sections.Education) || []).filter((l, i) => !(i === 0 && l.trim() === 'Education'))
    .map(l => l.replace(/^\s*✔\s*/, '').trim()).filter(Boolean);
  $('#prof-body').innerHTML =
    '<div class="prof" style="border-bottom:0;padding-bottom:0">' +
      '<img class="prof-photo" src="' + esc(S.src(pr.photo)) + '" alt="' + esc(pr.name) + '" width="413" height="531" decoding="async">' +
      '<div><p class="label">Principal investigator</p>' +
        '<h2 class="section-title" id="prof-title" style="margin-top:4px">' + esc(pr.name) + '</h2>' +
        '<p>' + esc(pr.title) + '</p>' +
        (pr.roles || []).map(r => '<p>' + esc(r) + '</p>').join('') +
        '<p><a href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a> · ' + esc(D.contact.professor_office || '') + '</p>' +
        S.linkIcons(profLinks, pr.name) +
        (edu.length ? '<div class="prof-cv"><h4>Education</h4><ul>' + edu.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul></div>' : '') +
        (profLinks.cv ? '<p style="margin-top:14px;font-size:15px"><a href="' + esc(profLinks.cv) + '">Full curriculum vitae with appointments and service (PDF) →</a></p>' : '') +
      '</div>' +
    '</div>';

  // ---------- current members ----------
  function card(p) {
    const nm = S.splitName(p.name);
    return '<article class="person" data-type="' + esc(p.type || '') + '">' + S.photo(p) +
      '<h4>' + esc(nm.name) + (nm.note ? '<span class="note">' + esc(nm.note) + '</span>' : '') + '</h4>' +
      S.typeBadge(p.type) +
      (p.research_area ? '<p class="ra">' + esc(p.research_area) + '</p>' : '') +
      (p.degrees && p.degrees.length ? '<ul class="deg">' + p.degrees.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul>' : '') +
      ((p.email || p.office) ? '<p class="contact">' + (p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '') + (p.email && p.office ? '<br>' : '') + esc(p.office || '') + '</p>' : '') +
      S.linkIcons(p.links, nm.name) + '</article>';
  }
  $('#member-groups').innerHTML = D.members.map(g =>
    '<div class="member-group"><h3 class="subhead">' + esc(g.group) + '<span class="count" data-total="' + g.people.length + '">' + g.people.length + '</span></h3>' +
    '<div class="people-grid">' + g.people.map(card).join('') + '</div></div>').join('');

  $$('.filter-row button').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.type;
    $$('.filter-row button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('.member-group').forEach(g => {
      let n = 0;
      g.querySelectorAll('.person').forEach(p => { const ok = !t || p.dataset.type === t; p.hidden = !ok; if (ok) n++; });
      g.hidden = n === 0;
      const c = g.querySelector('.count');
      c.textContent = t ? n + ' of ' + c.dataset.total : c.dataset.total;
    });
  }));

  // ---------- alumni ----------
  $('#alumni-groups').innerHTML = D.alumni.map(g =>
    '<h3 class="subhead">' + esc(g.group) + '<span class="count">' + g.people.length + '</span></h3>' +
    '<div class="alumni-list">' + g.people.map(p => {
      const nm = S.splitName(p.name);
      return '<article class="alum">' + S.photo(p) + '<div>' +
        '<h4>' + esc(nm.name) + (nm.note ? '<span class="note" style="display:block;font-size:13px;font-weight:400;color:var(--muted)">' + esc(nm.note) + '</span>' : '') + '</h4>' +
        (p.current_position ? '<p class="pos">' + esc(p.current_position) + '</p>' : '') +
        (p.degrees && p.degrees.length ? '<p class="deg">' + p.degrees.map(esc).join('<br>') + '</p>' : '') +
        S.typeBadge(p.type) +
        S.linkIcons(p.links, nm.name) + '</div></article>';
    }).join('') + '</div>').join('');

  S.settleHash();
})();
