---
date: 2026-10-10
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#157'
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/no-api-import-in-site.js, eslint-rules/no-api-declaration-repeated-in-site.js]
time-to-detect: months
tags: [eslint, domain, adr-2026-08-13T0026, forms, zod, banana-rush, last-loop-lepin, pragma, talos, blueprints]
blueprints: [core-form-schema]
zone: apps/pragma/site/src
recurs: none (the first entry where a site copied an API rule across the boundary; the overlapping entries share only lint and app tags)
---

# The boundary a sentence held and a copy crossed

## User impact

A band member opens a bar in pragma, types the venue's phone number with
its extension, and presses Save. The form accepts it, and the API
refuses the request.

| | Seen | Expected |
| --- | --- | --- |
| A 40-character phone number on a bar | The form accepts it, the save is refused | The form says 32 characters at most, as the API does |

The form allowed 256 characters for the phone, the city and the contact
name. The API allows 32, 128 and 128. Nothing in either side was wrong on
its own terms. Each had a test, and each test passed. This was found by
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

## Causal chain

- The bar's save was refused.
  - `barCreateSchema` caps `contactPhone` at 32 characters, and the form's schema let 256 through.
    - `bar-form.core.ts` declared its own limit for four fields the API limits three ways. `61cfe0797` wrote it:

      ```ts
      const BAR_FIELD_MAX_LENGTH = 256;  // ← the API says 32 for contactPhone, 128 for city and contactName
      ```

      - The API's limits lived in `bars.schema.ts`, the file that also declares the Drizzle tables. CLAUDE.md at `61cfe0797^`, line 65, prescribed that shape ("`<domain>.schema.ts` (Drizzle table definitions + Zod input schemas)") and named no folder both sides could read. Importing the limit meant pulling the tables into the site, so restating was the path the layout left (Machine).
    - `f2fa6f626` wrote that restatement into the `core-form-schema` blueprint: "The schema restates the back end's input schema rather than importing it, because that file also declares the Drizzle tables." Ten files followed it (Machine).
      - ADR-2026-08-13T0026 opened `domain/` three days later, for rules both sides read. The blueprint was not revised, and no one read a maximum length as such a rule.
- banana-rush took the other path and imported `normalizeJoinCode` and `JOIN_CODE_LENGTH` from `@api/*`.
  - ADR-2026-08-13T0026 said "the alias plus the lint rules already hold" the boundary. The only nearby rule was `no-restricted-imports` on `domain/`, which stops the folder reaching into either side and says nothing about the site reaching into the API (Method).

## Root cause of occurrence

*Thought an input limit is a detail of the form, and the boundary is held by a lint rule. Actually the limit is a rule the API enforces, and no rule read the site-to-API boundary.* So both quick paths stayed open: import it from the API, or copy it. (Machine, with Method behind it)

Had the writers known the limit is the API's rule, they would have put it in `domain/` once that folder existed. Before it existed, the layout gave them no place to share it. Sources: the blueprint description and the ADR sentence quoted above, and `git show 61cfe0797^:CLAUDE.md`, line 65.

## Detection failure causes

- **Typing:** a number is a number. `.max(256)` and `.max(32)` have the
  same type, and the site's form values are strings the API never sees
  in that shape, so no type joins the two schemas.
- **Linter:** no rule read site imports into `api/`. ADR-2026-08-13T0026 claimed one
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

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, [`84891d2d`](https://github.com/hugoleborso/borso.fr/commit/84891d2dc) in PR #166. Both rules are enabled as errors today (`.oxlintrc.json:902-903`, read this session).

```diff
+ // eslint-rules/no-api-import-in-site.js
+ // refuses any site import into api/, through @api/* or a relative path,
+ // except `import type` from @api/app
+ // eslint-rules/no-api-declaration-repeated-in-site.js
+ // refuses a site constant or pure function whose name the same
+ // application's api/ or domain/ already declares
```

The import door is closed at lint. The copy door is closed only for a copy that keeps its name. The second rule turned a three-file finding into a sweep. Each time a limit moved to `domain/`, it named the next copy, such as the two other `MINIMUM_INTERVAL_MINUTES` in last-loop-lepin's site.

A copy under a new name still passes, and one does today. `apps/last-loop-lepin/site/src/components/organisms/admin-login.core.ts:5-6` declares `MINIMUM_PIN_LENGTH = 4` and `MAXIMUM_PIN_LENGTH = 32`, and `api/src/auth/auth.schema.ts:23-24` declares `PIN_MIN_LENGTH = 4` and `PIN_MAX_LENGTH = 32` (measured). The `reviewer` bullet in [02](../standards/02-purity-and-core-files.md), line 291, is what holds the renamed case, and it missed this one.

**Proposed:** add a lint rule on site files of apps with a `domain/` (`ls -d apps/*/domain`) that refuses any argument to Zod `.min`, `.max` or `.length` that is not an identifier imported from `@domain/*`. A copy then fails whatever it is named, and the reviewer bullet can go. A site-only limit with no API counterpart would have to live in `domain/` too or carry a disable with its reason (inferred tradeoff, not measured).

**Proof it can fail:** the rules' suites, `eslint-rules/no-api-import-in-site.test.js` and `no-api-declaration-repeated-in-site.test.js`, pin the refused shapes.

**Similar instances:** every finding listed under *User impact* was moved to `domain/`. The `infra/cdk` test that compared the two haversine copies is retired, because there is one copy. Two front-end restatements remain on purpose. banana-rush's `isJoinable` repeats the lobby clause of `refuseJoin`, and pragma's `judgeRelease` and `judgeTap` repeat the budget comparison of `judgeScore`. Both decide what a screen offers before a request exists, and the API still decides. The PIN pair above is the one unintended copy found this session.
