# One local real-email test — preparation only

Nothing is sent by installation, importing the modules or loading the page.
No real credential was accessed and no external provider request was made during
preparation. Production/Vercel configuration and production recipients are unchanged.

## Prerequisites / stop conditions

- Use a private interactive PowerShell terminal without transcript/debug recording.
- Confirm in Resend that evolvevc.2024@gmail.com is the account's permitted test
  recipient and the existing key can send using onboarding@resend.dev. Resend's
  testing sender cannot send to arbitrary recipients. If not permitted, STOP;
  do not substitute a recipient, sender, credential or paid plan automatically.
- Existing dist/contact-us/index.html and installed local dependencies are needed.
  This uses the existing built page and serves current source form modules.
- Port 8788 must be free. Do not expose, forward or tunnel it.
- Use synthetic contact details and consent only. This is a real external email:
  Resend and the destination mailbox will process/store the readable content.

## Startup (manual, not executed by preparation)

```powershell
Set-Location 'C:\Users\admin.DESKTOP-6CRR0IH.000\Desktop\EVC-Static-Website'
& '.\tools\contact\start-one-email-local.ps1'
```

Paste the existing Resend credential ONLY into the masked prompt. Never paste it
into chat, a shell argument, a file or a browser. The helper passes it as a
process environment variable; Node removes that variable before starting workerd.
The real credential stays in the Node process, outside the Worker and browser.
The PowerShell copy is cleared when the process exits. Normal process-memory
access by the local OS/user remains part of the trusted local-machine boundary.
If execution policy blocks the helper, stop; do not change machine policy here.

Open http://127.0.0.1:8788/contact-us/ and fill synthetic details WITHOUT submitting.
The visible banner names the recipient. Local Turnstile is deliberately fake;
no real Turnstile request is made. Then return to the terminal and type exactly:

    AUTHORIZE ONE EMAIL TO evolvevc.2024@gmail.com

That is the explicit one-time authorization. It permits the next valid, exclusively
granted provider attempt for five minutes. No web endpoint can arm it. Any other
answer closes the harness. Submit the form once after arming. A provider attempt
consumes the grant regardless of acceptance, rejection, network error or timeout;
concurrent requests cannot spend it twice. The terminal cannot re-arm this session.
Do not submit before approval: the orchestration conservatively records an
unavailable transport as uncertain and will not reuse that ID.

## What is reused and isolated

The existing browser encryption, PKCS#8 Web Crypto decryption, payload validator,
branded HTML/CID logo, Resend adapter, orchestration and SQLite budget run locally.
Fresh RSA key pairs live only in memory; no historical private key is used.
The browser keeps the Turnstile token outside the encrypted visitor fields.
The loopback server checks Host and exact Origin; it supplies the loopback identity,
not client-forwarded IPs. Request size, validation and exclusive budget grant remain.

The new Node callback is the ONLY real-network bridge. After the existing Resend
adapter has validated the production-shaped message, it changes ONLY the fixed
recipient to evolvevc.2024@gmail.com and injects the real credential. Sender is
fixed to onboarding@resend.dev. The production recipient pins are not configurable
or weakened. HTML, text, CID attachment and contact/<submission UUID> are retained.
The provider URL is fixed, redirects forbidden, deadline eight seconds; no retries.

workerd rejects Request redirect:'error' on the internal service-binding hop, so
that local hop uses manual redirects. The actual provider request executes in
Node with redirect:'error'. This local bridge does NOT establish that the existing
production adapter's native fetch redirect option is deployment-compatible; that
separate issue must be resolved before production activation.

The standard 3/hour visitor, 50/day and 1500/month limits use one isolated SQLite
Durable Object. Storage belongs to this local session and is not the production
budget. Restarting resets local state and keys; NEVER restart to retry an unknown
outcome. One explicit process approval permits at most one provider attempt.

The runner requires Node HTTP, terminal I/O and Miniflare; it is not a deployable
Worker entry. The Worker fixture contains no real credential or external fetch
and cannot send without the Node-only service callback. No Wrangler config refers
to it, and no production flag selects it. The existing fake-only browser harness
and legacy attachment mode remain independently available.

## Result and shutdown

202 / accepted=true means valid provider acceptance plus budget confirmation, not
mailbox delivery. Check the authorized Gmail inbox/spam and the Resend dashboard
manually. A timeout/uncertain result must be reconciled there, never resubmitted.
No raw provider response, visitor fields or credential is logged by the harness.
Ctrl+C closes the loopback server/workerd and clears the helper's credential variable.
No approval for a real send is implied by this preparation or its offline tests.

## Focused preparation checks

Three new offline tests passed: approval/expiry/concurrency, sanitized unknown
outcome with no retry, and encrypted form through workerd/SQLite/renderer/adapter
with a MOCKED provider (fixed sender/recipient, escaping, CID, duplicate ID).
One existing attachment success regression passed. No broad suites repeated.
All reported test durations are wall-clock, not CPU measurements.
