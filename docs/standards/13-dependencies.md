# 13. Dependencies

## Rule

A version is written once, in `pnpm-workspace.yaml`. A workspace that needs a
dependency another workspace already has writes `catalog:` and no version at
all.

```jsonc
// apps/pragma/package.json — do
"dependencies": { "zod": "catalog:zod3", "hono": "catalog:" }

// apps/pragma/package.json — don't
"dependencies": { "zod": "^3.24.0", "hono": "^4.6.0" }
```

## Reason

Every other gate here reads source. Nothing reads a version field, so two
workspaces drifting onto different majors of the same library passes lint, all
four test suites, mutation, coverage and the architecture map. It surfaces much
later, as a type error in whichever file happens to sit across the seam, and
the file it surfaces in is not the file that caused it.

The drift is also the one an agent introduces by default: asked to add a
dependency, it adds the latest, and the workspace next door was pinned six
months ago.

A catalog is worth more than a check that compares the ranges. Comparing ranges
finds a disagreement after it has happened; moving the version out of the
workspace means the second workspace has nothing left to disagree with. That is
the top of this repository's eradication ladder — structural impossibility
rather than detection — and here it costs one line per dependency.

## Named catalogs are for real disagreements

Two workspaces sometimes need different majors for a reason. `pragma` and
`last-loop-lepin` are on `zod@3` because that is what `drizzle-zod` accepts,
while the repository scripts are on `zod@4`. That is a decision, not drift, and
a named catalog records it as one:

```yaml
catalogs:
  zod3:
    zod: '^3.24.0'
  zod4:
    zod: '^4.4.3'
```

The workspaces then read `catalog:zod3` and `catalog:zod4`. The difference from
two bare ranges is that the reason has a name and a reader can see there are
exactly two answers, rather than discovering a third one next month.

## A version stays in the workspace when only one workspace has it

A dependency nothing else uses is not shared, so nothing can disagree with it,
and hoisting it would put a version in a shared file to serve one reader. The
check only asks for a catalog once a second workspace declares the same name.

## A version is never written into a manifest by regex

Bumping versions means rewriting `"<name>": "<string>"` pairs, and a `scripts`
entry has exactly that shape too. A regex keyed on the package name cannot tell
the two apart, so rewriting the `knip` dependency also rewrites the `knip`
script:

```jsonc
// package.json — what a name-keyed regex does to the scripts block
"scripts": { "knip": "6.33.0" }        // was "knip": "knip"
"devDependencies": { "knip": "6.33.0" } // the entry that was meant
```

Nothing downstream reads a script value, so this passes lint, typecheck, every
suite and the pre-push gate — `pnpm exec knip` resolves the binary and never
opens `scripts`. Edit manifests with a JSON-aware tool, or with `pnpm up`.

## What this does not cover

The catalog governs the ranges this repository writes. It says nothing about
the transitive tree, which `pnpm-lock.yaml` pins and which is reviewed by
reading that lockfile's diff.

## Enforced by

- `script:scripts/dependencies/check-dependency-catalog.ts` fails when two
  workspaces name a version for the same dependency, when a `catalog:` marker
  points at a catalog with no entry for it, and when a catalog holds an entry
  no workspace reads.
- `script:scripts/check-package-scripts-are-commands.sh` fails a `scripts`
  entry whose whole value is a bare semver, which is the shape a name-keyed
  regex leaves behind and never something a runner is called.
