# Vocabulary — the repository

The words of the monorepo and of the way it is built, shared by every
application. Use them in skills, hooks, scripts, commits and specs. Each
application's own nouns are in its own glossary, listed under *Glossaries*.

A glossary says what a word means, where it lives and what not to confuse it
with. The rules a term holds sit elsewhere: for an application, in the
`INVARIANTS.md` of the folder the term lives in; for the repository, in
`CLAUDE.md` and the standard or skill each term's `Lives in:` names.
`scripts/check-vocabulary-paths.sh` checks every `Lives in:` path here.

## Glossaries

- [banana-rush](../apps/banana-rush/VOCABULARY.md)
- [borso-fr](../apps/borso-fr/VOCABULARY.md)
- [borsouvertures](../apps/borsouvertures/VOCABULARY.md)
- [last-loop-lepin](../apps/last-loop-lepin/VOCABULARY.md)
- [pragma](../apps/pragma/VOCABULARY.md)
- [talos](../apps/talos/VOCABULARY.md)

## Operator

The one person who owns this repository and decides its product and
architecture questions, merges, and anything a session lacks the rights for.

Lives in: `CLAUDE.md`

Not to be confused with: an agent or a session, which does the work and asks
the operator only for a product call or an irreversible action.

## Application

One folder under `apps/`, openable on its own with `pnpm dev`. A static
application has only `site/`. A full-stack application adds `api/`, `cdk/` and
`domain/`.

Lives in: `apps/`

Not to be confused with: the shared CDK constructs in `infra/cdk/`, which every
application consumes and none owns.

## Preview

The copy of an application a pull request deploys at
`https://<app>-pr-<n>.preview.borso.fr`, which is how the operator validates a
change.

Lives in: `.github/workflows/preview.yml`

Not to be confused with: production, which only a merge to `main` deploys.

## Gate

A check that stops a change: a lint rule, a git hook, a shell script or a CI
job. A standard names the gate that enforces each rule under `## Enforced by`.

Lives in: `.husky/`

Not to be confused with: a `reviewer` check, which is the part of a standard no
gate can hold.

## Andon

A limit that trips (throttling, a timeout, memory, a quota), read as a signal
that shows a cause to remove, not as a capacity to raise.

Lives in: `CLAUDE.md`

## Standard

One document under `docs/standards/` that states a rule of how code is
written, gives the reason and names what enforces it.

Lives in: `docs/standards/`

Not to be confused with: a blueprint, which is the working example of a
standard.

## Blueprint

A canonical example already in the repository, marked in place with a
`@Blueprint` block. Code that copies it carries `// @FollowsBlueprint <id>`.

Lives in: `.claude/skills/blueprint/`

Not to be confused with: a standard. When the two disagree, the standard wins
and the blueprint is stale.

## Architecture decision record

One file under `docs/adr/`, named by the UTC minute it was written, recording
a choice that was hard to reverse and the options it was weighed against.
Written with `/adr`.

Lives in: `docs/adr/`

## Feature

One unit of work, one session and one pull request. Its spec, plan,
validation reports and archived friction log sit under
`docs/features/<app|meta>/<slug>/`.

Lives in: `docs/features/`

## Tier

How much machinery a task gets, from 0 (do it) to 3 (fanned out), chosen by
`/route` from what the task touches and what needs deciding.

Lives in: `.claude/skills/route/`

## Friction log

`KAIZEN.md`, the scratch file `scripts/kaizen.sh` appends one line to each
time something goes wrong during a task, archived into the feature's folder
before its pull request opens.

Lives in: `scripts/kaizen.sh`

Not to be confused with: a kaizen, which is what the log feeds.

## Kaizen

The improvement pass run after a merge, in a new conversation, with
`/after-task-kaizen`. It turns the friction log into dantotsus and knowledge
entries and ships them in a pull request labelled `kaizen`.

Lives in: `.claude/skills/after-task-kaizen/`

Not to be confused with: the friction log, which is its input.

## Dantotsu

A root-cause analysis of one defect, on the Future of Software guild's
template, ending in an eradication shipped as code.

Lives in: `docs/dantotsus/`

Not to be confused with: a knowledge entry, which records something worth
knowing when there was no defect.

## Knowledge entry

One file under `docs/knowledge/` that records a vendor surprise or a reusable
insight. A hook prints it when a command matches its trigger.

Lives in: `docs/knowledge/`

Not to be confused with: a dantotsu, which needs a defect and an eradication.

## Operator backlog

The list of tasks that need a right no session holds: AWS write, IAM,
repository settings, a secret, an operator dispatch or a third-party console.

Lives in: `docs/operator-backlog.md`

Not to be confused with: a follow-up issue, which this repository does not
open.

## Generated report

A file built by `scripts/reports.sh` (the blueprint index, the standards
reports, the architecture maps) and never committed.

Lives in: `scripts/reports.sh`

## Words we do not use

- **RCA**, **post-mortem**, **five whys** for the document: it is a
  **dantotsu**. The words name the request `/dantotsu` answers, never the file.
