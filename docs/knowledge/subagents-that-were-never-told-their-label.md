# A subagent that was not told its kaizen label writes as `main`, and the sweep goes blind

Observed on PR #49. `KAIZEN.md` ended the task with nine entries. Every one was
written by the main session; the label on all of them is `main`.

The PR spawned a subagent — an independent auditor that walked every "enforced
by" section in `docs/standards/` against the file supposed to do the enforcing,
and returned fifteen findings. It hit friction doing that: reading a rule out of
`eslint --print-config`, measuring blast radius, deciding what counted as a
mismatch. None of it was logged, because its prompt never carried the line
CLAUDE.md asks for:

> log any friction as you hit it: `scripts/kaizen.sh --from <your-label> "<one sentence>"`

**What that costs is not the entries — it is the arithmetic.** One agent hitting
a wall is a local problem. Four agents hitting the same wall is a systemic one,
and the two want different eradications: a fix where it happened, versus a change
to whatever they all read. A sweep that sees only `main` cannot tell those apart,
so it under-reads every wall a fleet hit and over-reads the one the main session
happened to notice.

The tell, checkable in ten seconds before the sweep starts:

```bash
grep -c '`main`' KAIZEN.md   # vs the number of agents the task spawned
```

If a task spawned agents and every entry says `main`, the inventory is missing
their half and the sweep should say so rather than present a partial picture as
a complete one.
