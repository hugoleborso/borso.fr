---
date: 2026-10-10
introduced-at: conception
detected-at: review
severity: medium
related-pr: 157
fix-pr: pending
fix-commits: [84891d2d]
eradication-level: 2
time-to-detect: months
tags: [eslint, domain, adr-0010, forms, zod, banana-rush, last-loop-lepin, pragma, talos, blueprints]
blueprints: [core-form-schema]
---

# The boundary a sentence held and a copy crossed

## Symptom

A band member opens a bar in pragma, types the venue's phone number with
its extension, and presses Save. The form accepts it, and the API
refuses the request.

The form allowed 256 characters for the phone, the city and the contact
name. The API allows 32, 128 and 128. Nothing in either side was wrong on
its own terms: each had a test, and each test passed. This was found by
reading the two schemas side by side, not by a report from the band.

The same shape was in every application with an API:

- banana-rush's site imported `normalizeJoinCode` and `JOIN_CODE_LENGTH`
  from `@api/*` in three files, and the home page declared its own
  `JOIN_CODE_LENGTH = 4` beside the import. Its lobby re-derived the start
  rule from `MINIMUM_SEATS`, and its countdown re-derived the round
  deadline the API enforces.
- last-loop-lepin carried two byte-identical `haversine.utils.ts` files,
  and its edition and runner forms restated every limit of the API's
  schemas under other names.
- talos's site spelled the ready draft status `'pret'` in three files.
- pragma's site held about forty declarations restating limits, the bar
  vocabulary, the setlist status and the tally order. Two had drifted: the bar fields
  above, and setlist entry notes, where the form stopped at 1024
  characters and the API at 2048.

## Root-cause chain

1. **Why was the save refused?** `barCreateSchema` caps `contactPhone` at
   32 characters, and the form's schema let 256 through.
2. **Why did the form have its own number?** `bar-form.core.ts` declares
   its own Zod schema with a local `BAR_FIELD_MAX_LENGTH = 256` for four
   fields the API limits three different ways.
3. **Why did it declare its own?** Its blueprint told it to. The
   `core-form-schema` description read: "The schema restates the back
   end's input schema rather than importing it, because that file also
   declares the Drizzle tables." Ten files followed it.
4. **Why was restating the only option the blueprint saw?** The limits
   lived in `*.schema.ts`, next to the tables, and CLAUDE.md forbids a
   site importing from `@api/*`. ADR-0010 had opened `domain/` for rules
   both sides read, and nobody read a maximum length as a rule.
5. **Why did banana-rush import from `@api/*` instead?** Nothing stopped
   it. The rule was a sentence in CLAUDE.md, and ADR-0010 said "the alias
   plus the lint rules already hold" the boundary. The only lint rule
   near it was `no-restricted-imports` on `domain/`, which stops the
   folder reaching into either side and says nothing about the site
   reaching into the API.

**Root cause:** the developer thought an input limit was a detail of
the form and the boundary was held by a lint rule; actually the limit is
a rule the API enforces, and no rule read the boundary. So both quick
paths stayed open: import it from the API, or copy it.

If the developer had known the limit is the API's rule, they would have
put it in `domain/` the first time, because the folder already existed
for exactly that.

## Detection failure causes

- **Typing:** a number is a number. `.max(256)` and `.max(32)` have the
  same type, and the site's form values are strings the API never sees
  in that shape, so no type joins the two schemas.
- **Linter:** no rule read site imports into `api/`. ADR-0010 claimed one
  did. The boundary also has a second door, the copy, which no import
  rule can see.
- **Local validation:** nobody types a 40 character phone number while
  testing a form.
- **CI:** each copy had its own suite at full coverage and full mutation
  score. Two green suites over two copies say nothing about whether the
  copies agree.
- **Code review:** the review checklist had no line for it, and the
  blueprint a reviewer compares against said to restate.

## Countermeasure

Every rule, limit and vocabulary both sides need moved to the
application's `domain/`, and both sides import it:

- banana-rush: `join-code.core.ts`, `game-lifecycle.core.ts`
  (`refuseStart` and the statuses), `game-error.core.ts`,
  `round-clock.core.ts` (the deadline the countdown shows and the API
  enforces).
- last-loop-lepin: `haversine.core.ts`, `edition-limits.core.ts`,
  `runner-limits.core.ts`.
- talos: `draft-status.core.ts`.
- pragma: `input-limits.core.ts`, `bar-profile.core.ts`,
  `setlist-vote.core.ts`, `chart-upload.core.ts`, `ballot-token.core.ts`.

The `core-form-schema` description now says the form keeps its own
schema, because its fields are the strings a person types, and takes
every limit inside it from `domain/`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — custom lint rules)

**Reference:** this PR · commit `84891d2d`

**The actual fix:**

```diff
+ // eslint-rules/no-api-import-in-site.js
+ // refuses any site import into api/, through @api/* or a relative path,
+ // except `import type` from @api/app
+ // eslint-rules/no-api-declaration-repeated-in-site.js
+ // refuses a site constant or pure function whose name the same
+ // application's api/ or domain/ already declares

  // eslint.config.js, SITE_FILES
  'borso/no-api-anchor-in-site': 'error',
+ 'borso/no-api-import-in-site': 'error',
+ 'borso/no-api-declaration-repeated-in-site': 'error',
```

The second rule is what turned a three file finding into a sweep. Each
time a limit moved to `domain/`, the rule named the next copy of it,
such as the two other `MINIMUM_INTERVAL_MINUTES` in last-loop-lepin's
site.

It compares names, so a copy under a new name still passes. The
`reviewer` bullet added to
[02](../standards/02-purity-and-core-files.md) covers that case, and the
blueprint no longer tells anyone to restate.

**Sibling defects swept:** every finding listed under Symptom. The
`infra/cdk` test that compared the two haversine copies is retired,
because there is one copy. Two front end restatements remain on
purpose: banana-rush's `isJoinable` repeats the lobby clause of
`refuseJoin`, and pragma's `judgeRelease` and `judgeTap` repeat the
budget comparison of `judgeScore`. Both decide what a screen offers
before a request exists, and the API still decides.

## See also

- [`the-invariant-test-read-a-file-stryker-was-rewriting.md`](./the-invariant-test-read-a-file-stryker-was-rewriting.md),
  the test that held the two haversine copies together until there was
  one.
- [`the-blueprint-that-mandated-the-refetch-that-undid-it.md`](./the-blueprint-that-mandated-the-refetch-that-undid-it.md),
  the same shape: a blueprint prescribed the move that caused the defect.
- [ADR-0010](../adr/0010-pragma-domain-folder-for-cross-boundary-rules.md).
