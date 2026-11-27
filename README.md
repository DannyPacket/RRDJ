# RRDJ

Rene Rancourt's Day Job — fantasy hockey league tools, Yahoo Fantasy API scripts, and scoring analysis.

## League site (`site/`)

A static page, no build step: `site/index.html` renders whatever is in `site/reports.json`, with team logos in `site/logos/`.

- **Weekly report** — the week's write-up, standings (click a manager for their weeks), the standings journey chart, streaks, weekly high scores, top and bottom players, adds/drops and the trade tracker. Past Yahoo seasons are rebuilt from the league sheet.
- **League history** — champions, all-time standings, finishes by season, record book, head to head.
- **Season history** — one season's standings, single-week records and journey chart.
- **Manager history** — one manager's career, seasons, rivals, personal records and game log.
- **Trade history** — every trade since 2013-14 as a "Trade accepted" card: the trade tracker result (points each side's players scored for their new team), the managers' records at the time and where they finished, the players (headshots, NHL team, how the other team had come to own them) and a short story. Built into `site/trades.json` by `scripts/trade_history.js` from reports.json, drafts.json and the stories in `scripts/trade_stories.json`. Each card exports as an image.

Links keep their place: `#2026-27-w4`, `#history`, `#seasons-2025-26`, `#manager-Tom`, `#trades-2018-19`.

To preview locally, serve the folder (opening the file directly can't load `reports.json`):

```
npx serve site
```

Netlify serves `site/` (see `netlify.toml`).

## Weekly scripts (`scripts/`)

Used by the weekly update to build `reports.json`:

- `fantrax_pull.js` — runs in a signed-in Fantrax browser tab; pulls scores, standings, players, transactions and trades for a period.
- `nhl_lock.js` — the roster-lock time (first puck drop of the period) from the NHL schedule.
- `history.js` — league history (every game, final places, champions, odd-length weeks) from the sheet's CSV export.
- `legacy_weeks.js` — weekly-report entries for past seasons from the sheet.
- `sync_repo.js` — copies the site into this repo as a standalone page.

The sheet id is left out of the scripts (`<SHEET_ID>`).
