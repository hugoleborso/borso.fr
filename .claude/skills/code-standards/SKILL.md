---
name: code-standards
description: >-
  Apply this repository's code standards to a change, or check a change against
  them. Use when writing or reviewing code in `apps/` or `infra/`, and when the
  user says "/code-standards", "does this follow our standards", "review this
  against the standards", "what's our convention for X", or asks where a new
  file should live. Routes to the right document under `docs/standards/`,
  which covers naming, purity and `.core.ts` files, typing and the ban on type
  assertions, controller and service and repository slices on the back end,
  atoms and molecules and organisms on the front end, TanStack Query with the
  Hono client, the ban on `useEffect`, Tailwind styling, i18next, Vitest
  coverage and mutation testing, Drizzle, and the ESLint rules and git hooks
  that enforce all of it. Before writing a new file, also read
  `.claude/skills/blueprint/blueprint-index.md` for the canonical example of
  the layer you are working in.
---

# Code standards

The standards are in [`docs/standards/`](../../docs/standards/README.md), and
they are the single source of truth. The present skill decides which of them
apply to the change in front of you, so you read three documents instead of
thirteen.

Do not restate a rule from memory. Open the document, and quote it, because the
documents change and your memory of them does not.

A standard states a rule. The matching blueprint is the working example of it,
marked in place on real code and listed in
[`blueprint-index.md`](../blueprint/blueprint-index.md). Read the rule, then
copy the example.

## Pick the documents that apply

Match what the change touches against the table below, and read every document
in the matching rows before writing code.

| The change touches                                | Read                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anything at all                                   | [01. Naming](../../docs/standards/01-naming.md), [02. Purity and core files](../../docs/standards/02-purity-and-core-files.md), [03. Typing](../../docs/standards/03-typing.md) |
| A file under `api/src/`                           | [04. Back end architecture](../../docs/standards/04-backend-architecture.md), [11. Database](../../docs/standards/11-database.md)                                               |
| A file under `site/src/`                          | [05. Front end architecture](../../docs/standards/05-frontend-architecture.md), [07. State and effects](../../docs/standards/07-state-and-effects.md)                           |
| A call between the front end and the API          | [06. Data fetching](../../docs/standards/06-data-fetching.md)                                                                                                                   |
| A visible string, or a component that renders one | [09. Internationalisation](../../docs/standards/09-i18n.md)                                                                                                                     |
| A class name or a style                           | [08. Styling](../../docs/standards/08-styling.md)                                                                                                                               |
| A test, or a pure function                        | [10. Testing](../../docs/standards/10-testing.md)                                                                                                                               |
| A lint rule, a hook, or a workflow                | [12. Lint and gates](../../docs/standards/12-linting-and-gates.md)                                                                                                              |

## Order of work when writing code

Write the pure decision function and its test first, in a `.core.ts` file, so
the branch you are about to add exists somewhere a test can reach it without a
database or a browser.

Then write the impure code that calls the decision function, which is a
service on the back end or a component on the front end, and it should contain
no condition of its own.

Then run the gates, which are `lint`, `typecheck`, `test`, `test:coverage`, and
`test:mutation` in the workspace you changed.

## Order of work when reviewing code

Read the diff once for correctness against whatever the change was supposed to
do, and only then check it against the standards, because a change that does
the wrong thing correctly is still wrong.

Then walk the applicable documents from the table above, and for each rule the
diff breaks, say which document and which rule, so the author can read the
reason rather than take your word for it.

Report a rule the linter should have caught as a gap in the linter and not only
as a note on the diff, because a rule that needs a human reviewer will be
broken again next week. Add the missing rule in the same pull request when it
is small, and say so in the description when it is not.

## When the standards do not cover the case

Decide, and write the decision down.

When the decision is about naming, file layout, or test shape, add it to the
matching document under `docs/standards/`, in the same pull request.

When the decision brings in a new dependency, a new secret, a new schema
column driven by an outside service, or a structural change across several
applications, it needs an [architecture decision record](../adr/SKILL.md)
before you write the code.

## Do not

Do not add a rule to `CLAUDE.md` that belongs in `docs/standards/`, because two
places holding the same rule means one of them goes stale. `CLAUDE.md` points
at the standards, and the standards hold the detail.

Do not disable a lint rule to make a change pass. Fix the code, or change the
rule and say why in the pull request.

Do not describe a rule as a preference in a review comment. Every rule in
`docs/standards/` is a rule, and a rule you disagree with is a pull request
against the document.
