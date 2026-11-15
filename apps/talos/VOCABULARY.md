# Vocabulary — talos

`talos` is a progressive web app for one person, its owner, over a memory database that scheduled agent runs keep up to date. The memory's keys and headings are written in French; the code is in English. This file names the English word to use for each notion, in identifiers, routes, JSON fields and file names. The file formats themselves are in [`CONTRAT.md`](./CONTRAT.md).

The rules each term holds, and the tests that hold them, sit beside the code
in the `INVARIANTS.md` its `Invariants:` line names. The repository's own
words are in [`docs/VOCABULARY.md`](../../docs/VOCABULARY.md).

## Focus

The owner's current priorities, three at most, read from `focus.md`.

Lives in: `api/src/focus/`

- Code: `Focus` (`updatedOn` for `maj`, `items`), `FocusItem` (`title`, `why` for `pourquoi`, `horizon`).

Invariants: `api/src/focus/INVARIANTS.md`

Not to be confused with: a todo, which is a single task with a due date.

## Todo

One task, one line of `todo.md`.

Lives in: `api/src/todos/`

- Code: `Todo` (`text`, `done`, `dueDate` for `échéance`, `commitment` for `engagement`, `source` for `src`, `addedOn` for `ajouté`, `doneOn` for `fait`).

Invariants: `api/src/todos/INVARIANTS.md`

Not to be confused with: a commitment, which is a promise with a page of its own that a todo may point at.

## Proposal

Something Talos suggests doing, waiting for the owner's decision, one file under `etat/propositions/`.

Lives in: `api/src/proposals/`

- Code: `Proposal` (`category`, `status`, `priority`, `createdOn`, `expiresOn`, `why`, `draft` for « Ce que Talos propose », `options` for « Options », each one an `option` a decision may name, `decisions`).

Invariants: `api/src/proposals/INVARIANTS.md`

Not to be confused with: a draft, which Talos prepares for the owner to send.

## Brief

Today's summary Talos wrote, the `## Brief envoyé` section of `journal/AAAA-MM-JJ.md`.

Lives in: `api/src/today/`

- Code: `Brief` (`date`, `markdown`). The today screen shows it next to the focus, today's todos and the count of pending proposals.

## Commitment

A promise, made by or to the owner, one file under `engagements/`.

Lives in: `api/src/commitments/`

- Code: `Commitment` (`path`, `title`, `direction`, `counterpart` for a wikilink in `qui`, `counterpartName` for a plain name in `qui`, `action` for `quoi`, `dueDate` for `echeance`). `direction` is `owed` for `moi->eux` (the owner promised) and `awaited` for `eux->moi`.

Invariants: `api/src/commitments/INVARIANTS.md`

## Source

What a todo or a commitment came from: `src` on a todo line, `sources` in a commitment's front matter.

Lives in: `site/src/components/organisms/source-reference.core.ts`

- Code: `SourceReference`, one of `page` (a path of the repository), `link` (a web address) or `text` (anything else, such as a mail identifier), read by `classifySource`.

Not to be confused with: a page, which is any markdown file of the repository; a source is a pointer that may or may not lead to one.

## Relations

The people the owner should get back in touch with and the coming birthdays, read from `etat/relations.json`, which the runs write.

Lives in: `api/src/relations/`

- Code: `RelationsDigest` (`generatedAt` for `genere`, `toReconnect` for `a_recontacter`, `birthdays` for `anniversaires`), `PersonToReconnect` (`page`, `title` for `titre`, `closeness` for `proximite`, `lastContactOn` for `dernier_contact`, `silentDays` for `jours`), `UpcomingBirthday` (`date`, `daysUntil` for `dans_jours`, `age`).

Invariants: `api/src/relations/INVARIANTS.md`

Not to be confused with: a relation of the graph, which links two pages.

## Recurring task

A task Talos redoes at a fixed cadence, such as a weekly watch, read from the memory state `recurring` (`etat/recurrentes.json`), which the runs write.

Lives in: `api/src/recurring-tasks/`

- Code: `RecurringTasks` (`generatedAt` for `genere`, `tasks` for `taches`), `RecurringTask` (`id`, `title` for `titre`, `cadence`, `routine`, `what` for `quoi`, `lastRunOn` for `dernier`, `nextRunOn` for `prochain`, `isDue` for `due`).

