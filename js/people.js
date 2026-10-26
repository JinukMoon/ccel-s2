/* CCEL candidate s2-chapters: Members page. Current members by group on first view; an Alumni view behind a
   switch (hash #alumni, back button in sync). The professor has his own page (professor.html).
   Names and labels stay in English; alumni current_position is shown exactly as in the data ("N/A" included). */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$, $$ = S.$$;
  S.chrome('Members');
  const st = S.stats;
  const root = document.documentElement;

  $('#people-summary').textContent = st.members + ' current members in ' + D.members.length + ' groups; ' + st.alumni + ' alumni.';
  $('#prof-link').innerHTML = 'Principal investigator: <a href="professor.html">' + esc(D.professor.name) + ' →</a>';
  $('#n-members').textContent = st.members;
  $('#n-alumni').textContent = st.alumni;
  fetch('_shared/scroll/manifest.json').then(r => (r.ok ? r.json() : null)).then(m => {
    const h = m && m.sequences && m.sequences.hero;
    if (h && h.poster) $('#strip-img').src = '_shared/scroll/' + h.poster;
  }).catch(() => {});

  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const gid = (view, g) => view + '-' + slug(g.group);

  // ---------- cards (one design for both views; alumni add their current position) ----------
  function card(p, alum) {
    const nm = S.splitName(p.name);
    return '<article class="person' + (alum ? ' is-alum' : '') + '" data-type="' + esc(p.type || '') + '">' + S.photo(p) +
      '<h4>' + esc(nm.name) + (nm.note ? '<span class="note">' + esc(nm.note) + '</span>' : '') + '</h4>' +
      S.typeBadge(p.type) +
      (alum && p.current_position ? '<p class="pos"><span class="pos-label">Current position</span>' + esc(p.current_position) + '</p>' : '') +
      (!alum && p.research_area ? '<p class="ra">' + esc(p.research_area) + '</p>' : '') +
      (p.degrees && p.degrees.length ? '<ul class="deg">' + p.degrees.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul>' : '') +
      ((p.email || p.office) ? '<p class="contact">' + (p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '') + (p.email && p.office ? '<br>' : '') + esc(p.office || '') + '</p>' : '') +
      S.linkIcons(p.links, nm.name) + '</article>';
  }
  function groupsHTML(view, list, alum) {
    return list.map(g =>
      '<div class="member-group" id="' + gid(view, g) + '">' +
        '<h3 class="subhead">' + esc(g.group) + '<span class="count" data-total="' + g.people.length + '">' + g.people.length + '</span></h3>' +
        '<div class="people-grid">' + g.people.map(p => card(p, alum)).join('') + '</div>' +
      '</div>').join('');
  }
  $('#member-groups').innerHTML = groupsHTML('members', D.members, false);
  $('#alumni-groups').innerHTML = groupsHTML('alumni', D.alumni, true);
  $('#jumps-members').innerHTML = D.members.map(g => '<a href="#' + gid('members', g) + '">' + esc(g.group) + '</a>').join('');
  $('#jumps-alumni').innerHTML = D.alumni.map(g => '<a href="#' + gid('alumni', g) + '">' + esc(g.group) + '</a>').join('');

  // ---------- research-type legend, also a filter (applies to both views) ----------
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

  // ---------- view switch: Current members | Alumni ----------
  // #members / #members-<group> -> current view, #alumni / #alumni-<group> -> alumni view, other hashes keep the view.
  const viewOf = id => (/^alumni(-|$)/.test(id) ? 'alumni' : /^members(-|$)/.test(id) || id === '' ? 'members' : null);
  const hashId = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return location.hash.slice(1); } };
  const bar = $('#view-bar');
  // where a hash should land: a view name lands on the switch (so "Current members" / "Alumni" stay at hand), a group on its heading
  const landing = id => (id === '' || id === 'members' || id === 'alumni' ? bar : document.getElementById(id));
  const barH = () => parseFloat(getComputedStyle(root).getPropertyValue('--bar-h')) || 76;

  function setView(v) {
    root.setAttribute('data-view', v);
    $$('.view-switch a').forEach(a => {
      if (a.dataset.show === v) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  function go(id) {
    const v = viewOf(id);
    if (!v) return;
    setView(v);
    const t = landing(id);
    if (!t) return;
    if (t === bar) {
      // switching views: stay put while the switch is on screen, otherwise bring it back under the top bar
      const r = bar.getBoundingClientRect();
      if (r.top < barH() || r.top > innerHeight * 0.6) bar.scrollIntoView({ block: 'start' });
    } else {
      t.scrollIntoView({ block: 'start' });
    }
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    if (!viewOf(id) || id === '') return;
    e.preventDefault();
    if (hashId() !== id) history.pushState(null, '', '#' + id);
    go(id);
  });
  // back / forward and hand-typed hashes
  addEventListener('popstate', () => go(hashId()));
  addEventListener('hashchange', () => go(hashId()));

  setView(viewOf(hashId()) || root.getAttribute('data-view') || 'members');
  S.settleHash(id => (viewOf(id) ? landing(id) : null));
})();
