# Dantotsus — root-cause analyses with shipped eradications

One file per defect. Each is a **Dantotsu**: Symptom → Root-cause
chain → Detection failure causes → Countermeasure → **Eradication**
(code-level, non-optional). The Eradication section links the
commit hash, PR, and a diff snippet showing the fix.

Standard at [`.claude/skills/dantotsu/standard.md`](../../.claude/skills/dantotsu/standard.md).
Template at [`_template.md`](./_template.md). Skill at
[`.claude/skills/dantotsu/SKILL.md`](../../.claude/skills/dantotsu/SKILL.md).

## Eradication ladder

Each entry's `eradication-level` frontmatter records which level was
reached. The ladder, top is best:

1. **Structural impossibility** — types / API shapes prevent the
   misconception from being expressed at all.
2. **DevX check** — linter / type guard / pre-commit / actionlint /
   GritQL plugin rejects the misconception at lint or commit time.
3. **Vendor patch** — `patches/<lib>/<short>.patch` applied via
   `pnpm patch`, plus a `.md` with the upstream-PR body the human
   will paste. Agent does NOT open PRs against repos outside
   `hugoleborso/*`.
4. **Detection** — alarm, synth-time test, integration test that
   catches the next instance before users see it.
5. **Knowledge** — only as floor when 1–4 are genuinely impossible.
   Pure-knowledge subjects belong under [`../knowledge/`](../knowledge/)
   instead.

A Dantotsu whose only eradication is "knowledge" is almost always
misclassified — re-read the root-cause section and push harder.

## Listing the entries

Plain `ls *.md` is the fast path. For a structured table with
metadata pulled from each entry's frontmatter, run the helper
shipped with the dantotsu skill:

```bash
.claude/skills/dantotsu/scripts/list.sh
```

Outputs a markdown table with file, date, severity, level, tags,
title — sorted by date. Pass `--json` for machine-readable
output.

## Reading the frontmatter

| Field | Meaning |
| --- | --- |
| `introduced-at` | Stage where the defect was *born*. `conception` (design wrong), `implementation` (design right, code didn't match), `self-validation` (developer's checks didn't catch), `code-review` (reviewer didn't catch). |
| `detected-at` | Where the defect was *finally* caught. Walk the defence-in-depth ladder: typing → linter → local → ci → review → qa → staging → production → operator-deploy. |
| `severity` | User impact at the time of detection. `low`: nobody noticed. `medium`: degraded UX, recoverable. `high`: user-blocking or data-integrity. |
| `eradication-level` | Level reached on the ladder above. Should be 1 if at all possible. |
| `fix-commits` | The actual commits that landed the eradication — not the original countermeasure. Always linkable. |
| `time-to-detect` | Wall-clock from "lives in main" to "we noticed". |
| `tags` | Topics for grep / future skill matching. |

Patterns to watch as the corpus grows:

- Many `introduced-at: conception` → design isn't getting enough scrutiny.
- Many `detected-at: production` with `high` severity → defence-in-depth has gaps.
- Many `eradication-level: 5` → we're settling for documentation when we could reach higher. Push back.

## Adding a new entry

The [`/dantotsu`](../../.claude/skills/dantotsu/SKILL.md) skill walks
the seven steps and produces a complete entry that matches
[`_template.md`](./_template.md). After-task sweep: see
[`/after-task-dantotsus`](../../.claude/skills/after-task-dantotsus/SKILL.md).
