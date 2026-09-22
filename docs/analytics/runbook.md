# Editorial analytics runbook

## Provider

V1 adapts the existing Vercel Web Analytics installation through `src/lib/analytics/client.ts`.

The UI is provider-agnostic. Do not import `@vercel/analytics` in article, card or newsletter components.

## Validate a release

1. Deploy to a preview URL.
2. Confirm navigation, article progress, sources and newsletter work normally.
3. Custom editorial events are intentionally disabled on `*.vercel.app` previews.
4. Merge only after CI/preview build succeeds.
5. On the production custom domain, perform one controlled path:
   - view one article card for at least 400 ms;
   - click it;
   - cross 25%, 50%, 75% and 95%;
   - click one TOC item;
   - click one research source.
6. Inspect Vercel Web Analytics custom events after ingestion.
7. Check that one action did not create multiple identical events.

## Expected Vercel payload

The adapter sends at most two custom properties:

```text
article = fr:article-slug
context = home_latest:technology
```

Event-specific context examples:

```text
toc_click      context=section-3-h2
source_click   context=source-2
newsletter_*   context=submit|confirmed
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

If custom analytics causes a regression, the safest temporary response is to make `trackEditorialEvent()` a no-op. All tracked links and forms must continue to work because analytics is side-effect-only.

## Troubleshooting

### Duplicate impressions

Check whether the same story is rendered in several legitimate placements, whether a component remounted, and whether the 400 ms visibility timer is being reset correctly.

Do not hide a duplication bug by deduplicating arbitrary records after ingestion before finding the root cause.

### Missing article events

Check:

- the request is on the production custom domain;
- the article is not in Payload draft preview;
- the analytics script is not blocked;
- event/property names still match the typed contract.

### Newsletter clicks but no success

That can be legitimate. `newsletter_cta_click` measures attempts; `newsletter_subscribe_success` fires only after the API returns success.

## Adding an event

1. Add it to `EditorialAnalyticsEvent`.
2. Define its meaning and KPI impact in `editorial-analytics.md`.
3. Keep Vercel transport to two normalized properties.
4. Add or update tests.
5. If it introduces a free-form dimension, review cardinality and privacy first.
