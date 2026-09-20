/* Thomas M. McGovern, Attorney-at-Law
 *
 * This file does exactly two things:
 *   1. Stamps the current year into the footer copyright line.
 *   2. Intercepts the consultation form and composes a mailto: link from the
 *      field values, then hands off to the visitor's own email program.
 *
 * There is no backend. Nothing is transmitted from this page, so nothing here
 * ever claims a message was delivered. The sticky header, the mobile call bar
 * and the FAQ disclosures are pure HTML + CSS and need no script at all.
 */

(function () {
  'use strict';

  var MAILBOX = 'TMLaw714@aol.com';

  /* ---- 1. Footer copyright year ---------------------------------------- */

  var yearSlot = document.getElementById('year');
  if (yearSlot) {
    yearSlot.textContent = String(new Date().getFullYear());
  }

  /* ---- 2. mailto: composer --------------------------------------------- */

  var form = document.getElementById('consult-form');
  if (!form) {
    return;
  }

  function valueOf(id) {
    var field = document.getElementById(id);
    return field && typeof field.value === 'string' ? field.value.trim() : '';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var name = valueOf('f-name');
    var phone = valueOf('f-phone');
    var email = valueOf('f-email');
    var detail = valueOf('f-message');
    var place = valueOf('f-location');

    var subject = name
      ? 'Consultation request \u2014 ' + name
      : 'Consultation request';

    var lines = [];
    lines.push('Name: ' + name);
    lines.push('Phone: ' + phone);
    lines.push('Email: ' + email);
    if (place) {
      lines.push('Location: ' + place);
    }
    lines.push('');
    lines.push(detail);

    window.location.href = 'mailto:' + MAILBOX +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\r\n'));
  });
}());
