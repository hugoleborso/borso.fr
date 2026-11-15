# ADR-2026-11-15T0636: Talos decides multi-choice proposals on the PWA card, not in the notification

- **Status:** accepted
- **Date:** 2026-11-15
- **Deciders:** the operator
- **Tags:** talos, ios, notifications, cost

## Summary

**Proposed decision.** Keep the PWA and its web push. The notification opens the proposal card, and the card shows one button per choice when the agent lists 2 to 4 of them. A decision takes two taps. No native app and no Apple licence, so borso.fr stays free.

| Option | Gestures per decision | Yearly cost | Build and upkeep | Build chain | What else it unlocks |
|---|---|---|---|---|---|
| 1. Status quo, choice buttons on the card (proposed) | 🟡 2 taps, plus the PWA loading | 🟢 0 | 🟢 the multi-choice model only | 🟢 nothing new | 🔴 nothing |
| 2a. Paid licence, SwiftUI, APNs | 🟢 long press then tap, no app opens | 🔴 99 USD | 🟡 a small Swift app, APNs in the API | 🟡 macOS: local Mac or GitHub runner | 🟢 widgets, Live Activities, Siri, HealthKit, Contacts |
| 2b. Paid licence, Capacitor or Expo shell | 🟢 same as 2a | 🔴 99 USD | 🔴 a shell, plus Swift for the background action | 🟡 macOS, plus the JavaScript chain | 🟢 same as 2a |
| 3. Telegram bot or Slack DM | 🟡 2 taps, no PWA load (inferred) | 🟢 0 | 🟡 a bot, a webhook, an identity link | 🟢 nothing new | 🔴 nothing |
| 4. Free-signed app, local notifications | 🟢 long press then tap; 🔴 arrival time undocumented | 🟢 0 | 🔴 a Swift app, re-signed every 7 days | 🔴 the operator's Mac, outside CI | 🟡 widgets, HealthKit, Contacts; no push |

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

**Option 1, the status quo with choice buttons on the card.** It is free, it adds no language and no chain, and the notification arrives when the agent writes the proposal. One gesture would need a native app. The paid one costs 99 USD a year, and the free one cannot say when a proposal reaches the phone, because Apple calls its background schedule undocumented.

## Consequences

- `+` A proposal can offer 2 to 4 choices, such as « mardi », « jeudi » or « pas cette semaine », and the card shows one button per choice.
- `+` Nothing new to pay, sign, build or re-sign.
- `-` A decision still takes two taps and the PWA start-up. Safari iOS shows no button in a web push notification.
- `-` The agent must write the choices into the proposal, under a new « ## Options » section, or the card keeps Accept and Refuse.
- `~` A chosen option is recorded as an accepted decision whose line names it, `- 2026-11-15 10:12 : acceptée (jeudi)`. The routine reads it from that line.

## Alternatives considered

### Option 1, Status quo, the PWA opens the card (chosen)

- **Raised by:** operator
- **Summary:** Keep web push. The notification opens `/proposals/<slug>`, and the card shows one button per choice when the proposal lists 2 to 4 of them, beside Refuse and Comment.
- **Strengths:** Zero cost, nothing new to build or sign. The deep link exists.
- **Costs:** Two taps and the PWA start-up at every decision.
- **Rationale:** It is the only free option whose timing is known, because the notification arrives when the agent writes the proposal. The second tap is the price, and the operator judged it acceptable.

### Option 4, Free-signed app, local actionable notifications (rejected)

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
- **Rejection rationale:** Meets the gesture criterion at zero cost, but no one can say when a proposal reaches the phone. Apple calls the background schedule undocumented, and the Shortcuts trigger is unproven. A Swift app, a weekly re-sign and a Mac outside CI buy that uncertain gain.
- **Operator's answer:** chose it first, then the status quo once the forum threads showed the delay is undocumented, in the review of #350.

### Option 2a, Paid licence, SwiftUI app with APNs (rejected)

