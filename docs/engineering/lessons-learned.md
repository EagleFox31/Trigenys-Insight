# Engineering lessons learned

This file is the RAIDER failure-memory location for Trigenys Insights.

Capture meaningful incidents and near misses that reveal a reusable lesson. Do not record noise.

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


## Cloudflare pilot rendered HTML but lost Next static assets

**Symptom:** The Worker returned 200 for `/fr` and `/en`, but the page rendered almost unstyled with an oversized brand mark.

**Cause:** `assets.run_worker_first: true` routed `/_next/static/*` through the vinext Worker instead of Cloudflare's static asset path. Route-only smoke tests produced a false green.

**Fix:** Use selective Worker-first routing: application routes go through the Worker while `/_next/static/*` stays asset-first. Deployment smoke tests now parse the rendered HTML and verify an actual CSS URL returns `Content-Type: text/css`.

**Rule:** A successful SSR status code is not sufficient evidence of a healthy frontend. Deployment validation must include at least one referenced static asset.

## Provider migration rewrote Payload media URLs

**Symptom:** After CSS was fixed, article image containers still showed alt text instead of images.

**Cause:** The Vercel Blob adapter is intentionally disabled on the Cloudflare pilot. Payload therefore exposed historical media as local `/api/media/file/*` paths even though the objects already existed in the public Vercel Blob store. Pointing those paths at the Vercel application returned 500 because those files are not local filesystem assets.

**Fix:** During the pilot, legacy `/api/media/file/*` paths are bridged directly to the existing public Blob object by filename, and image optimization is bypassed. The deployment smoke test validates every rendered homepage image URL (up to eight) as `image/*`.

**Rule:** During a storage-provider migration, validate both the persisted database URL and the runtime URL returned by the CMS. They may differ when a storage adapter is disabled.
