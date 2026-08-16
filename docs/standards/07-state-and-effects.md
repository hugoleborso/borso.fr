# 07. State and effects

## Rule

No front end in this repository contains a `useEffect`. The four replacements
below cover every case we have met, and a genuinely new case needs an
explanation in the pull request and an ESLint disable comment that names it.

## Reason

Most effects in a React codebase are not synchronising React with anything
outside React, and they are working around React instead. An effect that
watches one piece of React state and writes another is `useMemo` rebuilt by
hand, with an extra render, a stale closure risk, and a dependency array that
someone will get wrong.

Effects also make behaviour hard to follow, because the cause and the result
sit in different places, so a reader has to reconstruct the order in their
head.

Dan Abramov's [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
covers the same ground in more detail.

## Replace an effect with derived state

When the effect computes a value from other state, compute it during render.

```tsx
// Don't
const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
useEffect(() => {
  setFilteredSongs(songs.filter((song) => song.title.includes(query)));
}, [songs, query]);

// Do
const filteredSongs = selectSongsMatchingQuery(songs, query);
```

`selectSongsMatchingQuery` is pure, so it lives in a `.core.ts` file and it has
tests. See [02. Purity and core files](./02-purity-and-core-files.md).

Reach for `useMemo` only when you have measured the cost of recomputing.

## Replace an effect with an event handler

When the effect reacts to something a user did, do the work where the user did
it.

```tsx
// Don't
useEffect(() => {
  if (submitted) {
    void saveSetlist(setlist);
  }
}, [submitted, setlist]);

// Do
function onSubmit() {
  saveSetlistMutation.mutate(setlist);
}
```

## Replace an effect with CSS

Media queries, animations, transitions, focus rings, and scroll behaviour are
all CSS features, and reading the viewport width into React state to choose a
layout is the most common unnecessary effect we have written.

```tsx
// Don't
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const query = window.matchMedia('(max-width: 640px)');
  const update = () => setIsMobile(query.matches);
  update();
  query.addEventListener('change', update);
  return () => query.removeEventListener('change', update);
}, []);

// Do
<div className="flex flex-col lg:flex-row">
```

## Replace an effect with `useSyncExternalStore`

When you genuinely need a value from outside React, e.g., a media query whose
value changes a component tree rather than a class name, the browser online
status, or a third-party store, subscribe with `useSyncExternalStore`.

```ts
export function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(subscribeToCoarsePointer, readCoarsePointer, () => false);
}
```

Define `subscribe` and `getSnapshot` at module level rather than inline, so
that a new function identity on every render does not resubscribe on every
render.

`useSyncExternalStore` reads external state correctly during concurrent
rendering, and an effect does not, so it is the right tool and not only the
tidier one.

## Server state is never an effect

Fetching in an effect and writing the result into `useState` is banned, and
TanStack Query replaces it. See [06. Data fetching](./06-data-fetching.md).

## What a real effect would look like

An effect is justified when React state has to be pushed into a system that
owns its own lifecycle, and there is no other way in. Examples are attaching a
Leaflet map to a DOM node, writing the initial state into the URL once with
`history.replaceState`, and moving focus after a user action that changed the
tree.

Even for the three cases above, prefer a `ref` callback, a library binding, or
an event handler when one exists. When you do need the effect, disable the
lint rule on the line and write one sentence saying which external system you
are synchronising with.

## Enforced by

- `borso/no-use-effect`, a custom ESLint rule, set to error across
  `apps/*/site/`, with the disable comment requiring a description.
- `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`, both set to
  error, which cover the effects that survive. `exhaustive-deps` needs the
  explicit severity: the plugin's recommended set ships it at `warn`, and no
  gate here passes `--max-warnings`, so it failed nothing until 2026-08-15.
- `borso/no-inline-subscribe-in-use-sync-external-store`, a custom ESLint rule,
  which rejects an inline `subscribe` or `getSnapshot` argument.
