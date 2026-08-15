# 01. Naming

## Rule

A name spells out what the thing is, with no abbreviations, no single letters,
and no shorthand that a newcomer would have to look up. Length costs nothing,
and ambiguity costs a reader every time they meet the name.

## Reason

Someone writes a name once and reads it hundreds of times. Writing
`dnfCandidates` saves eleven characters, and it costs every later reader a trip
to the glossary to learn that "dnf" means "did not finish". Writing
`runnersEligibleForDidNotFinish` costs nothing at runtime and nothing at read
time.

Abbreviations also break search, because someone grepping for `duration` never
finds `dur`.

## Identifiers are full words

```ts
// Don't
const h = computeHash(m);
const cfg = loadConfig();
const usr = await repo.get(id);

// Do
const migrationDigest = digestMigrations(migrationFiles);
const applicationConfiguration = loadApplicationConfiguration();
const runner = await runnerRepository.findById(runnerId);
```

The only exception is a counter in a `for` header, and even there `index` reads
better than `i`.

An established domain term is not an abbreviation, so `gpx`, `uci`, `bpm`,
`url`, and `id` are fine, because they are the names of the things themselves.

## A function name is a verb phrase naming its result

A function name answers the question "what do I get back", and it does not
describe how the function works inside.

```ts
// Don't, because each name describes a mechanism
hashMigrations(files);
processRunner(runner);
handleSetlist(setlist);

// Do, because each name describes the result
digestMigrations(files);
projectRunnerStanding(runner, punches, now);
reorderSetlistEntries(entries, movedEntryId, targetPosition);
```

The verbs we use, and what each one promises:

| Verb                      | Returns                                  |
| ------------------------- | ---------------------------------------- |
| `find…`                   | The thing, or `null` when it is absent   |
| `get…`                    | The thing, and throws when it is absent  |
| `list…`                   | An array, possibly empty                 |
| `build…` and `compose…`   | A new value assembled from parts         |
| `project…` and `derive…`  | A view computed from source data         |
| `select…`                 | One option chosen from several           |
| `assert…`                 | Nothing, and throws when the check fails |
| `is…`, `has…`, and `can…` | A boolean                                |

The verbs `handle`, `process`, `manage`, and `do` are banned, because a reader
cannot predict what any of them will do.

## A boolean name reads as a claim

Write `isFinished`, `hasPendingUpload`, and `canSelfPunch`, and do not write
`finished`, `flag`, or `status` for a boolean.

A negated name such as `isNotReady` is banned, because the reader has to
un-negate it every time it appears inside a `!`.

## A name says what the value is, not how it was obtained

`parsed`, `result`, `data`, `entries`, `payload`, `output`, `response` and
`items` name the step that produced the value. They tell a reader where the
value came from, which they can see anyway on the line above, and nothing about
what it holds, which is the thing they came to find out.

```ts
// Don't
const parsed = songWriteVariablesSchema.safeParse(variables);
return parsed.success && parsed.data.id === songId;

// Do
const namedSong = songWriteVariablesSchema.safeParse(variables);
return namedSong.success && namedSong.data.id === songId;
```

The cost compounds with distance. A parameter carries its name into every call
site and every test:

```ts
// Don't — a reader three files away has no idea what an entry is
export function didLastSongWriteFail(entries: readonly SongWriteEntry[], songId: string): boolean

// Do
export function didLastSongWriteFail(songWrites: readonly SongWrite[], songId: string): boolean
```

The test that catches this: read the name with the right-hand side covered. If
`const parsed = …` could sit above a Zod parse, a JSON parse, a date parse or a
chord parse and read the same in all four, it names none of them.

Two exceptions, both narrow. A short-lived local inside a small pure function,
where the whole story is visible at once, may use the plain word the domain uses
— `merged`, `candidate`, `accumulator`. And a name imposed by a library or a
destructuring — `data` out of TanStack Query, `response` out of `fetch` — stays
as the library named it, because renaming it hides the contract.

## A file name says what the file contains

