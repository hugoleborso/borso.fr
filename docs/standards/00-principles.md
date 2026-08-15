# 00. Principles

Every standard in this folder has the same four parts, so you can skim any one
of them and find what you need in the same place.

The rule comes first, in one imperative sentence with no hedging. An example is
"every condition lives in a pure function", and not "conditions should
generally live in pure functions where practical".

The reason comes second, and it names the cost the rule avoids. When we cannot
name a cost, the rule is a preference and does not belong in this folder.

Examples come third, taken from code that is actually in this repository rather
than invented for the document.

The enforcement comes last, and it names the ESLint rule, the test gate, or the
git hook that fails when someone breaks the rule. When nothing can enforce a
rule mechanically, the entry says "enforced by reviewer judgement" and
describes what a reviewer looks for.

## Make the wrong thing impossible rather than discouraged

A rule that a person has to remember is a rule that someone breaks on a Friday
afternoon. When you add a rule, try to enforce it as high up the list below as
you can.

1. A type that will not compile when you get it wrong.
2. A lint rule that fails the commit.
3. A test gate that fails the push.
4. A document that explains the trap.

Documentation is the floor and not the goal. Whenever you write a new rule
here, ask what would have caught the mistake one rung higher, and go build that
instead if you can.

## Logic is data in and data out

A business rule is a function from inputs to outputs, and it does not read the
clock, the network, the database, or React state. It takes all four as
arguments.

The rule is the highest leverage rule in the repository, because it makes logic
testable without a single mock, and cheap tests are the tests people actually
write.

The second effect is larger than the first. When every condition has to move
into a pure function, the impure code left behind becomes a straight line that
reads inputs, calls the decision function, and applies the result. A straight
line has nowhere to hide a bug.

Mutation testing only pays off on pure code. A surviving mutant inside a
function that talks to Postgres tells you almost nothing, because the test may
have failed to reach the line for a dozen reasons. A surviving mutant inside
`projectRunnerStanding` tells you exactly which branch has no test.

See [02. Purity and core files](./02-purity-and-core-files.md).

## The name carries the explanation

We do not write comments that restate code, and we rename until the code reads
as prose instead. A comment survives review only when it explains a constraint
the reader cannot see in the file, e.g., a vendor bug, an edge runtime that is
not Node, or a CloudFormation intrinsic that looks like a mistake.

See [01. Naming](./01-naming.md).

## One way to do each thing

When there are two ways to fetch data, every reader has to check which one the
file in front of them uses. When there is one way, the reader already knows.

So server state goes through TanStack Query every time, forms go through
TanStack Form every time, database access goes through Drizzle every time, and
styling goes through Tailwind utility classes every time. Where a standard
names a library, the library is the only option, and adding a second one is a
decision that needs an [architecture decision record](../adr/README.md).

## A standard states the rule, never its history

Write what the code has to look like today. A reader does not need to know that
a check was missing, that a path was wrong, or which review turned the rule up,
and every sentence of that kind is one more sentence between them and the rule.
The history belongs in `git log`, in the pull request, and in
[the dantotsus](../dantotsus/) when it cost us something.

## How these documents are written

The prose follows the rules in
[`.claude/skills/plain-writing/SKILL.md`](../../.claude/skills/plain-writing/SKILL.md),
which is installed in this repository so that every agent session applies it by
default.

Two audiences read these documents, and both are badly served by vagueness. The
first is an engineer who has never seen this repository, and the second is an
agent that will apply the rule literally, including the parts you did not mean
literally.

## Enforced by

- `reviewer` reads `docs/standards/hotspots.md` before deciding which pattern to
  write down next. It crosses how often each file changes with whether it
  follows a recorded pattern and whether its path says what it is. Nothing gates
  it and nothing checks it is fresh: the input is the git history, so the page
  moves on every commit whether or not any source did, and a staleness gate
  would fail every commit for a reason nobody could act on. The page records the
  commit it was read at; regenerate with
  `pnpm exec tsx scripts/standards/hotspots.ts` when the age matters.
