# Talos contract

Talos is a personal assistant for one person, its owner. Scheduled agent runs keep a private Git repository of notes, tasks and proposals up to date; this progressive web app is how the owner reads and edits that repository from a phone. It is served at `https://talos.borso.fr`.

The file formats below belong to the private repository, so their keys and section headings stay in French: they are data, not identifiers. Every example in this document is fictional.

## Principles

- **Git is the only source of truth for content.** The API reads and writes the files of the private repository named by `GITHUB_REPO` through the GitHub API, with a fine-grained token limited to "contents" read and write on that one repository. Every write is a commit with a French message, such as `pwa : todo cochée …`. The scheduled runs and the app share the same state that way.
- **What is not content lives in the database**: passkeys, WebAuthn challenges, push subscriptions, sessions and sign-in attempts. It follows [`docs/standards/11-database.md`](../../docs/standards/11-database.md): an Aurora DSQL cluster of its own, `talos-cluster` (`DsqlClusterStack`), and the `prod` schema (`DsqlSchema` through `PreviewableApp`), as pragma does. Drizzle tables live in each slice's `<slice>.schema.ts`; `pnpm --filter @borso-app/talos run db:generate` writes the migrations into `api/src/database/migrations/`, and the migration runner of `@borso/infra` applies them on deploy. Only `*.repository.ts` files reach the database.
- **Secrets** are SSM Parameter Store SecureStrings under the `/talos/` prefix (`TALOS_SSM_PREFIX`; the Lambda may read `/talos/*` and nothing wider): `github-token`, `vapid-public`, `vapid-private`, `session-hmac`, `bootstrap-code`, `notify-secret`, and optionally `fire-url`, `fire-token`, `secret-phrase`. Two settings that are not secret live under the same prefix as plain `String` parameters, so that this public repository holds neither: `claude-environment-talos` and `claude-environment-build`, the ids of the two Claude Code environments the Message screen opens.
- **One user.** Sign-in is by passkey (WebAuthn, `@simplewebauthn/server` 13, relying party `TALOS_RP_ID` = `talos.borso.fr`). The first registration requires the bootstrap code read from SSM. Once a passkey exists, registration closes; a second passkey is added from a signed-in session.
- **The interface is in French only**, from one catalogue, `site/src/i18n/fr.json`. Identifiers, routes and API JSON fields are in English, per `borso/no-french-identifiers`. [`VOCABULARY.md`](./VOCABULARY.md) maps each French file key to its English name.
- **Production only.** There is no preview stage: a preview would serve the private repository's content on a `preview.borso.fr` host. See [ADR-0027](../../docs/adr/0027-talos-deploys-to-prod-only.md).

## File formats in the private repository

### `focus.md`

```markdown
---
maj: 2026-10-05
---
# Focus du moment

- **Préparer l'atelier client** — la date approche | horizon: 2026-10-05
- **Organiser le voyage à Lisbonne** — billets à réserver avant le 16 | horizon: 2026-10-15
- **Écrire les objectifs du trimestre** — demandés par Alice | horizon: 2026-10-15
```

Three items at most. `pourquoi` (the text after the dash) and `horizon` are optional.

### `todo.md`

```markdown
# Todo

- [ ] Envoyer le devis à Acme | échéance: 2026-10-05 | engagement: engagements/2026-10-05-devis-acme | src: sources/2026/10/04/appel-acme.md | ajouté: 2026-10-04
- [ ] Relire le contrat | src: https://exemple.fr/fil/42 | ajouté: 2026-10-04
- [x] Réserver la salle de sport | échéance: 2026-10-05 | src: gmail 19c56c593c4f42c8 | ajouté: 2026-10-04 | fait: 2026-10-05
```

A line's id is `sha1(text + "|" + ajouté)` cut to 10 hexadecimal characters. Attributes after `|` are optional and in any order; unknown attributes are kept as they are when the line is rewritten.

`src` names the item the todo came from, and is optional. The app reads it three ways:

- a path of the repository, with or without `.md`, such as `sources/2026/10/04/appel-acme.md`: shown rendered from markdown;
- a web address starting with `http://` or `https://`: shown as a link;
- anything else, such as a mail identifier: shown as it is written.

