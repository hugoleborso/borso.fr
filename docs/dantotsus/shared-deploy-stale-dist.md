---
date: 2026-05-02
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: '#2'
fix-commits: [daf6ebbde6]
eradication-level: 4
eradication-paths: [infra/shared/package.json, scripts/ensure-infra-built.sh]
time-to-detect: 30+ minutes of debugging (the symptom looked like AWS, not local)
tags: [pnpm, cdk, monorepo, build-graph]
zone: infra/shared/package.json
---

# `pnpm shared-infra deploy` shipped a stale `@borso/infra` dist/

## User impact

Every visitor of every preview kept getting `503 FunctionExecutionError` after
the operator deployed the fix for the host-routing CloudFront Function (the ES5
rewrite, see [`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md)).
`pnpm --filter @borso/shared-infra run deploy` reported success.
`aws cloudfront get-function --stage LIVE` showed the broken ES2020 bytes still
live. The operator spent several rounds on "is this CloudFront propagation?"
before seeing the bytes never left the laptop.

| | Seen | Expected |
| --- | --- | --- |
| LIVE function after the deploy | the old ES2020 source, 503 for everyone | the committed ES5 source, 200 |

## Causal chain

- The edge kept serving the broken function after a successful deploy.
  - CloudFormation received the old function source from the synth.
    - The shared stack reads `HOST_ROUTING_FUNCTION_CODE` from `@borso/infra`,
      whose package entry is `dist/index.js`.
      `cf-host-routing-function.ts` loads the `.code.js` beside the compiled
      module, so from `dist/internal/`.
      - `dist/` on the laptop predated the fix. Only `@borso/infra`'s `build`
        script writes it, with `tsc` then one `cp` per `.code.js` file.
        - The deploy script did not build first.

          ```json
          "deploy": "cdk deploy --all --require-approval never" // ← ❌ ships whatever dist/ holds
          ```

          - 68af89935 (2026-05-01) ported `@borso/shared-infra` with this
            script, consuming `@borso/infra` through its gitignored `dist/`.

## Root cause of occurrence

*Thought `cdk deploy` reads the current source of a workspace dependency,
actually it reads the package entry, `dist/`, which only an explicit build
writes and nothing keeps current.* (Machine)

The writer was an agent porting the package. The condition that made the
mistake easy is in the codebase: `infra/cdk/package.json` points `exports` and
`types` at `./dist/`, a gitignored build output, so every consumer must remember
to rebuild it. The class recurred:
[`the-worktree-that-could-not-see-its-own-infra.md`](./the-worktree-that-could-not-see-its-own-infra.md)
records a subagent's typecheck failing on a missing `dist/`, and
`scripts/ensure-infra-built.sh` exists because of it.

## Detection failure causes

- **Local validation:** `cdk deploy` exited 0. Nothing in its output says the
  bundled function source is stale.
- **CI:** `preview.yml` and `deploy.yml` run `pnpm --filter @borso/infra build`
  before the CDK step, so CI was green on the same PR. The laptop path was the
  only one that failed, and it looked like an AWS problem.
- **Review:** a one-line deploy script reads as minimal, not as missing a step.
- **Monitoring:** detection came only when the operator compared the LIVE
  function's bytes with the commit.

## Countermeasure

daf6ebbde prefixes `synth`, `diff` and `deploy` in `infra/shared/package.json`
and `apps/borso-fr/package.json` with `pnpm --filter @borso/infra run build &&`.
`destroy` is left alone.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`daf6ebb`](https://github.com/hugoleborso/borso.fr/commit/daf6ebb),
[PR #2](https://github.com/hugoleborso/borso.fr/pull/2).

What holds today:

- Every `deploy` and `diff` script (`grep -n '"deploy"\|"diff"' apps/*/package.json infra/shared/package.json`)
  starts with `pnpm --filter @borso/infra run build`. The `synth` scripts call
  `scripts/ensure-infra-built.sh`, which rebuilds when a file under
  `infra/cdk/src` is newer than `dist/index.d.ts`.

The 2026-05-02 entry called the prefix "level 1, structural by convention". A
prefix copied by hand into every `package.json` is not structural. A new script
or a new app that omits it ships a stale `dist/` again. The `build` script
itself keeps a hand list of four `cp` commands for the `.code.js` and `.mjs`
files, and a new one left off the list is missing from `dist/` (inferred: it
would fail loudly at `readFileSync`, not silently).

**Proposed:** subtract `dist/` for in-repo consumers. Point `@borso/infra`'s
`exports` and `types` at `src/index.ts`, since every consumer already runs under
`tsx` (`infra/shared/cdk.json` has `"app": "tsx bin/shared.ts"`, and every app's
`cdk.json` runs `tsx`), and read each `.code.js` relative to its source module.
With no `dist/`, nothing can go stale: the build prefixes, the `cp` list and
`scripts/ensure-infra-built.sh` can all be deleted. Whether the type-aware lint,
the typecheck and the handler bundling accept a `src/` entry is untried. It does
not exist yet.

**Proof it can fail:** not run.

**Similar instances:** the worktree entry above, and the four `cp` commands in
`infra/cdk/package.json`'s `build`.
