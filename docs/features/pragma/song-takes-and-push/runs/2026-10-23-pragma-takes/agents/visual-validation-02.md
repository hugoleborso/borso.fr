---
status: failed
summary: Visual validation FAIL with 1 failing row on d4a31ea9, 34 PASS, 10 UNVERIFIABLE. Live recording from Chromium's fake microphone on the practice page, the take first on its song page, upload with the file date and the nearest practice preselected, the 50 MiB and non-audio refusals, moment and free comments with the mark and the chip both seeking to 1:42, the offline queue with "pending upload" retried on the online event and on open, microphone denied, recording cut, storage full download, member deletion as "former member", and push enabling with four toggles saved, all pass at 1280 px. Failing row 06, at 375 px each take row truncates after the session name, so the duration and the member are hidden on a phone (span 194 px holding 255 px of text, no title). Unverifiable rows are push delivery and grouping (push service not reached, as the spec's test strategy says), iOS background sync, audio object deletion on song delete (the local S3 stand-in does not implement DeleteObjects), and real touch, because scripts/argent.sh looks for chrome-linux while the image ships chrome-linux64.
artifacts:
  - docs/features/pragma/song-takes-and-push/validation/visual-validation-2026-10-24-0015.md
  - docs/features/pragma/song-takes-and-push/validation/visual-validation-2026-10-24-0015/28-375-song-takes.png
  - docs/features/pragma/song-takes-and-push/validation/visual-validation-2026-10-24-0015/29-375-take-rows-truncated.png
---

The failure is a local layout fix in the take row: let the line wrap below `sm`, or put duration and member on a second line. No spec, plan, dependency or secret change is needed.

The 32 passing screenshots wait in `validation/.pending-upload/2026-10-24-0015/` for `/open-pr` to publish them.