Invariants: `api/src/recurring-tasks/INVARIANTS.md`

Not to be confused with: a routine run, which is one firing of the routine by a decision or a message; a todo, which the owner does himself.

## Freshness

How late the summaries of the pages are, read from the memory state `freshness` (`etat/fraicheur.json`), which the agent writes every night.

Lives in: `api/src/freshness/`

- Code: `Freshness` (`generatedAt` for `genere`, `lateCount` for `en_retard`, `pages`), `LatePage` (`slug`, `title` for `titre`, `kind` for `type`, `closeness` for `proximite`, `summarizedOn` for `resume_le`, `factCount` for `faits`, `containedFactCount` for `faits_englobes`, `lateness` for `retard`).

Invariants: `api/src/freshness/INVARIANTS.md`

Not to be confused with: an overdue todo, which the « En retard » tile counts; a recurring task that is due.

## Computed section

A section of a rendered entity whose lines come from the tables at every read and are never stored. There are five: « Faits », « Historique », « Relations », « Comprend » and « Faits récents ».

Lives in: `api/src/memory/computed-sections.core.ts`

- Code: `ComputedSection` (`heading`, `lines`), `Containment` (what « Comprend » and « Faits récents » are built from). A page **contains** another through an open relation of verb `comprend`; the **contained** pages are one level down, the **descendants** two.

Invariants: `api/src/memory/INVARIANTS.md`

Not to be confused with: « Faits », « Historique » and « Relations », whose lines are rows of the page itself.

## Draft

A message Talos prepared for the owner to send by hand, one file under `etat/brouillons/`.

Lives in: `api/src/drafts/`

- Code: `Draft` (`channel` for `canal`, `recipients` for `destinataire`, `subject` for `sujet`, `link` for `lien`, `status` for `statut`, `createdOn` for `cree`, `source` for `src`, `proposal` for `proposition`, `sentOn` for `envoye`, `body`), `DraftRecipient` (`name`, `page`).

Invariants: `api/src/drafts/INVARIANTS.md`

Not to be confused with: the draft of a proposal (« Ce que Talos propose »), which runs when the owner accepts it, while a draft is sent by the owner.

## History

The past briefs and the weekly reviews of `journal/`.

Lives in: `api/src/history/`

- Code: `HistoryIndex` (`briefs`, `reviews`), `BriefEntry` (`date`), `ReviewEntry` (`week` for the `AAAA-Sxx` of the file name, `title`), `Review` (`markdown`).

Invariants: `api/src/history/INVARIANTS.md`

## Run report

When a scheduled run last went through, from `etat/dernier-scan.json`.

Lives in: `api/src/today/last-runs.core.ts`

- Code: `LastRuns` (`scan`, `macCollection` for `collecte_mac`), `RunReport` (`at` for `date`, `trigger` for `par`, `failedSources` for `sources_ko`).

## Discussion subject

The item of data a long press opens the action sheet on, and that « Discuter » hands to Claude Code.

Lives in: `site/src/lib/discussion-subject.core.ts`, `site/src/lib/action-sheet.hook.ts`

- Code: `DiscussionSubjectReference` (one kind per file of the private repository, plus `todos` for the whole list beside `todo` for one line, both carrying the `list` whose file they name), `selectSubjectFile` names that file, `selectSubjectPhraseKey` the words the prompt names its kind with.

## Graph

The relations between pages, `etat/graphe.jsonl`.

Lives in: `api/src/graph/`

- Code: `Graph`, `GraphNode` (`id`, `title`, `type`, `proximity` for `proximite`), `GraphEdge` (`source`, `target`, `relation`, `since` for `depuis`, `until` for `jusqu'à`, `seen` for `vu`, `isClosed`).

Invariants: `api/src/graph/INVARIANTS.md`

## Page

One markdown file of the private repository's notes.

Lives in: `api/src/pages/`

- Code: `Page` (`path`, `title`, `type`, `frontMatter`, `markdown`, `outgoingLinks`, `incomingLinks`, `summarizedOn` for the summary day of an entity, null otherwise).

Invariants: `api/src/pages/INVARIANTS.md`

## Talk to Talos

