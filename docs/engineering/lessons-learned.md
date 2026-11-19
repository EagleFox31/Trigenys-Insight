# Engineering lessons learned

This file is the RAIDER failure-memory location for Trigenys Insights.

Capture meaningful incidents and near misses that reveal a reusable lesson. Do not record noise.

## 2026-10-28 — Original image metadata pointed to a thumbnail

The live social upload exposed an original 1080×1350 media record whose filename
and URL referred to a 300×375 size. Its initial unsuffixed URL returned 404.
The installed cloud-storage hook uploads sizes concurrently with a shared
metadata object, while the Blob adapter mutates that object's filename.
Social uploads now persist a canonical original Blob filename using the verified
input bytes, repair the existing media ID on retry and point invalid derivative
references at the verified original. Asset validation compares the public file length with the original's
length. Tests cover the thumbnail/original mismatch and idempotent repair.
Dimensions in a database record do not prove that its URL serves that image.

## 2026-10-28 — A queued social request is not a confirmed Buffer draft

**Classification**
Automation / API contracts / observability

**Context and symptom**
Six Trigenys Group social requests were persisted but failed before any remote draft was confirmed. The client retained only generic error codes and always selected the article's hero image.

**Root cause and resolution**
Facebook's platform-specific post type was omitted. Generic GraphQL/mutation errors also concealed the distinction between input rejection and an unknown mutation outcome. Add the required Facebook metadata, fixed-vocabulary typed diagnostics, an explicit locale/channel-bound social media selection and actual remote-media receipts. LinkedIn's production cause must be established from those diagnostics rather than inferred from Facebook's error.

**Prevention and generalized lesson**
Test platform-specific request contracts, image-only edits, external changes, safe diagnostics and retry reconciliation. Reuse export and remote IDs. Treat persistence, remote draft confirmation and approved scheduling as separate states; never report or infer the next state from the previous one.

## Template

### YYYY-MM-DD — Short title

**Classification**  
Architecture / analytics / security / CI-CD / data / dependencies / infrastructure / release / automation / UX / performance / tests / process

**Context**  
What was being changed?

**Symptom / impact**  
What failed or nearly failed?

**Root cause**  
Why did it happen?

**Resolution**  
What fixed the immediate problem?

**Prevention**  
What test, guardrail, validation, checklist or architecture change now reduces recurrence?

**Generalized lesson**  
What should remain true beyond this incident?

**Derived principle / standard change**  
If this exposed a RAIDER gap, what pattern, ADR or convention should change?

---

## 2026-09-22 — Sticky TOC constrained by its parent

**Classification**  
UX / CSS layout

**Context**  
The article table of contents was intended to remain visible during vertical reading.

**Symptom / impact**  
The inner panel used `position: sticky`, but disappeared while the reader scrolled through the article.

**Root cause**  
The sticky element lived inside a grid child whose height collapsed to the TOC content because the parent grid used `align-items: start`. Sticky positioning was therefore bounded by a container no taller than itself.

**Resolution**  
Move sticky positioning to the grid `aside` and constrain only the inner panel's viewport height.

**Prevention**  
For future sticky UI, verify the complete ancestor chain and scroll container before changing `top` values.

**Generalized lesson**  
Sticky positioning is a relationship between an element and its containing/scrolling ancestors, not a property that can be debugged in isolation.

**Derived principle / standard change**  
When a layout behavior depends on CSS containment, test it at realistic page height rather than only at the initial viewport.

---

## 2026-09-22 — Production fix existed only in an unmerged PR

**Classification**  
Release / process

**Context**  
A sticky TOC correction had passed review but had not reached the production branch.

**Symptom / impact**  
The code description was correct while the public site still exhibited the old behavior.

**Root cause**  
Implementation state and deployment state were conflated.

**Resolution**  
Verify the PR status and production branch before claiming a fix is live.

**Prevention**  
For user-visible fixes, report separately: coded → CI green → merged → production deployment verified.

**Generalized lesson**  
A correct patch is not a production fix until the deployed revision contains it.

---

## 2026-11-09 — Fresh database cannot run the full migration chain

**Classification**  
Near miss / data migrations

**Context**  
Local verification of the SEO/GEO changes needed an empty Postgres with all migrations applied.

**Symptom / impact**  
`pnpm db:migrate` stops on production-specific content migrations (`20261015_161000_repair_article_translations`, `20261015_162000_archive_ecommerce_duplicate`, `20261016_*` LinkedIn/AgenStudio drafts) whose guards throw when the expected production rows are absent. A new environment (CI, preview database, disaster recovery) cannot be provisioned without manual intervention.

**Root cause**  
Content repair migrations treat "target rows absent" as a failed precondition instead of a no-op.

**Resolution**  
For the throwaway verification database only, those migrations were marked as applied by hand. No migration was changed in this PR.

**Prevention**  
Content migrations must be idempotent: when none of their target rows exist they log and return; they throw only when targets exist in an unexpected state. Track the fix in a dedicated issue and add a CI job that migrates an empty database.

**Generalized lesson**  
A migration chain that only succeeds on one specific database is not a migration chain; empty-database convergence is part of the contract.
