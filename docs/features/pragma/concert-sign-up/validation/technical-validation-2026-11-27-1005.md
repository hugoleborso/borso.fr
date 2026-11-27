# Technical validation — Concert sign-up page (public list carries no registration count), round 2

- Spec: [`../spec/spec.md`](../spec/spec.md). For the kaizen commit, the operator's request stands in: "a friction line says what was seen and where it was seen (a required --where), with no list of forbidden words; the docs that explain the kaizen explain how this works"
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: claude/hide-registration-count
- Base: 458e886c43f39c5561b65185c897060f2df4c3bf (round 2 diffs from the reviewed SHA below)
- Run at: 2026-11-27T10:05:13Z
- Round: 2
- Reviewed: 6398f5a259ec4ad3bb52a924693eaa9916f5c39f
- Touched workspaces: @borso-app/pragma (api back-e2e test, INVARIANTS.md), root workspace (`scripts/`, `.husky/`, `.claude/`, `CLAUDE.md`, `docs/knowledge/`)

Scope: `git diff 23f9021db3394baddd9df76ad4e47c7b070c87a5..HEAD`. It holds three commits. `4881c1bb5 test(pragma): the public concert list refuses any field it does not send` is the fix commit for round 1. `883135529 feat(meta): a friction line says what was seen and where, never why` arrives through the merge `6398f5a25` of `claude/kaizen-seen-where`, which branches from the reviewed SHA itself (`git merge-base 883135529 23f9021d` prints `23f9021d…`). So the merge brings no `main` content, and every file in the diff is this branch's own. The kaizen commit is new scope that round 1 never read. Categories A to E are walked over its 11 files as round 1 would, with the operator's request as the contract.

Round 1 had no blocking finding. Its two non-blocking findings, B12 and D02, are named by `4881c1bb5` ("Closes B12 and D02"). No commit dismisses a finding. They get one row each below.

