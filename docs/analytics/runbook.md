# Editorial analytics runbook

## Provider

V1 adapts the existing Vercel Web Analytics installation through `src/lib/analytics/client.ts`.

The UI is provider-agnostic. Do not import `@vercel/analytics` in article, card or newsletter components.

## Validate a release

1. Deploy to a preview URL.
2. Confirm navigation, article progress, sources and newsletter work normally.
3. Custom editorial events are intentionally disabled on `*.vercel.app` previews and PostHog credentials are currently configured only for Production.
4. Merge only after CI/preview build succeeds.
5. On the production custom domain, perform one controlled path:
   - view one article card for at least 400 ms;
   - click it;
   - cross 25%, 50%, 75% and 95%;
   - click one TOC item;
   - click one research source.
6. Inspect PostHog Live Events after ingestion.
7. Check that one action did not create multiple identical events.

## Expected PostHog payload

The adapter sends the typed editorial dimensions, for example:

```text
schema_version = 1
article = fr:article-slug
slug = article-slug
locale = fr
placement = home_latest
category = technology
context = home_latest:technology
```

Event-specific context examples:

```text
toc_click      context=section-3-h2
source_click   context=source-2 source_id=42 source_position=2 source_domain=beac.int
newsletter_cta_click       context=submit
newsletter_subscribe_success context=created|reactivated
```

## Editorial reporting

Use matching windows for numerator and denominator.

- Card CTR = `article_card_click / article_card_impression`
- Engaged read rate = `article_read_50 / article_view`
- Completion rate = `article_read_complete / article_view`
- Source CTR = `source_click / article_view`

When comparing placements, filter `context` accordingly.

Do not call raw event totals "unique readers".

## Kill switch

Set:

```text
NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED=false
```

and redeploy. Both the PostHog bootstrap and the provider-neutral event adapter stop emitting events.

Accepted disabled values are `0`, `false`, `off` and `disabled` (case-insensitive).

The kill switch is intentionally side-effect-only: article links, source links, reading UI and newsletter submission must continue to work normally.

To re-enable, remove the variable or set it to a non-disabled value and redeploy.

## Automated-test adapter

Playwright/Vitest must never send traffic to PostHog.

Tests can initialize:

```js
window.__TRIGENYS_ANALYTICS_TEST_EVENTS__ = []
```

The analytics adapter writes normalized event payloads to that in-memory array and performs no network request. This test sink works on localhost specifically so E2E tests can validate the contract without relaxing production host rules.

Do not expose or initialize the test sink in production application code.

## Staged rollout

1. Keep `NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED=false` for the first preview/debug deployment if the provider configuration changed materially.
2. Validate the page without analytics.
3. Enable analytics on the intended environment.
4. Perform one controlled reader path and inspect the provider's live events.
5. Check the first 24–48 hours for duplicate impressions, missing placements, impossible conversion counts and privacy regressions.
6. Record any meaningful incident in `docs/engineering/lessons-learned.md` and add a regression guardrail before considering the rollout complete.

## Performance gate

Before and after a material analytics-provider or bootstrap change, record comparable measurements under the same conditions:

- production JS/bootstrap impact;
- Lighthouse mobile run;
- LCP;
- INP;
- CLS;
- provider script/network weight.

Store the dated result in `docs/analytics/performance-gate.md`.

Do not compare different devices, throttling profiles or unrelated production revisions and present the result as an analytics delta.

## Troubleshooting

### Duplicate impressions

Check whether the same story is rendered in several legitimate placements, whether a component remounted, and whether the 400 ms visibility timer is being reset correctly.

Do not hide a duplication bug by deduplicating arbitrary records after ingestion before finding the root cause.

### Missing article events

Check:

- the request is on the production custom domain;
- the article is not in Payload draft preview;
- the PostHog EU script/ingestion endpoint is not blocked;
- event/property names still match the typed contract.

### Newsletter clicks but no success

That can be legitimate. `newsletter_cta_click` measures attempts. `newsletter_subscribe_success` fires only when the API confirms a `created` or `reactivated` subscription. An already-active subscriber receives a normal success response but does not generate another conversion event.

### Source events contain unexpected URLs or tokens

`source_click` must contain only `source_id`, `source_position`, and the normalized hostname in `source_domain`. If a full URL, query string, token, or fragment appears in PostHog, treat it as a privacy regression and stop the affected event before continuing collection.

## Adding an event

1. Add it to `EditorialAnalyticsEvent`.
2. Define its meaning and KPI impact in `editorial-analytics.md`.
3. Keep provider transport behind `src/lib/analytics/client.ts`; UI components must remain provider-neutral.
4. Add or update tests.
5. If it introduces a free-form dimension, review cardinality and privacy first.
