# Contact production preparation — manual gates; not deployed

## Completed preparation

The production default entry now uses directContactIngress and the real Resend
adapter through the existing HTTP boundary/orchestrator. Configuration remains
CONTACT_ENABLED=false, CONTACT_INGRESS_POLICY=unverified and routes=[]. Blank
public settings fail closed. SQLite binding/migration/global ID are unchanged.
No historical keys, CMS image storage, Images/R2, other Workers or legacy handlers
were changed. No prior automated/manual suite needs repeating.

## A. Current decision: Vercel website, separate Contact Worker

The website stays at https://evolve-vc.vercel.app. No website DNS migration,
CMS/image-storage change or Vercel API rewrite is required. Attachment mode keeps
posting to the unchanged Vercel /api/contact/ endpoint. Readable mode is an
explicit release choice; failures never downgrade automatically.

Public CONTACT_ENDPOINT may be an exact HTTPS workers.dev URL ending in
/api/contact/ (no credentials, port, query or fragment). Set the same value in
Worker vars and the readable frontend build. Empty preserves local same-origin
harness behavior. CORS permits ONLY https://evolve-vc.vercel.app; OPTIONS permits
POST with Content-Type, without credentials. POST validation and quotas remain
unchanged. CORS/Origin are not authentication or anti-bot controls.

### Documented workers.dev alternative: direct-workers-dev-v1

Zone WAF rules belong to customer zones; a rule on your domain cannot protect
Cloudflare's workers.dev zone. Do not attempt to reuse direct-zone-waf-v1 there.
Cloudflare's HTTP-header reference documents that CF-Worker is added to ALL
Worker fetch subrequests and is intended for receiving Workers to filter them.
The application-level policy rejects presence of that platform-added marker
(including empty values), the canonical cross-zone Worker IP
2a06:98c0:3600::103, and overwritten-IP markers. It also requires the exact
configured HTTPS endpoint, colo/TLS metadata and a valid CF-Connecting-IP.
Only after these checks does the existing boundary canonicalize and HMAC that IP.
X-Forwarded-For, X-Real-IP, Origin and CORS never authorize ingress or supply identity.
A browser sending a fake CF-Worker can only cause its request to be rejected.
This relies on Cloudflare's documented edge behavior, not on a cryptographic
signature in the header. Local mocks cannot prove edge behavior.

Service bindings are a DIFFERENT invocation path: the caller declares them and
they target Workers in the same account. Before selecting this policy, audit ALL
account Workers/configurations for incoming service bindings to this Worker and
remove/prohibit them. An empty services array on this Worker is not that audit.
Do not expose this handler through dispatch namespaces, proxies, alternate
entrypoints or untrusted account deployments. Restrict account/API deployment
permissions to trusted operators. If this account isolation cannot be confirmed,
STOP: leave the policy unverified and sending disabled. Runtime cannot audit it.

This policy identifies the network peer presented by Cloudflare, not a unique
human: VPNs, NATs and external proxies retain ordinary IP-rate-limit limitations.
Turnstile and the global budget remain necessary. It does not guarantee that a
request has never traversed a Worker somewhere behind an external proxy.
Cloudflare Access is documented for workers.dev but would add authentication to
the public contact flow; no public service token or Access bypass is appropriate.
No new service or paid WAF feature is required by this application-level policy.

References:
- https://developers.cloudflare.com/fundamentals/reference/http-headers/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/

## B. Resend Free and Turnstile setup (user action, not performed)

Resend > Domains > Add domain: use an approved sending subdomain such as
mail.evolvevcap.com. Add only the exact sending SPF, DKIM and return-path DNS
records Resend provides, DNS-only where required. Do not replace root MX/SPF or
enable inbound receiving. Wait for Verified. Select a fixed plain sender such as
website@mail.evolvevcap.com; recipient is fixed to contact@evolvevcap.com.
Disable tracking, confirm mailbox access and retention ownership. API Keys >
create Sending Access restricted to the sending domain; store as Worker secret.
Remain on Free, no add-ons/paid upgrades. Confirm current account quotas and other
senders; this application reserves at most 50/day and 1500/month, within the usual
100/day and 3000/month Free allowance. Limits are account-wide, not per API key.
Reference: https://resend.com/docs/dashboard/domains/introduction

