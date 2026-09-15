# Spotify credentials for pragma

pragma resolves a song's Spotify track once, from the ISRC Deezer returned, and
stores the id. The call needs a Spotify client id and secret. This page is how
they are created and where they go. The decision behind the shape is
[ADR-0017](../adr/0017-spotify-track-ids-resolved-by-isrc-at-link-time.md).

## The credential does nothing until it is seeded, and says nothing when it is missing

A stage with no parameter resolves no Spotify ids. Songs still save, the listen
dialog still opens, and the Spotify entry silently falls back to a search
address. That is the same thing a member sees for a song Spotify genuinely does
not carry, so **nothing in the interface distinguishes "not configured" from
"not found"**. Seed the parameter before concluding that a song has no Spotify
track.

## 1. Create the Spotify application

1. Sign in at <https://developer.spotify.com/dashboard> with the band's account.
2. *Create app*. The name and description are free text. The redirect URI is
   required by the form but never used: this application speaks the
   client-credentials flow, which has no user to redirect, so any valid URL
   (`https://pragma.borso.fr`) is fine.
3. In the app's settings, copy the **Client ID** and reveal the **Client
   secret**.

The client-credentials flow reaches the search endpoint and nothing that
belongs to a person, which is all this feature needs.

## 2. Write the parameter

One parameter holds both halves, `<client id>:<client secret>`, because the
client id is not itself a secret and splitting them into two parameters would
double the reads for no gain. The adapter splits on the **first** colon, so a
secret containing a colon survives.

```bash
aws ssm put-parameter \
  --name /pragma/spotify-credentials \
  --type SecureString \
  --value "<client-id>:<client-secret>" \
  --region eu-west-3 \
  --overwrite
```

The name is not per-stage: every stage of pragma reads
`/pragma/spotify-credentials`, because the Spotify application is one
application and a preview asking about an ISRC is the same question production
asks. Writing the parameter once therefore covers prod and every preview.

The parameter name the Lambda looks for arrives as the
`SPOTIFY_CREDENTIALS_PARAMETER` environment variable, set by
`apps/pragma/cdk/lib/stack.ts`. The value never enters the CloudFormation
template; only the name does.

## 3. Rotating

`put-parameter --overwrite` with the new value, and nothing else. No deploy, no
CDK change. A warm Lambda keeps the old credential until it is recycled, so a
rotation takes effect within minutes rather than instantly — which is fine for a
credential that only reads a public search endpoint.

## Running it locally

`SPOTIFY_CREDENTIALS` short-circuits the parameter read, so a developer never
needs AWS credentials to work on this:

```bash
SPOTIFY_CREDENTIALS="<client-id>:<client-secret>" pnpm dev
```

The inline variable wins over the parameter when both are set. With neither, the
resolution returns null and every song keeps the search address, which is a
perfectly workable state for front-end work.

## What to expect of the coverage

Deezer and Spotify do not carry identical catalogues. A song whose ISRC Spotify
never ingested resolves to nothing and keeps its search address forever, or
until someone re-links it after Spotify's catalogue changes. This is ordinary,
not a fault, and there is no backfill to run: re-picking the song from the
Deezer search re-resolves it.
