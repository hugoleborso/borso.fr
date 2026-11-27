---
date: 2026-08-18
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#60'
fix-commits: [0f55859e99]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/github-pr-body.core.ts, scripts/hooks/markdown-code.core.ts]
time-to-detect: 3 days
tags: [github, harness, hooks, gates, meta, open-pr]
zone: .claude/skills/open-pr
---

# A pull request body the server quietly emptied

## User impact

The operator asked for screenshots in PR #60. The body carried two `<img>` tags
in a before-and-after table. The call answered 200, and the page showed two
empty boxes. The stored body, read back:

```
| Setlists index, phone | <img width="300"> | <img width="300"> |
```

| | Seen | Expected |
| --- | --- | --- |
| Screenshots | two empty boxes, `src` gone | the two screenshots |
| Markdown images, second try | each URL wrapped in backticks, rendered as code | the images |
| The four `<details>` toggles | removed, their contents flattened into the page | collapsed sections |

Five rewrites were needed, one form at a time (measured in the session that
found it): `<img>`, markdown images, plain links to a `.png`, an angle-bracket
autolink, then the toggles.

## Causal chain

- The PR page showed empty boxes and flattened sections.
  - The GitHub MCP server sanitized the body before storing it, and answered 200.
    - The body sent carried `<img>` tags, markdown images and four `<details>` toggles.
      - The session wrote the toggles because the open-pr skill asked for them.
        Its gate refused a `gh pr create` body with fewer than three:
        `at least 3 <details> blocks` (`.claude/skills/open-pr/SKILL.md` at
        `0f55859^`, line 130). This environment did not ship `gh` then, so the
        body went through `mcp__github__update_pull_request` instead.
      - The session wrote images because the only record of the sanitizer said
        they survive. `docs/knowledge/github-mcp-pr-body-sanitizer.md` at
        `0f55859^`: "PR #26 ... stored body contains `<details>` / `<summary>`
        blocks and `![alt](url)` markdown images. Both render correctly on
        GitHub." The same entry put an earlier missing `src` down to the writer:
        "image tags emitted without `src` ... not a sanitiser rewrite".

## Root cause of occurrence

*Thought a body sent through the GitHub MCP tool is stored as written, actually
the server rewrites it: an `<img>` loses its `src`, an image URL comes back in
backticks, and `<details>` is removed.* **Material.** The knowledge entry, the
one record of the sanitizer, stated that markdown images and toggles render, and
blamed a lost `src` on its writer. The skill asked for toggles on a path this
environment does not have. Whether the session had the knowledge entry loaded is
not recorded (inferred: the skill linked it).

## Detection failure causes

- **Typing:** the tool input is a string, and every form is a valid string.
- **Linter:** no hook read a pull-request body sent through the MCP tool. The
  only body gate ran on `gh pr create`, a command that fails here.
- **Local validation:** nothing renders a GitHub body locally. A read-back is
  the only check, and it reveals only the form just sent.
- **CI:** CI reads the diff, not the description.
- **Review:** the reviewer is the reader the body was for, so a gutted body is
  found by the person it failed.

## Countermeasure

Commit `0f55859` added a PreToolUse hook on `mcp__github__create_pull_request`
and `mcp__github__update_pull_request`. It refuses a body carrying markup the
sanitizer defuses and names the shape that survives: commit the screenshots,
link the Files changed tab, use headings for collapsed sections, then read the
body back. The knowledge entry was corrected with a probe table, one call per
form.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`0f55859`](https://github.com/hugoleborso/borso.fr/commit/0f55859e99)
shipped the shell hook. Commit `458e886` (#411) ported every shell hook to
TypeScript checks
([ADR](../adr/2026-11-26T2000-hooks-are-typescript-one-process-per-event.md)). The rule now lives in
`scripts/hooks/checks/github-pr-body.core.ts`. It reads the body through
`stripMarkdownCode` from `scripts/hooks/markdown-code.core.ts`, so prose that
quotes a tag in a code span is not refused.

```diff
+const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\(/u;
+const IMG_TAG = /<img[^\S\n]/iu;
+const DETAILS_TAG = /<details>|<summary>/iu;
+const IMAGE_FILE_LINK = /\]\([^)\n]+\.(png|jpe?g|gif|webp|svg)([?#][^)\n]*)?\)/u;
```

**Proof it can fail:** the check, fed `| Setlists | <img width="300" src="a.png"> |`
on `mcp__github__update_pull_request` this session:

```
"kind": "refuse", "rule": "pr-body",
"[pr-body] the body carries an <img> tag; its src attribute is removed and an empty tag is stored."
```

**Similar instances:** the check also refuses a link to an image file, a link
target over about 150 characters and an angle-bracket placeholder, each probed
on a real pull request and listed in the knowledge entry. The knowledge entry
now carries `triggers:` on `.claude/skills/open-pr/SKILL.md` and `template.md`.

**Proposed:** subtract the toggle shape. `.claude/skills/open-pr/SKILL.md` step 3
still says "only a body posted through an authenticated `gh` uses toggles", while
step 4 records that `gh pr create` answers 403 here. `readDetailsBlocks` in
`scripts/pr/pr-body.core.ts` still accepts a `<details>` before-merge block. With
headings as the one block shape, the checker and the skill stop describing a body
no working path can post, and the `<details>` branch of the hook guards nothing.
