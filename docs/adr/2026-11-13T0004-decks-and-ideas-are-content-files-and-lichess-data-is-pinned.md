# ADR-2026-11-13T0004: Decks and ideas are content files, and Lichess-derived data is a pinned snapshot

- **Status:** proposed. Decided by the agent on 2026-11-12, delegated by the operator, to ratify at pull-request review.
- **Date:** 2026-11-13
- **Deciders:** the agent, delegated by Hugo Borsoni
- **Tags:** opening-trainer, borsouvertures, content, data, licence

## Context

The trainer needs three kinds of data. Decks and their ideas are written by hand, in fact by an agent, for a 1300 player. Opening names, puzzles and move statistics come from Lichess. The app has one data file today, `site/public/openings.json`, which is committed (measured, 1,803,909 bytes) and built from `lichess-org/chess-openings` at `refs/heads/master` (read in `apps/borsouvertures/scripts/build-openings.ts`). A build on another day can therefore produce another file.

Three forces push on the shape. The operator required that adding or removing a deck needs no code change. The move statistics come from the Lichess explorer API, which answers 401 without a personal token (measured on 2026-11-12, one request to `explorer.lichess.ovh`). And `docs/standards/09-i18n.md` says every string a user reads comes from a translation catalogue, while an idea is a paragraph of chess prose tied to a position in one deck.

ADR-2026-08-20T1031 already decides what is committed. A file is committed when it is an input no command can recompute from the tree, and ignored when it is an output (read in its Decision).

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | The five launch decks and their ideas are the product. | Input metric (c), every launch deck builds from its content files |
| Adding or removing a deck needs no code change | operator | high | His requirement, recorded in the spec's decisions table. | A deck folder added or deleted, with no other file in the diff |
| The same commit builds the same content | author | high | A preview and prod must show the same lines, and a gate must read what ships. | No network read during `pnpm build` |
| No secret in CI or in the deployed app | author | high | A token in a workflow is a right the repository has to manage. | Secrets named in the workflows |
| Licence duties are met | author | medium | The app ships no attribution today (read in the spec). | The Credits screen and the notices file |
| English and French stay complete | author | medium | It is the property the i18n standard exists for. | The build fails on a key present in one language only |

## Decision

**Hand-written content lives in files a build reads, and anything derived from a remote source is committed as a snapshot that names its pin.**

1. **Decks.** One folder per deck, `content/decks/<deck-id>/` with `deck.json`, `ideas.en.md` and `ideas.fr.md`. The build finds decks by a glob. What it produces is an output and is not committed.
2. **Ideas stay out of `en.json` and `fr.json`.** This is a stated exception to `docs/standards/09-i18n.md`. Its property is kept by the deck build, which fails when the two languages differ in keys. Every other visible string still goes through the catalogues, deck names included.
3. **Lichess-derived files are inputs.** `openings.json` is rebuilt from a commit SHA, not from `master`. The trap cards record the date of the puzzle dump they were cut from. `move-statistics.json` records its fetch date and filters, and holds only the positions of the decks. Each is committed, because no command can recompute it from the tree. The plan picks the SHA and the dump.
4. **`LICHESS_TOKEN` is read by one script and nothing else.** A session or the operator runs `build:move-statistics` with the token in its environment and commits the result. CI, previews and the deployed app never see it. Without the token the script stops and the counters are absent. Nothing else depends on it.
5. **Sources and credit.** The opening names are CC0 (read in the dataset's README, "Copyright"). The Lichess database page states the CC0 licence (measured, the page fetched on 2026-11-12). An idea based on Wikipedia carries its source in the file and is CC BY-SA 4.0 (the spec's statement, not re-read here). Lichess studies are not a source.

It would be worth reversing if the operator wants to edit a deck inside the app, which needs the database. It would also be worth reversing if the statistics must be fresher than a person reruns the script, or if Lichess changes who may call the explorer.

## Consequences

- `+` A deck is added by adding a folder, and removed by deleting it.
- `+` The build reads no network, so a preview and prod carry the same content for the same commit.
- `+` Parallel agents each write one deck folder and do not meet in a shared file.
- `-` Ideas are the one place where visible text is not in a catalogue. A reviewer has to know the exception.
- `-` The snapshots age. Nothing reports that a newer dataset or a newer dump exists.
- `-` Refreshing the statistics needs a person or a session that holds the token. The size of that file is unknown until it is built.
- `-` Committed snapshots add to the repository. `openings.json` is already 1.8 MB (measured), and the size of the trap file is unknown.
- `~` One operator-backlog row, the token, already listed in the spec.
- `~` Content written by an agent is checked by two gates, legality in `build-decks` and the Stockfish margin in `check-decks` (ADR-2026-11-13T0003 gives the engine).

