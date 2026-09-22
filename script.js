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

  var MAILBOX = 'TMLaw@aol.com';
  var PHONE = '(516) 727-2531';
  var ENDPOINT = 'https://api.web3forms.com/submit';

  /* ---- 1. Footer copyright year ---------------------------------------- */

  var yearSlot = document.getElementById('year');
  if (yearSlot) {
    yearSlot.textContent = String(new Date().getFullYear());
  }

  /* ---- 2. Practice-area disclosures: expanded on desktop ---------------

     Mobile keeps them collapsed (pure HTML â€” no script needed, so the
     scroll-length win survives with JS off). At >=960px there is room for
     everything, so they are opened ONCE on load.

     Deliberately no resize listener: after first paint the open/closed
     state belongs to the visitor, and reasserting it on every resize would
     re-open panels they just closed. */

  var wide = window.matchMedia && window.matchMedia('(min-width: 960px)');
  if (wide && wide.matches) {
    var panels = document.querySelectorAll('.practice-card__more');
    for (var i = 0; i < panels.length; i += 1) {
      panels[i].open = true;
    }
  }

  /* ---- 3. Consultation form -------------------------------------------- */

  var form = document.getElementById('consult-form');
  if (!form) {
    return;
  }

  var statusEl = document.getElementById('form-status');
  var submitBtn = document.getElementById('form-submit');
  var dialog = document.getElementById('confirm-dialog');
  var dialogClose = document.getElementById('confirm-close');
  var submitLabel = submitBtn ? submitBtn.querySelector('.btn__label') : null;
  var idleLabel = submitLabel ? submitLabel.textContent : '';

  function valueOf(id) {
    var field = document.getElementById(id);
    return field && typeof field.value === 'string' ? field.value.trim() : '';
  }

  /* ---- Confirmation dialog --------------------------------------------- */

  /* Native <dialog>.showModal() gives focus trapping, Escape-to-close, an
     inert background and top-layer stacking for free. If the browser is too
     old to support it, we degrade to the inline status message, which
     onSuccess() sets regardless -- so the visitor is never left without a
     confirmation. */
  function openConfirm() {
    if (!dialog || typeof dialog.showModal !== 'function') {
      return false;
    }
    try {
      dialog.showModal();
      return true;
    } catch (err) {
      return false;
    }
  }

  /* <dialog> normally restores focus to whatever was focused before it opened,
     but form.reset() runs first and breaks that chain -- focus ends up on
     <body>, which dumps a keyboard or screen-reader user at the top of the
     page with their place lost. Put it back on the submit button explicitly. */
  if (dialog) {
    dialog.addEventListener('close', function () {
      var target = submitBtn || form;
      if (target && typeof target.focus === 'function' &&
          document.body.contains(target)) {
        target.focus();
      }
    });
  }

  function closeConfirm() {
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  if (dialogClose) {
    dialogClose.addEventListener('click', closeConfirm);
  }

  /* Backdrop click closes. The ::backdrop is a pseudo-element, so clicks on it
     report the <dialog> itself as event.target -- and depending on how the
     dialog box is sized, clicks on its own padding do too. Anything inside the
     panel reports a descendant instead. So: bail if the target is not the
     dialog, then bounds-check against the PANEL rect. Testing the dialog's own
     rect is the classic bug -- it can span the viewport, which would swallow
     every click and close on inner clicks too. */
  if (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) {
        return;
      }
      var panel = dialog.querySelector('.confirm__panel');
      if (!panel) {
        closeConfirm();
        return;
      }
      var box = panel.getBoundingClientRect();
      var inside = event.clientX >= box.left && event.clientX <= box.right &&
                   event.clientY >= box.top && event.clientY <= box.bottom;
      if (!inside) {
        closeConfirm();
      }
    });
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

  /* Built from DOM nodes, never innerHTML â€” the text can carry
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
    /* The inline status is set FIRST and unconditionally: it is the fallback
       for browsers without <dialog> support, and it keeps the aria-live
       announcement working for screen readers regardless of the modal. */
    setStatus(null,
      'Thank you \u2014 your message is with me now. I will get back to you ' +
      'shortly. If it is urgent, call me at ' + PHONE + '.');
    openConfirm();
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
         json.message. Read defensively â€” never assume the shape. */
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
