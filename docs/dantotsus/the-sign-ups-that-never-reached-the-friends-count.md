---
date: 2026-11-26
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#410'
fix-commits: [143937e82, self]
eradication-level: 2
eradication-paths: [scripts/check-spec-records.sh, .husky/pre-commit]
time-to-detect: 3 hours
tags: [pragma, spec, gates, conception]
zone: docs/features/pragma/concert-sign-up/spec/spec.md
recurs: [the-operator-redrew-the-feature-on-the-preview]
---

# The sign-ups never reached the friends count

## User impact

PR #410 let a fan answer "Tu viens soutenir qui dans le groupe ?" when signing
up. The concert's "Amis par membre" card already counted friends per member,
from a number each member typed by hand. The two never met.

| | Seen | Expected |
| --- | --- | --- |
| A member opens a concert's Détails tab | The hand-typed friends count only | The real sign-ups per member against the friends they expected |
| The operator, at 20:43 | "I thought the sign-ups were wired to the friends per member" | Nothing to ask |

PR #414 built what he expected, after a mockup round.

## Causal chain

- The "Amis par membre" card ignored the sign-ups.
  - PR #410 stored each sign-up's answer to "Tu viens soutenir qui dans le
    groupe ?" and showed it nowhere the members already looked.
    - The spec asked for the answer and never said which screen counts it.
      ← the faulty line, item 8 of
      `docs/features/pragma/concert-sign-up/spec/spec.md` at `cf9fb626a`

      ```markdown
      8. After signing up, a second bottom sheet [...] asks two optional questions:
         "Tu viens soutenir qui dans le groupe ?" (one band member as a chip with
         the member's colour mark, or none) [...]
      <!-- no item links this answer to the "Amis par membre" card -->
      ```

      - The session that built the page wrote the spec after the build, to
        record "the scope [the operator set] in the session that built it"
        (spec, line 3). It treated the answer as a new field of the new
        registration record.
        - The existing quantity was in the code, as the i18n keys
          `friendsCount` ("Nombre d'amis attendus") and
          `friendsCountPerMember` ("Amis par membre") (measured,
          `git grep friends cf9fb626a^ -- apps/pragma/site/src/i18n/fr.json`).
          It had no name where a writer looks before naming.
          - **Material:** `apps/pragma/VOCABULARY.md` holds no term for the
            friends a member expects (`grep -i friend apps/pragma/VOCABULARY.md`
            prints nothing, measured). CLAUDE.md sends a writer to that file
            before naming a type or a column, so reading it could not reveal
            the overlap.

## Root cause of occurrence

*Thought "who do you come to support" was a new answer to store on the
registration, actually it is a second source for the friends per member, a
quantity the concert's Détails tab already showed from a hand-typed count.*
**Material:** the domain vocabulary the session read before naming had no
entry for that quantity, so the overlap was not in its context.

The operator's words at 20:43, from the session transcript the entry was
written from: "I thought the sign-ups were wired to the friends per member".

## Detection failure causes

- **Pre-commit:** `scripts/check-spec-records.sh` looked for `CREATE TABLE`
  in the spec's text. Its header said: "a spec.md holding `CREATE TABLE
  <name>` carries, under `### Records`, a row". The short-form spec held no
  SQL, so the gate passed while the branch's migrations created
  `concert_registration` and `concert_prize`. The *Records* questions never
  came up.
- **Records questions:** even when asked, they covered how a record is shaped
  and created, never which existing screen should count it.
- **Technical validation:** it checks the code against the spec, and the spec
  never named the link.

## Countermeasure

PR #414 counts each member's sign-ups on the card, against the expected count
the members still type.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
-  tables="$( (grep -oiE 'CREATE TABLE( IF NOT EXISTS)? [a-z_][a-z0-9_]*' "$spec" || true) | ...)"
+  migrations="$(added_on_branch "apps/$(cut -d/ -f3 <<<"$spec")/*/migrations/*.sql")"
+  tables="$( (grep -ohiE 'CREATE TABLE( IF NOT EXISTS)? "?[a-z_][a-z0-9_]*' "$spec" $migrations || true) | ...)"
-  echo "is it its own record or part of another one, and where is it created from?" >&2
+  echo "is it its own record or part of another one, where is it created from, and which existing screen counts or shows it?" >&2
```

The gate now runs on a new migration too, and finds the tables in the
migrations the branch adds to the spec's app. The question it prints asks which
existing screen counts the new record.

**Proof it can fail:** on a clone checked out at PR #410's merge, with
`origin/main` set to its parent, the old gate exits 0 on the spec. The new one
refuses: "the branch creates table concert_registration, and the ### Records
table of docs/features/pragma/concert-sign-up/spec/spec.md has no row for it".
Given the migration file, it exits 1 too. Given another app's migration, it
exits 0.

What holds has a gap. The gate refuses a missing Records row. It does not read
whether the row answers the screen question, so a writer who answers "none"
passes.

**Proposed:** add a `## Friends expected` entry to `apps/pragma/VOCABULARY.md`,
naming the hand-typed count, the "Amis par membre" card and where it lives. A
spec or a column that adds "supports a member" then meets the existing term at
the moment CLAUDE.md sends the writer to the vocabulary. The same pass over
each app's vocabulary, for every quantity a screen shows, closes the class.
`scripts/check-vocabulary-paths.sh` already checks that a vocabulary's
`Lives in:` paths exist, so a new entry's paths would be held.

**Similar instances:** `grep -L '### Records' docs/features/*/*/spec/spec.md`
lists the specs with no Records table. Specs already on `main` stay exempt, as
the gate's header explains.
