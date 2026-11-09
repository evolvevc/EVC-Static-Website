# Isolated Contact CPU harness

Preparation only. No deployment or Cloudflare invocation has been authorized.

Files: workers/contact-cpu.js, wrangler.contact-cpu.json,
tools/contact/cpu-fixtures.mjs, tests/contact-cpu.worker.test.mjs.

Run only `node --test tests/contact-cpu.worker.test.mjs` locally. The test generates
fixtures in memory and intercepts every attempted outbound request. It does not
read production secrets or generate persisted private-key files.

The separate Wrangler config builds three disposable RSA-3072 fixtures in
.cache/contact-cpu/fixture.json. This includes a TEST-ONLY private key, not a
credential or production key; never use it to encrypt real data. Do not log or
commit generated fixtures. They expire 30 minutes after generation. The build
replaces fixtures, so read request bodies only after the final build. All request
fields are synthetic; maximum-valid string sizes exercise HTML escaping. Fixture
generation, key generation and encryption occur outside the measured Worker.

The entrypoint uses createProductionContact with fixed in-memory Siteverify and
Resend responses, retaining production adapters, RSA import/decryption, HTML/text
rendering, attachment validation and SQLite budget settlement. Native fetch is
replaced by a throwing function. Unexpected stub destinations throw. No actual
provider or production namespace is reachable through this harness. Synthetic
CONTACT_ENABLED=true exists only inside fixture settings; production remains
false/unverified. The recipient constant required by the existing adapter is
never contacted. No real API tokens or secrets are provisioned.

The separate CPU_BUDGET binding and migration create an independent SQLite
namespace on a future deployment. Never substitute a production namespace ID or
existing migration. Routes, workers.dev and preview URLs are disabled by default.

Next step requires separate authorization: confirm Workers/SQLite/Logs Free quota
headroom, deploy ONLY the isolated config, and establish a temporary invocation
path for ONLY the synthetic Worker. No binding to the production Worker is needed.
Do not change production config. A deployment with current config remains unrouted;
it cannot produce HTTP CPU measurements until that separate path is authorized.

With invocation separately authorized, POST the three exact strings in fixture.bodies
once each to /api/contact/ before expiry. Do not construct fixtures in the Worker.
Collect each invocation's Cloudflare cpuTimeMs, wallTimeMs and outcome from Workers
Logs; correlate the logged sample number. Keep DO events separate. Three samples
are a smoke measurement, not a statistical percentile or guarantee of cold starts.
Warm requests may use other isolates. The first encoding costs and harness body
allowlist overhead are included. Network stubs omit actual provider/network CPU;
results do not certify ingress, delivery, or complete production CPU readiness.

Keep the endpoint closed after the bounded measurement under separate authorization.
Do not enable production, send mail, change keys, or delete production resources.
