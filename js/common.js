/* CCEL candidate s2-chapters: helpers shared by all three pages.
   Every fact comes from window.CCEL (_shared/content.js); image paths in the data are relative to _shared/. */
(function () {
  'use strict';
  const D = window.CCEL;
  const SHARED = '_shared/';
  const PROF = D.professor.name;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // title / authors / summaries carry only <sub>/<sup>: escape everything, then allow those two back
  const rich = s => esc(s).replace(/&lt;(\/?)(sub|sup)&gt;/g, '<$1$2>');
  const plain = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '');
  const src = p => (p ? SHARED + p : '');
  // HTTPS-only: upgrade legacy links, never emit an insecure or protocol-relative URL
  const safeUrl = u => {
    if (!u) return '';
    u = String(u).trim();
    if (u.startsWith('//')) return 'https:' + u;
    return u.replace(/^http:/i, 'https:');
  };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const pubByNo = new Map(D.publications.map(p => [p.no, p]));
  const areas = D.research.areas;
  const areaBy = new Map(areas.map(a => [a.numeral, a]));

  // research.areas[].summary repeats "I. <title>" at the start; show only the prose
  function areaSummary(a) {
    let s = String(a.summary || '').trim();
    const lead = a.numeral + '. ' + a.title;
    if (s.startsWith(lead)) s = s.slice(lead.length).trim();
    return s;
  }

  // the landing chapters show one line per area: the first sentence of its summary
  function areaFirstSentence(a) {
    const s = areaSummary(a);
    const m = s.match(/^(.+?[.!?])(?=\s+[A-Z(]|\s*$)/);
    return m ? m[1] : s;
  }

  function paperLink(p) {
    if (p.doi) return 'https://doi.org/' + p.doi;
    return safeUrl(p.url);
  }

  // citation_tail = "<authors>, <journal vol (year) pages>. (IF=x)"; authors are already rendered from p.authors
  function sourceText(p) {
    let t = p.citation_tail || '';
    const a = plain(p.authors);
    if (a && t.startsWith(a)) t = t.slice(a.length);
    t = t.replace(/^\s*,\s*/, '').replace(/\s*\(IF\s*=\s*[^)]*\)\s*\.?\s*$/i, '').trim();
    return t;
  }

  // one short source line: "<journal> <vol> (<year)> <pages>" with the journal name set apart
  function journalLine(p) {
    const t = sourceText(p).replace(/\.\s*$/, '');
    if (p.journal && t.startsWith(p.journal)) return '<span class="jr">' + esc(p.journal) + '</span>' + esc(t.slice(p.journal.length));
    return esc(t || [p.journal, p.year].filter(Boolean).join(' '));
  }

  function boldAuthors(p) {
    let h = rich(p.authors);
    const names = new Set((p.ccel_authors || []).concat([PROF]));
    names.forEach(n => {
      if (!n) return;
      const re = new RegExp('(^|[\\s,>])(' + esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[\\s,<]|$)', 'g');
      h = h.replace(re, '$1<b>$2</b>');
    });
    return h;
  }

  function ifText(p) {
    if (p.impact_factor == null) return '';
    const prov = p.if_provisional === true
      ? '<abbr class="prov" title="Provisional: the JCR value for this year is not released yet">prov.</abbr>' : '';
    return 'IF ' + esc(p.impact_factor) + prov;
  }

  const STATUS_LABEL = { published: 'Published', submitted: 'Submitted', 'in revision': 'In revision', accepted: 'Accepted', 'in press': 'In press' };

  // ---- covers: attach only when DOI / URL match, never by position ----
  const normUrl = u => decodeURIComponent(String(u || '')).toLowerCase()
    .replace(/^[a-z]+:\/\//, '').replace(/[#?].*$/, '').replace(/\/unauth$/, '').replace(/\/+$/, '');
  function coverMatches(c, p) {
    const pd = (p.doi || '').toLowerCase();
    if (c.doi && pd && c.doi.toLowerCase() === pd) return true;
    if (c.url && p.url && normUrl(c.url) === normUrl(p.url)) return true;
    if (pd && c.url) {
      const cu = normUrl(c.url);
      if (cu.includes(pd)) return true;
      const suffix = pd.slice(pd.indexOf('/') + 1);
      if (suffix.length >= 8 && cu.split('/').includes(suffix)) return true;
    }
    return false;
  }
  const coverCache = new Map();
  function coverFor(p, kind) {
    const key = p.no + '|' + (kind || '');
    if (!coverCache.has(key)) {
      coverCache.set(key, D.cover_publications.find(c => (!kind || c.kind === kind) && coverMatches(c, p)) || null);
    }
    return coverCache.get(key);
  }
  function paperForCover(c) { return D.publications.find(p => coverMatches(c, p)) || null; }

  function citation(p, opt) {
    opt = opt || {};
    const link = paperLink(p);
    const title = rich(p.title);
    const tags = [];
    if (opt.pin) tags.push('<span class="tag pin">Selected</span>');
    if (opt.highlightTag) tags.push('<span class="tag">Recent highlight</span>');
    if (opt.area && p.area && areaBy.has(p.area)) tags.push('<span class="tag area" title="' + esc(areaBy.get(p.area).title) + '">Area ' + esc(p.area) + '</span>');
    if (opt.areaLabel) tags.push('<span class="tag area">' + esc(opt.areaLabel) + '</span>');
    if (p.status && p.status !== 'published') tags.push('<span class="tag status">' + esc(STATUS_LABEL[p.status] || p.status) + '</span>');
    if (opt.coverTag) {
      const c = coverFor(p);
      if (c) tags.push('<a class="tag" href="' + esc(src(c.image)) + '">Cover art</a>');
    }
    const src_ = sourceText(p);
    let jr = esc(src_);
    if (p.journal && src_.startsWith(p.journal)) jr = '<span class="jr">' + esc(p.journal) + '</span>' + esc(src_.slice(p.journal.length));
    const bits = [jr];
    const it = ifText(p); if (it) bits.push(it);
    if (p.doi) bits.push('<a href="https://doi.org/' + esc(p.doi) + '">doi:' + esc(p.doi) + '</a>');
    else if (link) bits.push('<a href="' + esc(link) + '">Article</a>');
    const H = opt.h || 'h4';
    return '<article class="cite">' +
      (tags.length ? '<div class="tags">' + tags.join('') + '</div>' : '') +
      '<' + H + ' class="cite-title">' + (link ? '<a href="' + esc(link) + '">' + title + '</a>' : title) + '</' + H + '>' +
      '<p class="cite-authors">' + boldAuthors(p) + '</p>' +
      '<p class="cite-source">' + bits.join(' · ') + '</p>' +
      (p.highlight && opt.note !== false ? '<p class="cite-note">' + esc(p.highlight) + '</p>' : '') +
      '</article>';
  }

  // ---- people ----
  // Personal links as small icon links; only links that are set are rendered (null -> nothing, no empty row).
  // Inline SVG (24x24 grid, currentColor); GitHub / LinkedIn / Google Scholar marks after Simple Icons (CC0).
  const ICON = {
    github: '<path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3"/>',
    linkedin: '<path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>',
    cv: '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2.8H6.8A1.8 1.8 0 0 0 5 4.6v14.8a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V7.8z"/><path d="M14 2.8v5h5"/><path d="M8.6 12.6h6.8M8.6 16.4h6.8"/></g>',
    scholar: '<path fill="currentColor" d="M5.24 13.77 0 9.5 12 0l12 9.5-5.24 4.27A7.5 7.5 0 0 0 12 9.5a7.5 7.5 0 0 0-6.76 4.27zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/>',
    homepage: '<g fill="none" stroke="currentColor" stroke-width="2.1"><circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4M12 2.8c2.6 2.6 3.9 5.7 3.9 9.2s-1.3 6.6-3.9 9.2c-2.6-2.6-3.9-5.7-3.9-9.2S9.4 5.4 12 2.8z"/></g>'
  };
  const LINK_KEYS = [['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['scholar', 'Google Scholar'], ['cv', 'CV'], ['homepage', 'Homepage']];
  function linkIcons(links, who) {
    links = links || {};
    const set = LINK_KEYS.filter(([k]) => links[k]);
    if (!set.length) return '';
    return '<div class="link-icons">' + set.map(([k, label]) => {
      const name = esc(who + ' — ' + label);
      return '<a data-link="' + k + '" href="' + esc(safeUrl(links[k])) + '" target="_blank" rel="noopener" aria-label="' + name + '" title="' + name + '">' +
        '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">' + ICON[k] + '</svg></a>';
    }).join('') + '</div>';
  }
  // "Name (Chief of Lab)" -> name + note line; the text itself is shown unchanged
  function splitName(n) {
    const m = String(n).match(/^([^(]+?)\s*\((.+)\)\s*$/);
    return m ? { name: m[1], note: m[2] } : { name: n, note: '' };
  }
  function initials(n) { return splitName(n).name.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
  function photo(p, cls) {
    const nm = splitName(p.name).name;
    if (p.photo) return '<img class="person-photo ' + (cls || '') + '" src="' + esc(src(p.photo)) + '" alt="' + esc(nm) + '" loading="lazy" decoding="async" width="400" height="500">';
    return '<div class="person-photo empty ' + (cls || '') + '" role="img" aria-label="' + esc(nm) + '">' + esc(initials(p.name)) + '</div>';
  }
  const TYPE_LABEL = { computational: 'Computational', experimental: 'Experimental' };
  function typeBadge(t) { return t && TYPE_LABEL[t] ? '<span class="type ' + t + '">' + TYPE_LABEL[t] + '</span>' : ''; }

  const published = D.publications.filter(p => p.status === 'published');
  const stats = {
    published: published.length,
    firstYear: Math.min.apply(null, published.map(p => p.year).filter(Boolean)),
    lastYear: Math.max.apply(null, published.map(p => p.year).filter(Boolean)),
    members: D.members.reduce((n, g) => n + g.people.length, 0),
    alumni: D.alumni.reduce((n, g) => n + g.people.length, 0),
    areaCount: num => published.filter(p => p.area === num).length
  };

  // ---- page chrome: logo from data, mobile menu, compact bar ----
  function chrome(pageTitle) {
    document.title = (pageTitle ? pageTitle + ' · ' : '') + D.lab.short + ' · ' + D.lab.name;
    $$('img[data-logo]').forEach(im => { im.src = src(D.lab.logo); im.alt = D.lab.short + ' — ' + D.lab.name; });

    const header = $('.site-header');
    const bar = $('#bar');
    if (bar) {
      const mainNav = $('#site-nav ul');
      const barNav = $('.bar .site-nav ul');
      if (mainNav && barNav && !barNav.children.length) barNav.innerHTML = mainNav.innerHTML;
      if ('IntersectionObserver' in window && header) {
        new IntersectionObserver(es => {
          const on = !es[0].isIntersecting;
          bar.classList.toggle('is-on', on);
          bar.setAttribute('aria-hidden', on ? 'false' : 'true');
          if (!on) closeMenus();
        }).observe(header);
      }
    }
    function closeMenus() {
      $$('.site-nav.is-open').forEach(n => n.classList.remove('is-open'));
      $$('.nav-toggle').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
    $$('.nav-toggle').forEach(btn => {
      const nav = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', () => {
        const open = !nav.classList.contains('is-open');
        closeMenus();
        nav.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenus(); });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });

    // footer = contact block (the landing nav's "Contact" lands here: index.html#contact)
    const foot = $('#footer-body');
    if (foot) {
      const c = D.contact;
      const rows = [
        ['Email', c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : ''],
        ['Professor office', esc(c.professor_office)],
        ['Laboratory', esc(c.laboratory)],
        ['Student office', esc(c.student_office)]
      ].filter(r => r[1]);
      foot.innerHTML =
        '<div class="foot-grid">' +
          '<img class="ccel-logo" src="' + esc(src(D.lab.logo)) + '" alt="' + esc(D.lab.short + ' — ' + D.lab.name) + '" width="170" height="87" loading="lazy">' +
          '<div><h2 class="foot-title">Contact</h2><p class="foot-name">' + esc(c.lab_name || D.lab.name) + '</p>' +
          '<p>' + esc(c.address) + '</p></div>' +
          '<dl class="contact-list">' + rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('') + '</dl>' +
        '</div>' +
        '<div class="sponsors" aria-label="Research sponsors">' +
          D.research.sponsors.map(s => '<img src="' + esc(src(s)) + '" alt="Sponsor logo" loading="lazy" decoding="async">').join('') +
        '</div>' +
        '<p class="foot-small">Content last curated ' + esc(D.curation.updated_at || '') + ' · ' + esc(D.lab.affiliation) + '</p>';
    }
  }

  // Content is rendered after parse, so the browser's own jump to #hash can land on a half-built page.
  // Re-apply it once rendering (and font loading) has settled, unless the reader has already scrolled.
  function settleHash() {
    if (!location.hash) return;
    let moved = false;
    const mark = () => { moved = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(t => addEventListener(t, mark, { once: true, passive: true }));
    const go = () => {
      if (moved) return;
      let id = location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch (e) { /* keep raw */ }
      const t = document.getElementById(id);
      if (t) t.scrollIntoView({ block: 'start' });
    };
    requestAnimationFrame(go);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(go));
    addEventListener('load', () => requestAnimationFrame(go), { once: true });
  }

  window.Site = {
    D, SHARED, esc, rich, plain, src, safeUrl, $, $$, pubByNo, areas, areaBy, areaSummary, areaFirstSentence, journalLine, citation, coverFor,
    paperForCover, paperLink, sourceText, linkIcons, photo, splitName, typeBadge, stats, chrome, settleHash, STATUS_LABEL
  };
})();
