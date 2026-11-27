---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#83'
fix-commits: [a7f4378899, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/github-pr-body.core.ts, scripts/hooks/checks/github-pr-body.core.test.ts]
time-to-detect: days
tags: [hooks, github, harness, meta, self-improvement-loop]
zone: scripts/hooks/checks/github-pr-body.core.ts
weak-point: gate-measures-nothing
recurs: [two-guard-hooks-that-never-guarded]
---

# The hook guarded every form but the documented one

## User impact

The operator reads pull request bodies on GitHub. The stored body of PR #83
said something other than what the agent wrote.

| | Seen | Expected |
| --- | --- | --- |
| A sentence naming a file | the angle-bracket placeholder after `file:` gone, the sentence still grammatical | the placeholder kept |
| A sentence naming a line | the line number after a colon gone | the line number kept |

The agent found both losses by reading the body back with `pull_request_read`
(measured, on PR #83, 2026-08-21). The same loss was measured on PR #49 and
PR #51 on 2026-08-15 and on PR #82 that morning, per the commit message of
`a7f4378`.

## Causal chain

- Two sentences of PR #83's stored body each lost a word.
  - The GitHub MCP server read each angle-bracket placeholder as an HTML tag
    and deleted it, inside backticks too, then returned 200.
    - The agent wrote the placeholders in angle brackets, some inside a code
      span.
      - It wrote them in the repository's own convention. `CLAUDE.md` and
        every skill write placeholders that way:
        `grep -oE '<[A-Za-z][A-Za-z0-9 ._/:-]*>' .claude/skills/open-pr/SKILL.md | wc -l`
        prints 25 today (measured).
        - The fact that the sanitizer deletes them lived only in
          `docs/knowledge/github-mcp-pr-body-sanitizer.md`, which says so
          itself: "which is exactly how this repository writes placeholders
          everywhere else, including in `CLAUDE.md` and every skill". That
          entry was not in the agent's context when it wrote the body
          (inferred: nothing loads it before a call).
  - The repair of the first loss reused the same convention in another
    sentence, and it lost a word too.

## Root cause of occurrence

*Thought a code span keeps an angle-bracket placeholder intact in a pull
request body, actually the GitHub MCP server strips tag-shaped text before
markdown fencing is considered.* (Material)

The agent wrote the line with the repository's placeholder convention in its
context and without the one document that contradicts it.
`docs/knowledge/github-mcp-pr-body-sanitizer.md`, read this session: "Applies
to any angle-bracket convention a description might use ... which is exactly
how this repository writes placeholders everywhere else". Had the agent known
it, it would have written `PATH` or a real example.

## Detection failure causes

- **Typing and lint:** neither reads a string sent as an MCP tool argument.
- **Local:** the call succeeds. The server stores the shortened body and
  returns 200.
- **Agent hook:** `pretool-github-pr-body.sh`, written on 2026-08-18 in
  `0f55859e9`, held four rules. They were the four forms its author's probe
  measured that day, and the placeholder was not one of them.
- **CI:** `scripts/check-hook-decisions.sh` held each hook to a table of
  cases. A form with no row passed.
- **Review:** the reviewer reads the stored body, which is grammatical.

## Countermeasure

The two sentences were rewritten without brackets before the PR was opened,
as `PATH`, `PATH:118` and `PATH#SYMBOL`. That repairs this body, not the
next one.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`a7f4378`](https://github.com/hugoleborso/borso.fr/commit/a7f4378)
added a fifth rule to the shell hook. Commit `458e886c4` (PR #411) replaced
the shell hooks with TypeScript checks, and the rule now lives in
`scripts/hooks/checks/github-pr-body.core.ts`. It reads the raw body, not the
code-stripped copy, because a code span does not protect the placeholder.

```ts
const PLACEHOLDER = /<[A-Za-z][A-Za-z0-9._/:-]*>/u;
// ...
const placeholder = PLACEHOLDER.exec(body)?.[0];
if (placeholder === undefined) return PASS;
return refuse(RULE, 'wrote a pull-request body carrying an angle-bracket placeholder the server deletes', [
```

`scripts/check-hook-decisions.sh`, which held the first version, was deleted
in `c54e32da7` (PR #224). Today the rule is held by
`github-pr-body.core.test.ts` under the per-file 100% coverage of
`vitest.config.ts`.

**Proof it can fail:** the check fed to `tsx` this session (measured).

```text
body "see <app>"              refuse
body "see `<path/to.ts>`"     refuse
body "see `<two words>`"      pass
```

The third line is the gap. A placeholder with a space passes, and the server
deletes it all the same (inferred from the sanitizer entry, which deletes any
tag-shaped text).

**Similar instances:** `grep -rn 'PLACEHOLDER = ' scripts` finds a second
copy of the same fact in `scripts/pr/pr-body.core.ts:78`,
`/<[A-Za-z][A-Za-z0-9 _-]*>/`. It catches `<two words>` and misses
`<path/to.ts>`. The two copies disagree in both directions.

**Proposed:** export one placeholder pattern, with the union of both
character sets, from one module, and import it in
`github-pr-body.core.ts` and `pr-body.core.ts`. A placeholder that one gate
catches and the other misses then cannot exist. A second step would subtract
the refusal: the `rewrite` verdict of `scripts/hooks/check.core.ts`, which
`no-swallowed-push.core.ts` already uses, could escape each `<` as `&lt;`
before the call. That needs a probe first, because whether the server keeps
`&lt;` is unverified.
