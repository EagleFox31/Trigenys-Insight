# Trigenys Insight publication clock

Publication jobs wake a SQLite-backed Durable Object at their next due time.
There is no permanent minute polling of Neon. The only recurring database check
is hourly recovery at minute 17 UTC (`17 * * * *`). GitHub Actions stays available
for manual recovery.

The CMS jobs collection enables hooks so native CMS and MCP scheduling both
notify the clock. Explicit Buffer mutations also notify it. After processing,
the CMS returns `nextWakeAt`; an empty queue does not create another alarm.
A cancelled/rescheduled job can cause one harmless extra wakeup, but the CMS
always rechecks the current job before publishing. Retries back off from one
minute to one hour and persist failure receipts in the Durable Object.

## Configuration and secrets

`wrangler.jsonc` records the Worker, binding and SQLite migration. Deploy with
`wrangler deploy --keep-vars` using the account's normal authentication. Preserve
both encrypted bindings; never print their values:

- `PUBLICATION_SIGNING_KEY`: existing Ed25519 private PKCS8 key (base64), used only
  to call the fixed CMS publication endpoint. The CMS pins the matching public
  verification key in `src/automation/publicationCronAuth.ts`.
- `PUBLICATION_SCHEDULER_SECRET`: HMAC secret shared with Vercel **production**,
  authenticating deadline notifications and technical status requests. Preview
  deployments never notify the production clock.

HTTP access is enabled only for `POST /v1/wake` and `GET /v1/status`. Both require
`X-Scheduler-Timestamp` (Unix seconds) and `X-Scheduler-Signature` (HMAC-SHA256 hex)
over `${timestamp}\n${method}\n${pathname}\n${exactBody}`. Signatures expire after
60 seconds; bodies are capped at 256 bytes. A wake body is `{ "at": <Unix ms> }`.
Neither endpoint can publish an article directly. Preview URLs stay disabled.

## Verification

Run `pnpm test:unit` and `pnpm exec tsc --noEmit`. Tests cover authentication,
queue draining, nearest deadline preservation, concurrent notifications and
persisted backoff. Verify an actual short alarm on an empty queue in production,
then check `lastRun.ok` and `nextWakeAt: null`. Confirm the Neon compute becomes
idle after its five-minute inactivity timeout; public traffic or other clients
can still wake it. Monitor `publication_tick` and `publication_retry` logs.
