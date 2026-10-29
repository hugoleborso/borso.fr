# Migration: from today's pragma styles to DESIGN.md

This file maps every current value to its token in [`DESIGN.md`](./DESIGN.md), and lists the components each step changes. All counts were taken this session: code counts from `grep` over `apps/pragma/site/src` (tests left out), screen counts from the running app with seed data at 390x844 (`buttons.mjs`, output in `buttons-baseline.json`) and from the first-pass inventory at 375x667 (`audit-design-system/static/agg375.txt`).

The steps are ordered by dependency. Each one can ship on its own and leaves the app working.

## Step 1. Colour tokens

Rewrite `site/src/styles/tokens.css` as one `@theme static` block of `light-dark()` values, starting with `--color-*: initial`, and delete the `@media (prefers-color-scheme: dark)` block. To keep the step small, add the old names as aliases of the new ones (`--color-bg-elev: var(--color-surface)` and so on), sweep the components, then delete the aliases in the same pull request or the next one.

### Token renames

| Today | Uses (files) | Becomes |
|---|---|---|
| `bg` | many | `bg` (same) |
| `bg-elev` | 76 (55) | `surface`; in sheets and menus, `raised` |
| `bg-sunk` | 34 (23) | `sunk` |
| `ink-900` | 151 (93) | `ink` |
| `ink-700` | 40 (37) | `ink` (the step between 900 and 700 carried no meaning a reader could see) |
| `ink-500` | 149 (84) | `ink-soft` |
| `ink-400` | 149 (102) | `ink-faint` when it is a placeholder or disabled; `ink-soft` when it is information. Check each use: today `ink-400` is 3.3:1 on `bg-sunk` in light mode, too low for text a person must read |
| `ink-300` | 11 (6) | `line-strong` (it is only used for rules and empty marks) |
| `line`, `line-strong` | | same names, hex with alpha instead of `rgba()` |
| `accent` | | `accent` (dark value changes from `#6b9bd6` to `#7fa9df`) |
| `accent-ink` | 5 (3) | `accent-strong` |
| `accent-soft` | 7 (7) | `accent-soft` (now opaque) |
| `warn` | 23 uses of `*-warn*` (9) | `warn`, darker in light mode (`#b8841a` to `#7d5810`) so it passes 4.5:1 as text |
| `warn-soft` | 6 (5) | `warn-soft` |
| `danger` | 67 uses of `*-danger*` (50) | `danger`, with a dark value at last (`#ef8a76`) |
| `good` | 3 (1) | `good` |
| `surface` (not defined today) | 6 (6) | `surface`. These six files get a background back: `SegmentButton`, `VoteModeToggle`, `VoteCatalogRow`, `VoteProposalRow`, `VoteDeck`, `VoteTally` (finding 9) |
| `status-wip-bg`, `-fg`, `-border` | 3 (1) | `warn-soft`, `warn`, no border |
| `status-rehearsed-bg`, `-fg`, `-border` | 3 (1) | `good-soft`, `good`, no border |
| `member-coral`, `-teal`, `-mustard`, `-plum`, `-sage` | 8 (11) | `member-1` to `member-5`, darker in light mode; `member-6` to `member-8` are new |
| `stage-*` | | same, plus new `stage-line` and `stage-hover` |
| (none) | | new: `raised`, `hover`, `scrim`, `selected`, `on-selected`, `on-accent`, `on-danger`, `danger-soft`, `good-soft`, `on-member`, `focus`, `shadow-umbra`, `shadow-edge` |

### Raw colours in components

