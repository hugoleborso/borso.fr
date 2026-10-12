# Agent working conditions: the walls

This file names the walls agents keep hitting in this repository, so the
friction they log can be counted per wall instead of read one line at a time.
A person writes it; `scripts/quality/working-conditions.ts` reads it.

The generator reads every archived friction log
(`docs/features/**/kaizen*.md`) and every friction inventory
(`docs/features/**/inventory*.md`). It files each line under the first wall
below whose terms it contains, ignoring case, and counts how many distinct
agents and how many distinct tasks hit that wall. A wall that many agents hit
across many tasks is a working condition, not a local mistake: it costs every
future agent the same time until the environment changes.

A line is matched together with the name of the agent that wrote it, so a
line a guard hook logged (`hook:<name>`) is filed under the wall that names
the hook. A hook line that no wall names is filed under the hook itself.

Lines that match no wall are listed as unfiled. That list is how the walls
grow: when three unfiled lines describe the same thing, add a wall here.

The three areas come from the Theodo Academy *Working Conditions* standard:
**Build** is the local loop (equipment, setup, fast feedback, readable code),
**Observe** is seeing what the system did, and **Ship** is getting merged code
to production. ADR-0029 records why this board exists.

## Format

Each wall is one list item, `` `id` · Area · what the wall is ``, followed by
one `match:` line holding the terms that file a friction line under it,
separated by ` | `. A term is a plain substring, not a pattern.
`working-conditions.ts --check` fails on an area outside Build, Observe and
Ship, on a wall with no term, on a duplicated id, and on a wall that files no
line, because a wall nothing hits is a term that was mistyped or a condition
that was fixed and should be removed.

## Walls

- `isolation-guard-refuses-commands` · Build · The worktree isolation guard refuses plain git, eval and heredocs
  match: worktree-isolat | isolation guard | isolation-guard | /usr/bin/git | too complex to verify | eval is refused | eval is unreachable
- `worktree-base-predates-the-work` · Build · An agent's worktree starts from a base that lacks the code it was sent to change
  match: predat | branched from main | branched from origin/main | arrived with no node_modules
- `shared-local-database` · Build · Parallel agents and the dev server share one local Postgres and erase each other's rows
  match: shares one local postgres | share one local postgres | local pragma postgres is shared | one local postgres | drop each other | local-postgres keys | share one local
- `dev-ports-collide` · Build · Two dev servers in one container fight over the same fixed port
  match: eaddrinuse
- `parallel-agents-share-the-index` · Build · Agents in one checkout stage, sweep or revert each other's work
  match: one git index | same working tree | same checkout | shared working tree | another agent's | swept my | git add -a | silently unstaged
- `browser-session-wedges` · Build · An agent-browser session stops answering after some tens of page drives
  match: wedged | cdp timeout | stopped completing | stopped answering
- `browser-cli-traps` · Build · The browser wrapper and CLI parse arguments in ways that fail silently
  match: agent-browser eval | agent-browser batch | agent-browser find | agent-browser silently | agent-browser ref | browser.sh | set viewport | agent-browser has no
- `no-touch-gestures-on-chromium` · Build · argent cannot send the touch gesture a phone audit needs on Chromium
  match: gesture-swipe | gesture-custom | touch drag | argent cannot
- `no-image-tooling` · Build · The image has no raster or pixel tooling to judge an icon or a screenshot
  match: no pil | raster tooling | png decoder | pixel zoom | pixelated | true 16px | 17px icon | 16px mark | ffmpeg
- `generated-files-go-stale` · Build · A move or rename leaves generated indexes and maps stale and the gates name the wrong cause
  match: generated artefact | stale, | go stale | --check gates compare | reports.sh | only one reports.sh group
- `type-aware-lint-outside-a-project` · Build · Type-aware lint and typecheck fail or pass for reasons unrelated to the code
  match: eslint --cache | .eslintcache | cache-strategy content | not found in any of | outside every project | was never built | heap oom | silently typechecked zero
- `instructions-name-what-is-gone` · Build · A skill, brief or document names a tool, path or workspace that no longer exists
  match: biome | @borso/pragma | does not exist in | .claude/workflows | agent-browser install | is stale: | names it check-doc-links | still tells
