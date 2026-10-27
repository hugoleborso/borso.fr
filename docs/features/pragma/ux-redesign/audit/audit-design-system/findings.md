The harness blocked my write to `findings.md`. As it asked, the full content is below and I have not written it to disk any other way. The screenshots and probe scripts are saved in `docs/features/pragma/ux-redesign/audit/audit-design-system/`, so every screenshot path below existed. The archived copy under `docs/features/pragma/ux-redesign/audit/` keeps the text but not these screenshots. My instance on port 5183 is stopped. The shared Postgres cluster is still running for the other auditors.

# findings.md (content)

All screenshot paths are relative to `docs/features/pragma/ux-redesign/audit/audit-design-system/`.

**How I measured.**
- **From the code:** I searched every `.ts` and `.tsx` file under `apps/pragma/site/src` (tests left out). The scripts and their output are in `static/` (`btn.mjs`, `agg.mjs`, `agg375.txt`).
- **From the running app:** `static/inventory.mjs` opened the 20 screens as an installed phone app, at 375x667 (`live375/`) and at 390x844 (`live390/`). Standalone mode was faked and the safe-area insets were set. It read the computed styles of every visible element.
- **Overlays:** `static/overlays.mjs` opened 11 overlays at both sizes (`overlays/`).
- **Other probes:** `static/songtitle.mjs`, `static/misc.mjs` (vote toggle and dark mode, results in `shots/`) and `static/safetop.mjs`.
- **impeccable:** its source scan found only one advisory, an `animate-bounce` in `InstallPhoneScreen.tsx:121`. Every finding below comes from the inventory, not from that scan.

**Inventory, 18 app screens at 375x667 (scene views left out)**

| Property | What I found |
| --- | --- |
| Font sizes | 18 on screen, 29 in the code (17 typed by hand as `text-[Npx]`). 72% of text elements are 12px, although the body is set to 14px |
| Size and line-height pairs | 28 |
| Font weights | 4 |
| Font families | 3. The monospace font covers 352 text elements on 13 screens |
| Text colours | 12 |
| Background colours | 61 |
| Corner radii | 5 on screen (4, 8, 14, 9999 px and 1 px); the code also has 22 px |
| Shadows | 5 |
| Gaps | 10 |
| Padding combinations | 41 |
| Icon sizes | 11 |
| Button and link looks | 45 |
| Hand-typed `[...]` utilities | 250 |
| Raw colours in the code | 27 |
| `<dialog>` elements | 14, with no shared dialog component |
| Buttons | 121 use the `Button` atom, 57 are plain `<button>` |
| `Button` variant counts | ghost 52, accent 37, default 15, stage 9, primary 3, danger 1 |

**What works and should stay:** the small set of colour tokens, the variant tables in the `*.variants.ts` files, the 44px tap floor, dark mode on the main surfaces, and the serif italic identity.

