---
date: 2026-09-16
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: '#105'
fix-pr: '#106'
fix-commits: []
eradication-level: 2
time-to-detect: days
tags: [gates, pre-commit, ci, meta, self-improvement-loop, shell]
---

# The loop shipped the same gate twice, a day apart, and both ran

## Symptom

`scripts/` held two gates:

```
scripts/check-migration-numbering.sh
scripts/check-migration-numbers.sh
```

Both walked `apps/*/api/src/database/migrations`. Both ran the same
pipeline over it — `find … -printf '%f\n' | sed -n 's/^\([0-9][0-9]*\)_.*/\1/p'
| sort | uniq -d`. Both were wired into `.husky/pre-commit`. Both printed a
success line on every commit, so every commit said the same thing twice under
two different names.

Each was the shipped eradication of a dantotsu:
[`two-branches-took-the-same-migration-number`](./two-branches-took-the-same-migration-number.md)
(PR #102) and
[`two-branches-that-both-claimed-migration-0006`](./two-branches-that-both-claimed-migration-0006.md)
(PR #105). Both entries are dated 2026-09-16.

Each was also cited by a standard — and by a *different* one.
`docs/standards/11-database.md` named `check-migration-numbers.sh`;
`docs/standards/12-linting-and-gates.md` named `check-migration-numbering.sh`.
Neither standard mentioned the other's script.

## Root-cause chain

1. **Why were there two gates for one subject?**
   Two kaizen sweeps, a day apart, each found a migration-number collision in
   the PR it was sweeping and each shipped a gate for it.

2. **Why did the second sweep not find the first's gate?**
   Its inventory step cross-checks each friction line against the *corpus* —
   `docs/dantotsus/`, `docs/knowledge/` — to decide whether the subject is
   already captured. It never checks whether the *eradication it is about to
   write* already exists in `scripts/`. The corpus check answers "has anyone
   written about this", not "has anyone already fixed this".

3. **Why did the corpus check not answer it anyway?**
   The first sweep's entry is titled *Two branches took the same migration
   number*; the second's friction line was *two migrations claimed 0006*. A
   search over titles for the words in the second line does not reach the
   first entry. The two describe the same failure in the vocabulary of two
   different pull requests.

4. **Why did the enforcement ledger not object?**
   It asks two questions of each mechanism: does the script exist, and does
   some standard explain it. Both scripts existed. Both were explained. It has
   no question of the form *is this the same mechanism as that one*, because
   deciding that two shell scripts compute the same answer is not decidable.

5. **Why did pre-commit not object?**
   A hook is a list of commands. Nothing reads the list as a set of subjects,
   so a subject appearing twice reads exactly like two subjects appearing once.

6. **Why did review not object?**
   The two names are four characters apart in the middle of a 26-character
   string, and the second one arrived in a pull request that also shipped
   three other gates. The pair is only visible in a listing of the whole
   folder, which no diff ever shows.

**Root cause:** the sweep thought *the corpus is the record of what has been
fixed*, actually *the corpus is the record of what has been written about*,
and the two diverge exactly when the same defect is described twice in
different words — which is the normal case, because each sweep names the
defect after the pull request it swept.

## Detection failure causes

- **Typing:** shell; nothing to type.
- **Linter / static analysis:** ESLint does not lint `scripts/*.sh`, and no
  linter compares two programs for equivalent behaviour.
- **Functional validation locally:** both gates passed, which is what a
  duplicated gate does. A gate that agrees with itself is indistinguishable
  from two gates that agree.
- **CI:** `ci.yml` ran one of the two and the hook ran both. Everything green.
- **Code review:** the second gate arrived alongside three others in a sweep
  PR; the duplicate is visible in a folder listing and invisible in a diff.
- **The enforcement ledger:** it is the one mechanism that enumerates every
  gate in one place, and it had both rows adjacent in its generated table. It
  is generated and nobody diffs it — and it asks existence, not identity.

## Countermeasure

Both scripts deleted, replaced by one that covers every folder where the
leading number is the order, not just migrations:

- **Code:** `scripts/check-numbered-sequences.sh`. Sequences are a list —
  `apps/*/api/src/database/migrations:sql:migration` and
  `docs/adr:md:architecture decision record` — so the next sequence is one
  line rather than a third script. The `docs/adr` entry closes a collision
  that had no gate at all; see
  [`an-adr-number-goes-to-whoever-writes-it-first`](./an-adr-number-goes-to-whoever-writes-it-first.md).
- **Both standards repointed** at the one script, and each now states that the
  other folder is covered by it, so a reader of either learns the mechanism is
  shared.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** PR #106 · `scripts/check-gate-names-are-distinct.sh`

Nothing can decide that two shell scripts compute the same answer. What can be
decided is that two authors, naming the same subject, converged on the same
words — which is what happened here, and what usually happens, because a name
is written from the subject and there are only so many ways to say it.

**The actual fix:**

```diff
+STEM_LENGTH=5
+
+ls scripts/check-*.sh |
+  sed 's|scripts/check-||; s|\.sh$||' |
+  while read -r name; do
+    key="$(echo "$name" | tr '-' '\n' | cut -c"1-${STEM_LENGTH}" | sort -u | tr '\n' ' ')"
+    echo "${key}|${name}"
+  done |
+  sort |
+  awk -F'|' '{ claimants[$1] = claimants[$1] " check-" $2 ".sh" }
+    END { for (key in claimants) if (split(claimants[key], parts, " ") > 1) print key "|" claimants[key] }'
```

`migration-numbering` and `migration-numbers` both fold to `migra numbe`, and
the pair is refused. Measured against the 23 gates in the tree when this
landed: 23 distinct keys, no false positive. Verified to fire by copying
`check-numbered-sequences.sh` to `check-numbered-sequence.sh`, which exits 1
naming both.

Wired into `.husky/pre-commit` and into `ci.yml`, and cited in
`docs/standards/12-linting-and-gates.md`, which is what the enforcement ledger
requires of any mechanism that runs.

**What it misses, stated rather than hidden:** a duplicate whose two authors
chose unrelated words. That is the case where a name was never going to help,
and the alternative — comparing behaviour — is not decidable.

**Sibling defects swept:** the two superseded dantotsus each carry a note
pointing at the merged script, so a reader arriving at either entry does not
go looking for a file that is gone.

## See also

- [`two-branches-took-the-same-migration-number.md`](./two-branches-took-the-same-migration-number.md) — the first of the pair.
- [`two-branches-that-both-claimed-migration-0006.md`](./two-branches-that-both-claimed-migration-0006.md) — the second, written without seeing the first.
- [`an-adr-number-goes-to-whoever-writes-it-first.md`](./an-adr-number-goes-to-whoever-writes-it-first.md) — the third occurrence of the shape, in a folder neither gate covered.
- [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md) — the same reflex one layer out: writing before looking.
