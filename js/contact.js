/* CCEL candidate s2-chapters: Contact page, like the current Contact Us: the group photo, the lab name and the
   contact details, all from `contact`. No map and no form. */
(function () {
  'use strict';
  const S = window.Site, D = S.D, esc = S.esc, $ = S.$;
  S.chrome('Contact');
  const C = D.contact;
  const name = C.lab_name || D.lab.name;

  const img = $('#group-photo');
  if (C.group_photo) {
    img.src = S.src(C.group_photo);
    img.alt = D.lab.short + ' group photo';
  } else {
    img.closest('figure').hidden = true;
  }
  $('#contact-lab').textContent = name;
  const rows = [
    ['Address', esc(C.address || '')],
    ['Email', C.email ? '<a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a>' : ''],
    ['Professor office', esc(C.professor_office || '')],
    ['Laboratory', esc(C.laboratory || '')],
    ['Student office', esc(C.student_office || '')]
  ].filter(r => r[1]);
  $('#contact-dl').innerHTML = rows.map(r => '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>').join('');

  S.settleHash();
})();
