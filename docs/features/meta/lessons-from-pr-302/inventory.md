# Friction inventory of PR #302

PR #302 was the kaizen sweep of PR #295. It grew into ADR-2026-11-12T0008,
which bundles every API Lambda with Sentry's esbuild plugin, and into
isolated back-e2e files in all four full-stack apps. Sources: the 12 lines
`scripts/kaizen.sh sweep-input f53baed` printed from
`docs/features/meta/lessons-from-pr-295/kaizen.md`, the 2 lines the sweep
prompt pasted, the 25 squashed commits, the two technical validation reports
of the sweep, the operator context the prompt carried, Sentry's prod spans and
the deploy run of the merge. The PR has no review threads. Its 5 comments are
the preview bot's, each now saying Sentry is off on the preview, which is
PR #302's own fix at work.

Writers: `main` 5 lines (2 pasted), `technical-validator` 4, `implementer` 2,
`fixer` 1, `hook:commitlint` 1, `hook:api-validation` 1. The implementer and
the fixer logged under their labels.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | commitlint refused a commit whose trailer was retyped by hand with the wrong session id. | kaizen 23:15 `hook:commitlint`, 23:16 `main` | no-op: the commit-msg gate refused as designed, and PR #295's inventory row 25 already records this same event |
| 02 | implementation | — | kaizen 23:16 `main` | merge into 01 |
| 03 | pr-description | The pull request opened while it changed an API and had no technical validation report. | kaizen 23:22 `hook:api-validation`; report `technical-validation-2026-11-11-2322.md` | no-op: the hook refused as designed and the report was written the same minute |
| 04 | validation | The validator got the parent feature's spec for a kaizen branch and had no named source for category A, so it built rows from the inventory on its own. | kaizen 23:27 `technical-validator` | fixed: `/technical-validation` step 2 now passes a sweep's `inventory.md` as `spec_path`, whose `fixed:` and `dantotsu:` rows are the claims |
| 05 | validation | The absent plan forced A00 UNVERIFIABLE on a branch that has no plan by design, in both rounds. | kaizen 23:27 `technical-validator`; reports 2322 and 0020, A00 | merge into 04: the skill passes no `plan_path` for a sweep, and the agent writes no plan row then |
| 06 | implementation | An app bundle importing `postgresJsIntegration` holds the `orchestrion:postgres` channel names without the plugin, so grepping it proves no rewrite. | kaizen 00:02 `implementer` | knowledge: sentry-11-tracing-is-not-what-sentry-8-tracing-was, extended, with `orchestrion:postgres` as a trigger. The merged test already bundles a fixture with no Sentry import |
| 07 | implementation | `infra/cdk`'s `lib` was ES2022, so `toSorted` failed typecheck while Vitest ran it. | kaizen 00:02 `implementer` | fixed: `lib` is ES2023 in `infra/cdk` and every `tsconfig.cdk.json`, which all run on Node 22. A scratch file with `toSorted` fails `tsc --lib ES2022` with TS2550 and passes with ES2023 (measured) |
| 08 | implementation | The implementer left two `infra/cdk` files unformatted, the third time in PR #295's work. | kaizen 00:08 `main` | no-op: PR #302 added the wall `unformatted-until-commit` for it, and this line is counted there. The oxfmt gate refused as designed |
| 09 | validation | The round-2 rule graded a false dismissal of a non-blocking finding as blocking, against the agent's own "what breaks if it ships" test. | kaizen 00:21 `technical-validator`; report 0020 R02 | fixed: the agent states the exception beside the test. The false reason is what ships, in the history, so it stays blocking |
| 10 | validation | No harness runs a bundled API against a real Sentry client and Postgres, so checking a span's content took hand-built probes. | kaizen 00:21 `technical-validator`; report 0020 A08, D08 | no-op: the end-to-end proof is prod's `span.op:db*` search, which the origin session scheduled for 03:15 UTC. `infra/cdk`'s tests have no Postgres, and building one for this alone adds a harness that only guards a probe |
| 11 | validation | The screens-shown stop hook blocked a turn that compared probe outputs before and after a fix. | kaizen 00:26 `main` | dantotsu: the-guard-that-read-before-and-after-as-screens |
| 12 | implementation | `@sentry/aws-serverless` 11 does not export `StreamedSpanJSON`, so a `beforeSendSpan` callback is typed through `init`'s parameters. | kaizen 00:32 `fixer` | knowledge: sentry-11-tracing-is-not-what-sentry-8-tracing-was, extended, with `StreamedSpanJSON` as a trigger |
| 13 | post-merge | The hook blocked a second turn for a bare "before and after" about probe text, and auto mode refused narrowing the hook as self-modification. | prompt line 00:38 `main` | merge into 11. This sweep edited the hook with no refusal (measured), so no operator action is needed |
| 14 | post-merge | The hook blocked a third turn for the phrase inside a quoted kaizen prompt, since blockquotes were not skipped. | prompt line 01:13 `main` | merge into 11 |
| 15 | validation | Round 2 failed on three blocking findings (SQL in database spans, no test of span content, a false dismissal), fixed after it without a third review. | report 0020, verdict FAIL; PR #295 inventory rows 27 and 28 | no-op: two rounds is the cap by design, the fixes and their measurements are in the commits, and row 10's prod check is what verifies them |
| 16 | validation | The first eradication of the shared module cache was a lint rule with an exemption list kept by hand, which drifted within the hour and which the operator rejected. | commit message of f53baed, `refactor(meta): isolate back-e2e test files` | no-op: `/dantotsu` now says a list kept by hand is not an eradication, and the list is gone |
| 17 | validation | Isolating back-e2e files raised last-loop-lepin's suite from 5.1 s to 22.0 s and pragma's from 114 s to 173 s, almost all module import. | same commit message (measured there) | no-op: the operator chose isolation over a shared cache in PR #302. Cutting the import cost is an architecture decision, raised in the pull request's *Patterns* |
| 18 | post-merge | Prod held no database span at 01:16 UTC: the merge's deploy was still running, and `span.op:db*` over 12 hours returned nothing. | Sentry `search_traces` at 01:16 UTC; deploy run 43133117565 `in_progress` | no-op: unknown until the deploy ends and the origin session's 03:15 UTC check runs. Not concluded here |
| 19 | post-merge | ADR-2026-11-12T0008, merged by PR #302, still read `proposed`. | `docs/adr/2026-11-12T0008-api-lambdas-bundle-with-sentrys-esbuild-plugin.md:3` | fixed: stamped `accepted` in the file and the index, step 1c |
| 20 | sweep | `/technical-validation` still told the agent to remind the operator to approve the `prod` environment, which has no reviewer gate. | `.claude/skills/technical-validation/SKILL.md`, *Post-merge* section; `.github/workflows/deploy.yml:107` "no reviewer gate" | fixed: the section is deleted |
| 21 | sweep | `search_traces` with a natural-language query and no `organizationSlug` sent the sentence to Sentry verbatim and found nothing. | `KAIZEN.md` of this session | no-op: the second call with `span.op:db*` and the slug worked. One call, no reader to warn |
| 22 | post-merge | The origin session sat waiting on an `AskUserQuestion` after the merge. | `get_session` at 01:16 UTC, status `need_input` | no-op: CLAUDE.md asks for the kaizen proposal after a merge, and this sweep is its answer |
