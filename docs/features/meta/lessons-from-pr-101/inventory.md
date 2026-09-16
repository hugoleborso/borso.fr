# Friction inventory — PR #101

The sweep's working table. It lives here rather than in the pull-request body,
because the body is a skim and this is the evidence behind it.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | Song creation answered 500 on every save; the unseeded SSM parameter made the AWS SDK reject and nothing caught it | `commit:48120e6`, transcript: *"j'ai une 500 à la création"* | dantotsu: the-escape-hatch-was-the-only-thing-that-could-throw |
| 02 | implementation | The adapter's blueprint description promised "every failure answers null rather than throwing" and the code did not | `KAIZEN:00:06`, `commit:c718c65` | merge into row 01 |
| 03 | validation | Coverage and mutation both scored the adapter at 100% over a rejection path no test drove | `commit:48120e6` test diff | merge into row 01 |
| 04 | ci | The enforcement ledger refused a script that runs only from a PreToolUse hook, then refused the citation that fixed it | `ci:35068703769`, `KAIZEN:07:31` | dantotsu: the-ledger-could-not-see-the-hooks-it-was-built-for |
| 05 | post-merge | Operator asked whether they were being made to store a secret; the ADR had never scored *not integrating Spotify* | transcript: *"tu veux me faire stocker un secret du coup ?"* | dantotsu: an-adr-that-never-listed-doing-nothing |
| 06 | implementation | `pnpm dev` applies no migrations, so a new one answers 500 `errorMissingColumn` until back-e2e happens to run | `KAIZEN:20:53` | knowledge: pnpm-dev-serves-a-schema-it-never-migrated |
| 07 | validation | A hand-run test seed against the dev API deleted the rows back-e2e was using; the failure surfaced in an unrelated file | `KAIZEN:18:33` | merge into row 06 |
| 08 | implementation | Asked MusicBrainz for tempo and key that were never there; Spotify's audio-features withdrawn 2024 | transcript, live probes | knowledge: what-deezer-musicbrainz-and-spotify-each-carry |
| 09 | implementation | Deezer carries a BPM on its track endpoint that returns `0` for unknown, as a plain number | live probe, 4 tracks | merge into row 08 |
| 10 | validation | Claimed covers could not render because the sandbox rejects the proxy CA for every external https | `KAIZEN:18:33`, first PR body | knowledge: curl-and-chromium-disagree-about-an-asset-url — **claim retracted** |
| 11 | validation | argent's `gesture-custom`, the verb its own help documents a long press with, refuses on Chromium | `KAIZEN:18:33` | merge into `argent-gesture-swipe-does-nothing-on-chromium` |
| 12 | pr-description | PR body reached 10.5 kB; a gate table said 1411 tests while the suite ran 1426 | transcript: *"your PR body is so big you do not want to rewrite it"* | no-op: eradicated in the swept PR by `358251c` |
| 13 | pr-description | `open-pr` shipped SKILL + standard + template, 781 lines restating one contract | transcript: *"That's way too much context"* | no-op: eradicated in the swept PR by `358251c` |
| 14 | implementation | Asserted previews "haven't been getting used for validation" with no evidence | transcript: *"pas du tout, je les utilise tout le temps"* | no-op: `lectured-without-reading-the-code` names this class |
| 15 | implementation | The `gh pr create` hook refused a `grep` whose pattern contained an escaped pipe | `KAIZEN:07:21` | no-op: `the-hook-that-refused-the-page-explaining-it`, same hook family |
| 16 | validation | The knowledge entry retracts the toggle-stripping claim; a hook re-measured it as true four weeks later | `KAIZEN:07:21` | no-op: `two-copies-that-had-to-agree-and-nothing-made-them` |
| 17 | validation | The standards reviewer's scope predicate disagrees with `seal.ts verify`, which also scopes `VOCABULARY.md` | `KAIZEN:20:41` (`standards-reviewer`) | no-op: `a-review-brief-that-disagreed-with-its-own-gate` |
| 18 | implementation | A lint-rule test resolves fixtures against the real tree, so a rename fails it far from the change | `KAIZEN:18:33`, `commit:a9af90b` | no-op: `the-invariant-test-read-a-file-stryker-was-rewriting` |
| 19 | implementation | A guard that could not change an outcome passed coverage; only mutation named it | `KAIZEN:18:33`, `commit:a9af90b` | no-op: `a-green-mutation-gate-is-not-a-green-coverage-gate` |
| 20 | validation | `useUpdateSong` had no `onSuccess`, so the server-resolved Spotify id never reached the cache | `commit:ea8d704` | no-op: `the-blueprint-that-mandated-the-refetch-that-undid-it` |
| 21 | post-merge | Operator had to ask why the unread `mbid` and `release_id` columns were not deleted | transcript | no-op: `dsql-alter-table-only-add-column` states the constraint |
| 22 | meta | `writing-for-agents` did not auto-trigger while a skill was being rewritten | transcript | no-op: `feature-flow-skills-do-not-auto-trigger` |
| 23 | meta | Eleven friction lines logged, ten as `main` and one as `standards-reviewer` | `scripts/kaizen.sh show` | no-op: `subagents-that-were-never-told-their-label` |

## Patterns the table shows and no row does

- **The gate-exempt file is where the bug lives.** Rows 01–03 are one defect:
  the `*.client.ts` escape hatch exists because such a file cannot meet the
  adapter gates, and it was the only file in the chain that could throw.
- **Prose promising behaviour is a claim nobody checks.** The blueprint
  description, the commit message and the ADR consequence all said the
  resolution never fails a write.
- **The repository's model of enforcement lagged its practice** (row 04).
- **A narrow option set is worse than a wrong choice** (row 05).
- **Twelve of twenty-three rows were already eradicated**, which is the corpus
  working and the reason this sweep ships three dantotsus rather than ten.
- **One of my own entries was false, and a gate caught it** (row 10). The
  undated-negative-claim check refused the commit; dating it meant verifying
  it; verifying it killed it.
