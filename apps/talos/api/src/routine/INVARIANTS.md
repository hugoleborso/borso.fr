# Invariants of talos, in `api/src/routine`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Routine run

- `subject` is the proposal's memory slug, or for an older `message` run the message cut to 200 characters.
- `sessionUrl` is the address of the Claude Code conversation the fire created, kept only when it is `https://claude.ai/code/` followed by a plain path (`readSessionUrl`), `null` otherwise.
- A fire that fails, or that is skipped because no `fire-url` is set, leaves no run.
Held by: `api/src/proposals/proposals.controller.test.ts` › commits the decision even when no routine is configured
