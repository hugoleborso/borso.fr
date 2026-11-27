---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#81'
fix-commits: [8621866aa, 03e16d4d6d]
eradication-level: 2
eradication-paths: [eslint-rules/no-comments.js, .oxlintrc.json, scripts/check-vocabulary-paths.sh]
time-to-detect: months
tags: [documentation, last-loop-lepin, meta, gates, domain-model, code-quality]
zone: apps/last-loop-lepin/VOCABULARY.md
weak-point: prose-stands-in-for-a-check
recurs: [an-approval-gate-that-only-existed-in-a-comment]
---

# A comment decayed and took the vocabulary with it

## User impact

The users were the agents and people who read `apps/last-loop-lepin/VOCABULARY.md` before naming anything, as CLAUDE.md tells them to. For five days its *Self-punch* section said the code enforced a geofence that had been removed three months earlier. No runner was affected, because the code itself was right. An agent stripping comments in PR #81 found it, because it read the code beneath each comment before deleting it.

| | Seen | Expected |
| --- | --- | --- |
| *Self-punch* in the vocabulary | "The file header names the geofence as the barrier" | No geofence: any phone may post, and coordinates are telemetry |

## Causal chain

- The vocabulary told its readers a geofence guarded self-punching.
  - Its *Self-punch* section, written in commit `001bb1d2b` (2026-08-15, by an agent), cited the controller's header.

    ```md
    - `POST /api/self-punches` carries no admin session on purpose. The file
      header names the geofence as the barrier  <!-- ❌ the geofence was gone -->
    ```

    - The header of `self-punch.controller.ts` still named the geofence as the only barrier.
      - Commit `4bb4b78d3` (2026-05-15, 19:00) dropped the geofence from the handler and its test, and left the header above the imports untouched. The header had been written by `8ad75cc88` the same day at 13:27.
    - The agent writing the vocabulary sourced each term's rules from the nearest description of the code. That commit wrote 44 terms across two apps in one pass. (Man)

## Root cause of occurrence

*Thought a header with no contradiction in its own file is current, actually a header is written once, and the change that removed the geofence had no reason to open it, so the contradiction sat in another file, the test.*

Man. The agent knew headers decay. The same commit `001bb1d2b` caught another one: its message says the header of `meanMasteryForSong` gave a reason "which its own `@domain/lineup.core` import contradicts". It caught that one because the contradiction sat in the same file. For self-punch the contradiction sat in the test file, whose title said "accepts a POST without geo coordinates (geofence removed)" (quoted by the first version of this entry). In a pass over 44 terms, a header without a visible contradiction was taken as true (inferred, the transcript is gone).

[`00-principles.md`](../standards/00-principles.md) names the general fact: a comment is "the explanation the code failed to give, parked beside it where nothing checks it and nothing keeps it true".

## Detection failure causes

- **Linter:** no rule removed comments yet. `borso/no-comments` arrived five days later, in `8621866aa`.
- **CI:** the suite asserted the new behaviour and was green. A green suite beside a contradicting sentence is invisible.
- **Vocabulary gate:** `check-vocabulary-paths.sh` checked only that each `Lives in:` names a real folder. A definition citing a comment looked like any other definition.
- **Code review:** the review of `4bb4b78d3` read a geofence removal. The header sat 40 lines above the change.

## Countermeasure

PR #81 removed the header with every other comment. The vocabulary now states the rule instead of citing a header. The same agent corrected a second stale claim in the *Punch* section, which pointed at DSQL constraints "beside the table" instead of at `docs/knowledge/dsql-postgres-compat-gaps.md`. The rule now lives in `apps/last-loop-lepin/api/src/punch/INVARIANTS.md`: "there is no geofence, and a self-punch with no coordinates at all is accepted."

## Eradication

**Type:** DevX check (level 2). `borso/no-comments` is a lint rule that refuses a comment at commit time.

**Reference:** commit [`8621866aa`](https://github.com/hugoleborso/borso.fr/commit/8621866aa) added `borso/no-comments`, and `.oxlintrc.json` sets it to `error` today. Commit [`03e16d4d6d`](https://github.com/hugoleborso/borso.fr/commit/03e16d4d6d) added the comment-citation check to `scripts/check-vocabulary-paths.sh`.

A header cannot be written any more, so it cannot decay and cannot be copied. The vocabulary check also refuses a sentence that cites one:

```sh
COMMENT_CITATION='(file )?header (names|says|records|states)|the comment (above|beside|on)\b'
```

Since `5ea2a2dbc` (PR #161), an invariant may name the test that holds it on a `Held by:` line, and the same script fails when that test file or title is gone.

**Proposed:** subtract the comment-citation regex, and make `Held by:` required. The regex guards a source that can no longer exist, and matches only four wordings. Instead, `check-vocabulary-paths.sh` would fail an `INVARIANTS.md` section that has no `Held by:` line. Today it is optional. `apps/last-loop-lepin/api/src/punch/INVARIANTS.md` has 9 sections and 3 `Held by:` lines, and *Self-punch* has none (measured with `grep -c`). Every rule in an `INVARIANTS.md` would then point at a test that fails when the code stops holding it, whatever prose source the writer copied. The gate would still miss a rule written as prose in a `VOCABULARY.md` definition, since a glossary carries no `Held by:` line. `check-vocabulary-paths.sh` refuses rule bullets and `Held by:` lines in a glossary, and a rule phrased inside a definition's sentence still passes.

**Proof it can fail:** re-adding "The file header names the geofence as the barrier" to `apps/last-loop-lepin/VOCABULARY.md` failed the gate with that line quoted, and removing it passed (recorded when `03e16d4d6d` shipped, not replayed since).

**Similar instances:** [`a-voided-punch-still-held-its-loop.md`](./a-voided-punch-still-held-its-loop.md) is the same class with no comment involved: the vocabulary promised a rule no test held. It is why `Held by:` exists.
