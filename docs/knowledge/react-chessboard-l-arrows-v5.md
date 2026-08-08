# `react-chessboard@^5.4.0` ships L-shaped knight arrows natively

`react-chessboard@4.x` draws every arrow in `customArrows` as a
straight line between two squares. Knight moves rendered as a
diagonal — visually wrong, immediately recognisable as not-a-chess-UI.

`react-chessboard@^5.4.0` (merged via [PR #208](https://github.com/Clariity/react-chessboard/pull/208),
August 2025) detects knight moves geometrically and draws a single L
path with one arrowhead at the destination. No consumer-side code
required — pass the same two-endpoint arrow and the library does the
rest.

## API differences between v4 and v5 to know before bumping

v5 is a meaningful refactor, not a drop-in:

- **Props are consolidated into a single `options` object** on
  `<Chessboard options={…} />`. v4's flat-props style is gone.
- **`Arrow` is now an object**, not a tuple:

  ```ts
  // v4
  type Arrow = [Square, Square, string?];

  // v5
  type Arrow = { startSquare: string; endSquare: string; color: string };
  ```

- **Prop renames**: `customDarkSquareStyle` → `darkSquareStyle`,
  `customArrows` → `arrows`, `arePiecesDraggable` → `allowDragging`,
  `animationDuration` → `animationDurationInMs`, `customSquareStyles`
  → `squareStyles`, `customBoardStyle` → `boardStyle`.
- **`customArrowColor`** → set `arrowOptions.color` instead. The
  `arrowOptions` shape is the full `typeof defaultArrowOptions`
  object; spread the defaults to override just one field:

  ```ts
  import { defaultArrowOptions } from 'react-chessboard';
  arrowOptions: { ...defaultArrowOptions, color: theme.arrow }
  ```

- **`onPieceDrop`** now takes `{ piece, sourceSquare, targetSquare }`
  (object) instead of positional `(source, target)`.
- **`<ChessboardDnDProvider>` is gone** — v5 manages DnD internally.
  Remove the wrapper.
- **`CustomSquareStyles` type** removed. Use `Record<string,
  React.CSSProperties>` for `squareStyles`.
- **`Square` type widened to `string`** — keep a local brand if you
  want compile-time narrowness (the runtime regex guard is the actual
  gate anyway).
- **Built-in piece set replaces `customPieces`**. The library ships
  Cburnett-style SVGs as part of the JS bundle. Themes only differ in
  square palette + arrow colour now.

## v5 requires React 19

Critical caveat: the entire v5 line (5.0 → at least 5.10) has
`peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' }`. The
library internally uses `React.use(ChessboardContext)`, which is a
React-19-only hook. `pnpm install` will *complete* against React 18
(only emitting a peer warning — see
[`pnpm-peer-warning-is-not-enforcement.md`](./pnpm-peer-warning-is-not-enforcement.md))
but every `<Chessboard>` then crashes its React error boundary at
render time.

Upgrade as a chain: react + react-dom + `@types/react` +
`@types/react-dom` → ^19, then react-chessboard → ^5. Don't bump just
one.

## Where this lives in our code

`apps/borsouvertures/site/components/{BoardView,MiniBoard}.tsx` after
PR #8 commit `6533eeb`.

## Related

- [`pnpm-peer-warning-is-not-enforcement.md`](./pnpm-peer-warning-is-not-enforcement.md)
- [`docs/dantotsus/built-my-own-before-checking-the-library.md`](../dantotsus/built-my-own-before-checking-the-library.md)
