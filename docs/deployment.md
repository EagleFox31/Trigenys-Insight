# Deployment setup

## Neon database

The `trigenys-insight` project is provisioned in the confirmed `darren` organization on the Free plan, in AWS Frankfurt (`aws-eu-central-1`), with PostgreSQL 17. Compute is capped at 0.25 CU. The account's default suspension policy is retained.

- Project: `little-hall-51748511`
- Production branch: `br-gentle-butterfly-b1z9ve9k`
- Development branch: `br-falling-boat-b1tihzjq`
- Database on both branches: `trigenys_insight`
- Dashboard: https://console.neon.tech/app/projects/little-hall-51748511

Never use the production connection for local development or preview deployments. Obtain each branch's connection through Neon; credentials are not part of this repository.

`DATABASE_URL` uses the pooled hostname, while `DATABASE_URL_UNPOOLED` uses the direct hostname. The `db:migrate*` commands set `PAYLOAD_MIGRATING=true` so Payload selects the direct connection. Schema push is disabled; all changes use committed Payload migrations.

## Initial migration verification — 2026-09-09

Payload generated `20260909_073929` from the editorial collections. The development and production databases each contain the 92 generated tables and the corresponding `payload_migrations` record (batch 1).

The local runtime could not resolve the Neon PostgreSQL hostname (`EAI_AGAIN`). The generated UP SQL was therefore executed, together with its migration-history insert, as one transaction through the authenticated Neon connector. Development was applied and checked first, then the same migration was applied and checked on the new, empty production branch. Do not manually repeat that history insert during normal deployment; use `pnpm db:migrate`.

These SQL checks verify provisioning and schema application. They do not verify Payload login, editorial workflows, uploads, or production HTTP behavior against the database.

## Remaining launch setup

1. Link a Vercel project and configure its environment variables. Use the development branch for Preview, and production for Production. Keep all database credentials and Payload secrets server-only.
2. Configure persistent media storage through a Payload storage adapter before enabling uploads on Vercel; its local filesystem is not durable upload storage.
3. Configure an email adapter before relying on password reset or outbound newsletters.
4. Secure the deployment while creating the first editorial administrator. The initial database currently contains no users or editorial content.
5. Import the founder draft through Payload after administrator creation. The current dashboard seed action clears editorial data and must only be used on a new, empty database.
6. Verify login, draft privacy, publication, media upload, and newsletter subscription on the deployed application before launch.
