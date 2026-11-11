# Pages that compute what the tables know, and a visible lateness

The owner found a page of his second brain out of date on 2026-11-11. Measured by the agent in the memory that day: 176 pages out of 240 had never been rewritten since the import of 16 October, while 325 facts had arrived since. The cause: a page mixes what is computed (facts and relations, updated with every source) with a story written by hand in the body, which copies what the tables already know and rots. And nothing rises from a page to the one that contains it.

The agent now publishes a memory state `freshness` every night and rewrites the five most late summaries. This spec is the PWA and memory API side. The owner confirmed the request on 2026-11-11. The facts below about the real memory were read by the agent session that day.

## Facts about the memory (read by the agent session)

- One verb says a page contains another: `comprend`, from the containing page to the contained one. Open relations today: domain to project (44), organisation to project (13), project to project (3), organisation to person (3), project to meeting (1). `membre_de` is a person's membership, not a containment.
- A project's front matter carries `statut` (`actif`, `termine`, `en-pause`, `abandonne`), `meteo` (`vert`, `orange`, `rouge`), `prochaine_etape` (free text) and `echeance` (ISO day or empty).
- Domain bodies have a hand-written section `## Projets liés`, the only one that copies relations. `## Chronologie` is a hand-written dated journal and stays.
- The date of a page's summary is the attribute `resume_le`, else `maj`, else the day of `updated_at`.

## Data shapes

Memory state `freshness`, written by the agent, read only:

```json
{"genere": "2026-11-11T20:10:00+01:00", "en_retard": 67,
 "pages": [{"slug": "second-brain/domaines/sport", "titre": "Sport", "type": "domaine", "proximite": 5,
            "resume_le": "2026-10-08", "faits": 4, "faits_englobes": 20, "retard": 120}]}
```

`pages` holds the 30 most late pages. `retard` is (facts + contained facts) times closeness.

In code:

```ts
interface LatePage {
  slug: string; title: string; kind: string; closeness: number | null;
  summarizedOn: string; factCount: number; containedFactCount: number; lateness: number;
}
interface Freshness { generatedAt: string | null; lateCount: number; pages: LatePage[] }
```

## C1. A page lists what it contains, from the relations

- C1.1 The rendered markdown of an entity that has at least one open outgoing `comprend` relation carries a section `## Comprend`, one line per contained page, in the order of the relations.
- C1.2 A line is `- [[<slug>]]`. When the contained page is a project, the line continues with its attributes that are present and not empty, in this order: ` | statut: <statut> | meteo: <meteo> | prochaine_etape: <prochaine_etape> | echeance: <echeance>`.
- C1.3 A closed relation (with an `until`) is not listed. A contained page that no longer exists is listed by its slug alone.
- C1.4 An entity with no open outgoing `comprend` relation gets no such section, whatever its kind.
- C1.5 The section is placed as « Faits » and « Relations » are: under an existing `## Comprend` heading of the body, else appended at the end. One exception: when the body has a `## Faits récents` heading and no `## Comprend` heading, `## Comprend` and its lines go right above that `## Faits récents` heading.
- C1.6 « Relations » is unchanged and still lists the `comprend` relations with the others.

## C2. A page shows what moved below it

- C2.1 The same entities carry a section `## Faits récents`, after `## Comprend`.
- C2.2 It lists facts of the pages the entity contains, down two levels of open `comprend` relations, whose `learned_on` is on or after the date of the entity's summary (`resume_le`, else `maj`, else the day of `updated_at`). When none of the three gives a day, the window is the last 30 days. A fact whose `learned_on` is not a full ISO day (null, or a partial date such as `2026-09`) is not listed.
- C2.3 At most 10 facts, the most recent `learned_on` first. A line is `- <learned_on> | [[<slug of the page the fact is on>]] | <the fact as « Faits » renders it>`.
- C2.4 The entity's own facts are not listed there. With no fact in the window the section is absent.

## C3. Writing ignores the computed sections

- C3.1 `entity.upsert` drops, from the body it receives, the lines under the five computed headings `## Faits`, `## Historique`, `## Relations`, `## Comprend` and `## Faits récents`, by one rule, and keeps the headings in place. A page read then written back does not store the computed lines, and the next read shows each of them once.
- C3.2 `## Comprend` and `## Faits récents` are reserved headings. `MEMORY-CONTRACT.md` says so in its section 3, with the line formats and the position rule.

## C4. The PWA does not show the hand-written copy

- C4.1 On a page of the PWA, when the rendered page carries `## Comprend`, the body's `## Projets liés` section is not shown. The stored body is not rewritten, and `GET /api/agent/page` still returns it.
- C4.2 Removing `## Projets liés` from the stored bodies is a decision for the owner, asked in the pull request.

## F1. The lateness is visible

- F1.1 `GET /api/freshness` (session required) answers `Freshness`, read from the memory state `freshness`. A page that does not parse is dropped. A missing or unreadable state answers `{ generatedAt: null, lateCount: 0, pages: [] }`. No write.
- F1.2 The index of « Jour » gains a tenth tile, « Mémoire », after « Historique », with the count of late pages. It opens the Mémoire tab. It stays calm, since a count above zero is the normal state. It shows no count until the state is loaded.
- F1.3 The Mémoire screen shows, above its search, a section « En retard · N » folded until tapped, hidden when N is zero. Unfolded, it lists the late pages of the state, most late first: title, kind, date of the summary. A tap opens the page.
- F1.4 No new screen and no new tab.

## F2. A page says when its summary was written

- F2.1 The page view the PWA reads gains `summarizedOn`, the date of the entity's summary by the rule of C2.2, or null for what is not an entity.
- F2.2 A page of the second brain shows under its title « Résumé du <short day> ».
- F2.3 When the page is among the late pages of the state, that line is in the alert colour and says so in words, not by colour alone.

## D. Documents

- D.1 `MEMORY-CONTRACT.md` section 3 describes C1 to C3, and its state keys list `freshness`. `CONTRAT.md` describes the route, the tile, the Mémoire section and the page line. `VOCABULARY.md` gains the terms it needs.
- D.2 The pull request states exactly what changes in the contract, for the agent repository to copy.

## Out of scope

Rewriting stored bodies. Replacing `## Chronologie`. Writing the `freshness` state. The agent repository.
