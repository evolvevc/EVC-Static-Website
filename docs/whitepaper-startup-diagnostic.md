# Temporary Whitepaper Production startup diagnostic

No deployment has been performed. This diagnostic checks format only, using the exact same exported predicates as the submission handler. It does not prove secret equality with Apps Script, deployment access, PDF mapping, or mail delivery.

On each Production function module initialization (`VERCEL_ENV === 'production'`), the API module emits fixed codes to server logs:
- `WP_STARTUP_HMAC_FORMAT_INVALID`: HMAC predicate failed.
- `WP_STARTUP_URL_FORMAT_INVALID`: URL predicate failed.
- `WP_STARTUP_CONFIG_FORMAT_VALID`: both predicates passed.

Both invalid codes are emitted if both fail. No values, lengths, hashes, URLs, exceptions, IDs or request content are logged. Preview/local startup does not log. Logging failure is swallowed. This is once per module instance, not globally once per deployment; cold starts/scaling can repeat it. Warm requests do not rerun it.

After separate approval, deploy this reviewed source to the intended existing Vercel Production project with the existing configuration. Open protected Vercel runtime logs filtered to that exact deployment and the whitepaper function. Do not pull or print environment values. The new deployment's results cannot reconstruct the historical failed deployment's environment.

To initialize the function without submission, make one GET (not POST) to `/api/whitepaper/` on that deployment. Use existing Vercel access controls if required; do not create bypass credentials or share logs publicly. The API returns the same generic 405 JSON and no-store/nosniff headers for every configuration. It exits before invoking the submission handler. No Apps Script, MailApp, Drive or external fetch runs on this path. There is no public configuration-status response or new endpoint.

Observe the startup code(s) in server logs, including earlier initialization logs if the instance was already warm. Absence of a new log on a warm GET is not evidence of valid configuration. Do not submit the form or POST for this diagnostic. Do not weaken the predicates or rotate credentials based solely on these format checks. Remove the temporary startup block after observation in a separately reviewed change; do not remove the existing request failure diagnostics.

Focused local command: `node --test tests/whitepaper-startup.test.mjs tests/whitepaper-diagnostics.test.mjs`.
