# Friction inventory of PR #295

PR #295 turned on Sentry tracing in all six apps. Sources: the 10 lines
`scripts/kaizen.sh sweep-input da5dc76` printed from
`docs/features/meta/sentry-tracing-all-apps/kaizen.md`, the 3 lines the sweep
prompt pasted, the 14 commits, the two technical validation reports, the
operator context the prompt carried, and Sentry's prod spans after the deploy.
The PR has no review threads. Its 5 comments are the preview bot's.

Writers: `main` 4 lines, `technical-validator` 3, `talos` 2, `lll` 2,
`banana-rush` 1, `static-sites` 1. Every implementer logged under its label.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | Sentry React 11 sends browser spans as span v2 envelope items, so a counter reading `transaction.spans` reported zero. | kaizen 19:03 `static-sites` | knowledge: sentry-11-tracing-is-not-what-sentry-8-tracing-was |
| 02 | implementation | The brief's gate `pnpm exec oxlint apps/<app>` ran without type information and failed banana-rush's type-aware directives as unused. | kaizen 19:04 `banana-rush` | dantotsu: the-lint-gate-each-brief-retyped-without-its-flag. Three of four implementers logged it |
| 03 | implementation | The same false failure in last-loop-lepin, two directives, one preexisting. | kaizen 19:04 `lll` | merge into 02 |
| 04 | implementation | The same false failure in talos, and pragma fails it the same way. | kaizen 19:06 `talos` | merge into 02 |
| 05 | implementation | last-loop-lepin attached its error handler in `main.ts`, so `app.test.ts` never ran the 500 path through the request span. | kaizen 19:04 `lll` | fixed: 092905fb5. The new test also passes on the old wiring, because Hono's default answer is the same 500; what the move buys is that the tests and the Lambda run one app, as in the other three APIs |
| 06 | implementation | The talos agent believed Sentry 11 turns `postgresJsIntegration` on with any sample rate, and added a filter for it. | kaizen 19:06 `talos` | knowledge: sentry-11-tracing-is-not-what-sentry-8-tracing-was. False on `@sentry/aws-serverless`: its `init` installs no performance integration (measured with a local probe), so the filter removes nothing |
| 07 | implementation | A subagent left two talos test files unformatted, and only the pre-commit oxfmt gate caught it. | kaizen 19:07 `main` | no-op: the gate refused as designed and oxfmt prints its fix. The files were written outside Edit and Write, which `posttool-format-write.sh` watches. Formatting at commit would restage files in an index parallel agents share. This sweep hit it once too, and its implementer once more (row 26), so it is now the wall `unformatted-until-commit` in `docs/quality/working-conditions.md` |
| 08 | validation | Whether the bundled `postgres` driver yields database spans under Sentry 11 could not be checked, so spec use case 7 rested on an older SDK's measurement. | kaizen 19:14 `technical-validator` | dantotsu: the-database-span-the-bundle-could-not-emit, with ADR-2026-11-12T0008, which the operator chose. Measured this sweep: `span.op:db*` in prod returns nothing over 7 days, pragma included. A local probe found two causes, both needed: the integration is not installed, and the bundle lacks Sentry's esbuild plugin. Use case 7 holds in no app |
| 09 | validation | A back-e2e test with a hoisted `vi.mock` passed alone and failed in the suite, because `isolate: false` shares one module cache. | kaizen 19:14 `technical-validator`; report 1908 C02 and D07; commit bece68f92 | dantotsu: a-module-mock-in-a-shared-module-cache. The check found talos's `main.export.test.ts` with the same hazard |
| 10 | validation | Round 2 had to probe the GitHub API for a pull request body to read dismissals from, and no pull request existed yet. | kaizen 19:43 `technical-validator` | fixed: 56ee4ab4f |
| 11 | pr-description | The pre-push hook refused the branch twice for conflicting with `origin/main`. | prompt line 19:44 `hook:pre-push-conflict`; merge commit b1604e18a | no-op: the hook refused as designed and the branch merged main in, the convention the operator kept by closing PR #299 |
| 12 | pr-description | The ADR-2026-10-10T0457 rollout and the PR body assumed a preview proves tracing, but preview jobs get no DSN, so prod is the first place it runs. | prompt line 19:48 `main`; PR body *Gap* section | dantotsu: the-preview-that-could-not-prove-tracing |
| 13 | deploy | The session tried to merge beside base commits no CI run had tested with the branch. | prompt line 20:16 `hook:merge-on-moved-base`; merge commit 6fe49b2fa | no-op: the hook refused as designed and main was merged in before the merge |
| 14 | ci | A GitHub Actions incident left the `ci` run failed with ten jobs never started. | prompt context, githubstatus incident dvy0t3mvh1lg | no-op: a vendor outage, resolved 21:21 UTC, cleared by one re-run |
| 15 | post-merge | PR #299 proposed rebasing with `--force-with-lease` as the convention. | prompt context | no-op: the operator closed it; `docs/knowledge/a-rebase-cannot-see-what-a-merge-decided.md` already holds the reason |
| 16 | validation | Both rounds marked A00 UNVERIFIABLE because the feature had no `plan.md`. | reports 1908 A00 and 1930 A00 | no-op: `/technical-validation` step 2 says to continue without a plan, and the ADR's implementation pointers stood in. No finding depended on the plan |
| 17 | validation | No blueprint recorded pragma's request-tracing middleware, so the three copies carried no `@FollowsBlueprint`. | report 1908 B12 | fixed: bece68f92, in PR #295 |
| 18 | validation | Three wide-event tests asserted a span call their names did not state. | report 1908 B13 | fixed: bece68f92, in PR #295 |
| 19 | validation | banana-rush and talos had no test that their wide event carries `trace.id`. | report 1908 D08 | fixed: bece68f92, in PR #295 |
| 20 | validation | No stack test sets a DSN without a release. | report 1908 D19; commit 4b0a1a7c6 | no-op: dismissed in the commit with a checkable reason (CI always sets `GITHUB_SHA`), and round 2 kept it non-blocking |
| 21 | implementation | `scripts/reports.sh` was red on main: four dantotsus wrote `weak-point: none`, and five manifests lacked an external their adapters declare. | commit f1ce5a5dd | no-op: fixed in PR #295 with a parser test. The manifest check takes 21.6 s (measured), too slow for pre-commit, and maps build on operator dispatch by design. CLAUDE.md's step to run `scripts/reports.sh` caught it |
| 22 | conception | The last-loop-lepin site moved to Sentry 11 after the pull request opened, because Sentry 8 has no `dataCollection`. | commit a520bc862 | no-op: the ADR records the trade (+17.82 kB gzip), and deleting the `sentry8` catalog makes a two-version state impossible to reintroduce silently |
| 23 | post-merge | In the hour after the deploy, prod showed request spans from pragma-api only. | Sentry `search_traces`, 2026-11-11 23:10 UTC | merge into 12: prod is the first exercise, and the knowledge entry names the query to run once the other APIs get traffic |
| 24 | post-merge | The ADR the merge added still read `proposed`. | `docs/adr/2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md` | fixed: stamped `accepted` in this pull request, step 1c of the sweep |
| 25 | sweep | This sweep retyped a commit trailer by hand with the wrong session id, and commitlint refused it. | `KAIZEN.md` of this session | no-op: the commit-msg gate refused it as designed |
| 26 | sweep | The implementer of ADR-2026-11-12T0008 left two `infra/cdk` files unformatted, and the oxfmt gate refused the commit. | `KAIZEN.md` of this session | merge into 07 |
