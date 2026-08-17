# A Drizzle `uniqueIndex` lands in `indexes`, not in `uniqueConstraints`

Observed 2026-08-15 while writing schema tests for `pragma` and
`last-loop-lepin`.

`getTableConfig(table)` returns both, and they hold different things:

| Declared as | Read back from |
| --- | --- |
| `uniqueIndex('x').on(...)` | `getTableConfig(table).indexes` |
| `unique('x').on(...)` | `getTableConfig(table).uniqueConstraints` |
| `primaryKey({ columns })` | `getTableConfig(table).primaryKeys` |

An assertion against the wrong one returns `undefined` and passes nothing —
`expect(config.uniqueConstraints[0]?.columns).toEqual([...])` is green when the
index is a `uniqueIndex`, because `[0]` is undefined and `?.` swallows it.

Worth asserting at all: a composite primary key and a unique index live inside a
callback that no import evaluates, so they report as an uncovered function and,
more importantly, nothing else pins the **column order** a careless migration
would change silently.

```ts
const [primary] = getTableConfig(memberInstrumentTable).primaryKeys;
expect(primary?.columns.map((column) => column.name)).toEqual([
  'member_id',
  'instrument_id',
]);
```

Use `.toEqual` on a mapped array rather than optional chaining into an index, so
a wrong container fails instead of passing empty.
