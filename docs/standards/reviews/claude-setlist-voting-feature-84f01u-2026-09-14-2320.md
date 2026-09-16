# Standards review — claude/setlist-voting-feature-84f01u against origin/main

Verdict: FINDINGS
Ledger: c43dff041051
Reviewed: 19 file(s). Sealed: 18. Findings: 1.

## Findings

### apps/pragma/site/src/lib/queries/me.queries.ts:81

Bullet: `reviewer` checks that a mutation whose full result the client already holds reconciles from the response rather than refetching, because an immediate read after a write can be served a pre-commit snapshot.

```ts
export function useRemovePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { passkeyId: string }) => {
      const response = await api.api.me.passkeys[':passkeyId'].$delete({
        param: { passkeyId: variables.passkeyId },
      });
      await throwOnFailure(response, 'passkey-remove');
      return variables.passkeyId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meKeys.passkeys() });
    },
  });
}
```

A delete is fully determined by the request — `docs/standards/06-data-fetching.md` names it
explicitly: *"A status change, a delete and a reorder are all fully determined by the request, so
they are optimistic and a spinner on one of them is a defect rather than a style."* The client
already holds `meKeys.passkeys()` and knows exactly which entry leaves it, so the `invalidateQueries`
is a `GET` immediately after a write that a different Lambda on a different DSQL connection can serve
from the pre-commit snapshot, putting the removed passkey back in the list.

Satisfying it: make this `query-optimistic-mutation` — `onMutate` cancels `meKeys.passkeys()`,
snapshots it, writes the list without `variables.passkeyId`, `onError` restores the snapshot, and
nothing invalidates. `useScoreSong` in `voting.queries.ts` is the shape to copy.

Introduced: by this branch — `me.queries.ts` is added by it (`git diff --diff-filter=A`).
Fix size: one file, no callers. `AccountPage.tsx` calls `removePasskey.mutate({ passkeyId })` and is unaffected.

## Sealed

- apps/pragma/api/src/auth/credentials.repository.ts — returns rows and counts only; `CredentialRow`/`PasskeyRow` derive from `$inferSelect`; `find…` return `null`, `deleteCredentialsForMember` takes the caller's executor so the two-table delete joins the service's transaction.
- apps/pragma/api/src/me/me.controller.ts — dispatcher only, no derivation; `readNow()` keeps `new Date()` out of the service arguments' call sites.
- apps/pragma/api/src/songs/songs.repository.ts — `rowToSong` decodes text-encoded JSON columns through Zod rather than a projection, which is the `repository-json-column` blueprint, not a repository deriving a shape; `deleteSongWithCascade` wraps the four writes DSQL will not cascade in one transaction and writes the cascade out explicitly.
- apps/pragma/cdk/lib/stack.ts — matches its own `app-cdk-stack` blueprint; magic numbers named.
- apps/pragma/site/src/components/organisms/EnrolForm.tsx — `useForm`, no `useState` chain.
- apps/pragma/site/src/components/organisms/PasskeyList.tsx — the single `useState` is one label input, not a form; see *Outside the checklist*.
- apps/pragma/site/src/components/organisms/PasswordChangeForm.tsx — `useForm`.
- apps/pragma/site/src/components/organisms/SignInForm.tsx — `useForm` with the shared Zod schema as its validator.
- apps/pragma/site/src/components/organisms/sign-in-form.core.ts — pure, no `new Date()`; `buildSignInPayload` returns what its verb says.
- apps/pragma/site/src/lib/passkey.adapter.ts — untrusted options are parsed with Zod inside a real type guard, not annotated into shape.
- apps/pragma/site/src/lib/queries/auth.queries.ts — the three mutations settle with `setQueryData`; nothing refetches.
- apps/pragma/site/src/lib/queries/voting.queries.ts — `useScoreSong` reconciles the budget from the mutation response and never invalidates; `useCloseVote` and `useSetVoteStatus` genuinely cannot name the result (the server picks the stored `targetSongCount` when the request sends `null`, and closing writes setlist entries the client never saw), so their invalidation is the pessimistic shape the standard allows.
- apps/pragma/site/src/lib/queries/voting.utils.ts — `readMemberPoints` / `applyScoreToBoard` say what they return; both Stryker disables state a checkable claim about their own line.
- apps/pragma/site/src/routes/EnrolPage.tsx — composes `EnrolForm`, no effects.
- apps/pragma/site/src/routes/LoginPage.tsx — composes `SignInForm`; error text goes through `t()`.
- apps/pragma/site/src/routes/account/AccountPage.tsx — composes organisms, holds only the two message strings.
- apps/pragma/site/src/routes/setlists/SetlistVotePage.tsx — composes organisms and molecules; every derived value is computed during render, no `useEffect` anywhere in the file.
- apps/pragma/site/src/routes/setlists/setlist-vote.core.ts — pure, no `new Date()`; `select…`, `index…`, `project…` each return what their verb names.

## Unclear

None.

## Outside the checklist

- `PasskeyList.tsx:23` holds `deviceLabel` in `useState` rather than `useForm`. The `useForm` bullet says *"a chain of `useState`"*, and one field is not a chain, so this is not a finding — but the component does own a submit button and a `.trim()` validity rule, which is the shape `useForm` exists for.
- The 375-pixel bullet was judged from the markup (`flex-col` defaults, `w-full max-w-[…]`, `min-h-11` targets) rather than from a browser run, since commit `a1fe65d` already carries the visual validation pass. If the operator wants the bullet honoured to the letter, `scripts/browser.sh` at 375 px over `/login`, `/enrol`, `/account` and the vote page is what is missing.
