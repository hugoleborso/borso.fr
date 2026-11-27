---
date: 2026-10-15
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#118'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/lib/api.client.ts, apps/pragma/site/src/lib/session-end.core.ts, apps/pragma/site/src/lib/query-client.setup.ts, apps/talos/site/src/lib/session-end.core.ts, apps/talos/site/src/lib/query-client.setup.ts]
time-to-detect: hours
tags: [pragma, talos, frontend, react, auth]
zone: apps/pragma/site/src/lib/queries
recurs: none (the first defect in how the site learns a session has ended)
---

# The tab that stayed signed in

## User impact

Any pragma or talos member whose tab outlived its session. Found during PR
#118's visual validation, when three validators reseeded the preview while a
browser was signed in. The reseed rotates the cookie signing key.

| | Seen | Expected |
| --- | --- | --- |
| A signed-in tab after its session ends | Every API call answers `401 session-invalid: bad-signature`. The tab keeps the signed-in app shell with empty, failing regions | The sign-in form |
| The validators' login script | Cannot sign in, so each reseed needed a manual clear of `localStorage` | Signs in |

The same happens in production to any tab left open past its session's
expiry (inferred from the same code path).

## Causal chain

- The tab kept the signed-in shell while every call failed.
  - `RequireSession` granted the routes as long as the session probe's cached
    answer said `authenticated: true`.
    - The probe ran once per tab and never asked again. ← the faulty line,
      `useSessionProbe` in `acc12fc3b`

      ```ts
      /**
       * `useSessionProbe()` reuses the gated `/api/instruments` endpoint as
       * a session probe (the API does not yet expose `/api/auth/me`).
       * Caches forever (`staleTime: Infinity`) — the route guard only needs
       * to know "is the cookie valid right now?" at the moment of mount.
       */
      ```

      - An agent wrote the probe in `acc12fc3b` (2026-05-25, "migrate Login
        to TanStack Form + Query auth mutation"). The API exposed no session
        route, so it borrowed a gated endpoint and asked once.
        - **Machine:** the APIs carry no shared signal for an ended session.
          75 of the 79 `ApiError`s drop the body, and talos sends a French
          display message, `{ error: 'Connexion requise.' }`, where its code
          `session-required` exists only on the server
          (`apps/talos/api/src/helpers/errors/error-response.core.ts`). A
          client cannot tell an ended session from a refused request, so no
          one place could watch for it.
  - The failing calls after the probe did not end the session. Each of the
    roughly eighty places that read a response turned a failure into its own
    `ApiError`, and only the probe forgot the session marker on a 401.
    - **Machine**, the same condition. A 401 body carried no shared reason
      code, so none of those places could tell an ended session from a
      refused request.

## Root cause of occurrence

*Thought the route guard only needs to know the session is valid at the moment
of mount, actually a session can end at any moment after, and the server says
so on every later call.* **Machine:** with no session route and no shared
reason code in the 401 bodies, the only session signal the client had was the
one probe.

The faulty comment above is the source: "the route guard only needs to know
"is the cookie valid right now?" at the moment of mount". Not every 401 means
the session ended. A wrong current password, a failed passkey and a missing
audience ballot also answer 401.

## Detection failure causes

- **Tests:** the guard's tests covered a fresh probe answering 401. None
  covered a session that ends after the probe answered 200.
- **Local validation:** a session lasts longer than a development run, so it
  never expired while anyone watched.
- **QA:** the visual validators caught it, and logged it three times as
  friction with their tooling rather than as an application defect.

## Countermeasure

The pragma API client watches every answer. A 401 whose body says
`session-required` or `session-invalid` ends the session once, for the whole
application. The marker is forgotten and the probe's cached answer becomes
`authenticated: false`, so the guard sends the member to sign in.

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

Tests cover a session refused mid-tab, a wrong password left alone, a non-JSON
401 and a 500.

## Eradication

**Type:** structural impossibility (level 1), for pragma and talos.

**Reference:** [PR #181](https://github.com/hugoleborso/borso.fr/pull/181),
the commit adding this file.

In pragma the watch sits in the one client every call goes through,
`apps/pragma/site/src/lib/api.client.ts`, so a new query cannot forget it. The
rule that tells an ended session from a refused request lives in
`apps/pragma/site/src/lib/session-end.core.ts` and is mutation-tested. It
reads the body's `error` against `session-required` and `session-invalid`.

Talos had the same defect, and its 401 body carries no code. On talos a read
answers 401 only for a missing session, so talos ends the session on any 401
from a read, through the query cache's `onError`
(`apps/talos/site/src/lib/query-client.setup.ts`), with the rule in its own
`session-end.core.ts`. That is a heuristic. A new read that answers 401 for
another reason would sign the member out.

**Proposed:** give every app's API one session-ended error code, declared as a
type in each app's `domain/`, sent in the 401 body as `error`, and parsed once
in each site's client the way pragma's `isEndedSessionBody` does. Talos would
send `session-required` on the wire instead of its display message and drop
its "any 401 on a read" rule. A 401 for any other reason could then never be
read as an ended session, and a new app would get the watch from the shared
shape rather than from a sweep.

**Similar instances:** `grep -rn "staleTime: Number.POSITIVE_INFINITY" apps/*/site/src`
also finds forever-cached session reads in
`apps/borsouvertures/site/src/lib/queries/account.queries.ts` and
`apps/skull-king/site/src/lib/queries/account.queries.ts`, which the
entry's sweep did not name. Whether a refused read clears them was not checked here. The
class is not eradicated across apps. The session marker's origin is in
[mount-time-side-effects-implied-not-asserted](./mount-time-side-effects-implied-not-asserted.md).
