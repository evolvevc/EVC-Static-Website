# Local Contact Worker boundary (disabled by default)

`workers/contact-local.js` accepts only POST `/api/contact/`. JSON is exactly the
existing orchestration shape `{ envelope, turnstileToken }`, limited to 256 KiB.
The exact `CONTACT_ORIGIN` is a singleton allowlist. Origin is not authentication
and does not replace Turnstile. Responses contain only `{ accepted: boolean }`,
with no-store, nosniff, CSP, frame and referrer protections.

The default export has no verification transport, email transport or ingress
attestor. It returns 503 for otherwise eligible requests, even if environment
settings contain test flags. It cannot send emails. Do not treat this as a
production-ready endpoint.

## Trust boundary

A future caller must establish direct Cloudflare ingress using deployment and
routing controls and supply a code-owned `attestIngress(request)` callback.
Neither `request.cf` nor any HTTP header alone proves this. The resolver requires
both the attestation and `request.cf`, rejects requests marked `CF-Worker`, and
then validates and canonicalizes `CF-Connecting-IP`. It never reads
`X-Forwarded-For`, `X-Real-IP`, or JSON identity fields. Untrusted worker/proxy
subrequests and local clients must fail closed. Pseudo IPv4 and any upstream
Worker routing require explicit review before enabling a real ingress attestor.
No production attestor is supplied here.

## Durable Object and configuration

`wrangler.contact-local.json` has loopback development settings, no routes,
workers.dev disabled, preview URLs disabled, and no variables or credentials.
It binds `CONTACT_BUDGET` to `ContactBudget` and declares `new_sqlite_classes` in
migration `v1-contact-budget`. Existing `contactBudget()` always selects
`evc-contact-global-budget-v1`. No visitor-specific budget objects are used.
Do not deploy this configuration. No cloud migrations have been performed.

## Offline verification

Run `node --test tests/contact-http.worker.test.mjs`.
The test uses local workerd, isolated SQLite storage and ephemeral keys in memory.
It bundles the existing PNG locally and blocks all outbound network requests.
Only `tests/contact-http.worker.mjs` contains fake transports and test controls.
That file is not referenced by Wrangler's main entry. Synthetic ingress metadata
and header overrides exist only in that test entry to bypass local HTTP header
normalization. Never route public traffic to the test entry.

Required bindings for an injected instance are `CONTACT_BUDGET` plus the existing
readable key, origin, sender, hashing, Turnstile and Resend settings checked by the
entry and orchestrator. Real credentials have not been loaded or configured.
No browser, legacy endpoint or attachment behavior is changed. A 202 means
verified provider acceptance and durable confirmation, not mailbox delivery.
CPU time is not measured by this harness; Workers Free 10 ms compliance is unverified.
