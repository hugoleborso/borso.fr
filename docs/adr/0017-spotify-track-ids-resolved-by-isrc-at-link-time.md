# ADR-0017: Spotify track ids resolved by ISRC at link time, with the credential in SSM

- **Status:** proposed
- **Date:** 2026-09-15
- **Deciders:** Hugo
- **Tags:** pragma, songs, data, secrets

## Context

Holding a song in pragma opens a dialog offering to play it on Deezer or on
Spotify. The Deezer entry opens the exact track, because the catalogue stores a
`deezer_track_id`. The Spotify entry opens a search for the artist and title,
because nothing in the catalogue names a Spotify track and the Spotify Web API
answers no request without a credential. A search address lands on the right
song most of the time and on a tribute act the rest of the time, which is the
gap this decision closes.

Two forces push on it. The first is that Spotify will not hand out a track id
anonymously: every call needs an OAuth token minted from a client id and a
client secret, so this application acquires its first third-party credential and
has to keep it somewhere the browser cannot read. The second is that a song's
identity on Spotify never changes once found, so whatever we pay to find it is
paid once, not on every screen that draws a song.

One constraint closes a door before the trade-off starts: the secret can never
reach the front end. That rules out resolving anything in the browser and makes
this an API-side concern whatever else is decided.

A property of the existing data makes the matching question unusually easy.
Deezer's search returns an ISRC per track, the recording industry's own
identifier for a recording, and pragma already stores it in `song.isrcs`.
Spotify's search accepts an `isrc:` filter. The two catalogues can therefore be
joined on a shared identifier rather than on fuzzy text, which removes the
question of how to score a title match and is the reason the cheapest option is
also the most accurate one.

## Decision

**Resolve the Spotify track once, by ISRC, when a song is linked, and read the
credential from SSM Parameter Store.** A song that gains a Deezer track also
gains a `spotify_track_id`, found by asking Spotify for the ISRC Deezer already
gave us; the listen dialog then builds an exact address from stored data with no
network call of its own. The client id and secret live in an SSM
`SecureString` the Lambda reads at cold start, which ADR-0004 already priced at
zero dollars a month and which keeps the value out of the CloudFormation
template that a Lambda environment variable would publish in plaintext.

## Consequences

- `+` The Spotify entry opens the recording the band actually plays, matched on
  the industry identifier for that recording rather than on a title string, so a
  tribute act cannot be mistaken for the original.
- `+` The listen dialog stays instant and works offline: it reads two stored ids
  and builds two addresses, which is what the service worker's offline case
  needs.
- `+` One Spotify call per song ever, so the rate limit is never a consideration
  and the search box keeps costing exactly one Deezer call per debounce.
- `-` **A song whose ISRC Spotify does not carry keeps a search address.**
  Deezer and Spotify do not hold identical catalogues, and a track present on
  one by an ISRC the other never ingested resolves to nothing. The dialog still
  works, so this degrades rather than fails, but "exact Spotify link" is now a
  property most songs have rather than one every song has.
- `-` **The credential is one more thing that can be wrong at deploy time, and
  it is wrong silently.** An absent or mistyped parameter surfaces as songs that
  never gain a Spotify id, not as an error anyone sees, because a failed
  resolution is indistinguishable from a song Spotify does not carry. The
  parameter has to be seeded per stage before the feature does anything.
  Silence here is a property the adapter has to *implement*, not one it gets:
  `GetParameter` throws `ParameterNotFound` on a parameter that was never
  seeded, so `resolveSpotifyTrackId` catches everything and answers no id. The
  first implementation did not, and the unseeded parameter answered 500 on every
  song creation — the failure this consequence describes arrived as the loudest
  one in the application.
- `-` A stored id can go stale. Spotify re-issues track ids when a label
  re-delivers an album, and a stored id then points at a dead page until someone
  re-links the song. Resolving on demand would never be stale.
- `~` pragma acquires its first outbound credential, so the API gains an IAM
  permission it did not have (`ssm:GetParameter` plus the KMS decrypt) and the
  local development story gains an environment variable that stands in for it.
