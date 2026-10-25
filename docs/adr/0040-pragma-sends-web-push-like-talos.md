# ADR-0040: pragma sends Web Push the way talos does, inline from the API with one VAPID pair per stage

- **Status:** proposed
- **Date:** 2026-10-23
- **Deciders:** Hugo Borsoni
- **Tags:** song-takes-and-push, app-architecture, security

## Context

The [takes and push spec](../features/pragma/song-takes-and-push/spec/spec.md) adds web push to pragma. Members are told about new takes, comments on takes, session changes, and setlist, lineup and transition changes. Each message has to be encrypted for the device (RFC 8291) and signed with a VAPID key (RFC 8292). That needs either a dependency or cryptography code we would own, plus a key pair kept somewhere secret. The band has about six members, so one event fans out to a handful of devices.

pragma previews clone the production schema ([ADR-0009](./0009-pragma-previews-clone-production.md)). Without care, a preview would hold the band's real subscriptions and could push to their phones. The talos app already sends web push in production, and the operator asked for pragma to do it the same way if possible.

## Decision

**Copy the talos shape.** `web-push` 3.6.7, the version talos pins, moves into the pnpm catalog so both applications read one version. It is imported by one file, `api/src/notifications/web-push.adapter.ts`, modelled on [`apps/talos/api/src/push/web-push.adapter.ts`](../../apps/talos/api/src/push/web-push.adapter.ts), which returns a delivery outcome instead of throwing. The API Lambda sends inline after the triggering write commits. Every send is bounded by a timeout, and a failed send never fails the write. The key pair is two SSM SecureStrings per stage, `/pragma/<stage>/vapid-public` and `/pragma/<stage>/vapid-private`, read the way `SPOTIFY_CREDENTIALS_PARAMETER` is. `push_subscription` joins the preview clone's `tableBlocklist`.

## Consequences

- `+` One push implementation pattern in the repository. A fix to the talos adapter has an obvious twin, and the catalog keeps the two on the same library version.
- `+` No new infrastructure: no queue, no second Lambda, no new IAM role beyond an `ssm:GetParameter` on two parameter names.
- `+` A preview signs with its own key and holds no production subscription, so it cannot reach a member's phone.
- `-` A write that triggers a notification now waits for the sends, up to the timeout, before it responds. That is bounded, but it is latency the member sees on a save.
- `-` Each stage needs its key pair created by hand in SSM before push works there. A stage without one must degrade to "push not configured" rather than fail.
- `-` `web-push` has had no release since January 2024. If it is abandoned, both applications have to move together.
- `~` The two SecureStrings are an operator step in the deployment runbook, like the Spotify credential.

## Alternatives considered

### Option A — `web-push`, inline, one key pair per stage (chosen)

- **Summary:** as in *Decision*.
- **Strengths:**
  - The library is already in production in talos, so nothing new is trusted.
  - No new infrastructure to deploy, test or pay for.
- **Costs:**
  - One dependency with five transitive dependencies of its own.
  - Save latency bounded by the send timeout.
- **Rationale:** it wins on reuse and on infrastructure cost, which are the two high-weight criteria, and talos shows it works on the same runtime.

### Option B — Hand-rolled RFC 8291 and RFC 8292 on `node:crypto` (rejected)

- **Summary:** implement ECDH, HKDF, AES-128-GCM payload encryption and the ES256 VAPID token ourselves.
- **Strengths:** no dependency.
- **Costs:** security code we own and must test against real push services; it would duplicate what talos already gets from the library.
- **Rejection rationale:** it loses on reuse ("reuse before you build"), and on how sure we are that it is right. No weighting where the dependency counts more than correct cryptography flips this.

### Option C — Queue and worker Lambda (rejected)