Cloudflare > Turnstile > Add widget: Free managed widget, exact canonical hostname
only. The PUBLIC sitekey goes into frontend build settings. The secret goes only
into Worker secrets. Both sides use action contact_us. Do not publish test keys,
local shim, test Worker entry or localhost hostname in the production widget.

## C. Separate readable key and configuration (manual commands)

Run in a non-recorded terminal. These commands are instructions only. No real
keys were created during preparation. Create a protected folder OUTSIDE the repo;
stop on any error and never overwrite existing keys:

```powershell
Set-Location 'C:\Users\admin.DESKTOP-6CRR0IH.000\Desktop\EVC-Static-Website'
$env:EVC_CONTACT_SECRETS = Join-Path $env:LOCALAPPDATA 'EVC-Contact-Secrets'
New-Item -ItemType Directory -Path $env:EVC_CONTACT_SECRETS -ErrorAction Stop | Out-Null
$contactIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $env:EVC_CONTACT_SECRETS /inheritance:r /grant:r "${contactIdentity}:(OI)(CI)F"
node -e 'const fs=require("fs"),p=require("path"),c=require("crypto"),d=process.env.EVC_CONTACT_SECRETS;const k=c.generateKeyPairSync("rsa",{modulusLength:2048,publicExponent:65537}),kid="evc-readable-"+c.randomUUID();const j={...k.publicKey.export({format:"jwk"}),kid,alg:"RSA-OAEP-256",use:"enc",key_ops:["encrypt"]};for(const [n,v] of Object.entries({"readable-private.pem":k.privateKey.export({type:"pkcs8",format:"pem"}),"readable-public.txt":Buffer.from(JSON.stringify(j)).toString("base64"),"readable-kid.txt":kid,"visitor-hmac.txt":c.randomBytes(32).toString("hex")}))fs.writeFileSync(p.join(d,n),v,{flag:"wx"});'
```

Protect an offline backup and retain key-recovery ownership. Never import or read
the historical private key. Never put private material in frontend build settings,
tracked files or repo .env files. Keep the visitor HMAC key stable across releases.

Edit ONLY the vars in wrangler.contact-production.json with these public values:
- CONTACT_ORIGIN: https://evolve-vc.vercel.app (fixed browser allowlist).
- CONTACT_ENDPOINT: exact assigned HTTPS workers.dev /api/contact/ URL; blank until assigned.
- CONTACT_TURNSTILE_HOSTNAME: exact hostname; CONTACT_TURNSTILE_ACTION: contact_us.
- CONTACT_FROM: verified plain sender email; CONTACT_TO: contact@evolvevcap.com.
- CONTACT_READABLE_PUBLIC_JWK / CONTACT_READABLE_KID: new public files above.
- CONTACT_PUBLIC_JWK: existing legacy PUBLIC-only JWK, unchanged.
- CONTACT_DELIVERY_MODE: readable-orchestrated; quotas: 3/hour, 50/day, 1500/month.
- Keep CONTACT_ENABLED=false and CONTACT_INGRESS_POLICY=unverified initially.

No actual public-key values or secrets are included in this runbook.

## D. Cloud creation/deployment gate — requires explicit approval

Commands below create resources/deployments and are NOT authorized by preparation.
Verify the correct account and Free Workers plan. First deploy remains disabled
and unrouted; SQLite migration v1-contact-budget creates the budget namespace.

