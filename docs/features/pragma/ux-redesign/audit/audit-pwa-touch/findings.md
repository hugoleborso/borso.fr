The harness refused to write the findings file. It allows subagents to return findings only as text. So the full findings are below, and the structured output points here.

# Installed app and touch: findings (audit-pwa-touch)

The screenshots and the scripts behind every number are in `docs/features/pragma/ux-redesign/audit/audit-pwa-touch/` (the screenshots are under `shots/`) in the session that ran the audit; the archived copy keeps the text but not the screenshots or scripts.

**How I tested.** I ran my own instance on port 5182 and emulated the installed app with Playwright: standalone mode, safe-area insets (top 20 at 375x667; top 47 and bottom 34 at 390x844), touch and mobile mode. Taps and typing went through `scripts/argent.sh`. Finger drags were real touch events sent with CDP `Input.dispatchTouchEvent`, because argent's swipe does nothing on Chromium and its drag is a mouse drag. The service worker does not register in development (`site/src/sw/service-worker.setup.ts:8`). For the offline and caching checks I built the site into my folder and served it on port 5192. The keyboard is never drawn, so every "under the keyboard" result uses a keyboard height I assumed: 260 px at 375x667 and 336 px at 390x844. Those heights are not measured.

## Findings

**audit-pwa-touch-1. Offline screens say things that are false (major)**
- **Screens and tasks:** `/setlists/:id`, `/setlists`, `/tasks` and `/catalog`. Affects tasks 2, 5, 6 and 12.
- **What happens:** With no working network, the setlist editor says "This setlist no longer exists." The setlists list says "No setlist yet — write the first one." Tasks shows "Nothing on this list." for every member, plus a raw `unknown-error`. The catalogue also shows `unknown-error`.
- **Measurement:** I used the production build with the service worker active, visited each screen online, then cut the network. After a reload `navigator.onLine` was true again, so no offline banner showed. That is the same state as a phone with one bar of signal. Session detail and song detail did load from the cache.
- **Root cause:**
  - `public/sw.js:80-91` caches neither `/api/setlists` nor `/api/setlists/:id`, nor tasks, transitions or takes.
  - `routes/setlists/SetlistEditorPage.tsx:60` treats a failed request as "not found".
  - `routes/setlists/SetlistsPage.tsx:38-43` shows an error only for an `ApiError`, so a network failure renders the empty list.
- **Screenshots:** `shots/375x667-offline_setlists_id.png`, `offline_setlists.png`, `offline_tasks.png`, `offline_catalog.png`, `offline_sessions_id.png`

**audit-pwa-touch-2. Setlists open one change out of date (major)**
- **Screen and tasks:** `/setlists/:id`, with the service worker active. Affects tasks 2, 5 and 12.
- **What happens:** A setlist opens in the order it had before a bandmate's last change. Only the next opening shows the new order.
- **Measurement:** I reversed the order on the server, as another member would. On the next opening the first song was still Slow Burn. On the opening after that it was Sweet Dreams.
- **Root cause:** `public/sw.js:124-135` (`staleWhileRevalidate`) answers from the cache first and refreshes the cache only in the background. This applies to every path in `sw.js:80-91`.
- **Screenshot:** `shots/375x667-sw-stale-after-bandmate-reorder.png`

**audit-pwa-touch-3. The offline banner says edits are disabled, but they are not (major)**
- **Screens and tasks:** the offline banner, on every screen. Affects tasks 5 and 6.
- **What happens:** The banner says "All edits are disabled", yet every field stays editable. An edit made offline is accepted with no sign that it is waiting. It is sent when the network returns, but only if the app stayed open, because the queue lives in memory.
- **Measurement:** I typed a setlist note offline. There was no error and no waiting sign. After reconnecting, the note reached the server.
- **Root cause:** the banner text is at `i18n/en.json:194`. `lib/query-client.setup.ts:10-15` keeps TanStack Query's default of pausing changes while offline, and nothing on screen shows it.
- **Screenshots:** `shots/375x667-offline-banner-in-place.png`, `offline-note-typing.png`, `offline-note-after-close.png`