- **Summary:** the API writes a message to SQS, and a worker Lambda sends the pushes.
- **Strengths:** the save does not wait on push services, and retries come from the queue.
- **Costs:** a queue, a second function, a dead-letter queue and their CDK tests in a coverage-gated stack.
- **Rejection rationale:** it loses on infrastructure cost for a fan-out of a handful of devices. It would win if the band grew to hundreds of subscriptions or if the save latency were measured as a problem.

### Option D — One VAPID pair shared by every stage (rejected)

- **Summary:** a single `/pragma/vapid-*` pair, like the Spotify credential.
- **Strengths:** created once.
- **Costs:** a preview signs with the production key.
- **Rejection rationale:** it loses on isolation. Together with a cloned subscription table, a preview could push to the band's phones.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Reuse of what the repository already runs | high | CLAUDE.md *Reuse before you build*, and the operator asked for the talos approach. |
| Infrastructure added | high | The app is a one-person lab, and every resource is a coverage-gated CDK change. |
| Preview isolation | high | Previews clone production ([ADR-0009](./0009-pragma-previews-clone-production.md)), so a leak reaches real members. |
| Save latency | low | About six members means a handful of sends, bounded by a timeout. |

|   | A: web-push inline | B: hand-rolled | C: queue + worker | D: shared key |
|---|---|---|---|---|
| Reuse | ✓ same library as talos | ✗ new crypto code | ✓ same library | ✓ same library |
| Infrastructure | ✓ two SSM parameters | ✓ two SSM parameters | ✗ queue, worker, DLQ | ✓ one parameter |
| Preview isolation | ✓ key per stage, table blocklisted | ✓ same | ✓ same | ✗ preview signs as prod |
| Save latency | ✗ waits up to the timeout | ✗ same | ✓ returns at once | ✗ waits up to the timeout |

## Implementation pointers

- Spec: [`docs/features/pragma/song-takes-and-push/spec/spec.md`](../features/pragma/song-takes-and-push/spec/spec.md), *Architectural choices*
- Plan: to be written by `/technical-conception`
- Commit: [`d117a320`](https://github.com/hugoleborso/borso.fr/commit/d117a320bc674195391e50c3e739654441d5f177) (PR #193, squashed)
- Files: `apps/talos/api/src/push/web-push.adapter.ts`, `apps/talos/api/src/push/push.service.ts` (precedent); `apps/pragma/cdk/lib/stack.ts` (parameters, blocklist); `pnpm-workspace.yaml` (catalog)
- Related ADRs: builds on ADR-0009, ADR-0017 (a credential in SSM)

## Revisions

### Revision 2026-10-24 — the key pair moves from SSM into the database

What changed: the VAPID key pair is no longer two SSM SecureStrings per stage.
It lives in a `vapid_key_pair` table, one row under id 1, which the API fills
the first time push needs a key: it calls `webPush.generateVAPIDKeys()` and
inserts the pair with `ON CONFLICT DO NOTHING`, so two first uses at the same
moment keep one pair, and both read back the one that was written. The stack
names no VAPID parameter and grants `ssm:GetParameter` on the Spotify
credential alone. `vapid_key_pair` joins the preview clone's `tableBlocklist`
([ADR-0009](./0009-pragma-previews-clone-production.md)), so each preview
generates a pair of its own and keeps it across its deploys. A stage can no
longer be without a key, so the key route no longer answers 503
`push-not-configured`.

Why: the operator wants push to need no AWS secret and no manual step. Every
stage needed four SecureStrings created by hand before push worked there, and
nothing in the repository could check that they existed. The standard SSM tier
was already free, so cost was never the reason.

Implication for the original decision: still valid. The library, the inline
send, the one adapter and the preview isolation are unchanged. Two of its
consequences change: no stage needs a manual key step, and the private key is
now readable by the API's database role, as the session HMAC key in
`app_config` already is, instead of sitting under SSM's KMS encryption. A
leaked database dump now also yields the push signing key, which lets its
holder push to the band's subscribed devices until the pair is replaced.
