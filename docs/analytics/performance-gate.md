# Editorial analytics performance gate

This document records comparable measurements for material analytics changes.

## Measurement rules

Use the same:

- public route;
- production build mode;
- device/emulation profile;
- network/CPU throttling;
- geographic test region when using an external runner;
- Lighthouse version where possible.

Record both the **baseline revision** and **candidate revision**. Do not attribute unrelated application changes to analytics.

## Metrics

| Measurement | Baseline | Candidate | Delta | Notes |
| --- | ---: | ---: | ---: | --- |
| Analytics bootstrap transferred bytes | pending | pending | pending | Measure provider/bootstrap requests only |
| Total JS transferred on article page | pending | pending | pending | Same article and cache state |
| Lighthouse performance score | pending | pending | pending | Mobile profile |
| LCP | pending | pending | pending | Same run conditions |
| INP | pending | pending | pending | Prefer field data when available |
| CLS | pending | pending | pending | Same run conditions |

## Current status — 2026-09-23

The regression guardrails and kill switch are implemented, but a trustworthy before/after production measurement has **not yet been recorded**.

Do not close the rollout-hardening issue until this table contains actual comparable measurements from a successful build/deployment.

The current Vercel preview pipeline has recently been blocked by the account build-rate limit, so a failed preview build must not be treated as a performance result.

## Release decision

Analytics changes pass the performance gate only when:

1. no material regression is observed without a documented benefit;
2. provider script failures do not block the product;
3. field Core Web Vitals are monitored after production rollout;
4. any meaningful regression is recorded in `docs/engineering/lessons-learned.md` with a mitigation.
