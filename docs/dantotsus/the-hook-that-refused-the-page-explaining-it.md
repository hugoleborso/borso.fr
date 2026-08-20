---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#40'
fix-pr: '#74'
fix-commits: [df47cd5]
eradication-level: 2
time-to-detect: 12 days
tags: [hooks, agent-harness, meta]
---

# The hook that refused the page explaining it

## Symptom

Two commands in one session were refused by `pretool-no-broad-kill.sh`, and
neither killed anything:

```
scripts/kaizen.sh "… the pattern-matching process killers are blocked by a hook …"
echo "=== pkill dantotsu ==="; cat docs/dantotsus/broad-pkill-…md
```

Every refusal printed the same advice — *kill a PID you own, not a name
pattern* — to a caller that was appending a log line, listing a directory, or
opening the very entry that explains the rule. The second one is worth reading
twice: the agent was reaching for the dantotsu behind the hook, and the hook
stopped it over the `echo` label announcing the file. The path itself was never
the trigger — the old regex wants a shell separator before the word, and the
hyphen in `broad-pkill-…` is not one — so the refusal came from the sentence
introducing the entry rather than from the entry.

## Root-cause chain

1. **Why was a log line refused?**
   Because the hook greps the whole command string for `pkill|killall`, and the
   word was in it — inside a quoted argument to an unrelated script.

2. **Why does grepping the whole string find mentions?**
   Because the hook's regex asks only that the word be surrounded by whitespace
   or a shell separator. `echo "=== pkill dantotsu ==="` satisfies that: the
   space before the word is a space, whatever precedes it.

3. **Why did the hook not already exclude quoted text?**
   It excludes heredoc bodies, added when the commit *arming* the hook was
   refused by it for describing the rule in its own message. The fix drew the
   line at the shape that had just bitten, and a quoted argument is the same
   shape with different punctuation.

4. **Why did the sibling hooks' identical fix not carry over?**
   `pretool-github-pr-body.sh` had the same bug — it refused the body that
   explained the sanitizer, for quoting the markup it forbids — and fixed it in
   commit `0224b28` by stripping code spans. `pretool-no-swallowed-push.sh`
   then met the same wall and answered it properly, with a reusable
   `strip-quoted-strings.py`. Three hooks, three independent discoveries of one
   rule: *drop the text being written before deciding whether something is
   being run*. The third even left the tool behind — and this hook, sitting one
   directory away from it, still did not use it, because nothing tested any of
   them.

5. **Why does a false refusal matter, when the agent can just rephrase?**
   Because the message it prints is advice for a problem the caller does not
   have. An agent that is refused for reading a file learns that the hook is
   noise, and a hook treated as noise is a hook that gets worked around on the
   day it is right. This one guards another agent's twenty-minute measurement.

**Root cause:** thought "the command contains the word" meant "the command runs
it", actually a word inside a string literal cannot be the command word of the
shell that quotes it, and the commands most likely to quote a dangerous word
are the ones documenting why it is dangerous.

## Detection failure causes

- **Typing:** not applicable — shell and a regex.
- **Linter / static analysis:** nothing lints a hook's decisions; a regex that
  over-matches is valid in every sense a linter checks.
- **Functional validation locally:** the hook was validated on the commands it
  should refuse. Nobody ran the commands it should allow, so half the contract
  was never exercised.
- **CI (tests / build):** the hooks had no tests of any kind, which is the
  general case for the shell gates here — see
  [`the-shell-gates-are-only-ever-run-where-they-pass`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md),
  written days before this and asking for exactly the harness below.
- **Code review:** both halves of the regex read correctly; the missing case is
  a command nobody wrote down.
- **Staging / production monitoring:** not applicable.

## Countermeasure

Quoted bodies are dropped before matching, the way heredoc bodies already
were. No new code was needed: `strip-quoted-strings.py` already sat in the same
directory, written for `pretool-no-swallowed-push.sh`, and applies here
unchanged — it empties each quoted span and keeps the quotes, so nothing fuses
into a word nobody wrote.

This deliberately does *not* try to catch `bash -c "pkill node"`, which the old
regex missed too: a quote-aware parser that finds nested command words is a
different program, and the shape that actually occurs here is prose.

## Eradication (mandatory — code-level)

**Type:** code diff · DevX check (level 2 — DevX check)

**Reference:** [PR #74](https://github.com/hugoleborso/borso.fr/pull/74) · commit [`df47cd5`](https://github.com/hugoleborso/borso.fr/commit/df47cd5)

**The actual fix:**

```diff
-COMMAND_TO_RUN="$(printf '%s' "$COMMAND" | python3 "$(dirname "$0")/strip-heredocs.py")"
+COMMAND_TO_RUN="$(printf '%s' "$COMMAND" |
+  python3 "$(dirname "$0")/strip-heredocs.py" |
+  python3 "$(dirname "$0")/strip-quoted-strings.py")"
```

One line, and it had been available for days. That is the tell that the fix
worth shipping is the one below.

The fix that matters more is the one that makes the *class* visible, because
this bug's real cause is that a hook's decisions were never checked. Both halves
of every hook's contract are now a table — a command it must refuse, and the
mention of that command it must let through — run by `pre-commit`:

```diff
+echo "[pre-commit] checking the hooks decide what they promise"
+scripts/check-hook-decisions.sh
```

Verified against the pre-fix hook: with `pretool-no-broad-kill.sh` stashed to
its previous version, `scripts/check-hook-decisions.sh` fails on exactly the
`echo` case above and exits 1; with the fix in place, thirteen decisions match.

**Sibling defects swept:** `pretool-github-pr-body.sh` — same class, already
fixed in `0224b28`, and now covered by four rows of the same table so the fix
cannot silently regress. `pretool-gh-pr-create.sh` and `rtk-rewrite.sh` were
read for the same shape; neither decides on a word that appears in prose about
it. `pretool-no-swallowed-push.sh`, `pretool-no-discarding-reset.sh` and
`posttool-empty-checks-means-conflict.sh` arrived from `main` mid-branch and
are the obvious next rows for the table.

## See also

- [`broad-pkill-killed-another-agents-measurement.md`](./broad-pkill-killed-another-agents-measurement.md) — why the hook exists, and the entry this bug blocked an agent from reading.
- [`a-pull-request-body-the-server-quietly-emptied.md`](./a-pull-request-body-the-server-quietly-emptied.md) — the sibling hook, and the first discovery of the same rule.
- [`github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md) — what that hook is defending against.
- [`two-copies-that-had-to-agree-and-nothing-made-them.md`](./two-copies-that-had-to-agree-and-nothing-made-them.md) — the other shape of "one lesson, two files, nothing carrying it across".
- [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md) — a written lesson that did not reach the next reader, which is what happened to the stripper sitting unused one directory away.
