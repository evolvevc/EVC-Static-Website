import {contactEndpoint} from './contact-endpoint.js';
import { contactToken } from './contact-turnstile.js';
/* Secure form handling.
   - Client-side validation, honeypot + minimum-fill-time bot checks
   - Optional end-to-end encryption: payload is sealed in the browser with AES-256-GCM, and the AES key is wrapped
     with the firm's RSA-OAEP public key (meta evolve:pubkey). Only the private key holder can read submissions.
   - Delivery to meta evolve:form-endpoint over HTTPS. No cookies. Readable Contact explicitly loads Cloudflare Turnstile. */

const meta = (n) => document.querySelector(`meta[name="evolve:${n}"]`)?.content || '';
const b64 = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export async function seal(payload, contactKey) {
  const pubB64 = contactKey ?? meta('pubkey');
  if (contactKey !== undefined && (!pubB64 || !globalThis.crypto?.subtle)) throw new Error('Encryption unavailable');
  if (!pubB64 || !crypto?.subtle) return { v: 1, enc: 'none', data: payload };
  const jwk = JSON.parse(atob(pubB64));
  const rsa = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(payload)));
  const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsa, await crypto.subtle.exportKey('raw', aes));
  return { v: 1, enc: 'RSA-OAEP-256+A256GCM', kid: jwk.kid || 'k1', k: b64(wrapped), iv: b64(iv), ct: b64(ct) };
}

function setError(field, msg) {
  const input = field.querySelector('input,select,textarea'); const err = field.querySelector('.err');
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) err.textContent = msg || '';
}
function validate(form) {
  let ok = true;
  form.querySelectorAll('.field').forEach((f) => {
    const i = f.querySelector('input,select,textarea'); if (!i || i.type === 'hidden') return;
    let msg = '';
    if (i.required && !i.value.trim() && i.type !== 'checkbox') msg = 'This field is required.';
    else if (i.type === 'checkbox' && i.required && !i.checked) msg = 'Please confirm to continue.';
    else if (i.type === 'email' && i.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value)) msg = 'Enter a valid email address.';
    else if (i.type === 'file' && i.files[0]) {
      const f0 = i.files[0];
      if (f0.size > MAX_FILE) msg = 'File is larger than 5 MB.'; else if (f0.type && !ALLOWED.includes(f0.type)) msg = 'Upload a PDF, PowerPoint or Word file.';
    }
    setError(f, msg); if (msg) ok = false;
  });
  return ok;
}

export async function contactAttempt(data, key) {
  const id = crypto.randomUUID();
  const sealed = await seal({ ...data, id }, key);
  return JSON.stringify({ ...sealed, id });
}