| Suffix                   | Contents                                  |
| ------------------------ | ----------------------------------------- |
| `<domain>.controller.ts` | HTTP routes, and no logic                 |
| `<domain>.service.ts`    | Orchestration and input and output        |
| `<domain>.repository.ts` | Database access only                      |
| `<domain>.schema.ts`     | Drizzle tables and Zod input schemas      |
| `<domain>.core.ts`       | Pure domain rules, covered fully          |
| `<topic>.utils.ts`       | Pure cross-cutting helpers, covered fully |
| `<domain>.types.ts`      | Types shared inside one slice             |
| `<Component>.tsx`        | Exactly one React component               |

[02. Purity and core files](./02-purity-and-core-files.md) explains what makes
a file `.core.ts` rather than `.utils.ts`.

## A literal value in a function body gets a name

```ts
// Don't
if (elapsedSeconds > 43200) { … }

// Do
const MAXIMUM_RACE_DURATION_SECONDS = 12 * 60 * 60;
if (elapsedSeconds > MAXIMUM_RACE_DURATION_SECONDS) { … }
```

The constant can live in the same file, because the declaration itself is what
documents the choice. The values `0`, `1`, `-1`, and the empty string are
exempt when they are used as identity values.

## Everything is written in English

Every identifier, type, comment, commit message, test name, and document in
this repository is written in English, with no exceptions.

The rule covers words that arrive in French during a conversation, and you
translate them at the moment you write them down rather than later.

| Heard in chat   | Written in code     |
| --------------- | ------------------- |
| `prenom`        | `firstName`         |
| `lieu`          | `location`          |
| `porteurTonal`  | `tonalCentreHolder` |
| `matos`         | `equipment`         |
| `fiche coureur` | `runnerProfile`     |

Text that a user reads is the one place where non-English words exist, and it
lives in `site/src/i18n/fr.json` rather than inline in a component. See
[09. Internationalisation](./09-i18n.md).

## Comments

The default is no comment at all. Before you write one, try a better name, an
extracted function, a type, or a test, because one of the four usually says the
same thing better.

A comment survives review when it documents something the reader cannot deduce
from the code, e.g., a vendor bug and its workaround, a runtime constraint such
as CloudFront Functions not being Node, or a CloudFormation intrinsic that
looks wrong until you know why it is there.

A comment fails review when it restates the code, narrates history such as "we
used to do X", explains why we chose a library, or describes what the code does
not do. History belongs in `git log`, and a library choice belongs in an
[architecture decision record](../adr/README.md). When an absence needs
explaining, the code is unclear, so rewrite the code.

JSDoc is welcome on an exported function, where it documents the arguments, the
return value, and any surprising edge case.

## Enforced by

- `eslint:borso/no-abbreviated-identifier` rejects a dictionary of known
  abbreviations and any identifier under three characters outside a loop header.
- `eslint:borso/function-names-are-verb-phrases` rejects the `handle`,
  `process`, `manage`, and `do` prefixes.
- `eslint:borso/no-french-identifiers` flags a dictionary of French terms that
  have appeared in this repository before.
- `eslint:borso/no-step-named-value` rejects a `const` or `let` named `parsed`,
  `result`, `results`, `res`, `data`, `entries`, `payload`, `output`, `obj`,
  `arr`, `val`, `tmp`, `temp`, `item` or `items`. A `for (const entry of …)`
  head and a destructuring pattern are out of scope, matching the two
  exceptions above.
- `eslint:unicorn/consistent-boolean-name` requires a boolean to read as a
  claim.
- `eslint:unicorn/catch-error-name` requires `catch (error)`.
- `eslint:no-magic-numbers` requires a literal to be named, across `apps/` and
  `infra/`, with `enforceConst` so the name is a `const`. Exempt: `0`, `1` and
  `-1` as identity values; the HTTP status codes `200`, `201`, `204`, `301`,
  `302`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`, `502` and
  `503`, which are names in a published registry already; an array index, a
  parameter or class field default, and an object property, whose key or
  parameter name is the name the rule asks for. Off in a test file, where a
  fixture literal belongs next to the assertion that gives it meaning.
- `reviewer` checks that a verb keeps the promise the table above makes, so a
  `find…` returns `null` when the thing is absent and a `get…` throws.
- `reviewer` checks that a boolean name is not negated, because `isNotReady`
  reads as a double negative inside a `!`.
- `reviewer` checks that a comment documents something the code cannot say,
  and is not a restatement, a history note, or a description of what the code
  does not do.
- `reviewer` checks that a file name says what the file holds, because the
  suffix table is a convention no rule reads.
