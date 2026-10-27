---
status: done
summary: Wrote plan.md for song takes and web push, referencing ADR-0040, with a decision table, risk register, gates, operator steps and four ordered slices (takes-api, push-api, takes-site, push-site). Workspace corrections recorded in the plan include no site/src/features folder (queries go in site/src/lib/queries), no DEFAULT now() (migration audit test), cascades in code because DSQL has no foreign keys, the uploads adapter needing a signed ContentLength and a delete grant, and the VAPID SecureStrings having to be created by hand under /pragma/prod and /pragma/preview. No open question blocks implementation.
artifacts:
  - docs/features/pragma/song-takes-and-push/plan/plan.md
  - docs/features/pragma/song-takes-and-push/runs/2026-10-23-pragma-takes/state.json
next:
  kind: validate
---

Operator step owed before push works on a stage: create four SSM SecureStrings in eu-west-3,
`/pragma/prod/vapid-public`, `/pragma/prod/vapid-private`, `/pragma/preview/vapid-public`,
`/pragma/preview/vapid-private`, from one VAPID pair per stage. Without them the stage answers
"push not configured" and writes still succeed.
