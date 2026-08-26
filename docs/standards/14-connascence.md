# 14. Connascence

## Rule

When two pieces of code must change together, one of them owns the decision and
the other imports it. A value, an ordering, or a rule that is written a second
time is written in one place and read from there.

```ts
// apps/pragma/site/src/routes/catalog/chart-kind.utils.ts — do
export type ChartKind = 'chordpro' | 'pdf' | 'image';
export const CHART_KINDS: readonly ChartKind[] = ['chordpro', 'pdf', 'image'];

// apps/pragma/site/src/components/molecules/ChartKindIcon.tsx — do
import { type ChartKind } from '../../routes/catalog/chart-kind.utils';

// apps/pragma/site/src/components/molecules/ChartKindIcon.tsx — don't
export type ChartKind = 'chordpro' | 'pdf' | 'image' | null | undefined;
```

## Reason

Coupling is not one thing, and "these two files are coupled" does not say what
it will cost to change them. Connascence, from Meilir Page-Jones, splits it into
kinds and orders them by how hard each is to find and to undo: agreeing on a
**name** is the cheapest, then on a **type**, then on the **meaning** of a
literal, then on the **position** of an argument, then on an **algorithm**. The
runtime kinds are worse still, because no compiler sees them: agreeing on
**execution order**, on **timing**, on a **value** that several places must hold
at once, on **identity**.

Two properties make an instance expensive rather than merely present. **Degree**
is how many places participate: one decision spread over fifteen files is
fifteen edits and fourteen chances to miss one. **Locality** is how far apart
they sit: two lines of one function agreeing on a literal is nothing, the same
agreement between a controller and a component in another container is a defect
waiting for the day someone changes one side.

The repository's existing gates all read one file at a time. ESLint sees a
magic number and can ask for a name; it cannot see that the same number is
already named next door. Coverage sees an untested branch; it cannot see that
the branch enumerates a union declared in a file that will grow a fourth member
next month. Connascence is the property none of them can hold, because it is
never a property of a file.

## What is measured

`scripts/standards/connascence.ts` parses every source file under `apps/` and
`infra/` with the TypeScript compiler, tests excluded, and reports seven kinds.
Nothing is inferred by a model; a run on an unchanged tree produces an identical
report.

| Kind          | Rank | What it looks for                                                                   |
| ------------- | ---- | ----------------------------------------------------------------------------------- |
| **meaning**   | 3    | one literal, string or number, written in two or more files                          |
| **position**  | 4    | an exported callable with three or more positional parameters                        |
| **algorithm** | 5    | one regular expression, or one function body token for token, written in two files   |
| **execution** | 6    | module state one export writes and another reads, so callers must order their calls  |
| **timing**    | 7    | one duration written in two or more files, normalised to milliseconds               |
| **cache**     | 7    | a server freshness directive and a client refetch that must be chosen together, and a mutation whose handlers touch more than one query cache |
| **value**     | 8    | a string-literal union whose every member is re-enumerated by a file that never imports it |

Each finding carries a **degree**, the number of participating sites, and a
**locality**, the widest distance between any two of them: same file, same
bounded context, same container, same workspace. The score is
`rank × (degree − 1) × localityWeight`, with weights `1, 2, 4, 8`. It ranks; it
is not a budget anybody should read as an absolute number.

## Timing, and why two equal numbers are usually a coincidence

A duration is temporal wherever the code says so, not wherever a number looks
round. The detector reads six positions and normalises each to milliseconds:
the delay argument of `setTimeout` and `setInterval`; a property whose name has
a known unit, such as `staleTime` and `refetchInterval` in milliseconds or
`maxAge` and `expiresIn` in seconds; a module-scope constant whose name ends in
a unit, `…_MS`, `…_SECONDS`, `…_MINUTES`, `…_HOURS`, `…_DAYS`; `Duration.seconds`
and its siblings in CDK; `max-age`, `s-maxage` and `stale-while-revalidate`
inside a `Cache-Control` string; and Tailwind's `duration-150` and
`duration-[360ms]`. A constant named for a conversion, `MINUTES_TO_MS` or
`SECONDS_PER_MINUTE`, is a factor rather than a duration and is skipped.

