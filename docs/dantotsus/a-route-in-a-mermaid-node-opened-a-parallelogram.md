---
date: 2026-10-02
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#107'
fix-pr: '#119'
fix-commits: [bbf11f9969]
eradication-level: 2
eradication-paths: [scripts/pr/pr-body.core.ts]
time-to-detect: hours
tags: [pr-body, mermaid, gates, documentation]
zone: plugins/borso-harness/skills/open-pr
---

# A route in a mermaid node opened a parallelogram

## Symptom

PR #107's description opened on a flow diagram that GitHub did not draw.
The operator found it by reading the page after CI was green:
*"attention to mermaid est cassé"*.

```mermaid
flowchart LR
  login["/login"] --> recover["/recover"]
```

That is the fixed version. The shipped one wrote `login[/login]`.

## Root-cause chain

1. **Why did the diagram fail?** Mermaid could not parse its first line.
2. **Why not?** In a flowchart, `[/` opens a slanted shape: `[/text/]` is a
   parallelogram, `[/text\]` a trapezoid. `[/login]` opens one, finds a
   bare `]`, and the parser gives up on the whole block, not just the node.
3. **Why was a route written that way?** The node was named after the URL,
   and a URL starts with a slash. Writing a label in brackets is the common
   case and nothing about it looks like syntax.
4. **Why did the checker pass it?** `check-pr-body.ts` reads the Flow
   section only to count nodes against the budget. It found nine and said
   nothing about whether they parse.

**Root cause:** thought the text inside a node's brackets was free text,
actually its first character can be shape syntax, and a slash is.

## Detection failure causes

- **Linter / static analysis:** the PR-body checker counted nodes but never
  parsed them.
- **Functional validation locally:** a body is drafted in a file and posted
  through the API. Nothing renders it before it is live.
- **Code review:** caught here, by the operator, after merge-readiness was
  announced.

## Countermeasure

- **Operator action:** the body was updated with every label quoted.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — DevX check)

**Reference:** commit `bbf11f9`

**The actual fix:** the Flow check in `scripts/pr/pr-body.core.ts` refuses
any `[/…]` or `[\…]` label that does not end on a slash, and names the
quoted form that renders:

```diff
+const SLANTED_SHAPE_LABEL = /\[[/\\][^\]"]*\]/g;
+const CLOSED_SLANTED_SHAPE = /^\[[/\\].*[/\\]\]$/;
```

```
[pr-body] Flow: [/login] opens a slanted shape it never closes, so the diagram fails to render; quote the label, as ["/login"]
```

The four shapes mermaid defines still pass, as do quoted labels and a slash
anywhere but first. The test suite carries the exact line PR #107 shipped,
and running the checker on that body as posted reports both broken nodes.
Stryker kills 395 of 395 mutants in the file.

**Sibling defects swept:** the checker runs on every body drafted through
`/open-pr` and through `pretool-gh-pr-create.sh`, so every future flow
diagram is covered. Diagrams inside committed markdown are not checked;
GitHub renders those in the file view, where a broken one is visible
before merge.

## See also

- [`github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md)
