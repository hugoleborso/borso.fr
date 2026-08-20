---
date: 2026-08-20
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#63'
fix-pr: '#63'
fix-commits: [fb4f52a, 305f138]
eradication-level: 2
time-to-detect: 3 hours
tags: [standards, documentation, tooling, ci]
---

# Prose the seal never asked anyone to read

## Symptom

`apps/borso-fr/VOCABULARY.md` went false against its own application twice in
one pull request, and every mechanical gate stayed green through both.

The first time, the Galaxy entry said the component mounts *"with one frozen
parameter set"*. The branch had just made two of its uniforms move every frame —
that was the entire mechanism of the feature being shipped.

The second time, and after the entry had been rewritten, the Jump entry said
*"Only the landing page installs it"*. The next commit installed it on all three
pages, which was the operator's explicit instruction. A third pass then caught a
weaker version of the same drift: *"the caller passes the length the click is
held for"*, where two of the three callers pass nothing and take a default.

Three falsifications, three separate reviewer passes, zero mechanical signals.

## Root-cause chain

1. **Why did the prose go false without anything failing?**
   Nothing reads it. `scripts/check-vocabulary-paths.sh` checks that each term
   names a folder that exists, which is the one mechanically checkable part, and
   it passed every time — the folders were all real.

2. **Why did the standards seal not cover it?**
   `isReviewablePath` in `scripts/standards/seal.core.ts` returned `false` for
   it. The predicate asked for `.ts` and `.tsx` under `apps/` and `infra/`, and
   nothing else.

3. **Why did the predicate stop at source files?**
   Its own comment says so: *"the standards are about that code, and asking for
   a seal on a generated page or a lock file would train everyone to seal
   without reading."* A sound instinct aimed at generated files and lock files,
   which swept up hand-written prose as collateral.

4. **Why was that not noticed when the seal was built?**
   Because the ledger says the opposite, in as many words. `01-naming.md` ships
   the bullet *"`reviewer` checks that a definition in a `VOCABULARY.md` is
   still true, which is prose against code and therefore nothing a rule can
   do."* The reviewer is named. Nothing routed the file to one.

**Root cause:** thought *the seal covers the code the standards govern*,
actually *the seal covers the code the standards govern and the ledger also
names a reviewer for a file the seal never hands them*. The two halves of the
same mechanism disagreed, and the disagreement is invisible because each half is
individually correct.

The sentence in the ledger — *"nothing a rule can do"* — is true and was read as
more than it says. No rule can check whether a definition is **true**. The seal
does not check truth; it records that a reviewer read exact content, and
unseals the moment that content changes. That is precisely the mechanism this
file needed.

## Detection failure causes

- **Typing:** markdown has no types.
- **Linter / static analysis:** Prettier does not touch markdown here by
  policy, and no linter reads prose for truth.
- **Functional validation locally:** `check-vocabulary-paths.sh` passed
  correctly — it checks paths, and the paths were fine.
- **CI:** the seal is not wired into CI at all yet, which
  [`docs/standards/README.md`](../standards/README.md) states plainly. Even
  once it is, it would have asked for nothing on this file.
- **Code review:** this is where all three were caught, by the
  `standards-reviewer` agent, and only because it opened the file on its own
  initiative while checking a claim in a `.ts` comment. The third catch was
  explicitly recorded as *advisory, outside the checklist*.

That last point is the sharp one: the corrections happened by luck. The agent
was reviewing `warp-drive.ts`, followed a claim into the vocabulary, and found
it stale. Nothing in its brief sent it there.

## Countermeasure

- **Code:** commits `fb4f52a` and `305f138` — the Galaxy entry now names the two
  uniforms that move and why the clock accumulates; the Jump entry no longer
  claims a single install site; Departure and Fade were added as terms, because
  the branch had created a second kind of page departure the vocabulary had no
  word for; and the overstated caller sentence was narrowed to what the three
  call sites actually do.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the seal predicate now asks for this file)

**Reference:** [PR #63](https://github.com/hugoleborso/borso.fr/pull/63) ·
kaizen PR for this entry

**The actual fix:**

```diff
+/**
+ * Prose a reviewer bullet already asks somebody to check against the code, and
+ * which no other gate reads. `01-naming.md` asks a reviewer whether each entry
+ * in a `VOCABULARY.md` is still true; nothing pointed the seal at the file, so
+ * a definition could go false against the branch that falsified it and every
+ * mechanical check stayed green. Hashing it here does not make the prose
+ * checkable — it makes the review of it recorded, which is the whole mechanism.
+ */
+const REVIEWABLE_FILENAMES = ['VOCABULARY.md'];
+
 export function isReviewablePath(path: string): boolean {
   if (!REVIEWABLE_ROOTS.some((root) => path.startsWith(root))) return false;
+  if (REVIEWABLE_FILENAMES.some((filename) => path.endsWith(`/${filename}`))) return true;
   if (!REVIEWABLE_EXTENSIONS.some((extension) => path.endsWith(extension))) return false;
   return !EXCLUDED_SUFFIXES.some((suffix) => path.endsWith(suffix));
 }
```

`isReviewablePath` is a pure function in a `.core.ts` file, so it carries the
repository's 100% coverage and mutation gates; the change ships with three new
cases in `seal.core.test.ts`, including two that pin the boundary — `docs/VOCABULARY.md`
is not under an application and `NOT-VOCABULARY.md` must not match as a suffix.

The consequence is small and exactly the point: a branch that edits an
application's vocabulary now cannot be sealed until a reviewer has read the
edited content, and editing it afterwards unseals it again.

**Sibling defects swept:** the pull-request description drifted the same way,
twice — first when the merge with `main` moved every source file to `site/src/`
and left the body's file table pointing at paths that no longer existed, then
when the departure work made its "the other pages hold no click" section the
opposite of the truth. Both were corrected by hand. No gate is proposed for a
PR body: it lives on GitHub rather than in the checkout, so nothing here can
read it, and that limit is itself recorded in
[`../knowledge/github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md).

## See also

- [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md)
  — the same shape one layer up: prose asserting a protection that nothing in
  the repository could observe.
- [`a-generated-file-cannot-contain-its-own-commit.md`](./a-generated-file-cannot-contain-its-own-commit.md)
  — another entry about a gate whose subject was not what it appeared to be.
