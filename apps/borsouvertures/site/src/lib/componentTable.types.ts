import type { ComponentType } from 'react';

/**
 * @Blueprint component-lookup-table
 * @BlueprintName Component Lookup Table
 * @BlueprintUsage Use for any render choice between two or more components, in place of a ternary or a `&&` in the markup.
 * @BlueprintDescription Types a frozen record whose keys are a domain union, or the template literal type `` `${boolean}` `` for a flag, and whose values are components sharing one props shape. The component declares the table at module scope, indexes it once with the key a pure selector returned, and renders the result as `<Chosen {...props} />`, so the markup holds no branch and a missing case is a typecheck failure. The `${boolean}` key is what makes a flag indexable at all, since a record cannot be keyed by `true` and `false` directly; the absent branch points at `EmptySlot` rather than at `null`.
 */
export type ComponentByFlag<Props> = Record<`${boolean}`, ComponentType<Props>>;

export type ComponentByKind<Kind extends string, Props> = Record<Kind, ComponentType<Props>>;

export type ValueByFlag<Value> = Record<`${boolean}`, Value>;
