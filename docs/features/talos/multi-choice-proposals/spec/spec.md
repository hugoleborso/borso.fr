# A proposal offers 2 to 4 choices, and its card shows one button per choice

The owner decided on 2026-11-15 to keep the PWA and its web push rather than build an iOS app ([ADR-2026-11-15T0636](../../../../adr/2026-11-15T0636-talos-decides-multi-choice-proposals-on-the-pwa-card.md)). The notification keeps opening the card. What changes is the card. Talos may now ask « mardi, jeudi ou pas cette semaine ? » instead of a yes or no, and the owner answers with one tap on the card.

## Data shape

- The agent lists the choices in a new body section of the proposal, between « Ce que Talos propose » and « Décision ».

  ```markdown
  ## Options
  - mardi
  - jeudi
  - pas cette semaine
  ```

- `Proposal` gains `options: string[]`, the trimmed, non-empty `- ` items of that section, in order. A section with fewer than two items, or no section, gives `[]`.
- The decision body gains an optional `option: string`, 200 characters at most: `{ decision: "acceptee" | "refusee", option?, comment? }`.
- A chosen option is an accepted decision. Its line names the choice in brackets: `- 2026-11-15 10:12 : acceptée (jeudi) — <comment>`. The front matter stays `statut: acceptee`. No table or memory verb changes, because the line already travels through `proposal.status` as `decisionLine`.

## S1. The card shows the choices

- S1.1 A pending proposal with options shows one button per option, labelled with the option text, in the agent's order, plus Refuse and Comment. It shows no Accept button.
- S1.2 A pending proposal without options shows Accept, Refuse and Comment, as before.
- S1.3 The buttons wrap onto several lines at 375 px wide, and none is cut.
- S1.4 The same card serves the « Décider » tab and the direct link `/proposals/<slug>`.

## S2. The API records the choice

- S2.1 `POST /api/proposals/:slug/decision` with `{ decision: "acceptee", option }`, where `option` is one of the proposal's options, records the decision line of the data shape and fires the routine as any decision does.
- S2.2 The API answers 400 `{ error: "Ce choix n'est pas proposé." }` and records nothing when `option` is not one of the proposal's options, when `option` comes with `refusee`, or when `acceptee` comes without `option` on a proposal that has options.
- S2.3 Refuse without `option` works on every proposal.
- S2.4 Cancelling a decision is unchanged. The card offers the choices again.

## S3. The agent learns the section

- S3.1 `CONTRAT.md` documents « ## Options » in the proposal format, the rule of 2 to 4 items, the decision line with the choice in brackets, and that a run reads the choice from the last decision line once `statut` is `acceptee`.
- S3.2 `VOCABULARY.md` names the term.
- S3.3 The seeds carry one fictional proposal with three options, so `pnpm dev` shows the case.