0 use cases routed to /visual-validation; out of scope for this report. Neither commit changes a screen.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/pragma/concert-sign-up/plan/` does not exist. The kaizen change has no plan either | UNVERIFIABLE |
| A01 | Rules (round-1 fix) | The invariant names what each public concert holds | apps/pragma/api/src/concert-registrations/INVARIANTS.md:37-38 | `- The public list of upcoming concerts carries no registration count. Each` / `concert holds its session id and what the ticket draws, nothing else.` The service returns `sessionId`, `date`, `venue`, `message`, `posterUrl`, `prize` (concert-registrations.service.ts:70-76). `ConcertTicket.tsx` draws each of the last five (`formatTicketDate(concert.date, …)` :101, `concert.posterUrl` :222, `concert.message` :245, `concert.prize` :256, `Venue` :130) | PASS |
| A02 | Operator: a required `--where` | A line without a place is refused and nothing is logged | scripts/kaizen.sh:267-271 | `if [ -z "$WHERE" ]; then` / `printf 'scripts/kaizen.sh: say where you saw it with --where "<command, URL, screen or file:line>". … Nothing logged.\n%s\n' "$USAGE" >&2` / `exit 1`. This check runs before `ensure_file`, so no `KAIZEN.md` is created | PASS |
| A03 | Operator: `--where` parsing | `--where` and `--from` are read in either order, and an empty value is refused | scripts/kaizen.sh:131-136 | `while [ "${1:-}" = '--from' ] \|\| [ "${1:-}" = '--where' ]; do` / `[ -n "${2:-}" ] \|\| { printf '%s\n' "$USAGE" >&2; exit 1; }` / `if [ "$1" = '--from' ]; then WRITER="$2"; else WHERE="$2"; fi` | PASS |
| A04 | Operator: the line says what was seen and where | The logged entry carries both parts | scripts/kaizen.sh:276 | `entry="$(printf '%s (where: %s)' "$*" "$WHERE" \| tr '\n' ' ')"`. The sweep's reader still parses it, because `KAIZEN_LINE_PATTERN = /^- \[…\] \`([^\`]+)\` (.+)$/` (scripts/quality/working-conditions.core.ts:33) takes any tail | PASS |
| A05 | Operator: no list of forbidden words | The script checks only for a place and a sentence, never for words | scripts/kaizen.sh:263-271 | The only guards on a friction line are `if [[ "$*" != *[[:space:]]* ]]` (one word) and `if [ -z "$WHERE" ]`. `grep -nE 'forbidden\|=~\|grep -[a-zA-Z]*i' scripts/kaizen.sh` finds no word check | PASS |
| A06 | Operator: docs explain how it works | The script's own header and the `KAIZEN.md` template explain the two parts | scripts/kaizen.sh:32-41, 86-89 | `**What you saw, and where you saw it.** Never the cause, never the fix.` / `So a line has two parts, and the script refuses one without both.`; the template prints `$KAIZEN_COMMAND --where \"<command, URL, screen or file:line>\" \"<what you saw>\"` | PASS |
| A07 | Operator: docs explain how it works | The sweep skill tells the sweeper to start from the place | .claude/skills/after-task-kaizen/SKILL.md:69-76 | `**Start from the place, not the sentence.** A line is what its writer saw, then \`(where: ...)\` …` / `Treat any cause a line still states, older lines included, as a hypothesis to test` | PASS |
| A08 | Operator: docs explain how it works | Every brief-giving doc carries the new call | CLAUDE.md:82, 96; .claude/agents/technical-validator.md:134; .claude/agents/visual-validator.md:79; docs/knowledge/subagents-that-were-never-told-their-label.md:20; scripts/install-repo-deps.sh:235 | `scripts/kaizen.sh --from <its-label> --where "<command, URL or file:line>" "<what it saw>"`. `grep -rniE 'the problem only\|what went wrong\|one sentence>' .claude CLAUDE.md docs/knowledge docs/standards scripts .husky` finds no stale call shape | PASS |
| A09 | Operator: a required `--where` | Every automated caller passes `--where`, so a refusal is still logged | .husky/commit-msg:4; .husky/pre-push:107; scripts/hooks/hook-runner.adapter.ts:57-63 | `scripts/kaizen.sh --from hook:commitlint --where .husky/commit-msg "…"`; `--from hook:pre-push-conflict --where .husky/pre-push "…"`; `'--where', \`the ${rule} hook refusal\`,`. `grep -rn 'kaizen.sh' .claude .husky .github scripts` lists no other caller that logs a line | PASS |
| A10 | Operator: "where it was seen" | The hook runner's place names a command, URL, screen or file:line | scripts/hooks/hook-runner.adapter.ts:61 | `` `the ${rule} hook refusal` ``. A `no-prettier` refusal logs `ran Prettier (where: the no-prettier hook refusal)`. That names neither the refused command nor `scripts/hooks/checks/<check>.core.ts`, which the usage line asks for (`--where "<command, URL, screen or file:line>"`, kaizen.sh:129). The line still lands, so nothing is lost against before | FAIL (non-blocking) |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | B12 (non-blocking): the invariant forbade `sessionId`, which the API must send | `4881c1bb5` apps/pragma/api/src/concert-registrations/INVARIANTS.md:37-38, `Each concert holds its session id and what the ticket draws, nothing else.` | PASS |
| R02 | D02 (non-blocking): only each concert's shape was strict | `4881c1bb5` concert-registrations.controller.test.ts:45 `const upcomingEnvelope = z.strictObject({` and :53 `prize: z.strictObject({ label: z.string(), icon: z.string() }).nullable(),`. `context.json({ concerts, registrationCount: 2 })` now fails `schema.parse` in `readJson`. The strict `prize` is exercised with a non-null prize at :760-764 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the hunks | `WHERE`, `USAGE`, `logged`, `refused`, `ONE_COMMIT`. None found | PASS |
| B02 | Magic numbers / strings extracted | read | the usage string is extracted to `USAGE` (kaizen.sh:129) and reused at :133, :140, :269. The test's fixture is `ONE_COMMIT` (kaizen.test.ts:125) | PASS |
| B03 | No prose comments (`borso/no-comments`) | read the TS hunks | hook-runner.adapter.ts and kaizen.test.ts add no comment. The controller test adds none | PASS |
| B04 | Function names describe the result | sample | `logRefusals`, `kaizenAfter` are unchanged. `kaizenAfter` now also returns `directory`, which its name still covers | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on the changed TS files | none found | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on the changed TS files | none found | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read | no index access added | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts scripts/hooks/hook-runner.adapter.ts scripts/kaizen.test.ts` | exit 0, no output | PASS |
| B09 | Dead exports | `pnpm exec knip` | exit 0 | PASS |
| B10 | `useEffect` is a smell | grep on changed files | no `.tsx` changed. None found | PASS |
| B11 | Standards checklist: "a rule in an `INVARIANTS.md` [is] still true" (01-naming.md:317) | read INVARIANTS.md in full against service.ts and ConcertTicket.tsx | see A01. The rewritten sentence matches the six fields the service returns | PASS |
| B12 | Standards checklist: "an invariant promising behaviour carries a `Held by:` line" (01-naming.md:320) | read | INVARIANTS.md:54 `Held by: … › lists the upcoming concerts only, soonest first, with their message and no sign-up count`, a test that runs the strict envelope | PASS |
| B13 | Standards checklist: "a comment documents something the code cannot say, and is not … a history note" (01-naming.md:328) | read scripts/kaizen.sh in full | `# implies: on 2026-11-27 a line blamed the validators for a public API field,` / `# before anyone had looked at why the field existed.` at scripts/kaizen.sh:36-37 is a history note. Introduced: this branch. The file carries the same pattern from before (`# logging it put \`list\` in PR #230's archive as if it were friction.` at :262, `# the PR #206 sweep had to cut a log …` at :279: pre-existing). Fix size: one file (move the dated incidents to the commit message or a dantotsu) | FAIL (non-blocking) |
| B14 | Standards checklist: "a file name says what the file holds" (01-naming.md:339) | read | no file added or renamed | PASS |
| B15 | Standards checklist: remaining bullets (hotspots, temporal coupling, verb table, negated booleans, core vs utils, derived types, Zod parsing, repositories, rate-limit buckets, transactions, scale, front-end layout, labels, 375 px, booleans in props, drag controls) | read | the diff touches no service, repository, screen, rate limiter, prop set or write path. `isLoggingRefusals` (hook-runner.adapter.ts:54) is unchanged and not negated | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 23f9021db3394baddd9df76ad4e47c7b070c87a5 --coverage --reporter=verbose` | 0. "No test files found", as expected. The only pragma code file changed is a back-e2e test, which the core project does not include. Coverage 0/0 | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed 23f9021db3394baddd9df76ad4e47c7b070c87a5 --reporter=verbose` | 0. 1 file, 30 tests, all of api/src/concert-registrations/concert-registrations.controller.test.ts, including `✓ … lists the upcoming concerts only, soonest first, with their message and no sign-up count` | PASS |
| C03 | root (`scripts/`) | `pnpm exec vitest run --changed 23f9021db3394baddd9df76ad4e47c7b070c87a5 --reporter=verbose` | 0. 1 file, 6 tests in scripts/kaizen.test.ts, including `✓ kaizen.sh logging a friction line > logs what was seen together with where it was seen` and `✓ … refuses a line that does not say where it was seen, and logs nothing` | PASS |
| C04 | Mutation | `scripts/mutate-changed.sh` | not run. No gated file changed. Under `scripts/` only `.core` and `.utils` modules are gated (mutate-changed.sh:7-8, root vitest.config `include: ['scripts/**/*.{core,utils}.ts']`), and `hook-runner.adapter.ts` is neither | PASS |
| C05 | `*.utils.ts` coverage | enumerate | the diff touches no `*.utils.ts` | PASS |
| C06 | root (`scripts/`) | `KAIZEN_AGENT=probe pnpm exec vitest run scripts/kaizen.test.ts` | 1. `× logs what was seen together with where it was seen`. The test spreads `...process.env` into the script's environment (kaizen.test.ts:33), and the script takes its writer from it (`WRITER="${KAIZEN_AGENT:-main}"`, kaizen.sh:130). The assertion hard-codes `` `main` `` (kaizen.test.ts:136). Nothing in the repo sets `KAIZEN_AGENT` today (grep), so CI passes. Fix size: one line (`KAIZEN_AGENT: undefined` in the test's environment, or match any writer) | FAIL (non-blocking) |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Rules: the public list carries no count, and nothing beyond its fields, at the envelope too (round-1 fix) | `it('lists the upcoming concerts only, soonest first, with their message and no sign-up count', …)` at apps/pragma/api/src/concert-registrations/concert-registrations.controller.test.ts:428. It registers Lou and Max on `tonight` (:438-439). The failing line is `readJson(await jsonRequest(app, '/api/concert-registrations/upcoming'), upcomingEnvelope)` at :446-449. `upcomingEnvelope` is `z.strictObject` at the envelope (:45), each concert (:47) and `prize` (:53), so an extra key at any level throws | PASS |
| D02 | Operator: a line says what was seen and where | `it('logs what was seen together with where it was seen', …)` at scripts/kaizen.test.ts:127 runs `--where 'GET /api/upcoming' 'the list carries a count'`. The failing assertion is `expect(readFileSync(join(logged.directory, 'KAIZEN.md'), 'utf8')).toMatch(/^- \[[^\]]+\] \`main\` the list carries a count \(where: GET \/api\/upcoming\)$/m)` at :135-137 | PASS |
| D03 | Operator: `--where` is required | `it('refuses a line that does not say where it was seen, and logs nothing', …)` at scripts/kaizen.test.ts:140. The failing assertions are `expect(refused.status).toBe(1);` at :142 and `expect(existsSync(join(refused.directory, 'KAIZEN.md'))).toBe(false);` at :143 | PASS |
| D04 | Operator: no list of forbidden words | structural: the only guards on a friction line are the one-word check at scripts/kaizen.sh:263 and the place check at :269. Nothing reads the sentence's words, so a test asserting the absence of a word list would restate the code | PASS |
| D05 | Operator: an automated refusal still logs a line with its place | (none found). No test runs `logRefusals` (hook-runner.adapter.ts:53-65) or the two `.husky` callers. Failing case: deleting `'--where', \`the ${rule} hook refusal\`,` at hook-runner.adapter.ts:60-61 makes `kaizen.sh` exit 1 on every hook refusal. `runCommand`'s result is ignored, so refusals stop reaching `KAIZEN.md` silently, and every test still passes. The callers are correct at this SHA, so nothing ships wrong | FAIL (non-blocking) |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Whole diff | Does the diff write to a database or keep state? | `git diff 23f9021d..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints nothing. The only changed TS source is hook-runner.adapter.ts, whose hunk changes one argument list and adds no module-level variable. `kaizen.sh` appends one line per call with a single `printf … >> "$KAIZEN_FILE"` (kaizen.sh:281), as before. That is one local file per session, not application state | PASS |

## Blocking findings

- none

## Non-blocking findings

- A10: the hook runner logs `(where: the <rule> hook refusal)`, which names no command, URL, screen or file:line.
- B13: scripts/kaizen.sh:36-37 adds a dated history note as a comment.
- C06: `KAIZEN_AGENT=<any>` in the environment fails `logs what was seen together with where it was seen`, because the test inherits `process.env` and hard-codes `main`.
- D05: no test pins that `logRefusals` and the two `.husky` callers pass `--where`. Removing it would silently stop logging hook refusals.

## Notes

- A00: no plan exists for `concert-sign-up` or for the kaizen change. Files were taken from the diff.
- Could the hook runner pass the refused tool call (the command, or the file path for an edit) as the place, instead of the rule name? The refusal's `HookInput` holds it, and it is the place the sweep would want to look at again. This is the fix direction for A10, offered as a question.
- The kaizen commit is a `meta` change carried on a `pragma` pull request. The merge brought no `main` content, so the review scope was unaffected. Should it ship as its own pull request, so a later sweep finds it under its own title?

## Verdict: PASS_EXCEPT_UNVERIFIABLE
