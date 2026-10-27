---
status: done
summary: Slice 3 takes-site shipped. The song page has a Takes section (Record, Upload, list newest first by recordedAt with session, length, author or former member, comment count, and the takes waiting on this device as pending or failed with Retry), and `?take=` opens a player with moment marks, one thread in time order, an "At m:ss" toggle on while paused past zero, and comment and take deletion. A practice page lists the songs of its setlists, each with a microphone. Every take, live or uploaded, goes through an IndexedDB queue that signs, puts and creates it, drains on start, on enqueue and on `online`, retries passing failures, holds on 401 or spent attempts, and keeps refused takes as failed. Denied, unsupported, interrupted, quota-exceeded and unplayable recordings each say so; the last three offer a download. Cores, utils and adapters at 100% coverage and 100% scoped mutation; core 2444/2444, back-e2e 259/259, typecheck, eslint, prettier, knip, architecture and blueprint checks clean.
artifacts:
  - apps/pragma/site/src/lib/take-queue.core.ts
  - apps/pragma/site/src/lib/take-queue.adapter.ts
  - apps/pragma/site/src/lib/take-queue.store.ts
  - apps/pragma/site/src/lib/take-queue.setup.ts
  - apps/pragma/site/src/lib/recorder.core.ts
  - apps/pragma/site/src/lib/recorder.adapter.ts
  - apps/pragma/site/src/lib/second-clock.store.ts
  - apps/pragma/site/src/lib/object-upload.adapter.ts
  - apps/pragma/site/src/lib/queries/takes.queries.ts
  - apps/pragma/site/src/lib/queries/takes.utils.ts
  - apps/pragma/site/src/components/organisms/RecordingSheet.tsx
  - apps/pragma/site/src/components/organisms/TakeList.tsx
  - apps/pragma/site/src/components/organisms/TakePlayer.tsx
  - apps/pragma/site/src/components/organisms/TakeUploadForm.tsx
  - apps/pragma/site/src/components/organisms/SongTakes.tsx
  - apps/pragma/site/src/components/organisms/PracticeRecordingList.tsx
  - apps/pragma/site/src/components/organisms/recording-sheet.core.ts
  - apps/pragma/site/src/components/organisms/take-list.core.ts
  - apps/pragma/site/src/components/organisms/take-player.core.ts
  - apps/pragma/site/src/components/organisms/take-upload-form.core.ts
  - apps/pragma/site/src/components/atoms/Icon.tsx
  - apps/pragma/site/src/routes/catalog/SongDetailPage.tsx
  - apps/pragma/site/src/routes/catalog/take-selection.hook.ts
  - apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx
  - apps/pragma/site/src/observability/error-reporting.adapter.ts
  - apps/pragma/site/src/main.tsx
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - scripts/architecture/manifests/pragma.manifest.ts
  - scripts/browser.sh
next:
  kind: validate
---

Choices made where the plan was silent or did not match the tree:

- There is no `useCreateTake` hook. Creation runs outside React, in the queue store, because a take recorded offline is created on a later visit with no component mounted. The store's `onCreated` calls `writeCreatedTake`, which settles the song list from the create response (`query-settled-from-the-write-response`), never from a refetch.
- An upload goes through the same queue as a live take, so both share one sign, put, create path and one retry policy. `source` and `queued` are sent as slice 1 asked; `queued` is true when the take was made offline or needed a retry.
- The plan's `take-queue.store.ts` is a factory (`createTakeQueue`) tested with a memory storage and a fake transport; `take-queue.setup.ts` builds the application instance and `main.tsx` starts it.
- The recorder session logic lives in `recorder.core.ts`, because the purity lint reads it as pure. `recorder.adapter.ts` keeps the browser objects.
- `useTakePlaybackUrl` reuses `useSignedChartUrl`, so takes and charts share one `sign-get` path and one cache policy, as the plan asked.
- Two organisms the plan did not list: `SongTakes` (the section on the song page, holding the open upload form) and `PracticeRecordingList` (the songs of a practice's setlists, one `useSetlistEntries` per setlist). The session page's setlist summaries carry no entries, so the microphone could not sit on the existing rows.
- The sheet starts recording from the button's click handler, not from an effect, so iOS sees a user gesture. "Upload instead" opens the upload form with the practice preselected.
- `TakeQueueWriteFailed` is reported for both a refused write and a full device; `TakeUploadFailed` for a refusal and for a take held after its attempts, tagged with stage and status; `take_upload_retried` and `RecordingInterrupted` are breadcrumbs.
- `jsx-a11y/media-has-caption` is excused on the one `<audio>`, with its reason on the line: a rehearsal recording has no transcript.

Self-check in the dev server at 375 px: the Takes section renders under the chord chart, and an uploaded WAV fixture appears as "pending upload" at once. The local API has no `UPLOADS_BUCKET`, so the sign step answers 500 and the take stays queued. That is the designed behaviour, but the whole upload could not be proven locally. The seed has no practice session, so the practice page's microphone list was not seen in a browser. Both belong to the visual validation on the preview.

`scripts/browser.sh` exited 2 without a message on this image: its Chromium lookup only knew `chrome-linux/`. Fixed in its own commit.

Integration: as in slice 2, the worktree was cut from `main` and slices 1 and 2 were only on `worktree-wf_035cd72e-a86-3`, so this round was built on that branch's tip (`da2e0143`). The harness refuses `git -C /home/user/borso.fr …` from an isolated worktree, so the fast-forward of `claude/pragma-takes-and-push` is left to the orchestrator; it carries slices 1, 2 and 3.