The `sources` key of a commitment's front matter follows the same three rules, one value or a list in brackets (`sources: ["sources/…md", "gmail 1a0f…", "https://…"]`).

### Proposals: `etat/propositions/AAAA-MM-JJ-<slug>.md`

```markdown
---
type: proposition
categorie: action        # action | initiative | idee | logistique | construction
statut: proposee         # proposee | acceptee | refusee | faite | expiree
titre: Décaler la réunion d'équipe pour l'atelier client
priorite: haute          # haute | normale | basse
cree: 2026-10-04
expire: 2026-10-05
---
## Pourquoi
…

## Ce que Talos propose
The exact draft (email, message, change) that runs if the owner accepts.

## Décision
```

On a decision the API sets `statut` to `acceptee` or `refusee`, appends a line `- 2026-10-05 10:12 : acceptée — <comment>` under « Décision », and fires the "message" run (see below). Talos later sets the status to `faite`.

While the status is still `acceptee` or `refusee`, the owner can cancel the decision: the API sets `statut` back to `proposee` and appends a line `- 2026-10-05 10:13 : décision annulée` under « Décision », without firing any run. Earlier lines are never removed, so the section keeps the whole history. A proposal that is `faite` or `expiree` can no longer be cancelled. A run that reads a proposal must therefore take its status from the front matter, not from the last line it finds under « Décision ».

### Daily brief and activity: `journal/AAAA-MM-JJ.md`

One file per day, starting with `# 2026-10-08`, then `## ` sections. The brief is the section whose line is exactly `## Brief envoyé`. It ends at the next line starting with `## ` or at the end of the file; it holds markdown without an inner `## ` heading, and a `---` inside it does not end it. A file holds one brief at most. The other `## ` headings of today's and yesterday's journal, newest first, are what the today screen lists as Talos's recent activity.

The history lists the files whose name matches `^\d{4}-\d{2}-\d{2}\.md$` and that hold the section; the date is the file name.

### Weekly reviews: `journal/AAAA-Sxx-hebdo.md`

One file per ISO week, named after `^\d{4}-S\d{2}-hebdo\.md$`. The whole file is the review. Its title is the first `# ` line, such as `# Revue hebdo 2026-S41 (5 – 11 octobre 2026)`, and its `## ` sections are optional. The history sorts them by file name, newest first.

### Relations: `etat/relations.json`

```json
{
  "genere": "2026-10-08T03:03:00+02:00",
  "a_recontacter": [{ "page": "second-brain/personnes/alice-martin", "titre": "Alice Martin", "proximite": 5, "dernier_contact": "2026-08-29", "jours": 40 }],
  "anniversaires": [{ "page": "second-brain/personnes/bruno-petit", "titre": "Bruno Petit", "date": "2026-10-20", "dans_jours": 12, "age": 58 }]
}
```

Written by the runs, read by the app. `a_recontacter` is sorted by relative delay, the most overdue first; `anniversaires` holds the birthdays of the next 15 days, sorted by `dans_jours`; `age` may be `null`; `page` has no `.md`. The file may date from the day before, so the API moves `jours` and `dans_jours` by the days elapsed since `genere` and drops a birthday that has passed. A missing or unreadable file shows nothing; an entry the API cannot read is skipped.

### Drafts: `etat/brouillons/AAAA-MM-JJ-<slug>.md`

```markdown
---
type: brouillon
canal: gmail              # gmail | slack | linkedin | whatsapp | imessage | autre
destinataire: "Alice Martin [[second-brain/personnes/alice-martin]]"
sujet: Un café ?          # the subject of an email, empty for the other channels
lien:                     # URL of the Gmail or Slack draft, else empty
statut: pret              # pret | envoye | abandonne
cree: 2026-10-08
src: sources/2026/10/08/relance.md
proposition:              # slug of a linked proposal, optional
envoye:                   # AAAA-MM-JJ, set with statut: envoye
---
The body is the exact text to copy.
```

