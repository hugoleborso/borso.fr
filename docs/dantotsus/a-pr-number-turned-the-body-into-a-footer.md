---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#240'
fix-commits: [self]
eradication-level: 1
eradication-paths: [commitlint.config.js]
time-to-detect: two kaizen sweeps
tags: [commitlint, git, hooks, gates, self-improvement-loop]
zone: commitlint.config.js
weak-point: gate-measures-nothing
recurs: none (the PR #230 sweep closed the same warning as a no-op, so no entry exists to repeat)
---

# A PR number turned the body into a footer

## User impact

Agents writing commits, and the operator reading the warnings they relay, got
a warning on correct messages, and a refusal waiting behind it.

| | Seen | Expected |
| --- | --- | --- |
| Three of the nine commits on PR #240, each with a blank line before its `Co-Authored-By` trailers | `⚠ footer must have leading blank line [footer-leading-blank]` | no warning |
| A probe naming `#234`, then a 150-character body line | exit 1, `footer's lines must not be longer than 100 characters` (measured) | accepted, since `body-max-line-length` is off |

The PR #230 sweep saw the same warning on both of its commits and closed it as
"a warning, not a refusal".

Nearly every commit is exposed. 310 lines of the last 400 commit messages on
`main` held `#N`, and `BREAKING CHANGE` appeared in 0 of 1,396 (measured on
2026-10-29).

## Causal chain

- A correct message warned that its footer had no leading blank line.
  - commitlint parses with `conventional-commits-parser`, which opens the footer at the first line holding an issue reference (`#` then digits) or a `BREAKING CHANGE` note. The three commits named `PR #234` mid-paragraph, so the footer began inside the body. Replacing `PR #234` with `PR 234` in `230ca34` silences the warning (measured).
    - The three commits cited `PR #234` as the evidence for a claim, because the writing rules ask every claim to carry its evidence.
    - `Co-Authored-By:` is neither a reference nor a note keyword. A message whose body names no `#N` parses with a `null` footer (measured with the parser directly), so the footer rules never read the trailers.
    - Once the footer starts at `#N`, every later body line is a footer line, and `footer-max-line-length` refuses one over 100 characters.

      ```js
      // commitlint.config.js after 86f23945a
      'body-max-line-length': [0], // ❌ footer-max-line-length stays at 100, inherited from config-conventional
      ```

      - Commit `86f23945a` (2026-08-17, an agent) turned off the body cap because tables in commit bodies run past 100 characters. It left the footer cap on, reading the footer as the trailer block. The parser's footer rule appears nowhere in the commit or the config it extends. (Material)

## Root cause of occurrence

*Thought commitlint's footer rules check the trailer block, actually they check
whatever follows the first `#N`, which here is the body.*

Material, inferred. The input was `@commitlint/config-conventional`, whose rule
names say "footer" and whose meaning of footer lives in
`conventional-commits-parser`: a footer opens at a reference or a note
keyword. Nothing the agent changed or read in `86f23945a` states that rule.

## Detection failure causes

- **Hook and CI:** `footer-leading-blank` is a warning, and both `.husky/commit-msg` and the CI `commitlint` job exit 0 on warnings, so nothing turned red.
- **Friction log:** `.husky/commit-msg` logs friction only on a refusal. A warning reaches the log only when someone writes it by hand, and the archive of PR #240 holds one line, written by a hook.
- **Review:** the PR #230 sweep judged the warning harmless without testing whether the same parse could refuse a commit.

## Countermeasure

`footer-leading-blank` and `footer-max-line-length` are off in
`commitlint.config.js`. The property dropped: a `BREAKING CHANGE` note without
a blank line before it no longer warns, and a note line over 100 characters is
no longer refused. No commit on `main` has carried such a note.

The alternative kept both rules and stopped the parser treating `#N` as a
reference (`issuePrefixes: null`). commitlint takes a config's own
`parserPreset` whole, so that meant copying the preset's header pattern and
note keywords. A prototype that set only `issuePrefixes` failed `feat!: probe`
with `type may not be empty`. Two rules off is the smaller change.

## Eradication

**Type:** structural impossibility (level 1) for the footer rules. No enabled
rule reads the parsed footer.

**Reference:** the commit adding this file (`fix-commits: [self]`).

```diff
     'body-max-line-length': [0],
+    'footer-leading-blank': [0],
+    'footer-max-line-length': [0],
```

The gap, measured on 2026-11-27. `body-leading-blank` is still a warning from
`config-conventional`, and `commitlint --help` lists
`-s, --strict  enable strict mode; result code 2 for warnings`. Both gates
still run without it, so a warning of any rule passes unseen.

**Proposed:** run `commitlint --strict` in `.husky/commit-msg` and in the CI
`commitlint` job. A warning then refuses like an error, the hook's existing
refusal path logs it as friction, and no rule can warn on every commit for
months unread. Setting every inherited warning rule to error or off in
`commitlint.config.js` reaches the same state without the flag.

**Proof it can fail:** before the change, `230ca34`, `8f3ee3c` and `1b378ab`
each warned, and a probe with `#234` then a 150-character line exited 1. After
it, all four are clean. `feat(nope): probe` still fails `scope-enum`, and a
body right under the header still warns `body-leading-blank`.

**Similar instances:** `references-empty` is the only other rule that reads
the parsed references, and `commitlint --print-config` does not list it, so it
is not enabled.
