# ADR-2026-11-13T0003: Stockfish runs as two vendored, unmodified GPL-3.0 worker files

- **Status:** proposed. Decided by the agent on 2026-11-12, delegated by the operator, to ratify at pull-request review.
- **Date:** 2026-11-13
- **Deciders:** the agent, delegated by Hugo Borsoni
- **Tags:** opening-trainer, borsouvertures, dependency, licence

## Context

On a deck page the reader plays a game. The auto opponent plays the deck's moves, then needs a move source once the deck ends (read in the spec, happy path step 7). The same engine has a second job at build time, the gate that checks no hand-written reader move loses more than a set margin.

Stockfish is GPL-3.0 and the repository has no licence file (read in the spec). The app is a static site with no control over response headers beyond what the shared constructs set, so an engine that needs cross-origin isolation is a wider change. The spec carried the engine's size, header needs and strength options as unverified. They are measured below.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | He plays the deck against an opponent near his own rating, rapid 1304 and blitz 1322 (read in the spec). | The opponent answers after the deck ends, at the chosen strength, on a phone |
| The rest of the app keeps its own licence terms | author | high | A GPL engine linked into the bundle would put the whole bundle under GPL-3.0 (inferred, not legal advice). | The engine is a separate file reached only by messages |
| No new response header | author | high | Cross-origin isolation changes how every other resource loads. | The engine's README and its `Threads` option |
| Bytes a reader downloads who never plays | author | medium | Most sessions are reviews. | Bytes in the precache |
| Cost to every install of the monorepo | author | medium | One `pnpm install` serves every app and every agent. | Tarball size on npm |

## Decision

**The lite single-threaded build of `stockfish` 19.0.1 is committed as two unmodified files and started as a Web Worker.** `apps/borsouvertures/site/public/stockfish/` holds `stockfish-19-lite-single.js`, `stockfish-19-lite-single.wasm` and the package's `Copying.txt`. The app calls `new Worker(...)` on the first file and exchanges UCI text lines with `postMessage`. Nothing imports it and no bundler touches it. The worker loads when a game starts. The service worker caches the two files at first use and does not precache them. `THIRD_PARTY_NOTICES.md` and the Credits screen carry the GPL-3.0 notice, the three SHA-256 values below and a link to the upstream source at tag `v19.0.1`. A test compares the committed files to those values, so "unmodified" is checked and not asserted. The package is not a dependency.

Measured on 2026-11-12, in the npm tarball `stockfish-19.0.1.tgz` unpacked in a scratch folder:

| File | Bytes | SHA-256 |
|---|---|---|
| `bin/stockfish-19-lite-single.js` | 28,230 | `ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a` |
| `bin/stockfish-19-lite-single.wasm` | 1,845,971 | `ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de` |
| `Copying.txt` | 35,821 | `0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b` |

- The two engine files total 1,874,201 bytes. The spec's 1.85 MB is the `.wasm` alone.
- The package is GPL-3.0, version 19.0.1 (npm metadata). Its tarball is 161,366,858 bytes and unpacks to 205,116,933 bytes, because it holds five builds, two of them near 99 MB each.
- The single-threaded builds need no cross-origin isolation, so no `Cross-Origin-Opener-Policy` or `Cross-Origin-Embedder-Policy` header and no `SharedArrayBuffer` (read in the package README). The engine reports `option name Threads type spin default 1 min 1 max 1` (measured).
- The `.js` expects the `.wasm` beside it, and both must be served as `text/javascript` and `application/wasm` (read in the README). Whether the site's bucket serves `.wasm` with that type is not verified. The plan checks it on the preview.
- Strength options, printed by the engine after `uci`: `UCI_LimitStrength` is a check, default false. `UCI_Elo` is a spin, default 1320, min 1320, max 3190. `Skill Level` is a spin, default 20, min 0, max 20.
- A search with `UCI_LimitStrength` true and `UCI_Elo` 1320 returned a move, and a search with `Skill Level` 3 returned a move, under Node 22.23.4. How the two options combine was not measured, so the app sets one or the other, never both.
- The engine was run in Node only. It was not run in a browser this session.

It would be worth reversing if the two files stop passing the hash test after an engine upgrade nobody reviewed, if the operator wants the repository under a licence the vendored files conflict with, or if 1320 proves too strong and `Skill Level` too erratic. In the last case the fallback is the deck's moves only.

## Consequences

