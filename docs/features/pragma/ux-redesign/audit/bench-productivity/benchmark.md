# Benchmark: mobile productivity and collaboration patterns for pragma

Author: bench-productivity. Date: 2026-10-25.

## How to read this

This benchmark is organised by pattern, not by app. Each pattern says what problem it solves, which apps use it and how, which pragma task it serves, and whether an installed web app (a PWA) can really do it on iOS and on Android.

**Where the evidence comes from.** Everything about Linear, Things 3, Notion, Todoist, Apple Notes, Apple Reminders and Slack comes from public material: official help pages, changelogs, design blog posts, App Store descriptions and press reviews. I could not log into any of these apps. Apple's Human Interface Guidelines (HIG) were read in full from Apple's own data files (saved under `src/hig-*.json` in this folder). Material 3 pages render in the browser only, so Material guidance comes from Android developer docs, the Material Components docs and older material.io pages, and is marked as such.

**Screenshots.** I did not download reference screenshots. Apple's HIG images, App Store screenshots and vendor marketing images carry no licence that allows copying them into this repository, so every pattern links to the source page instead.

**What the emulator could not prove.** This agent did not drive the emulator: its job was the outside benchmark. The PWA support claims below come from compatibility tables (mainly [firt.dev iOS PWA notes, updated 13 Oct 2026](https://firt.dev/notes/pwa-ios/)) and vendor docs, not from a test on a real iPhone or Android phone. Haptics, edge swipe back, the share sheet and keyboard behaviour in particular need a real device to confirm.

**What I checked in pragma's code.** To tie each pattern to pragma I read `apps/pragma/site/src`. Those notes describe the code, not what a person sees on screen; the emulator agents own that.

---

## Pattern 1. Bottom tab bar with three to five fixed destinations

**What it solves.** A person always knows where they are and can jump between the main areas with one thumb tap. Each tab keeps its own place, so leaving and coming back does not lose context.

**Who does it and how.**
- Apple HIG, *Tab bars*: "Use a tab bar to support navigation, not to provide actions." It says to keep the tab bar visible, to label each tab with one word, and to "Avoid overflow tabs", because "The More tab makes it harder for people to reach and notice content on tabs that are hidden." Badges are for "critical information" only. [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- Material 3: the navigation bar is for "three to five destinations of equal importance". With more than five, Material points to a drawer or tabs. [Android navigation bar](https://developer.android.com/develop/ui/compose/components/navigation-bar), [Material bottom navigation](https://material.io/components/bottom-navigation)
- Slack moved its mobile app to a tab bar in 2020 because direct messages and the activity screen were hard to find, and later settled on Home, DMs and Activity. [Slack blog](https://slack.com/blog/productivity/simpler-more-organized-slack-mobile-app), [MIT IST notice](https://ist.mit.edu/node/4281)
- Linear mobile lets each person reorder the bottom bar and pin a project or document to it, because one fixed set of tabs did not suit both managers and individual contributors. [Linear changelog, Jan 2026](https://linear.app/changelog/2026-01-22-customize-your-navigation-in-linear-mobile), [Linear blog](https://linear.app/blog/linear-liquid-glass)
- Notion mobile had Home, Search, Inbox and New page in its bottom bar. [Notion release 2020-02-19](https://www.notion.com/releases/2020-02-19)

**What pragma does today (code).** `AppShell.tsx` puts Catalog, Sessions, Setlists, Bars and Studies in the bar, plus a sixth "More" slot that opens Tasks, Compos, Improvements, Members, Instruments and more. That is six slots and the overflow tab both guidelines warn against. The tabs follow the data model (one per table), not the operator's two jobs.

**Pragma task served.** Priority 1 (setlists, sessions) and priority 2 (catalogue, learning). A bar shaped around those two jobs would put the operator's main work one tap away.

**PWA feasibility.** Fully possible on iOS and Android: it is plain HTML fixed to the bottom with `env(safe-area-inset-bottom)`, which pragma already uses. Tab badges work in the page. The app icon badge (Badging API) works on iOS 16.4+ for installed PWAs only, and in Chromium on Android.

---

## Pattern 2. One scroll per screen

**What it solves.** Two scroll areas stacked in the same direction fight for the same swipe. The person scrolls the inner box when they meant the page, or gets stuck at the end of one. This is the operator's "double scroll" complaint.

**Who does it and how.**
- Apple HIG, *Scroll views*: "Avoid putting a scroll view inside another scroll view with the same orientation. Nesting scroll views that have the same orientation can create an unpredictable interface that's difficult to control." A horizontal strip inside a vertical page is fine. [HIG Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views)
- Things 3, Apple Reminders and Todoist show each list as the whole screen. Headers and the add button float over that one scroll instead of taking a fixed slice of the screen. (Public screenshots on the [Things App Store page](https://apps.apple.com/app/id904237743).)
- iOS large titles shrink into the top bar as the page scrolls, which hands the space back to the list instead of adding a second scroll area. [HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- On the web, scroll chaining passes the leftover swipe to the parent, and `overscroll-behavior: contain` stops it but also turns off pull to refresh. WebKit bug reports describe nested scrolling on iOS as stuttering. [MDN overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior), [WebKit bug 219923](https://bugs.webkit.org/show_bug.cgi?id=219923)

**What pragma does today (code).** Eight components set their own vertical scroll (`overflow-y-auto` or similar): `SongSearch`, `SetlistSongPicker`, `SuggestSongField`, `SongChordPreview`, `LineupEditor`, `SongDefaultsDialog`, `SongScenePage`, `SetlistScenePage`. Several of these sit inside a page that also scrolls. The emulator agents should confirm which ones trap the thumb.

**Pragma task served.** All of them, but most of all building a setlist (song picker inside the setlist page) and reading a song with its chords.

**PWA feasibility.** Fully possible. It is a layout decision: let the document scroll, make headers `position: sticky`, and move secondary lists into a full screen or a sheet (Pattern 3). Note that iOS Safari does not support `interactive-widget=resizes-content`, so a field near the bottom can be hidden by the keyboard; that needs testing on a real iPhone. [htmhell on interactive-widget](https://htmhell.dev/adventcalendar/2024/4/)

---

## Pattern 3. Bottom sheets for short tasks, with a half height and a full height

**What it solves.** A short task (pick a song, set who plays what, add a note) opens close to the thumb and keeps the page behind it visible, so the person does not lose their place.

**Who does it and how.**
- Apple HIG, *Sheets*: a sheet is for "a simple task that they can complete before returning to the parent view". The medium detent is "about half of the fully expanded height" and allows "progressive disclosure". It says to "Include a grabber in a resizable sheet", to "Support swiping to dismiss a sheet", to ask before discarding unsaved changes, and to "Display only one sheet at a time". It also allows a nonmodal sheet that stays open while the person works on the page, as Notes does for text formatting. [HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- Material 3 separates standard bottom sheets, which sit beside the content with no dimmed background, from modal ones, which sit over a dimmed background. The drag handle is optional. [Material Components Android: Bottom sheet](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomSheet.md), [Flutter BottomSheet](https://api.flutter.dev/flutter/material/BottomSheet-class.html)
- Apple Maps, the iOS share sheet and Linear's issue properties use this shape. Linear keeps a toolbar of properties at the bottom of the issue composer so a person never leaves the screen. [screensdesign: Linear Mobile](https://screensdesign.com/showcase/linear-mobile)

**What pragma does today (code).** Components named "Sheet" (`RecordingSheet`, `SetlistEntrySheet`, `InstallWalkthroughSheet`) and every dialog (`CreateSessionDialog`, `TransitionCommentModal`, `LineupEditor`, `SongDefaultsDialog`) are drawn as cards centred on the screen (`m-auto`). None docks to the bottom edge, none has a grabber, none closes with a downward swipe. The name promises a bottom sheet the screen does not show.

**Pragma task served.** Priority 1: edit a setlist entry, set the lineup for a song, write a transition note, record a take. Priority 2: add a song quickly.

**PWA feasibility.** Possible on both. A `<dialog>` docked to the bottom with CSS gives the look. The drag to resize and swipe to close must be written with pointer events (or a small library); on iOS it must not start from the bottom edge, which the system uses for the home gesture. No haptic tick on the detents: `navigator.vibrate` is not supported on iOS, and only a trick with a hidden switch control gives a haptic tap there (see Pattern 12).

---

## Pattern 4. One primary action per screen, in the thumb zone

**What it solves.** "Buttons that are hard to find." When each screen has one obvious main action in the same place, people stop hunting.

**Who does it and how.**
- Material: "Only one floating action button is recommended per screen to represent the most common action." It is for positive actions such as create, never delete. [Material 1 FAB](https://m1.material.io/components/buttons-floating-action-button.html), [Flutter FloatingActionButton](https://api.flutter.cn/flutter/material/FloatingActionButton-class.html)
- Apple HIG, *Toolbars*: "Only specify one primary action, and put it on the trailing side of the toolbar." *Buttons*: "Use style, not size, to visually distinguish the preferred choice", and "Don't assign the primary role to a button that performs a destructive action." [HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- Things 3's Magic Plus button sits bottom right. Press, drag and drop it anywhere in a list to insert a to-do exactly there. [Cultured Code support](https://culturedcode.com/things/support/articles/2803582/)
- Todoist's red add button sits bottom right; it can also be dragged into the list. [Todoist: Introduction to tasks](https://todoist.com/help/articles/360000423369)
- Apple Reminders puts "New Reminder" at the bottom left of every list.

**What pragma does today (code).** The main actions sit in page headers (`SetlistHeaderActions`, `SongDetailHeader`) at the top of the screen, out of the thumb's easy reach, with two buttons each. There is no common placement rule from page to page.

**Pragma task served.** Priority 1: "add a song to this setlist", "start a session". Priority 2: "add a song to the catalogue".

**PWA feasibility.** Fully possible. A fixed button above the tab bar, with the safe area inset. A drag to insert, like Things, is possible with pointer events but is extra work; a plain tap is enough for pragma.

---

## Pattern 5. Quick add from one line

**What it solves.** Adding a new item should cost one field and one tap. Details come later. This is what makes a growing catalogue cheap.

**Who does it and how.**
- Todoist Quick Add: one line, natural language for dates ("tomorrow at 4pm"), symbols for labels and priority. [Todoist: Task Quick Add](https://todoist.com/help/articles/task-quick-add-va4Lhpzz)
- Apple Reminders: type @ and a name to assign the reminder to someone in a shared list, from a toolbar just above the keyboard. [Apple: Share and assign reminders](https://support.apple.com/en-us/105124), [iPhone user guide](https://support.apple.com/guide/iphone/iph2a8f9121e/ios)
- Linear: share a screenshot to the app to start an issue; the composer is "designed with an obsessive focus on speed". [linear.app/mobile](https://linear.app/mobile)
- Things 3: paste a bulleted list into a checklist and each line becomes its own item. [App Store story: Break tasks down with Things 3](https://apps.apple.com/us/story/id1437833617)

**What pragma does today (code).** `QuickAddForm` and `BarQuickAdd` exist, so the idea is already in the code for some lists. The song creation path goes through `SongEditPage`, a full form.

**Pragma task served.** Priority 2: grow the catalogue ("add title and artist now, chords and links later"). Also priority 1: "propose a song for the next setlist" in one line. A pasted list of titles turning into several songs is the Things trick applied to setlists.

**PWA feasibility.** Fully possible. Receiving a shared link from another app (a YouTube or Deezer link shared into pragma) is a different matter: the Web Share Target manifest field works on Chromium Android for installed PWAs and is **not supported on iOS**. [Chrome docs](https://developer.chrome.com/docs/android/trusted-web-activity/web-share-target), [firt.dev](https://firt.dev/notes/pwa-ios/). On iOS the fallback is paste.

---

## Pattern 6. Swipe actions on list rows, always with a visible twin

**What it solves.** The two or three most common actions on a row (mark done, remove, reschedule) without opening the row.

**Who does it and how.**
- Todoist lets each person set the left and right swipe: Complete, Schedule, Delete or Select. Long press also selects. [Todoist: change your swipe actions](https://todoist.com/help/articles/how-to-change-your-swipe-actions-D5DQOQz6)
- Things 3: swipe right to schedule, swipe left to start multi-select. [9to5Mac, Things 3.12](https://9to5mac.com/2020/04/20/things-3-for-ipad/)
- Linear inbox: "Tap to take action, swipe to delete, snooze to deal with it later." [linear.app/mobile](https://linear.app/mobile)
- Apple HIG, *Gestures*: "Use shortcut gestures to supplement standard gestures, not replace them", because a gesture is hidden. [HIG Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)

**What pragma does today (code).** No row swipe. The only touch gesture code is in `VoteDeck` (the swipe vote cards) and the energy bar.

**Pragma task served.** Priority 1: on a setlist row, swipe to remove or to move to "maybe". Priority 2: on a study queue row, swipe to mark "learned".

**PWA feasibility.** Possible on both with pointer events. Two risks to test on a device: a swipe from the left edge on iOS can trigger the standalone app's back gesture (reports vary; see [Ionic forum](https://forum.ionicframework.com/t/swipe-back-gesture-on-ios-pwa-with-react-mixing-up/180024)), and a horizontal swipe must not block vertical scroll. No vibration on iOS. Every swipe action must also exist as a button.

---

## Pattern 7. Long press for a short context menu, and drag to reorder

**What it solves.** Power actions without crowding the row, and reordering a list by hand.

**Who does it and how.**
- Apple HIG, *Context menus*: a context menu is "hidden by default, so people might not know it's there". Keep it short, keep it consistent across the app ("If you provide context menus for items in some places but not in others, people won't know where they can use the feature"), put destructive items last in red, and "Always make context menu items available in the main interface, too." [HIG Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus)
- Apple HIG, *Lists and tables*: "People appreciate being able to reorder a list". [HIG Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- Slack: long press a thread reply to "Send reply to this channel". [Slack: Use threads](https://slack.com/help/articles/115000769927)
- Things 3 and Reminders: long press then drag to reorder.

**Pragma task served.** Priority 1: reorder the setlist (song order is the heart of a setlist), move a song between sets.

**PWA feasibility.** Possible. iOS Safari shows its own callout on long press over links and images; it must be turned off with `-webkit-touch-callout: none` and `user-select: none` on the row. A drag handle at the row end is more discoverable than long press and works the same on both platforms. Requires a device test for the scroll-while-dragging feel.

---

## Pattern 8. Edit in place, open details on demand

**What it solves.** Fewer screens and fewer "Edit" buttons. A field is edited where it is read.

**Who does it and how.**
- Things 3: a to-do "can look like straight text on a piece of paper"; tap to expand it in place to show notes, checklist and dates. [MacRumors on Things 3](https://www.macrumors.com/2000/)
- Apple Reminders: tap the title to edit, a toolbar above the keyboard adds date, place, flag, assignee. [Apple support](https://support.apple.com/en-us/105124)
- Notion: every block is editable where it sits; there is no separate edit page.
- Linear: properties are chips on the issue; tapping one opens a small picker. [screensdesign: Linear Mobile](https://screensdesign.com/showcase/linear-mobile)

**What pragma does today (code).** Songs have a read page (`SongDetailPage`) and a separate edit page (`SongEditPage`); concerts have `ConcertReadView` and `ConcertEditForm`. Editing one field means leaving the page.

**Pragma task served.** Priority 1: change the key, the singer or a note on a setlist entry without leaving the setlist. Priority 2: add chords or a link to a song while looking at it.

**PWA feasibility.** Fully possible. Keyboard covering the field on iOS (see Pattern 2) is the one thing to test on a device.

---

## Pattern 9. Discussion attached to the item

**What it solves.** "Discuss" and "take notes" happen next to the thing being discussed (a song, a transition, a setlist), not in a separate chat app where the context is lost.

**Who does it and how.**
- Slack threads: replies hang under one message, with an option to "also send to channel" so the wider group sees it. [Slack: Use threads](https://slack.com/help/articles/115000769927)
- Notion: comments on a page or on one block; long threads collapse. [Notion help: comments](https://www.notion.com/help/comments-mentions-and-reminders)
- Todoist: comments on a task, including **voice comments** recorded from the paperclip in the comment field. [Todoist: record audio comments](https://todoist.com/help/articles/record-audio-comments)
- Apple Notes shared notes: mentions, an activity view that summarises changes since you last looked, and highlights colour-coded by person. [Apple Notes guide](https://support.apple.com/guide/notes/apd4e6e2c9a6/mac), [PhoneArena on iOS 15 Notes](https://www.phonearena.com/news/ios-15-apple-notes-tags-browser-activity-view-mentions-highlights-quick-note_id132676)
- Linear: an inbox gathers every mention and reply, with a priority tab. [Linear Inbox docs](https://linear.app/docs/inbox)

**What pragma does today (code).** There is a comment on a transition (`TransitionCommentModal`, `TransitionStrip`) and song notes (`SongNotesCard`). I found no general discussion thread on a setlist or a song, and no place that collects "what changed since I last looked".

**Pragma task served.** Priority 1 directly: "agree who does what", "brainstorm the transitions", "note things", "discuss". A voice comment fits a band: hum the transition instead of typing it.

**PWA feasibility.** Comments: fully possible. Voice comments: `MediaRecorder` and `getUserMedia` work on iOS 14.5+ and on Android; pragma already records takes with them (`lib/recorder.adapter.ts`). Push notifications for a reply work on iOS 16.4+ **only when the app is installed to the home screen**, and on Android. Background sync is not supported on iOS, so a comment written offline must be retried when the app is next open. [firt.dev](https://firt.dev/notes/pwa-ios/)

---

## Pattern 10. Assign people inside the item

**What it solves.** "Who does what" is visible on the item, and each person can see "what is mine".

**Who does it and how.**
- Apple Reminders: assign with @name or a person button; an "Assigned to Me" smart list collects everything for one person. [Apple support](https://support.apple.com/en-us/105124)
- Linear: assignee chip on every issue, "My Issues" as a pinnable tab. [Linear changelog](https://linear.app/changelog/2026-01-22-customize-your-navigation-in-linear-mobile)
- Todoist: assign to a collaborator from Quick Add. [Todoist Quick Add](https://todoist.com/help/articles/task-quick-add-va4Lhpzz)

**Pragma task served.** Priority 1: the lineup per song (who sings, who plays which instrument) and tasks before a concert. Pragma has a `LineupEditor` and a separate Tasks area in "More". A "Mine" view (my parts in the next setlist, my songs to learn, my tasks) would join them.

**PWA feasibility.** Fully possible; it is data and layout only.

---

## Pattern 11. A home that answers "what is next for me"

**What it solves.** Opening the app shows the next thing to do, not a list of every table.

**Who does it and how.**
- Things 3 opens on Today. Todoist opens on Today. Reminders shows smart lists (Today, Scheduled, Assigned to Me) above the user's lists.
- Linear lets a person pin Inbox, My Issues or a project as the first tab. [Linear changelog](https://linear.app/changelog/2026-01-22-customize-your-navigation-in-linear-mobile)
- Slack's Home tab is the list of conversations with unread ones first. [Slack blog](https://slack.com/blog/productivity/simpler-more-organized-slack-mobile-app)

**What pragma does today (code).** There is a `NextConcertStrip` and a `ConcertReadinessBar`, so the ingredients exist, but the first tab is Catalog.

**Pragma task served.** Priority 1: "next rehearsal on Thursday, setlist not finished, two songs without a singer, three new comments". Priority 2: "songs you are learning".

**PWA feasibility.** Fully possible. The `start_url` in the manifest decides what opens first.

---

## Pattern 12. A real design system: few type sizes, a spacing scale, a shape scale

**What it solves.** "Weak design system." When sizes, spacing and corners come from a short named list, screens look related and the eye finds buttons faster.

**Who does it and how.**
- Material 3 type scale: five roles (display, headline, title, body, label) in three sizes each, fifteen styles in all, each defined by size, line height, weight and letter spacing. [Compose Typography](https://developer.android.com/reference/kotlin/androidx/compose/material3/Typography)
- Material spacing: components align to an 8dp grid, small elements to a 4dp grid. [material.io spacing methods](https://material.io/design/layout/spacing-methods.html)
- Material shape scale: named corner sizes from Extra Small (4dp) to Extra Large (28dp) and Full. [Material Components Android: Shape](https://github.com/material-components/material-components-android/blob/master/docs/theming/Shape.md)
- Apple HIG, *Typography*: "Minimize the number of typefaces you use", keep the hierarchy when text size changes, and avoid light weights at small sizes. [HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- Apple HIG, *Buttons*: a hit area of at least 44 by 44 points. [HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)

**What pragma does today (code).** `styles/tokens.css` defines colours, three fonts and four radii, but no type scale and no spacing scale. Across the components I counted fifteen hand-picked font sizes outside Tailwind's scale, among them 10, 11, 12, 12.5, 13, 13.5, 14 and 15 pixels (`text-[13px]` alone appears 22 times), next to Tailwind's own `text-xs` (157 uses) and `text-sm` (141 uses). That is many sizes a few tenths of a pixel apart, which reads as inconsistency rather than hierarchy.

**Pragma task served.** All tasks; this is the "polish" half of the operator's request.

**PWA feasibility.** Fully possible: Tailwind v4 `@theme` can declare named text sizes and spacing so `text-title-md` replaces `text-[13.5px]`. Haptic feedback, which native apps pair with their components, is the gap: `navigator.vibrate` works on Android Chrome and is not supported on iOS. A hidden `<input type="checkbox" switch>` gives a haptic tap on iOS Safari 18, but it is a workaround, not an API. [WebKit bug 285120](https://bugs.webkit.org/show_bug.cgi?id=285120), [ios-haptics](https://npmjs.com/package/ios-haptics)

---

## Pattern 13. Search and pull-down quick find

**What it solves.** Reaching any song or setlist without walking the navigation. This matters more as the catalogue grows.

**Who does it and how.**
- Things 3: pull down inside any list to open Quick Find over to-dos, lists and tags. [App Store story](https://apps.apple.com/us/story/id1437833617)
- Apple HIG: a tab bar can end with a dedicated search tab. [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- Notion and Slack keep Search one tap away in the bar.

**Pragma task served.** Priority 2 (find a song in a growing catalogue) and priority 1 (find the song to add to a setlist).

**PWA feasibility.** A search screen is fully possible. Pull-down to search clashes with the browser's own pull to refresh on Android; it needs `overscroll-behavior-y: contain` on the page, which then removes pull to refresh. A search button or tab is the safer choice.

---

## PWA capability summary

Status from [firt.dev iOS PWA notes (13 Oct 2026)](https://firt.dev/notes/pwa-ios/) for iOS, and Chrome docs for Android. Not tested on a device.

| Capability | iOS installed PWA | Android Chrome installed PWA | Used by pattern |
|---|---|---|---|
| Swipe, drag, long press (pointer events) | Yes, but edge swipe may clash with back and the long-press callout must be turned off | Yes | 3, 6, 7 |
| Vibration API | No | Yes | 3, 6, 12 |
| Haptic tap via switch control | Workaround only, Safari 18 | Not needed | 12 |
| Share out (`navigator.share`) | Yes, since 12.1 | Yes | 9 |
| Receive shares (Web Share Target) | No | Yes | 5 |
| Audio recording (`MediaRecorder`) | Yes, since 14.5 | Yes | 9 |
| Web Push | Yes, since 16.4, installed only | Yes | 9, 11 |
| App icon badge | Yes, since 16.4, installed only | Yes | 1 |
| Offline cache (service worker) | Yes | Yes | all |
| Background sync | No | Yes | 9 |
| Keyboard resizes layout (`interactive-widget`) | No | Yes | 2, 8 |
| Screen wake lock | Yes, 18.4 for installed PWAs | Yes | rehearsal reading |

---

## The ten patterns I would most recommend for pragma

Ranked by how much they serve the operator's two priorities and answer the four complaints (double scroll, hard-to-find buttons, weak design system, imperfect usability).

1. **One scroll per screen (Pattern 2).** Answers the first complaint directly. Let the page scroll, make headers sticky, and move every inner list (song picker, lineup, chord preview) into a full screen or a sheet.
2. **Bottom tab bar with at most five tabs shaped around the two jobs (Pattern 1).** For example: Home, Setlists and sessions, Catalogue, Discussion or Mine, plus search. Remove the overflow "More" tab; move rarely used areas (Instruments, Improvements, Compos) into Home or the account page.
3. **One primary action per screen in the thumb zone (Pattern 4).** The same place on every screen, one filled style, never destructive. Answers "buttons hard to find".
4. **Real bottom sheets with half and full height, grabber and swipe to close (Pattern 3).** Turn the centred dialogs into bottom sheets, one sheet at a time, and confirm before discarding a draft.
5. **A home that answers "what is next for me" (Pattern 11).** Next rehearsal or concert, what is missing in its setlist, my parts, new comments. Open the app there instead of the catalogue.
6. **Discussion attached to setlists, songs and transitions, with voice comments (Pattern 9).** Serves "agree, brainstorm, note, discuss" without leaving the item. Pragma already records audio, so voice comments reuse what exists.
7. **Edit in place (Pattern 8).** Key, singer, note and chords edited on the setlist entry or the song page itself, not on a separate edit page.
8. **A named type scale and spacing scale in `tokens.css` (Pattern 12).** Replace the fifteen hand-picked font sizes with about six named roles, and add a spacing scale. Answers "weak design system".
9. **Quick add from one line, including pasting a list of titles (Pattern 5).** Makes the catalogue cheap to grow: title first, chords and links later, only if easy.
10. **Drag handle to reorder plus a short, consistent long-press menu, with swipe only as an extra (Patterns 6 and 7).** Reordering is the core of a setlist. Every hidden gesture keeps a visible button twin, as Apple's guidelines require.

Not recommended for now: Things-style drag of the add button, pull-down quick find (clashes with pull to refresh), a user-customisable tab bar like Linear (worth it only once the default bar is right), and anything that depends on haptics, since iOS does not offer them to web apps.

## Sources not reachable

- m3.material.io guideline pages render only in a browser, so the fetch returned the title only. Material guidance above comes from Android developer docs, Material Components on GitHub, Flutter docs and older material.io pages.
- I found no official Cultured Code page for the current iPhone swipe gestures in Things 3; the swipe details come from 2020 release notes for iPad.
- I found no official description of Slack's or Linear's current mobile thread screen layout.
