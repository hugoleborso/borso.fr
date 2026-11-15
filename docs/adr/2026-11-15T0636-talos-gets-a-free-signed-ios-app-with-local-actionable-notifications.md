# ADR-2026-11-15T0636: Talos gets a free-signed iOS app that posts its own actionable notifications

- **Status:** proposed
- **Date:** 2026-11-15
- **Deciders:** the operator
- **Tags:** talos, ios, notifications, cost

## Summary

**Proposed decision.** A small SwiftUI app, signed with Xcode's free personal team, fetches pending proposals from the Talos API and posts them as local notifications with one button per choice. A button decides without opening any app. No Apple Developer Program, so borso.fr stays free. The PWA stays the main app.

| Option | Gestures per decision | Yearly cost | Build and upkeep | Build chain | What else it unlocks |
|---|---|---|---|---|---|
| 1. Status quo, the PWA | 🔴 2 taps, plus the PWA loading | 🟢 0 | 🟢 the multi-choice model only | 🟢 nothing new | 🔴 nothing |
| 2a. Paid licence, SwiftUI, APNs | 🟢 long press then tap, no app opens | 🔴 99 USD | 🟡 a small Swift app, APNs in the API | 🟡 macOS: local Mac or GitHub runner | 🟢 widgets, Live Activities, Siri, HealthKit, Contacts |
| 2b. Paid licence, Capacitor or Expo shell | 🟢 same as 2a | 🔴 99 USD | 🔴 a shell, plus Swift for the background action | 🟡 macOS, plus the JavaScript chain | 🟢 same as 2a |
| 3. Telegram bot or Slack DM | 🟡 2 taps, no PWA load (inferred) | 🟢 0 | 🟡 a bot, a webhook, an identity link | 🟢 nothing new | 🔴 nothing |
| 4. Free-signed app, local notifications (proposed) | 🟢 long press then tap, no app opens; 🟡 arrival time set by iOS or by a Shortcuts automation | 🟢 0 | 🟡 a small Swift app, re-signed every 7 days | 🟡 the operator's Mac, weekly | 🟡 widgets, HealthKit, Contacts; no push, no Siri |

🟢 good, 🟡 acceptable, 🔴 blocking or bad.

## Context

Talos is an agent that works in the background. It prepares proposals (cards), the owner decides them in the PWA, and the decision fires a routine (`apps/talos/CONTRAT.md`, « Une proposition »).

The need is to decide in one gesture from the notification, between 2 and 4 choices, such as « mardi », « jeudi » or « pas cette semaine ». That is more than Accept and Refuse.

Today it takes two taps at least. The notification opens `/proposals/<slug>`, and the card carries the buttons (`CONTRAT.md` says « one tap opens the card and a second decides »). The cause is a Safari iOS limit, checked on three sources on 2026-11-15:

