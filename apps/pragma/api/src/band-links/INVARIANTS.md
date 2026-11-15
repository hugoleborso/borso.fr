# Invariants of pragma, in `api/src/band-links`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Band link

- A band link is `id`, `label`, `url` and `created_at`, shared by the
  whole band. Any signed-in member lists, adds and deletes them; a request
  with no session is refused.
- The addresses are typed in the app and live only in `band_link`. The
  repository is public, so no address is written in code, a fixture, a
  seed or a migration.
- `url` is an `https:` address (`isHttpsAddress` in
  `domain/band-link.core.ts`), so a row can never open `http:` or a
  `javascript:` script. The form and the API apply the same rule. A label
  is 1 to 80 characters and an address at most 2,048, both trimmed.
- The id is chosen by the device, so a retried create answers the row
  already written. The list is oldest first, so a new link lands last.
- Every row opens in a new tab with `rel="noopener noreferrer"`, and is
  deleted only after a confirmation.
- A write announces the `band-links` written root, so the other members'
  band tab reloads its list.

Held by: `api/src/band-links/band-links.controller.test.ts` › rejects every verb without a session cookie
Held by: `api/src/band-links/band-links.controller.test.ts` › lets any member add a link and lists the links oldest first
Held by: `api/src/band-links/band-links.controller.test.ts` › answers the same link when a create is retried with the same id
Held by: `api/src/band-links/band-links.controller.test.ts` › refuses an address that is not https and keeps nothing
Held by: `api/src/band-links/band-links.controller.test.ts` › deletes a link once, then answers that it is not found
Held by: `api/src/band-links/band-links.schema.test.ts` › refuses an http address, a blank label, an overlong label or address and an unknown field
Held by: `domain/band-link.core.test.ts` › refuses an http address, a script address and text that is not an address
Held by: `site/src/components/organisms/BandLinksSection.test.tsx` › opens each link in a new tab and names its host
Held by: `site/src/components/organisms/BandLinksSection.test.tsx` › refuses an address that is not https and sends nothing
Held by: `site/src/components/organisms/BandLinksSection.test.tsx` › deletes a link only once the member confirms
Held by: `api/src/realtime/stale-scope-coverage.test.ts` › lists as written exactly the roots some announced write touches
