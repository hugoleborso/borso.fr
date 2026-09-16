---
date: 2026-09-16
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#101'
fix-pr: '#101'
fix-commits: [48120e6]
eradication-level: 1
time-to-detect: hours
tags: [aws-ssm, pragma, adapter, blueprint, secrets]
---

# The escape hatch was the only thing that could throw

## Symptom

The operator opened the preview, filled the song form, pressed save, and got a
500. Every song creation, every time. Nothing in the response said Spotify.

The parameter the code was reaching for did not exist:

```
$ aws ssm get-parameter --name /pragma/spotify-credentials --region eu-west-3
ParameterNotFound
```

That is the state every stage is in until someone seeds the credential, which
means the branch as merged would have broken song creation everywhere rather
than degrading.

## Root-cause chain

1. **Why did the write fail?** `createSong` awaited
   `withResolvedSpotifyTrack`, which awaited `resolveSpotifyTrackId`, which
   awaited `fetchCredentials`, which awaited `readSecureParameter`. The
   exception rose through all four and became a 500.
2. **Why did `readSecureParameter` throw?** `GetParameterCommand` answers
   `ParameterNotFound` by rejecting. The AWS SDK does not return `undefined`
   for a parameter that is absent, and the signature
   `Promise<string | undefined>` reads exactly as though it does.
3. **Why did nothing catch it?** Every function in the chain was written to
   answer `null` on a failure, and each one did — for the failures it had been
   shown. The tests injected a `readParameter` that resolved `undefined`,
   never one that rejected, so the un-caught path was never executed.
4. **Why was the promise written down but not implemented?** The adapter's
   `@BlueprintDescription` says *"Every failure answers null rather than
   throwing, because a missing Spotify link is not an error the caller who was
   saving a song can act on."* The commit message said the same. Both are
   prose; no gate reads a blueprint description, so the claim shipped with no
   code behind it and read as a guarantee to everyone afterwards, including
   its own author.
5. **Why was the throwing call the one nobody looked at?** It lives in
   `parameter-store.client.ts`, the `*.client.ts` suffix this same pull request
   introduced as the escape hatch from the outbound-call rule
   ([ADR-0012](../adr/0012-outbound-calls-live-in-adapter-files.md), revision
   2026-09-15). The suffix exists precisely because such a file cannot take an
   injected fetcher, so it carries neither the coverage nor the mutation gate
   every `.adapter.ts` carries. The one file exempt from the gates was the one
   file that could throw.

**Root cause:** thought a failure inside an adapter that answers `null` is
contained by the adapter, actually the vendor call lives one file further down
in the gate-exempt `*.client.ts`, where a rejection is the normal way the SDK
reports an absent parameter.

## Detection failure causes

- **Typing:** `Promise<string | undefined>` describes the resolved value and
  says nothing about rejection. TypeScript has no checked exceptions, so the
  signature was as honest as the language allows and still misled.
- **Linter / static analysis:** no rule relates a `@BlueprintDescription`'s
  claims to the code under it. There is no general one to write, either —
  "every failure answers null" is prose about behaviour, not a shape.
- **Functional validation locally:** the local API runs with
  `SPOTIFY_CREDENTIALS` unset and `SPOTIFY_CREDENTIALS_PARAMETER` unset, so
  `fetchCredentials` returned `null` before ever reaching the parameter store.
  The path that throws is reachable only when the variable naming the parameter
  is set and the parameter is not — which is exactly the deployed state, and
  exactly not the local one.
- **CI (tests / build):** 19 adapter tests, 100% coverage, 100% mutation score.
  All of them injected a `readParameter` that resolves. A rejection is not a
  branch, so the mutation gate had nothing to mutate and reported full marks on
  a file with an unhandled failure mode. Cf.
  [`a-green-mutation-gate-is-not-a-green-coverage-gate`](./a-green-mutation-gate-is-not-a-green-coverage-gate.md).
- **Code review:** the standards review read this file and cleared it. The
  blueprint description asserting the property is the likeliest reason: a
  reviewer reading "every failure answers null" beside code that answers null
  four times has been told the invariant holds.
- **Staging monitoring:** the preview deploy ran and was healthy. Nothing
  exercises a write on a preview until a person does, and the person was the
  operator.

## Countermeasure

- **Code:** commit `48120e6` — `resolveSpotifyTrackId` wraps the whole flow in
  a `try`/`catch`, answers `null` on any throw, and logs once so an operator
  debugging a missing link has something to find. Three tests drive a rejecting
  parameter reader, a rejecting fetcher and a body that is not the JSON it
  claims; each fails without the catch. The tests that expect a *clean* `null`
  now assert that nothing was logged, which is what separates "Spotify has no
  track for this ISRC" from "the call fell over".
- **Operator action:** none. The feature degrades to a Spotify search link
  until `/pragma/spotify-credentials` is seeded, which is what the PR body
  always said it would do.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #101](https://github.com/hugoleborso/borso.fr/pull/101) ·
commit [`48120e6`](https://github.com/hugoleborso/borso.fr/commit/48120e6) ·
the kaizen branch commit below

The countermeasure fixed this caller. The eradication removes the class: the
gate-exempt boundary no longer throws at all, so no present or future caller of
a `*.client.ts` reader can be surprised by it. A file that is exempt from the
gates has to be the file that cannot fail its callers, and that is now the rule
the suffix carries.

**The actual fix:**

```diff
 export async function readSecureParameter(parameterName: string): Promise<string | undefined> {
-  const answer = await getClient().send(
-    new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
-  );
-  return answer.Parameter?.Value;
+  try {
+    const answer = await getClient().send(
+      new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
+    );
+    return answer.Parameter?.Value;
+  } catch (error) {
+    console.warn(`the parameter ${parameterName} could not be read`, error);
+    return undefined;
+  }
 }
```

The signature now tells the truth: `string | undefined` and no other outcome.
An absent parameter, a denied read and a KMS failure all arrive as `undefined`,
which is the shape every caller already handles.

**Sibling defects swept:** `parameter-store.client.ts` is the only
`*.client.ts` file in the tree besides `database/client.ts`, whose failures are
genuinely fatal to a request and must keep propagating. No other file carries
the suffix today, so the rule lands with the first two.

## See also

- [ADR-0012](../adr/0012-outbound-calls-live-in-adapter-files.md) — the
  revision that created the `*.client.ts` escape hatch this defect hid in.
- [ADR-0017](../adr/0017-spotify-track-ids-resolved-by-isrc-at-link-time.md) —
  its consequence about the credential failing silently now names the exception
  and records that the first implementation did not implement the silence.
- [`a-green-mutation-gate-is-not-a-green-coverage-gate`](./a-green-mutation-gate-is-not-a-green-coverage-gate.md)
  — a full mutation score over a path nobody drives.
- [`three-green-gates-on-code-that-ran-nowhere`](./three-green-gates-on-code-that-ran-nowhere.md)
  — the same shape, where the gates agreed about code the product never reached.
