# Leonida Ledger — GTA VI Trophy Guide & Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/zammili/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/zammili/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Ledger is a fully offline trophy guide and progress tracker for the
55 PlayStation 5 trophies of Grand Theft Auto VI. It is a plain static web
app — HTML, CSS and JavaScript files with no build step and no network
calls — so it works the same served locally or opened from disk, and it
never sends your progress anywhere.

## What it does

- **The full checklist.** Every one of the 55 official trophies with its
  name, description and grade (bronze, silver, gold, platinum), grouped by
  roadmap stage. Tick trophies off as you earn them; progress is stored in
  the browser's local storage and survives reloads.
- **A guide for every trophy.** Each card expands to a short guide written
  for this app, with its sources named beside it. Guides stick to what the
  official descriptions establish and say so plainly where a description
  is cryptic rather than inventing steps.
- **Missable warnings.** Trophies whose descriptions imply a one-chance or
  fail-state condition are flagged, with a note on when they can be missed
  and a save-keeping warning in the guide.
- **Roadmap to the platinum.** The list is organised into eight stages —
  from arriving in Leonida through the story chapters, stranger strands,
  activities, collectibles and endgame feats — each stage showing its own
  earned/total progress so you always know what is left.
- **Progress summary.** Earned count, percentage and trophy points, a
  per-grade breakdown, and a "next up" pointer to the first unearned
  trophy on the roadmap.
- **Filters and search.** Filter by kind (story, missable, collectibles,
  activities, world, capstone), by grade, or by earned status, and search
  across names, descriptions and guide text.
- **Spoiler protection.** With the spoiler setting on (the default),
  unearned story trophies stay blurred until you reveal a card yourself
  or earn the trophy.
- **Export and import.** Download your progress as a JSON file and import
  it again on another browser or machine; imports are validated against
  the known trophy ids. A reset button clears everything.

Handy URL presets exist for linking straight to a view: `?kind=missable`,
`?grade=gold`, `?status=unearned`, `?open=<trophy id>` opens one guide,
`?view=roadmap` jumps to the roadmap, and `?spoiler=0` turns spoiler
protection off.

## Running it

Serve the `app/` folder with the bundled preview server:

```sh
node serve.ts
# then open http://localhost:8080
```

Any static file server pointed at `app/` works just as well. Opening
`app/index.html` directly is not recommended: browsers block the data
fetches from `file://`, and the app will tell you to serve the folder
instead.

## How the hand-in works

`main.ts` is the entry point the competition contract expects. It copies
`app/` and `screenshots/` into the output directory (`/output` on the
grader, or the directory named by `MAKEFUN_OUTPUT_DIR` locally) and writes
a `dossier.json` there with the kit's vendored `buildDossier` library —
a judge-facing summary of the screenshots and the app's source. The
scorer rebuilds the dossier with its own copy of the same library and
compares the two byte for byte.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/index.html`, `app/style.css`, `app/app.js` — the tracker itself.
- `app/data/trophies.json` — the official 55-trophy list.
- `app/data/guides-a.json`, `app/data/guides-b.json` — the authored
  per-trophy guides, kinds, roadmap stages, missable flags and sources.
- `screenshots/` — the four dossier screenshots.
- `vendor/` — the kit's dossier library, vendored unchanged.

<sub>Entered on [make.fun](https://make.fun/?ref=nj55s4jw&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