Only the `.md` files of the folder are drafts (it also holds a `.gitkeep`). `destinataire` may name several people separated by commas, each with an optional `[[page]]` link. The app writes `statut` and `envoye` and nothing else: never another field, never the body. « Envoyé » sets `statut: envoye` and `envoye: <today>`, « Abandonner » sets `statut: abandonne`, and the « Annuler » of the toast sets `statut: pret` back and empties `envoye`.

### Commitments: `engagements/*.md`

```markdown
---
type: engagement
sens: moi->eux      # moi->eux (the owner promised) | eux->moi (owed to the owner)
qui: "[[second-brain/personnes/alice-martin]]"
quoi: Envoyer le devis
echeance: 2026-10-14        # a day, optionally followed by a time
statut: ouvert      # ouvert | fait | abandonne
---
# Envoyer le devis à Acme
```

The app reads the open ones only (`statut: ouvert`). Title = first `# ` heading, else `quoi`, else the path. `qui` is a wikilink to a person's page or a plain name. It never writes them.

A todo whose `engagement` names a commitment stands for it: the today screen shows the todo and not the commitment.

### Last runs: `etat/dernier-scan.json`

```json
{
  "scan": { "date": "2026-10-09T03:24:10+02:00", "par": "nuit", "sources_ok": 9, "sources_ko": ["Strava"] },
  "collecte_mac": { "date": "2026-10-08T23:10:00+02:00", "sources_ok": 5, "sources_ko": [] }
}
```

Written by the runs, read by the app. `par` is `nuit`, `brief` or `session`. A missing key means that run never happened; a missing or unreadable file shows nothing.

### Graph

`etat/graphe.jsonl` (one relation per line: `source`, `relation`, `cible`, `depuis`, `jusqua`, `vu`, `src`), the pages `second-brain/**.md`, `engagements/*.md`, `objectifs/*.md` (simple YAML front matter, title = first `# ` heading), and `index.md`.

A page may carry `proximite:` in its front matter, an integer from 1 to 5 that Talos computes: 5 is intimate or at the heart of the owner's priorities, 1 is functional or contextual. Any other value is ignored, and a page without a valid score counts as 2. The graph pins the page of type `moi` at the centre and pulls every other page towards a circle whose radius shrinks as the score grows, so the score decides the distance to the owner, not the number of hops.

The relation decides how long a link wants to be: short for couple and family (`en_couple_avec`, `parent_de`, `frere_soeur_de`, `cousin_de`, `parrain_de`), medium for friendship and shared flats (`ami_de`, `colocataire_de`, `cofondateur_potentiel`), long for work and projects (every other verb of the vocabulary). A relation whose `jusqua` has passed is longer still and drawn paler. `vu` travels with each edge; the app can weaken a link as its `vu` ages (half-life of six months), a choice fixed by a constant in `site/src/components/organisms/graph-layout.core.ts`.

### Messages to Talos

A message is not a file. The Message screen opens a new Claude Code session on the private repository, with the message as its prompt:

```
https://claude.ai/code/new?repo=<GITHUB_REPO>&environment=<environment id>&q=<preamble, a blank line, the message>
```

The path and the parameter names are the ones both readers of the link accept. `https://claude.ai/code/...` is a universal link: on a phone with the Claude app installed, the app opens it and reads only the `code/new` route with `q` and `repo` (support article « Open the Claude mobile app with a link »), so the older `https://claude.ai/code?prompt=` form landed in the app with an empty prompt. Without the app, the browser opens the same link, and the web reads `q` and `repo` as aliases of `prompt` and `repositories` (Claude Code web quickstart, « Pre-fill sessions »). Both readers side by side: [`docs/knowledge/claude-code-links-open-in-the-app-on-a-phone.md`](../../docs/knowledge/claude-code-links-open-in-the-app-on-a-phone.md). The app documents no `environment` parameter, so a session started from the app may run in its default environment.

Each value is encoded with `encodeURIComponent`. The preamble is « Tu es Talos. Réponds à ce message de Hugo : », from the French catalogue. A blank message sends the preamble alone. An environment whose setting is missing is left out of the link, and Claude Code then picks its default one. Beyond 6000 characters the screen warns that the link may be cut.

