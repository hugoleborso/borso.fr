# Vocabulary — talos

`talos` is a progressive web app for one person, its owner, over a private Git repository that scheduled agent runs keep up to date. The repository's files are written in French; the code is in English. This file names the English word to use for each notion, in identifiers, routes, JSON fields and file names. The file formats themselves are in [`CONTRAT.md`](./CONTRAT.md).

## Focus

The owner's current priorities, three at most, read from `focus.md`.

Lives in: `api/src/focus/`

- Code: `Focus` (`updatedOn` for `maj`, `items`), `FocusItem` (`title`, `why` for `pourquoi`, `horizon`).
- `focusUpdateSchema` refuses more than three items.
- The pure parsing and writing rules are in `domain/focus.core.ts`, read by both the API and the focus editor.

Not to be confused with: a todo, which is a single task with a due date.

## Todo

One task, one line of `todo.md`.

Lives in: `api/src/todos/`

- Code: `Todo` (`text`, `done`, `dueDate` for `échéance`, `commitment` for `engagement`, `source` for `src`, `addedOn` for `ajouté`, `doneOn` for `fait`).
- Deleting one answers the removed `line` and its `position` among the task lines, which is what a restoration (`reinstateTodo`) needs to put it back.
- Its id is `sha1(text + "|" + addedOn)` cut to 10 hexadecimal characters (`domain/todo-id.core.ts`), so it survives a reordering of the file.
- Attributes the code does not know are kept on rewrite (`domain/line-attributes.core.ts`).

Not to be confused with: a commitment, which is a promise with a page of its own that a todo may point at.

## Proposal

Something Talos suggests doing, waiting for the owner's decision, one file under `etat/propositions/`.

Lives in: `api/src/proposals/`

- Code: `Proposal` (`category`, `status`, `priority`, `createdOn`, `expiresOn`, `why`, `draft` for « Ce que Talos propose », `decisions`).
- The values `proposee`, `acceptee`, `refusee` stay in French: they are data the repository holds, not identifiers.
- A decision appends a line under « Décision » and fires a run (`api/src/helpers/routine/`).
- A cancellation (`cancelProposalDecision`) takes back an `acceptee` or `refusee` decision before Talos acts on it: the status returns to `proposee`, a `décision annulée` line is appended, and no run fires. It is not a third decision, which is why it is not in `PROPOSAL_DECISIONS`.

Not to be confused with: a message, which the owner writes and Talos reads.

## Brief

Today's summary Talos wrote, the `## Brief envoyé` section of `journal/AAAA-MM-JJ.md`.

Lives in: `api/src/today/`

- Code: `Brief` (`date`, `markdown`). The today screen shows it next to the focus, today's todos and the count of pending proposals.

## Commitment

A promise, made by or to the owner, one file under `engagements/`.

Lives in: `api/src/commitments/`

- Code: `Commitment` (`path`, `title`, `direction`, `counterpart` for a wikilink in `qui`, `counterpartName` for a plain name in `qui`, `action` for `quoi`, `dueDate` for `echeance`). `direction` is `owed` for `moi->eux` (the owner promised) and `awaited` for `eux->moi`.
- A todo whose `engagement` names it claims it, and the agenda shows only the todo (`selectUnclaimedCommitments`).
- Read only, open ones only (`statut: ouvert`).

## Source

What a todo or a commitment came from: `src` on a todo line, `sources` in a commitment's front matter.

Lives in: `site/src/components/organisms/source-reference.core.ts`

- Code: `SourceReference`, one of `page` (a path of the repository), `link` (a web address) or `text` (anything else, such as a mail identifier), read by `classifySource`.

Not to be confused with: a page, which is any markdown file of the repository; a source is a pointer that may or may not lead to one.

## Relations

The people the owner should get back in touch with and the coming birthdays, read from `etat/relations.json`, which the runs write.

Lives in: `api/src/relations/`

- Code: `RelationsDigest` (`generatedAt` for `genere`, `toReconnect` for `a_recontacter`, `birthdays` for `anniversaires`), `PersonToReconnect` (`page`, `title` for `titre`, `closeness` for `proximite`, `lastContactOn` for `dernier_contact`, `silentDays` for `jours`), `UpcomingBirthday` (`date`, `daysUntil` for `dans_jours`, `age`).
- `silentDays` and `daysUntil` are moved to today from the day of `genere`, so a file written the day before still reads right.

