---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#81'
fix-commits: [03e16d4d6d]
eradication-level: 1
eradication-paths: [eslint-rules/no-comments.js]
time-to-detect: hours (only an annotation-count diff against HEAD found it)
tags: [eslint, custom-rule, gates, meta, tooling, blueprint]
zone: eslint-rules/no-comments.js
---

# A finding that named the whole block ate the tag inside it

## User impact

Eight agents stripped comments across the repository on PR #81. Two of them deleted machine-read annotations that shared a block with prose. The people affected are every later agent that looks up a blueprint or an external dependency by its tag.

| | Seen | Expected |
| --- | --- | --- |
| `strip-front-apps` | 15 `@Blueprint` definition blocks gone | The prose lines gone, the 15 blocks kept |
| `strip-lll-site` | `@DependsOnExternal aws-s3` gone from `object-upload.adapter.ts` | The tag kept |

The main session found both by diffing the full annotation inventory against the base ref by hand (measured on PR #81).

## Causal chain

- 15 `@Blueprint` blocks and one `@DependsOnExternal` tag disappeared from the tree.
  - The sweep deleted the range each `borso/no-comments` finding named.
    - The finding named the whole comment, tag lines included. The rule reported each rejected block once, at its full range:

      ```js
      if (comment.type === 'Shebang' || isMachineReadComment(comment)) {
        continue;
      }
      context.report({ loc: comment.loc, messageId: 'noComment' });   // ← the whole block, tags and prose
      ```

      - An agent wrote this line in 8621866aa, the commit that removed 3489 comments across 782 files and added the rule. In the same file, the blueprint of `isMachineReadComment` says "a block mixing one tag with a sentence of prose does not [survive]" (measured with `git show 8621866aa:eslint-rules/no-comments.js`).
  - Each agent wrote its own deletion keyed on the reported ranges. The rule offered no fix, so `oxlint --fix` could not do the removal, and the brief left the method to each agent (Method).

## Root cause of occurrence

*Thought a block that mixes a tag with prose is wrong as a whole, so the whole block is the finding. Actually only the prose lines are wrong, and the finding's range is what an automated sweep deletes.* (Man)

The writing agent had the fact in front of it. The predicate it wrote answers per block (`lines.every(...)`), and its own blueprint text names the mixed block. The prior that a finding locates "the offending node", the shape every other rule in `eslint-rules/` uses, won over it. The commit was one session touching 782 files, so a saturated context is a plausible worker state (inferred, the transcript was not read).

## Detection failure causes

- **Linter:** the rule was satisfied by the deletion, because the offending comment was gone.
- **CI:** `blueprint-indexing --check` fails on a follower naming a blueprint that does not exist, and on a stale index. A definition that disappears along with its followers leaves a consistent tree.
- **Typing and runtime:** an annotation is a comment, so no type and no test sees it. A missing `@FollowsBlueprint` or `@DependsOnExternal` is silent by design, because both are optional.
- **Code review:** the diff held 822 files, and each removed comment is what the pull request was about.

## Countermeasure

The eight-agent brief was told to diff the annotation inventory against `HEAD` before finishing. The main session ran that diff over the whole repository before pushing, and it found the losses. That is detection, and it depends on someone running it.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `03e16d4d6`, "fix(meta): the no-comments rule stops naming what it does not want deleted".

`proseLineOffsets` returns the offset of each prose line inside the comment, and `create` reports once per offset. A sweep keyed on the reported locations touches only prose lines, because no finding names a tag line.

```js
for (const offset of proseLineOffsets(comment)) {
  context.report({
    loc: { line: comment.loc.start.line + offset, column: 0 },
    messageId: 'noComment',
  });
}
```

**Proof it can fail:** for a block whose second line is `@Feature catalog` and whose third is prose, `proseLineOffsets` returns `[2]` alone. Before the change the rule reported the whole block.

**Proposed:** give `borso/no-comments` a `fix` that removes exactly the prose lines it reports. oxlint 1.91.0 accepts a fixer from a JS plugin rule (`fix?: FixFn` in `node_modules/oxlint/dist/plugins-dev.d.ts`). A comment sweep then becomes `oxlint --fix`, so no agent writes its own range-based deletion, and no tag can fall inside a deleted range. That oxlint applies a JS plugin's fix under `--fix` is inferred from its types, not tried.

**Similar instances:** `strip-pragma-api` logged that stripping 292 blocks needed a second pass to rebuild each block from its machine-read lines. One finding per prose line removes that pass. No other rule in `eslint-rules/` reports a node that is only partly at fault (inferred from `grep -n "context.report" eslint-rules/*.js`).
