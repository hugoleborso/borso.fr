# commitlint caps body lines at 100 characters, not just the header

Observed 2026-08-15. A commit with a markdown table in its body was rejected:

```
✖ body's lines must not be longer than 100 characters [body-max-line-length]
```

The header cap is already recorded in
[`commitlint-header-100-char-cap.md`](./commitlint-header-100-char-cap.md); the
body has its own rule with the same number, and it bites on exactly the content
that makes a good refactor message — a table comparing before and after.

A table row like

```
| a commit edits a standard, `--check` runs without regenerating | passes | passes; raw bytes differ |
```

is 104 characters and fails. Rewriting the table as a bulleted list keeps the
comparison and clears the cap:

```
- A commit edits a standard, then `--check` runs without regenerating: passes.
  The raw bytes do differ, and the difference is entirely inside the fence.
```

Worth knowing before writing a long commit body, because the hook runs at
`commit-msg` — after every other gate has already spent its time.