Every link that opens Claude Code (the Message screen, « Discuter », the scan button) also copies its prompt to the clipboard on the tap, and a toast says so. Opened from the home-screen app on a phone, the link can land in the Claude app with an empty prompt; Hugo then pastes it.

## API

Every route is under `/api`, JSON, and needs the `talos_session` cookie (HttpOnly, Secure, SameSite=Strict, HMAC-signed, 30 days) unless stated otherwise. Errors are `{ "error": "<French message>" }` with the matching HTTP status. The `AppRouter` type exported by `api/src/app.ts` is the contract the site's Hono client compiles against.

### Sign-in (no session)

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/session` | | `{ signedIn: boolean, registered: boolean }` |
| POST | `/auth/registration/options` | `{ code?: string }` (required while no passkey exists) | WebAuthn registration options |
| POST | `/auth/registration/verification` | `{ response }` | `{ ok: true }` + cookie |
| POST | `/auth/login/options` | | WebAuthn authentication options |
| POST | `/auth/login/verification` | `{ response }` | `{ ok: true }` + cookie |
| POST | `/auth/logout` | | `{ ok: true }` + cleared cookie |
| GET | `/health` | | `{ ok: true }` (probe, touches neither the database nor GitHub) |

The two registration routes also accept a session: that is how a second passkey is added, without a code.

### Passkeys (session required)

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/auth/passkeys` | | `{ items: { id, createdAt }[] }` (oldest first, `createdAt` in ISO 8601) |
| DELETE | `/auth/passkeys/:id` | | `{ ok: true }`; 404 when unknown, 409 when it is the last one, so the owner can never lock themselves out |

