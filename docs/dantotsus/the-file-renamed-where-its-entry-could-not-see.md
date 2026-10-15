---
date: 2026-10-15
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#118'
fix-pr: none (shipped by the kaizen pull request that adds this entry)
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/hooks/knowledge-triggers.sh, plugins/borso-harness/scripts/check-hook-decisions.sh, scripts/check-numbered-sequences.sh]
time-to-detect: days
tags: [hooks, harness, dsql, pragma]
zone: plugins/borso-harness/hooks
recurs: [lectured-without-reading-the-code]
---

# The file renamed where its entry could not see

## Symptom

Merging main into PR #118 gave pragma two migrations numbered `0015`. Main's
had run in production, so #118's moved to `0016`. Before renaming it, the
session decided the file was not safe to run twice and rewrote both statements
with `IF NOT EXISTS`, explaining in the PR body that the preview "would have
failed" otherwise. It logged the same claim to the friction log.

The claim was false. The migration runner rewrites every `CREATE TABLE`,
`CREATE INDEX` and `ADD COLUMN` to `IF NOT EXISTS` before running it
(`makeIdempotent` in
`infra/cdk/src/internal/migration-runner/statement-rewrites.utils.ts`), so the
renamed file would have run as a no-op unchanged. The sequence check's own
message had said so: *"every statement is re-runnable, so the file runs again
as a no-op under its new name"*. The session doubted the message, because it
named no mechanism, and checked the SQL file instead of the runner.

The edit was harmless. The reasoning was not: a wrong belief about the runner
went into a pull request description and into the archived friction log.

## Root-cause chain

1. **Why did the session believe the file could not run twice?** It read the
   SQL file and saw no `IF NOT EXISTS`. It did not read the runner that
   executes the file.
2. **Why did it not know about the runner's rewrite?** The knowledge entry
   that records it, `dsql-postgres-compat-gaps.md` §4, has a path trigger on
   `apps/*/api/src/database/migrations/*.sql`, and that trigger never fired.
3. **Why did the trigger not fire?** The hook matched `paths` only against
   the target of a Write or an Edit. The session renamed the file with
   `git mv` and edited it with `sed -i`. Neither is a Write or an Edit, and
   the hook matched a Bash command only against `commands` triggers.
4. **Why was the gate's message not enough?** It asserted "every statement is
   re-runnable" without saying why. Read against a SQL file with no
   `IF NOT EXISTS` in it, the claim looked wrong.

**Root cause:** the session thought a path trigger fires whenever the file is
touched, but it fired only for the two file tools. A Bash edit, which agents
here use constantly, went past every path-keyed entry in the corpus.

## Detection failure causes

- **Hook contract:** `check-hook-decisions.sh` covered a Write, an Edit and a
  Bash command, but no Bash command that names a path.
- **Review:** the PR body's claim was plausible and nobody had reason to read
  the runner.

## Countermeasure

The knowledge hook now matches every path a Bash command names against the
`paths` triggers, and the sequence check's message names the rewrite that
makes renumbering safe.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** the kaizen pull request for PR #118 · commit [self]

**The actual fix:**

```diff
+paths_named_by() {
+  printf '%s' "$1" | tr -s " \t;|&<>()=" '\n' | jq -R . | jq -s . |
+    jq -r --slurpfile lookup "$LOOKUP" '
+      . as $tokens
+      | $lookup[0].entries[]
+      | select(any(.paths[]?; . as $pattern | any($tokens[]; test($pattern))))
+      | .path
+    ' 2>/dev/null
+}
```

The tokens come from the command with heredocs and quoted strings removed,
the same text `commands` triggers match against, so a commit message or a
`kaizen.sh` line that only mentions a path stays silent. Three contract cases
hold it: `git mv` and `sed -i` on a migration print the DSQL entry, and a
quoted mention prints nothing. Against the previous hook, both `inform` cases
fail.

```diff
-  echo "  every statement is re-runnable, so the file runs again as a no-op under its new" >&2
-  echo "  name. ..." >&2
+  echo "  the runner rewrites CREATE TABLE, CREATE INDEX and ADD COLUMN to IF NOT EXISTS" >&2
+  echo "  before running them (makeIdempotent in" >&2
+  echo "  infra/cdk/src/internal/migration-runner/statement-rewrites.utils.ts), so the file" >&2
+  echo "  runs again as a no-op under its new name, and the SQL needs no edit." >&2
```

**Sibling defects swept:** every path trigger in `docs/knowledge/` benefits
from the same change; none needed editing.

## See also

- [lectured-without-reading-the-code](./lectured-without-reading-the-code.md):
  the same shape, a claim about code made without reading it.
- [two-branches-took-the-same-migration-number](./two-branches-took-the-same-migration-number.md):
  the collision that led here.
- [`dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §4.
