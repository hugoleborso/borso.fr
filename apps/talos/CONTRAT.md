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

- [ ] Envoyer le devis à Acme | échéance: 2026-10-05 | engagement: engagements/2026-10-05-devis-acme | ajouté: 2026-10-04
- [x] Réserver la salle de sport | échéance: 2026-10-05 | ajouté: 2026-10-04 | fait: 2026-10-05
```

A line's id is `sha1(text + "|" + ajouté)` cut to 10 hexadecimal characters. Attributes after `|` are optional and in any order; unknown attributes are kept as they are when the line is rewritten.

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

### Daily brief

The `## Brief envoyé` section of `journal/AAAA-MM-JJ.md`.

### Graph

`etat/graphe.jsonl` (one relation per line: `source`, `relation`, `cible`, `depuis`, `jusqua`, `vu`, `src`), the pages `second-brain/**.md`, `engagements/*.md`, `objectifs/*.md` (simple YAML front matter, title = first `# ` heading), and `index.md`.

### Messages to Talos

A message is not a file. The Message screen opens a Claude Code session on the web, on the private repository, with the message as its prompt. The link is the one documented under "Pre-fill sessions" in the Claude Code web quickstart:

```
https://claude.ai/code?repositories=<GITHUB_REPO>&environment=<environment id>&prompt=<preamble, a blank line, the message>
```

Each value is encoded with `encodeURIComponent`. The preamble is « Tu es Talos. Lis CLAUDE.md puis réponds à ce message de Hugo : », from the French catalogue. A blank message sends the preamble alone. An environment whose setting is missing is left out of the link, and Claude Code then picks its default one. Beyond 6000 characters the screen warns that the link may be cut.

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
| GET | `/today` | | `{ date, focus: Focus, brief: { date, markdown } \| null, todos: Todo[] (not done, due within two days or undated, 8 at most), pendingProposalCount: number }` |
| GET | `/focus` | | `Focus` |
| PUT | `/focus` | `{ items: FocusItem[] }` (3 at most) | `Focus` |
| GET | `/todos` | | `{ items: Todo[] }` |
| POST | `/todos` | `{ text, dueDate? }` | `Todo`, status 201 |
| PATCH | `/todos/:id` | `{ done?, text?, dueDate? }` | `Todo` |
| GET | `/proposals?status=proposee` | | `Proposal[]` (newest first) |
| POST | `/proposals/:slug/decision` | `{ decision: "acceptee" \| "refusee", comment? }` | `Proposal`; 409 when the proposal is not `proposee` |
| DELETE | `/proposals/:slug/decision` | | `Proposal` back to `proposee`; 409 when the status is not `acceptee` or `refusee`, 404 when unknown. Fires no run |
| GET | `/graph?date=AAAA-MM-JJ` | | `{ nodes: { id, title, type }[], edges: { source, target, relation, since?, until? }[] }` (with `date`, only the relations true on that date) |
| GET | `/pages/*` (path without `.md`) | | `{ path, title, type, frontMatter: Record<string,string>, markdown, outgoingLinks: string[], incomingLinks: string[] }` |
| GET | `/search?q=` | | `{ path, title, excerpt }[]` (20 at most, title matches before content matches) |
| GET | `/messages/claude-code` | | `{ repository, environments: { talos: string \| null, build: string \| null } }`: `GITHUB_REPO` and the two environment settings, `null` when a setting is missing |
| GET | `/push/public-key` | | `{ key }` (public VAPID key) |
| POST | `/push/subscriptions` | `PushSubscriptionJSON` | `{ ok: true }` |
| DELETE | `/push/subscriptions` | `{ endpoint }` | `{ ok: true }` |
| POST | `/push/test` | | `{ ok: true, delivered, removed }`: a test notification to every subscription, with the same expiry rules as `/notify` |

The values `proposee`, `acceptee`, `refusee`, the categories and the priorities are the repository's: data, not identifiers.

The types are inferred from `AppRouter` and each slice's Zod schemas, never written twice by hand:

```ts
type FocusItem = { title: string; why?: string; horizon?: string };
type Focus = { updatedOn: string | null; items: FocusItem[] };
type Todo = { id: string; text: string; done: boolean; dueDate?: string; commitment?: string; addedOn?: string; doneOn?: string };
type Proposal = { slug: string; category: string; status: string; title: string; priority: string; createdOn: string; expiresOn?: string; why: string; draft: string; decisions: string[] };
```

### Machine (no session, bearer token)

| Method | Route | Auth | Body | Effect |
|---|---|---|---|---|
| POST | `/notify` | `Authorization: Bearer <notify-secret>` | `{ title, message, urgent?: boolean, url?: string }` | Web push to every subscription; expired subscriptions (404/410) are deleted. Answers `{ ok: true, delivered, removed }`. Called by the scheduled runs |

### Firing a run

A decision on a proposal calls `POST <fire-url>` with `Authorization: Bearer <fire-token>`, the headers `anthropic-beta: experimental-cc-routine-2026-04-01` and `anthropic-version: 2023-06-01`, and `{ "text": "<secret-phrase>\n<type>: <path of the file in the repository>" }`. Without `fire-url`, the file is still committed and the next scheduled run picks it up. Cancelling a decision fires nothing.

## Screens

- **Aujourd'hui**: the focus (editable), today's brief, today's todos, the number of pending proposals.
- **Todo**: quick add, check, due date, done or not filter.
- **Propositions**: cards with the reason, the draft, and Accept, Refuse, Comment buttons. A decided proposal that is not yet `faite` shows « Revenir sur ma décision », on its card and in the history; after it, the card is decidable again with the comment field open. The toast that confirms a decision carries « Annuler » for six seconds, which does the same.
- **Second brain**: search, a page rendered from markdown with clickable `[[…]]` links, incoming links, and an interactive graph with a date slider.
- **Message**: one field and two links, « Talos » (the reading environment, the main one) and « Construire » (the build environment). Each opens Claude Code in a new tab with the message prefilled; nothing is written to the repository.
- **Réglages** (from the header of Aujourd'hui): registered passkeys (date added, add one, remove any but the last), notifications (state, test, turn off), sign out.
- Every write confirms or reports its failure with a toast, one at a time, an error staying until closed.
- Installable (manifest, icons, service worker), push notifications after a user gesture (iOS requires it), readable offline on the last loaded state.
