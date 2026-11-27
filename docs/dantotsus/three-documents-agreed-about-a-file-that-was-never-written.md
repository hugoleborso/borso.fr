---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: low
related-pr: '#105'
fix-commits: [24eaf9b2d2]
eradication-level: 2
eradication-paths: [scripts/check-named-paths-exist.sh]
time-to-detect: days
tags: [meta, claude-md, skills, agents, gates, documentation]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
---

# Three documents agreed about a file that was never written

## User impact

`CLAUDE.md`, the [`/feature-pipeline` contract](../../.claude/commands/feature-pipeline.md)
and the [orchestrator standard](../../.claude/skills/tech-lead-orchestrator/standard.md)
each stated, in the present tense, that the feature pipeline's Dynamic
Workflow lives at `.claude/workflows/feature-pipeline.js`. Neither the folder
nor the file existed. An agent told to open it found nothing, then had to
judge whether the repository was broken. The sweep of #105 recorded it in the
friction log (measured by its subagents).

| | Seen | Expected |
| --- | --- | --- |
| An agent opens the pipeline's saved workflow | No such file or folder | The file, or a sentence saying the script is generated per run |

## Causal chain

- Agents could not open `.claude/workflows/feature-pipeline.js`, which three
  documents said existed.
  - `c578c5a9b` (2026-06-05), which shipped the pipeline, wrote the path in
    the present tense in all three documents. From `CLAUDE.md` at the time:

    ```markdown
    - **Dynamic Workflow** at `.claude/workflows/feature-pipeline.js` owns the deterministic stages
    ```

    Its own commit message knew the file was missing: "The actual
    `.claude/workflows/feature-pipeline.js` is deferred per the ADR… the
    operator saves it with" `/workflows`.

    - The same commit wrote the operator runbook,
      `docs/knowledge/dynamic-workflow-feature-pipeline.md`. Its step 6 says
      "Commit the resulting `.claude/workflows/feature-pipeline.js`", after
      the first successful run. The three documents described the state after
      that step.
      - Saving the script was a manual step at the end of a successful run.
        A run that ends well is a run that is over, and every later launch
        regenerated the script from the contract and worked without it. No
        one ever carried the step out. **Method.**

## Root cause of occurrence

*Thought a path stated in the present tense is documentation of what will be
there, actually it is an instruction an agent will act on, and it held only
if a manual step nobody owned was done.* **Method.**

The process asked for a hand-made save after a run, and the documents were
written as if it had happened. The step is still there today: step 6 of the
runbook and its *When to regenerate the JS* section, which says to "Delete
`.claude/workflows/feature-pipeline.js`", a file that has never existed.

## Detection failure causes

- **Typing / linter:** markdown prose.
- **The link checker:** `check-doc-links.ts` reads markdown links. These were
  backticked strings, and one points at a `.js`.
- **The enforcement ledger:** it resolved the mechanisms `docs/standards/`
  claims. `CLAUDE.md` is not a standard and `.claude/` was not in its scope.
- **Local validation:** `/feature-pipeline` works without the saved file. A
  correct outcome hid an incorrect description of how it was reached.
- **Review:** three documents saying the same thing reinforce each other.
  Here all three came from one commit and one intention.
- **The agents:** an agent that cannot find a file works around it, because
  finishing the task rewards that. This was reported only because
  `CLAUDE.md` asks subagents to log friction by name.

## Countermeasure

The three statements now say what is true. The script is generated per run
from the contract, which is the durable artefact, and no script is committed.
`.claude/workflows/` was created, with a README that says none is saved yet.

## Eradication

**Type:** DevX check (level 2)

**Reference:** PR #106, commit `24eaf9b2d2`.

`scripts/check-named-paths-exist.sh` refuses a backticked repository path that
does not resolve, in `CLAUDE.md`, `.claude/`, `scripts/`, `.husky/`,
`.github/` and `apps/*/scripts/`. It runs in `.husky/pre-commit` and in
`.github/workflows/ci.yml`.

```diff
+  [ -e "$named" ] || report "${location}: names ${named}, which is not there"
```

A path carrying a glob or a `<placeholder>` is skipped. It is the same script
as the document-citation check, a second surface rather than a new gate (see
[the-loop-shipped-the-same-gate-twice](./the-loop-shipped-the-same-gate-twice.md)).

**Proof it can fail:** measured on the tree it was written against, 95
distinct paths named and 94 resolving. The one that did not was named in
three places, and the gate reported three lines.

**What it does not reach:** `docs/knowledge/` is not a surface. The runbook
still names `.claude/workflows/feature-pipeline.js` twice today (`grep -n
feature-pipeline.js docs/knowledge/dynamic-workflow-feature-pipeline.md`). A
bare filename with no directory is not reached either.

**Proposed:** subtract the manual step. Delete step 6 and the *When to
regenerate the JS* section of `docs/knowledge/dynamic-workflow-feature-pipeline.md`,
and the empty `.claude/workflows/` with its README. The contract is the
durable artefact, as the entry already found. With no step to save a script
and no folder for it, no document has a reason to name the file, and the gate
refuses one that does in `CLAUDE.md` or `.claude/`.

**Similar instances:** the same sweep fixed two more. `CLAUDE.md` named the
link checker `check-doc-links.ts`, which lives at
`scripts/docs/check-doc-links.ts`. The `/feature-pipeline` contract told stage 1
to read the spec's *Architectural choices* table, which the specification
template did not have. The template gained the section.
