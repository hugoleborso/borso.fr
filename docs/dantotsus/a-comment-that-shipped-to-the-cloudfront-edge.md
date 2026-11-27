---
date: 2026-08-10
introduced-at: implementation
detected-at: operator-deploy
severity: low
related-pr: '#40'
fix-commits: [1fad0d792d, 9dcf74547]
eradication-level: 2
eradication-paths: [.oxlintrc.json, eslint-rules/no-comments.js, infra/shared/test/unit/shared-stack.test.ts]
time-to-detect: hours
tags: [cdk, cloudfront, cloudformation, drift, vitest, snapshot, ci]
zone: infra/cdk/src/internal/cf-host-routing-function.code.js
blueprints: [cloudfront-function-source]
---

# A comment that shipped to the CloudFront edge

## User impact

The operator was the user. PR #40 merged after an audit had proved the four app stacks' prod templates byte-identical between the merge base and the head. Asked afterwards whether a shared-infra deploy was needed, the session synthesized `borso-shared` at both commits and found it was not identical. `cdk diff` against the account confirmed that the production CloudFront function `HostRouter` had changed. No visitor saw a difference, because the change was one comment line.

| | Seen | Expected |
| --- | --- | --- |
| `borso-shared` after a merge that "changed no template" | `FunctionCode` of `HostRouter` differs from the deployed one | A merge that changes no behaviour changes no production template |

<details><summary>The diff against the account</summary>

```
[~] AWS::CloudFront::Function HostRouter
 └─ [~] FunctionCode          (one comment line removed)
[~] AWS::IAM::Role ProdDeployRole ProdDeployRole57B92D1D
 └─ [~] Description
✨  Number of stacks with differences: 1
```

The `Description` change was an intended PR #40 change that had not been deployed yet.

</details>

## Causal chain

- The production template of `borso-shared` changed in a merge nobody expected to touch it.
  - PR #40 deleted a dead Biome suppression from `cf-host-routing-function.code.js`. `git log -S` names commit `bd4d6be23` (2026-08-08) as the deletion.

    ```diff
    -// biome-ignore lint/correctness/noUnusedVariables: CloudFront Functions runtime requires the entry point be named exactly `handler`. …
    ```

    - The construct reads this file as a string at synth time and embeds every byte, comments included, in `FunctionCode`.
      - The comment had been put in shipped bytes by commit `7289561d9` (2026-05-02, written by an agent), answering review thread c2 of PR #2: "the suppression for the CloudFront Function `handler` is a single-line `// biome-ignore` directly above the declaration, documents the constraint at the call site instead of the config."
        - Biome flagged `handler` as an unused variable, because the CloudFront runtime calls it by name. The linter of the day had to be silenced somewhere, and the review moved the silencing from the config into the file. (Machine)

## Root cause of occurrence

*Thought a lint suppression is a comment, and a comment is inert, actually this file's bytes are the deployed function, so a comment in it is production code.*

Machine. The linter could not express "the runtime calls `handler`" in its config without a blanket override, which the review rejected. The only other place for the exception was a comment inside the shipped string. Commit `7289561d9` chose it, and `bd4d6be23` deleted it three months later as tidy-up, each without a signal that the bytes reached CloudFront.

## Detection failure causes

- **Linter:** at the time, the linter did not parse `*.code.js`, because it targets the CloudFront runtime and not Node. The dead suppression was invisible.
- **CI:** `infra/cdk` and `infra/shared` both ran at 100% coverage. The shared suite asserted named properties, such as one OIDC provider and no `AdministratorAccess`, and nothing about `FunctionCode`.
- **Merge audit:** it synthesized the four app stacks, because its question was "will merging lose app data". `borso-shared` is not an app stack.
- **Deploy:** `shared-deploy.yml` runs only on dispatch, so no run on `main` diffs the shared stack.
- **Monitoring:** no drift detection runs on any stack.

## Countermeasure

Commit `1fad0d7` (PR #45) committed a template snapshot for `borso-shared`, asserted by the existing unit suite. Asset hashes are replaced by a placeholder, and everything else compares verbatim. The operator was asked to dispatch `shared-deploy` once to clear the standing drift.

## Eradication

**Type:** DevX check (level 2), a lint rule for comments in edge code. Detection (level 4), for any other byte.

**Reference:** commit [`9dcf74547`](https://github.com/hugoleborso/borso.fr/commit/9dcf74547) (PR #197) lints `**/*.code.js` with oxlint. It states the runtime's exception in the config, so no comment is needed for it:

```json
{
  "files": ["**/*.code.js"],
  "rules": {
    "no-unused-vars": ["error", { "varsIgnorePattern": "^handler$" }]
  }
}
```

`borso/no-comments` applies to these files like any other. The three `*.code.js` files under `infra/cdk/src/internal/` hold no comment today (measured with `grep -c`). A comment can no longer reach the edge.

Commit [`1fad0d7`](https://github.com/hugoleborso/borso.fr/commit/1fad0d7) holds the rest of the class. Any change to the shared template, from whatever workspace, shows in the pull request that causes it:

```ts
await expect(template).toMatchFileSnapshot('./__snapshots__/borso-shared.template.json');
```

The first version of this entry called the snapshot level 1. It detects a change, it does not prevent one, so it is level 4.

**Proof it can fail:** a comment planted on line 1 of `cf-static-site-index-rewrite.code.js` on a scratch copy, then `oxlint` on it:

```
infra/cdk/src/internal/cf-static-site-index-rewrite.code.js:1:1: error borso(no-comments): No comment here. Say it with a name, a helper, a constant, a type or a test. See docs/standards/00-principles.md.
```

Reverted after the run (measured this session).

**Similar instances:** `git ls-files '*.code.js'` lists three edge functions, all covered by the same override. The four app stacks were re-synthesized during the original investigation and were byte-identical, so `HostRouter` was the only drift PR #40 introduced. [`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md) is the same "shipped source" property from the other direction.
