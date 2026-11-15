# Technical validation — The glossary stays in VOCABULARY.md and each term's rules move to an INVARIANTS.md in its folder

- Spec: ADR-2026-11-15T0628, [`../../../../adr/2026-11-15T0628-glossary-and-invariants-are-two-files.md`](../../../../adr/2026-11-15T0628-glossary-and-invariants-are-two-files.md)
- Plan: none (plan absent; files taken from the diff)
- Branch: claude/vocabulary-invariants-split
- Base: 4ef620ab088eafb1e101a3a36ecec8d77505631c
- Run at: 2026-11-15T06:39:06Z
- Round: 1
- Reviewed: e428b38ffa8575f846d609fd6136d13e7be38620
- Touched workspaces: root (`scripts/`, `.husky/`, `.github/`, `.claude/`, `docs/`, `CLAUDE.md`), markdown in all six `apps/<app>/`, `@borso-app/last-loop-lepin` (one JSDoc line)

Spec is ADR-2026-11-15T0628. Category A is built from each sentence of *Decision*, each bullet of *Consequences*, and the operator's three extra requirements: every rule and `Held by` line survives, every reader is updated, and the gate keeps checking every `Held by` line. No `git rev-list --merges` commit sits above the base. 0 use cases routed to /visual-validation, because this change has no screen. The gate was exercised by hand. HEAD was exported with `git archive` into the scratchpad, `git init` was run without staging, and each mutation was run on its own (11 cases, listed in A04 and A14). Before/after line comparisons were made between `git show <base>:apps/<app>/VOCABULARY.md` and the concatenation of the current `VOCABULARY.md` plus every `INVARIANTS.md` of the app.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `plan_path: none` | UNVERIFIABLE |
| A01 | Decision | "A glossary per application in `apps/<app>/VOCABULARY.md`" with no rules | scripts/check-vocabulary-paths.sh:105-110 | `fail "$glossary carries a Held by line; it belongs in the INVARIANTS.md of the term's folder: $held_by"`. The gate exits 0 on HEAD, so no glossary carries a `Held by` line or a rule bullet | PASS |
| A02 | Decision | Rules go "in an `INVARIANTS.md` in the folder its `Lives in:` line names" | 170 `Invariants:` lines across apps/*/VOCABULARY.md | Each `Invariants:` path was compared with the first `Lives in:` path, or its directory when that path is a file. 0 mismatches. The one report, borso-fr *Entry point* (`vite.config.ts` → `INVARIANTS.md`), is `./` written as empty | PASS |
| A03 | Decision | "a repository glossary in `docs/VOCABULARY.md` that also maps every application glossary" | docs/VOCABULARY.md:13-20 | `## Glossaries` … `- [banana-rush](../apps/banana-rush/VOCABULARY.md)` … `- [talos](../apps/talos/VOCABULARY.md)`, which covers all six apps that `ls apps/` lists | PASS |
| A04 | Decision | "the gate fails when that file lacks the term's section, when a section has no term pointing at it, and when a glossary carries a `Held by` line or a rule bullet" | scripts/check-vocabulary-paths.sh:113-123, 149-152 | Each mutation on the exported tree exits 1. **held-in-glossary**: `apps/pragma/VOCABULARY.md carries a Held by line…`. **rule-bullet-in-glossary**: `…carries a rule in a term…: 24: - One address may register ten clients an hour.`. **missing-section**: `…sends Assistant client to api/src/oauth/INVARIANTS.md, which has no section ## Assistant client`. **drop-invariants-line**: `…holds rules for Assistant client, and no term of apps/pragma/VOCABULARY.md sends its reader here` | PASS |
| A05 | Consequences | "pragma's glossary falls from 2,028 to 871 lines, and the six from 3,839 to 2,068" | apps/*/VOCABULARY.md | `wc -l`: base pragma 2028. HEAD: pragma 871, and 129+213+366+242+871+247 = 2068 | PASS |
| A06 | Consequences | "an agent touching `api/src/oauth/` reads 45 lines of rules" | apps/pragma/api/src/oauth/INVARIANTS.md | `wc -l` → `45` | PASS |
| A07 | Consequences | "77 new `INVARIANTS.md` files" | — | `git ls-files 'apps/*INVARIANTS.md' \| wc -l` → `77` | PASS |
| A08 | Consequences | "the gate costs 0.22 s per run" | scripts/check-vocabulary-paths.sh | `time ./scripts/check-vocabulary-paths.sh` → `real 0m0.221s`, exit 0 | PASS |
| A09 | Consequences | "definitions were moved, not rewritten" | all apps/*/VOCABULARY.md and INVARIANTS.md | The non-blank lines present after and absent before are only `## <term>` headings repeated in INVARIANTS.md, `Invariants:` lines, the three boilerplate lines of each file header, the six-line glossary pointer, and one rewritten relative link | PASS |
| A10 | Operator | Every rule line at base still exists | per-app sorted multiset, `comm -23 before after` | 0 missing lines for banana-rush, borso-fr, borsouvertures, last-loop-lepin and talos. Pragma has 1, and it is the same link with its path deepened: `[ADR-2026-09-15T2023](../../../../../docs/adr/2026-09-15T2023-spotify-track-ids-resolved-by-isrc-at-link-time.md)` at apps/pragma/api/src/songs/INVARIANTS.md:70. `check-doc-links.ts` exits 0 | PASS |
| A11 | Operator | Every `Held by` line at base still exists, under its rule | per-app `grep '^\s*Held by:' \| sort`, before vs after | The multisets are identical in all five apps that have any. Counts are 3+34+3+302+4 = 346, matching the ADR's "346 of 346". Of the (preceding line, `Held by`) pairs, all are unchanged except 3 groups, and in each of those the preceding line was a glossary-only `Not to be confused with` line or a definition paragraph that stayed in the glossary (e.g. apps/pragma/site/src/routes/band/INVARIANTS.md:8-14 keeps the **Tasks** rule directly above its three `Held by` lines) | PASS |
| A12 | Operator | Everything that reads these files is updated in the same branch | CLAUDE.md:42; .claude/skills/specification/SKILL.md:99; .claude/skills/technical-validation/standard.md:65; .claude/agents/technical-validator.md:87; docs/standards/01-naming.md:216-243, 309-321; docs/standards/14-tool-runtime-budgets.md:207; docs/adding-an-app.md:46; docs/adding-a-fullstack-app.md:21, 90-91; .husky/pre-commit:264-280; .github/workflows/ci.yml:114-117; scripts/wiki/wiki-pages.core.ts:89; apps/last-loop-lepin/api/src/punch/punch.schema.ts:18 | CLAUDE.md:42 `…and the `INVARIANTS.md` of each folder you change before changing its rules. Repository terms are in `docs/VOCABULARY.md`.` A `git grep -n -e VOCABULARY -e 'Held by'` over everything except features, ADRs and dantotsus finds no other reader that still sends rules to VOCABULARY.md. `scripts/dependencies/check-only-change.core.ts:6` classes `INVARIANTS.md` as tooling through `\.md$` | PASS |
| A13 | Operator | The gate keeps checking every `Held by` line | scripts/check-vocabulary-paths.sh:130-136, 155-171, 178-181 | It reads `git ls-files --cached --others --exclude-standard -- 'apps/*/INVARIANTS.md'`, which lists 77 files, and each `/^Held by:/` line becomes a `held` record. Mutations exit 1: **broken-title** `…holds an invariant with a test api/src/oauth/oauth.controller.test.ts does not have: registers the clientsZ…`, **broken-file** `…with api/src/oauth/oauthX.controller.test.ts, which is not in apps/pragma`, **indented-held** `…has an indented Held by line…`, **bad-lives-in** `apps/pragma/VOCABULARY.md points at api/src/nope/, which is not in apps/pragma` | PASS |
| A14 | ADR Context ("every one of those checks has to survive the change") | The comment-citation check still refuses a rule sourced from a comment | scripts/check-vocabulary-paths.sh:47, 131-137 | `COMMENT_CITATION='(file )?header (names\|says\|records\|states)\|the comment (above\|beside\|on)\b'` is passed as `awk -v citation="$COMMENT_CITATION"`, and `-v` turns `\b` into a backspace character, so the `the comment …` alternative never matches. **Failing case:** change apps/pragma/api/src/oauth/INVARIANTS.md:8 to `- As the comment above says, registers itself…` and the gate exits 0 with `every term names a folder that exists…`. At base, the same line in `apps/pragma/VOCABULARY.md` was refused, because `grep -nEi` honours `\b` (`printf 'as the comment above says' \| grep -nEi '<pattern>'` → `1:as the comment above says`). The `header names` alternative still fails (mutation **header-citation**, exit 1). The check guards docs/dantotsus/a-comment-decayed-and-took-the-vocabulary-with-it.md, and all 2,799 lines of moved rules have lost half of it. Introduced: this branch. Fix size: one line (pass the pattern without `\b`, or grep the invariants files) | FAIL (blocking) |
| A15 | Implementation pointers (`.husky/pre-commit`) | The commit hook runs the gate when an INVARIANTS.md, a glossary or a held test changes | .husky/pre-commit:271-280 | The rebuilt `held_tests` lists 129 paths, the same number as the distinct `apps/<app>/<test>` paths in base `Held by` lines. Scope matches `M apps/pragma/api/src/oauth/INVARIANTS.md`, `A apps/talos/api/src/x/INVARIANTS.md`, `M docs/VOCABULARY.md`, `M apps/pragma/api/src/oauth/oauth.controller.test.ts` and `M apps/talos/api/src/agent/agent-page.controller.test.ts`, and skips `M apps/pragma/api/src/oauth/oauth.core.ts` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware scripts/wiki/wiki-pages.core.ts apps/last-loop-lepin/api/src/punch/punch.schema.ts` | exit 0, no diagnostics | PASS |
| B02 | knip clean | `pnpm knip` | exit 0 (only the standing `.css` compiled-extension notices) | PASS |
| B03 | No `any`, assertions limited to `as const` / `as unknown` | read the two changed TS hunks | The changes are a string tuple `['docs/VOCABULARY.md', 'Vocabulary'],` (wiki-pages.core.ts:89) and one `@BlueprintDescription` sentence (punch.schema.ts:18). Neither has `any` or `as` | PASS |
| B04 | `noUncheckedIndexedAccess` honoured | read hunks | no index access added | PASS |
| B05 | Names carry intent / function names describe result | sampled the new shell functions | `read_glossary`, `check_lives_in`, `check_glossary`, `read_invariants`, `check_invariants`, `refuse_comment_citations`, maps `term_owner` and `invariants_section`. None is abbreviated | PASS |
| B06 | No prose comments (`borso/no-comments`) | read hunks | punch.schema.ts:18 edits a `@BlueprintDescription` tag, which `scripts/reports.sh blueprints` reads by machine. No new comment in TS | PASS |
| B07 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed .ts/.tsx | none found | PASS |
| B08 | Standards checklist (14-tool-runtime-budgets.md:273): "a new check in `.husky/pre-commit` declares a scope naming everything it reads, including `^D ` when a removal can break what it checks" | read .husky/pre-commit:278-280 against check-vocabulary-paths.sh:185 | `"^. (apps/[^/]+/VOCABULARY\\.md\|apps/.+/INVARIANTS\\.md\|docs/VOCABULARY\\.md)\$\|^D apps/…"`. The gate now also reads the `Lives in:` paths of docs/VOCABULARY.md (`.husky/`, `CLAUDE.md`, `.claude/skills/route/`, `.claude/skills/after-task-kaizen/`, `scripts/kaizen.sh`, `scripts/reports.sh`, `docs/…`), but the scope has `^D ` only under `apps/`. **Failing case:** a commit that stages `D .claude/skills/route/SKILL.md` and the rest of that folder skips the check (tested against the scope regex: `skip D .claude/skills/route/SKILL.md`). The gate would then fail on `docs/VOCABULARY.md points at .claude/skills/route/`, but only in CI (ci.yml:117 runs the whole tree). Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B09 | Standards checklist (14-tool-runtime-budgets.md:273): fits the budget, whole-tree run in `ci.yml` | `time` on HEAD; ci.yml:117 | `real 0m0.221s`; `- run: ./scripts/check-vocabulary-paths.sh` | PASS |
| B10 | Standards checklist (01-naming.md:317): "a definition in a `VOCABULARY.md` and a rule in an `INVARIANTS.md` are still true" | A09/A10 show the moved text is verbatim; read docs/VOCABULARY.md in full against the files it names | The moved text is unchanged from base, so the branch makes no new claim there. New claims were checked against their sources: *Friction log* `KAIZEN.md` = scripts/kaizen.sh:68 `KAIZEN_FILE="$(main_checkout)/KAIZEN.md"`. *Kaizen* "labelled `kaizen`" = .claude/skills/after-task-kaizen/SKILL.md:12 `Output is always a PR labelled kaizen`. *Tier* "from 0 … to 3" = .claude/skills/route/SKILL.md:28,44. *Dantotsu* "guild's template" = docs/dantotsus/README.md:4 | PASS |
| B11 | Standards checklist (01-naming.md:320): "an invariant promising behaviour carries a `Held by:` line" | Held-by multiset (A11) | No `Held by` line was dropped or detached from its rule. Rules that lacked one at base were not in this branch's scope to add | PASS |
| B12 | Standards checklist (01-naming.md:339): a file name says what it holds | file names | `INVARIANTS.md` holds invariants and `VOCABULARY.md` a glossary, as docs/standards/01-naming.md:216-231 defines | PASS |
| B13 | CLAUDE.md *Writing*: "Use no long-dash character" | `git diff <base>...HEAD -U0 \| grep '^+' \| grep -c '—'` → 86 | `# Invariants — pragma, `api/src/oauth`` at apps/pragma/api/src/oauth/INVARIANTS.md:1, the same heading in all 77 INVARIANTS.md, and `# Vocabulary — the repository` at docs/VOCABULARY.md:1. Introduced: this branch. Fix size: 78 files, one `sed` | FAIL (non-blocking) |
| B14 | Other gates the touched paths fall under | `scripts/docs/check-doc-links.ts`, `check-named-paths-exist.sh`, `check-dated-records-are-append-only.sh`, `check-adr-numbers-resolve.sh`, `check-adr-criteria.sh`, `check-instructions-name-installed-tools.sh <changed .claude/docs/standards md>`, `check-no-racy-pipelines.sh <changed sh>`, `check-no-null-bytes.sh`, `bash -n .husky/pre-commit` | all exit 0 | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | root (`scripts/`) | `pnpm exec vitest run --changed $(git rev-parse 4ef620ab…) --reporter=verbose` then the same with `--coverage` | 0. It ran `scripts/wiki/wiki-pages.core.test.ts` (30 tests), and coverage is 100% statements, branches, functions and lines | PASS |
| C02 | root (`scripts/`) | `scripts/mutate-changed.sh <base-sha> scripts/wiki/wiki-pages.core.ts` | 0. 221 killed, 0 survived, 0 no coverage | PASS |
| C03 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin exec vitest run --project core --changed <base-sha> --reporter=verbose` | 0. It ran `api/src/punch/punch.schema.test.ts` (13 tests) | PASS |
| C04 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run test:e2e --changed <base-sha> --reporter=verbose` | 0. 21 files, 126 tests (e.g. `api/src/runner/runner.service.test.ts`) | PASS |
| C05 | `*.utils.ts` in touched workspaces | `git diff --name-only <base>...HEAD \| grep utils` | none changed. No `*.utils.ts` is touched, and the root `vitest.config.ts` runs `scripts/` tests | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Decision: a glossary carrying a `Held by` line fails the gate | (none found). `git grep -l check-vocabulary-paths -- '*.test.*'` is empty, while the repo tests other shell gates this way (scripts/check-adr-gates.test.ts). Behaviour verified by hand only (A04) | FAIL (blocking) |
| D02 | Decision: a glossary term carrying a rule bullet fails the gate | (none found) | FAIL (blocking) |
| D03 | Decision: a term whose `Invariants:` file lacks its section fails the gate | (none found) | FAIL (blocking) |
| D04 | Decision: an INVARIANTS.md section no term points at fails the gate | (none found) | FAIL (blocking) |
| D05 | Operator: every `Held by` in an INVARIANTS.md is still checked (missing file, missing title, malformed, indented) | (none found). The check predates the branch, but the branch rewrote its reader from grep over VOCABULARY.md to awk over 77 files | FAIL (blocking) |
| D06 | ADR context: a rule sourced from a comment is refused in an INVARIANTS.md | (none found). A test would have caught A14 | FAIL (blocking) |
| D07 | ADR context: a `Lives in:` path that is gone fails the gate, in an app glossary and in docs/VOCABULARY.md (base `.`) | (none found) | FAIL (blocking) |
| D08 | Consequences: "the repository glossary lists every application glossary" | (none found). Nothing fails when a seventh `apps/<new>/VOCABULARY.md` ships without a line under `## Glossaries` in docs/VOCABULARY.md. The only guard is prose (docs/adding-an-app.md:46) | FAIL (non-blocking) |
| D09 | Operator: every rule and `Held by` line at base survives | **structural:** a one-time migration claim, measured in A10/A11 (0 lines missing, 346 = 346 `Held by`). From here on it is held by the orphan-section check (check-vocabulary-paths.sh:149-152) and the `Held by` check (:155-171) | PASS |
| D10 | Implementation pointers: the commit hook fires on INVARIANTS.md, glossary and held-test edits | (none found) for .husky/pre-commit:271-280. ci.yml:117 runs the whole tree regardless | FAIL (non-blocking) |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write / per-process state | `git diff <base>...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty. The two TS hunks are a constant tuple entry (wiki-pages.core.ts:89) and a JSDoc sentence (punch.schema.ts:18). No module-level `let`, `Map` or `Set` is added | PASS |

## Blocking findings

- A14: `awk -v citation=…` turns the `\b` of `COMMENT_CITATION` into a backspace, so `the comment above says` in an INVARIANTS.md passes the gate. At base the same line in VOCABULARY.md was refused.
- D01: no test makes the gate fail on a `Held by` line in a glossary.
- D02: no test makes the gate fail on a rule bullet in a glossary.
- D03: no test makes the gate fail on a missing INVARIANTS.md section.
- D04: no test makes the gate fail on an orphan INVARIANTS.md section.
- D05: no test covers the rewritten `Held by` check over INVARIANTS.md files.
- D06: no test covers the comment-citation refusal in INVARIANTS.md. Such a test would have caught A14.
- D07: no test covers the `Lives in:` check for app glossaries and docs/VOCABULARY.md.

## Non-blocking findings

- B08: the pre-commit scope has `^D ` only under `apps/`, but docs/VOCABULARY.md now names `Lives in:` paths in `.claude/`, `.husky/`, `scripts/` and `docs/`. A deleted skill folder is caught in CI, not at commit.
- B13: 78 new headings use the long-dash character that CLAUDE.md *Writing* forbids (`# Invariants — <app>, …`, `# Vocabulary — the repository`).
- D08: nothing checks that docs/VOCABULARY.md lists every application glossary.
- D10: the new pre-commit scope regex has no test.

## Notes

- A00: no plan exists for this meta change. Files were taken from the diff. Rows that needed a plan were built from the ADR instead.
- apps/talos/api/src/memory/INVARIANTS.md:8 holds `Held by: `api/src/agent/agent-page.controller.test.ts` › stores no computed line…` directly under the heading, before the rule bullets. The claim it held at base ("…never stored") stayed in the glossary definition at apps/talos/VOCABULARY.md:111. Should the invariants file restate "never stored" so the `Held by` line sits under the rule it holds?
- In the moved INVARIANTS.md files, `Held by:` lines follow the last bullet with no blank line (e.g. apps/pragma/site/src/routes/band/INVARIANTS.md:11-12). CommonMark reads them as lazy continuation of that bullet. The gate is unaffected, because it reads raw lines. Is the rendered form wanted?
- The glossary's rule refusal reads only `- ` bullets in sections with a `Lives in:` line (check-vocabulary-paths.sh:85-95). A rule written as a prose paragraph, a `* ` bullet or a numbered item stays in the glossary unrefused. Is that boundary intended, as the ADR's "a rule bullet" wording suggests?
- The ADR is `Status: proposed`. Merging it as the decision is the operator's call.

## Verdict: FAIL