- `+` The opponent works on any static host with no header change (read in the README).
- `+` A reader who never starts a game downloads none of it.
- `+` No install of the monorepo pays for the 161 MB tarball.
- `+` The build-time move check and the browser run the same two files.
- `-` About 1.87 MB of third-party binary is committed, and each engine upgrade adds as much to the git history.
- `-` An upgrade is a manual copy and three new hashes. No tool reports a new version.
- `-` The repository now distributes GPL-3.0 files. It must keep the notice, the licence text and a working source link for as long as it serves them (inferred from the licence, not legal advice).
- `-` The first game on a device needs the network. Offline, the game ends where the deck ends (read in the spec's edge cases).
- `~` The default strength is `UCI_Elo` 1320, the engine's floor. The spec's three easier steps use `Skill Level` with `UCI_LimitStrength` off.
- `~` The package's own Node wrapper threw `RuntimeError: unreachable` when a command was sent before the engine had loaded, and worked when the first command waited (measured). The adapter waits for the engine before its first command.

## Alternatives considered

### Option A — Vendor the two lite single-threaded files, start them as a worker (chosen)

- **Raised by:** author
- **Summary:** as in the Decision.
- **Strengths:**
  - a separate program reached by text messages (inferred to keep the app outside the GPL's scope, not legal advice).
  - no header, no install cost, nothing precached.
- **Costs:** 1,874,201 bytes in git per engine version. A manual upgrade.
- **Rationale:** it meets the three high criteria and removes the install cost the other shapes carry.

### Option B — `stockfish` as a dev dependency, copied into `dist/` at build (rejected)

- **Raised by:** author (the spec's shape)
- **Summary:** The build copies the two files out of `node_modules`.
- **Strengths:** the version sits in `package.json`, and an upgrade is one line.
- **Costs:** every cold install of the monorepo downloads 161,366,858 bytes for two files that total 1,874,201 (measured).
- **Rejection rationale:** it loses on install cost, for every app and every agent. It would win if the package shipped the lite build alone.

### Option C — Download the two files from the upstream release at build (rejected)

- **Raised by:** author
- **Summary:** The build fetches them from the `v19.0.1` release named in the README and checks their hashes.
- **Strengths:** nothing committed and nothing installed.
- **Costs:** every build depends on a third-party host. Whether CI and agent sandboxes may reach it is unknown.
- **Rejection rationale:** it trades a one-time commit for a failure mode on every build.

### Option D — The multi-threaded lite build (rejected)

- **Raised by:** author
- **Summary:** `stockfish-19-lite.js` with its 1,697,617-byte `.wasm` (measured).
- **Strengths:** faster search.
- **Costs:** it needs cross-origin isolation, so both headers on every response of the site (read in the README).
- **Rejection rationale:** it fails the header criterion, and a 1320 opponent does not need the speed.

### Option E — Bundle the engine into the app (rejected)

- **Raised by:** author
- **Summary:** Import the engine and let Vite bundle it.
- **Strengths:** one build pipeline.
- **Costs:** the app's bundle becomes a combined work with a GPL-3.0 engine (inferred, not legal advice), and every reader downloads it.
- **Rejection rationale:** it fails the licence criterion and the bytes criterion.

### Option F — No engine, the game ends where the deck ends (rejected)

- **Raised by:** author
- **Summary:** Not doing it. The auto opponent plays book moves only.
- **Strengths:** no GPL file, no 1.87 MB, no worker.
- **Costs:** the reader never plays the middlegame the deck leads to. The build-time move check loses its engine too.
- **Rejection rationale:** it fails the first criterion. It is slice 5 and the last item on the spec's cut list, so it is also what ships if the slice is cut.

## Scores

|  | A, vendored worker | B, dev dependency | C, fetch at build | D, multi-threaded | E, bundled | F, no engine |
|---|---|---|---|---|---|---|
| Changes the app for its users | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ no game after the deck |
| App keeps its own terms | ✓ separate file | ✓ separate file | ✓ separate file | ✓ | ✗ combined work | ✓ |
| No new header | ✓ | ✓ | ✓ | ✗ two headers | ✓ | ✓ |
| Bytes for a reader who never plays | ✓ none | ✓ none | ✓ none | ✓ none | ✗ all of it | ✓ none |
| Cost to every install | ✓ none | ✗ 161 MB tarball | ✓ none, a fetch per build | ✓ as chosen | ✗ as B | ✓ none |

## Implementation pointers

- Spec: [`docs/features/borsouvertures/opening-trainer/spec/spec.md`](../features/borsouvertures/opening-trainer/spec/spec.md), decision rows "What are the engine's obligations?" and "How strong is the opponent?"
- Plan: not written yet
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/borsouvertures/site/public/stockfish/` (new), `apps/borsouvertures/site/src/opponent/stockfish.adapter.ts`, `opponent-strength.core.ts` (new), `apps/borsouvertures/vite.config.ts` (a runtime cache rule beside the one for `openings.json`), `apps/borsouvertures/THIRD_PARTY_NOTICES.md` (new)
- Related ADRs: none
