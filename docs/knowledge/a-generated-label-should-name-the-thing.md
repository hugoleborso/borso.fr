# A generated label that reuses an internal id names the mechanism, not the thing

Observed 2026-08-15 on the architecture map's user-action level, over two
questions from the operator:

> What is the shell button ?

and, after the explanation:

> Then why not call it that way ?

The level's picker built each button as `label: featureId`. For a real feature
that is fine — `songs` is what the feature is called. For the three entries that
are not features it was not:

| id | showed | means |
| --- | --- | --- |
| `shell` | shell | opening the app |
| `request` | request | serving a request |
| `shared` | shared | the front end no feature claims |

Each id names the *mechanism the generator uses to build that graph*. The reader
wants the thing the graph is about. The gap only exists for generated UI, where
an id is already in hand and reusing it is one keystroke shorter than naming it.

**Keep the id and add a label.** Ids key the graphs and are read by nothing
outside the generator, so renaming them buys nothing and breaks any bookmark;
labels are for people. The fix was a lookup table of three entries.

The neighbouring smell, worth checking at the same time: an entry with no
actions rendered its meta as `0 actions`, which reads as a gap where there is
none — a set with no data flow is not a feature missing its flows. It says
"what it is made of" now.

`docs/standards/01-naming.md` governs identifiers. This is its user-facing
counterpart, and it has no lint rule: no machine can tell that `shell` is the
wrong word for a button. The check is a person reading the screen and asking
what a label means.