**audit-pwa-touch-4. A transition note is lost without warning (major)**
- **Screen and task:** the transition comment modal on `/setlists/:id`. Affects task 5.
- **What happens:** Tapping outside the modal, pressing back or pressing Escape throws the draft away. Entry notes on the same screen save on every key press, so the two note fields follow opposite rules.
- **Measurement:** With real taps through argent, I typed a transition note, tapped the backdrop and reopened the modal: the box was empty. The same sequence on an entry note kept the text.
- **Root cause:** `TransitionCommentModal.tsx:176` uses `openDismissibleDialogOnAttach` (in `lib/modal-dialog.adapter.ts`), and the draft is local state only (line 155). Entry notes save per key press in `SetlistEntryNotesField.tsx:33-37`.
- **Screenshots:** `shots/argent-375x667-transition-typed.png`, `argent-375x667-transition-reopened-after-backdrop-tap.png`, `argent-375x667-entry-sheet-typing.png`

**audit-pwa-touch-5. A pasted chord chart creates a triple scroll (major)**
- **Screen and task:** the chord chart section of `/catalog/:id/edit`. Affects task 9.
- **What happens:** A chart pasted from a website gives three vertical scroll areas: the page, the ChordPro box and the preview. The preview sits above the form, so it cannot be seen while typing chords.
- **Measurement:** With a 66-line chart at 375x667, the page is 2321 px tall. The preview box is 367 px tall and holds 2040 px. The text box is 367 px tall and holds 3328 px. While the text box is focused, the top of the preview is at y=-885 at 375x667 and y=-796 at 390x844.
- **Root cause:**
  - `atoms/auto-grow-textarea.utils.ts:1-17` caps the text box at 55% of the screen and gives it its own scroll.
  - `SongChordPreview.tsx:27` caps the preview at `max-h-[55vh]` with its own scroll.
  - `SongEditForm.tsx:121-127` places the preview above the form.
- **Screenshots:** `shots/375x667-edit-song-long-chart-top.png`, `edit-song-long-chart-textarea.png`

**audit-pwa-touch-6. The full task form is hidden at the bottom of `/tasks` (major)**
- **Screen and task:** the new task form on `/tasks`. Affects task 3.
- **What happens:** The form with person, song and due date sits under every task. Its Save button is not visible on arrival, and it stays off screen while typing notes. The quick-add field at the top creates a task with no person and no date.
- **Measurement:** At 375x667 the page is 2.97 screens long. On arrival Save is at y=1831. With the Notes field in view, Save is at y=694, below the 667 px screen.
- **Root cause:** `TaskForm.tsx:190` puts the buttons in `StickyFormActions` (`atoms/StickyFormActions.tsx:10`). That bar only sticks inside the form card, and the card sits at the end of the page.
- **Screenshots:** `shots/375x667-tasks-arrival.png`, `375x667-tasks-notes-keyboard.png`, `390x844-tasks-notes-keyboard.png`

**audit-pwa-touch-7. Editing the lineup closes the entry sheet (minor)**
- **Screen and tasks:** the entry sheet and lineup editor on `/setlists/:id`. Affects tasks 4 and 6.
- **What happens:** Tapping the lineup in the entry sheet closes the sheet. Closing the lineup editor returns to the list, not to the sheet. "Song defaults" behaves the same way.
- **Measurement:** After closing the lineup editor, no dialog is open. The lineup editor's own inner scroll does not move the page behind it: a finger drag inside it moved the page 0 px.
- **Root cause:** `SetlistEntryRow.tsx:118-121` (`openFromSheet`) and `SetlistEntryRow.tsx:229-231`.
- **Screenshots:** `shots/375x667-lineup-editor.png`, `after-lineup-close.png`, `lineup-editor-scrolled.png`

**audit-pwa-touch-8. Save buttons and fields sit under the keyboard (minor)**
- **Screens and tasks:** the transition modal, entry sheet, song picker and song form. Affects tasks 1, 5, 6, 8 and 9.
- **What happens:** These elements fall below the line where the assumed keyboard begins (y=407 at 375x667, y=508 at 390x844):

