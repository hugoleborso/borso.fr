# A closeness scale from 0 to 5, with a name for each level of a person

The owner decided on 2026-11-11 that the closeness of a person runs from 0 to 5, and that each level has a name he sees in the PWA. Until now the scale ran from 1 to 5, a 0 was refused on write, and several places read a 0 as "not scored".

## The scale, for persons

| Level | Name | Meaning |
| --- | --- | --- |
| 5 | Intimes | He drops everything for them |
| 4 | Proches | They know what goes on in his life, they talk for no reason |
| 3 | Amis | A real bond that holds outside the setting where they met |
| 2 | Copains | A pleasant bond, tied to a setting (work, sport, class) |
| 1 | Bonnes relations | A useful contact he gets on with, no personal bond |
| 0 | Contacts | A useful relation, neutral or distant |

## The scale, for everything that is not a person

The owner decided on 2026-11-11, after seeing the first version, that a page that is not a person also runs from 0 to 5 and that its levels have names of their own. « Closeness » reads oddly for an organisation or a project: there the score says how much the page matters to him. 0 is the furthest.

| Level | Name | Meaning |
| --- | --- | --- |
| 5 | Au cœur | At the centre of his priorities |
| 4 | Important | He thinks about it every week |
| 3 | Suivi | He follows it regularly |
| 2 | Secondaire | Useful, in the background |
| 1 | Contexte | It helps understand the rest |
| 0 | Périphérie | Known, with no stake for him |

The owner validated these six names on 2026-11-11. The field keeps its name `proximite` everywhere.

## What the code does today (read on 2026-11-11)

- `entity.upsert` refuses `closeness: 0`: `memory-changes.schema.ts` bounds it to 1 and 5. The column is a nullable integer, so no migration is needed.
- A 0 is read as absent in four places: the sort of the context index (`memory-context.core.ts`, `closeness ?? 0`), the graph of the API (`graph.core.ts`, valid proximities 1 to 5), the radius of a graph node on the site (`graph-layout.core.ts`), and the closeness dot of the Relations screen (`relations-board.core.ts`, rank 0 is the level « none »).
- The scale is written as 1 to 5 in the schema, the graph, the text « Proximité N sur 5 » and `MEMORY-CONTRACT.md`.
- No level has a name anywhere.

## S1. A 0 can be written, for any kind

- S1.1 `entity.upsert` accepts `closeness` from 0 to 5 for an entity of any kind.
- S1.2 No kind is refused a 0. The refusal the first version made for a non-person is removed, with its error.
- S1.3 A `closeness` below 0 or above 5, or not an integer, is refused as today.

## S2. A 0 is a score, not an absence

- S2.1 The context index sorts a 0 above an entity with no closeness, and below a 1.
- S2.2 The graph the API answers carries a proximity of 0 for an entity scored 0, and no proximity for an entity with none.
- S2.3 On the site, a graph node of proximity 0 gets a radius of its own, further out than proximity 1, and distinct from the radius of an unscored node.
- S2.4 On the Relations screen, the closeness dot of a person scored 0 is a visible level of its own, and the dot of a person with no closeness stays the level « none ».
- S2.5 The lint rule `missing-closeness` still fires only on an absent closeness, never on a 0.

## S3. A level shows its name

- S3.1 The twelve names are in `fr.json`: six for a person, six for any other kind, keyed by level.
- S3.2 On the Relations screen, which lists persons, the accessible label of a person's dot is the name and the level, such as « Amis, 3 sur 5 ». A person with no closeness says « Proximité non notée ».
- S3.3 On a page of the second brain, the `proximite` chip shows the name after the number: the person's name for kind `personne`, such as « proximite 4 · Proches », and the other set for any other kind, such as « proximite 4 · Important ».
- S3.4 A level outside 0 to 5 shows the number alone, without a name.
- S3.5 On the Mémoire screen, a late page of the « En retard » list shows the name of its level next to its kind, by the same rule, and nothing when it has no closeness.

## S4. Documents

- S4.1 `MEMORY-CONTRACT.md` says `closeness int null (0–5)` for every kind and carries both sets of names. `CONTRAT.md` and `VOCABULARY.md` carry the scale where they describe closeness.

## Out of scope

Writing a 0 on any stored page: the agent does it after this is deployed. The agent's lateness formula, which becomes (facts + contained facts) times (closeness + 1) on its side.
