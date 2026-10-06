# Task speed: what a band member wants to do fast, and how we measure it

## Why

The earlier mobile audit (`docs/features/pragma/mobile-ux-audit/report.md`)
checked every screen against fixed floors: touch targets of 44px, text fields
of 16px, contrast. Every screen could pass those floors and the app could still
be slow to use, because the floors say nothing about how many screens, taps and
scrolls stand between a member and what they came to do.

This spec names the things a member comes to do, gives each one a budget, and
defines one measurement that says whether the app is inside it.

## The member's jobs

Each job is something a member does on a phone, usually standing up, often
with one hand. They are ordered by how often we expect them to happen in the
weeks before a concert. Every job starts on the screen the app opens on.

| Id | Job | Budget: taps | Budget: hunted taps | Budget: modelled time |
| --- | --- | ---: | ---: | ---: |
| `my-part` | See what I play at the next concert | 3 | 0 | 9 s |
| `stage` | Open the next concert on stage | 3 | 0 | 9 s |
| `vote` | Give points in the open setlist vote | 3 | 0 | 9 s |
| `find-chart` | Open a song's chord chart | 3 | 0 | 9 s |
| `add-song` | Add a song to the catalog | 4 | 0 | 20 s |
| `add-to-setlist` | Add a catalog song to the next concert setlist | 5 | 0 | 14 s |
| `add-task` | Write down a task | 4 | 0 | 14 s |
| `add-bar` | Log a new bar lead | 4 | 0 | 12 s |

Three rules sit under the budgets:

- **No hunting.** The control a job needs next is on screen when the member
  arrives. A tap that first needs a scroll is a hunted tap, and every budget
  allows zero of them.
- **The quick case is quick.** When a job usually needs one field (a task
  title, a bar name), that field and its button are the first thing on the
  page. The full form stays for the details.
- **Save is always on screen.** While any part of a form is visible, its Save
  button is visible too.

## The measurement

`pnpm --filter @borso-app/pragma run task-speed` drives each job in a real
Chromium at 375 × 667 with touch enabled, against the dev server and the
preview seed. It resets the seed before every job, signs in as Hugo, opens the
landing page, and then does exactly what a member would do. Each journey lives
in `apps/pragma/scripts/task-speed/task-speed-journeys.setup.ts`, written with
the labels a member reads on screen.

For each tap it records:

- whether the target was on screen and not covered (by the tab bar, a sticky
  bar or a dialog) when the step began. If not, the harness scrolls it into
  view, counts the distance and marks the tap as **hunted**;
- where on the screen the target sat. A target in the top quarter of the
  screen counts as a **stretch** tap, because a thumb holding the phone
  reaches it worst;
- whether the tap changed the screen (a new address or a new dialog);
- how many characters were typed.

From those it reports, per job:

| Column | Meaning |
| --- | --- |
| Taps | Every tap, including the tap into a text field and each tap a select needs to open and pick |
| Typed | Characters typed |
| Swipes | Scrolled distance divided into swipes of three quarters of a screen |
| Screens | Screens the member had to read, counting the first one |
| Hunted | Taps whose target needed a scroll first |
| Stretch | Taps in the top quarter of the screen |
| Modelled time | See below |

### Modelled time

The time is not measured. It is computed with the keystroke-level model of
Card, Moran and Newell (*The Psychology of Human-Computer Interaction*, 1983),
using its published operator times:

- 1.35 s of mental preparation for every screen read,
- 1.1 s of pointing for every tap and every swipe,
- 0.28 s per character typed, their figure for an average non-secretary typist.

Two choices here are ours, not the model's, and they are the first thing to
revisit if the numbers ever look wrong: a touch tap is costed as one pointing
operation, and a swipe is costed like a tap. The model ignores network and
render time, so a slow API does not show up here. That is deliberate: the
measurement is about the design, and the same journey on a slow connection
costs more in both versions.

The constants are in `apps/pragma/scripts/task-speed/task-speed.core.ts`, and
that file is unit tested and mutation tested like any other core file.

### Running it

```bash
cd apps/pragma
pnpm dev                       # in another terminal
pnpm run task-speed -- --chromium /opt/pw-browsers/chromium \
  --baseline ../../docs/features/pragma/task-speed/validation/baseline.json \
  --screenshots /tmp/task-speed
```

`--baseline` adds the change against an earlier run to each row, `--out` writes
this run's numbers as the next baseline, and `--only add-song,vote` runs a
subset. The `--chromium` flag is only needed in a sandbox whose Playwright
browser does not match the installed version.

The run needs the dev API's seed route (`ALLOW_TEST_SEED=1`, which `pnpm dev`
sets) and writes to the dev database, so it never runs against a preview or
prod.

## Test strategy

- **Unit and mutation tests** cover the scoring: `task-speed.core.ts` (swipe
  count, stretch zone, modelled time, budget verdict, report table),
  `next-concert.core.ts` (which concert is next and which setlist is its own)
  and `nameInstrumentsByEntryId` in `setlist-filter.core.ts`, all at 100%.
- **The task-speed run is the browser check** for the three rules above: no
  hunted tap, the quick case first, Save on screen. Each job's verdict column
  is the assertion. A job that cannot complete (a label renamed, a control
  removed) reports *could not run* rather than a number.
- **Technical validation** reads the diff for the rest: the setlist keeps its
  filter when opened with `?member=<id>`, the quick-add forms create a record
  with only the one field, and the outreach message keeps working while folded.
- **Not covered by any gate:** the run is not in CI, because it needs the dev
  API and a seeded database. It is a tool to run before and after a UX change,
  and the report beside it is the record.

## What it does not cover

- **Real fingers.** Taps are Playwright touch taps and scrolls are
  programmatic. The thumb-reach and swipe figures are geometry, not
  observation.
- **The software keyboard.** Nothing measures what it covers when a field
  takes focus.
- **Reading time inside a screen.** Mental preparation is a flat cost per
  screen, so a dense screen costs the same as a sparse one.
- **Deezer search.** The sandbox cannot reach Deezer, so `add-song` types the
  title and the artist by hand. With search, the job is shorter.
