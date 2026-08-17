# A Drizzle `uniqueIndex` lands in `indexes`, not in `uniqueConstraints`

Observed 2026-08-15 while writing schema tests for `pragma` and
`last-loop-lepin`.

`getTableConfig(table)` returns both, and they hold different things:

| Declared as | Read back from |
| --- | --- |
| `uniqueIndex('x').on(...)` | `getTableConfig(table).indexes` |
| `unique('x').on(...)` | `getTableConfig(table).uniqueConstraints` |
| `primaryKey({ columns })` | `getTableConfig(table).primaryKeys` |

An assertion against the wrong container **fails**, and says so clearly:

```
AssertionError: expected undefined to deeply equal [ 'member_id', 'instrument_id' ]
```

Measured 2026-08-17, because the first version of this entry claimed the
opposite — that the assertion passed silently on `undefined`. It does not.
`expect(undefined).toEqual([…])` is a failure, and the optional chain does not
swallow it. The cost here is a minute of looking in the wrong place, not a green
test proving nothing.

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
