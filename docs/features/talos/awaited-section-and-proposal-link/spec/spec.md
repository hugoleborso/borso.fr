# Awaited commitments out of the todo, and a direct link to a proposal card

The owner decided on 2026-11-11 how Talos works. The agent now writes a `direction` on each commitment and closes by itself what is proven done. This spec covers the three changes the PWA needs. None of them changes the data or the API contract. A point that would need a contract change is described in the pull request, not built.

## S1. Commitments others owe leave the todo

Wherever the PWA lists the open commitments together with the owner's tasks, a commitment whose direction is `eux->moi` (`awaited` in code) leaves that list.

- S1.1 The only such place is the agenda of the today screen. An awaited commitment no longer appears in it.
- S1.2 The awaited commitments of the today payload go to a section labelled « En attente ».
- S1.3 The section is folded by default. Folded, it shows its label and a counter, nothing else.
- S1.4 The section is absent when there is no awaited commitment.
- S1.5 A commitment with direction `moi->eux`, or without a direction, stays in the agenda as before.
- S1.6 The Engagements screen, which lists commitments alone, is unchanged in behaviour.

## S2. A direct link opens one proposal card

- S2.1 The route `/proposals/<slug>` shows the card of that one proposal, where `<slug>` is the file name without `etat/propositions/` and `.md`.
- S2.2 A pending proposal shows its reason, its draft, and the Accept, Refuse and Comment controls. One tap on Accept or Refuse decides it, with the same request as the list.
- S2.3 A proposal that is decided or expired shows its status and decision lines. One whose decision can still be taken back offers to do so.
- S2.4 A slug that names no proposal shows « Proposition introuvable ».
- S2.5 `POST /api/notify` accepts `/proposals/<slug>` as `url`, without a change to its schema.
- S2.6 `CONTRAT.md` documents the route and the `url`.

## S3. Grouped proposals read well on the existing card

Two families of slugs arrive: `AAAA-MM-JJ-faits` (title « Déjà faits ? », a body listing up to five commitments) and `AAAA-MM-JJ-appris-<slug>` (a lesson to validate, a body carrying a diff).

- S3.1 The API accepts both slug shapes.
- S3.2 The card shows a bullet list one item per line, and a diff line by line in a preformatted block.
- S3.3 A decision fires the routine with `proposition: etat/propositions/<slug>`, as for any proposal.
- S3.4 Code is added only if something breaks.

## S4. Decisions are taken in one place

The owner decided on 2026-11-11, after seeing the first three changes, that a proposal card on the today screen duplicates the « Décider » tab.

- S4.1 The today screen shows no proposal card. Its « À décider » pill, with the pending count, still leads to the proposals.
- S4.2 A proposal is decided on the « Décider » tab or on its direct link, where the card always shows its draft.

## Out of scope

Any change to the API contract, the memory formats or the agent repository.