| Element | y at 375x667 | y at 390x844 |
| --- | --- | --- |
| Transition Save | 437 | 526 |
| Entry sheet notes field | 402 to 486 | — |
| Song form sticky Save | 559 | 702 |

- **Song picker:** it is 85% of the screen tall (`vh`), so with the keyboard up the lower part of its list is hidden.
- **Root cause:**
  - The dialogs are centred with `m-auto` (`TransitionCommentModal.tsx:178`, `SetlistEntrySheet.tsx:52`) rather than anchored to the bottom.
  - `StickyFormActions.tsx:10` pins the bar `3.5rem` above the bottom.
  - `SetlistSongPicker.tsx:75` uses `h-[85vh]`.
  - The viewport tag at `index.html:5` sets no `interactive-widget`.
- **Screenshots:** `shots/375x667-transition-keyboard.png`, `375x667-entry-sheet-keyboard.png`, `375x667-edit-song-chordpro-keyboard.png`, `390x844-edit-song-chordpro-keyboard.png`, `375x667-picker-keyboard.png`

**audit-pwa-touch-9. Dialogs focus Close instead of the field (minor)**
- **Screens and tasks:** the transition modal, entry sheet, song picker and create session dialog. Affects tasks 1, 2, 5 and 6.
- **What happens:** Opening a typing dialog focuses Cancel or Close, so each note costs one extra tap before the keyboard appears. argent's `describe` shows Cancel `[focused]` on the transition modal.
- **Root cause:** there is no `autoFocus` anywhere in `site/src`, so `showModal()` focuses the first button (`SetlistEntrySheet.tsx:55-64`, `CreateSessionDialog.tsx:304`).
- **Screenshots:** `shots/375x667-picker.png`, `375x667-create-session.png`

**audit-pwa-touch-10. Header buttons sit inside the top safe area (minor; a blocker if the status bar style changes)**
- **Screens and tasks:** every screen at 390x844 with a top inset of 47. Affects all tasks.
- **What happens:** Each screen's first row of buttons starts above y=47:
  - `/catalog`: next session, My part and Stage, at y=25.
  - `/setlists/:id`: four buttons at y=16.
  - Every list page's title, at y=16.
  - The song scene's Leave button, at y=18.
  - After scrolling a setlist, the sticky energy chart pins half under the status bar.
- **Measurement:** only `/catalog/:id/scene` was clear of the top 47 px.
- **Probably hidden today:** `index.html:13` sets `apple-mobile-web-app-status-bar-style` to `default`, which keeps the page below the status bar on iOS.
- **Root cause:** there is no `safe-area-inset-top` anywhere. `AppShell.tsx:186` pads only the bottom, and `SetlistToolbar.tsx:32` uses `sticky top-0`.
- **Screenshots:** `shots/390x844-setlist-top.png`, `390x844-setlist-scrolled-sticky.png`

**audit-pwa-touch-11. The add buttons hide while scrolling down (minor)**
- **Screens and tasks:** the round add buttons on `/setlists/:id`, `/catalog`, `/sessions` and `/setlists`. Affects tasks 2 and 8.
- **What happens:** The buttons slide behind the tab bar on a downward scroll. In the middle of a setlist there is no add button.
- **Measurement:** at 375x667 the button moves from y=551 to y=655 after scrolling down 900 px. Scrolling up 60 px brings it back.
- **Root cause:** `bottom-action-bar.core.ts:45-58` and `BottomActionBar.tsx:5` and `:23`.
- **Screenshots:** `shots/375x667-setlist-mid-fab-hidden.png`, `390x844-setlist-mid-fab-hidden.png`

**audit-pwa-touch-12. Reordering with a finger is hard to control (minor)**
- **Screen and task:** drag to reorder on `/setlists/:id`. Affects task 2.
- **What happens:** Reordering works only from a 20x44 px grip after a 200 ms hold, and auto-scroll makes a song overshoot. A quick flick on the grip correctly scrolls the page instead.
- **Measurement:** I held 350 ms on song 2's grip, dragged to 70 px above the bottom and held 1.5 s. The song landed at position 13 and the page scrolled 873 px.
- **Root cause:** `SetlistEntriesList.tsx:46-48` and `:93-94`, plus the `w-5` grip in `SetlistEntryRow.tsx`.
- **Screenshot:** `shots/375x667-after-touch-reorder.png`

