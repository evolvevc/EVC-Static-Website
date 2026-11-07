// Server-only Siteverify adapter. Pass the token separately from encrypted fields.
const endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const responseLimit = 8192;
export function contactTurnstile(env, {fetch: send = globalThis.fetch, timeoutMs = 5000} = {}) {
  const secret = env?.CONTACT_TURNSTILE_SECRET;
  const hostname = env?.CONTACT_TURNSTILE_HOSTNAME;
  const action = env?.CONTACT_TURNSTILE_ACTION;
  const configured = typeof secret === 'string' && secret.trim().length > 0 && secret.length <= 2048 &&
    typeof hostname === 'string' && hostname.length <= 253 && /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(hostname) &&
    typeof action === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(action) &&
    typeof send === 'function' && Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 5000;
  return Object.freeze({
    async verify(token) {
      if (!configured || typeof token !== 'string' || !token.trim() || token.length > 2048) return false;
      const body = JSON.stringify({secret,response:token});
      if (new TextEncoder().encode(body).byteLength > 32768) return false;
      const controller = new AbortController();
      let reader, timer;
      const cancel = () => { if (reader) void reader.cancel().catch(() => {}); };
      const deadline = new Promise(resolve => {
        timer = setTimeout(() => { controller.abort(); cancel(); resolve(false); },timeoutMs);
      });
      const verification = (async () => {
        try {
          const response = await send(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
            body,redirect:'error',signal:controller.signal});
          if (controller.signal.aborted) { void response.body?.cancel().catch(() => {}); return false; }
          reader = response.body?.getReader();
          if (response.status !== 200 || !reader || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' ||
              Number(response.headers.get('content-length')) > responseLimit) return false;
          const chunks = []; let size = 0;
          for (;;) {
            const {done,value} = await reader.read();
            if (controller.signal.aborted) return false;
            if (done) break;
            size += value.byteLength;
            if (size > responseLimit) return false;
            chunks.push(value);
          }
          const bytes = new Uint8Array(size); let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
          const result = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
          return result !== null && typeof result === 'object' && !Array.isArray(result) &&
            result.success === true && result.hostname === hostname && result.action === action &&
            (result['error-codes'] === undefined || (Array.isArray(result['error-codes']) && result['error-codes'].length === 0));
        } catch { return false; }
        finally { cancel(); }
      })();
      try { return await Promise.race([verification,deadline]); }
      finally { clearTimeout(timer); }
    }
  });
}
