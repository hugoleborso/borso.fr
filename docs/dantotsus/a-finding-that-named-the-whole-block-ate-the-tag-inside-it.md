---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/81
fix-pr: https://github.com/hugoleborso/borso.fr/pull/82
fix-commits: [pending]
eradication-level: 1
time-to-detect: hours (only an annotation-count diff against HEAD found it)
tags: [eslint, custom-rule, gates, meta, tooling, blueprint]
---

# A finding that named the whole block ate the tag inside it

## Symptom

`borso/no-comments` reported one finding per comment, located at the
comment's whole range. Two of the eight agents stripping comments across the
repository built a sweep keyed on that reported location — the obvious thing
to do — and the sweep deleted machine-read annotations that happened to share
a block with prose.

`strip-front-apps` lost **15 `@Blueprint` definition blocks**.
`strip-lll-site` lost a **`@DependsOnExternal aws-s3`** tag from
`object-upload.adapter.ts`. Neither lint nor any test objected: the rule was
satisfied, because the offending comment was gone.

Both were caught only by diffing the full annotation inventory against the
base ref by hand.

## Root-cause chain

1. **Why did the sweep delete the tags?**
   It deleted the range the finding named, and the finding named the whole
   comment.
2. **Why did the finding name the whole comment?**
   `context.report({ loc: comment.loc })` — the natural way to write it, and
   the shape every other rule in the repository uses.
3. **Why is that shape wrong here?**
   Every other rule reports a node that is wholly at fault. This rule reports
   a comment that is only *partly* at fault: a block pairing `@Feature catalog`
   with a sentence of prose is rejected because of the sentence, and the tag
   beside it is the thing that must survive.
4. **Why did nothing catch the loss?**
   A missing `@FollowsBlueprint` or `@DependsOnExternal` is silent by design —
   both are optional. The blueprint indexer fails on a follower naming *no*
   blueprint, not on a follower that vanished.

**Root cause:** we thought a lint finding names the thing to delete; actually
it named a range containing both the thing to delete and the thing that must
never be deleted, and the rule was the only party that knew which lines were
which.

## Detection failure causes

- **Typing:** annotations are comments; no type sees them.
- **Linter / static analysis:** the rule was *satisfied* by the deletion. It
  had no way to say "these two lines, not those two".
- **Functional validation locally:** the code still compiled and ran; a
  blueprint tag has no runtime.
- **CI:** `blueprint-indexing --check` fails on a follower naming a blueprint
  that does not exist, and on a stale index. A tag that disappears along with
  its follower leaves a consistent tree.
- **Code review:** 822 files. A reviewer reading the diff sees a comment
  removed, which is what the pull request is about.

## Countermeasure

The eight-agent brief was given an explicit instruction to diff the annotation
inventory against `HEAD` before finishing, and the main session ran that diff
over the whole repository before pushing. It found the losses. That is
detection, not eradication — it depends on someone remembering to run it.

## Eradication (mandatory — code-level)

**Level 1 — structural impossibility.** The rule no longer reports a range it
does not want deleted.

`proseLineOffsets` returns the offset of each prose line inside the comment,
and `create` reports once per offset rather than once per comment. A sweep
keyed on the reported locations now touches exactly the prose lines and cannot
reach a tag, because no finding ever names one.

```js
for (const offset of proseLineOffsets(comment)) {
  context.report({
    loc: { line: comment.loc.start.line + offset, column: 0 },
    messageId: 'noComment',
  });
}
```

Verified: for a block whose second line is `@Feature catalog` and whose third
is prose, `proseLineOffsets` returns `[2]` alone.

The same change closes a second inventory row from `strip-pragma-api` — *"the
eslint stylish reporter names the comment but not its text, so stripping 292
of them needed a second pass to rebuild each block from its machine-read lines
alone"*. With one finding per prose line, the reported location **is** the
line to remove, and the second pass is gone.

## Related

- [`docs/standards/00-principles.md`](../standards/00-principles.md) — the rule
  this enforces, and the list of annotations that are not comments.
- [`subagents-that-were-never-told-their-label.md`](../knowledge/subagents-that-were-never-told-their-label.md)
  — the sweep found this because every agent logged under its own label, so two
  independent reports of the same shape read as systemic rather than as one
  agent being careless.
