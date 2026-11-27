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

- The friends card ignored the sign-ups.
  - The spec added a registration that names a member, and never said which
    existing screen should count it.
    - Nobody asked the operator, because the *Records* questions never came up.
      - `scripts/check-spec-records.sh` looked for `CREATE TABLE` in the spec's
        text. The short-form spec held no SQL, so the gate passed while the
        branch's migrations created `concert_registration` and `concert_prize`.

## Root cause of occurrence

*Thought every spec that adds a table spells it out in SQL, actually a
short-form spec describes the data in prose and the table lives only in the
migration.*

The gate's header said: "a spec.md holding `CREATE TABLE <name>` carries,
under `### Records`, a row". It measured what the spec wrote, not what the
branch built.

## Detection failure causes

- **Pre-commit:** the gate ran only on `spec.md` files and only read their
  text.
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

**Similar instances:** `grep -L '### Records' docs/features/*/*/spec/spec.md`
lists the specs with no Records table. Specs already on `main` stay exempt, as
the gate's header explains.
