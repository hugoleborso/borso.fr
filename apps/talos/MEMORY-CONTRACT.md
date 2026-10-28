# Talos memory API — frozen contract (v1)

Status: frozen 2026-10-16. Every lot (borso.fr API, PWA, talos CLI, importer, verifier, skills) implements exactly this. A change to this file is a change to every lot: do not change it inside one lot; report the need instead.

Language: identifiers, JSON fields, table and column names in English. Values that belong to the owner's data (French front-matter keys, statuses such as `ouvert`, `proposee`, French headings) stay as they are: they are data. borso.fr is a **public** repository: no real data, no real names in code, tests or fixtures — synthetic only (Alice Martin, Acme…).

## 1. Principles

- The database is the single source of truth for the owner's memory.
- All tables live in the app's existing DSQL schema (the stage schema `prod`, created by `DsqlSchema`), prefixed `memory_`, migrated by drizzle like the auth tables. No separate `memoire` schema.
- Slugs are the repository path without `.md` (`second-brain/personnes/alice-martin`, `engagements/2026-10-05-devis-acme`, `sources/2026/10/04/appel-acme`, `journal/2026-10-08`). Keeping paths as slugs means every `[[…]]` link in every body stays valid without rewriting.
- No `DELETE` statement anywhere in memory repositories. Removal = a flag (`archived`, `removed`). Sources are insert-only.
- Every write goes through `POST /api/agent/changes` (agent) or a PWA route (owner); every write also inserts one `memory_event` row in the same transaction.
- DSQL: one DDL per migration statement batch, `CREATE INDEX ASYNC`, no FK enforcement (consistency checked in the service), 3,000 rows / 10 MiB per transaction (the service splits), optimistic concurrency (retry on SQLSTATE `40001`, up to 3 times), `text` ≤ 1 MiB.

## 2. Tables

All timestamps `timestamptz`; "date text" columns hold partial dates as written (`2026`, `2026-09`, `~2026-01`, `2026-10-02`) — never parsed to `date`.

| Table | Primary key | Columns |
|---|---|---|
| `memory_entity` | `slug` | `kind` text (front-matter `type`: personne, organisation, projet, domaine, concept, reunion, carte, moi, objectif, autre), `title` text, `summary` text null (body of « En bref »), `body` text (the page body below the front matter, with the *lines* of « Faits », « Historique » and « Relations » removed but their `## ` headings kept in place), `attributes` jsonb (the whole front matter as parsed: strings, or arrays of strings), `closeness` int null (1–5), `closeness_reason` text null, `confidentiality` text null, `archived` boolean default false, `version` int default 1, `created_at`, `updated_at` |
| `memory_alias` | (`entity_slug`, `kind`, `normalized_value`) | `value` text. `kind` ∈ `name`, `alias`, `email`, `handle`. `normalized_value` = lowercase, accents stripped, whitespace collapsed |
| `memory_fact` | `id` uuid | `entity_slug`, `section` (`facts` or `history`), `position` int, `key` text null (text before the first `:` when the line is `key: value`), `value` text, `since`, `until`, `seen` (date text, null), `source_ref` text null, `inferred` boolean, `extra` text null (anything after the known attributes, kept verbatim), `raw` text (the original line without `- `), `learned_on` text null (date the line first entered git, from the importer, else creation day), `created_at` |
| `memory_relation` | `id` uuid | `from_slug`, `verb`, `to_slug`, `position` int, `since`, `until`, `seen`, `source_ref`, `inferred`, `extra`, `raw`, `learned_on`, `created_at` |
| `memory_verb` | `name` | `description` text, `link_length` text (`short`, `medium`, `long`) |
| `memory_source` | `slug` | `origin` text null, `occurred_on` text null, `title` text null, `confidentiality` text null, `metadata` jsonb (front matter), `content` text (the **whole file**, front matter included, byte for byte), `created_at` |
| `memory_citation` | (`entity_slug`, `source_ref`) | `created_at`. `source_ref` is a source slug, a URL or an id such as `gmail 19c56c…` |
| `memory_commitment` | `slug` | `direction` text null (`moi->eux`, `eux->moi`), `counterpart` text null, `action` text null, `due` text null, `status` text (`ouvert`, `fait`, `annule`, `abandonne`), `attributes` jsonb (whole front matter), `body` text, `created_at`, `updated_at` |
| `memory_todo` | `id` text | `list` (`personal` = todo.md, `work` = todo-taff.md), `position` int, `text`, `done` boolean, `due_date` text null, `commitment_slug` text null, `source_ref` text null, `added_on` text null, `done_on` text null, `extra` jsonb (unknown `key: value` attributes in order, as `[[key, value], …]`), `removed` boolean default false, `updated_at`. Existing ids (10-hex sha1 of the PWA contract) are kept on import; new todos get a uuid |
| `memory_focus_item` | `rank` int (1–3) | `title`, `why` null, `horizon` null. The `maj` date lives in `memory_state` key `focus.updated_on` |
| `memory_proposal` | `slug` | `category`, `status`, `title`, `priority`, `created_on`, `expires_on` null, `attributes` jsonb, `body` text (whole markdown body: Pourquoi, Ce que Talos propose, Décision), `updated_at` |
| `memory_draft` | `slug` | `channel`, `recipients` text, `subject` null, `link` null, `status`, `created_on`, `sent_on` null, `source_ref` null, `proposal_slug` null, `attributes` jsonb, `body` text, `updated_at` |
| `memory_journal_entry` | `slug` (`journal/2026-10-08`, `journal/2026-S41-hebdo`) | `kind` (`daily`, `weekly`, `other`), `content` text (whole file), `updated_at` |
| `memory_document` | `slug` | `content` text (whole file, any format, e.g. `preferences/redaction`, `etat/questions`, `etat/frictions`, `etat/securite`, `archives/…`, `etat/backfill/…`), `content_type` (`markdown`, `json`, `text`), `updated_at`. Everything that is data and not modelled above lands here, so nothing is lost |
| `memory_state` | `key` | `value` jsonb, `updated_at`. Keys: `cutover` (`"database"` since 2026-10-16; informational only, nothing reads it but `/status`), `cursors` (curseurs.json), `tasks` (taches.json), `alerts` (alertes.json), `last_scan` (dernier-scan.json), `relations` (relations.json), `focus.updated_on` |
| `memory_event` | `id` uuid | `occurred_at`, `actor` text (`import`, `pwa`, `routine:nuit`, `session:<id>`, `mac`…), `token_name` text null (`lecture`, `build`, `mac`, null for PWA), `run_id` text null, `operation` text, `object_type` text, `object_id` text, `before` jsonb null, `after` jsonb null, `summary` text |
| `memory_change_batch` | `idempotency_key` | `run_id`, `actor`, `applied_at`, `result` jsonb. A replayed key returns the stored result without applying again |

