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
