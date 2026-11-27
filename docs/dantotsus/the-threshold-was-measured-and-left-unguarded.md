---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#100'
fix-commits: [948204d50a, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/github-pr-body.core.ts, scripts/hooks/checks/github-pr-body.core.test.ts]
time-to-detect: minutes
tags: [github, hooks, gates, meta, tooling]
zone: scripts/hooks/checks/github-pr-body.core.ts
weak-point: gate-measures-nothing
recurs: [the-hook-guarded-every-form-but-the-documented-one]
---

# The threshold was measured, written down, and guarded by nobody

## User impact

The operator read PR #100's body with one dead link. The server stored it
like this (measured, read back from the PR):

```
Its three FAIL rows were not defects, and the [resolution note](``https://github.com/…-resolution.md)``  says why
```

| | Seen | Expected |
| --- | --- | --- |
| The "resolution note" link | the URL and closing parenthesis inside a code span, no anchor | a clickable link to the note |

The sentence around it still read as if it worked, so a reader had no sign
that the evidence was missing.

## Causal chain

- The link in PR #100's body was dead.
  - The GitHub MCP server wrapped the link's target in double backticks.
    - The target was longer than about 150 characters, the length past
      which the server wraps a markdown link's target.
      - The session built the link from the branch name in the shell's
        `HEAD`, the 42-character form, as
        `https://github.com/hugoleborso/borso.fr/blob/<branch>/…-resolution.md`.
        - It wrote the body in one pass, with no knowledge of the length
          limit. The limit lived in
          `docs/knowledge/github-mcp-pr-body-sanitizer.md`, measured on six
          samples from PRs #46 and #48 on 2026-08-14. No hook printed it when
          the body was written, and the session had not read it (Material).

## Root cause of occurrence

*Thought a markdown link of any length survives the GitHub MCP server,
actually the server wraps a link's target in backticks once it passes about
150 characters.* (Material)

The writing session did not have the knowledge entry in its context. The
fact was in the repository, but nothing brought it to the moment the link
was assembled. The entry, measured 2026-08-14, separates its six samples
cleanly at about 150 characters.

## Detection failure causes

- **Hook:** `.claude/hooks/pretool-github-pr-body.sh` refused the shapes
  whose form gives them away: an image extension, an `<img>`, a
  `<details>`, an autolink, an angle-bracket placeholder. Its header listed
  the 2026-08-18 probe of PR #60, which says `[text](….md)` links come back
  "untouched". The length behaviour came from the older 2026-08-14 entry,
  and a long link differs from a short one only by a number, so the hook
  was written without it.
- **CI:** the body is not in the repository.
- **Review:** the broken link renders as a code span mid-sentence, and the
  paragraph still reads.

## Countermeasure

The body was read back after posting and the link was replaced by a sentence
naming the file in words.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `948204d50a` (#102) added the length rule. Commit
`458e886c4` (#411) moved it into
`scripts/hooks/checks/github-pr-body.core.ts` with its message as it reads
today. The shell hook `.claude/hooks/pretool-github-pr-body.sh` is gone.

The `pr-body` check runs before `mcp__github__create_pull_request` and
`mcp__github__update_pull_request` and refuses a link whose target passes
150 characters:

```ts
const LONG_LINK = /\]\([^) \n]{150,}\)/u;
...
return `the body carries a markdown link whose target is ${String(longLink.length - LINK_WRAPPER_LENGTH)} characters; past about 150 the URL comes back wrapped in backticks and the anchor is dead. Name a file the branch adds by its path in a code span, since a /blob/main/ link to it is a 404 until merge. Link through /blob/main/ only for a file already on main, or write the bare URL, which autolinks at any length.`;
```

The first version's advice, "link through `/blob/main/`", was wrong for a file
the pull request adds. Such a link is a 404 until merge. The message now
says so.

**Proof it can fail:** `scripts/hooks/checks/github-pr-body.core.test.ts`
holds the case "refuses a link whose target passes 150 characters and says
how long it is", and a passing case for a long target with a space in it.

**Similar instances:** every form in the knowledge entry's probe table had a
rule already. This was the one that had a number instead of a shape.

**Related.**

- [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md), the same lesson, which is why this one is a dantotsu rather than another paragraph on the page.
- [`a-pull-request-body-the-server-quietly-emptied.md`](./a-pull-request-body-the-server-quietly-emptied.md), the dantotsu that built the hook this one extends.
- [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md), the measurement, the six samples and the round-trip procedure.