## Alternatives considered

### Option A — Content files built locally, remote data as pinned committed snapshots, token in one script (chosen)

- **Raised by:** operator (decks as files with no code change), author (the pins and the token rule)
- **Summary:** as in the Decision.
- **Strengths:**
  - meets the operator's no-code-change requirement by a glob.
  - reproducible, and needs no secret anywhere a workflow runs.
- **Costs:** an i18n exception, and snapshots that only move when someone moves them.
- **Rationale:** it is the only option that meets the four high criteria.

### Option B — Fetch Lichess data during the build (rejected)

- **Raised by:** author (today's behaviour for `openings.json`)
- **Summary:** The build reads `master` and the explorer each time, with `LICHESS_TOKEN` as a CI secret.
- **Strengths:** always fresh. Nothing derived is committed.
- **Costs:** a build can change with no commit. CI holds a personal token. A preview deploy fails when Lichess is down.
- **Rejection rationale:** it fails the reproducibility and the secret criteria.

### Option C — Ideas in the i18n catalogues (rejected)

- **Raised by:** author (the standard's default)
- **Summary:** Each idea is a key in `en.json` and `fr.json`.
- **Strengths:** no exception to the standard. The existing key-parity check applies.
- **Costs:** every deck edit touches the two catalogues, so adding a deck is no longer one folder and parallel deck commits meet in the same two files. Paragraphs of Markdown sit in JSON strings.
- **Rejection rationale:** it fails the operator's no-code-change criterion in spirit, a deck would not be removable by deleting a folder.

### Option D — Decks and ideas in the database, served by the API (rejected)

- **Raised by:** author
- **Summary:** Content rows edited through an admin screen.
- **Strengths:** a deck changes with no deploy.
- **Costs:** a reader without an account, and any reader offline, would need the API for content. Editing a deck in the app is out of scope in the spec.
- **Rejection rationale:** it breaks the rule that no screen depends on the API (ADR-2026-11-12T2359).

### Option E — No hand-written content, the dataset's lines are the deck (rejected)

- **Raised by:** author
- **Summary:** Not doing it. Decks are cut from `openings.json` by name.
- **Strengths:** no content to write or to check.
- **Costs:** the lines are too short and offer several reader moves for one position (measured in the spec, 12 of the Albin's 13 lines stop at 10 plies or fewer).
- **Rejection rationale:** it fails the first criterion.

## Scores

|  | A, files and pinned snapshots | B, fetch at build | C, ideas in catalogues | D, content in the database | E, dataset lines only |
|---|---|---|---|---|---|
| Changes the app for its users | ✓ five decks with ideas | ✓ | ✓ | ✓ | ✗ short lines, no ideas |
| A deck with no code change | ✓ a folder | ✓ a folder | ✗ two shared catalogues | ✓ a row | ✗ a name filter in code |
| Same commit, same content | ✓ no network in the build | ✗ reads `master` | ✓ | ✗ content outside the commit | ✓ if pinned |
| No secret in CI or the app | ✓ one script | ✗ a CI secret | ✓ | ✓ | ✓ |
| Licence duties | ✓ Credits and notices | ✓ | ✓ | ✓ | ✓ |
| English and French complete | ✓ checked by the deck build | ✓ | ✓ checked by the catalogue rule | ✗ no gate reads rows | ✓ nothing to translate |

## Implementation pointers

- Spec: [`docs/features/borsouvertures/opening-trainer/spec/spec.md`](../features/borsouvertures/opening-trainer/spec/spec.md), decision rows on move statistics, ideas, the Lichess pin and Lichess studies
- Plan: not written yet
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/borsouvertures/content/decks/` (new), `apps/borsouvertures/scripts/build-decks.ts`, `check-decks.ts`, `build-traps.ts`, `build-move-statistics.ts` (new), `apps/borsouvertures/scripts/build-openings.ts` (`LICHESS_COMMIT`)
- Related ADRs: [ADR-2026-08-20T1031](./2026-08-20T1031-generated-files-are-not-committed.md) (inputs are committed, outputs are not), [ADR-2026-11-13T0003](./2026-11-13T0003-stockfish-runs-as-two-vendored-unmodified-gpl-worker-files.md)
