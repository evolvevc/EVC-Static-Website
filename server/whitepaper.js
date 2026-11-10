import { createHmac, randomUUID } from 'node:crypto';
import { WHITEPAPERS } from './whitepaper-catalogue.js';

export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(k => !['name','company','email','resourceId','consent','website'].includes(k))) throw Error('Invalid');
  const clean = (v, max, optional = false) => {
    if (optional && v === undefined) return '';
    if (typeof v !== 'string' || v.length > max || /[\u0000-\u001f\u007f<>]/.test(v) || (!optional && !v.trim())) throw Error('Invalid');
    return v.trim();
  };
  const name = clean(data.name, 100), company = clean(data.company, 150, true), email = clean(data.email, 254).toLowerCase();
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(email) || email.split('@')[0].length > 64 || (typeof data.resourceId !== 'string' || !Object.hasOwn(WHITEPAPERS, data.resourceId)) || data.consent !== true || (data.website !== undefined && data.website !== '')) throw Error('Invalid');
  return {name, company, email, resourceId:data.resourceId, consent:true};
}

export function sign(payload, secret, timestamp = Date.now(), requestId = randomUUID()) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(`whitepaper-v1\n${timestamp}\n${requestId}\n${body}`).digest('hex');
  return {timestamp, requestId, body, signature};
}

// Fixed codes only: never pass request, configuration, or exception data to logs.
const diagnostic = code => { try { console.error(code); } catch {} };
const reply = (status, state, delivery) => Response.json({state, ...(delivery ? {delivery} : {})}, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handle(req, env, send = fetch) {
  if (req.method !== 'POST') return reply(405, 'rejected');
  if (!/^https:\/\/[^/]+$/.test(env.WHITEPAPER_ORIGIN || '') || req.headers.get('origin') !== env.WHITEPAPER_ORIGIN || new URL(req.url).origin !== env.WHITEPAPER_ORIGIN || (req.headers.get('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin')) return reply(403, 'rejected');
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers.get('content-type') || '')) return reply(415, 'rejected');
  if (Number(req.headers.get('content-length')) > 4096) return reply(413, 'rejected');
  let payload;
  try {
    const reader = req.body?.getReader(); if (!reader) throw Error();
    const chunks = []; let size = 0;
    for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); return reply(413, 'rejected'); } chunks.push(value); }
    payload = validate(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch { return reply(400, 'rejected'); }
  if (!/^[a-f0-9]{64}$/i.test(env.WHITEPAPER_HMAC_SECRET || '')) {
    diagnostic('WP_HMAC_FORMAT_INVALID'); return reply(503, 'unavailable');
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.WHITEPAPER_APPS_SCRIPT_URL || '')) {
    diagnostic('WP_URL_FORMAT_INVALID'); return reply(503, 'unavailable');
  }
  let failureCode = 'WP_RUNTIME_EXCEPTION';
  try {
    const envelope = sign(payload, env.WHITEPAPER_HMAC_SECRET);
    // ContentService returns a redirect to Google's response host. Fetch performs no POST retries.
    const url = env.WHITEPAPER_APPS_SCRIPT_URL;
    const options = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),redirect:'follow',signal:AbortSignal.timeout(20000)};
    failureCode = 'WP_UPSTREAM_TRANSPORT_FAILURE';
    const result = await send(url, options);
    failureCode = 'WP_UPSTREAM_RESPONSE_FAILURE';
    if (!result.ok) { diagnostic('WP_UPSTREAM_RESPONSE_FAILURE'); return reply(503, 'uncertain'); }
    const output = await result.json();
    if (output.requestId !== envelope.requestId) { diagnostic('WP_UPSTREAM_RESPONSE_FAILURE'); return reply(503, 'uncertain'); }
    if (output.state === 'accepted' && ['submitted','unknown','not_attempted'].includes(output.admin) && ['submitted','unknown','not_attempted'].includes(output.visitor)) return reply(202, 'accepted', {admin:output.admin,visitor:output.visitor});
    if (['duplicate','limited','unavailable','rejected'].includes(output.state)) {
      if (output.state === 'unavailable' || output.state === 'rejected') diagnostic('WP_UPSTREAM_RESPONSE_FAILURE');
      return reply(output.state === 'limited' ? 429 : output.state === 'duplicate' ? 409 : 503, output.state);
    }
    diagnostic('WP_UPSTREAM_RESPONSE_FAILURE');
    return reply(503, 'uncertain');
  } catch { diagnostic(failureCode); return reply(503, 'uncertain'); }
}
