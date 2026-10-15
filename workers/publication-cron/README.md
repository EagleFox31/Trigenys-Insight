# Trigenys Insight publication clock

This scheduled-only Cloudflare Worker calls the CMS publication endpoint every
minute. GitHub Actions is manual recovery, not the primary clock.

`wrangler.jsonc` records the deployed Worker configuration. Deploy code updates
with `wrangler deploy --keep-vars` from this directory, using the account's normal
Cloudflare authentication. Keep HTTP access and preview URLs disabled. This
Worker does not need access to the CMS database or its publishing token.

The existing `PUBLICATION_SIGNING_KEY` encrypted secret contains the Ed25519
private key (PKCS8 DER, base64). It is not in this repository. Preserve it on
updates; never print it. To rotate it, generate a fresh Ed25519 pair, deploy the
matching public JWK to `src/automation/publicationCronAuth.ts`, then provision the
private key through Cloudflare's encrypted secret mechanism. Coordinate rollout
and confirm a real cron tick before declaring the rotation complete.

Cloudflare supports `redirect: 'manual'`; treat any 3xx as a failed request and
never forward the signed Authorization header to another endpoint. Errors must
fail the scheduled invocation. HTTP 409 is the expected lock-contention case and
retries on the next tick. Monitor Workers Logs for `publication_tick`, processed,
failed and scheduled/start timestamps. No secrets or article contents are logged.

Run `pnpm exec vitest run --config vitest.config.mts tests/unit/publicationCron.spec.ts`
from the repository root for authentication and handler checks. These do not
replace a real runtime test. New cron triggers may take up to 15 minutes to
propagate. Follow the live three-minute verification in
`docs/publishing-automation.md` after a change.
