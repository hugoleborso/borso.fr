---
date: 2026-05-02
introduced-at: implementation
detected-at: ci
severity: high
related-pr: '#2'
fix-commits: [10f3f10e3a, 181f2667ac]
eradication-level: 2
eradication-paths: [.husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: minutes (first preview deploy attempt in CI)
tags: [pnpm, ci, github-actions]
zone: .github/workflows/deploy.yml
---

# `pnpm --filter <app> deploy` never ran the app's deploy script

## User impact

Every pull request's preview failed on its first push. The operator spent half
an hour checking whether OIDC was misconfigured before finding the cause.

| | Seen | Expected |
| --- | --- | --- |
| First preview deploy of `borso-fr` | the step fails in 23 s, `cdk` never runs, no stack change, no URL | `scripts.deploy` runs `pnpm build && cdk deploy --all ...` and posts the preview URL |

## Causal chain

- No preview deployed.
  - The package's `scripts.deploy` never ran.
    - pnpm ran its own `deploy` command instead. pnpm checks its built-in
      commands before scripts, and `deploy` is one of them. In a scratch package
      on pnpm 10.28.0, `pnpm deploy` printed `ERR_PNPM_CANNOT_DEPLOY ... Maybe
      you wanted to invoke "pnpm run deploy"` (measured this session).
      - The faulty line, written by commit `56258c2b01` (PR #2) in
        `preview.yml`, `deploy.yml` and `cleanup-orphans.yml`:

        ```yaml
        - run: pnpm --filter "@borso-app/${{ matrix.app }}" deploy   # pnpm's built-in, not the script
        ```

        - The same commit calls every other script the same short way,
          `pnpm --filter @borso/infra test:coverage` and
          `pnpm --filter @borso/infra build`, and those work, because no
          built-in carries those names.
          - The apps name their CDK script `deploy`, after `cdk deploy`, which
            is also the name of a pnpm command.

## Root cause of occurrence

*Thought `pnpm --filter <pkg> <name>` runs `scripts.<name>` for any name, as it
did for `build` and `test:coverage`, actually pnpm resolves `<name>` against its
own commands first, and `deploy` is one.* (Material)

The short form worked for every script the agent had called before, and pnpm's
command table was not in its context when it wrote the workflow (inferred, no
transcript survives).

## Detection failure causes

- **Local validation:** the operator ran `pnpm --filter ... run deploy`, with
  `run`, which dodges the trap. The workflow used the other form.
- **Linter:** no workflow lint knows pnpm's command table.
- **CI:** the first run of `preview.yml` against a real PR was the first
  execution of the line.

## Countermeasure

Commit `10f3f10e3a` makes every workflow call `pnpm --filter <pkg> run deploy`
and `run destroy`. `run` forces the script lookup.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`181f2667ac`](https://github.com/hugoleborso/borso.fr/commit/181f2667ac).
`check_pnpm_reserved_names` in `.husky/pre-commit`, mirrored in `ci.yml`,
refuses a workflow that calls a reserved name without `run`:

```bash
PNPM_RESERVED_REGEX='pnpm[[:space:]]+--filter[[:space:]]+("[^"]+"|[^[:space:]]+)[[:space:]]+(deploy|destroy|install|update|sync|fetch|publish)([[:space:]]|$)'
if grep -nrE "$PNPM_RESERVED_REGEX" .github/workflows/ >&2; then
```

**Proof it can fail:** the regex matches the original line,
`- run: pnpm --filter "@borso-app/borso-fr" deploy`, and does not match
`pnpm -F @borso-app/borso-fr deploy` (both measured this session with
`grep -cE`).

**Gap:** the regex reads only `.github/workflows/` and only the
`--filter <pkg> <name>` form. It misses `-F`, `--filter=<pkg>` and any call in a
script or an agent's command. It also lists names pnpm does not own. In the
scratch package on pnpm 10.28.0, `pnpm destroy` and `pnpm sync` ran the scripts
(measured). The repository pins `pnpm@10.0.0`, where the review measured the
same for `destroy`.

**Proposed:** subtract the collision. Rename `deploy` in every app's and
`infra/shared`'s `package.json` to a name pnpm does not own, such as
`cdk:deploy`, and update the workflows and CLAUDE.md's "Call reserved names
through `run`" rule in the same change. Shadowing would then be impossible in
workflows, scripts and agent commands alike, and the regex could be deleted.

**Similar instances:** `grep -n '"deploy"' apps/*/package.json infra/*/package.json`
lists every script that carries the built-in's name (measured, one per app and
one in `infra/shared`).
