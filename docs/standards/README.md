# Code standards

The documents in this folder are the rules that every line of code in this
repository follows.

Each document states the rule, gives the reason, shows an example, and names
what enforces it. A rule with no enforcement is a preference, so each document
names a lint rule, a test gate, or a git hook. When a rule cannot be checked
mechanically, the document says so and describes what a reviewer looks for
instead.

That last paragraph was true of the intent and not always of the checkout.
Standards cited `no-magic-numbers` and `explicit-module-boundary-types` while
neither was configured anywhere, claimed a CDK synth and a mutation run that CI
did not do, and named `eslint-comments/require-description` under an identifier
that is not the rule's. Nothing read those names, so nothing noticed.

So the names are typed. Every bullet under `## Enforced by` opens with a
marker in a closed vocabulary:

| Marker | Means |
| --- | --- |
| `` `oxlint:<rule>` `` | a lint rule, by its name in `.oxlintrc.json` |
| `` `script:<path>` `` | a shell check a hook or workflow runs |
| `` `generator:<path>` `` | a generated artefact with a `--check` |
| `` `gate:<name>` `` | a named gate |
| `` `types:<path>` `` | a compile error |
| `` `test:<name>` `` | a test that is the gate |
| `` `reviewer` `` | nothing can check it |

Until 2026-10-29 a generated ledger resolved each marker against the checkout
and failed a claim it could not find. It was removed with the other gates whose
only subject was another gate, so keeping a bullet true when a mechanism is
removed is now the author's job and the reviewer's.

## What a reviewer is for

The `reviewer` bullets are the residue: whether a comment says something the
code cannot, whether a name is the one the domain uses, whether a repository is
projecting when it should be returning rows. No rule can ask those.

Every `reviewer` bullet in the numbered standards is what the
[`technical-validator`](../../.claude/agents/technical-validator.md)
agent checks besides the spec, during
[`/technical-validation`](../../.claude/skills/technical-validation/SKILL.md).
It never repeats what lint already did, and widening what it checks means
writing a `reviewer` bullet in a standard rather than editing the agent.

CI runs no model, so the review is recorded rather than repeated: the report
names the commit it reviewed on a `Reviewed: <sha>` line, and a later round
reviews only what changed after that commit.

Read [00. Principles](./00-principles.md) first, because it explains how to
read the rest.

The numbered standards are the files named `NN-<topic>.md` in this folder. The number orders them and the name says what each covers. `head -1 docs/standards/[0-9]*.md` prints each title.

## How a standard differs from a blueprint

A standard tells you what the code has to look like, so breaking one fails a
gate. A blueprint is the canonical example of that rule, marked in place on real
code in this repository with a `@Blueprint` JSDoc block.

So the standard is the rule and the blueprint is the working instance of it.
Read the standard to learn what is required, and open the blueprint to see the
shape to copy. When the two disagree, the standard wins and the blueprint is
stale.

Every blueprint is listed in
[`.claude/skills/blueprint/blueprint-index.md`](../../.claude/skills/blueprint/blueprint-index.md),
along with how many places carry a `// @FollowsBlueprint` marker pointing at it,
so the index shows which patterns have actually been adopted rather than which
ones we intended. The [`/blueprint`](../../.claude/skills/blueprint/SKILL.md)
skill creates, indexes, and validates them.

A blueprint's follower count answers how widely a pattern was copied, and read
alone it reads as success. `blueprint-defects.md`, an on-demand report built by
`scripts/reports.sh blueprints`, is
the other half: a dantotsu may name the pattern whose shape let its defect
through, as `blueprints: [some-id]` in its front matter, and the page ranks the
patterns by exposure, which is followers times defects. A pattern with forty
followers and one defect has propagated that mistake forty times.

The index answers which patterns exist, and
[`blueprint-coverage.html`](../../.claude/skills/blueprint/blueprint-coverage.html)
answers which code carries one, bucketed by application and layer. Read it
before adding a blueprint: a layer sitting at nought per cent is either a
pattern nobody has written down yet or a layer whose files are genuinely all
one-offs, and those two need different responses.

Both files are generated and not committed; the coverage page is on demand,
through `scripts/reports.sh blueprints`. The pre-commit hook and CI run the
index generator in `--check` mode. That fails a blueprint missing one of its
four tags, a duplicated identifier, and a `// @FollowsBlueprint` naming a
blueprint that does not exist.

## How a standard differs from a dantotsu

A standard records what we decided, and a [dantotsu](../dantotsus/) records what
we learned when a decision turned out to be incomplete.

When a dantotsu ends by adding a rule, the rule belongs in this folder too,
because otherwise the lesson stays inside the incident report and the next
author never sees it.

## Applying the standards

The [`code-standards`](../../.claude/skills/code-standards/SKILL.md) skill
walks an agent through the standards that apply to a change, and the
`/implementation` and `/technical-validation` skills both defer to the same
documents, so there is one source of truth.
