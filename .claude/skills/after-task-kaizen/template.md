# docs: lessons from PR #<n>

<!--
`scripts/pr/check-pr-body.ts` holds the budget below. It counts letters and
digits only: punctuation, pipes, backticks and the target inside a markdown
link are free, so link text costs and the URL does not. Write to the budget
first. Trimming a draft that is twice its size is several rounds of work the
checker cannot shorten, because it reports which section is over and by how
much, never what to cut.

  whole body 700    title 72    description 200
  Inventory 150     Shipped 350     Patterns 200

A table's cells count toward its section. Three Shipped rows of about 100
each is the whole section, so name what is now impossible in one sentence.
-->

What the sweep found, in numbers. How many rows, how many were already eradicated, how many entries ship. 200.

## Inventory

Budget 150, so the counts carry it and the table lives in the branch.

| Decision | Rows |
| --- | --- |
| dantotsu | 0 |
| knowledge | 0 |
| no-op, already covered | 0 |

Full table: [inventory.md](docs/features/meta/lessons-from-pr-0/inventory.md)

## Shipped

Budget 350, one row per entry.

| Entry | Level | Now impossible |
| --- | --- | --- |
| [a slug](docs/dantotsus/a-slug.md) | 1 structural impossibility | What the reader can no longer get wrong |

Name the level, do not only number it. The ladder is 1 structural
impossibility, 2 DevX check, 3 vendor patch, 4 detection, 5 knowledge. A bare
number sends the reader looking for the key.

Knowledge: one line naming the entries, not describing them.

## Patterns

Budget 200, which is two or three bullets.

- What the inventory shows that no single row does.
