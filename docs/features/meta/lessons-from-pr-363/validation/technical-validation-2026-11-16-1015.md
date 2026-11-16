# Technical validation — Lessons from PR #363 (kaizen sweep)

- Spec: [`../inventory.md`](../inventory.md) (rows 03, 09, 10, 13, 18, 19)
- Plan: none (kaizen sweep, no plan by design)
- Branch: claude/lessons-from-pr-363
- Base: d37a4bcba014324b2d4ac63b4bced9015fe76703
- Run at: 2026-11-16T10:02:03Z
- Round: 2
- Reviewed: 6a333d80a2c30aff749ebd89abadcd8f8b8f1c58
- Touched workspaces: `scripts/`, `.claude/agents/`, `apps/pragma/api/src/songs/INVARIANTS.md` (documentation only), `docs/features/meta/`

Round 2 reads `git diff a4240be0b6dcdd5a3a5e477e18dc3498b1ed50ef..HEAD`, one commit (`6a333d80a`) touching four files. HEAD did not move during the review (checked at start and before the last probe). No merge commit sits above the base. The fix commit carries no new scope. 0 claims routed to /visual-validation.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Row 03 | "The script now checks every existing path it is given, and refuses the same stub with exit 1", for a path relative to the caller. | scripts/check-migration-sql-dsql-compat.sh:35,52-56 | `caller_dir=$PWD` (before the `cd` at line 36) / `case "$candidate" in` / `/*) ;;` / `*) candidate="$caller_dir/$candidate" ;;`. Measured with the stub `ALTER TABLE "songs" ADD COLUMN "x" text NOT NULL DEFAULT 'a';`: `stub.sql` from its folder exits 1 with two violations; `./stub.sql`, `../tech-validator-r2/stub.sql`, a path relative to `/`, an absolute path and a file name with a space all exit 1. | PASS |
| A02 | Row 03, pre-commit and CI callers unchanged | Pre-commit passes root-relative paths (`.husky/pre-commit:258-259`, hooks run at the work-tree root); CI calls with no argument (`ci.yml:81`). | scripts/check-migration-sql-dsql-compat.sh:47-49 | `scripts/check-migration-sql-dsql-compat.sh apps/banana-rush/api/src/database/migrations/0000_initial.sql` from the root exits 0; no-argument runs from the root and from `apps/pragma` exit 0. | PASS |
| A03 | Round-1 note on INVARIANTS | The chart label rule names its one home. | apps/pragma/api/src/songs/INVARIANTS.md:16-17,39 | `and an empty one is stored as null (\`normalizeChartLabel\` in` / `\`domain/chart-label.core.ts\`, which the site's save payload applies too).` / `Held by: \`domain/chart-label.core.test.ts\` › stores a blank label as no label`; the test exists at apps/pragma/domain/chart-label.core.test.ts:6 and `scripts/check-vocabulary-paths.sh` exits 0. | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A02 (blocking): a stub passed by a relative path from a scratch folder was skipped, exit 0 | `6a333d80a` scripts/check-migration-sql-dsql-compat.sh:35,52-55. Same reproduction as round 1 (`cd <scratch> && …/check-migration-sql-dsql-compat.sh stub.sql`) now exits 1 and names the file. | PASS |
| R02 | B15 (non-blocking, fixed): the agent doc said the working tree holds the reviewed SHA right after saying the branch may move | `6a333d80a` .claude/agents/technical-validator.md:150 `Run tests and probes in the working tree, and check \`git rev-parse HEAD\` still prints the recorded SHA before you trust a run`. The contradiction is gone. | PASS |
| R03 | D06 (non-blocking), dismissed in the commit message: "the shell gates carry no test suite, as docs/knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md records" | Claim checked with `ls scripts/*.test.ts` and a read of each. Failing case: four shell gates already have Vitest suites that copy the gate into a temporary repository and run it on fixtures. `scripts/check-docs-are-english.test.ts:41` `execFileSync(join(directory, 'scripts', GATE), paths, { cwd: directory, stdio: 'pipe' });` drives `check-docs-are-english.sh` with paths as arguments, the same shape a test of this script needs. `scripts/check-adr-gates.test.ts:7` `const GATES = ['check-adr-numbers-resolve.sh', 'check-adr-criteria.sh'] as const;` and `scripts/check-vocabulary-paths.test.ts:7` `const GATE = 'check-vocabulary-paths.sh';` do the same. The knowledge entry the dismissal cites is stale on this point ("none of them has a test"). The false reason would ship in the history. Fix: a `scripts/check-migration-sql-dsql-compat.test.ts` on the `check-docs-are-english.test.ts` pattern, planting the stub outside the migrations folder by a relative path and asserting exit 1, or a dismissal with a true reason. | FAIL (blocking) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | oxlint | no `.ts`/`.tsx`/`.js` file in the round-2 diff; nothing for oxlint to read | PASS |
| B02 | Shell syntax | `bash -n scripts/check-migration-sql-dsql-compat.sh` | exit 0. `shellcheck` is not installed in the sandbox (`command -v shellcheck` prints nothing). `$candidate` and `$caller_dir` are quoted at lines 52, 54, 56. | PASS |
| B03 | Names carry intent | read the script hunk | `caller_dir`, `candidate` | PASS |
| B04 | Document links | `pnpm exec tsx scripts/docs/check-doc-links.ts` on the three changed `.md` files | exit 0, `every document link names a file that exists` | PASS |
| B05 | Standards checklist: 01 "an invariant promising behaviour carries a `Held by:` line" | read apps/pragma/api/src/songs/INVARIANTS.md in full | the label bullet is held by `domain/chart-label.core.test.ts › stores a blank label as no label` (line 39) and the existing controller test (line 36) | PASS |
| B06 | Standards checklist: 14 "a new check in `.husky/pre-commit` declares a scope … and a whole-tree run" | .husky/pre-commit:258-259 | no new check; the call and its scope are unchanged | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma core | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed a4240be0b6dcdd5a3a5e477e18dc3498b1ed50ef --reporter=verbose` | 0, no test file run. Expected: the round-2 diff changes no TypeScript and no config, only an `INVARIANTS.md`, a shell script, an agent document and a report. Round 1's C01 to C03 ran on every gated file, and none changed since. | PASS |
| C02 | `scripts/` shell gate | probes in A01 and A02 | the fixed branch exits 1 on the stub by every path form tried, and 0 on the real tree | PASS |
| C03 | `vocabulary-paths` gate on the changed INVARIANTS.md | `scripts/check-vocabulary-paths.sh` | 0 | PASS |
| C04 | Mutation | not run | no gated `.core`, `.utils` or `.adapter` file in the round-2 diff | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Row 03: the script reads a path outside the migrations folder, given relative to the caller | (none found). The round-1 D06 finding was dismissed; R03 grades the dismissal. Failing case unchanged: reverting lines 52-55 leaves every test green. | FAIL (non-blocking), graded through R03 |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write, per-process state | the round-2 diff touches no `apps/` source file; only `INVARIANTS.md` under `apps/` | PASS |

## Blocking findings

- R03 — the commit dismissing D06 says the shell gates carry no test suite, but `check-docs-are-english.sh`, `check-vocabulary-paths.sh`, `check-adr-numbers-resolve.sh` and `check-adr-criteria.sh` each have one under `scripts/`, so the dismissal's reason is false. Add the test or give a true reason.

## Non-blocking findings

- D01 — no test pins row 03's fix (same as round-1 D06).

## Notes

- docs/knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md still says none of the shell gates has a test and that driving one against a fixture is hard. Four suites under `scripts/` do exactly that. Should the entry be corrected in this sweep, since it misled this branch's dismissal?
- A path that does not exist is still skipped with exit 0 (`scripts/check-migration-sql-dsql-compat.sh nope.sql` exits 0, measured). Round 1 raised this as a question. Should a missing argument be reported, so a typo cannot pass, given that pre-commit's staged deletions would then need filtering out first?
- The agent doc's new line tells the validator to check HEAD before trusting a run but not what to do when HEAD moved. Is "rerun on the recorded SHA or report the move in the preamble" intended?

## Verdict: FAIL
