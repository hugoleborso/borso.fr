---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#83'
fix-pr: '#86'
fix-commits: [a7f4378]
eradication-level: 2
time-to-detect: days
tags: [hooks, github, harness, meta, self-improvement-loop]
---

# The hook guarded every form but the documented one

## Symptom

Opening PR #83, the body was refused twice by the pull-request-body hook for
carrying collapsible sections, rewritten as headings, and accepted. Reading the
stored body back afterwards, two sentences had quietly lost a word each: a
placeholder written in angle brackets after `file:` was gone, and so was the
line number after a colon. The sentences still parsed. They now said something
else.

The behaviour was not a discovery. It is written down three times over, from
three different PRs, in the knowledge entry the hook's own error message points
at.

## Root-cause chain

1. **Why?** The GitHub MCP server reads anything shaped like a tag as HTML and
   removes it, and a placeholder in angle brackets is shaped like a tag.
2. **Why did the hook not refuse the call?** Because the hook has four rules,
   and none of them is this one.
3. **Why not, when the entry it cites documents this form first?** Because the
   hook was written on 2026-08-18 to solve the problem in front of its author
   that day — a body carrying before-and-after screenshots of a phone screen
   that arrived defused. It guarded the four forms that probe measured. The
   placeholder had been measured three days earlier, on two other PRs, and was
   not in front of anyone.
4. **Why did the entry not stop it anyway?** Because the entry is read after
   the failure, not before the call. That is what the hook is for, and the hook
   is where the knowledge did not travel to.
5. **Why did it bite twice in one session rather than once?** Because the first
   loss was found by reading the body back, repaired, and the repair reused the
   same convention in a different sentence.

**Root cause:** thought the hook covers the sanitizer, actually the hook covers
the probe its author ran that day — and the form with the most evidence behind
it was the one form nobody had needed on the day the hook was written.

## Detection failure causes

- **Typing / linter:** neither reads a string destined for an HTTP body.
- **Functional validation locally:** the call succeeds. That is the whole
  problem — the server stores the mutilated body and returns 200.
- **CI:** `scripts/check-hook-decisions.sh` holds each hook to its contract,
  but a contract is a table of cases and a case nobody wrote is a case that
  passes.
- **Code review:** the body a reviewer reads is the stored one, which is
  grammatical.
- **PO / QA validation:** the operator reads the rendered PR. A deleted
  placeholder leaves a sentence that reads fine.

## Countermeasure

The two sentences were rewritten without brackets before the PR was opened —
`PATH`, `PATH:118`, `PATH#SYMBOL`. That is a repair, not a fix; the next body
would have done the same thing.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the hook now refuses the form before the call)

Level 1 would be a body builder that escapes on the way out, which this harness
has no seam for: the body is a string argument to an MCP tool the agent calls
directly. Level 3 is a vendor patch to a server that is not ours.

**Reference:** PR #86 · commit [`a7f4378`](https://github.com/hugoleborso/borso.fr/commit/a7f4378)

**The actual fix:** a fifth rule in `.claude/hooks/pretool-github-pr-body.sh`,
and it reads the raw body rather than the rendered one:

```bash
PLACEHOLDER="$(grep -oE '<[A-Za-z][A-Za-z0-9._/:-]*>' <<<"$BODY" | head -1 || true)"
if [[ -n "$PLACEHOLDER" ]]; then
  echo "[pr-body] the body carries $PLACEHOLDER, which the server reads as an HTML tag and deletes." >&2
```

The raw body is the interesting half. Every other rule in that file runs against
a copy with code spans and fenced blocks stripped, because a hook that greps for
markup has to tell a use from a mention and in prose the mention is quoted. For
this form there is no mention: the sanitizer strips markup *before* markdown
fencing is considered, so a body quoting a placeholder in backticks loses it
exactly like a body using one. A rule written against the stripped copy would
have been silent on precisely the occurrences that get deleted.

That has a consequence for the contract table, and it was already wrong there.
`scripts/check-hook-decisions.sh` carried an allow case reading *"The server
removes `<details>` and wraps an image link in backticks"* — a body that,
posted, would have arrived without the word `<details>` in it. It now names the
collapsible section in words, and five new cases pin the new rule: three bodies
refused (a bare placeholder, one inside backticks, an autolinked URL) and two
accepted (a real path, and the rule described without brackets). Eighteen
decisions, all matching.

**Sibling defects swept:** the audit of the other three rules found no second
case of a rule reading the wrong copy — the image rules genuinely are about URL
handling rather than tag stripping, and a quoted image link does survive.

## See also

- [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md) —
  the catalogue, including the three observations of this form that predate the
  hook. Its verification procedure is still the thing to run before adding a
  claim.
- [`docs/dantotsus/a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md) —
  the same failure as a general rule: an entry that records a trap does not
  stop the trap; only a gate reading the entry's conclusion does.
- [`docs/dantotsus/the-hook-that-refused-the-page-explaining-it.md`](./the-hook-that-refused-the-page-explaining-it.md) —
  the mention-versus-use question this file's stripper exists to answer, and
  why the answer is form-dependent.
