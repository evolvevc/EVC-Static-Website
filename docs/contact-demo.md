# One-use production attachment demo (unarmed)

No configuration, secrets, routing, grants or deployments are changed by this code.
The existing Vercel attachment flow sends to fixed evolvevc.2024@gmail.com; the
exception for onboarding@resend.dev requires all demo authorization gates.

Future separately authorized setup:
- Generate two independent random 32-byte base64url tokens privately: operator and
  Vercel-to-Worker bridge. Never put them in URLs, source, logs or chat.
- Both services: CONTACT_DEMO_ENABLED=1, CONTACT_DEMO_TOKEN_SHA256=operator token
  lowercase SHA-256 hex, CONTACT_DEMO_UNTIL=absolute ISO expiry (maximum 30 minutes).
- Vercel only: CONTACT_DEMO_BRIDGE_TOKEN=raw bridge token. Retain existing Resend key
  and historical RSA public key; use CONTACT_FROM=onboarding@resend.dev and
  CONTACT_ORIGIN=https://evolve-vc.vercel.app. Mode absent or attachment. Remove
  Preview/local testing flags from Production. Require Vercel production markers.
- Worker only: CONTACT_DEMO_BRIDGE_SHA256=bridge token lowercase SHA-256 hex.
  CONTACT_ENABLED remains false; CONTACT_INGRESS_POLICY remains unverified.
  Existing binding, namespace, migration and global budget ID remain unchanged.

The separate POST /api/contact-demo/claim/ endpoint accepts only the exact existing
workers.dev URL pinned in server/contact-demo.js. It authenticates the bridge,
checks operator hash and expiry, then calls the existing Durable Object. It never
sends mail or decrypts contact data. No CORS allowance or browser access is needed.
Vercel sends only the bridge credential and operator hash, never enquiry fields.

Explicitly setting both services' demo settings arms the first claim; there is no
public arm/reset endpoint. The DO independently checks its own armed configuration.
It transactionally inserts one permanent singleton into contact_demo_once before
returning success. It never deletes or resets that row; normal 35-day budget cleanup
does not touch it. Changing tokens, request IDs or deployment does not replenish it.
Keep the namespace and storage: deleting/restoring storage invalidates this guarantee.
Missing settings, wrong credentials, expiry, duplicate claims, storage failures and
uncertain claim responses fail closed. Provider failures/timeouts consume the grant.
There is no automatic retry. This permits at most one provider attempt, not guaranteed
mailbox delivery. Code-only tests use local SQLite and intercepted mail.

Minimal future deployment sequence (not authorized by implementation):
1. Deploy Worker changes unarmed, retaining all production settings/secrets. Then
   separately enable only its workers.dev hostname for the authorization endpoint;
   previews remain false, routes remain empty, readable Contact remains disabled.
2. Deploy Vercel changes unarmed. Configure short-lived matching demo settings and
   credentials in an approved coordinated window. Verify Gmail is the account's
   permitted Resend testing recipient. This is not ordinary public email activation.
3. In a private browser tab at https://evolve-vc.vercel.app/contact-us/, the operator
   manually sets sessionStorage key evc-contact-demo-token to the raw operator token
   via developer tools. Do not use a URL parameter. Enter synthetic fields and consent.
   Submit once. The browser deletes its token before the request. Same-origin scripts
   can read sessionStorage, so protect the tab and do not paste untrusted scripts.
4. Reconcile Resend acceptance and Gmail receipt; never retry uncertain outcomes.
5. Disable demo settings on both services and workers.dev routing. Retain the spent
   DO row and existing namespace. Remove/revoke temporary bridge/operator credentials.
   Restore a verified sender before ordinary public delivery; onboarding stays blocked
   when the restricted demo is off. Old deployments must also remain expired/disabled.

No Redis, Upstash, new Worker, new namespace, custom domain or paid dependency.
Free quota/headroom and deployed permissions still require verification before use.
