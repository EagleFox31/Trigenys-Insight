# Rubric landing pages

The six editorial rubrics share `LocalizedDeskPage` in FR and EN. The compact
header shows the number of articles actually available in the requested language,
and the count links to the complete article grid. All public articles remain
linked in that grid, including the three highlights; the carousel does not remove
articles from crawlable navigation.

`queryDeskPosts` follows all result pages (100 candidates per request), rather
than silently stopping at 24. It reads only published snapshots with public
access and no locale fallback, checks the same title/excerpt/body requirements as
the public article route, respects canonical categories over legacy aliases, and
deduplicates by stable post ID. Article bodies are used only for this server-side
availability check and are not passed into grid/card client props.

The homepage carousel and story presentation are reused. Rubrics use an H2 for
the highlight section and H3 for the selected story, leaving one page H1. Existing
pause, keyboard, reduced-motion, offscreen and touch behavior is retained.
`desk_hero_1..3` placements distinguish rubric traffic from homepage traffic.
Cards use a populated SEO image or fall back to the article hero image.

The default heading is **À la une dans cette rubrique / Featured in this section**.
The existing homepage selection chooses recent published articles, with one
recent CMS featured pin, up to three stories. Empty and smaller rubrics remain
valid without inventing articles.

The heading changes to **Les plus lus sur 7 jours / Most read in the past 7 days**
only when the first-party view counter has existed for at least 24 hours and three
eligible articles each have at least five recorded views in that locale. The query
uses the current Africa/Douala day and preceding six days; it is scoped to the
rubric's visible article IDs. Ties use post ID. A sparse or unavailable ranking
falls back to editorial highlights, and a single QA opening cannot create a
popular-articles claim. These are the existing 24-hour IP-deduplicated openings,
not unique people or completed readings.

No CMS content, article status, publishing schedule, schema or external service
is changed by this presentation. Counts and highlights update with server renders.
