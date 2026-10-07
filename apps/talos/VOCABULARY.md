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

- Code: `Todo` (`text`, `done`, `dueDate` for `échéance`, `commitment` for `engagement`, `addedOn` for `ajouté`, `doneOn` for `fait`).
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

- Code: `commitment`. The app only links to it from a todo and shows it as a page; it has no slice of its own.

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

A note from the owner to Talos, written to `boite/messages/`.

Lives in: `api/src/messages/`

- Code: `Message` (`text`).

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