- `~` The token itself is short-lived and cached in module state for the warm
  Lambda, which is the same shape `deezer.adapter.ts` already uses for its
  search cache, so the pattern is not new to the codebase.

## Alternatives considered

### Option A — Resolve once by ISRC at link time, credential in SSM (chosen)

- **Summary:** When a song is linked to Deezer, the API asks Spotify for the
  ISRC that Deezer returned and stores the resulting track id beside the Deezer
  one. The listen dialog reads both from the song row. The client credentials
  live in an SSM `SecureString` parameter, read at Lambda cold start and cached
  in module state along with the OAuth token.
- **Strengths:**
  - Exactness: an ISRC names one recording, so the match needs no scoring and
    cannot silently pick a cover (criterion 1).
  - Cost at read: the dialog performs zero network calls, so it is instant and
    survives the offline case the service worker exists for (criterion 2).
  - Credential exposure: the value never enters the synthesized template, and
    rotation is one `aws ssm put-parameter` with no deploy (criterion 3).
  - Spend: one call per song for its whole life, against a Spotify rate limit
    that is then never a design input (criterion 4).
- **Costs:**
  - One migration and one new nullable column, `spotify_track_id`.
  - A stored id outlives a Spotify re-issue, so a song can point at a dead page
    until someone re-links it.
  - Songs whose ISRC Spotify does not carry keep the search address, so coverage
    is high rather than total.
- **Rationale:** It wins on every criterion that carries weight. The decisive
  one is exactness: the whole point of adding a credential is to stop sending
  people to a search page, and ISRC is the only matching strategy here that is
  exact by construction rather than by heuristic. That it is also the cheapest
  at read time and the cheapest in API spend is what makes the choice
  uncontroversial rather than a trade.

### Option B — Resolve on every song search, alongside Deezer (rejected)

- **Summary:** The `/api/songs/search` handler calls Deezer and Spotify
  together and returns hits carrying both ids, so picking a result links the
  song to both services at once with nothing stored beyond what the pick
  already writes.
- **Strengths:**
  - No new resolution step and no second place where a song can be
    half-linked — a picked hit is complete by construction.
  - No stale id, because nothing is stored ahead of the pick.
- **Costs:**
  - A Spotify round trip on every debounced keystroke, which roughly doubles
    the search latency the user waits on.
  - Spends rate limit on the twenty-four hits nobody picks, for every search
    anybody runs.
  - Needs a matching strategy per hit, since the search is by text and the
    ISRC is only known after Deezer answers.
- **Rejection rationale:** Loses decisively on spend and on cost-at-read: it
  pays for twenty-five resolutions to use one, on every search, forever. Shifting
  the weights does not flip it — even if API spend were free, the added latency
  lands on the one interaction in the feature that is already the slowest, and
  the accuracy it buys is no better than Option A's.

### Option C — Resolve on demand when the dialog opens (rejected)

- **Summary:** Nothing is stored. Each time a member holds a song, the API
  resolves the Spotify track for that song and the dialog renders when the
  answer arrives.
- **Strengths:**
  - No migration, no new column, and no stored id that can go stale.
  - Resolution always reflects Spotify's catalogue as it is today.
- **Costs:**
  - Every long press waits on a network call before the dialog can be complete.
  - The dialog cannot open offline, which is precisely the rehearsal-in-a-
    basement case pragma's service worker is built for.
  - Repeats the same call for the same song indefinitely.
- **Rejection rationale:** Loses on cost-at-read, which is weighted high because
  the gesture is the feature. Its one genuine advantage over Option A, never
  serving a stale id, is worth less than an instant offline dialog for a
  catalogue of a few dozen songs that a member can re-link by hand.

### Option D — Credential as a Lambda environment variable from a CI secret (rejected)

- **Summary:** A GitHub Actions secret is passed through CDK into the API
  Lambda's environment, alongside `UPLOADS_BUCKET` and `WEBAUTHN_ORIGIN`.
- **Strengths:**
  - Zero new runtime code: no SDK call, no cold-start read, no IAM grant.
  - The same mechanism every other piece of API configuration already uses.