Grouping by value alone does not work. A rate-limit window of five minutes and
a presigned-URL expiry of five minutes are the same number and are not the same
decision, and the first run's worst finding was eleven files that happened to
contain one minute. So the sites of one duration are clustered by the words in
their names, with units and words like `MAX` and `DEFAULT` dropped, and only a
cluster spanning two files is reported. `ADMIN_COOKIE_TTL_HOURS` and
`SESSION_TTL_HOURS` share `TTL` and stay; `RATE_LIMIT_WINDOW_MINUTES` and
`PRESIGN_EXPIRES_MINUTES` share nothing and go. It is a heuristic, and it is
stated here rather than hidden: it drops a real coupling whose two sides were
named unrecognisably, and it keeps a coincidence whose two sides were not.

## Cache freshness is the one timing coupling that has no shared name

`ranking.controller.ts` answers with `Cache-Control: max-age=2`, and
`standings.ts` polls the same route every 2000 ms. Neither file imports the
other, no word connects them, and the two numbers have to be chosen together:
poll faster than `max-age` and the browser cache answers instead of the server,
poll slower and the freshness the server promised is wasted. The name clustering
would drop this pair, so it is detected on its own terms — a server directive
and a client refetch in the same workspace are reported as one finding whatever
they are called and whether or not they currently agree.

The second half of the cache detector counts what a mutation touches.
`invalidateQueries`, `refetchQueries`, `removeQueries`, `cancelQueries`,
`setQueryData` and `setQueriesData` are each attributed to their enclosing named
function, and the number of distinct query-key roots that function reaches is
its fan-out. A mutation reaching four caches is four sets of data whose
correctness depends on its handlers running in the right order. A cache write
naming a key root no `useQuery` reads is not a quantity at all — it is a
no-op nobody will notice, and the ceiling for it is zero.

## Position, and why the count is the arity rather than the callers

Connascence of position is the one where correctness depends on the **order** of
things rather than their names. `validatePunchTiming(edition, runner, at, now)`
has four slots, and every call site has to agree on which slot means what.
Nothing catches a mistake: swap two parameters that share a type and it compiles,
it passes every test that happens to use the same value for both, and it fails at
runtime in whichever direction the values differ.

The **degree is the arity**, not the number of call sites, and that is the part
worth being precise about. A finding's degree is how many elements have to agree,
and with four positional parameters there are four slots whose order every caller
must hold in its head — which is why `rankSongs/4` scores higher than
`applyEntryPatch/3` even when the second has more callers. How many callers there
are is a different property, and it is already carried by **locality**: the widest
distance between the declaring file and the files that import it. A four-parameter
function used only inside its own module is local; the same function read across
the API and the site boundary is not.

The threshold is three, and the reason is that two is the arity where the mistake
is bounded. Two positional parameters admit exactly one wrong ordering, and the
type checker usually catches it. From three the orderings grow factorially, and
the parameters are much more likely to share a type. Read
`docs/standards/01-naming.md` next to this: the repository already prefers a
single destructured object, and the reason is exactly this rule. `f({ songs,
members, now })` **cannot** be mis-ordered, because it has no order — it converts
connascence of position, rank 4, into connascence of name, rank 1, which is the
cheapest kind there is. The detector reflects that: a callable whose only
parameter is an object binding pattern counts as arity zero and is never reported,
because it is the fix rather than the problem.

## Findings are scoped to one workspace

`apps/pragma` and `apps/last-loop-lepin` both write `404`, and neither has to
change when the other does — no import connects them and the repository forbids
one. Counting that as connascence made the first report's ten worst entries all
cross-application noise. Sites are grouped per workspace before anything is
tallied, which is why the widest locality is `same workspace` rather than
anything above it.

## Vocabulary the repository did not choose

`zValidator('json', …)` is not this repository agreeing with itself about the
meaning of `"json"`; it is Hono's parameter, and renaming it is not an option
the codebase has. `docs/standards/connascence-vocabulary.json` holds those
words, one line each, with the reason and the evidence that justified it. Keep
it short: every entry is a finding nobody will ever see again, so an entry added
to quiet a report is a rule switched off.

## The gate has two stages, because one of them cannot see enough

