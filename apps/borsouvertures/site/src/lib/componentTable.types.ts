import type { ComponentType } from 'react';

/**
 * A lookup from a boolean, written as its string form, to the component that
 * renders that case. Indexing a table replaces the `condition && <Element/>`
 * form that [02. Purity and core files](../../../../docs/standards/02-purity-and-core-files.md)
 * moves out of impure code: the choice becomes a table a reviewer can read and
 * the decision behind it becomes a named function with tests.
 *
 * @Blueprint component-lookup-table
 * @BlueprintName Component Lookup Table
 * @BlueprintUsage Use for any render choice between two or more components, in place of a ternary or a `&&` in the markup.
 * @BlueprintDescription Types a frozen record whose keys are a domain union, or the template literal type `` `${boolean}` `` for a flag, and whose values are components sharing one props shape. The component declares the table at module scope, indexes it once with the key a pure selector returned, and renders the result as `<Chosen {...props} />`, so the markup holds no branch and a missing case is a typecheck failure. The `${boolean}` key is what makes a flag indexable at all, since a record cannot be keyed by `true` and `false` directly; the absent branch points at `EmptySlot` rather than at `null`.
 */
export type ComponentByFlag<Props> = Record<`${boolean}`, ComponentType<Props>>;

/** The same lookup, from a domain union rather than a boolean. */
export type ComponentByKind<Kind extends string, Props> = Record<Kind, ComponentType<Props>>;

/** A lookup from a boolean to a plain value, e.g. a class name or a label. */
export type ValueByFlag<Value> = Record<`${boolean}`, Value>;
