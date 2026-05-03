---
date: 2026-05-02
introduced-at: implementation
detected-at: ci
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: 10f3f10
time-to-detect: minutes (first preview deploy attempt in CI)
tags: [pnpm, ci, github-actions]
---

# `deploy` and `destroy` are pnpm built-ins, not script names

## Symptom

The first preview deploy of `borso-fr` failed in CI in 23 s. The
`preview.yml` step
`run: pnpm --filter "@borso-app/borso-fr" deploy` appeared to
execute, but the package's `scripts.deploy` (`pnpm build && cdk
deploy --all ...`) never ran. `cdk` never ran. No CFN change. No URL.

User impact: every PR's preview was broken on first push. Hugo
spent half an hour debugging "is OIDC misconfigured?" before
spotting the actual cause.

## Root-cause chain

1. **Why?** The package's deploy script didn't run.
   Because `pnpm <name>` consults pnpm's built-in command table
   *before* falling through to scripts. `deploy` is one of those
   built-ins.
2. **Why does pnpm have a built-in named `deploy`?**
   It copies a workspace package and its production deps into a
   deployable bundle (intended for things like Docker container
   builds).
3. **Why does that built-in take precedence over a user script?**
   pnpm gives built-ins priority so adding a script named `install`
   (or `update`, etc.) in your `package.json` doesn't accidentally
   shadow a critical command.
4. **Why doesn't pnpm warn when a script is shadowed?**
   Built-in commands take silent precedence; the user-facing
   `package.json` script is simply unreachable via the bare name.
   Same hazard applies to `destroy` (also a pnpm built-in,
   companion to `deploy`).
5. **Why were the scripts named `deploy` / `destroy` in the first
   place?**
   Convention from CDK projects: `cdk deploy` / `cdk destroy` are
   the verbs CDK uses, so `pnpm deploy` reads naturally for an
   operator. We didn't realise the collision until CI failed.

**Root cause:** we thought `pnpm <pkg> deploy` would run the
package's `scripts.deploy`. Actually pnpm's built-in `deploy`
command (which copies a workspace package into a deployable bundle)
shadows it.

## Detection failure causes

- **Typing:** package.json scripts aren't typed.
- **Linter:** no rule for "pnpm script names colliding with built-ins".
- **Functional validation locally:** locally we ran `pnpm --filter
  ... run deploy` (with `run`) by reflex, which dodges the trap.
  Hugo only realised CI was different when it failed.
- **CI:** CI is where this surfaced — the first run of
  `preview.yml` against a real PR.
- **Code review:** the bare command reads as natural; reviewer
  would need to have hit the trap before to notice.

## Countermeasure

- **Code:** commit `10f3f10` — every CI workflow now invokes
  `pnpm --filter <pkg> run deploy` (and same for `destroy`). The
  `run` keyword forces script lookup and bypasses built-in
  resolution. Affected: `preview.yml`, `deploy.yml`,
  `cleanup-orphans.yml`, `shared-deploy.yml`.

## Eradication

- **Sibling defects swept:** every `pnpm --filter ... <verb>` in the
  repo audited. All deploy/destroy/sync/install verbs that overlap
  with pnpm built-ins are now `pnpm run <verb>`.
- **Tooling change:** captured the rule in CLAUDE.md ("Always use
  `pnpm run <script>` for `deploy` / `destroy` (and any name pnpm
  reserves)"). A custom Biome / regex pre-commit could enforce
  "any `pnpm --filter` invocation in `.github/workflows/` ends
  with `run <name>` not `<name>`". Not implemented; one CLAUDE.md
  rule plus the existing audit feels sufficient until we add more
  scripts.
- **Detection improvement:** none beyond the run-keyword convention.
- **Knowledge sharing:** this entry; CLAUDE.md convention; the
  scripts in `infra/shared/package.json` and
  `apps/borso-fr/package.json` lead with `pnpm --filter @borso/infra
  run build` to model the right pattern locally.
