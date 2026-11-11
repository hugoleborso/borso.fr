# Recurring tasks, and a PWA that opens on an index

The owner asked for two things on 2026-11-11.

First, Talos redoes 13 tasks at a fixed cadence (a weekly watch, a monthly budget check…). He did not know and wants to see them. The agent already publishes them as the memory state `recurring`.

Second, he gets lost in the PWA. His rule for everything Talos shows him is « an index, not a report »: each screen opens on a view that fits one phone screen, shows the whole at a glance and makes visible what is wrong (a state, a counter, a coloured dot). The detail lives behind it, on demand.

## What is wrong today (read in the code and `CONTRAT.md`)

- N1. Five screens have no stable door. Engagements, Brouillons, Relations and Historique are reached only through the pills of « Jour », and a pill disappears when its count is zero (`keepNonZeroCounters`), so the screen cannot be opened that day. « Lancements » sits under the composer of « Message ». Recurring tasks have no screen.
- N2. « Jour » is a report. It stacks birthdays, the brief, the agenda, « En attente », the pills, the focus and the activity, and the pills, the only map of the app, come after the agenda, below the first screen.
- N3. Nothing on « Jour » says at a glance what is wrong, apart from the scan age.
- N4. The « Scanner » prompt names the skill `talos-scan`. The agent's skills lost their `talos-` prefix on 2026-11-11.

## Data shape

Memory state `recurring`, written by the agent, read only:

```json
{"genere": "2026-11-11T18:06:25+01:00",
 "taches": [{"id": "veille-sierra", "titre": "Veille Sierra", "cadence": "hebdomadaire", "routine": "nuit",
             "quoi": "Nouvelles de Sierra…", "dernier": "2026-11-05", "prochain": "2026-11-12", "due": false}]}
```

`cadence` is `hebdomadaire`, `mensuelle` or `trimestrielle`. `routine` is `nuit`, `dimanche` or `collecte-mac`. `dernier` is null when the task never ran. `due` is true once `prochain` is reached.

In code (English, see `VOCABULARY.md`):

```ts
interface RecurringTask {
  id: string;
  title: string;          // titre
  cadence: string;        // kept as data, French
  routine: string;        // kept as data, French
  what: string;           // quoi
  lastRunOn: string | null; // dernier
  nextRunOn: string;      // prochain
  isDue: boolean;         // due
}
interface RecurringTasks { generatedAt: string | null; tasks: RecurringTask[] }
```

## T1. The recurring tasks screen

- T1.1 `GET /api/recurring-tasks` (session required) answers `RecurringTasks`, read from the memory state `recurring`. An unknown cadence or routine is kept as written. A task that does not parse is dropped, the others are kept. A missing or unreadable state answers `{ generatedAt: null, tasks: [] }`. No write, no change to the agent's contract.
- T1.2 The route `/recurring` shows the screen, titled « Tâches récurrentes ».
- T1.3 Its head says at a glance how many tasks there are and how many are due, such as « 13 tâches · 2 dues ». The due count is in the alert colour when it is not zero.
- T1.4 One row per task, due ones first, then by `nextRunOn`, soonest first. A row shows a state dot (alert colour when due, calm otherwise), the title, the cadence, and the last and next run as short days. A task that never ran says « jamais » for its last run.
- T1.5 The state of a row can be read without its text: the dot carries an accessible label, « due » or « à jour ».
- T1.6 The « quoi » text is hidden until the row is tapped, and one tap unfolds it. The routine that runs the task shows with it.
- T1.7 With 13 tasks folded, the list fits one phone screen of 375 by 812 without the rows wrapping to a third line.
- T1.8 An empty list shows the faint empty state, like the other screens.

## T2. « Jour » opens on an index

- T2.1 Right under the header (day, scan age, settings), « Jour » shows an index of tiles, before any other content. Each tile is a door to one area and carries its counter.
- T2.2 The tiles, in this fixed order: « À décider » (pending proposals), « En retard » (overdue todos), « Je dois » (owed commitments), « On me doit » (awaited commitments), « Brouillons » (ready drafts), « Relations » (people to reconnect with), « Récurrentes » (due recurring tasks), « Lancements » (opens the Message screen at its list), « Historique ».
- T2.3 A tile is always shown, whatever its count, and never moves. A count of zero is shown muted. This replaces the row of pills and its `keepNonZeroCounters` rule.
- T2.4 A tile whose count means something is wrong is in the alert colour when the count is not zero: « En retard » and « Récurrentes ». The others stay calm.
- T2.5 The index fits in the first screen of 375 by 812, with the header, without scrolling.
- T2.6 Below the index, « Jour » keeps its content in this order: birthdays, the brief (already folded to three lines), the agenda, « En attente », the focus, the activity. The activity is folded under « Activité · N » and unfolds on a tap.
- T2.7 A long press on a tile keeps the action sheet the pills had.

## T3. Every secondary screen leads back

- T3.1 Engagements and « Tâches récurrentes » get the back link to « Jour » that Brouillons, Relations and Historique already have.
- T3.2 Removing or merging a tab is a product decision, asked in the pull request. The owner answered it on 2026-11-11: see T6.

## T4. The scan prompt names the current skill

- T4.1 The « Scanner » prompt says `scanner-sources` instead of `talos-scan` (the name the agent session gave on 2026-11-11).

## T5. Documents

- T5.1 `CONTRAT.md` describes the route, the screen and the new « Jour ». `MEMORY-CONTRACT.md` lists the `recurring` state key. `VOCABULARY.md` gains « Recurring task ».

## T6. One todo tab with a switch

The owner answered the tab question on 2026-11-11: merge « Todo » and « Taff », with a switch between work, personal and both.

- T6.1 The tab bar has five tabs: Jour, Todo, Décider, Mémoire, Message. The « Taff » tab is gone.
- T6.2 The Todo screen (`/todos`) carries a switch with three choices, in this order: « Perso » (`todo.md`), « Taff » (`todo-taff.md`), « Les deux ».
- T6.3 « Perso » and « Taff » each show their list exactly as the two former screens did: check, swipes, done filter, detail on tap, quick add into that list.
- T6.4 « Les deux » shows both lists on one screen, each under its name, « Perso » first. Every row keeps its actions and acts on its own list. The quick add writes to « Perso », and its placeholder says so.
- T6.5 The choice is kept on the device and is the one shown the next time the tab opens. Without a kept choice the screen opens on « Perso ».
- T6.6 The address `/work-todos` still works: it opens the Todo screen on « Taff ». The detail addresses `/todos/:id` and `/work-todos/:id` are unchanged, and the back link of a work todo returns to the Todo screen on « Taff ».
- T6.7 The « En retard » tile of « Jour » still opens the Todo screen. It counts personal todos, as before.
- T6.8 No API change: the two lists keep their two routes.
- T6.9 `CONTRAT.md` describes the one tab and its switch.

## Evidence asked by the owner

Before and after captures at 375 px of « Jour » (top of the page), Engagements and « Message », plus the new screen, folded and with one row unfolded.

## Out of scope

Writing to the `recurring` state. Changing the tabs. The agent repository.
