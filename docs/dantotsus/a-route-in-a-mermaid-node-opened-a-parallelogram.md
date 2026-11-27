---
date: 2026-10-02
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#107'
fix-commits: [bbf11f9969]
eradication-level: 2
eradication-paths: [scripts/pr/pr-body.core.ts]
time-to-detect: hours
tags: [pr-body, mermaid, gates, documentation]
zone: .claude/skills/open-pr
---

# A route in a mermaid node opened a parallelogram

## User impact

PR #107's description opened on a flow diagram that GitHub did not draw. The
operator found it by reading the page after CI was green: *"attention to
mermaid est cassé"* ("careful, the mermaid is broken").

| | Seen | Expected |
| --- | --- | --- |
| The Flow section of PR #107 | a parse error in place of the diagram | the login to recover flow, drawn |

## Causal chain

- GitHub showed a parse error instead of the diagram.
  - Mermaid gave up on the whole block at its first node.
    - The node was `login[/login]`. In a flowchart, `[/` opens a slanted shape:
      `[/text/]` is a parallelogram and `[/text\]` a trapezoid. `[/login]`
      opens one, meets a bare `]`, and fails.
      - The session wrote the label unquoted and named it after the URL, which
        starts with a slash.
        - It copied the form of the `/open-pr` template's example, which writes
          every label unquoted: `search[Search] --> deezer[Deezer]` in
          `.claude/skills/open-pr/template.md` at `bbf11f9^`.

## Root cause of occurrence

*Thought the text inside a node's brackets is free text, actually its first
character can be shape syntax, and a slash is.* **Material.** The template the
body was drafted from showed only unquoted labels, a form that holds for words
and breaks on any label that starts with `/`, `\`, `(`, `{` or `>`. `/open-pr`
drafts from that template (inferred: the session's transcript was not read).

## Detection failure causes

- **Linter:** `check-pr-body.ts` read the Flow section only to count nodes
  against the budget. It found nine and did not parse them. No mermaid parser is
  installed in the repository (`ls node_modules/.pnpm | grep -i mermaid` prints
  nothing, measured this session).
- **Local validation:** a body is drafted in a file and posted through the API.
  Nothing renders it before it is live.
- **Review:** the operator caught it, after merge-readiness was announced.

## Countermeasure

The body was updated with every label quoted, as `login["/login"]`.

## Eradication

**Type:** DevX check (level 2), for this one shape.

**Reference:** commit [`bbf11f9`](https://github.com/hugoleborso/borso.fr/commit/bbf11f9969).
The Flow check in `scripts/pr/pr-body.core.ts` refuses any `[/…]` or `[\…]`
label that does not close its slant, and names the quoted form.

```diff
+const SLANTED_SHAPE_LABEL = /\[[/\\][^\]"]*\]/g;
+const CLOSED_SLANTED_SHAPE = /^\[[/\\].*[/\\]\]$/;
```

**Proof it can fail:** the test suite carries the exact line PR #107 shipped.
The checker on that body reports:

```
[pr-body] Flow: [/login] opens a slanted shape it never closes, so the diagram fails to render; quote the label, as ["/login"]
```

Stryker killed 395 of 395 mutants in the file (measured at the fix).

**Similar instances:** the checker runs on every body drafted through `/open-pr`.
Other first characters still break a diagram the same way, such as `(`, `{` or
`>`, and the template still writes unquoted labels today. Diagrams inside
committed markdown are not checked. GitHub renders those in the file view before
merge.

**Proposed:** quote every label in `.claude/skills/open-pr/template.md`, and make
`readMermaidNodes` in `scripts/pr/pr-body.core.ts` refuse any unquoted bracket
label. One rule then makes every first character inert, inside the existing
regex checker, and the template stops teaching the fragile form.
