---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#240'
fix-pr: none (opened by this kaizen sweep, number not known when written)
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

## Symptom

Three of the nine commits on PR #240 printed this on commit:

```
⚠   footer must have leading blank line [footer-leading-blank]
⚠   found 0 problems, 1 warnings
```

Each of the three had a blank line before its `Co-Authored-By` trailers. The
sweep of PR #230 saw the same warning on both of its commits and closed it as
a no-op, "a warning, not a refusal". Nobody logged it on PR #240.

## Root-cause chain

1. **Why did a correct message warn?**
   commitlint parses with `conventional-commits-parser`, which opens the footer
   at the first line holding an issue reference (`#` then digits) or a
   `BREAKING CHANGE` note. The three commits named `PR #234` mid-paragraph, so
   the footer began there, inside the body, with no blank line before it.
   Measured: replacing `PR #234` with `PR 234` in commit `230ca34` silences
   the warning.
2. **Why do the trailers not count as the footer?**
   `Co-Authored-By:` is neither a reference nor a note keyword. A message whose
   body names no `#N` parses with a `null` footer (measured with the parser
   directly). The footer rules never looked at the trailers.
3. **Why is it more than noise?**
   Once the footer starts at `#N`, every later body line is a footer line.
   `footer-max-line-length` is an error at 100, while `body-max-line-length`
   is off on purpose. A 150-character body line after a `#N` line is refused
   (measured: exit 1, `footer's lines must not be longer than 100
   characters`).
4. **Why does the repository hit it constantly?**
   Commits cite pull requests as evidence, as the writing rules ask. 310 lines
   of the last 400 commit messages on `main` hold `#N`, and `BREAKING CHANGE`
   appears in 0 of 1,396 (measured).
5. **Why did no sweep fix it?**
   The warning was read as cosmetic, and nobody logs a warning by hand. The
   archive of PR #240 holds one line, written by a hook.

**Root cause:** thought *"the footer rules check the trailer block"*, actually
*"they check whatever follows the first `#N`, which here is the body"*.

## Detection failure causes

- **Linter / static analysis:** commitlint was the check, and it reported the
  body as the footer.
- **CI (tests / build):** the CI `commitlint` job passes on warnings, so the
  warnings never turned anything red.
- **Code review:** the PR #230 sweep read the warning, judged it harmless, and
  did not test whether the same parse could refuse a commit.

## Countermeasure

- **Code:** `footer-leading-blank` and `footer-max-line-length` are off in
  `commitlint.config.js`.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commits [self]

**The actual fix:**

```diff
     'body-max-line-length': [0],
+    'footer-leading-blank': [0],
+    'footer-max-line-length': [0],
```

The property dropped: a `BREAKING CHANGE` note without a blank line before it
no longer warns, and a note line over 100 characters is no longer refused.
No commit on `main` has carried such a note.

The alternative kept both rules and stopped the parser treating `#N` as a
reference (`issuePrefixes: null`). commitlint takes a config's own
`parserPreset` whole, so that meant copying the conventional preset's header
pattern and note keywords into the config. A prototype that set only
`issuePrefixes` lost the header pattern and failed `feat!: probe` with
`type may not be empty`. Two rules off is the smaller change.

**Proof it acts:** before the change, `230ca34`, `8f3ee3c` and `1b378ab` each
warned, and a probe with `#234` then a 150-character line exited 1. After it,
all four are clean. `feat(nope): probe` still fails `scope-enum`, and a body
right under the header still warns `body-leading-blank`.

**Sibling defects swept:** `references-empty` is the only other rule that
reads the parsed references, and `commitlint --print-config` does not list
it, so it is not enabled.

## See also

- [`../knowledge/commitlint-header-100-char-cap.md`](../knowledge/commitlint-header-100-char-cap.md),
  the other 100-character cap commitlint holds here.
- [`sixteen-gates-were-trusted-because-they-had-never-failed.md`](./sixteen-gates-were-trusted-because-they-had-never-failed.md),
  a gate trusted without seeing what it measured.
