export function wireWhitepaper(form) {
  const status = form.querySelector('.form__status');
  const button = form.querySelector('button[type="submit"]');
  let busy = false, stopped = false;
  const say = (ok, text) => { status.className = 'form__status ' + (ok ? 'is-ok' : 'is-err'); status.textContent = text; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || stopped) return;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    if (fields.get('website')) return;
    busy = true; button.disabled = true;
    const label = button.textContent; button.textContent = 'Sending…';
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/whitepaper/', {method:'POST',mode:'same-origin',credentials:'omit',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fields.get('full-name'),company:fields.get('company') || '',email:fields.get('your-email'),resourceId:fields.get('resource'),consent:form.elements.consent.checked,website:fields.get('website') || ''})});
      const result = await response.json();
      if (response.status === 202 && result.state === 'accepted' && result.delivery?.visitor === 'submitted') {
        say(true, 'Your selected whitepaper has been submitted to our email service. Please check your inbox and spam folder.');
        stopped = true;
      } else if ([400,403,413,415].includes(response.status) && result.state === 'rejected') {
        say(false, 'We could not accept this request. Please check your details.');
      } else {
        stopped = true;
        say(false, 'We could not confirm delivery, or this request is already recorded. Please do not resubmit; contact evolvevc.2024@gmail.com for help.');
      }
    } catch {
      stopped = true;
      say(false, 'Delivery could not be confirmed. Please do not resubmit; contact evolvevc.2024@gmail.com for help.');
    } finally { clearTimeout(timer); busy = false; button.disabled = stopped; button.textContent = label; }
  });
}