Index (async): `memory_fact(entity_slug)`, `memory_relation(from_slug)`, `memory_relation(to_slug)`, `memory_alias(normalized_value)`, `memory_citation(source_ref)`, `memory_todo(list)`, `memory_event(occurred_at)`.

## 3. Rendering a page (the wiki view)

`renderPage(slug)` returns the markdown file as it would be in git:

```
---
<attributes as YAML, keys in this order: type first, then the order stored, closeness → `proximite`, closeness_reason → `proximite_pourquoi`>
---
<body, with under `## Faits` the facts of section `facts` in `position` order as `- <raw>`, under `## Historique` the `history` facts, under `## Relations` the relations as `- <raw>`>
```

`raw` is authoritative for rendering when present; a fact or relation created through the API without `raw` is rendered from its fields: `- <key>: <value> | depuis: … | jusqu'à: … | vu: … | src: …` (attributes omitted when null, `(inféré)` appended when `inferred`) and relations `- <verb> → [[<to_slug>]] | depuis: … | jusqu'à: … | vu: … | src: …`. Closing a fact or relation sets `until` and rewrites `raw` to append or replace `| jusqu'à: <until>`. A page whose body has no `## Faits` / `## Relations` heading but has rows gets the heading appended at the end.

Commitments, proposals and drafts render the same way from `attributes` + `body`. Sources, journal entries and documents render `content` as is.

## 4. Authentication

- Machine routes `/api/agent/*`: `Authorization: Bearer <token>`. The Lambda reads SSM SecureStrings `/talos/agent-token-lecture`, `/talos/agent-token-build`, `/talos/agent-token-mac` (cached 5 min), compares in constant time against each, and the matching name becomes `token_name`. Missing or wrong token → 401 `{ "error": "jeton invalide" }`. A token parameter absent from SSM is skipped.
- PWA routes keep the passkey session cookie.

## 5. Agent routes (`/api/agent/…`, JSON)

