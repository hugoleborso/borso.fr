---
date: 2026-08-10
introduced-at: implementation
detected-at: operator-deploy
severity: low
related-pr: 40
fix-pr: 45
fix-commits: [1fad0d7]
eradication-level: 1
time-to-detect: hours
tags: [cdk, cloudfront, cloudformation, drift, vitest, snapshot, ci]
---

# A comment that shipped to the CloudFront edge

## Symptom

PR #40 was merged after an audit that had proved the four app stacks'
prod templates byte-identical between the merge base and the head. Asked
afterwards whether a shared-infra deploy was needed, I synthesized
`borso-shared` at both commits and found the template was **not**
identical. `cdk diff` against the real account then confirmed two
properties had moved:

```
[~] AWS::CloudFront::Function HostRouter
 └─ [~] FunctionCode          (one comment line removed)
[~] AWS::IAM::Role ProdDeployRole ProdDeployRole57B92D1D
 └─ [~] Description
✨  Number of stacks with differences: 1
```

The `FunctionCode` delta was a single deleted line:

```diff
-// biome-ignore lint/correctness/noUnusedVariables: CloudFront Functions runtime requires the entry point be named exactly `handler`. …
```

A dead comment, left over from the Biome-to-ESLint migration, removed as
tidy-up. It changed a production CloudFormation template.

## Root-cause chain

1. **Why did deleting a comment change a template?**
   `cf-host-routing-function.code.js` is not compiled or imported — the
   construct reads the file as a **string** at synth time and embeds it in
   `FunctionCode`. Every byte, comments included, is a deployed artefact.
2. **Why did the merge-safety audit miss it?** The audit synthesized the
   four *app* stacks, because the question it was asked was "will merging
   lose app data". `borso-shared` is not an app stack and was never in the
   list.
3. **Why did no gate catch it?** The changed file lives in `infra/cdk`.
   The affected template belongs to `infra/shared`. Coverage suites for
   both ran and passed — neither asserts anything about this template's
   contents beyond a handful of named properties.
4. **Why did no deploy catch it?** `shared-deploy.yml` is
   `workflow_dispatch` only, so no run on `main` ever diffs the shared
   stack. Drift there is invisible until somebody dispatches by hand.

**Root cause:** *thought a comment is inert, actually this file's comments
are shipped source — and the stack they ship in is owned by a workspace
the change did not touch, so nothing linked the edit to its consequence.*

## Detection failure causes

- **Typing:** the file is JavaScript read as text. There is nothing to
  type.
- **Linter:** ESLint is configured not to parse this file at all, exactly
  because it targets the CloudFront edge runtime rather than Node — see
  the `Don'ts` entry in CLAUDE.md. The `biome-ignore` comment being dead
  was therefore also invisible.
- **CI:** `infra/cdk` and `infra/shared` both ran at 100% coverage. The
  shared suite asserted named properties — one OIDC provider, no
  AdministratorAccess, correct sub claims — and a template snapshot is
  precisely the assertion that catches what nobody thought to name.
- **Code review:** the diff read as "delete a stale lint suppression",
  which is what it was, in a file whose header explains it is read as a
  string. The consequence needed a reader who held both facts.
- **Staging:** there is no staging for the previews CDN.
- **Production monitoring:** no drift detection on any stack. The repo and
  the account can disagree indefinitely without a signal.

## Countermeasure

- **Code:** commit `1fad0d7` — a committed template snapshot for
  `borso-shared`, asserted by the existing unit suite.
- **Operator action:** dispatch `shared-deploy` once to clear the standing
  drift. Both deltas are cosmetic; the deploy updates a CloudFront
  function and an IAM description.

## Eradication (mandatory — code-level)

**Type:** detection, promoted to structural (level 1 — a change to this
template cannot reach `main` without appearing in the pull request that
causes it)

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) ·
commit [`1fad0d7`](https://github.com/hugoleborso/borso.fr/commit/1fad0d7)

**The actual fix:**

```diff
+  describe('template snapshot', () => {
+    it('matches the committed template, so drift shows up in the diff', async () => {
+      const template = serializeTemplateForSnapshot(synth({ budgetEmail: 'hugo@example.com' }));
+      await expect(template).toMatchFileSnapshot('./__snapshots__/borso-shared.template.json');
+    });
+  });
```

Why this counts as level 1 rather than level 4: a snapshot is a detector,
but the thing it makes impossible is *silence*. The template cannot change
without the change being visible in a reviewed diff, whichever workspace
caused it and whether or not anyone anticipated the property. That is the
misconception — "my edit is local to infra/cdk" — rendered inexpressible.

Asset content hashes are replaced by a placeholder, because they move
whenever aws-cdk-lib changes its bundling and say nothing about this
stack. Everything else compares verbatim, which is the whole point: the
drift was a comment inside a string.

`**/__snapshots__/` is added to `.prettierignore`. Vitest writes the
string the test hands it and Prettier collapses short JSON arrays, so
letting both own the file makes every run report a mismatch against
something the other just rewrote.

**Sibling defects swept:** the four app stacks were re-synthesized at the
merge base and at `e79d27a` during the same investigation and are
byte-identical, so this was the only drift PR #40 introduced. The second
delta in the diff above — `ProdDeployRole`'s Description — is an
intentional PR #40 change that had simply never been deployed.

## See also
 
- [`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md)
  — the same file, the same "this is shipped source, not ordinary
  JavaScript" property, discovered from the other direction.
- [`shared-deploy-stale-dist.md`](./shared-deploy-stale-dist.md) — the
  other way the shared stack and the repository fall out of step.
- [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md)
  — why nothing on `main` diffs this stack.
- [`biome-must-not-reformat-generated-files.md`](./biome-must-not-reformat-generated-files.md)
  — the neighbouring hazard: a formatter rewriting a file whose bytes are
  an artefact.
