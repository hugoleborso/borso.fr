# `chess.js` v1 throws on illegal moves (it used to return `null`)

`chess.js` v0.x returned `null` from `.move()` when the move was
illegal. The v1.0 release changed the contract: `.move()` **throws**
`Error('Invalid move: …')` instead.

Naive code from the v0 era looks like:

```ts
const move = chess.move({ from, to, promotion });
if (!move) return false; // would never run in v1 — exception propagated instead
```

…which compiles, runs, and crashes the surrounding React render on the
first user click outside book.

## Mitigation

Wrap every `chess.move` in `try`/`catch`:

```ts
function applyUci(uci: string): boolean {
  try {
    chess.move({
      from: uciFromSquare(uci),
      to: uciToSquare(uci),
      promotion: uciPromotion(uci),
    });
    return true;
  } catch {
    return false;
  }
}
```

If you're driving the engine from a state machine, the catch can also
notify "out of book" / increment a generation counter / whatever the
machine needs.

## Verification

The v1 changelog calls this out under "BREAKING CHANGES":

> `move()` now throws on illegal moves instead of returning `null`.

Search the codebase before / after adopting v1:

```bash
rg '\bchess\.move\b' --type ts
```

…and confirm every call site is inside a `try` block.

## Where this lives in our code

`apps/borsouvertures/site/openings/{learnTreeMachine,playMachine}.utils.ts`'s
`applyUciToBoard` wrappers, plus `apps/borsouvertures/site/openings/previews.utils.ts`'s
SAN-replay loop. All three try/catch defensively.
