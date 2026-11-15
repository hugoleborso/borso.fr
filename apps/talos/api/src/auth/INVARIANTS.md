# Invariants of talos, in `api/src/auth`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Passkey, session, push subscription

- The last passkey cannot be removed, so the owner cannot lock themselves out.
