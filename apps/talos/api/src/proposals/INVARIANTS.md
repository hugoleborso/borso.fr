# Invariants of talos, in `api/src/proposals`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Proposal

- The values `proposee`, `acceptee`, `refusee` stay in French: they are data the repository holds, not identifiers.
- A decision appends a line under « Décision ». An acceptance, with or without an option, also fires a run (`api/src/helpers/routine/`), kept as a routine run. A refusal fires nothing.

Held by: `api/src/proposals/proposals.controller.test.ts` › records a refusal in the memory without firing the routine

- A cancellation (`cancelProposalDecision`) takes back an `acceptee` or `refusee` decision before Talos acts on it: the status returns to `proposee`, a `décision annulée` line is appended, and no run fires. It is not a third decision, which is why it is not in `PROPOSAL_DECISIONS`.
- A proposal with options lists two distinct ones or more; the agent writes 2 to 4. Choosing an option is an acceptance whose decision line names it, `acceptée (jeudi)`, and its run's fire text carries `choix: <option>`. The API records nothing for an option the proposal does not offer, an option with a refusal, or an acceptance without an option when the proposal has options.

Held by: `api/src/proposals/proposals.controller.test.ts` › records the chosen option in the decision line and fires the routine
Held by: `api/src/proposals/proposals.controller.test.ts` › refuses a proposal with options without a choice, and offers the choices again after a cancellation
Held by: `api/src/proposals/proposals.controller.test.ts` › answers 400 and records nothing for %s

Not held: the options are read before the conditional write, which holds only the status. An agent rewrite of « Options » landing between the owner's read and write records a choice the new list no longer offers. The operator accepted this risk on 2026-11-15, because the agent does not rewrite a pending proposal's options.