| Where | Value today | Becomes |
|---|---|---|
| `button.variants.ts:23`, `OverflowMenu.tsx:33`, `AppShell.tsx:222` | `rgba(26,22,18,0.05)`, `0.04` | `hover` |
| `FilterPillGroup.tsx:43`, `BarsPage.tsx:66`, `MasteryMatrix.tsx:244` | `rgba(26,22,18,0.06)`, `0.02` | `hover` (or `sunk` for the matrix stripe) |
| `AppShell.tsx:180` | `rgba(20,16,12,0.5)` | `scrim` (the More drawer goes with A1 anyway) |
| `SetlistEntryDragPreview.tsx:17` | `rgba(0,0,0,0.28)` | `shadow-raised` |
| `button.variants.ts:26-27`, `SceneTransport.tsx:30`, `SceneSongPill.tsx:16-18`, `SongScenePage.tsx:86,105`, `SetlistScenePage.tsx:148,192` | `rgba(255,255,255,0.03 to 0.2)` | `stage-hover`, `stage-line` |
| `OfflineBanner.tsx:8,18` | `#e0a445`, `#2d251c`, `#f4e2c8` | `warn`, `warn-soft`, `ink` |
| `VoteTally.tsx:28` | `#9a9a9a` | `ink-faint` |
| `tasks-page.core.ts:35` | `#8a8178` | `ink-soft` |
| `members-page.core.ts:27` | `#2d5fa0` (default member colour) | `member-6` |
| `member-color.utils.ts:22-23` | `#1a1814`, `#fffefa` (text on a member colour) | `on-member`. The luminance check can go once members pick from tokens |
| `cover-art.utils.ts:38` | `hsl(<hue per song>, …)` | Neutral tile: `sunk` and `ink-soft` |
| `BrandLogo.tsx:16-17` | `#a238ff`, `#1ed760` | Unchanged. Brand colours of Deezer and Spotify, the one allowed exception |
| `tokens.css` keyframes | `rgba(224,164,69,…)` | `warn` through `color-mix()` |
| `index.html`, `manifest.webmanifest` | `theme-color #2d5fa0`, `background_color #f5f1e8` | `bg` per theme; `#f4efe6` |

**Expected result:** the live inventory finds at most 15 background colours on the app screens (today 61), and dark mode shows the status badges, the danger colour and every hover in dark values.

## Step 2. Type roles

Add the seven roles to `@theme` (`--text-display`, `--text-display--line-height`, `--text-display--font-weight` and so on, as talos does), then sweep.

| Today | Uses in code | On screen today | Becomes |
|---|---|---|---|
| `text-[9.5px]`, `text-[10px]`, `text-[10.5px]`, `text-[11px]` | 1, 6, 1, 10 | 10 and 11 px | `label` if set in capitals, `meta` otherwise. In the scene views, a `stage-*` size |
| `text-xs` (12) | 164 | 12 px is 72% of all text | `meta`; `label` when it is a capital field label or overline (today `Crumb` and the `tracking-[0.16em]` labels) |
| `text-[12px]`, `text-[12.5px]`, `text-[13px]`, `text-[13.5px]` | 2, 11, 23, 11 | 12.5, 13, 13.5 px | `meta` |
| `text-sm` (14), `text-[14px]` | 144, 2 | 14 px | `meta`, or `body` when it is running text or a note |
| `text-[15px]`, `text-base` (16) | 2, 10 | 16 px | `body` |
| `text-[17px]` | 1 (`SetlistEntryRow.tsx:50`, the song title) | 17 px | `title` |
| `text-lg` (18) | 10 | 18 px | `heading` for section headings, `title` for a song or setlist name |
| `text-[20px]`, `text-xl` (20), `text-[22px]` | 1, 11, 1 (`SongCard.tsx:66`) | 20, 22 px | `title` |
| `text-2xl` (24), `text-[26px]` | 22, 2 | 24, 26 px | `display` when it is the page title, `title` otherwise |
| `text-[28px]`, `text-[30px]`, `text-[32px]`, `text-3xl` | 1, 1, 2, 4 | 28, 30, 32 px | `display` |
| `text-[36px]`, `text-4xl` | 1, 4 | 36 px | `display` in mono for the countdown and big counts (`VoteCountdown`, `VotePage`); `stage-*` in `SongScenePage`, `SetlistScenePage` |
| `text-[40px]` in `StreakBadge.tsx:46` | 1 | 40 px | `display` in mono |
| `text-[40px]`, `text-[44px]` in `RecoverPage.tsx:24`, `LoginPage.tsx:29` | 2 | 40 px | `brand` |
| `text-[56px]` in `PageHeader.tsx:36`, `SongDetailHeader.tsx:41` | 2 | desktop only | `display` (no larger desktop title) |
| `body { font-size: 14px }` in `tokens.css` | | | `body` (16 / 24) |
| `font-mono` on notes and statuses | 46 files use `font-mono` | 352 elements | Geist, except keys, capo, tempo, durations, energy, scores and ChordPro |

