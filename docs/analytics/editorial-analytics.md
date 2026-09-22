# Editorial analytics — Trigenys Insights

## Decision

**Adapt the existing Vercel Web Analytics integration for v1.**

The application already ships `@vercel/analytics` and mounts `<Analytics />` globally. Custom editorial events therefore use the same integration through a provider-agnostic adapter.

The product UI must not import Vercel directly. If richer funnels or event dimensions later justify PostHog, only the adapter changes.

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
| `source_click` | Reader opened a research source |
| `share_click` | Reserved for a future share control |
| `newsletter_cta_click` | Newsletter form was submitted |
| `newsletter_subscribe_success` | Newsletter API confirmed success |

## Properties

The internal contract can carry:

- `slug`
- `locale`
- `placement`
- `category`
- `context`

The Vercel adapter deliberately emits at most two custom properties:

- `article` — `<locale>:<slug>`
- `context` — placement or event-specific normalized context

This keeps the UI contract richer than the provider transport and avoids vendor lock-in.

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

Raw events are not automatically "unique readers". Distinct-user language must only be used when the provider/report explicitly uses a distinct visitor/session measure.

## Environment and privacy rules

- localhost: disabled;
- `*.vercel.app` preview domains: disabled by default;
- production custom domain: enabled;
- Payload draft/preview article instrumentation: disabled;
- analytics failure must never block navigation or successful form submission.

## RAIDER mapping

- **Reusable** — shared tracked links/boundaries and one article tracker.
- **Agnostic** — provider-neutral event contract.
- **Idempotent** — impressions and reading milestones are deduplicated.
- **Durable** — links/forms work without analytics.
- **Failure memory** — analytics incidents go to `docs/engineering/lessons-learned.md`.
- **Engineering-grade** — typed vocabulary, privacy constraints, tests, documented formulas.
- **Retroactive** — existing posts inherit tracking through shared rendering components.
