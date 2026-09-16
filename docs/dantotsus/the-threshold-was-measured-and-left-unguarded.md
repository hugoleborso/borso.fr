---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#100'
fix-pr: '#102'
fix-commits: []
eradication-level: 2
time-to-detect: minutes
tags: [github, hooks, gates, meta, tooling]
---

# The threshold was measured, written down, and guarded by nobody

## Symptom

A link in PR #100's body came back from the server like this:

```
Its three FAIL rows were not defects, and the [resolution note](``https://github.com/…-resolution.md)``  says why
```

The URL and the closing parenthesis are inside a code span, so the anchor is
dead and the sentence around it still reads as if it worked.

## Root-cause chain

1. **Why did the link break?**
   The GitHub MCP server wraps a markdown link's target in double backticks
   once the target passes roughly 150 characters.
2. **Why was that not avoided?**
   It is documented. `docs/knowledge/github-mcp-pr-body-sanitizer.md` has held
   the measurement since 2026-08-14 — six samples from PRs #46 and #48,
   separating cleanly at about 150 — along with the mitigation: link through
   `/blob/main/` instead of a branch name, which takes 38 characters off every
   link.
3. **Why did the documentation not help?**
   Because it was read months ago by a different session. The body was written
   in one pass and the link was assembled from the branch name that was in the
   shell's `HEAD`, which is exactly the 42-character form the entry warns
   about.
4. **Why did the hook not catch it?**
   `pretool-github-pr-body.sh` guards the shapes whose *form* gives them away:
   an image extension, an `<img>`, a `<details>`, an autolink, an
   angle-bracket placeholder. The length rule has no shape — a long link and a
   short one differ only by a number — so it was left to the reader, and the
   entry's own summary line in the knowledge index even records the
   measurement that would have made the check trivial.
5. **Why did nobody notice the gap between the entry and the hook?**
   The hook's header comment lists what the server does to each form, and the
   list it carries is the 2026-08-18 probe. The length behaviour is from the
   2026-08-14 entry. The hook was written from the newer probe and never
   reconciled with the older page.

**Root cause:** thought a measured, written-down vendor behaviour was covered
because the mitigation was documented, actually a threshold with no shape is
precisely the kind of rule a reader forgets and a script never does.

## Detection failure causes

- **Linter / static analysis:** nothing lints a PR body except this hook.
- **CI:** the body is not in the repository.
- **Code review:** the broken link renders as a code span mid-sentence; the
  paragraph still reads, which is the failure mode the entry itself calls the
  worst shape.
- **Knowledge:** the entry was complete, correct and load-bearing on somebody
  remembering it at the right second.

## Countermeasure

Read the body back after posting and repair it, which is what happened here —
the link was replaced by a sentence naming the file in words.

- **Code:** commit on PR #100 replacing the link; the anchor is now prose.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** PR #102 · commit on this branch extending
`.claude/hooks/pretool-github-pr-body.sh`

**The actual fix:**

```diff
+LONG_LINK="$(grep -oE '\]\([^) ]{150,}\)' <<<"$BODY_AS_RENDERED" | head -1 || true)"
+if [[ -n "$LONG_LINK" ]]; then
+  block "the body carries a markdown link whose target is $(( ${#LONG_LINK} - 3 )) characters; past about 150 the URL comes back wrapped in backticks and the anchor is dead. Link through /blob/main/ rather than a branch name, or write the bare URL, which autolinks at any length."
+fi
```

The message carries the mitigation the entry already worked out, so the agent
that trips it does not have to go and read the page. Both halves of the
contract are in `scripts/check-hook-decisions.sh`: the branch-name form of a
link into the tree is refused, the `/blob/main/` form of the same file is not,
and a body *describing* the threshold passes.

**Sibling defects swept:** none of the other measured-but-unguarded shapes in
that entry remain — every form in its probe table already had a rule, and this
was the one that had a number instead of a shape.

## See also

- [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md)
  — the same lesson, which is itself the reason this one is a dantotsu rather
  than another paragraph on the page.
- [`a-pull-request-body-the-server-quietly-emptied.md`](./a-pull-request-body-the-server-quietly-emptied.md)
  — the dantotsu that built the hook this one extends.
- [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md)
  — the measurement, the six samples, and the round-trip procedure.
