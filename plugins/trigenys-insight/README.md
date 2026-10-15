# Trigenys Insight — public submission preparation

This directory prepares the **existing** private plugin for an OpenAI submission.
It does not replace, republish or change the audience of the installed plugin.

Identity retained from the installed source:

- Plugin: `plugin_asdk_app_6acf85d9d6708191a7462b0b7e9acb95`.
- Existing technical name: `dev-6acf85d9d6708191a7462b0b7e9acb95`.
- Existing remote server: `https://insight.trigenys.com/api/mcp`.
- Publisher selected by the owner: **Jennifer Aka’a** (portal verification pending).
- Countries selected: **all countries supported by OpenAI** (`countries: []`).
- Commerce declaration: **no purchases or payments**.

`submission/` is a separate portable upload copy. It deliberately contains no
private `.app.json` binding or credential. Portal-generated app bindings must be
preserved after conversion; do not use this directory to overwrite the installed
App-backed plugin through Plugin Creator.

## Rebuild

```sh
pnpm automation:build
node scripts/plugins/export-tools.mjs
python3 scripts/plugins/package-plugin.py
```

Outputs are in `dist/plugin-submission/`. The builder inspects the completed ZIP,
validates the package structure, and writes a readiness report. A preparation
archive is **not ready to submit**. The strict gate fails until all required
materials are verified:

```sh
python3 scripts/plugins/package-plugin.py --require-ready
```

When intentionally changing MCP metadata, inspect the actual schema and scope
changes, then update the contract baseline:

```sh
pnpm automation:build
node scripts/plugins/export-tools.mjs --write
```

The GitHub workflow rebuilds and checks this contract and package automatically.
It does not click Refresh, call a private OpenAI endpoint, request a portal scan,
submit for review or publish an approved release.

For a directly connected custom MCP, metadata refresh remains a ChatGPT action.
For a plugin that has passed initial review and publication, OpenAI's continuous
review discovers tool changes and releases eligible ones after automated checks.
An immediate portal Rescan is a separate action. Do not promise instant updates
or automatic approval.

See `docs/plugins/submission-preparation.md` for the remaining review materials,
recording walkthrough and safe reviewer access plan.
