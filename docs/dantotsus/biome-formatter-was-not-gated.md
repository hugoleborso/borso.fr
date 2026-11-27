---
date: 2026-05-25
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#27'
fix-commits: [e138811ba9, cfb24e26a9, 9b8d380ed]
eradication-level: 1
eradication-paths: [.husky/pre-commit, .github/workflows/ci.yml, package.json]
time-to-detect: hours
tags: [biome, formatter, hooks, pre-commit, ci, self-improvement-loop]
zone: .husky/pre-commit
weak-point: gate-measures-nothing
recurs: [biome-lint-was-not-gated-anywhere]
---

# A whole PR of formatter drift accumulated invisibly because only `biome lint` was gated

## User impact

The operator reviews code whose layout changes from file to file. Halfway
through PR #27, the first manual `biome check` reported about 100 files to
reformat, while every lint gate was green. When the agent reverted the
formatter pass as "noise", the operator answered, quoted:

> "Comment ça formatter noise, c'est super important de faire du biome format.
> Fais le dans un commit à part si tu veux mais fais le. ça devrait être dans
> les hooks + dans le commitlint."

| | Seen | Expected |
| --- | --- | --- |
| A commit with misformatted code | Pre-commit and CI pass | The commit is formatted, or refused |

## Causal chain

- About 100 files drifted from the formatter's layout across PR #27's commits, with every gate green.
  - Pre-commit and CI ran Biome's lint rules only.

    ```sh
    pnpm exec biome lint   # ❌ lint rules only, the formatter is a separate command
    ```

    - Commit `309d3b6ff` (2026-05-01, written by an agent) turned the formatter on in `biome.jsonc`, "for consistency across AI-agent edits", and left the root `lint` script on `biome lint`. Until then `biome lint` was a complete gate, because the scaffolding commit `11d98b276` had set `"formatter": { "enabled": false }`.
      - Whether the formatter was on lived in `biome.jsonc`. What the gates ran lived in a command, later copied into every workspace script, the pre-commit hook and CI. Changing the first source of truth left the second as it was. (Machine)

## Root cause of occurrence

*Thought enabling the formatter in `biome.jsonc` enforced it, actually only a gate that runs `biome check` or `biome format` does, and every gate ran `biome lint`.*

Machine. The config and the gate command were two separate sources of truth,
and nothing tied one to the other. The copies of `biome lint` into N+2 places
explain why the gap spread, not why it opened.

## Detection failure causes

- **Linter:** `biome lint` ran and passed. It was never asked about formatting.
- **CI:** it ran the same command as the hook.
- **Review:** drift is invisible line by line when each commit looks clean in its author's editor.
- **Earlier dantotsu:** `biome-lint-was-not-gated-anywhere`, eleven days before, fixed where the lint ran, and copied the same `biome lint` into the new gates.

## Countermeasure

Commit `e138811` replaced `biome lint` with `biome check` in the hook, CI and
every workspace's `lint` script. Commit `cfb24e2` reformatted the 120 files of
accumulated drift with no semantic change.

## Eradication

**Type:** structural impossibility (level 1), for files a commit carries in
full.

**Reference:** commit `314f24821` (2026-08-08) removed Biome, and commit
`9dcf74547` (2026-10-27) replaced Prettier with oxfmt. Commit `9b8d380ed`
(2026-11-15) made `.husky/pre-commit` format what the commit carries instead
of checking it. A fully staged file is formatted and staged again, so it
cannot reach a commit unformatted. CI runs `pnpm run format:check`, which is
`oxfmt --check` over the repository, for commits that skipped the hook and for
partly staged files.

```sh
if [ "$#" -gt 0 ] && [ -x node_modules/.bin/oxfmt ]; then
  node_modules/.bin/oxfmt --no-error-on-unmatched-pattern "$@" >/dev/null
  git add -- "$@"
fi
```

The gate command now lives in one place per stage. The workspace `lint`
scripts all call `scripts/lint-workspace.sh`, so no copy can drift from
another.

**Proof it can fail:** a planted `export const   x = {a:1,\n b:2}` in
`scripts/` (measured on 2026-11-27):

```
$ node_modules/.bin/oxfmt --check scripts/zz-probe.ts
Format issues found in above 1 files. Run without `--check` to fix.
exit 1
```

**Similar instances:** `grep -h '"lint"' apps/*/package.json infra/*/package.json | sort | uniq -c`
prints one shared script for all nine workspaces.
