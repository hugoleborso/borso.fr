---
date: 2026-10-13
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#172'
fix-pr: none (opened with this entry; the number is not known when the file is written)
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-spec-test-strategy.sh, scripts/standards/canary-registry.ts, plugins/borso-harness/skills/specification/template.md, plugins/borso-harness/skills/specification/SKILL.md]
time-to-detect: hours
tags: [spec, validation, agents, process, meta]
zone: plugins/borso-harness/skills/specification/template.md
recurs: [a-spec-that-never-said-who-checks-what]
---

# A spec that routed every case twice

## Symptom

The studies spec for PR #172 had a Test strategy section, so the gate added
after [a spec that never said who checks what](./a-spec-that-never-said-who-checks-what.md)
passed. Three technical validators still logged the same line, one per run:

> The spec's Test strategy routes every happy-path step and every edge case to
> visual validation while also naming unit and back-e2e for the same cases, so
> the category D split had to be inferred.

The visual validators logged the other half: the streak, joker and
undo-yesterday rows need studies on past days, which no browser can create,
so they came back UNVERIFIABLE in every run.

In the same spec, two other promises had nothing behind them:

- The Production strategy promised named events and three alarms. The
  application has no event pipeline and no alarm on a handled 4xx, and the
  repository's lint rule refuses `console.info`. Two validation rounds failed
  on it, and the spec was rewritten mid-PR to scope it out.
- The feature read per-song mastery scores, which exist as a table, but no
  screen in the site wrote them. The song page showed only the default score,
  so every score set from the new screen would have been invisible there.
  This was caught during implementation, by reading what the site writes.

## Root-cause chain

1. **Why did every case go to two checkers?** The spec copied the template's
   Test strategy, whose visual bullet said "every numbered happy-path step and
   every edge / error case … is asserted by `/visual-validation`", while the
   unit bullet asked for tests of the same rules.
2. **Why did that pass the gate?** The gate checks that a Test strategy
   heading exists, not that each case has one owner.
3. **Why did the spec promise events and alarms?** The template's Production
   strategy asks for analytics and alerting without asking whether the
   application has a way to emit either.
4. **Why did the spec read a score no screen writes?** Step 8, *identify data
   sources*, asked whether the data exists. The table existed; whether
   anything writes it was never asked.

**Root cause:** thought a spec section that exists is a decision taken;
actually the template's own wording made the section route every case to
everyone, and promise mechanisms nobody had checked.

## Detection failure causes

- **Linter / static analysis:** `check-spec-test-strategy.sh` counted the
  heading and nothing under it.
- **Code review:** the validators caught all three, but only after the code
  was written, when fixing the spec meant rewriting it under a running PR.

## Countermeasure

- **Spec:** PR #172's spec was amended to scope the alarms and the named
  events out, and to record that the metrics come from the request log.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

**The actual fix:** a spec first committed from 2026-10-14 on must carry a
`| Case | Checked by |` table in its Test strategy, one row per case and one
checker per row. `check-spec-test-strategy.sh` refuses it otherwise, and a
new gate canary plants a spec without the table to prove the refusal fires.
Older specs are exempt by their first-commit date, so none is rewritten.

```diff
+  first_added="$(git log --diff-filter=A --format=%as -- "$spec" | tail -n 1)"
+  if [ -n "$first_added" ] && [[ "$first_added" < "$ROUTING_TABLE_SINCE" ]]; then
+    continue
+  fi
+  if ! grep -qiE '^\|[[:space:]]*case[[:space:]]*\|[[:space:]]*checked by[[:space:]]*\|' "$spec"; then
+    echo "[check-spec-test-strategy] $spec routes no case to a checker: ..." >&2
+    failed=1
+  fi
```

The template now carries the table and says which checker can produce what:
a browser cannot create a past day, so those rows go to `unit` or
`back-e2e`. Two instruction edits ride along, at level 5, because nothing
mechanical can read them: the Production strategy asks for the path of the
existing mechanism behind each event and alarm, and step 8 of the
specification skill asks for the code that **writes** each piece of data.

**Sibling defects swept:** none; the three older specs on the exemption list
are still exempt.

## See also

- [`a-spec-that-never-said-who-checks-what.md`](./a-spec-that-never-said-who-checks-what.md),
  the first time, when the section was missing altogether.
