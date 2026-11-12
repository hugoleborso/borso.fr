---
summary: 'A spec bullet that says the code "already" does something, or picks what the owner wants without asking, is an assumption. PR #300 shipped three to its implementers, and each cost a fix or a rework.'
triggers:
  paths:
    - 'docs/features/*/*/spec/spec.md'
---

# A spec bullet that leans on what the code already does

A short-form spec with no plan is the only step between the request and the
implementer. Nothing after it maps a bullet onto the code before the code is
written. PR #300 wrote two such specs for talos, and three of their bullets
rested on something nobody had checked.

| Bullet | What it assumed | What was true | Cost |
| --- | --- | --- | --- |
| Computed pages C3.1: `entity.upsert` drops the lines of the two new sections, "as it does for « Faits », « Historique » and « Relations »" | The write already dropped the lines of three sections | No code dropped any (the implementer and the validator each found it, `computed-pages-and-freshness/kaizen.md` 19:48 and 20:07). A page read then written back stored each line twice (measured in report 2005, *Notes*) | A fix commit, `3da2e2a`, and a second review round |
| Closeness S1.2: "The kind is the one the operation carries, else the one stored" | `entity.upsert` may omit `kind` | `kind: z.enum(ENTITY_KINDS)` is required since the first commit of `memory-changes.schema.ts`, `d98a860` (measured), so the branch could not be reached or tested (`closeness-scale/kaizen.md` 20:51) | A rule that read the operation's kind alone, and finding A04 of report 2054 |
| Closeness S1.2: a 0 is refused on a page that is not a person | The owner wants 0 for persons only | He said refusing it made no sense (transcript) | A third change, `02b63ec`, removed the refusal and its error |

The first two are facts a command settles. The third is a product call, and
only the owner settles it.

## Where the first one came from

Two sources agreed, and neither was the code. A message from another session
said the write dropped the lines (transcript). `MEMORY-CONTRACT.md` described
the `body` column as stored "with the *lines* of « Faits », « Historique » and
« Relations » removed" (line 22 at commit `def77d9`, read this sweep). That
sentence was true of what the import had produced. No writer held it. The
contract also listed `kind` with no `?` in the `entity.upsert` row, so the
second assumption contradicted a document one `grep` away.

## What to do when writing the bullet

- **State the whole target.** "`entity.upsert` drops the lines of the five
  computed sections" asks for all five. "As it does for the other three" asks
  for two and trusts the rest to code nobody opened.
- **A sentence about today is a claim.** Words such as *already*, *as it
  does*, *still*, *else the one stored* describe the code before the change.
  Open the file and put its path and line in the bullet, or drop the sentence.
  For an API operation, the schema file is the source, not the contract
  document and not a message from another session.
- **A choice the owner did not make is a question.** Ask it before the
  implementer starts, in the words he sees on the screen, with one concrete
  example for each option, such as "an organisation's page scored 0 is
  refused" against "it shows as the furthest level". The owner called two
  questions of this session unclear, and both named an internal notion with
  no example (transcript).
- **A bullet about the pull request is not behaviour.** C4.2 and D.2 of the
  computed pages spec asked for sentences in the pull request body. The
  validator runs before the pull request exists, so both rows were
  UNVERIFIABLE in both rounds (reports 2005 and 2024, A16 and A25). Put such a
  line under *Out of scope* as a note for `/open-pr`.

## What this does not do

It is the floor of the ladder. No check reads a sentence and knows whether the
code agrees. The layers that did catch the first two are the implementer, who
opens the code first, and the validator, who measured the round trip.

## See also

- [`the-score-that-changed-under-another-name.md`](../dantotsus/the-score-that-changed-under-another-name.md):
  a spec rule about query keys that the code did not follow, on a feature with
  no plan either.
- [`input-vs-output-metrics.md`](./input-vs-output-metrics.md), the other
  entry printed when a spec is written.
