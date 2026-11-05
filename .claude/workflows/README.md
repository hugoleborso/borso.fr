# Project workflows

A Dynamic Workflow saved here is available to every clone of this repository
as a named workflow, and `/feature-pipeline <spec-path>` executes it instead of
generating a script from scratch.

**Nothing is saved here yet.** Three documents — `CLAUDE.md`, the
[`/feature-pipeline` contract](../commands/feature-pipeline.md) and the
[orchestrator standard](../skills/tech-lead-orchestrator/standard.md) — each
described `feature-pipeline.js` as a file that lives here, and the
[operator runbook](../../docs/knowledge/dynamic-workflow-feature-pipeline.md)
step 6 says to commit it after the first successful run. Nobody ever did, so
every launch regenerates the script from the contract.

That costs correctness nothing: the contract is the durable artefact and the
generated script is derived from it. What it cost was three claims a reader
could act on and find false, which is why
[`scripts/check-named-paths-exist.sh`](../../scripts/check-named-paths-exist.sh)
now refuses a path an instruction names and the tree does not have — this
folder exists so that the sentences pointing at it are true.

To save one: run `/feature-pipeline`, then `/workflows` → select the run →
press `s` → choose a path in this folder, and commit it. Update the three
documents above in the same commit, because they currently say no script is
committed.
