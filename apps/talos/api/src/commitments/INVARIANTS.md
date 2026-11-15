# Invariants of talos, in `api/src/commitments`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Commitment

- A todo whose `engagement` names it claims it, and the agenda shows only the todo (`selectUnclaimedCommitments`).
- Read only, open ones only (`statut: ouvert`).