function wire(form) {
  const contact = form.dataset.secureForm === 'contact';
  const readable = contact && form.dataset.contactMode === 'readable-orchestrated';
  let attempt;
  let busy = false;
  if (contact) form.addEventListener('input', () => { attempt = undefined; });
  const status = form.querySelector('.form__status'); const started = Date.now();
  const say = (kind, text) => { status.className = 'form__status ' + (kind === 'ok' ? 'is-ok' : 'is-err'); status.textContent = text; status.setAttribute('role', 'status'); };
  const file = form.querySelector('input[type="file"]'); const drop = form.querySelector('.file-drop');
  if (file && drop) {
    const label = drop.querySelector('[data-file-label]');
    file.addEventListener('change', () => { label.textContent = file.files[0] ? file.files[0].name : 'Drop your pitch deck here or browse'; });
    ['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('is-over'); if (e === 'drop' && ev.dataTransfer.files[0]) { file.files = ev.dataTransfer.files; file.dispatchEvent(new Event('change')); } }));
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return; status.className = 'form__status';
    if (form.querySelector('.hp input')?.value) return; // honeypot
    if (!validate(form)) { say('err', 'Please fix the highlighted fields.'); form.querySelector('[aria-invalid="true"]')?.focus(); return; }
    if (Date.now() - started < 2500) { say('err', 'That was quick. Please review your details and submit again.'); return; }
    const btn = form.querySelector('button[type="submit"]'); const label = btn.textContent; busy = true; btn.disabled = true; btn.textContent = 'Sending securely…';
    let requestTimer;
    try {
      const data = { form: form.dataset.secureForm, page: location.pathname, at: new Date().toISOString(), fields: {} };
      new FormData(form).forEach((v, k) => { if (typeof v === 'string' && k !== 'website' && (!contact || k !== 'cf-turnstile-response')) data.fields[k] = v.slice(0, 5000); });
      if (file?.files[0]) { const f0 = file.files[0]; data.file = { name: f0.name.slice(0, 120), type: f0.type, size: f0.size, b64: b64(await f0.arrayBuffer()) }; }
      if (readable && (!form.dataset.contactKey || JSON.parse(atob(form.dataset.contactKey)).kid !== form.dataset.contactKid)) throw new Error('Encryption unavailable');
      const endpoint = contact ? (form.dataset.contactKey ? (readable ? contactEndpoint(form.dataset.contactEndpoint || '') : '/api/contact/') : '') : meta('form-endpoint');
      if (!endpoint) {
        const subject = encodeURIComponent('Website enquiry: ' + (form.dataset.secureForm || 'contact'));
        const body = encodeURIComponent(Object.entries(data.fields).map(([k, v]) => `${k}: ${v}`).join('\n'));
        if (contact) {
          location.href = `mailto:${meta('contact-email') || 'contact@evolvevcap.com'}?subject=${subject}`;
          say('ok', 'Your email app should open. Your form details have not been copied.');
          return;
        }
        location.href = `mailto:${meta('contact-email') || 'contact@evolvevcap.com'}?subject=${subject}&body=${body}`;
        say('ok', 'Your email app should open with your message. If it does not, write to ' + (meta('contact-email') || 'contact@evolvevcap.com') + '.');
      } else {
        let body;
        if (contact) {
          const fields = JSON.stringify(data.fields);
          if (attempt?.fields !== fields) attempt = { fields, body: await contactAttempt(data, form.dataset.contactKey) };
          if (readable && attempt.uncertain) { say('err', 'This enquiry may already have been accepted. Do not resubmit it; contact us to confirm.'); return; }
          body = readable ? JSON.stringify({envelope:JSON.parse(attempt.body),turnstileToken:await contactToken(form)}) : attempt.body;
        } else body = JSON.stringify(await seal(data));
        if (readable) attempt.uncertain = true;
        const controller = readable ? new AbortController() : null;
        if (controller) requestTimer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(endpoint, { ...(controller ? {signal:controller.signal} : {}), method: 'POST', headers: { 'Content-Type': 'application/json' }, body, credentials: 'omit', referrerPolicy: 'no-referrer', mode: contact && !(readable && endpoint.startsWith('https://')) ? 'same-origin' : 'cors', redirect: contact ? 'error' : 'follow' });
        if (readable && [400,403,413,415,429].includes(res.status)) attempt.uncertain = false;
        if (!res.ok || (contact && (res.status !== 202 || (await res.json()).accepted !== true))) throw new Error('HTTP ' + res.status);
        say('ok', form.dataset.success || 'Thank you. Your message was sent securely and our team will reply shortly.');
        attempt = undefined; form.reset(); if (file) form.querySelector('[data-file-label]').textContent = 'Drop your pitch deck here or browse';
        const dl = form.dataset.download; if (dl) { const a = document.createElement('a'); a.href = dl; a.rel = 'noopener'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }
      }
    } catch (err) {
      if (readable && attempt?.uncertain) { say('err', 'We could not confirm acceptance. Do not resubmit this enquiry; contact us to confirm.'); } else say('err', 'We could not send your message. Please try again, or email ' + (meta('contact-email') || 'contact@evolvevcap.com') + '.');
    } finally { clearTimeout(requestTimer); busy = false; btn.disabled = false; btn.textContent = label; }
  });
}

export function init() { document.querySelectorAll('form[data-secure-form]').forEach(wire); }
