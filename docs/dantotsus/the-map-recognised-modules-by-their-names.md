---
date: 2026-08-15
introduced-at: conception
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-commits: []
eradication-level: 1
time-to-detect: days
tags: [architecture-map, static-analysis, naming, tooling]
---

# The map recognised modules by their names, so an application that had not been renamed read as empty

## Symptom

The architecture map reported `last-loop-lepin` as an application with **no
user actions at all**, **20 of its 25 HTTP routes unreached**, and a level 3.5
coverage figure of 93% built entirely from walks that do not need a user action.
Every one of those numbers rendered confidently.

Fourteen of the twenty "unreached" routes are called from the front end on every
page load. `borsouvertures` was worse: 67 import edges across 103 files, and its
user-action level drew one of them.

The application was fine. The reader was wrong, and said so in a page whose
whole promise is that nothing on it is authored.

## Root-cause chain

1. The generator has to recognise three things it cannot infer from position:
   an application's path aliases, its query modules, and its typed API client.
2. Each was recognised by a **name**, taken from the one application the
   generator was written against:
   - aliases were the literal list `@api/`, `@site/`, `@domain/`;
   - a query module was a file ending `.queries.ts`;
   - the typed client was an import from a file ending `.client.ts`.
3. `pragma` had already been renamed to those conventions, so all three matched
   and every number was right.
4. No other application had. `borsouvertures` maps `@/*` to `./site/*`;
   `last-loop-lepin` keeps its query modules at `lib/queries/punches.ts` and its
   client at `lib/api.ts`.
5. Each miss failed **silently and downward**. An unresolved alias is not an
   error, it is an import edge that does not exist. A query module that does not
   match is not a warning, it is a feature with no actions. A client binding
   that does not resolve is not a crash, it is a hook that calls no endpoint —
   and a route nothing calls is then *reported as dead code*.
6. So the map did not degrade into "I could not read this application". It
   degraded into a confident, specific, wrong description of it.

## Detection failure causes

- **The gate proves reproducibility, not truth.** `--check` compares the
  generator's bytes against the committed bytes. A wrong map regenerates to the
  same wrong bytes and the gate is green forever.
- **`pragma` was the reference for both the conventions and the tool**, so the
  tool was only ever exercised where the conventions already held. Every other
  application looked like a migration backlog rather than a broken reader.
- **The numbers were plausible.** "This application has few user actions" and
  "this project has dead routes" are things a real codebase says. Nothing about
  20 unreached routes looks like a parser failure.
- The map's own coverage panel, which exists to make gaps visible, reported
  93% — because the shell and request walks do not need a user action to draw
  a file. The one honest signal was buried under a healthy-looking headline.

## Countermeasure

Recognise each of the three by what it *is*, in a source the application already
maintains for its own reasons:

| Recognised | Was | Now |
| ---------- | --- | --- |
| Path aliases | a hard-coded list of three prefixes | `compilerOptions.paths` in the application's own `tsconfig.json` |
| Query module | filename ends `.queries.ts` | the file's inferred layer is `query`, which the shared layer table already derives from the folder |
| Typed client | import from a file ending `.client.ts` | the binding the caller reads it through, which is `api` in every front end here |

Each replacement asks a question the application cannot answer wrongly without
also breaking its own build or its own convention.

## Eradication

**Structural, level 1.** None of the three can drift again, because none of them
is written down twice any more. The compiler owns the aliases; the layer table
that every other part of the map already uses owns the query modules; the caller
owns the binding name.

The measured effect, same commit, no application code changed:

| | before | after |
| --- | --- | --- |
| borsouvertures import edges | 67 | 273 |
| borsouvertures 3.5 coverage | 1% | 91% |
| last-loop-lepin user actions | 0 | 20 |
| last-loop-lepin unreached routes | 20 of 25 | 6 of 25 |

The six that remain are genuine: two CSV exports, a logout, a punch correction
and two edition reads with no front-end caller.

**What is still only a convention:** the client binding is the name `api`. That
is one name, in one place, and an application that calls its client something
else would report no user actions again — quietly. The honest mitigation is that
level 3.5's title now carries the count of data flows it found, and separates
the two reasons there might be none: an application with no API says so, and an
application whose API has routes the walk could not reach says *"the walk could
not read this application"* in the colour the page uses for a problem. A structural
fix would resolve the binding to a module that calls `hc()` from `hono/client`,
which needs cross-file knowledge the per-file walk does not have today.

## The general shape

A tool that reads a convention by its name works perfectly on the codebase the
convention was written for, and reports every other codebase as empty rather
than as unreadable. When the reader and the conventions ship together, test the
reader against the code that has **not** adopted them yet — that is the only
run that distinguishes "nothing here" from "I cannot see".