| Method | Route | Request | Response |
|---|---|---|---|
| GET | `/status` | | `{ cutover: "git" \| "database", counts: { entities, facts, relations, aliases, citations, sources, commitments, todos, proposals, drafts, journalEntries, documents, events }, lastEventAt: string \| null, tokenName }` |
| GET | `/context?budget=<bytes>` | budget default 80000 | `{ markdown }`: sections in this order — `# Contexte Talos (<ISO now>)`, `## Préférences` (every `preferences/*` document, full), `## Focus`, `## Todo` (open personal todos) and `## Todo taff` (open work todos), `## Engagements ouverts` (slug, title, due), `## État` (cursors, last_scan), `## Derniers événements` (30, `- <occurred_at> <actor> <operation> <object_id> — <summary>`), `## Index` (one line per non-archived entity: `- [[slug]] (p<closeness>) — <title> : <summary truncated to 80 chars>`, sorted by kind then closeness desc). The index is truncated last (whole lines) to fit the budget; a final line says how many entries were cut |
| GET | `/page?slug=<slug>` | | `{ slug, type: "entity" \| "commitment" \| "proposal" \| "draft" \| "source" \| "journal" \| "document", markdown, outgoing: string[], incoming: string[] }`; 404 `{ error }` when unknown. `incoming` = slugs with a relation to it or whose body links `[[slug]]` |
| GET | `/search?q=<text>&limit=<n≤50>` | | `{ items: { slug, type, title, excerpt, matchedIn: "title" \| "alias" \| "summary" \| "fact" \| "body" \| "content" }[] }`: case- and accent-insensitive `ILIKE` over entity title, aliases, summary, facts, body, commitments, sources, journal, documents; title and alias matches first; excerpt ±80 chars around the first hit |
| GET | `/graph/neighbours?slug=&date=AAAA-MM-JJ&depth=1..3` | | `{ nodes: { slug, title, kind, closeness }[], edges: { id, from, verb, to, since, until, seen, sourceRef, isClosed }[] }` with the same date rule as `domain/graph.core.ts` (a relation counts at a date when `since` ≤ date; closed when `until` < date) |
| GET | `/graph/path?from=&to=&date=` | | `{ path: { slug, via: { verb, direction: "out" \| "in" } \| null }[] \| null }` shortest path, BFS, both directions |
| POST | `/sql` | `{ query: string }` | `{ columns: string[], rows: unknown[][], truncated: boolean }`. Only one statement, must start with `SELECT` or `WITH` (after comments/whitespace), refused if it contains `;` outside the end, or any of `insert update delete drop alter create grant revoke truncate copy call do set` as a keyword; run inside a `READ ONLY` transaction; 500 rows max; 10 s timeout (client side abort if the server cannot set one). 400 `{ error }` on refusal or SQL error (message of the database) |
| POST | `/changes` | see §6 | see §6 |
| GET | `/lint` | | `{ issues: { code, slug, message }[] }`: codes `missing-closeness`, `broken-link` (a `[[…]]` in a body or a relation target that resolves to nothing), `unknown-verb`, `since-after-until`, `stale-relation` (`seen` older than 180 days), `overdue-commitment` (open, due < today), `todo-commitment-mismatch` (todo done but its commitment open, or the reverse), `orphan-page` (entity with no relation and no incoming link) |
| GET | `/export` | | `{ exportedAt, tables: { <table name>: row[] } }`, every memory table, events included. Gzipped when the client sends `Accept-Encoding: gzip`, which it must: the raw export outgrows the 6 MB Lambda response limit |
| GET | `/document?slug=` | | `{ slug, content, contentType }`; 404 when unknown |
| GET | `/state?key=` | | `{ key, value }`; 404 when unknown |

## 6. `POST /api/agent/changes`

```json
{
  "idempotencyKey": "nuit-2026-10-17-1",
  "actor": "routine:nuit",
  "runId": "cse_01…",
  "summary": "scan de nuit : 3 sources, 2 pages",
  "operations": [ { "op": "source.add", "slug": "sources/2026/10/17/x", "content": "…" } ]
}
```

