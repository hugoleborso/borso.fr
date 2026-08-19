# 05. Front end architecture

## Rule

A component lives in exactly one of three folders, chosen by what the component
imports. A route composes organisms and owns nothing else.

```
site/src/
  components/
    atoms/        no component children, and no domain knowledge
    molecules/    a few atoms, and one responsibility
    organisms/    a screen region that owns user interface state
  routes/         one folder per route, composing organisms
  lib/            queries and pure helpers
  i18n/           translation catalogues
  styles/         one design token file, and nothing else
```

## Reason

The folder tree is the design review, because a reviewer can ask "what
primitives does this application have" and answer it by listing `atoms/`,
without opening a file.

The dependency direction is the second reason. An atom cannot import a
molecule, and a molecule cannot import an organism, so a circular import
between components is impossible and the leaf components stay reusable.

## The atom

An atom is a user interface primitive with no component children of its own,
and it knows nothing about the domain, so its props are presentational.
Examples are `Button`, `Input`, `Label`, `Badge`, `Chip`, `Icon`, `Spinner`,
`Avatar`, and `Card`.

A component named after a domain noun is not an atom, so `RunnerBadge` is a
molecule and `Badge` is the atom it uses.

## The molecule

A molecule is a small composition of atoms with a single responsibility, e.g.,
`SearchBar` is an `Input` and an `Icon`, and `MemberChip` is an `Avatar` and a
`Label`.

A molecule may know a domain type, and it does not fetch and it does not
decide, because it renders what it is given.

## The organism

An organism is a screen region that composes molecules and atoms, owns user
interface state, and drives a user flow. Examples are `CatalogGrid`,
`SetlistEditor`, `MasteryMatrix`, `Leaderboard`, and `CourseMap`.

An organism may call `useQuery` and `useMutation`, and it is the lowest level
that is allowed to.

## The route

A route file lives under `routes/`, and it owns routing concerns such as
parameters, navigation, and redirects, and it composes organisms. It holds no
layout primitives and no business logic.

## Choosing a folder

Ask what the component imports. A component that imports no other component is
an atom. A component that imports only atoms is a molecule. A component that
imports a molecule, calls a query hook, or holds flow state is an organism.

A component that imports a sibling from its own folder is usually wrong,
because the sibling normally belongs one folder down.

Read the answer in both directions. A file sitting in `molecules/` or
`organisms/` that imports no component is not the thing its folder says it is:
either it renders one element and owns no composition, in which case it is an
atom and moves down, or it renders raw markup where an atom belongs, in which
case the primitive it inlined moves out to `atoms/` and it composes it. Both
cases read the same from the folder tree, as a populated bucket whose atoms do
not exist, which is exactly what the review the tree is supposed to support
cannot see.

## Layouts we do not use

We do not use a flat `components/` folder, a `ui/` folder that holds
everything, a `shared/` or `common/` folder used as a dumping ground, or a
folder per component with an `index.tsx` that only re-exports. Import the file
directly.

## One component per file

The file is named after the component in `PascalCase`, and any pure helper the
component needs moves to a sibling `.utils.ts` or `.core.ts` file, as described
in [02. Purity and core files](./02-purity-and-core-files.md).

```
organisms/Leaderboard.tsx
organisms/leaderboard-rows.core.ts
organisms/leaderboard-rows.core.test.ts
```

## Props

Props are a flat object of primitives, domain types, and callbacks.

Spreading the rest of the props onto a DOM node is allowed in an atom, where it
is the point, and it is not allowed anywhere else. A callback is named
`on<Event>` and receives the domain value rather than the DOM event, e.g.,
`onRunnerSelected(runnerId: string)`. A set of boolean props that together mean
"which variant" is banned, and you write `variant: 'primary' | 'ghost' |
'danger'` instead.

A variant table goes through `cva`, so the variants are one typed object that a
reviewer can read at a glance.

## Every screen works at 375 pixels

Every screen renders correctly at 375 pixels wide, so Tailwind's `sm:`, `md:`,
and `lg:` prefixes are mandatory on any class that affects layout, which
includes `grid-cols-`, `flex-row`, `gap-`, `p-`, `w-`, `max-w-`, fixed width
sidebars, and full screen modals.

Write the mobile layout first, and then opt into the desktop layout with `lg:`.

## Enforced by

- `eslint:borso/atomic-design-import-direction` fails when an atom imports from
  `molecules/` or `organisms/`, or a molecule imports from `organisms/`.
- `eslint:borso/atomic-design-composition` fails when a file in `molecules/` or
  `organisms/` renders markup and imports no component at all. The direction
  rule keeps the dependency arrow pointing one way, and this one asks that the
  arrow exist.
- `eslint:borso/no-flat-components-folder` fails on a component placed directly
  under `components/`.
- `eslint:borso/no-components-outside-buckets` fails on a component under
  `routes/` that is not the route's own page. Every atomic design rule reads the
  bucket out of the path, so a component living in `routes/` was invisible to
  all of them, and that is where components accumulate.
- `eslint:borso/no-query-hooks-outside-organisms` rejects `useQuery` and
  `useMutation` in `atoms/` and `molecules/`.
- `script:scripts/check-pwa-assets.sh` fails a manifest naming an icon that does
  not ship, which otherwise installs a grey square while every other gate passes.
- `reviewer` checks that a route composes organisms and owns no layout
  primitive, because the atomic rules read the bucket out of the path and a
  route is in no bucket.
- `reviewer` checks that every screen holds together at 375 pixels, using
  `agent-browser` for anything measurable and `scripts/argent.sh` for anything
  touched, because a synthetic click is not a tap.
- `reviewer` checks that a prop set has not grown a family of booleans where one
  variant string belongs.
