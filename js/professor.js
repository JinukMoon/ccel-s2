/* CCEL candidate s2-chapters: Professor page. The professor only, and only what the current CCEL Professor page
   (source/prof.html) shows (user rule 2026-10-26): photo, name, position, role, department and university, address,
   email, Google Citation and Curriculum Vitae links, then Education, Experience and the service lines from the
   structured `professor.education` / `experience` / `service`. No office, phone, bio, counts or extra links. */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$;
  S.chrome('Professor');
  const P = D.professor, C = D.contact;
  const edu = P.education || [], exp = P.experience || [], svc = P.service || [];

  // ---------- profile ----------
  // "Jeong Woo Han, Ph.D.": the name plus the doctorate listed in professor.education
  const phd = edu.find(e => /^Ph\.?\s?D\.?$/i.test(String(e.degree || '').trim()));
  $('#prof-name').textContent = P.name + (phd ? ', ' + phd.degree : '');
  $('#prof-photo').src = S.src(P.photo);
  $('#prof-photo').alt = P.name;
  // title "Professor, Department of ..., Seoul National University" -> position line(s), then the affiliation lines
  const titleParts = String(P.title || '').split(/\s*,\s*/).filter(Boolean);
  $('#prof-pos').innerHTML = [titleParts[0]].concat(P.roles || []).filter(Boolean).map(t => '<li>' + esc(t) + '</li>').join('');
  $('#prof-affil').innerHTML = titleParts.slice(1).map(t => '<li>' + esc(t) + '</li>').join('');
  // address line: the contact address minus the department and university already shown above
  const addr = String(C.address || '').split(/\s*,\s*/);
  while (addr.length > 1 && titleParts.slice(1).includes(addr[0])) addr.shift();
  $('#prof-contact').innerHTML =
    (addr.join('') ? '<p>' + esc(addr.join(', ')) + '</p>' : '') +
    (P.email ? '<p>Contact: <a href="mailto:' + esc(P.email) + '">' + esc(P.email) + '</a></p>' : '');
  const L = P.links || {};
  $('#prof-links').innerHTML =
    (L.google_scholar ? '<a class="btn-link" href="' + esc(S.safeUrl(L.google_scholar)) + '" target="_blank" rel="noopener">' + S.icon('scholar', 18) + 'Google Citation</a>' : '') +
    (L.cv ? '<a class="btn-link" href="' + esc(S.src(L.cv)) + '" target="_blank" rel="noopener">' + S.icon('cv', 18) + 'Curriculum Vitae</a>' : '');

  // ---------- education, experience, service ----------
  const period = t => esc(String(t || '').replace(/\s+-\s+/g, ' – '));
  const org = (name, loc) => '<h3 class="cv-org">' + esc(name) + (loc ? '<span class="cv-loc">, ' + esc(loc) + '</span>' : '') + '</h3>';
  const row = (text, when, notes) => '<li><span class="cv-role">' + text + '</span><span class="cv-date">' + period(when) + '</span>' +
    (notes || []).map(n => '<span class="cv-note">' + n + '</span>').join('') + '</li>';

  $('#edu-list').innerHTML = edu.map(e => '<li>' + org(e.institution, e.location) + '<ul class="cv-roles">' +
    row(esc(e.degree) + ', ' + (e.honors ? '(' + esc(e.honors) + ') ' : '') + esc(e.field || ''), e.date, [
      e.thesis ? '“' + esc(e.thesis) + '”' : '',
      e.advisor ? 'Advisor: ' + esc(e.advisor) : ''
    ].filter(Boolean)) + '</ul></li>').join('');

  $('#exp-list').innerHTML = exp.map(x => '<li>' + org(x.institution, x.location) + '<ul class="cv-roles">' +
    (x.roles || []).map(r => row(esc(r.title) + (r.unit ? ', ' + esc(r.unit) : ''), r.period)).join('') + '</ul></li>').join('');

  $('#service-list').innerHTML = svc.map(v => row('<b>' + esc(v.title) + '</b>, ' + esc(v.organization), v.period)).join('');

  if (!edu.length) $('#education').hidden = true;
  if (!svc.length) $('#service').hidden = true;
  if (!exp.length && !svc.length) $('#experience').hidden = true;

  S.settleHash();
})();
