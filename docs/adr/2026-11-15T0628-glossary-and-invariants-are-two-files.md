# ADR-2026-11-15T0628: The glossary stays in VOCABULARY.md and each term's rules move to an INVARIANTS.md in its folder

- **Status:** proposed
- **Date:** 2026-11-15
- **Deciders:** operator
- **Tags:** meta, vocabulary, harness

## Context

CLAUDE.md tells every agent to read `apps/<app>/VOCABULARY.md` before naming a
type, column, function or file. On main at cdc543725, pragma's file was 2,028
lines for 74 terms, with 302 `Held by:` lines, and the other five ran from 188
to 661 lines (measured with `wc -l`). Each entry mixed three things: what the
word means, the product rules the term holds (for example, one address may
register ten clients an hour), and the tests that hold each rule. Only the
first is needed to name something. The words of the repository itself, such
as kaizen, dantotsu, blueprint, preview and gate, had no glossary at all: they
were defined in passing in CLAUDE.md, `docs/dantotsus/README.md`,
`docs/knowledge/README.md`, `scripts/kaizen.sh` and the skills.
`scripts/check-vocabulary-paths.sh` checks every `Lives in:` folder and every
`Held by:` test, and every one of those checks has to survive the change.

Matt Pocock's `domain-modeling` skill (read this session at
https://github.com/mattpocock/skills, `skills/engineering/domain-modeling/SKILL.md`
and `GLOSSARY-FORMAT.md`) keeps one `GLOSSARY.md` per context, a one or two
sentence definition per term with an `_Avoid_` list of synonyms, "totally
devoid of implementation details", and a root `GLOSSARY-MAP.md` that lists the
contexts when a repository has several.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | low | It does not; this is the agents' reading load | no file under `site/` or `api/` behaviour changes |
| Lines an agent reads before naming | operator | high | Every agent pays it on every naming decision | `wc -l` of the glossary it must read |
| Lines an agent reads before changing a folder's rules | author | high | The rules are needed exactly when the folder changes | `wc -l` of the invariants file of that folder |
| Every rule and every `Held by` line survives, still gated | operator | high | A rule nothing checks is a promise that decays | sorted line multiset and `Held by` count before and after |
| A reader of a term can still reach all its rules | author | medium | The old file's one property: one place to read everything about a term | a gate that fails when the link breaks |

## Decision

**A glossary per application in `apps/<app>/VOCABULARY.md`, each term's rules
and tests in an `INVARIANTS.md` in the folder its `Lives in:` line names, and a
repository glossary in `docs/VOCABULARY.md` that also maps every application
glossary.** A term with rules carries an `Invariants:` line, and the gate fails
when that file lacks the term's section, when a section has no term pointing at
it, and when a glossary carries a `Held by` line or a rule bullet. It cuts what
every agent reads and puts each rule beside the code it governs, while the gate
keeps the link the single file used to give for free.

## Consequences

- `+` pragma's glossary falls from 2,028 to 871 lines, and the six from 3,839 to 2,068 (measured with `wc -l`); an agent touching `api/src/oauth/` reads 45 lines of rules instead of the whole file.
- `+` the separation is a gate, not an instruction: a rule bullet or a `Held by` line in a glossary term fails the commit.
- `+` repository terms have one home, and the repository glossary lists every application glossary.
- `-` everything about a term is no longer in one place. A reader follows the `Invariants:` line, and the gate keeps that line true.
- `-` 77 new `INVARIANTS.md` files, one per folder, so a renamed folder now moves a rules file with it.
- `-` the gate costs 0.22 s per run against 0.18 s on main (three runs each, measured), because it now reads 77 files and cross-checks headings.
- `~` definitions were moved, not rewritten. Several are still longer than Pocock's one or two sentences; shortening them is prose work for the next edit of each term.

## Alternatives considered

### Option A — glossary per app, invariants per folder, repository glossary (chosen)

- **Raised by:** operator
- **Summary:** As in the decision. The folder is the first path of the term's `Lives in:` line, or its directory when that path is a file.
- **Strengths:**
  - The glossary every agent reads holds definitions, locations and confusions only.
  - The rules an agent needs come with the folder it is already changing.
  - Every `Held by` line keeps its text and its path, so the gate reads it unchanged.
- **Costs:**
  - 77 files instead of 6, and a cross-file link the gate has to hold.
- **Rationale:** It wins both reading criteria and keeps the rule count exact.

### Option B — one INVARIANTS.md per application, beside VOCABULARY.md (rejected)

- **Raised by:** author
- **Summary:** Move every term's rules into `apps/<app>/INVARIANTS.md`.
- **Strengths:** Two files per app, the simplest move.
- **Costs:** pragma's would be 1,593 lines (the sum of its per-folder files, measured), read whole by any agent changing any rule.
- **Rejection rationale:** It loses on lines read before changing a folder's rules. Weighting file count above reading load would flip it.

### Option C — Pocock's layout as published (rejected)

- **Raised by:** author
- **Summary:** A `GLOSSARY.md` per context with a root `GLOSSARY-MAP.md`, definitions only, no implementation detail, rules left to code, tests and ADRs.
- **Strengths:** A tight, widely shared convention; the glossary is as short as it can be.
- **Costs:** Drops the `Lives in:` line the gate checks and the `Held by` lines that bind each rule to a test, and renames six files many documents link to.
- **Rejection rationale:** It loses on "every rule and every `Held by` line survives, still gated". The pieces that do not cost that are taken: the map of glossaries, one-sentence intent for new definitions, and forbidden synonyms (already the *Words we do not use* section).

### Option D — keep one file, read it by heading (rejected)

- **Raised by:** author
- **Summary:** Keep `VOCABULARY.md` whole and tell agents to grep the term they need.
- **Strengths:** No move at all.
- **Costs:** An agent naming something new does not know which heading to grep, and the instruction is the kind of written rule nothing holds.
- **Rejection rationale:** It loses on lines read before naming, and the lesson stays in prose instead of structure.

## Scores

|             | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| Lines read before naming | ✓ 871 for pragma | ✓ 871 | ✓ shortest | ✗ 2,028 |
| Lines read before changing a folder's rules | ✓ that folder only | ✗ the whole app | ✗ no rules file | ✗ the whole file |
| Every rule and `Held by` survives, gated | ✓ 346 of 346 | ✓ | ✗ dropped | ✓ |
| A reader of a term reaches its rules | ✓ gated `Invariants:` line | ✓ one file | ✗ | ✓ |

## Implementation pointers

- Spec: none; the brief is in the pull request body.
- Commit: stamped by `/after-task-kaizen` on merge.
- Files: `scripts/check-vocabulary-paths.sh`, `.husky/pre-commit` (the `vocabulary-paths` check), `docs/VOCABULARY.md`, `docs/standards/01-naming.md` (*The application's own words*).
- Related ADRs: none.
