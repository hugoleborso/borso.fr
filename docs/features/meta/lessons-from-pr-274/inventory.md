# Friction inventory for PR #274

PR #274 cleared every critical and high `pnpm audit` finding and moved
banana-rush, last-loop-lepin and pragma to zod 4. Sources: the archived log
[`../clear-audit-critical-high/kaizen.md`](../clear-audit-critical-high/kaizen.md)
(3 lines, all `main`, no subagents ran), the six lines logged after it, the
pull request's commits and checks, and the session itself. At the operator's
request, the session that shipped the PR ran this sweep, so its
judgement here is the least independent of any sweep.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `pnpm update -r --depth Infinity` moved almost nothing, 112 findings became 107 | kaizen line 1; transcript: audit before and after | knowledge: pnpm-keeps-a-locked-version-its-range-has-outgrown |
| 02 | implementation | The auto-installed `workbox-build` peer stayed at 7.4.0 under a `^7.4.1` range; an override and `--fix-lockfile` did not move it | transcript: `pnpm why -r serialize-javascript` | merge into pnpm-keeps-a-locked-version-its-range-has-outgrown |
| 03 | implementation | Taking `main`'s lockfile in the merge put 28 critical and high findings back | commit `1c167dcb8`; transcript: audit after merge | merge into pnpm-keeps-a-locked-version-its-range-has-outgrown |
| 04 | implementation | Zod 3 has no fix for GHSA-mrhx-c7xc-m3w5, so three APIs had to migrate, 138 pragma files import zod | PR #274 Decisions table | no-op: forced by the advisory and recorded as the PR's first decision |
| 05 | implementation | Zod 4 applies `.default()` inside `.partial()`; a patch would have reset every other field | kaizen line 2; 2 failing pragma core tests | dantotsu: a-major-upgrade-the-types-called-safe |
| 06 | implementation | Zod 4 `ZodError.issues` is non-enumerable, so the default 400 lost the field list the last-loop-lepin form reads | kaizen line 3; `node -e` serialisation probe | merge into a-major-upgrade-the-types-called-safe |
| 07 | implementation | Zod 4 `.uuid()` refused non-RFC fixture ids in session cookie tests | 3 failing pragma core tests | knowledge: zod-4-changes-what-an-api-accepts-and-answers |
| 08 | validation | Zod 4 JSON Schema pushed the MCP tool list to 19800 characters, over its 19000 budget | pragma e2e `tool-budget.test.ts` | fixed: 6250f706a (`compactInputSchema` drops the restated fields) |
| 09 | validation | Zod 4 messages broke five MCP refusal expectations | pragma back-e2e-assistants, 5 failures | merge into zod-4-changes-what-an-api-accepts-and-answers |
| 10 | implementation | 40 `no-deprecated` errors on zod 3 method forms | `scripts/lint-workspace.sh` in pragma and last-loop-lepin | no-op: the lint gate named each form and its replacement |
| 11 | implementation | `z.string().trim().email()` has no zod 4 form that trims first | transcript: members schema | merge into zod-4-changes-what-an-api-accepts-and-answers |
| 12 | implementation | `console.log` in a throwaway vitest probe printed nothing | transcript | no-op: a probe outside the repository; it wrote to a file instead |
| 13 | implementation | Stryker said "No tests were executed" for a `--mutate` file outside the config's globs | transcript: last-loop-lepin stryker run | no-op: middleware files sit outside the mutation gate by design, and its e2e test covers it |
| 14 | implementation | The new hook needed re-exports in six services to satisfy the controller import rule | oxlint `no-controller-imports-outside-service` | no-op: the rule named the fix, and it is the standard in `docs/standards/04-backend-architecture.md` |
| 15 | validation | The testcontainers 12 major bump ran nowhere: CI and `test:e2e` both set `DATABASE_URL` | `apps/last-loop-lepin/test/setup-postgres.ts`; `.github/workflows/ci.yml` line 266 | dantotsu: a-major-bump-to-a-path-nothing-ran |
| 16 | pr-description | The first body draft broke the 100-character Validation item limit | `check-pr-body.ts` output | no-op: the checker named the limit and the second draft passed |
| 17 | merge | pre-push refused the branch for conflicting with `main` (logged 3 times, one cause) | post-archive lines | no-op: the gate worked; the repeats were retries before the merge |
| 18 | merge | `git checkout --theirs` on banana-rush's manifest reverted its zod catalog switch | `ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC` | no-op: install refused it at once; a resolution shortcut, not a missing check |
| 19 | merge | commitlint refused a hand-written "Merge origin/main: …" subject | post-archive line | no-op: git's default merge subject is ignored by commitlint; the custom one was the cause |
| 20 | merge | Push and commit output sent to `/dev/null` | post-archive line, `no-swallowed-push` | no-op: the hook refused it and named the safe shape |
| 21 | merge | `main` gained new zod 3 code (`z.string().uuid()` in the realtime ticket) while the PR was open | merge commit `1c167dcb8` | no-op: `no-deprecated` caught it on the merge |
| 22 | post-merge | The merge hook said "tell the operator before merging" in a notice read after the merge ran | transcript of the merge call | dantotsu: a-warning-that-arrives-with-the-merge |
| 23 | process | No `/technical-validation` ran on a 102-file change | `docs/quality/feature-cost.md` row for #274 | no-op: the operator declined a gate on 2026-11-05, because validation on every API change is too slow; do not propose it again |
| 24 | process | The new middleware file carries no `@FollowsBlueprint` | `apps/last-loop-lepin/api/src/helpers/validation/invalid-input.middleware.ts` | no-op: no blueprint exists for the middleware layer, and `unhandled-error.middleware.ts` carries none either |
| 25 | post-merge | The sweep ran in the shipping session | operator's "just do it here" | no-op: the operator's call, stated at the top of this file |
