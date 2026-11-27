# Friction inventory of PR #417

PR #417 gave fans an "Agenda" button on pragma's public concert page, which
opens an `.ics` file of the next concert. Its session ended at 351,457 tokens
of context, above the 150,000 threshold (measured, `get_session`
`context_usage.used_tokens`). The operator asked for this sweep in a new
session, so it ran here.

Inputs: the 12 lines the merge added to
`docs/features/pragma/concert-calendar-file/kaizen.md`
(`scripts/kaizen.sh sweep-input 28726eb4`). The 5 operator messages and the
session's Skill and Agent calls came from `list_events`. Also read: 5
validation reports, 9 commits, the CI runs on the branch and on main, and
the PR's 2 bot comments. The PR had no review threads, and no other `kaizen`
pull request was open.

Writers of the 12 lines: `visual-validator` 5 (3 about the seed, one from
each of its 3 runs), `main` 2, `technical-validator` 1, hooks 4.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | implementation | The session wrote code at 09:21 and the spec at 09:28, with no `/route`, no `/specification` and no mockup | transcript: Skill calls were only `open-pr`, `technical-validation`, `visual-validation`; commit:3a5ec7d before commit:2c17d32 | `agent-after-route` matches only `Agent` and `Task`, and this session wrote every file itself | `scripts/hooks/checks/agent-after-route.core.ts`, PR #410's eradication | dantotsu: the-hook-that-watched-only-the-agents |
| 02 | validation | The French label pushed the button out of the ticket from 640 px, and the page scrolled sideways | report:docs/features/pragma/concert-calendar-file/validation/visual-validation-2026-11-27-0948.md rows 03, 04 | the label's width was never measured before the code | row 01 | merge into the-hook-that-watched-only-the-agents |
| 03 | validation | "Ajouter à mon calendrier" never fit beside "Je serai là !" on a desktop, so the operator chose a label after two rebuilds | report:visual-validation-2026-11-27-0956.md rows 03, 06, 09-11; transcript: AskUserQuestion at 10:10 | as row 02 | row 01 | merge into the-hook-that-watched-only-the-agents |
| 04 | validation | Round 1 found two spec bullets no test held, and no plan | report:technical-validation-2026-11-27-0928.md D03, D07, A00 | the tests came before the spec they should cover | row 01 | merge into the-hook-that-watched-only-the-agents |
| 05 | validation | The spec's "inside the ticket at every width" did not say how it applies to the phone's fixed bottom bar | `visual-validator` line 10:06; commit:07f3583 | a spec written from code that already existed | row 01 | merge into the-hook-that-watched-only-the-agents |
| 06 | pr-description | `/open-pr` ran at 09:28 and again at 09:48, and the validation hooks refused it both times | hook lines 09:28 and 09:48 | with no task list from `/route`, the session reached for the pull request first | row 01 | merge into the-hook-that-watched-only-the-agents |
| 07 | ci | Main's `build` went red at 08:53 after PR #411, and PR #417 had to fix a dantotsu it did not write | ci:https://github.com/hugoleborso/borso.fr/actions/runs/45968893002; commit:a81f8b4 | the eradication-path check read the branch's `HEAD` history, which a squash merge discards | `scripts/quality/dantotsu-corpus.ts` | dantotsu: the-file-only-a-squashed-commit-ever-held |
| 08 | validation | HEAD moved to a spec-only commit while the validator ran tests, so its SHA guard failed mid-review | `technical-validator` line 09:37 | the guard compared SHAs, not the files tests read | row 01 wrote the spec during review | fixed: the guard accepts a move that touches only `docs/features/` |
| 09 | validation | The local seed had no concert with a public message, so a validator wrote the dev database by hand | `visual-validator` lines 09:51, 10:21 | the seed's concert never had a message, although prod has one (measured) | `apps/pragma/api/src/__test/` | fixed: the seeded concert carries a public message |
| 10 | validation | The seed has no concert without a venue | `visual-validator` lines 09:51, 10:21 | the create schema refuses a concert without a venue, and prod holds none (measured with `scripts/db-read.sh`) | none: the state is reachable only through a nullable column practices share | no-op: no screen can reach it; `concert-calendar.core.test.ts` holds the branch |
| 11 | validation | The seed has no practice or past concert to check the calendar route's 422 | `visual-validator` lines 10:06, 10:21 | a practice exists behind `POST /api/__test/seed?practice=today`, documented in `docs/knowledge/driving-pragma-auth-from-a-validator.md`; a past concert does not | none | no-op: the controller test holds both refusals. A past concert in the shared seed would enter every member's history for every other validator (inferred) |
| 12 | validation | `dev-server.sh start` printed no URL while the server was up | `main` line 10:02 | `grep` read the log as a binary file | `scripts/dev-server.sh` | fixed: the log is read with `grep -a`, proved on a planted binary log |
| 13 | validation | A French check at phone width had to be redone, because `phone.sh` opened in English | `visual-validator` line 10:21 | every agent-browser session reports `en-US` (measured), and pragma reads the stored language before that | not phone-specific, every new session | knowledge: driving-previews-with-agent-browser-and-argent |
| 14 | implementation | Controller lint refused the slice's own `.core` import, so the file name travelled in the service outcome | `main` line 09:26 | `borso/no-controller-imports-outside-service`, by design | none: the outcome carrying the name is the pattern | no-op: the rule worked as designed |
| 15 | implementation | The `no-prettier` hook refused Prettier | hook line 09:24 | habit from other repositories | none | no-op: the hook refused it before any file changed, and names oxfmt |
| 16 | pr-description | The `pr-body` hook refused markup the server strips | hook line 09:48 | none found beyond the draft | none | no-op: the hook refused it before posting, and the body that shipped passed |
| 17 | validation | Round 2 found the invariant silent on a concert with no venue | report:technical-validation-2026-11-27-0940.md B07 | the invariant was written from the happy path | none | no-op: fixed in commit:3a3b997, the round-2 review caught it |
| 18 | validation | The phone's "add to calendar" prompt was unverifiable, and the PR asked the operator to tap on a real phone | report:visual-validation-2026-11-27-1014.md row 16; transcript 10:33 "c'est testé sur mon iPhone" | no iOS device or simulator runs here | none | no-op: a one-off check of a new file type; the served `text/calendar` attachment was checked |
| 19 | validation | A malformed id answers 400, not 422 | report:visual-validation-2026-11-27-1014.md row 32 | the spec did not say | none | no-op: the sign-up route answers the same 400 |
| 20 | ci | The run on 4ee8fd0 was cancelled | ci:https://github.com/hugoleborso/borso.fr/actions/runs/45981597204 | the push of a81f8b4 superseded it | none | no-op: concurrency cancels a superseded run on purpose |
| 21 | conception | The operator picked the public page from the first question | transcript 09:19 | none | none | no-op: direction, no lesson |
| 22 | conception | The operator misclicked "Icône partout" and corrected to the recommended short label 23 s later | transcript 10:10:20, 10:10:43 | none | none | no-op: the session switched back at once |
| 23 | post-merge | The operator tested on his iPhone and asked to merge | transcript 10:33 | none | none | no-op: direction, no lesson |
| 24 | post-merge | `operator-messages.ts` printed messages by page, newest page first | `ops-messages` line 10:37 | the script concatenated pages in the order it found them | none | fixed: messages sort by time |
| 25 | post-merge | Counting one session's Skill calls in `list_events` meant separating subagent events by hand | `skill-calls` line 10:40 | subagents write into the same stream | none | knowledge: reading-another-sessions-transcript-with-list-events |
| 26 | post-merge | `list_events` pages with `kinds: [user]` spilled to files, 14 of 16 | `ops-messages` line 10:37 | a tool result is a `user` event | none | no-op: already in reading-another-sessions-transcript-with-list-events |
| 27 | post-merge | `operator-messages.ts` cannot be pointed at a session id | `ops-messages` line 10:37 | it reads the pages this session fetched, by design | none | no-op: fetching the pages first is the documented path, and it worked |
| 28 | post-merge | The sweep's container lacked `mailchecker`, so pragma's type check failed until `pnpm install` ran | `main` line 10:45 | unknown: after a restart, the SessionStart hook ran `pnpm install` and found everything up to date | none | no-op: the SessionStart hook installs dependencies, and the cause of the first miss is not observable now |
| 29 | post-merge | `test-seed.service.ts` sat at the 300-line cap, so one seeded field forced a move | `main` line 10:45 | the seed service redefined time constants `oauth.core` exports | `apps/pragma/api/src/__test/test-seed.service.ts` | fixed: it imports them |
| 30 | post-merge | The `api-validation` hook refused this sweep's pull request | hook line 10:50 | the seed change is under `apps/*/api/` | none | no-op: the gate worked, and the seed change got its report, PASS |
| 31 | post-merge | `vitest --changed` finds no test for a change to an entry script under `scripts/` | `technical-validator` line 10:59 | entry scripts are thin wrappers around their tested `.core` modules | none | no-op: each entry-script fix carries a hand proof in this table or its dantotsu |
| 32 | post-merge | The operator asked whether `/route` could live in CLAUDE.md if it is small enough | transcript of this session | none | none | no-op: he chose to keep the skill, which the hook can see being called |
