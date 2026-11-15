# Invariants of pragma, in `api/src/realtime`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Realtime connection

- `client_id` is the random id the tab drew once. Every write from that tab
  carries it in `X-Pragma-Client`, so the write's own tab is never told.
- Opened only with a **realtime ticket**; `$connect` refuses a missing,
  expired or forged one. `$disconnect` and a gone (410) answer delete the
  row. A frame the tab sends changes nothing.
- Kept out of every preview's copy of production and out of the read-only
  reader's reach.

Held by: `api/src/realtime/realtime.controller.test.ts` › posts the root the write touched to every tab but the writer’s own
Held by: `cdk/test/stack.test.ts` › keeps the reader off every table holding a credential, a key, a secret address or a ballot token
Held by: `cdk/test/stack.test.ts` › clones prod into a preview with its passwords and its takes, but no passkey, no avatar key, and no push subscription or key pair
Held by: `api/src/realtime/realtime.controller.test.ts` › refuses a forged ticket
Held by: `api/src/realtime/realtime.controller.test.ts` › forgets a connection API Gateway reports gone

## Realtime ticket

- Signed with the same HMAC key as the session cookie, over a purpose
  prefix the cookie never carries, so neither verifies as the other.

Held by: `api/src/realtime/realtime-ticket.utils.test.ts` › never lets a session cookie open a socket
Held by: `api/src/realtime/realtime-ticket.utils.test.ts` › never lets a ticket pass as a session cookie