```powershell
npx --no-install wrangler login
npx --no-install wrangler deploy --config wrangler.contact-production.json
Get-Content -Raw (Join-Path $env:EVC_CONTACT_SECRETS 'readable-private.pem') | npx --no-install wrangler secret put CONTACT_READABLE_PRIVATE_KEY --config wrangler.contact-production.json
Get-Content -Raw (Join-Path $env:EVC_CONTACT_SECRETS 'visitor-hmac.txt') | npx --no-install wrangler secret put CONTACT_VISITOR_HASH_SECRET --config wrangler.contact-production.json
npx --no-install wrangler secret put RESEND_API_KEY --config wrangler.contact-production.json
npx --no-install wrangler secret put CONTACT_TURNSTILE_SECRET --config wrangler.contact-production.json
```

Use the interactive secret prompts or Worker Settings > Variables and Secrets >
Add > Secret. Never place literal secret values in command arguments. Secret
writes may create deployments. Do not use --env, rename the Worker, or recreate
its namespace/global ID during later releases. No Images/R2 bindings are needed.

After separate deployment approval and the account audit in A:
1. Retain the Worker name, SQLite binding/migration and fixed global budget ID.
2. Set CONTACT_ENDPOINT to the exact assigned production workers.dev URL plus
   /api/contact/. Keep CONTACT_ORIGIN=https://evolve-vc.vercel.app and
   CONTACT_TURNSTILE_HOSTNAME=evolve-vc.vercel.app.
3. Set CONTACT_INGRESS_POLICY=direct-workers-dev-v1, workers_dev=true,
   preview_urls=false, routes=[] and CONTACT_ENABLED=false. Deploy using the
   same wrangler deploy command above. No custom domain or Vercel rewrite.
4. Worker Settings > Domains & Routes: verify only the selected workers.dev
   production hostname is enabled; preview URLs remain disabled. Verify Free
   plan and account binding audit. Configure public values/secrets from B/C/D.
5. Keep the live Vercel site in attachment mode until the coordinated cutover.

These are future manual instructions only; tracked configuration stays disabled.

## Public Turnstile Site Key preparation (no activation)

In the Vercel project for evolve-vc.vercel.app, the public build environment
setting is CONTACT_TURNSTILE_SITEKEY (Production scope). Use only the PUBLIC
Site Key from the Turnstile widget configured for evolve-vc.vercel.app.
The actual production Site Key has not been supplied or verified in this preparation.
Do not substitute the Turnstile Secret Key or a synthetic/test Site Key.

Existing wiring needs no code change: tools/lib/site.mjs reads the build setting;
 tools/pages/misc.mjs emits data-turnstile-sitekey only in readable-orchestrated
mode; src/js/contact-turnstile.js renders the widget with action contact_us.
For local checks pass the public setting through the shell environment; the
current .env.local loader reads only the historical CONTACT_PUBLIC_JWK.

Keep the Vercel frontend in attachment mode (CONTACT_DELIVERY_MODE=attachment
or unset) and CONTACT_ENDPOINT unset until the real endpoint, verified ingress
and authoritative Vercel CSP are ready. Keep both existing public RSA keys and
the readable kid unchanged. Do not run the cutover commands below during preparation.
The Worker remains disabled/unverified, workers_dev=false, preview_urls=false,
and routes=[]. Never place the Turnstile Secret Key in frontend build settings.

## E. Frontend cutover and one real Contact test — separate approval

Use a separate shell containing ONLY public build settings, not Worker secrets:

```powershell
$contactConfig = Get-Content -Raw wrangler.contact-production.json | ConvertFrom-Json
$env:CONTACT_DELIVERY_MODE = 'readable-orchestrated'
$env:CONTACT_ENDPOINT = $contactConfig.vars.CONTACT_ENDPOINT
$env:CONTACT_PUBLIC_JWK = $contactConfig.vars.CONTACT_PUBLIC_JWK
$env:CONTACT_READABLE_PUBLIC_JWK = $contactConfig.vars.CONTACT_READABLE_PUBLIC_JWK
$env:CONTACT_READABLE_KID = $contactConfig.vars.CONTACT_READABLE_KID
$env:CONTACT_TURNSTILE_SITEKEY = Read-Host 'Production PUBLIC Turnstile sitekey'
npm run build
```

