# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person, the owner. Talos is a personal chief of staff and nobody else signs in. The owner opens it on a phone, as an installed progressive web app, in two situations:

- **In the morning, on waking**: low light, often still in bed. They read the brief Talos wrote overnight, check the focus, and decide the pending proposals.
- **During the day, on the move**: outdoors or between meetings, one hand, a few seconds. They tick a todo, add one, glance at what is overdue.

The evening reading of the notes graph, the history and the weekly review exists but is secondary. Desktop is not a target.

## Product Purpose

Scheduled agent runs keep a private Git repository of notes, tasks, commitments and proposals up to date. Talos is how the owner reads and edits that repository from a phone. Success is a morning where the owner knows in under a minute what matters today and has said yes or no to everything Talos proposed.

## Positioning

Talos is not a todo app. It is the face of an agent that works overnight: it writes a brief, proposes actions and drafts messages, and waits for a decision. The owner reviews and decides more than they type.

## Operating Context

- The content lives in a private repository; every write is a commit with a French message. The app never stores content itself.
- Screens: Today (date, brief, focus, counters, agenda, activity), Todo and Todo taff, Proposals, Commitments, Relations, Drafts, History, Second brain (search, pages, graph), Message (opens Claude Code), Settings, Login.
- Interactions already in place: long press opens an action sheet, toasts with undo, offline banner, push notifications.

## Capabilities and Constraints

- French interface only, from `site/src/i18n/fr.json`.
- Sign-in by passkey only.
- Production only: no preview deploys, because a preview would expose private content. Mock-ups and screenshots must use fictional content, never the owner's real data.
- Stack is fixed: React, Vite, Tailwind v4 with tokens in `site/src/styles/tokens.css`, atomic components.
- Both light and dark themes are needed: the morning scene is dark, the daytime scene is bright.

## Brand Commitments

- The name is Talos, the bronze guardian of Greek myth. The incumbent palette already leans on bronze and patina.
- The owner asked for an art direction inspired by Greek engraving.

## Evidence on Hand

- Fictional content examples in `CONTRAT.md` and `test/memory-seed.json`.
- No logo beyond the current favicon in `site/public/icons/`.

## Product Principles

1. Decide fast: the proposal and its two answers are the most important interaction.
2. Today first: one screen should answer "what matters now".
3. One hand, one glance: every frequent action is reachable with a thumb.
4. The agent shows its work: what Talos did, when, and from what source is always visible.

## Accessibility & Inclusion

Readable in low light and in sunlight: contrast at WCAG AA in both themes, no meaning carried by colour alone.