**audit-pwa-touch-13. One save request per key press in entry fields (minor)**
- **Screen and task:** entry notes, key and capo. Affects task 6.
- **What happens:** Typing 23 characters sent 23 save requests. On a weak network they can arrive out of order. Any failure appears at the top of the page, behind the open sheet.
- **Not reproduced:** I saw no wrong final text. An apparent garbled note in an earlier run was caused by my test pressing End inside a wrapped line, not by the app.
- **Root cause:** `SetlistEntryNotesField.tsx:33-37` and `SetlistEntryKeyCapoFields.tsx:83-86` and `:105-108`. Errors render in `SetlistToolbar.tsx:42-48`.
- **Screenshot:** `shots/375x667-entry-sheet.png`

**audit-pwa-touch-14. The More drawer scrolls and is far from the thumb (minor)**
- **Screen and task:** the More drawer. Affects task 3.
- **What happens:** At 375x667 the drawer holds 779 px in 667 px. The account link (y=726) and the language switch (y=668) are off screen. The drawer opens from the left while its button is at the bottom right (313, 611), and its close button is at the top (y=18). It repeats the five tabs first, which pushes Tasks down to y=364.
- **Root cause:** `AppShell.tsx:75-166` uses one sidebar for desktop and phone; the dialog is at `:176-183`.
- **Screenshots:** `shots/375x667-more-drawer.png`, `390x844-more-drawer.png`

**audit-pwa-touch-15. Manifest: no shortcut to what is next, and colours ignore dark mode (minor)**
- **Screen and task:** the manifest and install. Affects task 12.
- **What happens:** The app starts on the catalogue, and its home screen shortcuts are only Catalogue and Setlists, so there is no direct way to the next session. The `theme_color` is fixed blue and `background_color` is fixed cream, while the app has a dark mode. Dark-mode members get a cream flash at launch.
- **Measurement:** read from the files only; the launch screen cannot be shown in the emulator.
- **Root cause:** `public/manifest.webmanifest`, `index.html:6` and `styles/tokens.css:54-56`.
- **Screenshot:** none.

## What I checked and found fine

- **Overlays on the setlist editor do not double scroll:** the entry sheet has 0 inner scroll areas, the picker 1 (its list), the lineup editor 1 (its body) and create session 0. The page behind is locked while a dialog is open (`tokens.css:83-85`).
- **Finger scrolling works:** a drag that starts on a song row scrolls the page, and the member filter strip scrolls sideways (0 to 142 px) without moving the page.
- **Bottom safe area:** the tab bar, the floating buttons and the scene pages all pad for it.
- **Manifest basics are in place:** `display: standalone`, 192 and 512 icons plus a maskable one, `id` and `scope`. The app shell is cached, so the app opens without network.

## What the emulator could not prove

- **Keyboard:** no software keyboard is drawn. The heights I used are assumptions, and iOS panning inside a fixed dialog is not reproduced.
- **Top safe area:** the insets were forced. With `status-bar-style: default`, a real iPhone probably reports a top inset of 0. Android edge-to-edge was not checked.
- **Offline banner:** Playwright reset `navigator.onLine` to true after a reload, so the banner did not show after reopening the app offline.
- **Refresh:** there is no pull to refresh in the emulator, and none in a real installed app either. The app has no refresh control, which makes finding 2 worse.
- **Gestures:** drags were CDP touch events from the Playwright browser, not from argent. Momentum scrolling was not tested.
- **Several members at once:** in finding 2, the bandmate's change was a direct API call, not a second phone.
- **Launch screen and home screen shortcuts:** read from the files only.

## Cleanup

My instance (5182/3182), the production preview (5192) and argent (9282/4382) are stopped. The shared Postgres cluster is still running for the other auditors. `git status` is clean. I logged three friction notes with `scripts/kaizen.sh`.