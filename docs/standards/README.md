# Code standards

The documents in this folder are the rules that every line of code in this
repository follows.

Each document states the rule, gives the reason, shows an example, and names
what enforces it. A rule with no enforcement is a preference, so each document
names an ESLint rule, a test gate, or a git hook. When a rule cannot be checked
mechanically, the document says so and describes what a reviewer looks for
instead.

Read [00. Principles](./00-principles.md) first, because it explains how to
read the rest.

| Number | Standard | Covers |
|--------|----------|--------|
| 00 | [Principles](./00-principles.md) | How these documents are written and applied |
| 01 | [Naming](./01-naming.md) | Identifiers, files, functions, and English only source |
| 02 | [Purity and core files](./02-purity-and-core-files.md) | Where logic lives, and where conditions live |
| 03 | [Typing](./03-typing.md) | Type assertions, inference, and derived types |
| 04 | [Back end architecture](./04-backend-architecture.md) | Controller, service, and repository slices |
| 05 | [Front end architecture](./05-frontend-architecture.md) | Atoms, molecules, organisms, and routes |
| 06 | [Data fetching](./06-data-fetching.md) | TanStack Query and the Hono client |
| 07 | [State and effects](./07-state-and-effects.md) | Why there is no `useEffect` |
| 08 | [Styling](./08-styling.md) | Tailwind utilities and design tokens |
| 09 | [Internationalisation](./09-i18n.md) | i18next, key naming, and catalogue parity |
| 10 | [Testing](./10-testing.md) | Vitest, coverage, and mutation testing |
| 11 | [Database](./11-database.md) | Drizzle, migrations, and transactions |
| 12 | [Lint and gates](./12-linting-and-gates.md) | ESLint, hooks, and CI |

## How a standard differs from a blueprint

A standard tells you what the code has to look like, so breaking one fails a
gate.

A blueprint tells you how to build a new thing from nothing, so it gives the
folder layout, the dependency list, and the first files to write. The
blueprints are in [`docs/blueprints`](../blueprints/README.md), and they follow
the shape of
[theodo-group/theodo-blueprints](https://github.com/theodo-group/theodo-blueprints).

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