| id | Screen | Task | What happens | Measurement | Root cause | Sev | Screenshot |
|---|---|---|---|---|---|---|---|
| audit-design-system-1 | All overlays | 1,4,5,6,7 | There is no shared dialog component. Each dialog copies its own classes, so they look and close differently. The ones named "sheet" are boxes in the middle of the screen, not panels that rise from the bottom | 5 widths (26, 28, 30, 34rem, full screen). Headings are 24px, 20px or missing. 4 ways to close: a "×" at the top plus "Annuler" at the bottom (in 5 dialogs), an X icon only, "Annuler" in the header, or Annuler/Fermer at the bottom only. The main button sits at 0.53 to 0.72 of the screen height | `TransitionCommentModal.tsx:59`, `CreateSessionDialog.tsx:293,307`, `CreateSetlistDialog.tsx:51,65`, `SetlistSongPicker.tsx:75`, `SetlistEntrySheet.tsx:52-62`, `SongDefaultsDialog.tsx:60,74`, `LineupEditor.tsx:103,123`, `ConfirmDialog.tsx:25` | major | `overlays/375x667-{create-session,transition,entry-sheet,song-picker,song-defaults,recording}.png` |
| audit-design-system-2 | Entry sheet on `/setlists/:id` | 4,6 | The entry sheet saves as you type and shows no save button and no "saved" message. The transition, defaults and session dialogs opened from the same screen need a tap on "Enregistrer". The lineup override is an unlabelled box of icons | 0 save buttons in the sheet. The lineup box has only an `aria-label` | `SetlistEntrySheet.tsx:90-98,107-111` | major | `overlays/375x667-entry-sheet.png` |
| audit-design-system-3 | `/setlists/:id/vote` | 11 | The page's main action ("Ouvrir un vote", then "Clôturer le vote") and "Appliquer" are ghost buttons: plain text with no border or fill, and the first wraps onto two lines. The page has no back link | 0 filled buttons on the page | `SetlistVotePage.tsx:127-135` | major | `live375/375x667_setlists_setlist_vote.png`, `shots/vote-open-375.png` |
| audit-design-system-4 | catalog, setlists, setlist editor, sessions, session detail, tasks, bars | 1,2,3,8 | "Create" is drawn and placed 5 ways: a round blue icon button floating at bottom right, text buttons floating at the bottom, a field plus "Ajouter" at the top, a blue button in the page, and a header link. In the editor, "copy order" (rare) gets a floating button as big as "add song" | 48px floating circles. The tasks and bars field sits at the top of the screen | `CatalogPage.tsx:141-150`, `SetlistsPage.tsx:49-59`, `SessionsPage.tsx:53-62`, `SetlistEditor.tsx:260-279` | major | `live375/375x667_{catalog,sessions,tasks,setlists_setlist,sessions_session}.png` |
| audit-design-system-5 | Setlist header and 9 other places | 2,11 | There is no icon-button variant. People write `ghost w-11 px-0` by hand in 9 places, and the variant named `size="icon"` is actually the 48px floating button. The setlist header has 4 icons with no words and shows "on" in 2 ways (outlined box, filled blue box) | 4 icon-only actions in one header row | `button.variants.ts:33`, `SetlistHeaderActions.tsx:16-19` | major | `live375/375x667_setlists_setlist.png`, `shots/dark-setlist-375.png` |
| audit-design-system-6 | sessions, tasks, setlist, entry sheet, song edit | 2,3 | Delete looks different on every screen: a trash icon, a "×" text glyph, a menu item, a bordered red "Retirer", and a red text "Supprimer" at the bottom of the edit form | 5 patterns. The `danger` variant is used once | `TaskRow.tsx:68-72`, `SetlistEntryActions.tsx:13-15,29-32`, `OverflowMenu.tsx:17-20`, `SongDeleteAction.tsx:19-23` | major | `live375/375x667_sessions.png`, `live375/375x667_tasks.png`, `overlays/375x667-overflow-menu.png`, `live375/375x667_catalog_song_edit-full.png` |
| audit-design-system-7 | catalog, picker, setlist, vote, studies, tasks, song page | 2,8,10 | One song title is drawn 8 ways, so the same song looks different in the picker and in the setlist | Serif italic at 22, 17, 24 and 40 px. Sans at 14, 13.5 and 12 px | `SongCard.tsx:66`, `SetlistEntryRow.tsx:50`, `TaskRow.tsx:22` | major | `live375/375x667_catalog.png`, `overlays/375x667-song-picker.png`, `live375/375x667_setlists_setlist.png` |
| audit-design-system-8 | catalog, setlist, song defaults, vote, account | 2,4 | "This option is chosen" has 5 looks: a raised segment, a black pill, a blue pill, a blue outline, and blue text | 5 selected styles | `FilterPillGroup.tsx:43`, `MemberFilterPills.tsx:24`, `SegmentButton.tsx:19`, the chips in `LineupEditor`/`SongDefaultsDialog` | major | `live375/375x667_catalog.png`, `overlays/375x667-song-defaults.png`, `shots/vote-open-375.png` |
| audit-design-system-9 | Voting | 11 | 6 components use a `surface` colour that `tokens.css` does not define. Their backgrounds turn transparent, and the selected toggle shows dark text on blue | Contrast 2.79:1 (6.04:1 was intended) | `SegmentButton.tsx:19`, `VoteModeToggle.tsx:26`, `VoteCatalogRow.tsx:42`, `VoteProposalRow.tsx:35`, `VoteDeck.tsx:142`, `VoteTally.tsx:41` | major | `shots/vote-open-375.png` |
| audit-design-system-10 | All screens | all | The type sizes do not form a scale. 72% of text is 12px, so titles, labels and buttons look alike and actions do not stand out | 18 sizes and 28 size/line-height pairs | `tokens.css:63-66` (no type tokens), `PageHeader.tsx:32,36` | major | `live375/375x667_catalog.png`, `live375/375x667_catalog_song-full.png` |
| audit-design-system-11 | song, session, sessions, edit | 6,9,10 | Section headings come in 4 styles: serif italic, small tracked capitals, plain sans, and a fieldset legend. The song page stacks "NOTES" directly over "NOTES LIBRES" | 15 heading class sets. Letter spacing on capitals uses 5 values | grep of h2–h4 class strings | minor | `live375/375x667_catalog_song-full.png`, `live375/375x667_sessions_session.png` |
| audit-design-system-12 | tasks, song, vote | 3,9 | Card corners drift between 8, 14 and 22 px. On `/tasks`, cards sit inside cards, so text starts behind two borders | Text starts about 64px from the screen edge | `card.variants.ts:4-10`, `TaskRow.tsx:31`, `VoteCatalogRow.tsx:42` | minor | `live375/375x667_tasks.png` |
| audit-design-system-13 | Tab bar | 12 | The badges are permanent counts, not news ("16" = songs ready for a concert), so they read like unread messages. The "16" covers the Catalogue icon | Badge against the bar: 1.07:1 | `BottomTabBar.tsx:52-56`, `navigation-badges.hook.ts:27-30` | minor | `live375/375x667_catalog.png` |
| audit-design-system-14 | Tab bar and More drawer | 10,12 | The same `bolt` icon is used for Révisions and Améliorations. "Bars" (venues) uses a bar-chart icon | 2 items share one icon | `AppShell.tsx:37,38,47` | minor | `overlays/375x667-more-drawer.png` |
| audit-design-system-15 | song page, edit, catalog | 9,10 | A button inside a link in 5 places (invalid HTML), next to `buttonVariants` used on the link itself in 6 places. The song page's "Modifier" and "Mode scène" each show up as two controls | 5 nested pairs | `SongDetailHeader.tsx:62-73`, `SongEditForm.tsx:109`, `CatalogPage.tsx:193`, `NotFoundNotice.tsx:19` | minor | `live375/375x667_catalog_song-full.png` |
| audit-design-system-16 | entry sheet, tasks, catalog | 6,3 | The monospace font is used for the entry notes and the task statuses, which are not code or numbers | 352 monospace text elements | `SetlistEntryNotesField.tsx:40`, `badge.variants.ts:12` | minor | `overlays/375x667-entry-sheet.png` |
| audit-design-system-17 | `/tasks` | 3 | A long song title in a task badge cannot wrap, so it runs past the card edge | Seen on Léa's task | `badge.variants.ts:7`, `TaskRow.tsx:51-54` | minor | `live375/375x667_tasks.png` |
| audit-design-system-18 | Dark mode | – | 27 raw colours skip the tokens. The hover colours are written for light mode only. Status chips and member colours have no dark values. The dark block redefines only 13 of the 31 colours | In dark mode the "Répété" chip stays rgb(216,230,208) | `tokens.css:46-62`, `button.variants.ts:23,26-27`, `OverflowMenu.tsx:33` | minor | `shots/dark-catalog-375.png` |
| audit-design-system-19 | 7 screens and the song defaults dialog | 2,12 | Nothing in the code reads `safe-area-inset-top`. At 390x844 the first control starts at y=16 and the defaults dialog at y=12, inside the 47px status bar area. **Not proven:** the status bar style is `default`, and with that setting iOS normally keeps the page below the status bar | First control at y=16 against a 47px inset | `index.html:5,13`, `AppShell.tsx:186`, `SongDefaultsDialog.tsx:60` | minor (unproven) | `live390/390x844_setlists_setlist.png`, `overlays/390x844-song-defaults.png` |
| audit-design-system-20 | new song, edit, bars | 8,9 | The sticky save bar is only as wide as the card and floats over fields in the middle of the form. It covers "Origine" | Bar at y≈559 of 667 | `StickyFormActions.tsx:8` | minor | `live375/375x667_catalog_new.png`, `live375/375x667_bars.png` |
| audit-design-system-21 | Screens showing members | 4 | Member colours are free hex values per member, not the five member tokens. Generated album covers add about 30 more colours | Members use #e0533a, #2f8f6b and others; the tokens define #c4583a and others | `tokens.css:26-30`, `member-palette.utils.ts:1-7` | minor | `live375/375x667_setlists_setlist.png` |

