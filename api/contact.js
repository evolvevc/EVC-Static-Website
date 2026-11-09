import {demoAuthorized,claimDemo} from '../server/contact-demo.js';
import { envelope, limit } from '../server/envelope.js';

import { contactKeys } from '../server/contact-mode.js';
import { decryptContact } from '../server/contact-payload.js';
import { contactEmail } from '../server/contact-email.js';

const response = status => Response.json({accepted:status === 202}, {status, headers:{'Cache-Control':'no-store'}});
async function read(req) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks = [];
  let size = 0;
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new RangeError(); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function recipient(req, env) {
  // Server-only opt-in. Production always retains the ordinary recipient path.
  if (env.CONTACT_PREVIEW_GMAIL_TEST !== undefined &&
      env.VERCEL_ENV !== 'production' && env.VERCEL_TARGET_ENV !== 'production') {
    if (env.CONTACT_PREVIEW_GMAIL_TEST !== '1' || env.VERCEL !== '1' ||
        env.VERCEL_ENV !== 'preview' ||
        (env.VERCEL_TARGET_ENV !== undefined && env.VERCEL_TARGET_ENV !== 'preview') ||
        typeof env.VERCEL_DEPLOYMENT_ID !== 'string' || !env.VERCEL_DEPLOYMENT_ID.trim() ||
        env.CONTACT_LOCAL_ACCOUNT_TEST !== undefined ||
        (env.CONTACT_DELIVERY_MODE ?? 'attachment') !== 'attachment') return null;
    try {
      const origin = new URL(env.CONTACT_ORIGIN);
      if (origin.protocol !== 'https:' || origin.origin !== env.CONTACT_ORIGIN ||
          origin.hostname !== env.VERCEL_URL || !origin.hostname.endsWith('.vercel.app') ||
          origin.port || new URL(req.url).origin !== origin.origin) return null;
    } catch { return null; }
    return 'evolvevc.2024@gmail.com';
  }
  if (env.CONTACT_LOCAL_ACCOUNT_TEST === undefined) {
    // Resend's testing sender must not serve the unrestricted public form.
    // Only the explicit Preview guard above or loopback guard below may use it.
    if (/onboarding@resend\.dev/i.test(env.CONTACT_FROM)) return null;
    return 'evolvevc.2024@gmail.com';
  }

  // This opt-in is intentionally exclusive to the Windows loopback dev setup.
  // process.platform cannot be changed by a hosted Function environment variable.
  const local = 'http://127.0.0.1:3000';
  if (process.platform !== 'win32' || env.CONTACT_LOCAL_ACCOUNT_TEST !== '1' ||
      env.VERCEL_DEPLOYMENT_ID || env.AWS_LAMBDA_FUNCTION_NAME ||
      (env.VERCEL_ENV && env.VERCEL_ENV !== 'development') ||
      (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'development') ||
      env.CONTACT_FROM !== 'onboarding@resend.dev' || env.CONTACT_ORIGIN !== local ||
      req.headers.get('origin') !== local || req.headers.get('host') !== '127.0.0.1:3000') return null;
  return 'evolvevc.2024@gmail.com';
}

// The production adapter always uses the fixed Resend URL. Tests inject a loopback transport.
export async function handle(req, env, send = fetch, kms, claimNetwork = fetch) {
  if (req.method !== 'POST') return response(405);
  if (!env.CONTACT_ORIGIN || !env.CONTACT_PUBLIC_JWK || !env.RESEND_API_KEY || !env.CONTACT_FROM) return response(503);
  if (req.headers.get('origin') !== env.CONTACT_ORIGIN) return response(403);
  const demo=env.CONTACT_DEMO_ENABLED!==undefined;
  if(demo && !await demoAuthorized(req,env))return response(403);
  const mailbox = demo ? 'evolvevc.2024@gmail.com' : recipient(req, env);
  if (!mailbox) return response(403);
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return response(415);
  if (Number(req.headers.get('content-length')) > limit) return response(413);
  let keys;
  try { keys = contactKeys(env); } catch { return response(503); }
  let item;
  let readable = false;
  try {
    const input = await read(req);
    readable = Boolean(keys.readable && input.kid === keys.readable.kid);
    item = envelope(input, readable ? keys.readable : keys.attachment);
  }
  catch (error) { return response(error instanceof RangeError ? 413 : 400); }
  let mail;
  if (readable) {
    // The deployed entry point supplies neither a KMS nor a fake transport.
    if (!kms || send === fetch) return response(503);
    let fields;
    try {
      fields = await decryptContact(item,keys.readable,kms);
      // Single-line labels and multiline visitor text must remain safe in both MIME parts.
      const controls = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
      for (const [name,value] of Object.entries(fields)) {
        const visible = name === 'message' ? value.replace(/[\r\n\t]/g,'') : value;
        if (controls.test(visible)) return response(400);
      }
    } catch (error) { return response(error.code === 'KMS_UNAVAILABLE' ? 503 : 400); }
    try { mail = contactEmail(fields,item.id); } catch { return response(503); }
  } else {
    mail = {subject:'Encrypted website enquiry',
      text:'Open the attached encrypted enquiry using the EVC offline reader.',
      attachments:[{filename:'contact.json', content:Buffer.from(JSON.stringify(item)).toString('base64')}]};
  }
  // Claim once before sending. Unknown outcomes consume the grant permanently.
  if(demo && !await claimDemo(env,claimNetwork))return response(403);
  try {
    const result = await send('https://api.resend.com/emails', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(10000),
      headers:{Authorization:'Bearer ' + env.RESEND_API_KEY, 'Content-Type':'application/json', 'Idempotency-Key':'contact/' + item.id},
      body:JSON.stringify({from:env.CONTACT_FROM, to:[mailbox], ...mail})
    });
    if (!result.ok) return response(result.status === 429 ? 429 : 502);
    const receipt = await result.json();
    return response(typeof receipt.id === 'string' && receipt.id.length > 0 ? 202 : 502);
  } catch { return response(503); }
}

export default {fetch: request => handle(request, process.env)};
