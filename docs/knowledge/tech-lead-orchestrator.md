# `/tech-lead-orchestrator` — operator notes

Run-time companion to [`.claude/skills/tech-lead-orchestrator/SKILL.md`](../../.claude/skills/tech-lead-orchestrator/SKILL.md)
and [`standard.md`](../../.claude/skills/tech-lead-orchestrator/standard.md).
What this file covers that the SKILL.md doesn't: **what an operator sees,
where to look when something goes wrong, how to read the journal.**

## Where things live

```
docs/features/<app>/<slug>/
  spec/spec.md                                       # human + LLM, source of truth
  plan/plan.md                                       # /technical-conception output
  runs/<run-id>/state.json                           # state per standard.md#statejson-schema
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

`journal.md.jsonl` is the source of truth for any post-mortem. Each line
is a JSON object — see
[`standard.md` *Journal event schema*](../../.claude/skills/tech-lead-orchestrator/standard.md#journal-event-schema)
for the full list. The dominant events:

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

The journal is JSONL with one event per line. `jq` is enough for every
metric we care about — no script, no workspace.

```bash
journal=docs/features/<app>/<slug>/runs/<run-id>/journal.md.jsonl

# Human corrections (the Dantotsu-candidate signal)
jq -r 'select(.kind=="human_message_received" and .category=="correction")' $journal | wc -l

# ADRs produced
jq -r 'select(.kind=="adr_written") | "ADR \(.number) (\(.trigger))"' $journal

# Escalations + time-to-first
jq -r 'select(.kind=="escalation")' $journal

# Run duration (ms)
start=$(jq -r 'select(.kind=="run_started") | .at' $journal | head -1)
end=$(jq -r 'select(.kind=="run_completed") | .at' $journal | head -1)
echo $(( ($(date -d "$end" +%s%3N) - $(date -d "$start" +%s%3N)) ))ms

# Context-growth trajectory
jq -r 'select(.kind=="context_growth") | "\(.at) \(.bytes) bytes"' $journal
```

Read the trends across runs:

- `humanCorrections` trending down across runs ⇒ the orchestrator is
  learning.
- `escalationCount` + small `timeToFirstEscalationMs` early-feature ⇒
  the orchestrator isn't yet trusted on that family of features. Re-spec
  or shrink the scope.
- `durationMs` proxies the output metric (human time per feature ↓).
- `adrCount` should approximate the number of architectural choices in
  the feature. Zero ⇒ the orchestrator forgot to evaluate triggers; very
  high ⇒ the triggers are too loose.

## Debugging recipes

### Symptom: orchestrator ran the auto-chain *twice*

Probably the conditional check in `/specification` or `/technical-conception`
did not see `state.json#pilotedByTechLead`. Verify:

1. `jq .pilotedByTechLead docs/features/<app>/<slug>/runs/<run-id>/state.json` → must be `true`.
2. The sub-skill's SKILL.md still contains the "Conditional suppression
   when piloted by `/tech-lead-orchestrator`" section. If a `kaizen` PR
   dropped it, restore it and add a knowledge entry here.

### Symptom: a sub-agent's verdict is "unparseable"

The orchestrator emits an `escalation` event with reason
`unparseable-verdict: <why>` and stops. The `<why>` values are listed in
[`sub-agent-contract.md`](../../.claude/skills/tech-lead-orchestrator/sub-agent-contract.md).
In every case the fix is in the sub-skill's output template, not in the
orchestrator.

### Symptom: spec mutation detected

A sub-agent (likely `/implementation`) wrote to `spec.md`. The
orchestrator caught it (the spec checksum changed) and aborted the run.

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
