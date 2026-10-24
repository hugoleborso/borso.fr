# Standards review — claude/pragma-takes-and-push against origin/main

Verdict: PASS
Ledger: 3843abb31417
Reviewed: 7 file(s). Sealed: 7. Findings: 0.

Scope: the seven files `scripts/standards/seal.ts verify` reported `edited-since-it-was-reviewed` at HEAD `acf846f0`, which are the five commits after `9983164c`: `04fec6ad` (refusal beside Save), `1d64334e` (song write retry), `cc0516c4` (notification upsert retry), `acf846f0` (empty-take refusal and queue failure), `69c70f52` (spec sketch, no sealable file). Each file was read in full. After sealing, `seal.ts verify` reports all 115 changed files carry a current seal.

## Findings

None.

## Sealed

- apps/pragma/api/src/notifications/notifications.repository.ts — `saveSubscription` and `savePreference` now go through `retryingConflictAborts`. Each retried write is one `INSERT … ON CONFLICT DO UPDATE` statement, so a retry repeats an idempotent single write. Both functions still return nothing derived.
- apps/pragma/api/src/songs/songs.repository.ts — `insertSong` and `updateSong` retry one statement each. The `rowToSong` decoding stays the `repository-json-column` boundary. `deleteSongWithCascade` was not changed by these commits, and round 2 accepted its repository-owned transaction under `11-database.md` *Transactions*.
- apps/pragma/site/src/components/organisms/SongEditForm.tsx — the refusal `<p role="alert">` and `DeezerTrackTakenNotice` moved into `StickyFormActions`, above Save, in a `flex flex-col items-start gap-2 w-full` wrapper. The layout is mobile-first and sets no fixed width. I read the markup but did not measure it in a browser at 375 px. No new explanatory label.
- apps/pragma/site/src/components/organisms/recording-sheet.core.ts — the new `empty` reason maps to `takes.recording.empty`. The key path names the screen and the element. `download` is `null` for the empty case, and `RecordingSheet.tsx:184` already renders nothing when it is `null`.
- apps/pragma/site/src/lib/take-queue.core.ts — `hasRecordedAudio` is a boolean `has…`. `buildQueuedTake` returns `QueuedTake | TakeDraftRefusal`, which keeps the verb's promise in the same way the earlier `| null` did, and it now says why. `EMPTY_AUDIO_FAILURE` names the `'queue'` stage.
- apps/pragma/site/src/lib/take-queue.setup.ts — `queueTake` returns the refusal unchanged.
- apps/pragma/site/src/lib/take-queue.store.ts — `send` fails a stored zero-byte entry at stage `queue` through the existing `stopSending`, so it is reported and persisted as failed instead of being uploaded.

## Unclear

None.

## Outside the checklist

- `en.json` `takes.recording.empty` says "before the recording was cut". The `empty` reason also fires when someone taps Stop before any chunk arrives, where nothing was cut. A more neutral wording would be "Nothing was recorded, so no take was saved." The French string has the same problem.
- In `take-queue.setup.ts:64`, the local `take` holds either a take or a refusal. A name like `queuedTakeOrRefusal` would match what the `typeof take === 'string'` branch reads.