Files with a hand-typed size today (all of them change): `MemberTaskColumn`, `AccountSettings`, `ConcertEditForm`, `ChordChartViewer`, `TransitionStrip`, `InstrumentsList`, `VoteDeck`, `BarsKanban`, `SongDetailHeader`, `CompositionDetail`, `SetlistSongPicker`, `BarsList`, `RecordingSheet`, `SetlistEntryRow`, `VotingRoundPanel`, `TaskForm`, `BarPlaceSearch`, `SongDetailSidebar`, `SongCard`, `ConcertReadView`, `AppShell`, `AudienceVoteList`, `MasteryMatrix`, `AttachSetlistDialog`, `StreakBadge`, `SongNotes`, `LineupSlots`, `InstallPhoneScreen`, `LineupEditor`, `SetlistEntryDragPreview`, `StandingSongRow`, `PageHeader`, `TaskRow`, `MemberLineup`, `SetlistSummaryRow`, `SceneSongPill`, `PoolSongRow`, `SetlistEntryKeyCapoFields`, `MemberPartGlyphs`, `EnergyBar`, `EnergyMeter`, `button.variants.ts`, and the pages `RecoverPage`, `ComposPage`, `LoginPage`, `SetlistScenePage`, `SetlistVotePage`, `StudiesPage`, `SessionsPage`, `InstrumentsPage`, `ImprovementsPage`, `MembersPage`.

**Expected result:** at most 6 distinct font sizes on the app screens outside the scene views (today 18), and 0 `text-[` in `site/src`.

## Step 3. Buttons with icons

### Variants and sizes

| Today | Uses | Becomes |
|---|---|---|
| `variant="accent"` | 37 | `primary`. Then check each screen: only one may stay `primary`; the others become `secondary` |
| `variant="primary"` (black fill) | 3 | `primary` if it is the screen's main action, `secondary` otherwise. Black fill now means "selected" |
| `variant="default"` | 13 | `secondary` |
| `variant="ghost"` | 52 | `quiet`; or `IconButton` when the button has no text |
| `variant="danger"` | 1 | `danger` inside the confirm sheet |
| `variant="stage"` | 9 | `stage`, with `stage-*` tokens instead of `rgba()` |
| `size="sm"` (`text-xs`, 44 min height) | 41 | `md` by default; `sm` only inside dense rows |
| `size="md"` (`text-[13px]`) | 8 | `md` |
| `size="lg"` | 4 | `lg` |
| `size="icon"` (the 48 px round floating button) | 4 | Deleted. The action moves to the `ActionBar` as a `primary` `lg` button with words (A7) |
| `ghost w-11 px-0` written by hand | 8 places in 7 files | `IconButton`: `AudienceVoteLink`, `VoteEntryLink`, `NextConcertStrip`, `SetlistEntrySheet`, `SetlistHeaderActions` (2), `SetlistEditorPage`, `SetlistVotePage` |
| A "×" text glyph | 11 files: `TaskRow`, `MembersPage`, `InstrumentsList`, `BarsList`, `VoteProposalRow`, `SongExternalLinks`, `LineupEditor`, and the close glyph of `CreateSetlistDialog`, `CreateSessionDialog`, `AttachSetlistDialog`, `SongDefaultsDialog` | `IconButton` with `close` or `trash`, labelled ("Supprimer la tâche"); in dialogs, the `Sheet` header's close button |
| `buttonVariants` on a `Link` (6), `Button` inside `Link` (5) | 11 | `ButtonLink`: `SongDetailHeader`, `SongEditForm`, `CatalogPage`, `NotFoundNotice` and the other callers |
| Raw `<button>` | 57 | `Button`, `IconButton`, `Chip` (a choice) or `ListRow` (a row) |

