---
date: 2026-08-21
introduced-at: implementation
detected-at: linter
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/81
tags: [eslint, code-quality, tooling, frontend]
---

# Removing a comment can turn a lint rule red

A comment is not always inert. Two ESLint rules count it as content, so
deleting one makes the code newly illegal:

- **`no-empty`** — `catch { /* storage is unavailable */ }` becomes
  `catch {}`, which the rule rejects.
- **`@typescript-eslint/no-empty-function`** — a no-op function whose body is
  a single comment becomes an empty body.

`strip-front-apps` hit both on PR #81: three no-op functions and one `catch`
in `apps/borsouvertures/site/src/state/appState.ts`. **The comment was what
satisfied the rule.**

## What to write instead

The fix is not a replacement comment. It is to say the same thing in code:

- **Name the intent as a function.** The empty `catch` now calls
  `ignoreUnavailableStorage()` — the handler still does nothing, and the
  reader is told that doing nothing is the decision.
- **Return explicitly.** A no-op callback becomes `return undefined;`, which
  is the pattern `detachNothing` in `Galaxy.tsx` already used.

Both are better than the comment was, because a name survives being read out
of context and a comment does not.

## Why it is worth knowing

A mass comment removal looks like a whitespace change and is not. Run the
linter over each file you strip rather than over the whole tree at the end:
the failures are localised and each one is a small design question about what
the empty block actually means.
