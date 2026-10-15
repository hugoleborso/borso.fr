---
date: 2026-10-15
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#118'
fix-pr: '#181'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/lib/api.client.ts, apps/pragma/site/src/lib/session-end.core.ts, apps/pragma/site/src/lib/query-client.setup.ts, apps/talos/site/src/lib/session-end.core.ts, apps/talos/site/src/lib/query-client.setup.ts]
time-to-detect: hours
tags: [pragma, talos, frontend, react, auth]
zone: apps/pragma/site/src/lib/queries
recurs: none (the first defect in how the site learns a session has ended)
---

# The tab that stayed signed in

## Symptom

During PR #118's visual validation, three validators reseeded the preview while
a browser was signed in. The reseed rotates the cookie signing key. After it,
every API call answered `401 session-invalid: bad-signature`, while the tab
kept drawing the signed-in app shell with empty, failing regions. The sign-in
form never came back, so the validators' login script could not sign in, and
each reseed needed a manual clear of `localStorage`.

The same happens in production to any tab left open past its session's
expiry.

## Root-cause chain

1. **Why did the shell stay?** `RequireSession` grants the routes as long as
   the session probe's cached answer says `authenticated: true`.
2. **Why was that answer never revisited?** The probe runs once, with
   `staleTime: Infinity`, so a tab never asks again.
3. **Why did the failing calls not end the session?** Each of the roughly
   eighty places that read a response turns a failure into an `ApiError` of
   its own, and none of them knows the session exists. Only the probe forgot
   the marker on a 401.
4. **Why could a single handler on errors not fix it?** Not every 401 means
   the session ended. A wrong current password, a failed passkey and a missing
   audience ballot also answer 401, and 75 of the 79 `ApiError`s drop the body
   that would tell them apart.

**Root cause:** the site thought a session ends only when the probe says so,
but the probe runs once per tab, and the server says it on every call after
that.

## Detection failure causes

- **Tests:** the gate's tests cover a fresh probe answering 401. None covered
  a session that ends after the probe has answered 200.
- **Local validation:** a session lasts much longer than a development run,
  so it never expired while anyone was watching.
- **QA:** caught by the visual validators, who logged it three times as
  friction with their tooling rather than as an application defect.

## Countermeasure

The API client watches every answer. A 401 whose body says
`session-required` or `session-invalid` ends the session once, for the whole
application: the marker is forgotten and the probe's cached answer becomes
`authenticated: false`, so the gate sends the member to sign in.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #181](https://github.com/hugoleborso/borso.fr/pull/181) · commit [self]

**The actual fix:**

```diff
 export const api = hc<AppRouter>(API_BASE === '' ? '/' : API_BASE, {
   init: { credentials: 'include' },
+  fetch: fetchWatchingSessionEnd,
 });
```

```diff
+onSessionEnded(() => {
+  forgetSessionMarker();
+  queryClient.setQueryData<SessionProbeResult>(authKeys.session(), ENDED_SESSION);
+});
```

The watch sits in the one client every call goes through, so a new query
cannot forget it. The rule that tells an ended session from a refused request
lives in `session-end.core.ts` and is mutation-tested. Tests cover a session
refused mid-tab, a wrong password left alone, a non-JSON 401 and a 500.

**Sibling defects swept:** talos had the same defect. `useSession` caches its
answer with `staleTime: Infinity`, and a read refused with
`401 session-required` left the shell in place. Its error body carries a
French display message rather than a code, so the body cannot tell one 401
from another. On talos, though, a read only returns 401 for a missing session:
the bootstrap-code and passkey 401s answer sign-in requests, and the
bearer-token 401 answers the server-to-server notify endpoint. So talos ends
the session on any 401 from a read, through the query cache's `onError`, with
the rule in its own mutation-tested `session-end.core.ts`. last-loop-lepin and
banana-rush cache no session probe forever. banana-rush's game query does, but
it holds a game, not a session.

## See also

- [mount-time-side-effects-implied-not-asserted](./mount-time-side-effects-implied-not-asserted.md):
  the session marker's origin.
