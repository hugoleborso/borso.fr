# ADR-0052: pragma previews clone takes and read their audio from the production uploads bucket

- **Status:** accepted
- **Date:** 2026-10-29
- **Ratified:** by the operator in chat on 2026-10-29
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, ux-redesign, cdk, data, previews

## Context

A pragma preview clones the production schema so a change is reviewed against the band's real data ([ADR-0009](./0009-pragma-previews-clone-production.md)). Two tables were left out of that clone: `take` and `take_comment`. A take row holds an `object_key` such as `take/<songId>/<takeId>.webm`, and the audio behind that key lives in production's uploads bucket, `pragma-prod-uploads`. A preview's API reads only its own bucket, `pragma-preview-uploads-<n>`, so a cloned take would have listed and then failed to play. The result is that every preview shows a song page and a session page with no takes, which is not what the band sees, and the redesign puts takes on both pages.

The operator wants the production takes visible and playable on every preview. The audio is read through one path: the site asks `POST /api/uploads/sign-get` for a presigned GET address for the take's object key, and the API signs it against `UPLOADS_BUCKET` (`apps/pragma/api/src/uploads/uploads.adapter.ts`). A presigned address carries the signer's permissions, so a preview can only hand out a working address for a production object if its own role may read that object. A take recorded on a preview is uploaded to the preview's own bucket, and its key has the same shape as a production take's key, so the key alone does not say which bucket holds the audio.

## Decision

**Previews clone `take` and `take_comment`, the preview API may `s3:GetObject` on `pragma-prod-uploads/take/*` and nothing else, and signing a take's read falls back to the production bucket when the preview's own bucket does not hold the key.** The stack removes the two tables from the preview `tableBlocklist`, imports the production bucket by name with `Bucket.fromBucketName` on every stage that is not production, adds one `s3:GetObject` statement scoped to the `take/*` prefix to the API role, and passes the bucket's name as `PRODUCTION_UPLOADS_BUCKET`. When that variable is set and the key starts with `take/`, `mintChartGetUrl` asks the own bucket for the key with `HeadObject` and signs against production only when the answer is "not found"; every other key, and every key on production itself, is signed against the own bucket without asking S3 anything. Uploads and deletions are untouched: a take recorded on a preview still goes to the preview's bucket, and a deletion only ever targets the stage's own bucket.

## Consequences

- `+` Every preview lists and plays the band's real takes and their comments, so the song page, the session page and practice mode are reviewed against real recordings.
- `+` Production's behaviour is unchanged: without `PRODUCTION_UPLOADS_BUCKET` the read path makes no extra S3 call and signs exactly as before.
- `-` The band's recordings become reachable from every preview. Reaching them still requires signing in with a production account, because a preview clones the production credentials (ADR-0009), so the set of people who can hear them does not grow; the set of hosts that serve them does.
- `-` Deleting a cloned take on a preview removes the row from the preview's schema and asks the preview's own bucket to delete the key, which it does not hold. S3 answers a delete of an absent key as a success, so nothing is logged, and the production object stays where it is. The read-only grant makes the same promise a second time: even a call aimed at the production bucket would be refused. `uploads.adapter.test.ts` holds that `deleteObjects` names the own bucket while a production bucket is configured.
- `-` On a preview, each read of a take costs one `HeadObject` before the signature. A take is signed when a member presses play, not when a list renders, so this is one extra request per playback, on previews only.
- `~` A redeploy that changes the clone configuration fires a CloudFormation Update on the schema resource, and the migration runner re-runs the clone with `ON CONFLICT DO NOTHING`. An open preview therefore receives the production takes on its next deploy, without being recreated.
- `~` Chart files and avatars are outside this decision: their keys still point at production on a preview, and the grant is scoped to `take/*` so it does not reach them.

## Alternatives considered

### Option A — fall back to production for a take key absent from the own bucket (chosen)

- **Raised by:** author
- **Summary:** As in the decision. The bucket is chosen at read time, from what the own bucket holds.
- **Strengths:**
  - No schema change and no migration: DSQL refuses `DROP COLUMN`, so a marker column would stay for good.
  - Correct for both kinds of take on a preview, cloned and recorded there, with no state to keep in step.
  - Production runs the same code path it ran before.
- **Costs:**
  - One `HeadObject` per playback on a preview.
  - The preview role needs `s3:ListBucket` on its own bucket for S3 to answer "not found" instead of "access denied"; `grantRead` already gives it.
- **Rationale:** the only option that needs neither a column nor a guess.

### Option B — mark cloned rows and route by the mark

- **Raised by:** author
- **Summary:** Add a nullable column to `take`, set it on the clone with a `columnsToSet`-style option in the migration runner, and sign marked rows against production.
- **Strengths:** No extra S3 call; the bucket is known from the row.
- **Costs:** A column on `take` that only previews use, which DSQL would never let us drop; a change to the shared migration runner in `infra/cdk`, which is coverage-gated; the sign route takes an object key, not a take, so it would need the row looked up first.
- **Rejection rationale:** loses on footprint. It would only win if `HeadObject` were too slow, which a single request on preview playback is not.

### Option C — copy the audio into the preview's bucket at clone time

- **Raised by:** author
- **Summary:** Have the deploy copy `pragma-prod-uploads/take/*` into each preview's bucket.
- **Strengths:** No grant on production at read time; the preview stays self-contained.
- **Costs:** A copy job in the deploy, run on every preview, with storage paid per open pull request; the copy has to be kept in step with production between deploys.
- **Rejection rationale:** a new moving part for the same visible result as Option A.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Production unchanged | high | A preview convenience must not change how production serves takes. |
| No permanent schema or shared-construct change | high | DSQL refuses `DROP COLUMN`, and `infra/cdk` is shared and coverage-gated. |
| Least access on production | medium | The grant is read-only and limited to the prefix takes use. |
| Moving parts | medium | A one-person lab pays for every job it runs on every pull request. |

|             | Option A | Option B | Option C |
|---|---|---|---|
| Production unchanged | ✓ no extra call without the variable | ✓ | ✓ |
| No permanent schema or shared-construct change | ✓ | ✗ a column for good and a runner change | ✓ |
| Least access on production | ✓ `s3:GetObject` on `take/*` | ✓ same grant | ✓ read at copy time only |
| Moving parts | ✓ one branch in the read path | ✗ column, runner option, lookup | ✗ a copy job per preview |

## Implementation pointers

- Spec: [`docs/features/pragma/ux-redesign/spec/spec.md`](../features/pragma/ux-redesign/spec/spec.md)
- Files: `apps/pragma/cdk/lib/stack.ts` (clone blocklist, `ProductionUploadsBucket`, the `s3:GetObject` statement), `apps/pragma/api/src/uploads/uploads.core.ts` (`canReadFromProductionBucket`), `apps/pragma/api/src/uploads/uploads.service.ts` (`mintChartGetUrl`), `apps/pragma/api/src/uploads/uploads.adapter.ts` (`isStoredInOwnBucket`, `presignGetObject`'s `source`)
- Related ADRs: supersedes the `take` and `take_comment` part of [ADR-0009](./0009-pragma-previews-clone-production.md)'s `tableBlocklist`; builds on [ADR-0040](./0040-pragma-sends-web-push-like-talos.md), which added them