- `idempotencyKey` required (≤ 200 chars); a replay returns the first result with `replayed: true`.
- A request body may be up to 2 MB; the client caps its calls there.
- 500 operations max per call; the client splits larger batches. The service applies them in order, in transactions of at most 2,500 rows each; all-or-nothing **per call** when the call fits in one transaction, otherwise per chunk, and the response says which chunks applied.
- Validation is Zod, before any write: one invalid operation rejects the whole call with 400 `{ error, operationIndex, issues }`.
- Secret guard: any string field matching the secret patterns (`ghp_`, `github_pat_`, `\bsk-[A-Za-z0-9]{16,}` (so a word such as `Spendesk-…` passes), `xox[bap]-`, `AKIA[0-9A-Z]{16}`, `-----BEGIN`, a `password:` / `mot de passe:` followed by a value) rejects the call with 400.
- Response 200: `{ applied: number, replayed: boolean, results: { index, op, id?: string, status: "created" \| "updated" \| "unchanged" }[], chunks: { from, to, committed: boolean }[] }`.

Operations (`op` field; other fields camelCase):

| op | fields | effect |
|---|---|---|
| `entity.upsert` | `slug`, `kind`, `title`, `summary?`, `body?`, `attributes?`, `closeness?`, `closenessReason?`, `confidentiality?`, `expectedVersion?` | creates, or replaces the given fields; `version` +1; 409 on `expectedVersion` mismatch |
| `entity.archive` | `slug` | `archived = true` |
| `entity.rename` | `from`, `to` | moves the slug in every table that references it, and rewrites `[[from]]` to `[[to]]` in bodies |
| `alias.add` | `slug`, `kind`, `value` | idempotent |
| `fact.add` | `slug`, `section?` (`facts` default), `key?`, `value`, `since?`, `until?`, `seen?`, `sourceRef?`, `inferred?`, `extra?`, `raw?`, `learnedOn?`, `position?` (append by default) | returns the new `id` |
| `fact.close` | `id`, `until`, `note?` | sets `until`, moves the fact to `history`, appends `note` to `raw` |
| `fact.confirm` | `id`, `seen`, `sourceRef?` | updates `seen` (and `source_ref`) |
| `relation.add` | `from`, `verb`, `to`, `since?`, `until?`, `seen?`, `sourceRef?`, `inferred?`, `extra?`, `raw?`, `learnedOn?`, `position?` | `verb` must exist in `memory_verb`; `from` must exist as an entity or a commitment (`engagements/…`); `to` must exist as one of the two unless it is not a memory slug |
| `relation.close` / `relation.confirm` | as for facts | |
| `verb.add` | `name`, `description`, `linkLength` | |
| `source.add` | `slug`, `content`, `origin?`, `occurredOn?`, `title?`, `confidentiality?`, `metadata?` | insert only; same slug with identical content = `unchanged`, different content = 409. A binary file is sent as base64 in `content` with `metadata.encodage = "base64"` and stored as is |
| `citation.add` | `slug`, `sourceRef` | idempotent |
| `commitment.upsert` | `slug`, `direction?`, `counterpart?`, `action?`, `due?`, `status`, `attributes?`, `body?` | |
| `commitment.status` | `slug`, `status`, `note?` | `note` appended to « Suivi » as `- <today> : <note>` |
| `todo.add` | `list`, `text`, `dueDate?`, `commitmentSlug?`, `sourceRef?`, `addedOn?`, `id?`, `position?`, `done?`, `doneOn?`, `extra?` | returns `id`. `doneOn` is stored as given, never defaulted (an imported done todo may have no day) |
| `todo.update` | `id`, `text?`, `done?`, `dueDate?` (null clears), `doneOn?` | `done: true` without `doneOn` sets today |
| `todo.remove` | `id` | `removed = true` |
| `focus.replace` | `items` (≤ 3 `{ title, why?, horizon? }`), `updatedOn?` | |
| `proposal.upsert` | `slug`, `category`, `status`, `title`, `priority`, `createdOn`, `expiresOn?`, `attributes?`, `body` | |
| `proposal.status` | `slug`, `status`, `decisionLine?` | `decisionLine` appended under « ## Décision » |
| `draft.upsert` | `slug`, `channel`, `recipients`, `subject?`, `link?`, `status`, `createdOn`, `sentOn?`, `sourceRef?`, `proposalSlug?`, `attributes?`, `body` | |
| `draft.status` | `slug`, `status`, `sentOn?` | |
| `journal.append` | `slug` (`journal/AAAA-MM-JJ`), `heading`, `markdown` | creates the entry with `# AAAA-MM-JJ` if absent, appends `\n## <heading>\n\n<markdown>\n` |
| `journal.write` | `slug`, `content`, `kind?` | replaces the whole entry |
| `document.write` | `slug`, `content`, `contentType?` | replaces |
| `state.set` | `key`, `value` | |