### Text-only buttons today

In the code, 116 of 176 `<Button>` and `<button>` elements have no icon. On screen at 390x844, 149 of the 271 tappable buttons on 17 screens show text and no icon. Most of those are rows and filter choices, which `DESIGN.md` does not count as buttons. The ones that are actions, and their icon from the verb table:

| Screen | Button | Icon |
|---|---|---|
| `/catalog/new`, `/catalog/:id/edit`, `/bars`, `/members`, `/account` | "Enregistrer" | `check` |
| `/setlists/:id/vote` | "Ouvrir un vote" (also a ghost, finding 3) | `vote`, and it becomes `primary` |
| `/sessions/:id` | "Détacher" | `unlink` |
| `/improvements` | "Supprimer", "Ajouter" | `trash`, `plus` |
| `/bars` | "Copier le message personnalisé" | `copy` |
| `/studies` | "Révisé" | `check` |
| `/tasks`, `/members`, `/instruments` | "×" | `close` or `trash`, as `IconButton` |
| `/account` | "Changer de mot de passe", "Ajouter une passkey" | `key` |
| Every dialog | "Annuler", "Fermer" | `close`; inside a `Sheet`, removed from the header |

The files with the most buttons without an icon, and so the most to change: `LineupEditor` (6), `SceneControls` (6), `CreateSessionDialog` (5), `TaskForm` (5), `ImprovementsPage` (5), `CalendarFeedForm` (4), `SongDefaultsDialog`, `StudyRow`, `BarForm`, `BarsList`, `CreateSetlistDialog`, `VoteClosePanel`, `VoteProposalRow`, `InstrumentsPage` (3 each). The full per-file count is in the `buttons-baseline.json` run and can be repeated with the same `grep`.

### Components that change in this step

- `atoms/button.variants.ts`, `atoms/Button.tsx`: new variants and sizes; `icon` becomes a required prop.
- New `atoms/IconButton.tsx`, `atoms/ButtonLink.tsx`, each with a blueprint following `atom-variant`.
- `atoms/Icon.tsx`: `size` becomes `'sm' | 'md' | 'lg'`; new glyphs `arrowR`, `key`, `unlink`, `expand`, `share`, `bulb`.
- `organisms/AppShell.tsx`: Bars takes `beer`, Améliorations takes `bulb`.
- Every caller of `Button`. Because `icon` is required, the type checker lists every call site that still needs one, which is the work list for this step.

**Expected result:** `buttons.mjs` finds 0 action buttons without an icon and 0 icon-only buttons without a name (today 2, both on the setlist page). At most 6 button looks on screen (today 45).

### Icon sizes

| Today | Uses in code | Becomes |
|---|---|---|
| `size={10}`, `size={12}` | 4, 13 | `sm` (16), or drop the icon when it only decorates a badge |
| `size={14}` | 44 | `sm` |
| `size={16}` (the default) | 15 + every call without `size` | `sm` next to `meta` text, `md` in buttons |
| `size={18}`, `size={19}`, `size={20}` | 14, 2, 4 | `md` |
| `size={22}`, `size={24}` | 4, 2 | `lg` |

## Step 4. One Sheet for every overlay

New `molecules/Sheet.tsx` and `sheet.variants.ts`. Each dialog below moves onto it; the class string each one copies by hand today goes.