- `seed-and-fixture-out-of-step` · Build · The local database or the seed fixture does not hold what the screen under test needs
  match: applies no migrations | wrong password | re-bootstrap | adminpassword | earlier seed | admin_credentials | fixture | seed
- `review-scope-disagrees-with-the-seal` · Build · The review brief, the seal predicate and the diff disagree about which files are in scope
  match: seal | dispatching brief | reviewer brief | review pass | brief named | brief the agent
- `gates-blind-to-a-real-failure` · Build · Coverage or mutation report full marks on code that a real test never exercised
  match: mutant | mutation | stryker | coverage passed | counts as covered | vacuous | substring assertion | passed against the exact bug
- `push-regates-what-main-carried` · Build · A push after merging main re-runs every gate over everything main brought in
  match: re-gate | merging main | after merging main
- `vendor-failures-read-as-something-else` · Observe · An external service answers in a way that reads as a different fault
  match: 502 bad gateway | answers 200 with an error | proxy's ca | err_cert | err_connection_reset | webfetch | raw.githubusercontent | publickey
- `failures-that-render-nothing` · Observe · A failure shows a blank or frozen screen, or a success, instead of an error
  match: blank page | rendered nothing | silently lost | reported success and sent nothing | froze | renders as its fallback | silently dropped
- `conflicted-pull-request-runs-no-ci` · Ship · A pull request in conflict with main triggers no workflow and says nothing
  match: conflicted pull request | conflicts with main | merge ref
- `pull-request-body-rewritten` · Ship · The GitHub connector rewrites the pull-request body it was given
  match: sanitizer
- `shared-template-couples-every-app` · Ship · A change for one app moves the shared CloudFront template and waits for a manual dispatch
  match: borso-shared | infra/shared is dispatched | cloudfront function
- `cors-allow-list-out-of-step` · Ship · A header or origin the front end sends is missing from the API's CORS allow-list
  match: cors
- `dependency-bump-escapes-the-gates` · Ship · A dependency bump changes behaviour that no app filter or test selection sees
  match: dependabot | catalog-only bump | zod-validator | vitest 5 bump | lockfile
- `guard-hooks-refuse-a-command` · Build · A guard hook refuses a command, sometimes one that was harmless
  match: no-swallowed-push | no-broad-kill | no-discarding-reset | hook:pr-body | auto-mode classifier | the harness blocked
- `sandbox-lacks-a-tool` · Build · The container lacks a tool that the work or the instructions need
  match: is not installed | virtual-authenticator | virtual authenticator | has no browser | nothing in this sandbox | cannot open a link on a phone
- `file-size-cap` · Build · A file crosses the line cap because two changes added to it
  match: 300-line | max-lines | line ceiling | line cap
- `validators-and-specs-disagree` · Build · A validator grades against a checklist or spec row that is wrong or missing
  match: graded pass | checklist named | validator failed | spec told | technical passes | test strategy | spec and plan both
- `session-attached-from-another-repository` · Build · The session started in another repository, so this one's hooks and setup never ran
  match: another repository | attached repository | register_repo_root | session carried | talos repository | missing until
- `workspace-commands-depend-on-the-directory` · Build · A pnpm or vitest command means something different depending on where it runs
  match: matched no project | failed 50 files | module_not_found | tsx -e | from apps/pragma
- `flaky-or-slow-test-feedback` · Build · A test fails at random, or a suite takes minutes to say one thing
  match: intermittent | one run in three | 1 in 3 runs | counts only | only pass counts | thirty real seconds
- `history-operations-lose-work` · Build · A rebase, checkout, stash or reset loses or misattributes work
  match: rebase | cherry | merged clean | orig_head | swept in | container was reset | checkout -- | stash
- `parallel-branches-collide` · Ship · Two open branches take the same number or build the same thing
  match: two branches | both added adr | numbered a migration | renumber
- `pull-request-body-refused` · Ship · The pull-request body budget refuses a draft
  match: pr body | body checker | budget's limits | second body
