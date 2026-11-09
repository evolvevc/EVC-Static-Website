# Contact frontend: manual localhost testing

Run from this project only. The existing `dist/contact-us/index.html` and assets
are required. Do not run the normal build or load production environment files
for this test. The harness serves the existing design and current JS source,
patching only the Contact form in memory with a newly generated public key and
local verification widget. Keys, Worker bundle and credentials are never written
to disk. The server listens on 127.0.0.1:8787 only.

```powershell
Set-Location 'C:\Users\admin.DESKTOP-6CRR0IH.000\Desktop\EVC-Static-Website'
node tools/contact/browser-local.mjs
```

Open http://127.0.0.1:8787/contact-us/ (not localhost). Use synthetic visitor
information only. Wait at least 2.5 seconds, fill required fields and consent, then
submit. Expected: local simulator acceptance; no real email. Do not navigate to
external links or use unrelated forms in this harness. Stop with Ctrl+C before
starting another scenario. Restarting generates fresh keys and isolated storage;
reload the page after every restart.

```powershell
node tools/contact/browser-local.mjs --scenario=turnstile
node tools/contact/browser-local.mjs --scenario=wrong-key
node tools/contact/browser-local.mjs --scenario=rejection
node tools/contact/browser-local.mjs --scenario=timeout
node tools/contact/browser-local.mjs --scenario=conflict
node tools/contact/browser-local.mjs --attachment
```

Run one command at a time. Wrong-key fails in the browser before sending.
Turnstile rejection leaves the envelope available for an explicit retry with a
new token. Timeout, conflict and provider rejection conservatively block another
send of the unchanged enquiry on that page. Do not interpret this as delivery.
Attachment mode is independently selected and retains its original envelope;
it never becomes the fallback for a readable failure.

Production frontend mode is explicitly `CONTACT_DELIVERY_MODE=readable-orchestrated`.
Build inputs are public-only: distinct CONTACT_PUBLIC_JWK and
CONTACT_READABLE_PUBLIC_JWK, matching CONTACT_READABLE_KID, and
CONTACT_TURNSTILE_SITEKEY. The generated form pins the readable key. Attachment
mode remains the default. Readable mode loads the official explicit-render
Turnstile script, requests action contact_us, disables its hidden response field,
and sends a fresh token separately from encrypted visitor fields. The encrypted
envelope/id is preserved on unchanged retries. No automatic retries are added.

CSP adds the exact challenges.cloudflare.com script/frame origins only for the
readable build. The localhost harness instead allows only self scripts/connects,
loads a local test shim, and blocks all Worker outbound network. The production
frontend contains no local fake path, secret, private key or provider credential.
The test entry rewrites localhost requests to synthetic trusted metadata only
inside isolated workerd; it does not enable or change production ingress.

Automated checks:
```powershell
node --test tests/contact-frontend.test.mjs tests/contact-browser-local.test.mjs
node --test tests/contact-delivery.test.mjs
```

Production ingress remains disabled. Real Turnstile rendering, browser visual QA,
production routing/credentials, privacy review, actual delivery and Workers Free
CPU compliance remain unverified. No deployed configuration or live endpoint has
changed. The current manual harness is preparation for browser testing, not a
production deployment command.
