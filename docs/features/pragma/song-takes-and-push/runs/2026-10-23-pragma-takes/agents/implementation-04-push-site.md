---
status: done
summary: Slice 4 push-site shipped. The account page has a Notifications section with "Enable on this device" (permission, subscribe with the stage's VAPID key, save the subscription), four category toggles that flip at once and settle from the PUT response with no refetch, an install hint on an iPhone outside the home screen, and messages for a blocked permission, a browser without push and a stage without VAPID keys (503). The service worker renders each push in English or French from the message key and parameters the API sends, writes session dates in the band time zone, groups by tag, and focuses or opens the payload URL on tap. Cores, utils and the adapter at 100% coverage and 100% scoped mutation; core 2505/2505, back-e2e 259/259, typecheck, eslint, prettier, knip, architecture and blueprint checks clean.
artifacts:
  - apps/pragma/site/src/lib/vapid-key.utils.ts
  - apps/pragma/site/src/lib/push-subscription.adapter.ts
  - apps/pragma/site/src/components/organisms/notifications-offer.core.ts
  - apps/pragma/site/src/lib/queries/notifications.queries.ts
  - apps/pragma/site/src/lib/queries/notifications.utils.ts
  - apps/pragma/site/src/components/organisms/NotificationSettings.tsx
  - apps/pragma/site/src/routes/account/AccountPage.tsx
  - apps/pragma/site/public/sw.js
  - apps/pragma/site/src/sw/service-worker.test-utils.ts
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - apps/pragma/site/src/i18n/i18n-parity.core.test.ts
  - scripts/architecture/manifests/pragma.manifest.ts
next:
  kind: validate
---

Choices made where the plan was silent:

- No "turn off on this device" action. The spec lists the Enable button and four toggles only, so the slice adds nothing else. Turning every toggle off has the same effect for the member.
- The toggles show on every device, including one that cannot receive push, because a preference belongs to the member and not to the device.
- The iOS install hint takes precedence over "unsupported": Safari outside the home screen has no `PushManager`, and the useful thing to say there is how to install.
- The category labels live in the organism as a `Record<NotificationCategory, ParseKeys>`, with the category type read from the preferences response type. Nothing from `api/src` is copied into the site.
- The service worker formats the session date with the device locale (24-hour on `en-GB`, 12-hour on `en-US`) and the band time zone, and falls back to "Someone" / "Quelqu’un" when the payload carries no actor name (a former member).
- `notifications.title` joins the parity test's identical-by-design list: the word is the same in French.

Self-check in the dev server at 375 px and 1280 px: the section renders between Calendar and Change password, a toggle turned off survives a reload, and Enable answers "Notifications are not set up on this server yet." because the dev API has no VAPID parameters. A real subscription needs a deployed stage with the four SSM parameters and a registered service worker (the dev build skips its registration), so that belongs to visual validation on the preview and to the iPhone smoke after deploy.

Integration: the main checkout's branch was still at the plan commit, because the three earlier rounds could not fast-forward it from their worktrees. This round was built on `worktree-wf_035cd72e-a86-4` (`0c1271a3`), which carries slices 1 to 3.