First preserve an immutable copy of the current attachment-mode site release.
Publish through the existing approved website workflow; no unverified hosting
command is supplied. Ensure the actual host applies generated CSP permitting
challenges.cloudflare.com script/frame origins and the EXACT configured Worker origin in connect-src. Vercel uses its own vercel.json headers; dist/_headers is not honored by
every host. If another header configuration is authoritative, its update is a
release prerequisite. No CMS or image-storage changes are needed.

### Controlled activation and exactly one synthetic message (future approval)

1. Finish A's audit, B's verified sender/Turnstile setup and C/D's secret/public
   configuration. Confirm free-plan headroom, backup and mailbox access. Keep
   production disabled until all prerequisites pass; no fake production bindings.
2. Prepare the Vercel readable release with the public build settings above.
   Apply the exact Worker connect-src and Turnstile script/frame CSP additions
   in Vercel's authoritative headers. Retain the attachment rollback release.
3. After explicit activation approval, set CONTACT_ENABLED=true in
   wrangler.contact-production.json and run:

       npx --no-install wrangler deploy --config wrangler.contact-production.json

   Publish the prepared readable Vercel release using the existing approved
   deployment workflow. No new Vercel project or website migration.
4. After separately approving ONE real email, open
   https://evolve-vc.vercel.app/contact-us/ in a fresh browser session. Complete
   Turnstile and required fields using synthetic details (e.g. Synthetic Test,
   visitor@example.test, message: Approved synthetic Contact integration test).
   Submit once. Do not refresh/resubmit on timeout, 409 or uncertain status.
5. Verify HTTP 202 with accepted=true AND receipt in contact@evolvevcap.com.
   Inspect HTML/logo and one provider record. An HTTP attempt alone is not success.
   On uncertainty, reconcile the provider record and budget before further action;
   never automatically retry or release the reservation.
6. End the controlled window: set CONTACT_ENABLED=false and redeploy; restore
   the retained Vercel attachment release unless continued activation is approved.
   Preserve the Durable Object, counters, keys and submission history.

No step above was executed during preparation.

Before ONE separately authorized real message, verify: ingress evidence,
verified domain/sender, secret provisioning, public/private key pairing, mailbox
access, privacy/processor disclosure, key backup, retained budget namespace,
account quota headroom and rollback owner. Use clearly synthetic enquiry details.
202 means provider acceptance plus durable confirmation, not final delivery.
Confirm mailbox receipt/rendering manually. Unknown outcome: do not resubmit or
refund capacity; reconcile provider acceptance first. No real email is authorized
by this preparation task.

## Explicit attachment rollback

Disable readable sends. Restore the previous attachment-mode frontend artifact
with CONTACT_DELIVERY_MODE=attachment and CONTACT_ENDPOINT unset. The Vercel
api/contact.js route remains unchanged and needs no routing restoration. Preserve old public key/offline private key, namespace and budget
history. Do not delete/recreate the Worker/DO as rollback. Cache expiry/reload is
required. If the legacy origin handler is unavailable, stop sending; do not invent
a fallback. Historical attachments do not depend on the new readable key.

## Remaining external blockers

No dashboard, DNS, WAF, billing or hosting state has been changed/verified here.
Runtime cannot audit incoming service bindings; unset the policy if account controls change. Free-tier
quotas and 10 ms CPU compliance need operational confirmation; local wall-clock
is not CPU evidence. The existing 35-day replay-retention boundary still applies.
Account audit, key provisioning, deployment, cutover and one real send are
user actions/approval gates. Preparation is complete; sending remains disabled.

## Cross-origin preparation checks

Only focused endpoint/CORS/disabled-ingress checks and in-memory bundling are
needed for this change; prior crypto, provider and browser suites are not repeated.
No endpoint was provisioned, key read/generated, email sent or deployment performed.
The authoritative Vercel CSP must be updated with the assigned exact endpoint
only at approved readable cutover; attachment deployment CSP stays unchanged.
