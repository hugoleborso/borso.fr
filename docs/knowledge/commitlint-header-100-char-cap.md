# commitlint enforces a hard 100-char cap on the commit *header*

## Symptom

```
✖   header must not be longer than 100 characters, current length is 104 [header-max-length]
✖   found 1 problems, 0 warnings
husky - commit-msg script failed (code 1)
```

…fired by the commit-msg hook when the commit's first line is over 100 characters. Several commits during PR #6 hit this; each retry needed an amend with a shorter title.

## Why

The repo extends `@commitlint/config-conventional`, whose default `header-max-length` is 100. The `scope-enum` is configured to allow rich scopes (`borso-fr`, `borsouvertures`, `infra`, `ci`, `docs`, `deps`), but the cap counts the entire header — `<type>(<scope>): <subject>` — including the parentheses and the colon-space.

A scope like `borso-fr` (8 chars) plus the type and separators consumes 14 characters before the subject begins. That leaves 86 characters for the actual subject. Long subjects routinely overflow.

## How to size it

Rough budget for the `<subject>` portion, by scope:

| Scope | Boilerplate | Subject budget |
| --- | --- | --- |
| `feat(borso-fr): ` | 16 | 84 |
| `fix(borso-fr): ` | 15 | 85 |
| `docs(borso-fr): ` | 16 | 84 |
| `feat(infra): ` | 13 | 87 |
| `docs: ` | 6 | 94 |
| `chore(deps): ` | 13 | 87 |

If the subject would be longer, move detail into the body — that's what the body is for. Conventional Commits explicitly recommends short headers and rich bodies.

## How to fix mid-amend without losing the body

```bash
git commit --amend -m "<short header>" -m "<paste the original body verbatim>"
```

Two `-m` flags create a two-paragraph commit (header + body). Don't try to amend interactively in `$EDITOR` if the body was multi-line and built via heredoc — the heredoc is gone, and rewriting it by hand is error-prone.

## Don't

- Don't bypass the hook with `--no-verify`. Repo rule (CLAUDE.md): hook failures are fixed, never bypassed.
- Don't loosen `header-max-length` in `commitlint.config.js`. The cap is in place for a reason: PR titles, GitHub web UI, log readers all assume single-line, scannable headers.
- Don't pad the body with the same content the header would have carried. Use the body for the *why* and *what changed*, not for the long version of the title.

## See also

- `commitlint.config.js` at the repo root — the configured rules.
- [`docs/knowledge/macos-bsd-vs-aws-cli-quirks.md`](./macos-bsd-vs-aws-cli-quirks.md) — sister "operator confusion" entry on tooling cap behaviour.
