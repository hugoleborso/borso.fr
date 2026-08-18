---
date: 2026-08-18
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#60'
fix-pr: '#61'
fix-commits: [0f55859]
eradication-level: 2
time-to-detect: 3 days
tags: [github, harness, hooks, gates, meta, open-pr]
---

# A pull request body the server quietly emptied

## Symptom

The operator asked for screenshots in the pull request. The body was
written with two `<img>` tags in a before-and-after table, the call
succeeded, and the PR page showed two empty boxes. Reading the body back
explained why:

```
| Setlists index, phone | <img width="300"> | <img width="300"> |
```

The `src` of each image was gone. Rewriting them as markdown images
produced a second failure of a different shape — every URL came back
wrapped in backticks, rendering as code — and the four `<details>`
toggles had been removed as well, their contents flattened into the
page.

## Root-cause chain

1. **Why were the screenshots missing?** The server sanitizes a
   pull-request body before storing it.
2. **Why did the call not fail?** The sanitizer is not a validator. It
   edits the body and stores the result; the API answers 200 either way.
3. **Why was it discovered one form at a time?** Because each rewrite
   was checked by reading the body back, and each read revealed only
   the form that had just been used. Five rounds: `<img>`, then
   markdown images, then plain links to a `.png`, then an angle-bracket
   autolink, then the `<details>` toggles.
4. **Why was the first attempt written with `<details>` at all?** The
   open-pr standard requires at least three of them, and its hook
   refuses a body carrying fewer. That gate runs on `gh pr create` — a
   command this environment does not ship — so on the path that does
   work, the repository's own standard asks for markup the server
   removes.
5. **Why did the existing knowledge entry not prevent it?**
   `docs/knowledge/github-mcp-pr-body-sanitizer.md` records the
   `<details>` half, observed on PR #49. Nothing recorded that images
   are defused too, and nothing was positioned to be read at the moment
   the body was written.

**Root cause:** thought *"a pull-request body is stored as written"*,
actually *"it is rewritten in transit, silently, and the repository's
own body standard was written for a tool this environment does not
have"*.

## Detection failure causes

- **Typing:** the tool input is a string; every form is a valid string.
- **Linter / static analysis:** nothing lints a pull-request body.
- **Functional validation locally:** there is no local render of a
  GitHub body; the only check is a read-back, which was done — after
  the fact, five times.
- **CI:** CI reads the diff, not the description.
- **Code review:** the reviewer is the one the body is written for, so
  a body that arrives gutted is discovered by the person it failed.
- **Knowledge:** the entry existed and covered a different form, which
  is worse than none, because it reads as *the* known limitation.

## Countermeasure

- **Code:** commit `0f55859` — a PreToolUse hook on the two MCP calls
  that write a body refuses one carrying markup the sanitizer defuses,
  and names the shape that survives.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the body is refused before it is sent)

**Reference:** [PR #61](https://github.com/hugoleborso/borso.fr/pull/61) · commit [`0f55859`](https://github.com/hugoleborso/borso.fr/commit/0f55859)

**The actual fix:**

```diff
+if grep -qE '!\[[^]]*\]\(' <<<"$BODY"; then
+  block "the body carries a markdown image; its URL comes back wrapped in backticks and renders as code."
+fi
+
+if grep -qiE '<img[[:space:]]' <<<"$BODY"; then
+  block "the body carries an <img> tag; its src attribute is removed and an empty tag is stored."
+fi
+
+if grep -qiE '<details>|<summary>' <<<"$BODY"; then
+  block "the body carries a <details> toggle; the tag is removed and its contents are flattened into the page."
+fi
```

wired in `.claude/settings.json` under
`PreToolUse.mcp__github__create_pull_request|mcp__github__update_pull_request`.
The refusal names the working shape: commit the screenshots and link the
Files changed tab, which renders them inline; use headings for collapsed
sections; then read the body back.

The probe table behind those rules — what survives and what does not,
one call per form — is in the knowledge entry.

**Sibling defects swept:** the contradiction between the open-pr
standard's `<details>` requirement and this path is now explicit in both
places, so a body is written to the contract of the tool that will
carry it.

## See also

- [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md) — the probe table and the full list of forms.
- [`orchestrator-shipped-with-stale-pr-description`](./orchestrator-shipped-with-stale-pr-description.md) — the other way a description stops matching the work.
- [`docs/knowledge/pr-body-from-cc-ui-skips-skill-sections.md`](../knowledge/pr-body-from-cc-ui-skips-skill-sections.md) — a third path that produces a body the standard never saw.
