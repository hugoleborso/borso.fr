---
date: 2026-08-20
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#63'
fix-commits: [957846c4d2]
eradication-level: 5
eradication-paths: [.claude/agents/technical-validator.md, scripts/check-vocabulary-paths.sh]
time-to-detect: 3 hours
tags: [standards, documentation, tooling, ci]
zone: .claude/skills/technical-validation
weak-point: prose-stands-in-for-a-check
recurs: [an-approval-gate-that-only-existed-in-a-comment]
---

# Prose the seal never asked anyone to read

## User impact

`apps/borso-fr/VOCABULARY.md` went false against its own application three times
in PR #63, and every mechanical gate stayed green. The next agent to read it
would have built on a wrong description of the Galaxy and the Jump.

| | Seen | Expected |
| --- | --- | --- |
| Galaxy entry | "with one frozen parameter set", while the branch made two of its uniforms move every frame | the two moving uniforms named |
| Jump entry | "Only the landing page installs it", one commit before the operator's instruction installed it on all three pages | the install sites as they are |
| Departure entry | "the caller passes the length the click is held for", while two of three callers pass nothing | what each caller does |

## Causal chain

- The Galaxy entry described a component that no longer existed.
  - Commit `efd65da5e1` ("the galaxy makes the jump, instead of a field drawn
    over it") changed `Galaxy.tsx` so two uniforms move each frame, and left
    `VOCABULARY.md` unchanged.
    - The sentence it made false, written by commit `db661ac8f` four days
      earlier:

      ```markdown
      <!-- true when written, false once efd65da5e1 moved the uniforms -->
      ... with one frozen parameter set
      ```

      - The writer changed code that a vocabulary entry described, and edited
        only the code. Nothing in the implementation flow tied a change to a
        folder to the prose that describes that folder.
- The Jump and Departure entries went false the same way, each against the
  code beside it. Commit `fb4f52a07` wrote "Only the landing page installs it".
  Commit `3fff8a765` installed the Jump on all three pages, replaced that
  sentence, and wrote the Departure line "the caller passes the length the click
  is held for", which two of the three callers contradict.

## Root cause of occurrence

*Thought a vocabulary entry needs updating when the entry is edited, actually it
goes false when the code it describes changes, and that change never opens the
entry.* (Method)

The flow treated the glossary as a document to edit, not as a claim about code.
The 01-naming bullet named a reviewer for it, "`reviewer` checks that a
definition in a `VOCABULARY.md` is still true", and nothing routed a code change
to that reviewer.

## Detection failure causes

- **`check-vocabulary-paths.sh`:** it checked that each term names a folder that
  exists, the one mechanical part, and passed.
- **Standards seal:** `isReviewablePath` in `scripts/standards/seal.core.ts`
  accepted only `.ts` and `.tsx` under `apps/` and `infra/`, so the file was
  never in a review's scope.
- **Code review:** the `standards-reviewer` agent caught all three, only because
  it followed a claim in `warp-drive.ts` into the vocabulary. Its brief did not
  send it there.

## Countermeasure

Commits `fb4f52a07` and `305f138` correct the Galaxy and Jump entries, add the
terms Departure and Fade, and narrow the caller sentence to what the three call
sites do.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`957846c4d2`](https://github.com/hugoleborso/borso.fr/commit/957846c4d2)
added `VOCABULARY.md` to `isReviewablePath`, so an edited vocabulary needed a
reviewer's seal. Commit `c54e32da79` removed the seal and the separate standards
review on 2026-10-29. Two mechanisms hold today.

- `.claude/agents/technical-validator.md` reads "each changed `VOCABULARY.md` or
  `INVARIANTS.md` **in full**". A brief to an agent is level 5. It also reads
  only changed files, so this entry's first case, code changed and prose left
  alone, still passes.
- Commit `2cfa2a34d4` (PR #353) split each vocabulary into a glossary and an
  `INVARIANTS.md` beside the code. The Galaxy's rules now live in
  `apps/borso-fr/site/src/components/organisms/INVARIANTS.md`.
  `scripts/check-vocabulary-paths.sh` fails when a `Held by:` test file or title
  is gone. The Galaxy's bullets carry no `Held by:` line, so nothing checks them.

**Proof it can fail:** none for this class. A change to `Galaxy.tsx` that leaves
its `INVARIANTS.md` false passes every gate.

**Proposed:** make `scripts/check-vocabulary-paths.sh` refuse an `INVARIANTS.md`
section that carries a rule bullet and no `Held by:` line. The script already
parses every section and fails when a named test file or title is gone, so the
refusal is one more condition in the same loop. Each behaviour claim would then
name a test, and a code change that makes the claim false would fail that test,
not wait for a reader. This moves the class from knowledge to detection (level
4). `Held by:` lines sit per section, not per bullet, so the check works at that
grain. Today 70 of 207 sections have no `Held by:` line, the Galaxy's among them
(measured with awk over every `INVARIANTS.md`), so the change ships with their
tests or with a narrowed rule.

**Proposed, as a supplement:** have the validator read every `INVARIANTS.md` in
a folder the diff touches, not only the changed ones. The list is
`git diff --name-only <base> | xargs -n1 dirname | sort -u`, then the
`INVARIANTS.md` in each, printed into the validator's brief by the
`/technical-validation` skill. It covers the bullets no test can hold, such as
where a component was ported from. It stays level 5, since it is a brief.

**Similar instances:** the pull-request body of PR #63 drifted the same way twice
and was corrected by hand. It lives on GitHub, outside the checkout, so no check
here can read it.