- **Raised by:** operator
- **Summary:** The same app with the Apple Developer Program. The API sends APNs pushes with a category, and the app ships through TestFlight.
- **Strengths:** Same gesture as option 4, and the notification arrives when the agent writes the proposal. Unlocks [WidgetKit](https://developer.apple.com/documentation/widgetkit), [ActivityKit](https://developer.apple.com/documentation/activitykit) Live Activities updated by push, [App Intents](https://developer.apple.com/documentation/appintents) with Siri, [HealthKit](https://developer.apple.com/documentation/healthkit) and [Contacts](https://developer.apple.com/documentation/contacts). Standard GitHub runners are free in public repositories ([GitHub](https://docs.github.com/en/billing/concepts/product-billing/github-actions)); that this covers macOS is inferred.
- **Costs:** 99 USD a year, borso.fr's first paid service. A `.p8` APNs key in SSM, a signing certificate and profile in GitHub secrets. A TestFlight build lasts 90 days ([Apple](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)).
- **Rejection rationale:** Loses on yearly cost. It is the way to one gesture if two taps stop being acceptable.
- **Operator's answer:** not convinced by it (« pas du tout convaincu »), in the review of #350.

### Option 2b, Paid licence, Capacitor or Expo shell around the PWA (rejected)

- **Raised by:** operator
- **Summary:** Wrap the React site in a native shell.
- **Strengths:** The whole app becomes native at once.
- **Costs:** The [Capacitor push plugin](https://capacitorjs.com/docs/apis/push-notifications) offers no method to declare categories, so Swift is needed anyway. [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) runs its background task on an action tap with the app closed « only on Android ». Two runtimes, plus the paid licence.
- **Rejection rationale:** The cost of 2a plus a layer, and Swift regardless.
- **Operator's answer:** chose the status quo over it in the review of #350.

### Option 3, Telegram bot or Slack DM with buttons (rejected)

- **Raised by:** operator
- **Summary:** The API posts each proposal to a chat with one button per choice: `InlineKeyboardMarkup` and `callback_data` in the [Telegram Bot API](https://core.telegram.org/bots/api), or Block Kit buttons in Slack. A webhook receives the click.
- **Strengths:** Free, no Apple chain, any number of buttons, and the message arrives when the agent writes it.
- **Costs:** The buttons live in the message, not in the iOS notification, so a tap opens the chat and a second tap decides (inferred, not measured on a phone). Private proposal content goes through a third party. The Slack connectors of these sessions belong to the operator's employer (`CLAUDE.md`), so Slack would need a personal workspace.
- **Rejection rationale:** Two gestures, like the status quo.
- **Operator's answer:** chose the status quo over it in the review of #350.

## Scores

|   | 1. Status quo | 4. Free-signed app | 2a. Paid SwiftUI | 2b. Paid shell | 3. Telegram or Slack |
|---|---|---|---|---|---|
| Gestures | ✗ 2 taps and the PWA | ✓ long press and tap, no app opens | ✓ same as 4 | ✓ same as 4, once the Swift is written | ✗ 2 taps (inferred) |
| Yearly cost | ✓ 0 | ✓ 0 | ✗ 99 USD | ✗ 99 USD | ✓ 0 |
| Effort | ✓ the multi-choice model only | ✗ a Swift app and a weekly re-sign | ✓ a Swift app, APNs in the API | ✗ a shell plus Swift | ✓ a bot and a webhook |
| Build chain | ✓ unchanged | ✗ the operator's Mac, outside CI | ✓ a macOS runner | ✓ a macOS runner | ✓ unchanged |
| Unlocks besides | ✗ nothing | ✓ widgets, HealthKit, Contacts | ✓ also Live Activities by push, Siri | ✓ same as 2a | ✗ nothing |

None of the options unlocks call history, iMessage or WhatsApp. [`CXCallObserver`](https://developer.apple.com/documentation/callkit/cxcallobserver) sees only active calls, the [Messages](https://developer.apple.com/documentation/messages) framework builds extensions and stickers rather than reading conversations, and WhatsApp exposes no reading API on iOS (inferred). Talos keeps reading them on the Mac (the `collecte-mac` routine).

## Implementation pointers

- Spec: [`docs/features/talos/multi-choice-proposals/spec/spec.md`](../features/talos/multi-choice-proposals/spec/spec.md).
- Plan: none.
- Commit: stamped by `/after-task-kaizen` on merge.
- Files: `apps/talos/domain/proposal.core.ts`, `apps/talos/api/src/proposals/`, `apps/talos/site/src/components/organisms/ProposalDecisionForm.tsx`, `apps/talos/CONTRAT.md`.
- Related ADRs: ADR-2026-10-23T0932 (pragma's web push copies Talos's), ADR-2026-11-11T1306 (each decision fires a stored routine run).