| Dialog today | Becomes |
|---|---|
| `SetlistEntrySheet` | `Sheet`, automatic save with a visible "Enregistré"; lineup edited inline; "Retirer de la setlist" moves to the row's `Menu` |
| `LineupEditor` | Inline mode inside the entry sheet, and a `Sheet` when opened alone. Its icon box gets a visible label |
| `SetlistSongPicker` | `Sheet`, full height; the list is the sheet body |
| `TransitionCommentModal` | `Sheet`, explicit save, keeps its draft when closed by the scrim |
| `SongDefaultsDialog` | `Sheet`, explicit save |
| `CreateSessionDialog` | `Sheet`, explicit save; focus on the first field, not on "Annuler" |
| `CreateSetlistDialog`, `AttachSetlistDialog` | `Sheet`, explicit save |
| `RecordingSheet`, `TakeUploadForm` | `Sheet` |
| `ListenLinksDialog` | `Sheet` |
| `InstallWalkthroughSheet` | `Sheet` |
| `ConfirmDialog` | `Sheet` with `size="confirm"` |
| The More drawer in `AppShell` | Deleted with the four-tab bar (A1); until then, a `Sheet` |
| `SongScenePage`, `SetlistScenePage` dialogs | Stay as they are (stage mode, low priority), but take `stage-*` tokens |

Today: 5 widths, 3 heading styles, 4 ways to close, and the main button between 53% and 72% of the screen height (finding 1). **Expected result:** no `<dialog>` outside `Sheet.tsx` and the two scene pages; every sheet's main button in the bottom 15% of the screen; 1 vertical scroll area with any sheet open.

## Step 5. The molecules that hold the rules

| New or changed | Replaces or merges | Files that change |
|---|---|---|
| `ActionBar` | `BottomActionBar`, `StickyFormActions` | `CatalogPage`, `SetlistsPage`, `SessionsPage`, `SetlistEditor` (the two round buttons), `SongEditForm`, `BarForm`, `QuickAddForm`, `bottom-action-bar.core.ts` and its hook |
| `SegmentedControl` | `SegmentButton`, `FilterPillGroup`, `MemberFilterPills`, `VoteModeToggle`, `LanguageSwitcher` | Their callers on `/catalog`, `/setlists/:id`, `/setlists/:id/vote`, `/account` |
| `Chip` (now a choice) | The status tones of today's `Chip` move to `Badge` | `StatusChip` becomes a `Badge` tone; chips in `LineupEditor`, `SongDefaultsDialog`, `InstrumentPlayerChips` |
| `Badge` | `PointsBadge`; the `mono` tone goes | `badge.variants.ts`, `TaskRow` (ellipsis), `StreakBadge`, `MasteryBadge`, `EnergyBadge` |
| `ListRow` | Row layout in `SongCard`, `SetlistEntryRow`, `PoolSongRow`, `VoteCatalogRow`, `StudyRow`, `TaskRow`, `StandingSongRow`, `SetlistSummaryRow` | Those eight files |
| `Section` | Section cards, four heading styles, `Card variant="bare"` | `SongDetail`, `SessionDetail`, `SongNotesCard`, `SongLinksCard`, `ContactDetailsCard`, `CalendarFeedCard`, `PasskeysCard`, `PasswordChangeCard` |
| `PageHeader` | `BackLink`, `Crumb`, 8 page title styles | Every page under `routes/` |
| `Field` | `HintText`, label and error markup | Every form organism (`SongEditForm`, `ConcertEditForm`, `TaskForm`, `BarForm`, `MemberEditForm`, `ContactDetailsForm`, `PasswordChangeForm`, `CalendarFeedForm`, `SignInForm`, `RecoverPasswordForm`) |
| `Menu` | `OverflowMenu` | Its callers; each item gets an icon |
| `EmptyState` | Ad hoc empty texts | Lists with an empty case |
| `Card` | `flat` and `bare` variants go | 1 use of `flat`, 3 of `bare` |
| `Avatar` | 22 px size goes | `avatar.variants.ts` and callers of `size="sm"` |
| Deleted atoms | `EnergyBar` (no importer outside its test), `SegmentButton`, `PointsBadge`, `Crumb`, `HintText`, `StickyFormActions` | |

