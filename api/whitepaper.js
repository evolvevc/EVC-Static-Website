import { handle, validWhitepaperHmac, validWhitepaperUrl, whitepaperMethodNotAllowed } from '../server/whitepaper.js';

// TEMPORARY: once per Production function module initialization, not per request.
// Never log configuration values or exception objects. No external service calls.
if (process.env.VERCEL_ENV === 'production') {
  try {
    const hmacValid = validWhitepaperHmac(process.env);
    const urlValid = validWhitepaperUrl(process.env);
    const hmac = process.env.WHITEPAPER_HMAC_SECRET;
    if (hmac === undefined || hmac === null || hmac === '') console.error('WP_STARTUP_HMAC_MISSING');
    else if (!hmacValid) console.error('WP_STARTUP_HMAC_MALFORMED');
    if (!urlValid) console.error('WP_STARTUP_URL_FORMAT_INVALID');
    if (hmacValid && urlValid) console.error('WP_STARTUP_CONFIG_FORMAT_VALID');
  } catch { /* Diagnostics must not affect request behavior. */ }
}

export default {fetch: request => {
  // A GET can initialize the module without invoking the submission handler.
  // Same generic status, body and headers as the existing method rejection.
  if (request.method !== 'POST') return whitepaperMethodNotAllowed();
  return handle(request, process.env);
}};
