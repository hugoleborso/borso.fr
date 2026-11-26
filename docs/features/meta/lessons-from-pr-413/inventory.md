# Friction inventory, PRs #413, #414 and #415

One sweep for three merged PRs of the concert sign-up feature. All three came
from session `session_01K69KnE89urXxoZV8C57NB8`, which also shipped #410 and
#412. Its `context_usage.used_tokens` read 349,442 after the last merge, so the
sweep ran in a session of its own, as the operator's "Merge et kaizen" asked.

Sources: `scripts/kaizen.sh sweep-input` on the three merge commits (32 new
lines), the 24 operator messages typed after #410's merge (read with
`list_events`; the 42 before it belong to PR #411's sweep of #410), the
validation reports, CI and the PR conversations. CI went green at the first
run on all three branches. The PR conversations hold only bot comments.

Open kaizen PR #411 (lessons from PR #410) already covers several rows. A row
it covers reads `merge into PR #411`.

Writers of the 32 lines: hooks 12 (`no-prettier` 4, `no-broad-kill` 3,
`visual-validation` 2, `merge-strands-no-work` 2),
`visual-validator` 8, `technical-validator` 3, `perforation-agent` 3,
`remove-agent` 2, `fix-removal` 2, `trim-agent` 1, `onescreen-agent` 1,
`friends-target` 1. Every subagent logged under its own label.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | post-merge | Every band member's installed app opened on the fan page after the ERP moved to `/app` | transcript 21:40 "Euh la PWA il faut la re télécharger du coup ? On perd tout ?", 21:41 "c'est le cas de tout le groupe"; PR #415 | An installed app keeps the start URL it was installed with; #410 changed only the manifest | The #410 spec named new installs only, and its manifest test checked the file's text | dantotsu: the-band-reopened-its-app-on-the-fan-page |
| 02 | spec | The sign-ups were never wired to the friends-per-member count | transcript 20:43 "Je pensais que les inscrits étaient branchés au amis par membre"; PR #414 | The records gate read `CREATE TABLE` in the spec text, and a short-form spec has none | `scripts/check-spec-records.sh`, and its questions never ask which existing screen counts a new record | dantotsu: the-sign-ups-that-never-reached-the-friends-count |
| 03 | spec | The operator had to ask for a mockup before the friends card was built | transcript 20:44 "Moi une maquette." | The session started on a UI change without a mockup | Same cause as #410's skipped mockups | merge into PR #411 (the-deadline-that-skipped-the-mockups) |
| 04 | spec | "Nombre d'amis attendus tout court", the label the session proposed was corrected | transcript 20:44:52 | Direction on copy | none, a product wording choice | no-op: direction, shipped in #414 |
| 05 | spec | The operator picked mockup B | transcript 20:46 "B" | Direction | none | no-op: asked as it should be |
| 06 | deploy | The operator asked to override the merge hook "to merge fast", "it's my repo" | transcript 19:30:53, 19:30:57; log `hook:merge-strands-no-work` 19:48 and 19:59 | A subagent was writing the next PR's code in the shared checkout while main merged the previous one | One session shipped five PRs in one checkout; the hook assumes a session ends at merge | no-op: the hook held what it guards, a live agent's uncommitted code; its message already names the one-command way out (push to a `-wip` branch). Whether to change the hook is the operator's call, and he did not ask for that change after the merge went through |
| 07 | post-merge | "Merge go", "merge tout de suite", "merge dès que c'est vert", "merge et kaizen" | transcript 19:25, 19:27, 20:34, 22:29 | Direction | none | no-op: direction with no lesson |
| 08 | implementation | The site description still presented the ERP after the home page changed | transcript 19:27:50 "Il faut changer la description du site sur la page d'accueil !" | #410 changed what `/` serves and left the page's meta description | none, a one-line miss | no-op: fixed in #412; no recurring shape a check can hold |
| 09 | implementation | The members' video had to use the band's real names, and the guest is Clara | transcript 18:41:44 | The session seeded fake names | The operator's 16:43 request said "seed with le petit bain and a fake date", which the session extended to names (inferred) | no-op: direction, one ambiguous request clarified |
| 10 | implementation | French by default, then "follow the browser language" | transcript 18:41:04, 18:42:10 | Direction, corrected by the operator himself | none | no-op: direction with no lesson |
| 11 | implementation | Poster in prod, beer in the draw, poster PDF, PDF size | transcript 18:44, 19:30, 19:39 | Operator tasks | none | no-op: direction with no lesson |
| 12 | conception | "Can we remove guests by hand?" started #413 | transcript 19:42 | Direction | none | no-op: direction, shipped in #413 |
| 13 | post-merge | "The home page stays the visitors' one? How does it work?" | transcript 22:28 | A question about #415's behaviour | none | no-op: answered, the redirect applies in standalone display only |
| 14 | validation | Removing a registration the last draw picked left it in the winners panel | report: `visual-validation-2026-11-26-2003.md` row 42 | The winners panel kept its own copy of the last draw | none, local to the component | no-op: caught by visual validation, fixed in #413 |
| 15 | validation | A removed fan kept seeing "Inscrit·e" after a reload | report: `visual-validation-2026-11-26-2003.md` row 44, `technical-validation-2026-11-26-2003.md` A06 | The remembered-registration check was persisted with the query cache for 7 days | pragma persists every query by default, a choice made for the band's offline reading; #410 row 23 of PR #411 hit the same default | no-op: fixed in #413 by keeping the check in memory (`ROOTS_KEPT_IN_MEMORY`); dropping persistence for every fan query would change what a fan sees offline, a product call no row here asks for |
| 16 | validation | The validator removed a member through the API and the card kept it after a reload | log `visual-validator` 21:14 | The saved query cache serves a reload | The trap is already in `docs/knowledge/driving-previews-with-agent-browser-and-argent.md` (two validators on PR #377) | no-op: the entry exists and names the fix; turning the cache off locally would also hide row 15's real defect, which the same local cache revealed |
| 17 | validation | A mutation with `onMutate` had no `onSuccess`, in three hooks | report: `technical-validation-2026-11-26-2003.md` B18, `-2037.md` B11 | The optimistic blueprint's `onSuccess` was not copied | none, the reviewer bullet in 06-data-fetching caught it | no-op: the validator held the standard, all three fixed in #413 |
| 18 | validation | A file named for removal held the check, an invariant was untrue, an invariant lacked `Held by` | reports: `-2003.md` B10, B12; `-2143.md` B10 | Writer slips | none | no-op: caught by the reviewer checklist, fixed before merge |
| 19 | validation | An answer racing a removal could write a removed row | report: `-2003.md` E02 | Check-then-write in `amendRegistration` | none | no-op: the concurrency column did its job, now answers 404 |
| 20 | validation | The friends legend had no test | report: `technical-validation-2026-11-26-2058.md` D10 | A test missed | none | no-op: caught, fixed in #414 |
| 21 | validation | Every bar showed a dashed tick at 0, and the venue label ignored the mockup | report: `visual-validation-2026-11-26-2111.md` rows 01, 16 | The outline kept its border at width 0; the existing "Jauge" key was reused | none | no-op: caught, fixed in #414 |
| 22 | validation | The plan was absent in all three PRs, so plan rows were unverifiable | reports `-2037.md`, `-2058.md`, `-2143.md` A00 | Short-form specs with no plan | Covered by PR #411 | merge into PR #411 (row 27) |
| 23 | validation | The spec shape (Use cases and Rules only) matched neither template | log `technical-validator` 20:09 | Short-form spec | Covered by PR #411's validator rewrite | merge into PR #411 |
| 24 | validation | The brief asked for a knip run the validator definition never mentions | log `technical-validator` 20:09 | The standard says "knip clean on the workspace" without saying from where | PR #411 rewrites that standard | merge into PR #411 |
| 25 | validation | knip from `apps/pragma` called every devDependency unused; from the root it exited 0 | log `technical-validator` 20:46 | Only the root holds `knip.json` | none | knowledge: knip-runs-from-the-repository-root |
| 26 | implementation | A second pragma dev server's API died on EADDRINUSE, and its site talked to the first API | log `friends-target` 20:55 | `--as` moved only the site's port | The visual-validation skill tells validators to pass `--as` | fixed: `scripts/dev-server.sh` refuses a second full-stack server and prints the running one's URL; its unused `url` action is removed |
| 27 | validation | The brief placed sign-in at `/app/login`, which renders blank | log `visual-validator` 21:14 | The brief guessed a route; pragma has no route for unknown paths | none for the brief, a one-step slip; the blank page is a product call no member reported | no-op: the validator found `/login` in one step |
| 28 | validation | CDP accepts `display-mode: standalone` and Chromium ignores it | log `visual-validator` 21:46; report `-2143.md` | Vendor behaviour | none | knowledge: agent-browser-coarse-pointer-emulation (extended) |
| 29 | validation | A mode-600 upload failed as a generic save error | log `visual-validator` 20:16 | The browser cannot read the file | none | knowledge: driving-previews-with-agent-browser-and-argent (extended) |
| 30 | validation | The seed does not restore the poster, prize and message the brief said it holds | log `visual-validator` 20:16 | The brief described the seed from memory; no bucket runs locally to hold a poster | none | knowledge: driving-previews-with-agent-browser-and-argent (extended) |
| 31 | validation | Local poster replace fails, the dev key is read-only | logs `perforation-agent` 16:26, `visual-validator` 19:39; report `-2003.md` row 34 | No bucket locally | Covered by PR #411's entry | merge into PR #411 (pragma-local-dev-has-no-uploads-bucket) |
| 32 | validation | `fill ""` left controlled fields unchanged, clearing needed Control+a and Backspace | logs `visual-validator` 19:39, 20:16 | Vendor behaviour | Covered by PR #411 | merge into PR #411 (agent-browser-cli-quirks) |
| 33 | validation | A relative screenshot path wrote into another agent's folder | log `perforation-agent` 16:26 | Vendor behaviour | Covered by PR #411 | merge into PR #411 (agent-browser-cli-quirks) |
| 34 | implementation | `rounded-[…]` banned, radius tokens added | log `perforation-agent` 16:26 | The lint rule | none | no-op: the rule did its job (PR #411 row 42) |
| 35 | implementation | A brief pointed to a notes file that did not exist | log `trim-agent` 16:55 | Brief slip | none | no-op: recovered by its reader (PR #411 row 43) |
| 36 | implementation | The one-screen ticket needed hand-measured pixel totals in a `calc` | log `onescreen-agent` 18:46 | CSS cannot subtract sibling heights | none | no-op: solved once in the component, no other screen needs it |
| 37 | implementation | `conditions-live-in-pure-functions` flagged one `if` and not a similar one | log `remove-agent` 19:59 | The guard-clause exemption covers an `if` whose only statement is `return` or `throw`; the message never said so | `eslint-rules/conditions-live-in-pure-functions.js` message | fixed: the message defines a guard clause |
| 38 | implementation | The Prettier guard refused a chained call, so the edit earlier in the call never ran | log `remove-agent` 19:59 | A PreToolUse refusal blocks the whole Bash call | none, it is how the harness applies any refusal | no-op: the agent saw the refusal and noticed the lost edit, as its own line shows; PR #411 rewrites every hook, so a message change here would collide with it |
| 39 | implementation | Prettier refused four times | log `hook:no-prettier` ×4 | Reflex | none | no-op: the guard held (PR #411 row 40) |
| 40 | implementation | `pkill` or `killall` refused three times | log `hook:no-broad-kill` ×3 | Agents stopping a server they had not started with `dev-server.sh` | Row 26: a second server could not start cleanly | merge into row 26 |
| 41 | pr-description | The session tried to open a PR before its visual report, twice | log `hook:visual-validation` 19:28, 19:41 | Same cause as #410 | Covered by PR #411 | merge into PR #411 (the-deadline-that-skipped-the-mockups) |
| 42 | implementation | `vitest --coverage.include` on a site core file printed an empty table | log `fix-removal` 20:36 | Not reproduced: from `apps/pragma`, both the app-relative and the repo-relative path print the row (measured) | none | no-op: not reproduced |
| 43 | implementation | The queries and service files sit at the 300-line limit | log `fix-removal` 20:36 | Two modules grew with the feature | none | no-op: the limit did its job, the fix fit |
| 44 | post-merge | Reading the transcript took one spilled file and one parse per page | log `transcript-reader` this sweep | `kinds: ["user"]` keeps tool results | none | no-op: `scripts/kaizen/operator-messages.ts` exists for it, the reader parsed by hand |