Every applied operation inserts `memory_event { actor, token_name, run_id, operation: op, object_type, object_id, before, after, summary }` (`summary` = the call's `summary` for the first operation, an automatic one-liner otherwise). `GET /context` reads these events as the new `log.md`.

## 7. The PWA

- Every PWA content route reads and writes the memory tables through repositories, and writes `memory_event` rows with `actor: "pwa"`. Todo ids are strings (old 10-hex or uuid), `/pages/*` accepts any slug of §1, prompts « Discuter » and the fire text cite the slug (`<type>: <slug>`).
- The git storage mode and its per-request `cutover` switch were removed on 2026-10-28, once the private repository held no data and its token was revoked. `/status` still reports the `cutover` state for information.

## 8. CLI `scripts/talos.py` (talos repository, Python stdlib only)

Configuration: `TALOS_API_URL` (default `https://talos.borso.fr/api/agent`), `TALOS_AGENT_TOKEN`; on macOS, when the variable is absent, `security find-generic-password -s talos -a TALOS_AGENT_TOKEN -w`. Actor: `TALOS_ACTOR` (default `session:<CLAUDE_SESSION_ID or "locale">`), run id `TALOS_RUN_ID`.

| Command | Calls | Output |
|---|---|---|
| `talos.py statut` | GET /status | JSON |
| `talos.py contexte [--budget N]` | GET /context | markdown on stdout; on failure prints `MÉMOIRE INJOIGNABLE : ne rien écrire, prévenir Hugo (<raison>)` and exits 2 |
| `talos.py page <slug>` | GET /page | markdown, then `Liens entrants :` list |
| `talos.py cherche <texte> [--limite N]` | GET /search | one line per hit `slug — titre : extrait` |
| `talos.py sql "<select>"` | POST /sql | TSV with header; `--json` for raw |
| `talos.py voisins <slug> [--date D] [--profondeur N]` / `talos.py chemin <a> <b> [--date D]` | graph routes | text |
| `talos.py ecrire <lot.json \| ->` | POST /changes | the response JSON; a missing `idempotencyKey` is generated (`<actor>-<sha256 of the body>[:16]`); batches > 500 ops are split client side with suffixes `-1`, `-2`… |
| `talos.py document <slug>` / `talos.py etat <cle>` | GET /document, /state | content / JSON |
| `talos.py preference <theme>` | GET /document?slug=preferences/<theme> | content |
| `talos.py lint` | GET /lint | one line per issue; exit 1 when any |
| `talos.py export [--sortie fichier]` | GET /export | JSON |

Errors: network errors are retried 3 times with backoff (1 s, 3 s, 9 s) on connection errors, 429, 502, 503, 504; never on 4xx. Any final failure prints `talos.py : <commande> a échoué : <HTTP status> <error>` on stderr and exits non-zero (1; 2 for `contexte`). A write never fails silently.

## 9. Implementation notes (borso.fr API, lot 1)

What the API does where the contract leaves a choice or DSQL forbids the letter of it. The HTTP shape is unchanged in every case. Decision record: [ADR-0039](../../docs/adr/0039-talos-memory-in-the-database.md).

- Every column typed `jsonb` above is a `text` column holding JSON, because DSQL refuses `jsonb` as a column type. The API decodes it before answering; SQL over it needs a cast (`attributes::jsonb ->> 'type'`).
- `focus.replace` writes the three ranks every time; a rank the new focus leaves empty gets an empty `title` and is not shown, since nothing deletes rows.
- `/sql` cannot set a server-side timeout on DSQL (`statement_timeout` is not settable), so the ten seconds are a client-side cancel. The read-only transaction is opened with `BEGIN READ ONLY`, because DSQL refuses `SET TRANSACTION`.
- Search folds accents with `translate()`, because DSQL has no `unaccent` and its `lower()` leaves accented capitals as they are.
- When a call spans several chunks and a later one fails, the earlier chunks stay committed, the response is 200 with `error` and the `chunks` flags, and that partial response is what a replay of the key returns; the client resends the rest under a new key.
- An invalid envelope (missing key, more than 500 operations) answers 400 `{ error }`; an invalid operation answers 400 `{ error, operationIndex, issues }`; a secret in `summary`, `actor` or `runId` answers 400 with `operationIndex: null`.
- Unknown pages, facts, relations, todos, commitments, proposals and drafts answer 404; a stale `expectedVersion`, a source rewritten with different content, and a rename onto a taken slug answer 409; an unknown verb answers 400.

