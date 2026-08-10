import type { ComponentType } from 'react';

/**
 * A lookup from a boolean, written as its string form, to the component that
 * renders that case. Indexing a table replaces the `condition && <Element/>`
 * form that [02. Purity and core files](../../../../docs/standards/02-purity-and-core-files.md)
 * moves out of impure code: the choice becomes a table a reviewer can read and
 * the decision behind it becomes a named function with tests.
 */
export type ComponentByFlag<Props> = Record<`${boolean}`, ComponentType<Props>>;

/** The same lookup, from a domain union rather than a boolean. */
export type ComponentByKind<Kind extends string, Props> = Record<Kind, ComponentType<Props>>;

/** A lookup from a boolean to a plain value, e.g. a class name or a label. */
export type ValueByFlag<Value> = Record<`${boolean}`, Value>;