### Content (session required)

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/today` | | `{ date, focus: Focus, brief: { date, markdown } \| null, todos: Todo[] (not done: every one due within seven days or overdue, then five undated at most), commitments: Commitment[] (open, due within seven days or overdue, and named by no todo's `engagement`), commitmentCounts: { owed, awaited } (all open ones), activity: { date, heading }[] (6 at most), lastRuns: { scan: RunReport \| null, macCollection: RunReport \| null } \| null, pendingProposalCount: number, soonBirthdays: UpcomingBirthday[] (three days away or closer), reconnectCount: number, readyDraftCount: number }` |
| GET | `/commitments` | | `{ items: Commitment[] }`: the open commitments, soonest due first, undated last |
| GET | `/relations` | | `{ generatedAt: string \| null, toReconnect: PersonToReconnect[], birthdays: UpcomingBirthday[] }`, counted from today |
| GET | `/drafts` | | `{ items: Draft[] }` (newest first) |
| PATCH | `/drafts/:slug` | `{ status: "envoye" \| "abandonne" \| "pret" }` | `Draft`. `envoye` and `abandonne` only from `pret`, `pret` only from `envoye` or `abandonne`; 409 otherwise, 404 when unknown. Commits `pwa : brouillon envoyé <slug>`, `pwa : brouillon abandonné <slug>` or `pwa : brouillon remis prêt <slug>` |
| GET | `/history` | | `{ briefs: { date }[], reviews: { week, title }[] }`, newest first |
| GET | `/history/briefs/:date` | | `{ date, markdown }`; 404 when that day has no brief |
| GET | `/history/reviews/:week` (`AAAA-Sxx`) | | `{ week, title, markdown }`; 404 when unknown |
| GET | `/focus` | | `Focus` |
| PUT | `/focus` | `{ items: FocusItem[] }` (3 at most) | `Focus` |
| GET | `/todos` | | `{ items: Todo[] }` |
| POST | `/todos` | `{ text, dueDate? }` | `Todo`, status 201 |
| PATCH | `/todos/:id` | `{ done?, text?, dueDate? }` | `Todo` |
| DELETE | `/todos/:id` | | `{ todo: Todo, line, position }`: the line is removed from `todo.md` (commit `pwa : todo supprimée « … »`); `line` is the removed line and `position` its rank among the task lines, from 0. 404 when unknown |
| POST | `/todos/restorations` | `{ line, position }` | `Todo`, status 201: the line goes back before the task now at `position`, or after the last task (commit `pwa : todo restaurée « … »`). 409 when the same task is already there, 400 when `line` is not a task line |
| GET | `/proposals?status=proposee` | | `Proposal[]` (newest first) |
| POST | `/proposals/:slug/decision` | `{ decision: "acceptee" \| "refusee", comment? }` | `Proposal`; 409 when the proposal is not `proposee` |
| DELETE | `/proposals/:slug/decision` | | `Proposal` back to `proposee`; 409 when the status is not `acceptee` or `refusee`, 404 when unknown. Fires no run |
| GET | `/graph?date=AAAA-MM-JJ` | | `{ nodes: { id, title, type, proximity? }[], edges: { source, target, relation, since?, until?, seen?, isClosed }[] }`: `proximity` is the page's valid `proximite`, absent otherwise; with `date`, only the relations begun by that date, and `isClosed` when their `jusqua` ended before it; without `date`, `isClosed` for every relation with a `jusqua` |
| GET | `/pages/*` (path without `.md`, under `second-brain/`, `engagements/`, `objectifs/`, `journal/` or `sources/`, or `index`) | | `{ path, title, type, frontMatter: Record<string,string>, markdown, outgoingLinks: string[], incomingLinks: string[] }` |
| GET | `/search?q=` | | `{ path, title, excerpt }[]` (20 at most, title matches before content matches) |
| GET | `/messages/claude-code` | | `{ repository, environments: { talos: string \| null, build: string \| null } }`: `GITHUB_REPO` and the two environment settings, `null` when a setting is missing |
| GET | `/push/public-key` | | `{ key }` (public VAPID key) |
| POST | `/push/subscriptions` | `PushSubscriptionJSON` | `{ ok: true }` |
| DELETE | `/push/subscriptions` | `{ endpoint }` | `{ ok: true }` |
| POST | `/push/test` | | `{ ok: true, delivered, removed }`: a test notification to every subscription, with the same expiry rules as `/notify` |

The values `proposee`, `acceptee`, `refusee`, `pret`, `envoye`, `abandonne`, the categories, the priorities and the channels are the repository's: data, not identifiers.

The types are inferred from `AppRouter` and each slice's Zod schemas, never written twice by hand:

```ts
type FocusItem = { title: string; why?: string; horizon?: string };
type Focus = { updatedOn: string | null; items: FocusItem[] };
type Todo = { id: string; text: string; done: boolean; dueDate?: string; commitment?: string; source?: string; addedOn?: string; doneOn?: string };
type Commitment = { path: string; title: string; direction: 'owed' | 'awaited' | null; counterpart?: string; counterpartName?: string; action?: string; dueDate?: string };
type RunReport = { at: string; trigger?: string; failedSources: string[] };
type Proposal = { slug: string; category: string; status: string; title: string; priority: string; createdOn: string; expiresOn?: string; why: string; draft: string; decisions: string[] };
type PersonToReconnect = { page: string; title: string; closeness: number | null; lastContactOn: string | null; silentDays: number };
type UpcomingBirthday = { page: string; title: string; date: string; daysUntil: number; age: number | null };
type Draft = { slug: string; channel: string; recipients: { name: string; page?: string }[]; subject?: string; link?: string; status: string; createdOn: string; source?: string; proposal?: string; sentOn?: string; body: string };
```

### Machine (no session, bearer token)

| Method | Route | Auth | Body | Effect |
|---|---|---|---|---|
| POST | `/notify` | `Authorization: Bearer <notify-secret>` | `{ title, message, urgent?: boolean, url?: string }` | Web push to every subscription; expired subscriptions (404/410) are deleted. Answers `{ ok: true, delivered, removed }`. Called by the scheduled runs |

### Firing a run

A decision on a proposal calls `POST <fire-url>` with `Authorization: Bearer <fire-token>`, the headers `anthropic-beta: experimental-cc-routine-2026-04-01` and `anthropic-version: 2023-06-01`, and `{ "text": "<secret-phrase>\n<type>: <path of the file in the repository>" }`. Without `fire-url`, the file is still committed and the next scheduled run picks it up. Cancelling a decision fires nothing.

## Discussing an item with Talos

A long press (450 ms, cancelled by a move) on any item of data opens an action sheet: « Discuter » first, then the quick actions of that item (check, edit, delete, accept, refuse, take back, open). « Discuter » opens the same Claude Code link as the Message screen, on the reading environment, with the prompt « Tu es Talos. Lis le fichier du dépôt cité ci-dessous et discutes-en avec Hugo. » followed by the sentence « Tu vas discuter <phrase of the kind> « <title> » (<file>). », where the phrase names the kind (« de la tâche » for one todo, « de la todo » for the whole list, « de l'engagement », « de la proposition »…) and the file is the item's file in the private repository (`todo.md` for one todo and for the list, `focus.md`, `etat/propositions/<slug>.md`, `etat/brouillons/<slug>.md`, `engagements/<slug>.md`, `journal/<date>.md`, `journal/<week>-hebdo.md`, `<page>.md`, `etat/dernier-scan.json`, `etat/relations.json`). On a person to reconnect with, the prompt also asks for a message to get back in touch; on a birthday, for a message and a gift idea.

## Screens

No screen explains its interface: only data, one- or two-word labels and icons. An empty list shows a faint icon.

- **Aujourd'hui**: a dashboard. Header: the day, the age of the last scan and of the last Mac collection with the number of failed sources (a tap or a long press lists them), a « Scanner » icon that opens Claude Code with the prompt « Tu es Talos. Lance le skill talos-scan sur toutes les sources depuis le dernier curseur, traite les décisions et messages de la PWA, puis commit et push. », and the settings. The birthdays three days away or closer come first, then four counters (proposals to decide, overdue todos, commitments owed, commitments awaited) and three shortcuts (ready drafts, people to reconnect with, history), the focus (editable), the week's agenda grouped by day (overdue, today, tomorrow, later days, undated todos), the brief, and Talos's recent activity. Everything opens its detail on a tap.
- **Todo**: check, swipe right to check or uncheck, swipe left to delete (both toasts offer « Annuler »; undoing a deletion puts the line back where it was), tap the text to open the detail, done or not filter, quick add docked above the tab bar.
- **Détail d'une todo** (`/todos/:id`): the todo with check, edit and delete, then its `src` (a repository page rendered, a link, or the identifier as written), then its commitment rendered with the commitment's `sources`, each page folded until tapped.
- **Détail d'un engagement** (`/commitments/<path>`): the commitment rendered and its `sources`, as above.
- **Engagements** (from the counters): the open commitments, filtered by direction.
- **Relations** (from the shortcuts): the coming birthdays (relative day, age when known), then the people to reconnect with (name, days of silence, a closeness dot). A tap opens the person's page.
- **Brouillons** (from the shortcuts): the ready drafts, newest first, then the sent and abandoned ones folded under « Historique ». Each row shows the channel icon, the recipients, the subject and the start of the text. A tap opens the whole text with « Copier », « Ouvrir » when there is a link, and « Envoyé » and « Abandonner » on a ready draft; the toast carries « Annuler ».
- **Historique** (from the shortcuts): the past briefs and the weekly reviews, two filters, newest first, each read as rendered markdown.
- **Propositions**: cards with the reason, the draft, and Accept, Refuse, Comment buttons. A decided proposal that is not yet `faite` shows « Revenir sur ma décision », on its card and in the history; after it, the card is decidable again with the comment field open. The toast that confirms a decision carries « Annuler » for six seconds, which does the same.
- **Second brain**: search, a page rendered from markdown with clickable `[[…]]` links, incoming links, and an interactive graph with a date slider.
- **Message**: one field and two links, « Talos » (the reading environment, the main one) and « Construire » (the build environment). Each opens Claude Code in a new tab with the message prefilled; nothing is written to the repository.
- **Réglages** (from the header of Aujourd'hui): registered passkeys (date added, add one, remove any but the last), notifications (state, test, turn off), sign out.
- Every write confirms or reports its failure with a toast, one at a time, an error staying until closed.
- Installable (manifest, icons, service worker), push notifications after a user gesture (iOS requires it), readable offline on the last loaded state.
