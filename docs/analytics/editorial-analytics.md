# Editorial analytics — Trigenys Insights

## Decision

**Adopt PostHog Cloud EU for editorial/product analytics; keep Vercel Analytics for basic hosting-level web analytics.**

The application already ships `@vercel/analytics` and keeps `<Analytics />` globally for basic page analytics. However, Vercel Hobby does not provide the custom-event capability required by the editorial funnel. The provider-neutral adapter therefore routes editorial events to PostHog Cloud EU.

The product UI still does not import a vendor SDK. PostHog is initialized once at the application shell and the shared analytics adapter owns capture semantics.

## Event schema

Schema version: **1**

| Event | Meaning |
| --- | --- |
| `article_card_impression` | An article discovery surface was meaningfully visible |
| `article_card_click` | A reader activated an internal article link |
| `article_view` | A localized article page became active |
| `article_read_25` | Reader crossed 25% of the reading body |
| `article_read_50` | Reader crossed 50% |
| `article_read_75` | Reader crossed 75% |
| `article_read_complete` | Reader crossed the completion threshold (95%) |
| `toc_click` | Reader used the table of contents |
| `source_click` | Reader opened a research source; source identity is normalized and never includes query strings |
| `share_click` | Reserved for a future share control |
| `newsletter_cta_click` | Newsletter form was submitted |
| `newsletter_subscribe_success` | Newsletter API confirmed a new or reactivated subscription; an already-active subscriber is not counted again |

## Properties

The internal contract can carry:

- `slug`
- `locale`
- `placement`
- `category`
- `context`
- `sourceId`
- `sourcePosition`
- `sourceDomain`

The PostHog transport emits the canonical typed properties directly. Source clicks add `source_id`, one-based `source_position` and a normalized hostname-only `source_domain`. Raw source URLs and query strings are deliberately excluded. The UI remains provider-neutral, so changing analytics backends does not require changing tracked components.

Never send:

- email addresses or names;
- IP addresses;
- raw search queries;
- full URLs with query strings;
- article body text;
- arbitrary DOM text;
- secrets.

## Placement vocabulary

- `home_signal`
- `home_lead`
- `home_trending`
- `home_latest`
- `home_analysis`
- `home_editors_pick`
- `home_desk`
- `archive`
- `search`
- `related`

New values must be added to the typed contract rather than invented as free text.

## Impression rule

An article card impression is eligible when:

1. at least 50% of its tracked boundary is visible;
2. it remains eligible for 400 ms;
3. that boundary has not already emitted an impression during its current mount.

Scrolling out and back in does not emit a second impression for the same mounted card.

## Reading rule

Article reading milestones fire at most once per article view:

- 25%
- 50%
- 75%
- 95% → complete

The percentage is calculated from the actual reading shell, not from the whole document.

## KPI definitions

**Card CTR**

```text
article_card_click / article_card_impression
```

Compare the same placement and time window.

**Engaged read rate**

```text
article_read_50 / article_view
```

**Completion rate**

```text
article_read_complete / article_view
```

**Source CTR**

```text
source_click / article_view
```

**Newsletter conversion**

```text
newsletter_subscribe_success / relevant content views
```

A newsletter attempt has three server-confirmed outcomes:

- `created`: a new subscriber was persisted → conversion event;
- `reactivated`: a previously unsubscribed address explicitly subscribed again → conversion event;
- `existing`: the address was already active → successful UX response, but **no new conversion event**.

This keeps retries and repeated submissions from inflating conversion totals.

Raw events are not automatically "unique readers". Distinct-user language must only be used when the provider/report explicitly uses a distinct visitor/session measure.

## Environment and privacy rules

- localhost: disabled;
- `*.vercel.app` preview domains: disabled by default;
- production custom domain: enabled through PostHog Cloud EU;
- Payload draft/preview article instrumentation: disabled;
- analytics failure must never block navigation or successful form submission.

## RAIDER mapping

- **Reusable** — shared tracked links/boundaries and one article tracker.
- **Agnostic** — provider-neutral event contract; the first provider switch required no tracked-component rewrite.
- **Idempotent** — impressions and reading milestones are deduplicated.
- **Durable** — links/forms work without analytics.
- **Failure memory** — analytics incidents go to `docs/engineering/lessons-learned.md`.
- **Engineering-grade** — typed vocabulary, privacy constraints, tests, documented formulas.
- **Retroactive** — existing posts inherit tracking through shared rendering components.