- MDN compatibility data sets `Notification.actions` and the `actions` option of `showNotification` to `version_added: false` for Safari, and Safari iOS mirrors it. Chrome supports it since 53, Firefox since 152 (`mdn/browser-compat-data`, `api/Notification.json` and `api/ServiceWorkerRegistration.json`).
- [Apple Developer Forums thread 726793](https://developer.apple.com/forums/thread/726793) reports since iOS 16.4 that declared actions are ignored and only « View » shows. Apple never answers there. The last post, in November 2024, says iOS still does not support them.
- [OneSignal's action buttons page](https://documentation.onesignal.com/docs/action-buttons) lists Safari as « No buttons », on macOS and iOS.

borso.fr stays nearly free, with no paid service. A paid Apple licence would be the first exception, 99 USD a year, « in local currency where available » ([Apple](https://developer.apple.com/help/account/membership/program-enrollment/)). Apple shows the euro amount only at enrolment.

One constraint holds for every option. A proposal is binary today, because `POST /proposals/:slug/decision` takes `"acceptee" | "refusee"`. Proposals first need a list of `options` and a decision that names the chosen one. That work is the same in all five options, so it does not separate them.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | Decide in one gesture, between 2 and 4 choices, from the notification | Gestures between the notification showing and the decision being stored |
| Yearly cost | operator | high | borso.fr stays nearly free, with no paid service | Public price, read on Apple's page |
| Build and upkeep effort | operator | medium | One operator, agents in parallel | What the change adds: languages, secrets, chains, recurring chores |
| Build chain | operator | medium | Cloud sessions have no Mac | Where the build runs: a local Mac or a GitHub macOS runner |
| What native unlocks besides | operator | low | Later uses: sport, contacts, widgets | Apple's documentation of each framework, read on 2026-11-15 |

## Decision

**Option 4, a free-signed app that posts local actionable notifications.** It meets the gesture criterion at zero cost. The free personal team cannot receive pushes, so the app pulls instead, and posts the notifications itself. The operator accepts re-signing every 7 days. The cost is that the server no longer chooses when a proposal reaches the phone. A paid licence (option 2a) stays the fallback if the measured arrival time is too late.

## Consequences

- `+` A decision takes a long press and a tap on the notification, with no app opening, at zero cost.
- `+` The same app can later carry a « À décider » widget and read HealthKit for sport tracking, both open to the free team.
- `-` No push. A proposal reaches the phone when the app next runs, not when the agent writes it. The two triggers below set that moment, and neither is a server push.
- `-` The app stops launching 7 days after each signing. The operator rebuilds from the Mac every week, by hand or from a script.
- `-` iOS shows « at most two actions » when space is limited ([`UNNotificationCategory`](https://developer.apple.com/documentation/usernotifications/unnotificationcategory)). A banner with 3 or 4 choices can hide some, and the expanded notification shows them all.
- `-` A force-quit stops background runs. An Apple engineer calls force-quit « a drastic choice by the user to say that they do not want the app to run » ([thread 808088](https://developer.apple.com/forums/thread/808088)).
- `~` The app signs in to the API with a token kept in the Keychain, because the PWA session is an HttpOnly cookie. The PWA can revoke it.
- `~` A new route lists pending proposals since a cursor. The decision route is the PWA's own.

## Alternatives considered

### Option 4, Free-signed app, local actionable notifications (chosen)

- **Raised by:** operator
- **Summary:** A SwiftUI app signed by the free personal team, installed from the operator's Mac. It registers one `UNNotificationCategory` per number of choices. When it runs, it reads pending proposals from the API and posts each as a local notification of the right category. A button sends the chosen option to the API in the background. Tapping the notification body opens the card in the PWA. Two triggers make it run:
  - **Background App Refresh** (`BGAppRefreshTask`), best effort.
  - **A Shortcuts personal automation at fixed times**, such as 7:00, 12:00 and 18:00, that runs an App Intent of the app. This gives a known time, where background refresh gives none. Two points are inferred and left to the prototype. A time-of-day automation runs without asking, and an App Intent needs no paid capability.
- **Strengths:**
  - Gestures. [« Declaring your actionable notification types »](https://developer.apple.com/documentation/usernotifications/declaring-your-actionable-notification-types) says a button sends the action to the app, « which then processes the action in the background ». An action without the [`foreground`](https://developer.apple.com/documentation/usernotifications/unnotificationactionoptions/foreground) option does not open the app. [`UNNotificationCategory`](https://developer.apple.com/documentation/usernotifications/unnotificationcategory) applies to local notifications through `categoryIdentifier`, the same way as to remote ones.
  - Cost. The [iOS capability table](https://developer.apple.com/help/account/reference/supported-capabilities-ios) ticks « Background modes », « App groups », « HealthKit » and « Keychain sharing » for the free Apple Developer account (read in the page HTML).
- **Costs:**
  - Arrival time of background refresh. Apple documents no interval. [`earliestBeginDate`](https://developer.apple.com/documentation/backgroundtasks/bgtaskrequest/earliestbegindate) says « the system doesn't guarantee launching the task at the specified date, but only that it won't begin sooner ». On the forums, Apple DTS says « the detailed mechanism the system uses to schedule background tasks is undocumented » ([thread 823699](https://developer.apple.com/forums/thread/823699)), and that a task « may delay … based on its current state and if your app exceeds its budget … or isn't even triggered » ([thread 788713](https://developer.apple.com/forums/thread/788713)). Developers report no more than once a day on a real device ([thread 772426](https://developer.apple.com/forums/thread/772426)), and a one-hour request delayed by several hours or never run ([thread 823699](https://developer.apple.com/forums/thread/823699)). These reports are anecdotal, not measured here.
  - Re-signing. Free profiles « expirent sept jours après leur émission » ([Apple, comparatif des adhésions](https://developer.apple.com/fr/support/compare-memberships/)). At most three apps per device.
  - A Swift codebase built on a Mac, outside CI.
- **Rationale:** The only option that meets both high-weight criteria. It trades push timing for zero cost, and the Shortcuts trigger bounds that trade to known times, if the prototype confirms it.

### Option 1, Status quo, the PWA opens the card (rejected)

- **Raised by:** operator
- **Summary:** Keep web push. The notification opens `/proposals/<slug>`, and the card shows 2 to 4 buttons once the multi-choice model ships.
- **Strengths:** Zero cost, nothing new to build or sign. The deep link exists.
- **Costs:** Two taps and the PWA start-up at every decision.
- **Rejection rationale:** Loses on the high-weight gesture criterion. It wins if two taps are judged enough.
- **Operator's answer:** chose option 4 over it in the review of #350.

### Option 2a, Paid licence, SwiftUI app with APNs (rejected)

- **Raised by:** operator
- **Summary:** The same app with the Apple Developer Program. The API sends APNs pushes with a category, and the app ships through TestFlight.
- **Strengths:** Same gesture as option 4, and the notification arrives when the agent writes the proposal. Unlocks [WidgetKit](https://developer.apple.com/documentation/widgetkit), [ActivityKit](https://developer.apple.com/documentation/activitykit) Live Activities updated by push, [App Intents](https://developer.apple.com/documentation/appintents) with Siri, [HealthKit](https://developer.apple.com/documentation/healthkit) and [Contacts](https://developer.apple.com/documentation/contacts). Standard GitHub runners are free in public repositories ([GitHub](https://docs.github.com/en/billing/concepts/product-billing/github-actions)); that this covers macOS is inferred.
- **Costs:** 99 USD a year, borso.fr's first paid service. A `.p8` APNs key in SSM, a signing certificate and profile in GitHub secrets. A TestFlight build lasts 90 days ([Apple](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)).
- **Rejection rationale:** Loses on yearly cost. It becomes the choice if option 4's measured arrival time is too late.
- **Operator's answer:** not convinced by it (« pas du tout convaincu »), then chose option 4, in the review of #350.

### Option 2b, Paid licence, Capacitor or Expo shell around the PWA (rejected)

- **Raised by:** operator
- **Summary:** Wrap the React site in a native shell.
- **Strengths:** The whole app becomes native at once.
- **Costs:** The [Capacitor push plugin](https://capacitorjs.com/docs/apis/push-notifications) offers no method to declare categories, so Swift is needed anyway. [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) runs its background task on an action tap with the app closed « only on Android ». Two runtimes, plus the paid licence.
- **Rejection rationale:** The cost of 2a plus a layer, and Swift regardless.
- **Operator's answer:** chose option 4 over it in the review of #350.

### Option 3, Telegram bot or Slack DM with buttons (rejected)

- **Raised by:** operator
- **Summary:** The API posts each proposal to a chat with one button per choice: `InlineKeyboardMarkup` and `callback_data` in the [Telegram Bot API](https://core.telegram.org/bots/api), or Block Kit buttons in Slack. A webhook receives the click.
- **Strengths:** Free, no Apple chain, any number of buttons, and the message arrives when the agent writes it.
- **Costs:** The buttons live in the message, not in the iOS notification, so a tap opens the chat and a second tap decides (inferred, not measured on a phone). Private proposal content goes through a third party. The Slack connectors of these sessions belong to the operator's employer (`CLAUDE.md`), so Slack would need a personal workspace.
- **Rejection rationale:** Two gestures, like the status quo.
- **Operator's answer:** chose option 4 over it in the review of #350.

## Scores

|   | 4. Free-signed app | 1. Status quo | 2a. Paid SwiftUI | 2b. Paid shell | 3. Telegram or Slack |
|---|---|---|---|---|---|
| Gestures | ✓ long press and tap, no app opens | ✗ 2 taps and the PWA | ✓ same as 4 | ✓ same as 4, once the Swift is written | ✗ 2 taps (inferred) |
| Yearly cost | ✓ 0 | ✓ 0 | ✗ 99 USD | ✗ 99 USD | ✓ 0 |
| Effort | ✗ a Swift app and a weekly re-sign | ✓ nothing new | ✓ a Swift app, APNs in the API | ✗ a shell plus Swift | ✓ a bot and a webhook |
| Build chain | ✗ the operator's Mac, outside CI | ✓ unchanged | ✓ a macOS runner | ✓ a macOS runner | ✓ unchanged |
| Unlocks besides | ✓ widgets, HealthKit, Contacts | ✗ nothing | ✓ also Live Activities by push, Siri | ✓ same as 2a | ✗ nothing |

None of the options unlocks call history, iMessage or WhatsApp. [`CXCallObserver`](https://developer.apple.com/documentation/callkit/cxcallobserver) sees only active calls, the [Messages](https://developer.apple.com/documentation/messages) framework builds extensions and stickers rather than reading conversations, and WhatsApp exposes no reading API on iOS (inferred). Talos keeps reading them on the Mac (the `collecte-mac` routine).

## Implementation pointers

- Spec: none yet. If accepted, a spec under `docs/features/talos/` follows, opened by a prototype that measures the arrival time of both triggers on the operator's phone over a week.
- Plan: none.
- Commit: stamped by `/after-task-kaizen` on merge.
- Files: `apps/talos/CONTRAT.md` (`POST /proposals/:slug/decision`, `POST /notify`), `apps/talos/site/public/sw.js` (`notificationclick`).
- Related ADRs: ADR-2026-10-23T0932 (pragma's web push copies Talos's), ADR-2026-11-11T1306 (each decision fires a stored routine run).
