---
name: blueprint
description: Create, index, and validate blueprint annotations. Use when marking a canonical code pattern, when asking which example to follow before writing a new controller, service, repository, component, or query module, or when the user says "/blueprint", "blueprint this", "which pattern do I follow", "is this the canonical example".
argument-hint: 'create [target] | index | validate [filter]'
---

A blueprint is a canonical example that already lives in this repository, marked in place with a `@Blueprint` JSDoc block. Code following one carries `// @FollowsBlueprint <id>`, so the index shows adoption, not intent.

Blueprints and [`docs/standards/`](../../../docs/standards/README.md) are two halves. The standard states the rule; the blueprint is the working example. When they disagree, the standard wins and the blueprint is stale.

**Before writing a new file in `apps/`, read [`blueprint-index.md`](./blueprint-index.md) and open the blueprint for that layer.** Copy its shape.

Routes on `$ARGUMENTS`:

| First word | Operation |
|------------|-----------|
| `create` | Create, rest of args = target |
| `index` | Index |
| `heatmap` | Heatmap |
| `validate` | Validate, rest of args = filter |
| *(empty)* | Ask which operation via AskUserQuestion |

## Annotation format

```typescript
/**
 * @Blueprint {pattern-id}
 * @BlueprintName {Human Readable Name}
 * @BlueprintUsage {Use for ...}
 * @BlueprintDescription {What the code does}
 */
export function recordPunch(...) { ... }
```

- **pattern-id** is kebab-case, category-prefixed: `controller-create`, `service-orchestration`, `repository-query`, `core-decision`, `query-module`, `atom-variant`, `organism-table`.
- **Name** is Title Case and matches the category.
- **Usage** starts with `Use`, and answers when to reach for the pattern. `Use for a route that ...` and `Use whenever a component ...` both read correctly.
- **Description** is a technical summary of the annotated code.

Follower annotation, on the line directly above the declaration:

```typescript
// @FollowsBlueprint service-orchestration
export async function transferRunner(...) { ... }
```

One identifier per line. Place it above the declaration, never at the top of the file.

## Create

Input is a file path with a line number, a pattern-id, or a description of what to blueprint.

1. Read [`blueprint-index.md`](./blueprint-index.md) and confirm the proposed pattern-id is free.
2. Read the target file.
3. Draft the annotation with all four tags.
4. Show the exact JSDoc block and its insertion point, and ask the user to confirm.
5. Insert it directly above the target declaration. When a JSDoc block is already there, merge the tags into it.
6. Run `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts`.
7. Read the regenerated index and confirm the entry appears.

Leave the target code itself untouched. The annotation is the only edit.

Completion criterion: the new entry appears in `blueprint-index.md` with all four tags populated, and `git diff` on the target file shows only added comment lines.

## Index

1. Run `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts`.
2. Show the script output and `git diff .claude/skills/blueprint/blueprint-index.md`.

## Heatmap

1. Run `pnpm exec tsx .claude/skills/blueprint/blueprint-heatmap.ts`.
2. Show the script output and the repository totals from the regenerated
   [`blueprint-coverage.html`](./blueprint-coverage.html).
3. Name the three largest unmarked buckets, because those are where the next
   blueprint is worth writing.

The index answers which patterns exist, and the heatmap answers which code
carries one. A layer sitting at nought per cent is either a pattern nobody has
written down or a layer whose files are all one-offs, and the two need
different responses, so read the unmarked list before adding an annotation.

## Validate

Input is an optional filter keyword.

1. Regenerate the index.
2. Grep `apps/` and `infra/` for `@Blueprint`.
3. For each hit, read five lines either side and check all four tags are present.
4. Read the `Orphaned followers` section of the regenerated index.
5. Report every blueprint with a missing tag, every duplicate id, and every orphaned follower.

Completion criterion: every `@Blueprint` in the repository appears in the report with a complete or incomplete verdict, and the orphaned list is empty or every entry is explained.

Report as:

```
## Blueprint validation

### Blueprints: N

| ID | Name | Location | Status |
|----|------|----------|--------|
| pattern-id | Pattern Name | path/to/file.ts:L42 | complete / missing @BlueprintUsage |

### Followers: N
| Blueprint ID | Followers | Status |
|--------------|-----------|--------|

### Issues
```

## Scripts

`blueprint-indexing.ts` scans `apps/`, `infra/`, and `eslint-rules/` and writes `blueprint-index.md`. `blueprint-heatmap.ts` scans the same tree and writes `blueprint-coverage.html`, a colour grid of application against layer showing how much of each bucket carries a marker. `blueprint-utils.ts` holds the project and layer inference, which reads this repository's layout of `apps/<slug>/api`, `apps/<slug>/site`, `infra/<package>`, and `eslint-rules/`, and reports a test in the layer of the code it covers.

The upstream skill also ships `blueprint-extract.ts`, which is not ported here, so `/blueprint extract` does not exist.

CLAUDE.md keeps skills markdown-only. The index needs a real scan of the source tree, which prose cannot do, so this skill is the documented exception and the two scripts stay beside `SKILL.md` as upstream places them.
