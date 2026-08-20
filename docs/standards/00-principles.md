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

There are no comments in this code. A comment is a smell of badly written
code: it is the explanation the code failed to give, parked beside it where
nothing checks it and nothing keeps it true.

Replace it in this order. First rename, until the code reads as prose: most
comments disappear the moment the identifier says what the comment said.
Failing that, reorganise — extract the helper, name the constant, introduce
the type, write the test that states the behaviour. Only when neither works
does the explanation belong in a document under `docs/`, because it is about
something outside this file: a vendor bug, an edge runtime that is not Node, a
CloudFormation intrinsic that looks like a mistake. That is a
[knowledge entry](../knowledge/) or an [architecture decision
record](../adr/README.md), and the code carries no trace of it.

A comment recording how a piece of code changed over time is never the right
artefact. What the code used to do belongs in `git log`, in the pull request,
and in [the dantotsus](../dantotsus/) when it cost us something.

What stays is not a comment but an annotation a generator parses: `@Blueprint`
and its `@BlueprintName` / `@BlueprintUsage` / `@BlueprintDescription` fields,
`@FollowsBlueprint`, `@Feature`, `@DependsOnExternal`, a `@type` a JavaScript
file needs to be typed at all, and the `-- <reason>` half of a rule exception.
Each of those has a reader that fails when it is missing, which is exactly what
a comment does not have. A block mixing one such tag with a sentence of prose
is prose, and the rule rejects it.

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

### A link is a claim about the tree

Every relative link in a document names a file, and that is a claim the tree can
settle, so it is checked like any other. A dead link costs more than a missing
one: the reader follows it, finds nothing, and concludes the document describes
a state the repository has left, when the only stale thing was the path.

The routing table in the `/code-standards` skill — whose entire job is sending a
reader to the right standard — carried thirteen dead links, every one a single
`../` short of the repository root. A rendered preview cannot show that, and
nothing else was reading them.

Three kinds of link are not a claim about the tree, and the checker knows all
three: a placeholder the reader fills in, a target GitHub resolves against the
repository rather than the file, and anything inside a fenced block, which
markdown does not render as a link. `docs/features/` is out of scope entirely,
because a report from May naming a file since renamed is telling the truth about
May.

The claim is settled against the git index rather than the disk, because a
working tree is not the repository: it also holds whatever the generators last
wrote. `docs/architecture/README.md` linked five pages that `.gitignore` covers,
which resolved on any machine that had run the generator and failed in CI, where
nothing had. The index gives the same answer in both, and it is the answer a
fresh clone gets — which is the only one the reader of a link cares about. A
generated artefact is therefore named in prose and never linked.

## Enforced by

- `eslint:borso/no-comments` rejects every comment that is not entirely
  machine-read. It asks one question of the comment body alone: does every
  non-empty line match a known annotation or directive. That is why a
  `@Blueprint` block passes whole, a `/** @type {…} */` on a JavaScript module
  passes, and a block pairing a tag with a sentence does not.
- `script:scripts/check-no-comments-in-styles-and-markup.sh` asks the same
  question of the two file kinds ESLint does not lint here, `.css` and
  `.html`. It keeps the `@third-party-dom` markers
  `scripts/check-stylesheet-contents.sh` parses, and a conditional comment,
  which is markup rather than prose.
- `script:scripts/docs/check-doc-links.ts` fails a document that links a file
  which is not there, across every markdown file outside `docs/features/`. It
  skips a placeholder, a GitHub-relative target and anything inside a fenced
  block, and it is the reason the `/code-standards` routing table's thirteen
  dead links are gone.
- `reviewer` reads `docs/standards/hotspots.md` before deciding which pattern to
  write down next. It crosses how often each file changes with whether it
  follows a recorded pattern and whether its path says what it is. Nothing gates
  it and nothing checks it is fresh: the input is the git history, so the page
  moves on every commit whether or not any source did, and a staleness gate
  would fail every commit for a reason nobody could act on. The page records the
  commit it was read at; regenerate with
  `pnpm exec tsx scripts/standards/hotspots.ts` when the age matters.
- `reviewer` reads `docs/standards/temporal-coupling.md` before deciding whether
  a seam is real. It crosses the git history with the module graph and names the
  pairs that always change together and have no import path between them in
  either direction, which is a dependency nothing in the code admits to. Pairs
  the graph does not describe are left out and counted rather than reported,
  because a connection that never existed cannot be missing. Nothing gates it
  and nothing checks it is fresh, for the same reason as the page above;
  regenerate with `pnpm exec tsx scripts/standards/temporal-coupling.ts`.
