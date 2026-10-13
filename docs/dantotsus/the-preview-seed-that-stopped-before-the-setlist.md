---
date: 2026-10-13
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#172'
fix-pr: none (opened with this entry; the number is not known when the file is written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/cdk/lib/stack.ts, apps/pragma/cdk/test/stack.test.ts]
time-to-detect: minutes
tags: [pragma, dsql, cdk, testing]
zone: apps/pragma/cdk/lib/stack.ts
recurs: none (the first time the pragma seed was run against a preview; earlier entries cover the seed being skipped, not timing out)
---

# The preview seed that stopped before the setlist

## Symptom

`POST https://pragma-pr-172-api.preview.borso.fr/api/__test/seed` answered
`500 Internal Server Error` twice. The Lambda log shows the reason:

```
<-- POST /api/__test/seed
REPORT ... Duration: 10000.00 ms ... Status: timeout
```

The seed was not rolled back, because its writes are separate statements.
After the second run the preview held the fixture's songs, members and
credentials, a concert, and that concert's setlist with no entries in it. The
Studies screen showed no concert readiness, and the setlist had to be filled
by hand through the API before a demo could be recorded.

## Root-cause chain

1. **Why did the seed fail?** The API Lambda stopped it at 10 s.
2. **Why 10 s?** `LambdaApi` defaults to 10 s, and pragma's stack never set
   `timeoutSeconds`.
3. **Why did nothing notice?** The seed runs locally against a Postgres on
   the same machine, and `preview.yml` deliberately never seeds pragma,
   because the preview clones production
   ([ADR-0009](../adr/0009-pragma-previews-clone-production.md)). So no run
   had ever timed the seed against DSQL from a Lambda.
4. **Why does it take longer there?** It deletes every domain row, hashes
   the shared password twice and one password per seeded member with
   argon2id, and writes the fixture row by row, each statement a round trip
   to DSQL.

**Root cause:** thought the seed fits in the API's default 10 s because it
fits locally; actually it is only ever run on a preview, against DSQL, where
it does not.

## Detection failure causes

- **CI (tests / build):** the seed's own tests run against the local
  Postgres, which is far faster than DSQL, so no test could see the time.
- **Code review:** the timeout is a construct default nobody reads; the
  stack never mentioned it.
- **Staging monitoring:** a preview is seeded only by hand, so the first run
  was also the first measurement.

## Countermeasure

- **Operator action:** the PR #172 preview was finished by hand: the six
  songs were added to the seeded concert's setlist through the API, and the
  duplicate concert and setlist created on the way were deleted.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** the commit adding this file.

**The actual fix:** every stage that mounts the seed route gets the 29 s
timeout talos already uses; production keeps the default, and a stack test
holds both values.

```diff
 const ABORT_MULTIPART_UPLOAD_DAYS = 1;
+const SEEDABLE_API_TIMEOUT_SECONDS = 29;
 ...
     api: {
       entry: props.apiEntry,
+      ...(isProduction ? {} : { timeoutSeconds: SEEDABLE_API_TIMEOUT_SECONDS }),
```

29 s is the value talos already runs its API with. Whether the whole fixture fits in 29 s on DSQL has not been measured yet: the
first preview deployed with this change is where that is checked.

**Sibling defects swept:** none checked beyond pragma. `last-loop-lepin`'s
seed is posted by `preview.yml` on every deploy, so a timeout there would
fail its deploy job and be seen.

## See also

- [`docs/knowledge/a-pragma-preview-cannot-be-signed-into.md`](../knowledge/a-pragma-preview-cannot-be-signed-into.md),
  which now names the seed as the way in and what it costs.