**The ratchet** reads `docs/standards/connascence-baseline.json`, which records
the current count per kind and the current score per workspace. A counter may
rise by 2% of its baseline and no more, so a counter of 531 absorbs ten and a
counter of 4 absorbs none. The allowance exists because a strict zero turns a
one-line change into a re-baselining errand, and small counters get none because
2% of a small number is the whole number. Deciding that a real increase is right
takes `--accept` in the same commit, which puts the decision in the diff where a
reviewer sees it.

**The ceilings** read `docs/standards/connascence-ceilings.json`, and they are
absolute. They exist because a ratchet with an allowance can be walked upward
two percent at a time and would never say so; a ceiling is the thing the walk
runs into. They also answer a question the ratchet cannot: not *did this get
worse*, but *is this already bad*.

There is no published industry threshold for connascence. It is a design
vocabulary, not a metric anyone ships defaults for. What exists are thresholds
for the nearest metric that *is* measured elsewhere, so each ceiling names one
and sits under it. Two kinds of source are worth separating: a **tool default**,
which is a vendor's opinion, and a **measurement of real repositories**, which is
evidence. The duplication ceiling has both.

Duplication in real code, largest study to date: DéjàVu (Lopes, Maj, Martins,
Saini, Yang, Zitny, Sajnani and Vitek, OOPSLA 2017,
[doi:10.1145/3133908](https://doi.org/10.1145/3133908)) read 4.5 million non-fork
GitHub projects and 428 million files and found 85 million unique ones — 70% of
the code on GitHub is a clone of a file that already existed. The variation by
language matters here: **JavaScript is the worst of the four measured, with only
6% of its files distinct**, against 60% for Java. Any JavaScript or TypeScript
repository is swimming in an ecosystem where copying is the norm, which is why a
duplication ceiling on this repository is worth having and worth setting low.

Why a ceiling is worth the friction at all: Tornhill and Borg,
[*Code Red*](https://arxiv.org/abs/2203.04374) (2022), measured 39 proprietary
production codebases over 30,737 files and found that low-quality code carried
**15 times more defects**, took **124% more time** to change, and showed **9
times longer maximum cycle times**. The uncertainty is the finding that argues
for a gate rather than a dashboard: the median cost of bad code is bearable and
the tail is not.

| Metric | Ceiling | Anchor |
| --- | --- | --- |
| `duplicatedLinePercent` | 1.5 | SonarQube's default Sonar way quality gate fails above 3.0% duplicated lines on new code |
| `maximumArity` | 5 | SonarSource rule S107 defaults to a maximum of 7 parameters |
| `maximumCacheFanOut` | 4 | Coupling Between Objects is held to 9 in Microsoft's guidance and 14 in Sahraoui, Godin and Miceli |
| `orphanCacheKeys` | 0 | none: a cache write naming a key no query reads is a defect, not a quantity to budget |
| `maximumTimingDegree` | 8 | none: set from this repository's own distribution |

Two of the five have no anchor, and the file says so on the line rather than
implying one. Raising a ceiling is an edit to that file naming the anchor it now
sits under, which is a decision a reviewer can argue with. Raising a ratchet
counter is a flag on a command.

## What this does not cover

The dynamic kinds a parser cannot see: identity, and execution order that
crosses a module boundary. Timing is covered only where a duration is written as
a literal — an interval computed at runtime, or one that arrives from the
environment, is invisible. `docs/standards/temporal-coupling.md` is the
empirical complement — files that keep changing in the same commit are coupled
by something, whether or not any of these five detectors can name it.

## Enforced by

- `generator:scripts/standards/connascence.ts` writes
  `docs/standards/connascence.md` and, with `--check`, fails when a counter in
  `connascence-baseline.json` rises beyond its 2% allowance or a metric passes
  its ceiling in `connascence-ceilings.json`. Runs in `.husky/pre-commit`
  whenever a lintable file is staged, and unconditionally in
  `.github/workflows/ci.yml`.
- `reviewer` judges whether a new entry in `connascence-vocabulary.json` names a
  word an external library dictates, rather than one this repository chose and
  would rather not have counted, and whether a raised ceiling in
  `connascence-ceilings.json` still sits under the anchor it names.
