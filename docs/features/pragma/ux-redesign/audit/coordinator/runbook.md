# Pragma UX audit: runbook

Every command below was run end to end on 2026-10-25 in this sandbox. One instance went from nothing to a signed-in, populated setlist in about 12 seconds. Two instances (5181 and 5182) ran side by side without clashing. Everything was stopped afterwards.

All helper files live in the coordinator folder. Do not copy them; call them from there:

```bash
C=docs/features/pragma/ux-redesign/audit/coordinator
```

| File | What it does |
| --- | --- |
| `pragma-instance.sh` | Starts, stops, reseeds and checks one private instance: its own database, API and site |
| `seed-audit.mts` | Adds the realistic audit data on top of the app's own dev fixture |
| `vite-site.mjs` | Runs the pragma site on any port with its `/api` proxy pointing at any API port. Needed because `apps/pragma/vite.config.ts` fixes the ports at 5174 and 3001 |
| `measure.mjs` | Opens every screen as an installed phone app at 375x667 and 390x844, counts scroll areas, saves screenshots |
| `count-scroll.js` | The same scroll count, for whatever is on screen right now, to run through `scripts/browser.sh eval` |

## 1. Pick your ports

Each auditor owns one site port. Everything else follows from it.

| Auditor | Site | API | Database | argent browser (CDP) | argent tool-server |
| --- | --- | --- | --- | --- | --- |
| 1 | 5181 | 3181 | `pragma_audit5181_*` | 9281 | 4381 |
| 2 | 5182 | 3182 | `pragma_audit5182_*` | 9282 | 4382 |
| 3 | 5183 | 3183 | `pragma_audit5183_*` | 9283 | 4383 |

The API port is the site port minus 2000; set `API_PORT` to override it. All three databases live in one shared Postgres cluster (`scripts/local-postgres.sh`, app slug `pragma`), each under its own name, so a reseed by one auditor never touches another's data.

## 2. Start your instance

```bash
$C/pragma-instance.sh start 5181
```

What it does, in order:

1. `scripts/local-postgres.sh start pragma audit5181` starts the shared cluster if needed and creates your database.
2. `apps/pragma/test/dev-database.setup.ts` applies the migrations and seeds the app's own fixture (it wipes the domain tables first, so a restart gives you fresh data).
3. `seed-audit.mts` adds the audit data on top.
4. The API starts in the background (`api/src/main.dev.ts`, `STAGE=dev`, `PORT=3181`), then the site (`vite-site.mjs 5181 3181`). The script waits until `/api/health` and the site both answer.

Expected last lines:

```
[seed-audit] songs=44 members=5 instruments=6 sessions=3
[seed-audit] setlists -> Set principal: 20 | Répétition du jeudi — on cale les enchaînements: 17 | Festival de la Butte — brouillon long: 22
pragma up: site http://localhost:5181  api http://localhost:3181  (sign in as hugo / pragma-preview)
```

Logs and process ids go to `$C/state-5181/` (`api.log`, `site.log`). Other commands:

```bash
$C/pragma-instance.sh status 5181   # is the site and the API answering
$C/pragma-instance.sh reseed 5181   # wipe and reseed the data while the servers keep running; reload the page afterwards
```

Run `pragma-instance.sh` from your own folder if you like; it writes only to `$C/state-<port>/`, and each port gets its own.

## 3. The seed data

Sign in with any of `hugo`, `lea`, `marc`, `sarah`, `tom`. The password is `pragma-preview` for all of them. The app shows English or French depending on the browser; the measuring script uses French (`fr-FR`), argent and agent-browser show English.

| Thing | What is there |
| --- | --- |
| Members | Hugo (drums, vocals), Léa (guitar, vocals), Marc (bass), Sarah (keys, vocals), Tom (saxophone) |
| Instruments | Guitare, Clavier, Basse, Batterie, Chant, Saxophone |
| Songs | 44: covers and originals, all four statuses, 6 ideas with no lineup and no key. Two very long titles: *Sweet Dreams (Are Made of This) — Extended Version With the Long Synth Intro* and *Quand la ville dort encore et que les réverbères s'éteignent un par un*. 12 songs have a ChordPro chord chart, the rest have none |
| Sessions | A concert at Le Petit Bain in 7 days, a practice in 3 days, a practice 4 days ago |
| Setlists | *Set principal* (20 songs, on the concert, with entry notes, a key override, a capo, a lineup override and energy values); *Répétition du jeudi — on cale les enchaînements* (17 songs, on the coming practice, with notes and a key override); *Festival de la Butte — brouillon long* (22 songs, on no session) |
| Transitions | 6 transition comments, for example between Superstition and Valerie, and Zombie and Take On Me |
| Takes | 7 takes from the past practice (3 on Superstition), each with two take comments, one pinned at 1:20. The audio files do not exist, so nothing plays |
| Tasks | 12 tasks across all five members, some linked to songs, with due dates; statuses todo, doing and done |
| Other | 3 improvement ideas, mastery scores for every member and instrument, 4 studies by Sarah and the calendar feeds of the app fixture |

The ids change on every seed. Read them from the API, or let `measure.mjs` find them. Signed in through the browser, `/api/setlists`, `/api/songs` and `/api/sessions` list them.

## 4. Emulate the installed home screen app

Pragma's layout does not change in standalone mode except for one thing: the install offer in the app shell (`InstallOffer`) only shows when the app is **not** installed, so a plain browser tab shows a banner a real installed app never shows. The other difference is that an installed app has no address bar, so the viewport is the whole screen. Three settings reproduce an installed phone app:

1. **Viewport**: the full screen size, 375x667 or 390x844, with touch and mobile mode on.
2. **Standalone display mode**: make `matchMedia('(display-mode: standalone)')` answer true. The CDP command `Emulation.setEmulatedMedia` with a `display-mode` feature was tried on this Chromium (153) and does **not** change it, so `measure.mjs` injects a small script before every page load that answers true for that one query. The app's CSS has no `display-mode` rule, so this covers everything the app reads.
3. **Safe-area insets**: the CDP command `Emulation.setSafeAreaInsetsOverride` works on this Chromium. `measure.mjs` uses top 20 / bottom 0 for 375x667 and top 47 / bottom 34 for 390x844. The page's `viewport-fit=cover` meta is already in place, so `env(safe-area-inset-*)` takes these values.

`measure.mjs` does all three for you, signs in through the real form, and checks that it worked: each line it prints shows `standalone=true` and the top inset.

```bash
cd $C/../<your-label>   # write output in your own folder
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
  node $C/measure.mjs --base http://localhost:5181 --out "$PWD/measure"
# only some screens:
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
  node $C/measure.mjs --base http://localhost:5181 --paths "/catalog,/setlists/:setlist,/sessions/:session" --out "$PWD/measure"
```

`:setlist` becomes the first setlist with 15 songs or more, `:song` the first song with a chart, `:session` the first session. The output folder gets one screenshot per screen and size, and `scroll-report.json` with every scroll area found. Other options: `--user lea` signs in as someone else. The proxy variables must be removed, or Chromium sends `localhost` through the outbound proxy and gets nothing. A first-load baseline for all 20 screens is already in `$C/measure-baseline/`.

`measure.mjs` uses its own Playwright browser and closes it when it finishes. It does not touch argent or agent-browser.

### With agent-browser (layout, walkthroughs, overlays)

agent-browser cannot apply the standalone or safe-area settings above, so use it for walking through flows and for measuring overlays, and remember that it shows the install banner a real installed app would not. Use your own session name so auditors do not share a browser:

```bash
cd "$(git rev-parse --show-toplevel)"
B="scripts/browser.sh --session auditor-1"
$B --restart open http://localhost:5181/login
$B set viewport 375 667
$B fill '#login-username' hugo
$B fill '#login-password' pragma-preview
$B press Enter                       # lands on /catalog
$B open http://localhost:5181/setlists
$B snapshot -i
# open an overlay with clicks, then count scroll areas on what is on screen now:
$B eval "$(cat $C/count-scroll.js)"
$B screenshot "$PWD/shot.png"
$B close
```

`count-scroll.js` returns `verticalScrollAreas`, `horizontalScrollAreas`, whether the page itself scrolls, whether a dialog is open, and each scrolling element with its box. A count of 2 vertical areas while a dialog is open is the double scroll.

### With argent (real taps, drags, the keyboard)

Anything about touch goes through argent. Give each auditor its own browser port and tool-server port, and never 3001 (see `docs/knowledge/driving-previews-with-agent-browser-and-argent.md`):

```bash
cd "$(git rev-parse --show-toplevel)"
export ARGENT_CDP_PORT=9281 ARGENT_TOOL_SERVER_PORT=4381 ARGENT_WIDTH=375 ARGENT_HEIGHT=667
scripts/argent.sh start http://localhost:5181/login
scripts/argent.sh describe                  # every element as a box in [0,1] fractions of the screen
scripts/argent.sh tap 0.5 0.374             # the name field at 375x667
scripts/argent.sh run keyboard --text hugo
scripts/argent.sh tap 0.45 0.534            # the password field
scripts/argent.sh run keyboard --text pragma-preview
scripts/argent.sh tap 0.5 0.657             # the Enter button; lands on the catalogue
scripts/argent.sh describe
scripts/argent.sh stop
```

This exact sequence signed in with real taps and reached the catalogue (44 songs). Pressing the Enter key through `run keyboard --key Enter` did not submit the form; tap the button. Positions move with the viewport: read them from `describe` (tap at a box's centre) rather than reusing the numbers above at 390x844.

The argent browser is not in standalone mode and has no safe-area insets, and in the test above the page was 0.970 of the window wide, which means the browser drew a desktop scrollbar. Take positions and touch behaviour from argent, and layout measurements from `measure.mjs`. `gesture-swipe` does nothing on Chromium; scroll with `gesture-scroll` and drag with `gesture-drag`.

## 5. Stop everything

```bash
scripts/argent.sh stop                       # with your ARGENT_* variables still exported
scripts/browser.sh --session auditor-1 close
$C/pragma-instance.sh stop 5181
```

**Do not stop the Postgres cluster yourself** while other auditors may still be running: the three databases share it, and stopping it breaks their APIs. The last one to finish, or the coordinator, stops it:

```bash
scripts/local-postgres.sh stop pragma
```

Check that nothing is left:

```bash
pgrep -af "vite-site|main.dev|argent server" ; lsof -iTCP:5181 -iTCP:3181 -sTCP:LISTEN
```

## Traps met while writing this

- The app's own dev command (`pnpm dev` in `apps/pragma`) is fixed to ports 5174 and 3001 and seeds only 6 songs. Use `pragma-instance.sh` instead.
- A Node script with a top-level `await` must end in `.mts` for `tsx` to run it as a module.
- Signing in through `/api/auth/login` alone is not enough: the site also keeps a marker in `localStorage`, so without signing in through the form, every page redirects to `/login`. `measure.mjs` signs in through the form for that reason.
- `ss` is not installed in this sandbox; `lsof` and `fuser` are.
