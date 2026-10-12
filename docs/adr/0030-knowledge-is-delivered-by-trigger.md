# ADR-0030: Knowledge is delivered by trigger, and an entry without one is not written

- **Status:** proposed
- **Date:** 2026-10-10
- **Deciders:** Hugo Borsoni
- **Tags:** meta, harness, knowledge

## Context

`docs/knowledge/` held 123 entries on 2026-10-10. An audit of the corpus found it worked as an archive and failed as prevention. Only 11 entries were named by executable code, 36 were linked from nothing but the README index, and 76 were never edited after the commit that created them. Nine dantotsus record an entry that existed, was correct, and was not read when the trap it described hit again, among them [`the-entry-existed-and-i-lost-the-hour-anyway`](../dantotsus/the-entry-existed-and-i-lost-the-hour-anyway.md) and [`a-knowledge-entry-did-not-stop-the-second-hit`](../dantotsus/a-knowledge-entry-did-not-stop-the-second-hit.md). In all nine, what finally held was a hook or a gate printing the entry at the moment of failure.

The only routing to the corpus was a CLAUDE.md sentence asking agents to skim the index before CDK, CloudFront, S3 or GitHub Actions work. A document reaches only a reader who already suspects its answer, and the symptom of a trap usually argues for a different answer.

The audit also found that the two hooks already delivering entries mostly reached nobody. Claude Code sends plain stdout from a `PostToolUse` hook to the debug log, not to the model, and a Bash command that exits non-zero fires `PostToolUseFailure` rather than `PostToolUse`. The ESLint cache hook printed to stdout on `PostToolUse` only, so it never spoke on the failing lint run it was written for.

The operator's position going in: knowledge is useless except when a hook delivers it.

## Decision

**Every knowledge entry declares `triggers:` in its front matter, a hook delivers it when one matches, and a gate refuses an entry without one.** The triggers are path globs matched against a Write or Edit target, regular expressions matched against a Bash command with its quoted strings and heredocs removed, and regular expressions matched against what a Bash or MCP call printed or failed with. `plugins/borso-harness/hooks/knowledge-triggers.sh` runs on `PreToolUse`, `PostToolUse` and `PostToolUseFailure`. It matches with jq against a lookup compiled from the front matter, which it rebuilds itself when an entry is newer, and answers with `additionalContext`, once per entry per session. `scripts/check-knowledge-triggers.sh` runs in pre-commit and CI and fails an entry with no `summary:`, no trigger, or a pattern jq cannot compile.

Applying the rule to the corpus deleted 8 entries and merged 8 others into related entries, leaving 107. A triggered entry is now the floor rung of the dantotsu eradication ladder, replacing "a knowledge entry".

## Consequences

- `+` An entry reaches the agent at the moment it applies, which is the one delivery path that has held in this repository.
- `+` Writing an entry now requires naming what recognises the moment it applies. A subject with nothing to recognise is folded into an entry that has a trigger, or becomes a hook or a skill change, instead of joining an archive.
- `+` The two existing informing hooks now reach the model, and `check-hook-decisions.sh` holds every informing hook to two halves: a call it must speak on and a mention it must stay silent on.
- `-` Every Write, Edit, Bash and MCP call pays a hook run. Measured once on this sandbox: a call that matches nothing took 40 to 60 ms, and a Bash command that matched took about 180 ms, because it strips quoted strings with Python before confirming.
- `-` A trigger is a guess about the next occurrence. Too broad and it is noise the reader learns to skip; too narrow and it never fires. The once-per-session rule limits the first, and nothing detects the second.
- `-` Some entries had to be deleted because nothing observable marks the moment they apply, such as a tool schema error rejected before any hook runs. That knowledge now lives only in git history.
- `~` The lookup is an output under `.claude/` and is gitignored, per [ADR-0014](./0014-generated-files-are-not-committed.md).

## Alternatives considered

### Option A — triggers in front matter, delivered by a hook, gated (chosen)

- **Summary:** as in the decision.
- **Strengths:** delivery at the moment of the mistake; the gate makes an unreachable entry impossible to add; one generic hook rather than one per entry.
- **Costs:** a hook run on every tool call; a front-matter field on every entry; 123 entries to go through once.
- **Rationale:** it is the mechanism that worked in all nine recorded cases, generalised so it no longer needs a hand-written hook per entry.

### Option B — a hand-written hook per important entry (rejected)

- **Summary:** keep the corpus as it is and write a dedicated hook, like `posttool-empty-checks-means-conflict.sh`, whenever an entry proves it is needed.
- **Strengths:** each hook can test exactly the right condition, including state a pattern cannot see.
- **Costs:** a script, a settings entry and a contract row per entry; the hook arrives only after the entry has already failed once.
- **Rejection rationale:** it loses on delivery before the first repeat, which is when the cost is paid. It stays available for an entry whose moment a pattern cannot express.

### Option C — route agents to the corpus by search (rejected)

- **Summary:** add a skill step or a SessionStart reminder telling the agent to search `docs/knowledge/` by symptom before diagnosing a failure.
- **Strengths:** no hook cost; no front matter to maintain.
- **Costs:** an instruction competing with everything else in a long context.
- **Rejection rationale:** this is the CLAUDE.md sentence that was already in place for every one of the nine repeats. It depends on the reader suspecting the answer, which is the failure.

### Option D — do nothing (rejected)

- **Summary:** keep the corpus as an archive.
- **Strengths:** no work.
- **Costs:** the measured outcome: an entry per trap and the trap anyway.
- **Rejection rationale:** fails the only criterion the corpus exists for.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Reaches the agent before the repeat | high | Nine dantotsus record the repeat happening with the entry in place. |
| Cost per tool call | medium | The hook runs on most calls in every session. |
| Cost to add an entry | medium | The after-task sweep writes several entries per pull request. |
| Refuses an unreachable entry | medium | Thirty-six entries had no reader but the index. |

|   | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| Reaches the agent before the repeat | ✓ on the first match | ✗ only after a repeat proves it is needed | ✗ only if searched | ✗ |
| Cost per tool call | ✗ tens of milliseconds | ✓ only the hooks written | ✓ none | ✓ none |
| Cost to add an entry | ✓ a front-matter block | ✗ a script and a contract row | ✓ none | ✓ none |
| Refuses an unreachable entry | ✓ the gate | ✗ | ✗ | ✗ |

## Implementation pointers

- Hook: `plugins/borso-harness/hooks/knowledge-triggers.sh`
- Compiler and gate: `plugins/borso-harness/scripts/knowledge-triggers.py`, `scripts/check-knowledge-triggers.sh`
- Contract rows: `plugins/borso-harness/scripts/check-hook-decisions.sh`
- Front-matter format: `docs/knowledge/README.md`
- Ladder: `plugins/borso-harness/skills/dantotsu/SKILL.md`, step 6, rung 5
- Related ADRs: ADR-0014 (generated files are not committed), ADR-0026 (the harness ships as a plugin)
