---
date: 2026-11-11
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#295'
fix-pr: none (the kaizen pull request of PR #295 lands it; its number is not known when this is written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.oxlintrc.json, scripts/lint-staged-files.sh]
time-to-detect: minutes
tags: [eslint, gates, agents, orchestrator, tooling]
zone: .oxlintrc.json
weak-point: prose-stands-in-for-a-check
recurs: none (PR #197 recorded the same wall as the knowledge entry oxlint-without-type-aware-reads-type-aware-directives-as-unused, which no dantotsu eradicated)
---

# The lint gate each brief retyped without its flag

## User impact

Three of the four implementation agents on PR #295 met a lint failure that
was not real, and each spent a round proving it false.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm exec oxlint apps/talos` from the brief | two `Unused eslint-disable directive` errors | exit 0, as `pnpm run lint` gives |
| banana-rush and last-loop-lepin agents | the same false errors on their own directives | exit 0 |

## Causal chain

- Three agents logged that the brief's gate failed while the package's lint passed
  - The main session's brief named `pnpm exec oxlint apps/<app>` as the gate
    - A bare oxlint run reads `.oxlintrc.json`, which set `"typeAware": false`
      - Without type information the type-aware rules do not run, so every directive naming one reads as unused

## Root cause of occurrence

*Thought the configuration file is the lint, actually the configuration file
was half of it and every script added `--type-aware` on its own command line.*

`.oxlintrc.json` held `"typeAware": false` since PR #197. `scripts/lint-workspace.sh`,
`scripts/lint-repository.sh`, `.husky/pre-push` and the staged-file lint all pass
`--type-aware`. Anyone who types `oxlint` by hand, a brief included, gets a
different lint from the one the gates run.

## Detection failure causes

- **Instruction:** `/tech-lead-orchestrator`'s standard says a brief names
  "oxlint with `--type-aware`". The main session wrote the brief without it.
  A written rule is read at the moment of writing or not at all.
- **Knowledge hook:** the entry on this trap prints when the output says
  `Unused eslint-disable directive`, which is after the round is spent.

## Countermeasure

Set `"typeAware": true` in `.oxlintrc.json`, so a bare `oxlint` runs every
rule. The staged-file lint splits the configuration into a plugin half and a
native half; the plugin half now sets `typeAware: false` itself, so it still
does not build a TypeScript program for rules that need none.

Measured on 2026-11-11: `node_modules/.bin/oxlint apps/talos` exits 0 in 9 s
with the change, and exits non-zero with the two unused-directive errors
without it. `scripts/lint-staged-files.sh` on the same two talos files exits 0.
A JavaScript-only staged commit costs 1.0 s against 0.7 s before (five
`eslint-rules/` files).

## Eradication

**Type:** structural impossibility (level 1). A hand-typed oxlint is the gate's oxlint.

**Reference:** commit adding this file.

```diff
   "options": {
-    "typeAware": false,
+    "typeAware": true,
```

**Proof it can fail:** with `"typeAware": false` restored, the brief's command fails:

```
apps/talos/api/src/helpers/observability/error-reporting.adapter.ts:116:7: error: Unused eslint-disable directive (no problems were reported).
apps/talos/api/src/helpers/observability/wide-event.adapter.test.ts:108:5: error: Unused eslint-disable directive (no problems were reported).
```

**Similar instances:** `grep -rn "oxlint" scripts .husky .github` lists every
caller. Each already passed `--type-aware` or a configuration of its own; the
flag stays on them as harmless.
