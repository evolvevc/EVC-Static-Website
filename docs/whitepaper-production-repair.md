# Whitepaper Vercel production diagnostics

Production base: a26ce47d9e894c7d5eb9124219467f1538e0a576 (PR #4), verified against fetched origin/main.

The owner reports that the existing Apps Script Web App was updated to Version 2 on November 11, 2026 at 14:43 IST with its deployment URL preserved. No Apps Script source or deployment is changed by this patch. Do not create another Apps Script deployment for this Vercel update.

## Patch scope

Only server/whitepaper.js and its diagnostic tests change, plus this document. The handler now distinguishes HTTP failure, JSON/body-read failure, request-ID mismatch, rejected/unavailable responses, processing uncertainty and invalid response contracts using fixed codes only. No request IDs, secrets, signatures, payloads, personal data or exception objects are logged. Authentication, browser response states, delivery semantics and no-retry behavior remain unchanged.

Missing request IDs from Apps Script authentication rejections continue to produce WP_UPSTREAM_REQUEST_ID_INVALID; correlate with the existing Apps Script fixed-code diagnostics rather than treating this as proof of HMAC failure. WP_UPSTREAM_JSON_FAILURE includes response-body read errors, not just JSON syntax errors.

Production already contains api/whitepaper.js, server/whitepaper.js and server/whitepaper-catalogue.js. No Contact Us, Resend, Cloudflare, frontend/design, configuration or environment changes are included.

## Validation

The source and diagnostic test files are byte-identical to the versions already covered by 20 passing mocked Whitepaper tests. Relevant committed Whitepaper source/test dependencies match the production base. No additional tests are needed for this unchanged Vercel patch; the prior Apps Script diagnostic test additions are intentionally outside this deployment patch. Git diff checks and source comparison are performed without live requests.

## Authorized release sequence

Review the three-file diff against the production base. Commit these three files on codex/whitepaper-production-diagnostics, push that branch and open a PR targeting main only when authorized. Confirm main has not advanced incompatibly, review the complete PR diff, then merge only with deployment authorization. Verify the existing Vercel project deploys the resulting main commit without changing environment variables or the Apps Script URL.

No commit, push, merge, deployment or live submission was performed during patch preparation. Production root cause and delivery remain unconfirmed. A separately authorized end-to-end check must confirm both notification and PDF attachment emails; uncertain delivery must never be automatically retried.
