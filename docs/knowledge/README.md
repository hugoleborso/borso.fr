# Knowledge

Documentation the team needs to work effectively — anything from
vendor quirks and CLI contracts to architecture rationales,
onboarding guides, debugging recipes, naming conventions, or
historical context for a non-obvious choice. Whatever helps a future
reader (or session) understand the system without re-deriving it
from first principles.

Knowledge is the floor of the eradication ladder defined in
[`../dantotsus/README.md`](../dantotsus/README.md#eradication-ladder).
A Dantotsu can fall back to "add a knowledge entry" when no higher
level is feasible — but knowledge entries can also stand alone, no
defect required.

## When does an entry belong here vs in `docs/dantotsus/`?

| Belongs in `dantotsus/` | Belongs in `knowledge/` |
| --- | --- |
| There was a defect (or near-miss) and we shipped an eradication | There's no defect — just something a reader would benefit from knowing |
| The "fix" is a code commit + diff | The "output" is the doc itself; no code lever exists or is needed |
| Future occurrences can be prevented at lint, type, or test time | The behaviour is just a fact (vendor, convention, design choice); we adapt |

Two failure modes to watch for:

- **Dantotsu-as-knowledge:** writing "captured as follow-up; not implemented" in a knowledge entry. That's a Dantotsu without an eradication. Move to `dantotsus/` and ship the fix.
- **Knowledge-as-handover-doc:** if a knowledge entry grows beyond ~100 lines or starts walking through a multi-step recipe, it's probably outgrown this folder. Promote it to its own file under `docs/` (e.g. `docs/local-dev.md`, `docs/aws-setup.md`).

## Every entry has a trigger

An entry is read when a hook prints it at the moment it applies, and almost
never otherwise. So every entry opens with front matter naming that moment:

```yaml
---
summary: 'One sentence the hook prints, saying what the trap is.'
triggers:
  paths:
    - 'infra/cdk/src/constructs/static-site.ts'
  commands:
    - 'cloudfront\s+get-function\b'
  output:
    - 'FunctionThrottledError'
---
```

- `paths` are globs matched against the file a Write or an Edit targets.
- `commands` are regular expressions searched in a Bash command, with its
  quoted strings and heredoc bodies removed so a mention does not count.
- `output` are regular expressions searched in what a Bash or MCP call printed
  or failed with.

[`knowledge-triggers.core.ts`](../../scripts/hooks/checks/knowledge-triggers.core.ts)
does the matching and prints the summary and the path, once per entry per
session. [`check-knowledge-triggers.sh`](../../scripts/check-knowledge-triggers.sh)
fails an entry with no summary or no trigger, in pre-commit and in CI. If you
cannot name a path, a command or an output that recognises the moment an entry
applies, the entry has no reader: merge it into one that has, or do not write
it. [ADR-2026-10-10T0122](../adr/2026-10-10T0122-knowledge-is-delivered-by-trigger.md) records the
decision.

## Finding an entry

This folder keeps no list of its entries. A list kept by hand went stale and
made every pull request that added an entry collide with every other one.
The files and their front matter are the index:

- `grep -l <word> docs/knowledge/*.md` finds the entries about a tool or a symptom.
- `grep -H '^summary:' docs/knowledge/*.md` prints each entry's one-sentence summary.
- The file name says what the entry teaches, so `ls docs/knowledge/` reads as a table of contents.

Before writing a new entry, search for one on the same tool or symptom and
extend it, so the hook does not print two entries for one trap.

## Adding a new entry

Every entry needs the `summary:` and `triggers:` front matter described
under *Every entry has a trigger* above, because
[`check-knowledge-triggers.sh`](../../scripts/check-knowledge-triggers.sh)
fails an entry without them in pre-commit and in CI. The body below the
front matter has no fixed structure — write whatever helps the next
reader. Keep it concrete and short (short enough to re-read every time you
suspect it applies). Title should hint at the lesson, not the symptom.

If the entry is the result of a `/after-task-kaizen` sweep that
classified a subject as "vendor surprise" or "operator confusion",
the skill writes it here automatically.
