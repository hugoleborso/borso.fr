# Invariants of talos, in `api/src/proposals`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Proposal

- The values `proposee`, `acceptee`, `refusee` stay in French: they are data the repository holds, not identifiers.
- A decision appends a line under « Décision » and fires a run (`api/src/helpers/routine/`), kept as a routine run.
- A cancellation (`cancelProposalDecision`) takes back an `acceptee` or `refusee` decision before Talos acts on it: the status returns to `proposee`, a `décision annulée` line is appended, and no run fires. It is not a third decision, which is why it is not in `PROPOSAL_DECISIONS`.
- A proposal lists 2 to 4 options. Choosing an option is an acceptance whose decision line names it, `acceptée (jeudi)`, and its run's fire text carries `choix: <option>`. The API records nothing for an option the proposal does not offer, an option with a refusal, or an acceptance without an option when the proposal has options.

Held by: `api/src/proposals/proposals.controller.test.ts` › records the chosen option in the decision line and fires the routine
Held by: `api/src/proposals/proposals.controller.test.ts` › refuses a proposal with options without a choice, and offers the choices again after a cancellation
