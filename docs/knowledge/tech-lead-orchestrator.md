# `/tech-lead-orchestrator` — operator notes

Run-time companion to [`.claude/skills/tech-lead-orchestrator/SKILL.md`](../../.claude/skills/tech-lead-orchestrator/SKILL.md)
and [`standard.md`](../../.claude/skills/tech-lead-orchestrator/standard.md).
What this file covers that the SKILL.md doesn't: **what an operator sees,
where to look when something goes wrong, how to read the journal**.

## Where things live

```
docs/features/<app>/<slug>/
  spec/spec.md                                       # human + LLM, source of truth
  plan/plan.md                                       # /technical-conception output
  runs/<run-id>/state.json                           # OrchestratorState (cf. types.ts)
  runs/<run-id>/journal.md.jsonl                     # one JournalEvent per line
  runs/<run-id>/journal.md                           # human-readable render
  runs/<run-id>/agents/<agent>-<step>.md             # sub-agent verdict + body
  runs/<run-id>/errors.log                           # only present if something threw
  validation/technical-validation-<ts>.md            # /technical-validation output
  validation/visual-validation-<ts>.md               # /visual-validation output (if any)

docs/adr/NNNN-<slug>.md                              # ADRs the orchestrator triggered
```

All paths under `runs/` are **committed** (decision Q-RUN-COMMIT). Aborted
runs stay in the tree.

## Reading the journal

`journal.md.jsonl` is the source of truth for any post-mortem. Each line is
a `JournalEvent`. The dominant events:

| kind | what it means | where to look next |
|---|---|---|
| `run_started` | A run began. | `state.json` for the feature slug + run-id. |
| `stage_changed` | Transition between stages. | The verdict in `agents/<previous-stage-agent>-*.md`. |
| `adr_written` | `/adr-writer` shipped an ADR. | `docs/adr/NNNN-<slug>.md`. |
| `escalation` | Run handed back to the human. The `reason` field tells you why. | `errors.log`, the offending verdict body. |
| `human_message_received` (`category: correction`) | The human had to correct the AI. **Dantotsu candidate.** | The diff right before the message; the agent that needed correcting. |
| `human_message_received` (`category: guidance` / `answer`) | Interesting conversation. Not a defect signal. | Nothing — productive engagement. |
| `context_growth` | The orchestrator's cumulative `bytesRead` crossed a log-scale palier. | Trajectory in the journal; if it doubles fast, the orchestrator is absorbing too much. |
| `visual_validation_skipped` | Feature had no UI surface; `/visual-validation` was not invoked. | Nothing — expected for `meta` features. |
| `run_completed` | Final stage reached. | `state.json#stage` is `ship` (good) or `escalated` (bad). |

## Aggregating metrics

```bash
pnpm tech-lead:metrics docs/features/<app>/<slug>/runs/<run-id>/journal.md.jsonl
```

Calls `aggregateRun` from `journal.utils.ts`. The output:

- `humanCorrections` — the metric that feeds the Dantotsu pipeline. Trending
  down across runs = the orchestrator is learning.
- `escalationCount` + `timeToFirstEscalationMs` — if escalations dominate
  early-feature, the orchestrator isn't yet trusted on that family of
  features. Re-spec or shrink the scope.
- `durationMs` — proxy for output metric (human time per feature ↓).
- `adrCount` — should approximate the number of architectural choices in the
  feature. Zero = the orchestrator forgot to evaluate triggers; very high =
  the triggers are too loose.

## Debugging recipes

### Symptom: orchestrator ran the auto-chain *twice*

Probably the conditional check in `/specification` or `/technical-conception`
did not see `state.json#pilotedByTechLead`. Verify:

1. `cat docs/features/<app>/<slug>/runs/<run-id>/state.json | jq .pilotedByTechLead` → must be `true`.
2. The sub-skill's SKILL.md still contains the "Conditional suppression
   when piloted by `/tech-lead-orchestrator`" section. If a `kaizen` PR
   dropped it, restore it and add a knowledge entry here.

### Symptom: a sub-agent's verdict is "unparseable"

`parseVerdictFromMarkdown` returns a blocked verdict with
`reason: unparseable-verdict: <why>`. The `<why>` values:

- `missing-front-matter` — the sub-agent wrote a markdown file but
  forgot the leading `---\n…\n---` block.
- `malformed-yaml` — typo in YAML indentation. Fix and re-run that agent.
- `front-matter-not-object` — front-matter was a scalar / list.
- `invalid-status` — `status` is missing or not in the enum.
- `missing-summary` — `summary` field is absent.
- `invalid-artifacts` — `artifacts` is set but not an array of strings.
- `invalid-next` — the `next` block is malformed.

In every case, **the orchestrator escalates**. You'll see an
`escalation` event in the journal and the run will stop at stage
`escalated`. Fix the sub-agent's output template, not the orchestrator.

### Symptom: `OrchestratorSpecMutationAttemptedError`

A sub-agent (likely `/implementation`) wrote to `spec.md`. The
orchestrator caught it via `assertSpecUnchanged` and aborted the run.

1. `git diff HEAD -- docs/features/<app>/<slug>/spec/spec.md` — see what
   changed.
2. `git checkout HEAD -- <that path>` — restore.
3. Read the orchestrator's escalation message — it includes the
   proposed change. Hugo accepts (edit spec, restart run) or refuses
   (correct the implementer's prompt, restart run).

### Symptom: pre-commit / pre-push hook failed at `ship`

The orchestrator treats this as a `fail-local` verdict and re-enters
the arbitrate stage with `retries.implement++`. If the hook keeps
failing, the orchestrator will eventually escalate (cap = 3 by
default, override via `TECH_LEAD_MAX_RETRIES`). **Never** invoke the
orchestrator with `--no-verify` semantics — CLAUDE.md *Hooks* rule.

## Dogfooding

The orchestrator's inaugural PR (this one) is **not** itself
orchestrator-driven: the orchestrator didn't exist yet. Subsequent
features are expected to be driven through `/tech-lead-orchestrator`
and the `/after-task-dantotsus` kaizen sweep should surface the
orchestrator's first rough edges. Until 3 successful runs have shipped,
treat any oddity as a Dantotsu candidate.
