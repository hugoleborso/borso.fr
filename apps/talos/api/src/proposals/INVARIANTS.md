# Invariants — talos, `api/src/proposals`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Proposal

- The values `proposee`, `acceptee`, `refusee` stay in French: they are data the repository holds, not identifiers.
- A decision appends a line under « Décision » and fires a run (`api/src/helpers/routine/`), kept as a routine run.
- A cancellation (`cancelProposalDecision`) takes back an `acceptee` or `refusee` decision before Talos acts on it: the status returns to `proposee`, a `décision annulée` line is appended, and no run fires. It is not a third decision, which is why it is not in `PROPOSAL_DECISIONS`.