Not to be confused with: a relation of the graph, which links two pages.

## Draft

A message Talos prepared for the owner to send by hand, one file under `etat/brouillons/`.

Lives in: `api/src/drafts/`

- Code: `Draft` (`channel` for `canal`, `recipients` for `destinataire`, `subject` for `sujet`, `link` for `lien`, `status` for `statut`, `createdOn` for `cree`, `source` for `src`, `proposal` for `proposition`, `sentOn` for `envoye`, `body`), `DraftRecipient` (`name`, `page`).
- The app writes `statut` and `envoye` only (`applyDraftStatus`). The values `pret`, `envoye`, `abandonne` stay in French: they are data.

Not to be confused with: the draft of a proposal (« Ce que Talos propose »), which runs when the owner accepts it, while a draft is sent by the owner.

## History

The past briefs and the weekly reviews of `journal/`.

Lives in: `api/src/history/`

- Code: `HistoryIndex` (`briefs`, `reviews`), `BriefEntry` (`date`), `ReviewEntry` (`week` for the `AAAA-Sxx` of the file name, `title`), `Review` (`markdown`).
- A brief is read with `readBrief` of `api/src/today/today.core.ts`, the same rule as the today screen.

## Run report

When a scheduled run last went through, from `etat/dernier-scan.json`.

Lives in: `api/src/today/last-runs.core.ts`

- Code: `LastRuns` (`scan`, `macCollection` for `collecte_mac`), `RunReport` (`at` for `date`, `trigger` for `par`, `failedSources` for `sources_ko`).

## Discussion subject

The item of data a long press opens the action sheet on, and that « Discuter » hands to Claude Code.

Lives in: `site/src/lib/discussion-subject.core.ts`, `site/src/lib/action-sheet.hook.ts`

- Code: `DiscussionSubjectReference` (one kind per file of the private repository), `selectSubjectFile` names that file.

## Graph

The relations between pages, `etat/graphe.jsonl`.

Lives in: `api/src/graph/`

- Code: `Graph`, `GraphNode` (`id`, `title`, `type`), `GraphEdge` (`source`, `target`, `relation`, `since` for `depuis`, `until` for `jusqu'à`).
- With a date, only the relations true on that date are returned (`domain/graph.core.ts`).

## Page

One markdown file of the private repository's notes.

Lives in: `api/src/pages/`

- Code: `Page` (`path`, `title`, `type`, `frontMatter`, `markdown`, `outgoingLinks`, `incomingLinks`).
- A page's title is its first `# ` heading (`domain/markdown-page.core.ts`).

## Message

A note from the owner to Talos. It is not stored: the Message screen opens a Claude Code session on the web with the message as its prompt.

Lives in: `api/src/messages/`, `site/src/lib/claude-code-address.core.ts`

- Code: `ClaudeCodeTarget` (`repository`, `environments`), what the API answers so the screen can build the link; `ClaudeCodeEnvironment` (`talos` to read and answer, `build` to code and deploy); `buildClaudeCodeAddress` and `composeTalosPrompt` build the link.
- The repository is `GITHUB_REPO`; the environment ids are deployment settings under `/talos/`, never written in this repository.

Not to be confused with: a run, which Talos starts on a schedule or after a proposal decision.

## Passkey, session, push subscription

What is not content, held in the DSQL database.

Lives in: `api/src/auth/`

- Code: `Passkey`, `Session`, `PushSubscription` (the last in `api/src/push/`).
- The last passkey cannot be removed, so the owner cannot lock themselves out.

## Terms this application does not use

- **user**, **account**: there is one person, the **owner**.
- **task**, **item** for a line of `todo.md`: it is a **todo**.
- **suggestion**, **recommendation**: what Talos asks the owner to decide is a **proposal**.
- **note**, **document**, **article**: a markdown file of the repository is a **page**.
- **digest**, **summary**, **report** for the daily text: it is the **brief**.
- **promise**, **engagement** in identifiers: the word is **commitment**.
- **contact**, **friend** for an entry of `etat/relations.json`: it is a **person to reconnect** with.
- **message** for a file of `etat/brouillons/`: it is a **draft**; a message is what the owner writes to Talos.
- **archive**, **log** for the past briefs and reviews: it is the **history**.
