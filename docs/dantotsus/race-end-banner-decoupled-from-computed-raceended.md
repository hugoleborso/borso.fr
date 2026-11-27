---
date: 2026-05-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#23'
fix-commits: [c5eb3e0b3d]
eradication-level: 5
eradication-paths: [docs/knowledge/race-end-signal-duality.md, apps/last-loop-lepin/site/src/components/organisms/spectator.core.ts]
time-to-detect: hours
tags: [react, ux, race-engine]
zone: apps/last-loop-lepin/site/src/routes/SpectatorPage.tsx
---

# The "Course terminée" banner missed the backyard-rule end-state

## User impact

Spectators of a last-loop-lepin race kept seeing a live race after it had ended.
The leaderboard knew the race was over, at `endsAt` or when one runner was left,
but the banner *« Course terminée, classement final affiché. »* appeared only
once the admin clicked *Finish edition* in the back-office. Found by reading the
page after the operator asked, post-merge of PR #23: *« Est-ce que tu peux me
confirmer le comportement quand on arrive à la fin de la course ? »*

| | Seen | Expected |
| --- | --- | --- |
| One runner left, admin has not clicked | live page, no banner | « Course terminée » banner |
| `endsAt` passed, admin has not clicked | live page, no banner | « Course terminée » banner |

## Causal chain

- The banner stayed hidden after the race ended.
  - The spectator page gated it on the admin-written status.

    ```tsx
    const isFinished = edition.status === 'finished'; // ← ❌ flips only on the admin's click
    ```

    - The API never sets `status` to `'finished'` on its own. The end condition
      lives in a second field, computed on every standings read.

      ```ts
      raceEnded: isRaceEndReached(edition, now) || inRaceCount <= 1, // ranking.core.ts
      ```

      - 92fb11aa3 (2026-05-12) put the end condition in `standings.raceEnded`
        and kept `edition.status` as a field only the admin writes. The plan
        asked for one field: "Côté server: `GET /api/editions/:slug/state`
        calcule `status='finished'` quand `now >= endsAt OU inRace.length <= 1`
        … persiste le statut "finished" en BDD une fois"
        (`docs/features/last-loop-lepin/race-day-live/plan/plan.md:51`).
        - a387b4985, 17 minutes later, built the site from the plan's single
          status. The same commit parsed `raceEnded: z.boolean()` in the API
          client and used it nowhere on the banner.

## Root cause of occurrence

*Thought `edition.status === 'finished'` meant "the race is over", as the plan
said it would, actually the API had split that answer in two: a status only the
admin writes, and a computed `raceEnded` nobody reconciled with it.* (Man)

Both commits were written by an agent in one session, phases 5 and 6 of the
feature. The plan row was part of the implementation's input, and the site
commit parsed `raceEnded` itself, so the right information was in context. The
API phase implemented the end condition as a new field instead of as the
plan's status transition, and the site phase followed the plan instead of the
code. Why the API phase departed from the plan is not in the commit message
(inferred: a large multi-phase session).

## Detection failure causes

- **Typing:** `edition.status` and `standings.raceEnded` are both well typed.
  Two fields answering one question is semantic, not a type error.
- **Local validation:** the condition fires only past `endsAt` or with one
  runner left. Neither was in the default back-e2e fixtures.
- **Visual validation:** the spec did not say the banner follows the computed
  end, so the validator had nothing to assert.
- **Review:** race end was outside PR #23's diff.

## Countermeasure

c5eb3e0b3 made the banner read `edition.status === 'finished' || raceEnded`.
Today that OR lives in `isRaceOver` in
`apps/last-loop-lepin/site/src/components/organisms/spectator.core.ts`, and
`SpectatorPage.tsx` calls it. The admin's manual close still shows the banner
early.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit c5eb3e0b3.

What holds today:

- `isRaceOver` centralises the OR for the spectator page.
- `docs/knowledge/race-end-signal-duality.md` is printed when an agent touches
  `api/src/ranking/**`, `api/src/edition/**` or `site/src/routes/**`, and says
  which caller reads which signal.

Two sources of truth remain. A new consumer can still read `edition.status`
alone, and the site already holds a third definition (below).

**Proposed:** subtract one source of truth. Have the API report one derived end
state, for example a status the server reports as `'finished'` once `raceEnded`
holds, which is what `plan.md:51` asked for. The admin's manual close becomes a
separate "archived" meaning, which `listFinishedEditions`, the CSV link and the
archive filters already want. Then the site reads one field and cannot pick the
stale one, and `isRaceOver` and `isRaceOverInPractice` can be deleted. This
needs a product call on what "finished" and "archived" show to spectators. It
does not exist yet.

**Proof it can fail:** not run.

**Similar instances:** `grep -rn "status === 'finished'\|isRaceOver" apps/last-loop-lepin/site/src`
finds `isRaceOver` in `spectator.core.ts`, `listFinishedEditions` in the same
file (archive, wants the admin meaning), and `isRaceOverInPractice` in
`admin-tabs.core.ts`, which re-derives the end on the site as
`runnersInRace === 0`. The server's rule is `inRaceCount <= 1`. That third
definition disagrees with the server by one runner.
