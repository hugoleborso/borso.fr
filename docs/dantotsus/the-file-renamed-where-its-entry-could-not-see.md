---
date: 2026-10-15
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#159'
fix-commits: [4b883dfe4, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/knowledge-triggers.core.ts, scripts/hooks/checks/knowledge-triggers.core.test.ts, scripts/check-numbered-sequences.sh]
time-to-detect: days
tags: [hooks, harness, dsql, pragma]
zone: scripts/hooks/checks/knowledge-triggers.core.ts
recurs: [lectured-without-reading-the-code]
---

# The file renamed where its entry could not see

## User impact

Merging main into PR #118 gave pragma two migrations numbered `0015`. Main's
had run in production, so #118's moved to `0016`. Before renaming it, the
session decided the file was not safe to run twice. It rewrote both
statements with `IF NOT EXISTS` and wrote in the PR body that the preview
"would have failed" otherwise. It logged the same claim to the friction log.

The claim was false. The migration runner rewrites every `CREATE TABLE`,
`CREATE INDEX` and `ADD COLUMN` to `IF NOT EXISTS` before running it
(`makeIdempotent` in
`infra/cdk/src/internal/migration-runner/statement-rewrites.utils.ts`). The
renamed file would have run unchanged as a no-op.

| | Seen | Expected |
| --- | --- | --- |
| PR #118 body | "the preview would have failed" without the edit | The file renamed with no edit, and no claim about the runner |

The edit was harmless. A wrong belief about the runner went into a pull
request description and the archived friction log.

## Causal chain

- The PR body claimed the renamed migration could not run twice.
  - The session read the SQL file, saw no `IF NOT EXISTS`, and did not read
    the runner.
    - The knowledge entry that records the rewrite,
      `dsql-postgres-compat-gaps.md` §4, has a path trigger on
      `apps/*/api/src/database/migrations/*.sql`. It never fired.
      - The session renamed the file with `git mv` and edited it with
        `sed -i`. The hook matched `paths` triggers only against the target
        of a Write or an Edit, and matched a Bash command only against
        `commands` triggers.
        - Commit `8a5828581` (PR #159) wrote that rule. Its ADR-0030 states it:
          "The triggers are path globs matched against a Write or Edit
          target, regular expressions matched against a Bash command". The
          same commit put `Bash` in the hook's matcher, so every Bash command
          already reached it. The writer read a Bash command as text to match,
          never as a call that touches files. **Man** (inferred: the writing
          session's transcript is not in the repository).
    - The session also had the sequence check's message, "every statement is
      re-runnable, so the file runs again as a no-op under its new name",
      and doubted it.
      - The message named no mechanism, and the file on disk looked
        non-idempotent, because the runner adds `IF NOT EXISTS` at run time
        and the SQL never shows it. **Machine.**

## Root cause of occurrence

*Thought an agent touches a file only through Write and Edit, actually
agents here rename with `git mv` and edit with `sed -i` constantly.* Man, for
the author of the hook's path rule (inferred): Bash calls already reached the
hook, and the rule treated them as text.

## Detection failure causes

- **Hook contract:** `check-hook-decisions.sh` covered a Write, an Edit and a
  Bash command, but no Bash command that names a path.
- **Review:** the PR body's claim was plausible, and nobody had reason to read
  the runner.

## Countermeasure

The knowledge hook matches every path a Bash command names against the
`paths` triggers. The sequence check's message names the rewrite that makes
renumbering safe:

```diff
-  echo "  every statement is re-runnable, so the file runs again as a no-op under its new" >&2
+  echo "  the runner rewrites CREATE TABLE, CREATE INDEX and ADD COLUMN to IF NOT EXISTS" >&2
+  echo "  before running them (makeIdempotent in" >&2
```

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`4b883dfe4`](https://github.com/hugoleborso/borso.fr/commit/4b883dfe4) (PR #181)
added Bash path matching to the shell hook. Commit
[`458e886c4`](https://github.com/hugoleborso/borso.fr/commit/458e886c4) deleted
`.claude/hooks/knowledge-triggers.sh` and ported it to
`scripts/hooks/checks/knowledge-triggers.core.ts`. Commit `c54e32da7` deleted
`plugins/borso-harness/scripts/check-hook-decisions.sh`. The contract cases now
live in `scripts/hooks/checks/knowledge-triggers.core.test.ts`.

The port keeps the rule. A Bash command is split into tokens, with quoted
strings and heredocs removed, and each token is matched against `paths`:

```ts
it('matches a path a command names, because git mv rewrites a file with no Write', () => {
  expect(contextOf(bash('git mv apps/a/INVARIANTS.md apps/a/B.md'))).toContain('invariants.md');
});
```

Tokens catch only the paths a command names. A script, a `find -exec` or a
tool that writes files it never names on the command line still passes.

**Proposed:** match `paths` triggers on `PostToolUse(Bash)` against the files
the call changed, read from `git status --porcelain` before and after. That
covers every way a file is touched, named or not, and would let the token
splitting be deleted.

**Proof it can fail:** the shell hook before `4b883dfe4` fails the `git mv`
and `sed -i` cases (measured when the fix shipped).

**Similar instances:** every path trigger in `docs/knowledge/` gains from the
same change. None needed editing. `grep -rl "paths:" docs/knowledge/` lists
them.