## Step 6. Shape, depth and space

| Today | Uses | Becomes |
|---|---|---|
| `rounded-sm` (4) | 10 | `radius-sm` |
| `rounded` (Tailwind 4 px) | 7 | `radius-sm` |
| `rounded-md` (8) | 70 | `radius-md` |
| `rounded-lg` (14) | 24 | `radius-lg` |
| `rounded-xl` (22) | 5: `album-cover.variants.ts`, `VoteTally`, `VoteProposalRow`, `VoteClosePanel`, `VoteDeck`, `VoteCatalogRow` | `radius-lg` |
| `rounded-2xl` | 2 | `radius-lg` |
| The 1 px radius one-offs | 50 elements on 1 screen | `radius-sm` or none |
| `shadow-lg` | 5 (the round floating buttons and menus) | `shadow-overlay` for menus; deleted with the floating buttons |
| `shadow`, `shadow-2xl` | 3, 1 | `shadow-raised`, `shadow-overlay` |
| Ring shadows in `bg-elev` and `bg` (avatar stacks) | 218 elements | `ring-2 ring-surface`, unchanged in look |
| `gap-1.5`, `px-1.5`, `py-1.5` (6 px) | 63 in code, 593 gaps on screen | `2` (8 px) |
| `gap-2.5`, `p-2.5` (10 px) | 52 in code | `2` or `3` |
| `gap-0.5`, `p-0.5` (2 px) | 24 in code | `1`, except inside badges |
| `3.5`, `5`, `7`, `9`, `10`, `12` steps | 12, 18, 24, 25, 4, 1 in code | The nearest of `3`, `4`, `6`, `8`. Sizes of fixed boxes (`w-7`, `h-10`) are widths, not spacing, and stay when they match an avatar or icon size |
| `pb-20`, `py-20` (80 px) | 14, 3 | Bottom padding that keeps content above the tab bar and action bar: one `--spacing-bottom-bars` value computed from the tab bar height, the action bar height and `env(safe-area-inset-bottom)`; `py-20` on empty states becomes `py-8` |

Files with radii or shadows outside the scale: `album-cover.variants.ts`, `VoteTally`, `VoteProposalRow`, `VoteClosePanel`, `VoteDeck`, `VoteCatalogRow`, `AppShell`, `FilterPillGroup`, `InstallPhoneScreen`, `SetlistEntryDragPreview`, `OverflowMenu`, `button.variants.ts`, `BarsPage`.

## Step 7. Gates

Each rule is only true while something checks it. The repository's standards require each gate to be cited in its document under `docs/standards/`, so the enforcement ledger stays honest.

| Rule | Gate |
|---|---|
| Every button has an icon | The type of `Button` and `ButtonLink` (`icon` required) |
| Icon-only buttons have a label | The type of `IconButton` (`label` required) |
| No raw `<button>`, `<dialog>` outside their atom or molecule | New ESLint rule in `eslint-rules/`, with its `RuleTester` suite |
| No arbitrary values (`text-[`, `bg-[`, `rounded-[`, `shadow-[`) and no hex or `rgba()` in components | New ESLint rule on `className` strings and `.variants.ts` files, with the `BrandLogo` exception written on its line |
| One scroll per screen | End-to-end test opening every route and sheet at 375x667 and 390x844 (A6) |
| Contrast | A test over the token values, like `final-contrast.mjs` |

## What I could not prove

- Every number above was measured in Chromium with the phone emulated. Nothing was tried on an iPhone.
- The on-screen button count covers 17 screens with the seed data, signed in as Hugo, with no dialog open. Buttons inside dialogs were counted from the code only.
- The contrast values are computed from the token values, not measured on rendered pixels, so text over a translucent `line` or over an image is not covered.