The « Parler à Talos » link at the end of the tab bar, on every screen. It opens a new Claude Code session on the agent repository, with a short prompt prefilled, in the build environment on the web; from the iOS home-screen app the Claude app drops `environment`, so the session starts in the app's default environment. `/talk` redirects to the same link, for the home-screen shortcut.

Lives in: `api/src/messages/`, `site/src/lib/claude-code-address.core.ts`, `site/src/lib/talk-to-talos.*`

- Code: `ClaudeCodeTarget` (`repository`, `environments`), what `GET /api/messages/claude-code` answers so the site can build the link; `ClaudeCodeEnvironment` (`talos` to read and answer, `build` to code and deploy); `buildClaudeCodeAddress` and `composeTalosPrompt` build the link; `useTalkToTalosLink` gives it to the tab bar and to `/talk`.

Invariants: `api/src/messages/INVARIANTS.md`

Not to be confused with: « Discuter », which opens the same kind of link from the action sheet, about one item, on the reading environment.

## Routine run

One successful fire of the Claude Code routine, started by a decision on a proposal, one row of `routine_run`. Runs started by the former Message screen stay listed with the trigger `message`.

Lives in: `api/src/routine/`, `site/src/lib/routine-run.core.ts`

- Code: `routineRunTable` and its row `RoutineRunRow` (`firedAt`, `trigger`, `subject`, `sessionUrl`), answered by the API as `RoutineRun`; `RoutineTrigger` (`proposition` or `message`, the word that starts the fired line, so it stays in French for a decision).

Invariants: `api/src/routine/INVARIANTS.md`

Not to be confused with: a run report, which says when a scheduled scan last went through; a routine run is started by the owner and has a conversation to open.

## Passkey, session, push subscription

What is not content, held in the DSQL database.

Lives in: `api/src/auth/`

- Code: `Passkey`, `Session`, `PushSubscription` (the last in `api/src/push/`).

Invariants: `api/src/auth/INVARIANTS.md`

## Memory

The owner's memory once it lives in the database: the `memory_*` tables of [`MEMORY-CONTRACT.md`](./MEMORY-CONTRACT.md).

Lives in: `api/src/memory/`

- Code: `memory_entity` rows are **entities** (a page of `second-brain/`: a person, an organisation, a project…; `kind` for the front-matter `type`, `closeness` for `proximite`), with their **aliases**, **facts** (a dated line of « Faits » or « Historique », `section` `facts` or `history`) and **relations** (a dated line of « Relations », `verb` from the **verb** table). A **source** is an immutable file of `sources/`, a **citation** links an entity to the source reference it cites, a **journal entry** is a file of `journal/`, and a **memory document** is any other file kept whole (`preferences/…`, `etat/questions`…).

Invariants: `api/src/memory/INVARIANTS.md`

Not to be confused with: a **page**, which the PWA reads through `api/src/pages/` as a rendered memory slug; a **memory document** is the database row that holds such a file once it is not modelled by a table of its own.

## Agent

A scheduled run or a session of Talos calling the memory API with a bearer token.

Lives in: `api/src/agent/`

- Code: `AgentTokenName` (`lecture`, `build`, `mac`), the environment a token belongs to, recorded as `token_name` on every memory event. `requireAgentToken` gates every `/api/agent/*` route.

Not to be confused with: the owner, who uses the PWA with a passkey session.

## Terms this application does not use

- **user**, **account**: there is one person, the **owner**.
- **task**, **item** for a line of `todo.md`: it is a **todo**.
- **suggestion**, **recommendation**: what Talos asks the owner to decide is a **proposal**.
- **note**, **document**, **article**: a markdown file of the repository is a **page**; in the database, a file kept whole is a **memory document**.
- **digest**, **summary**, **report** for the daily text: it is the **brief**.
- **promise**, **engagement** in identifiers: the word is **commitment**.
- **contact**, **friend** for an entry of `etat/relations.json`: it is a **person to reconnect** with.
- **message** for a file of `etat/brouillons/`: it is a **draft**; a message is what the owner writes to Talos.
- **archive**, **log** for the past briefs and reviews: it is the **history**.
- **log** for the record of writes to the memory: it is a **memory event**.
- **node**, **record** for a page of `second-brain/` in the database: it is an **entity**.
