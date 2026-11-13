# Third-party notices

## Stockfish

`site/public/stockfish/` holds three files copied unmodified from the npm package `stockfish` 19.0.1, the lite single-threaded build of Stockfish compiled to WebAssembly ([ADR-2026-11-13T0003](../../docs/adr/2026-11-13T0003-stockfish-runs-as-two-vendored-unmodified-gpl-worker-files.md)).

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `stockfish-19-lite-single.js` | 28,230 | `ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a` |
| `stockfish-19-lite-single.wasm` | 1,845,971 | `ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de` |
| `Copying.txt` | 35,821 | `0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b` |

Stockfish.js is distributed under the GNU General Public License, version 3. The full licence text is `site/public/stockfish/Copying.txt`, and the application serves it at `/stockfish/Copying.txt`.

The notice the worker file carries, copied from its first lines:

```
Stockfish.js 19 (c) 2026, Chess.com, LLC
https://github.com/nmrugg/stockfish.js
License: GPLv3

Based on Stockfish (c) T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other contributors.
https://github.com/official-stockfish/Stockfish

Nets by Chris Bao (sscg13)
https://tests.stockfishchess.org/nns?network_name=nn-61e7af4bb97d
```

The corresponding source is the upstream repository at tag `v19.0.1`: https://github.com/nmrugg/stockfish.js/tree/v19.0.1. The tag exists upstream (read with `git ls-remote --tags` on 2026-11-13).

The application runs the engine as a separate program and exchanges UCI text lines with it. Nothing imports it and no bundler touches it. `scripts/check-decks.setup.ts` refuses to run when a digest differs from the table above, and `site/src/opponent/stockfish-distribution.core.test.ts` compares the committed files to it.

## Lichess chess-openings

`site/src/openings/openings.json` and `site/public/openings.json` are built from the Lichess `chess-openings` dataset (https://github.com/lichess-org/chess-openings) at commit `3ba6b20d31b2e6125cb0e6a2e792f400717d9d39`, distributed under CC0 1.0 Universal.

## Wikipedia

The ideas in `content/decks/albin-countergambit/ideas.en.md` and `ideas.fr.md` take facts from the English Wikipedia article "Albin Countergambit" (https://en.wikipedia.org/wiki/Albin_Countergambit), distributed under the Creative Commons Attribution-ShareAlike 4.0 licence. The sentences are written for this application. A deck whose ideas file carries a `source: wikipedia` front matter shows the credit and the link under each of its ideas.
