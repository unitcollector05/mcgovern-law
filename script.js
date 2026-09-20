/* Thomas M. McGovern, Attorney-at-Law
 *
 * This file does exactly two things:
 *   1. Stamps the current year into the footer copyright line.
 *   2. Submits the consultation form to Web3Forms and honestly reports what
 *      happened, falling back to a mailto: compose if the POST fails.
 *
 * The sticky header, the mobile call bar and the FAQ disclosures are pure
 * HTML + CSS and need no script at all.
 *
 * Deliberately ES5-flavoured: no async/await, no optional chaining, no arrow
 * functions. This runs from whatever browser an anxious sixty-five-year-old
 * already has open.
 */

(function () {
  'use strict';

  var MAILBOX = 'TMLaw714@aol.com';
  var PHONE = '(516) 727-2531';
  var ENDPOINT = 'https://api.web3forms.com/submit';

  /* ---- 1. Footer copyright year ---------------------------------------- */

  var yearSlot = document.getElementById('year');
  if (yearSlot) {
    yearSlot.textContent = String(new Date().getFullYear());
  }

  /* ---- 2. Consultation form -------------------------------------------- */

  var form = document.getElementById('consult-form');
  if (!form) {
    return;
  }

  var statusEl = document.getElementById('form-status');
  var submitBtn = document.getElementById('form-submit');
  var submitLabel = submitBtn ? submitBtn.querySelector('.btn__label') : null;
  var idleLabel = submitLabel ? submitLabel.textContent : '';

  function valueOf(id) {
    var field = document.getElementById(id);
    return field && typeof field.value === 'string' ? field.value.trim() : '';
  }

  /* The mailto: this page used before it had a backend. Still the fallback
     when the POST fails, so nobody is left with nowhere to go. */
  function mailtoHref() {
    var name = valueOf('f-name');
    var place = valueOf('f-location');
    var lines = [];
    lines.push('Name: ' + name);
    lines.push('Phone: ' + valueOf('f-phone'));
    lines.push('Email: ' + valueOf('f-email'));
    if (place) {
      lines.push('Location: ' + place);
    }
    lines.push('');
    lines.push(valueOf('f-message'));

    var subject = name
      ? 'Consultation request \u2014 ' + name
      : 'Consultation request';

    return 'mailto:' + MAILBOX +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\r\n'));
  }

  /* Built from DOM nodes, never innerHTML — the text can carry
     visitor-supplied values and this keeps them inert. */
  function setStatus(state, text, link) {
    if (!statusEl) {
      return;
    }
    while (statusEl.firstChild) {
      statusEl.removeChild(statusEl.firstChild);
    }
    statusEl.classList.remove('is-pending', 'is-error');
    if (state) {
      statusEl.classList.add(state);
    }
    statusEl.appendChild(document.createTextNode(text));
    if (link) {
      /* .form__status is a flex column, so the anchor lands on its own line
         and can carry a real 44px tap target without disrupting the prose. */
      var anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.text;
      statusEl.appendChild(anchor);
    }
  }

  function setBusy(busy) {
    if (submitBtn) {
      submitBtn.disabled = busy;
    }
    if (submitLabel) {
      submitLabel.textContent = busy ? 'Sending\u2026' : idleLabel;
    }
  }

  function onSuccess() {
    form.reset();
    setBusy(false);
    setStatus(null,
      'Thank you \u2014 your message is with me now. I will get back to you ' +
      'shortly. If it is urgent, call me at ' + PHONE + '.');
  }

  function onFailure(detail) {
    setBusy(false);
    setStatus('is-error',
      'That did not go through' + (detail ? ' (' + detail + ')' : '') +
      '. Nothing has been sent. Call me at ' + PHONE + ', email me at ' +
      MAILBOX + ', or use the link below \u2014 your message is still in the ' +
      'form, so nothing is lost.',
      { href: mailtoHref(), text: 'Open this in your email app instead' });

    /* NOTE: this function deliberately does NOT navigate anywhere.
       It used to do `window.location.href = mailtoHref()`, which launched
       Outlook / Mail unprompted and threw the visitor out of the browser
       mid-task. The composed mailto: is now only ever the href of the
       anchor above, which the visitor may click or ignore.
       DO NOT reintroduce a programmatic mailto: navigation. */
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var payload = {};
    var data = new FormData(form);
    data.forEach(function (value, key) {
      payload[key] = value;
    });

    setBusy(true);
    setStatus('is-pending', 'Sending your message\u2026');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(function (json) {
        return { ok: response.ok, status: response.status, json: json };
      }, function () {
        return { ok: response.ok, status: response.status, json: null };
      });
    }).then(function (result) {
      if (result.ok && result.json && result.json.success === true) {
        onSuccess();
        return;
      }
      /* Web3Forms puts 400 messages at json.body.message and 429 at
         json.message. Read defensively — never assume the shape. */
      var detail = '';
      if (result.json) {
        if (result.json.body && result.json.body.message) {
          detail = String(result.json.body.message);
        } else if (result.json.message) {
          detail = String(result.json.message);
        }
      }
      if (!detail) {
        detail = 'error ' + result.status;
      }
      onFailure(detail);
    })['catch'](function () {
      onFailure('no connection');
    });
  });
}());