**Scroll areas with an overlay open.** I counted at both sizes and never found two vertical scroll areas at once. The page behind a dialog is locked (`tokens.css:73-75`). The song picker scrolls one list (a 432px box over a 2,569px list), and so does the song defaults dialog. Any scroll trap still has to be checked with a real drag through argent.

**What the emulator could not prove.**
- Nothing was checked on a real phone or in Safari. Standalone mode and the insets were faked, which matters most for finding 19.
- I did not use argent, so this report makes no claim about touch.
- I ran only impeccable's source scan, not its URL scan, because every page is behind sign-in.
- Dark mode was checked on four screens only.

# DESIGN.md draft (content)

> # Design: pragma
> Pragma is the band's working notebook on stage paper: warm paper ground, black ink, one blue for actions, a serif italic for the band's own words (song and setlist titles). Everything else is a plain, quiet mobile tool.
>
> **Palette.** Every colour is one token in `site/src/styles/tokens.css`, written once as `light-dark(<light>, <dark>)`. No raw `rgba()` in components. The tokens are: `bg` (page), `surface` (cards, sheets and rows: this one is new, and the vote screens already need it), `sunk` (tracks, inputs), `ink-900/700/500/400` (text: title, body, meta, hint), `line`/`line-strong`, `accent` and `on-accent` (actions only), `danger` and `on-danger`, `warn`, `good`, the 3 status pairs (also with dark values), `member-1…8` (members pick from this list, not any hex), `hover` (one tint that works in both modes), and `scrim`.
>
> **Type.** Two families plus mono for numbers only. Six sizes in `@theme`: `display` 28/1.05 (page title, serif italic), `title` 20/1.2 (song title wherever a song appears, serif italic), `heading` 16/1.3 (section heading, sans 600), `body` 15/1.45, `meta` 13/1.4, `label` 12/1.3 capitals with 0.08em tracking (field labels only). No `text-[Npx]`. Notes and statuses use sans. Mono is for keys, capo, energy, durations and ChordPro.
>
> **Space and shape.** A 4px grid: 4, 8, 12, 16, 24, 32. Radii: `sm` 6 (inputs, chips), `md` 12 (rows, cards, sheets), `full` (avatars, pills, floating button). No card inside a card: groups use a heading and a 1px line.
>
> **Depth.** One floating shadow (`shadow-float`), used only by the floating button, menus and sheets.
>
> **Components that must exist and be the only way to do the job:**
> - `Sheet`: rises from the bottom, has a grabber, a title, an X at top right, and one sticky bottom bar holding the main button. Every overlay uses it. Each sheet uses one save model only: explicit save, or autosave with a visible "Enregistré" message.
> - `Button` variants: `primary` (accent fill: one per screen), `secondary` (outline), `quiet` (text with an underline on hover; never the main action), `danger`. Plus `IconButton` (44px, ghost, `aria-label` required), and `Fab` (the one floating create button, with an optional text label).
> - `ButtonLink`: `buttonVariants` on a `Link`, never a `Button` inside a `Link`.
> - `Choice`: one selected style (ink fill) for filters, toggles, lineup choices and language.
> - `Row`: avatar or cover, a `title`-size serif title, `meta` line, trailing slot. Shared by the catalogue, picker, setlist, vote, studies and tasks.
> - `SectionHeading`: one style.
> - `RowMenu`: the only place for delete and other rare actions on a row (an overflow menu with danger items, followed by `ConfirmDialog`).
>
> **Layout.** The app shell pads `env(safe-area-inset-top)`. Create actions are always one `Fab` at bottom right, with a text label on the screen's main object (for example "Ajouter un morceau"). Secondary actions go in the header menu. Tab badges only show news, never a count.
>
> **Icons.** One stroke width, three sizes: 16, 20 and 24. One icon per destination. "Bars" gets a venue or pin icon. Révisions and Améliorations get different icons.
>
> **Not done yet.** This is a draft from the audit. Moving to `light-dark()` and renaming the type tokens touches every component.