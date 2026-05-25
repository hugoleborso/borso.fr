# GetSongBPM integration — tonality + BPM enrichment

Secondary lookup source for the `pragma` song catalog. MusicBrainz
ships album / duration / tags / isrcs (round 15) but only carries
key on `work` entities — near-zero pop/rock coverage. GetSongBPM is
the canonical free source for tonality + tempo on a given song.

## Signup + attribution

- Signup: <https://getsongbpm.com/api>. They ask for name, email, and
  the consuming project's URL. Free tier; the key is a long opaque
  string.
- **Mandatory attribution.** The terms require a visible
  "Key / BPM via GetSongBPM" link on any UI surface that displays the
  enriched fields. The link points at <https://getsongbpm.com>. The
  `pragma` UI renders this in the read-only `SongMusicBrainzPanel`
  footer (see `apps/pragma/site/src/routes/catalog/SongMusicBrainzPanel.tsx`).
- Rate limit: 1 request/second per API key, enforced in our service
  layer (`enrichFromGetSongBpm` in
  `apps/pragma/api/src/songs/songs.service.ts`).

## Where the key goes

The key is a single environment variable, `GETSONGBPM_API_KEY`, read
once at Lambda cold start.

- **GitHub repo secret.** Add the value under
  `Settings → Secrets and variables → Actions → New repository secret`,
  name `GETSONGBPM_API_KEY`. Both deploy workflows
  (`.github/workflows/preview.yml`, `.github/workflows/deploy.yml`)
  forward `secrets.GETSONGBPM_API_KEY` into the deploy job's env so
  the CDK app sees it at synth time. Don't echo the secret in `run:`
  blocks.
- **CDK synth.** `apps/pragma/cdk/lib/stack.ts` reads
  `process.env.GETSONGBPM_API_KEY` at synth and injects it into the
  `PreviewableApp.api.environment` map. When the var is empty (no
  secret configured, or the deploy ran outside CI), the Lambda
  receives `GETSONGBPM_API_KEY=""`.
- **Lambda.** `enrichFromGetSongBpm` reads `process.env.GETSONGBPM_API_KEY`.
  Empty string or absent → graceful no-op (returns `null`, never
  throws). The search endpoint still returns MusicBrainz hits, with
  `tonality: null` and `bpm: null` on each row.

## Verify it's working

After rotating the secret + redeploying preview / prod:

```bash
# Lambda env check (read-only IAM is fine):
aws lambda get-function-configuration \
  --function-name pragma-prod-Api-Fn... \
  --region eu-west-3 \
  | jq '.Environment.Variables.GETSONGBPM_API_KEY != ""'
# true == key is wired
```

Then exercise the search endpoint:

```bash
curl -s "https://<pragma-host>/api/songs/search?q=get+lucky" \
  -H "cookie: pragma_session=..." \
  | jq '.hits[0] | {tonality, bpm}'
# expected: { "tonality": "F#m", "bpm": 116 }
```

## Symptom → fix recipe

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `tonality` / `bpm` always `null` on every search hit | `GETSONGBPM_API_KEY` is empty in the Lambda env | Set the GitHub repo secret + push (or redeploy preview from the PR sidebar). |
| Search latency jumps by ~1s | The 1 req/sec rate floor is firing on a cold cache. Expected on the first hit per `(artist, title)` pair. | Subsequent calls within 60s hit the in-process cache. |
| Search returns `tonality: ""` | Upstream returned a key string we didn't recognise as canonical short-form. | Add a mapping entry to `LONG_FORM_QUALITY` in `getsongbpm.core.ts` and a sibling test case. |

## Why a second source?

Spotify's Audio Features API (would have given key + tempo +
danceability) is closed to new apps since 2024-11-27. The audit (round
15) flagged that as a dead-end. GetSongBPM is the next-best free
option with a programmatic surface. ACRCloud, Musixmatch, and others
are paid-only at any meaningful query volume.
