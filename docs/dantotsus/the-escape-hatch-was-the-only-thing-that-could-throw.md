---
date: 2026-09-16
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#101'
fix-commits: [48120e6780, 320f1cdca]
eradication-level: 4
eradication-paths: [apps/pragma/api/src/songs/spotify.adapter.test.ts, apps/pragma/api/src/songs/spotify.adapter.ts, apps/pragma/api/src/helpers/secrets/parameter-store.client.ts]
time-to-detect: hours
tags: [aws-ssm, pragma, adapter, blueprint, secrets]
zone: apps/pragma/api/src/helpers/secrets/parameter-store.client.ts
---

# The escape hatch was the only thing that could throw

## User impact

The operator opened the PR #101 preview, filled pragma's song form and
pressed save. Every song creation answered a 500, every time, and nothing in
the response named Spotify. Expected: the song saves, with a Spotify search
link instead of an exact track link while the credential is unseeded.

The parameter did not exist, which is the state of every stage until someone
seeds it (measured):

```
$ aws ssm get-parameter --name /pragma/spotify-credentials --region eu-west-3
ParameterNotFound
```

Merged as it was, the branch would have broken song creation in every stage.

## Causal chain

- Saving a song answered a 500.
  - `createSong` awaited `withResolvedSpotifyTrack`, then
    `resolveSpotifyTrackId`, then `fetchCredentials`, then
    `readSecureParameter`. An exception rose through all four.
    - `GetParameterCommand` rejected with `ParameterNotFound`, and
      `readSecureParameter` had no `catch` around it:

      ```ts
      const answer = await getClient().send(
        new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
      );
      return answer.Parameter?.Value; // ← ❌ an absent parameter never reaches this line: send() rejects
      ```

      - Commit `c718c65ed`, written by an agent, added this file and the
        adapter's promise that "every failure answers null rather than
        throwing". The adapter answered null on every branch it saw. The
        throw lived one file down.
        - The writer read the absent case off the return type. The SDK
          declares `Parameter?: Parameter | undefined` on the output
          (`@aws-sdk/client-ssm` 3.1167.0, `models_0.d.ts` line 10688). The
          rejection is stated only in the command's JSDoc,
          `@throws {@link ParameterNotFound}`, which the call site does not
          show. **Material** (inferred: no transcript of the writing session
          survives).
        - The same commit moved the file out of every gate. It widened the
          `no-outbound-call-outside-adapter` exemption to the `*.client.ts`
          suffix, because such a file "cannot meet the coverage and mutation
          gates every `.adapter.ts` carries". Nothing replaced what the gates
          gave up, so the null promise stayed prose. **Method.**

## Root cause of occurrence

*Thought `GetParameterCommand` resolves with no `Parameter` when the
parameter is absent, actually it rejects with `ParameterNotFound`.* Material
(inferred): the SDK's output type marks `Parameter` optional at the call
site, and only the command's JSDoc says it throws.

The writer knew the pattern for a null-on-failure call. The same app's
`apps/pragma/api/src/auth/passkey.adapter.ts` already wrapped its vendor
calls in `try`/`catch` before this commit (`git show c718c65ed^:` that file,
lines 102 and 131). The `?.` on `answer.Parameter` shows where the writer
expected absence to arrive.

## Detection failure causes

- **Typing:** `Promise<string | undefined>` says nothing about rejection.
  TypeScript has no checked exceptions.
- **Linter:** no rule relates a `@BlueprintDescription` claim to the code
  under it.
- **Local validation:** the local API runs with
  `SPOTIFY_CREDENTIALS_PARAMETER` unset, so `fetchCredentials` returned null
  before it reached the parameter store. Only the deployed state, variable
  set and parameter absent, reaches the throw.
- **CI:** 19 adapter tests, 100% coverage and 100% mutation score. Every test
  injected a `readParameter` that resolved. A missing `catch` is not a branch,
  so the mutation gate had nothing to mutate. The client file itself is
  outside the coverage `include` of the app's `vitest.config.ts`. See
  [`a-green-mutation-gate-is-not-a-green-coverage-gate`](./a-green-mutation-gate-is-not-a-green-coverage-gate.md).
- **Code review:** the review read "every failure answers null" beside code
  that answered null four times, and cleared it.
- **Preview monitoring:** nothing exercises a write on a preview until a
  person does.

## Countermeasure

Commit `48120e6` wraps `resolveSpotifyTrackId` in a `try`/`catch` that answers
null and logs once. Three tests drive a rejecting parameter reader, a
rejecting fetcher and a body that is not JSON. Each fails without the catch.
The tests that expect a clean null assert nothing was logged, which separates
"Spotify has no track for this ISRC" from "the call fell over".

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`48120e6`](https://github.com/hugoleborso/borso.fr/commit/48120e6)
for the adapter and its rejecting tests, and commit
[`320f1cdca`](https://github.com/hugoleborso/borso.fr/commit/320f1cdca) for the
client's own catch.

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
+    ...
+    return undefined;
+  }
 }
```

What holds today is per file. `spotify.adapter.test.ts` drives
`readParameter: () => Promise.reject(new Error('ParameterNotFound'))` and fails
if the adapter's catch goes. Both `parameter-store.client.ts` files, in pragma
and talos, now catch and record the failure on the wide event.

This entry first claimed level 1, saying "a file that is exempt from the
gates has to be the file that cannot fail its callers, and that is now the
rule the suffix carries". No code holds that rule. Two talos clients added on
2026-10-16 call the SDK with no `try`, measured with grep:
`apps/talos/api/src/helpers/backup/backup-vault.client.ts` (commit
`50b7ee514`) and `apps/talos/api/src/helpers/storage/object-store.client.ts`
(commit `607022b15`). Whether their throws are wrong is a separate question:
a backup job that fails loudly may be the right behaviour (inferred).

**Proposed:** a rule under `eslint-rules/`, beside
`no-outbound-call-outside-adapter.js`, that reports any exported function in
`apps/*/api/src/**/*.client.ts` whose body is not one top-level
`try`/`catch`. A client whose failure must propagate, such as
`database/client.ts` or a backup job, says so on the line with
`// eslint-disable-next-line <rule> -- <reason>`. That makes a client that
throws a decision written at the call to the SDK, instead of a property a
reader infers from an adapter's prose.

**Proof it can fail:** removing the adapter's `catch` fails the three
rejecting tests (commit `48120e6`).

**Similar instances:** `git ls-files 'apps/*/api/src/**/*.client.ts'` lists
the vendor clients. The two talos ones above throw. `database/client.ts`
throws on purpose.
