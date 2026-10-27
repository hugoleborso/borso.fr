---
status: done
summary: Visual validation PASS_EXCEPT_UNVERIFIABLE on a57a8a3e, 44 PASS, 0 FAIL, 2 UNVERIFIABLE. The previous FAIL row 06 is closed, because take rows now wrap at 375 px and show date, session, duration and member. Push was delivered for real through FCM to headless Chromium, so the take notification, two devices, setlist and session grouping, author exclusion, the toggle that turns comments off, and deleting a dead subscription are all observed. Audio and comment deletion on a song delete passes now that the local S3 stand-in resolves and deletes. Touch was driven with CDP touch events because scripts/argent.sh still fails. Unverifiable rows are 25 (iOS background sync needs iOS Safari) and 34 (headless Chromium cannot click a system notification).
artifacts:
  - docs/features/pragma/song-takes-and-push/validation/visual-validation-2026-10-24-0102.md
---

The 33 passing screenshots wait in `validation/.pending-upload/2026-10-24-0102/` for `/open-pr` to publish them. Before the pull request is merged, it must list rows 25 and 34 under the disclosure rule.