- **Costs:**
  - CDK writes environment variables as plaintext into the deployed
    CloudFormation template, so the secret is readable by anyone who can call
    `cloudformation get-template` or open the console.
  - Rotation requires a redeploy rather than a parameter write.
- **Rejection rationale:** Loses on credential exposure, the criterion that
  exists because this is the repository's first third-party secret. The repo
  already reads deployed templates as a routine debugging move — CLAUDE.md
  directs sessions to `aws cloudformation get-template` for trust policies — so
  a plaintext secret there is not a theoretical exposure but one on a path
  people already walk.

### Option E — Credential in the application database, as ADR-0004 chose (rejected)

- **Summary:** A row beside the admin credentials, read by the API through the
  connection it already holds, following the repository's strongest precedent
  for storing a secret.
- **Strengths:**
  - One storage backend, which is exactly the argument ADR-0004 made.
  - Rotation could become an in-app endpoint, as it did for the password.
- **Costs:**
  - Needs seeding in every stage individually, and preview schemas clone
    production with the credential tables blocklisted, so each preview starts
    without it.
  - Puts a machine credential in a table whose other rows are user credentials,
    blurring what the table is for.
- **Rejection rationale:** The precedent does not transfer. ADR-0004 chose the
  database because rotation-as-an-endpoint mattered for a password five humans
  share and change when a phone is lost. A Spotify client secret is rotated on
  Spotify's dashboard, roughly never, by one person — so the benefit that
  justified the precedent is absent, and only its cost, per-stage seeding, is
  left.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Match exactness | high | The only reason to add a credential is to stop opening a search page; a fuzzy match would re-introduce the tribute-act problem the feature exists to fix. |
| Cost at read (latency and offline) | high | The long press is the feature, and pragma ships a service worker precisely because it is used in basements with no signal. |
| Credential exposure | high | This is the repository's first third-party secret, and CLAUDE.md already sends sessions to read deployed templates, so where the value lands is a path people walk. |
| API spend and rate limit | medium | A five-person band is far from any published limit, so this bounds the design rather than driving it. |
| Operational steps to add a stage | low | Stages are created rarely and by one person, so a seeding step is an annoyance rather than a cost. |

|  | A — ISRC at link time + SSM | B — every search | C — on demand | D — env var | E — database row |
|---|---|---|---|---|---|
| Match exactness | ✓ ISRC names one recording | ✓ also exact once picked | ✓ also exact | — not a matching option | — not a matching option |
| Cost at read | ✓ zero calls, works offline | ✗ doubles every search | ✗ a call per long press, no offline | — not a matching option | — not a matching option |
| Credential exposure | ✓ never enters the template | ✓ same store applies | ✓ same store applies | ✗ plaintext in the deployed template | ✓ not in the template |
| API spend | ✓ one call per song, ever | ✗ 25 resolutions per search to use one | ✗ repeats for the same song forever | — not a storage concern | — not a storage concern |
| Steps to add a stage | ✓ one parameter write | ✓ one parameter write | ✓ one parameter write | ✓ one CI secret | ✗ a seed per stage, and previews blocklist the table |

## Implementation pointers

- Spec: none — this arrived as a direct request during the Deezer migration.
- Plan: none; the change is one column, one adapter and one resolution call.
- Commit: {{SHA — stamped by /after-task-dantotsus on merge}}
- Files: `apps/pragma/api/src/songs/spotify.adapter.ts` (token mint plus ISRC
  lookup), `apps/pragma/api/src/songs/spotify.core.ts` (parsing the response),
  `apps/pragma/api/src/songs/songs.schema.ts` (the `spotify_track_id` column),
  `apps/pragma/site/src/lib/listen-links.utils.ts` (the address the dialog
  builds).
- Related ADRs: ADR-0004 priced SSM Parameter Store and Secrets Manager for this
  repository and chose the database for the shared password; this ADR reaches
  the opposite conclusion for a machine credential and explains why the
  precedent does not transfer. ADR-0012 puts every outbound call in an
  `.adapter.ts`, which is where the Spotify calls land.
