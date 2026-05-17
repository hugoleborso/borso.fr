---
date: 2026-05-15
introduced-at: conception
detected-at: code-review
severity: medium
related-pr: 23
fix-pr: this PR (branch `claude/lessons-from-pr-23`)
fix-commits: [<pending — pushed in this kaizen PR>]
eradication-level: 1
time-to-detect: hours
tags: [react, ux, race-engine]
---

# The "Course terminée" banner missed the backyard-rule end-state

## Symptom

Operator question after PR #23 merged: *« Est-ce que tu peux me
confirmer le comportement quand on arrive à la fin de la course ?
Les boucles s'arrêtent ? »* Reading the spectator page revealed a
hole: the banner *« Course terminée — classement final affiché. »*
is gated on `edition.status === 'finished'`, a field that only
transitions when the admin clicks *Finish edition* in the back-office.
The actual end-of-race condition is computed every poll by
`ranking.core.ts:165-168` as `isRaceEndReached(edition, now) ||
inRaceCount <= 1` — fires automatically at `endsAt`, or when only
one runner is left (backyard rule). The two signals can disagree:
the race is over per the leaderboard, but the page still looks live
until the admin remembers to click.

## Root-cause chain

1. **Why does the banner depend on `edition.status === 'finished'`
   alone?** Because the spectator page's `isFinished` was written
   before the dynamic `raceEnded` signal existed in the DTO — the
   banner was the only "is the race over?" check then, and the
   admin status field carried both intent (we declare it over) and
   semantics (it ends now).
2. **Why was the signal split when `raceEnded` was added?** The
   `raceEnded` field was added to the standings DTO during the
   ranking-engine refactor for the backyard rule. The frontend
   consumer of `raceEnded` is the *ranking layout* (it knows to
   stop showing per-loop progression). The banner wasn't moved —
   nobody noticed the duplication.
3. **Why didn't the duplication surface in the spec or plan of
   PR #23?** It wasn't in the diff; the spec/plan focused on
   self-punch, gpx-pace projection, fastest-lap, and the
   refactored grid layout. The end-of-race UX is upstream.
4. **Why did the operator question reveal it?** Asking "what
   happens at end of race?" forced a read of every signal — and the
   reader noticed the gap.

**Root cause:** *thought `edition.status === 'finished'` was the
canonical "is the race over?" signal because it was the original
one; actually `standings.raceEnded` was introduced later as the
**computed** authoritative answer, but the banner wasn't updated to
follow it.*

## Detection failure causes

- **Typing:** Both `edition.status` and `standings.raceEnded` are
  perfectly typed; the duplication is semantic, not structural.
- **Linter:** No rule could plausibly detect this.
- **Functional validation locally:** The condition only fires on a
  race that has run past `endsAt` *or* reduced to one in-race
  runner — neither is in the back-e2e fixtures by default.
- **/visual-validation:** Same — the spec doesn't articulate the
  banner-on-raceEnded contract, so the validator has nothing to
  assert against.
- **Operator review:** Race-end behaviour wasn't in scope of PR #23.
  The hole was noticed during the post-merge kaizen retro.

## Countermeasure

`isFinished` in `SpectatorPage.tsx` now ORs the two signals. The
admin manual transition still works (operators who want to "close
the books" early can flip the status), but is no longer required
for the banner to appear at the correct natural end. Comment block
in-place explains the disjunction so a future reader doesn't strip
either signal back out.

- **Code:** apps/last-loop-lepin/site/src/routes/SpectatorPage.tsx —
  shipped in this kaizen PR.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility).

**Reference:** this kaizen PR · the SpectatorPage edit.

**The actual fix:**

```diff
   const isLive = edition.status === 'live';
-  const isFinished = edition.status === 'finished';
+  // `raceEnded` is the canonical "the race is over" signal: it fires
+  // when either (a) wall-clock crosses `endsAt`, or (b) at most one
+  // runner is still in-race (backyard rule — cf. `ranking.core.ts`).
+  // Reading the banner gate off `edition.status === 'finished'` —
+  // which is admin-managed and not auto-transitioned — left a UX gap
+  // on PR #23: the race could be over per the leaderboard while the
+  // page still rendered as live. The two signals can disagree
+  // (admin-finished + race-not-yet-ended cannot happen in practice;
+  // race-ended + admin-still-live happens every time the admin forgets
+  // to click the transition). Trusting `raceEnded` collapses the gap.
+  const raceEnded = standingsState.standings?.raceEnded === true;
+  const isFinished = edition.status === 'finished' || raceEnded;
```

The disjunction is structurally impossible to regress because the
banner now derives from the union — both signals would have to be
deliberately stripped for a re-introduction. The comment binds the
two field names to the same call site so a future reader sees the
historical confusion.

**Sibling defects swept:** repo-wide grep for `status === 'finished'`
returned three other call sites: an admin guard in `AdminPage.tsx`
(intentional — admin tools should only enable Finish actions on the
explicit admin-managed status), a CSV-download link gate also in
SpectatorPage (kept on `edition.status === 'finished'` because the
archive CSV is only meaningful after the admin officially closes the
edition), and the legend in HorsJourJ (filtering archives — same
semantics). None of those should follow `raceEnded`. Documented
inline.

## See also

- [`docs/knowledge/race-end-signal-duality.md`](../knowledge/race-end-signal-duality.md) — companion knowledge entry shipped in this kaizen PR; documents the two signals and when each should be consumed.
