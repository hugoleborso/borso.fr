# ADR-0025: `ical.js` parses the members' calendar feeds

- **Status:** proposed
- **Date:** 2026-10-02
- **Deciders:** Hugo Borsoni
- **Tags:** practice-free-slots, dependency

## Context

The free-slot calculator ([spec](../features/pragma/practice-free-slots/spec/spec.md)) turns each member's ICS feed into busy intervals over the next four weeks. A real feed contains recurring events (`RRULE`), deleted occurrences (`EXDATE`), moved occurrences (`RECURRENCE-ID`), all-day events, events marked free (`TRANSP:TRANSPARENT`), cancelled events, and times in named zones defined by `VTIMEZONE` blocks. Getting recurrence or zones wrong silently proposes a slot when a member is busy.

The feed is fetched by our own code behind an SSRF guard (https only, port 443, no IP literal, every redirect checked again, a size limit and a time limit). The library must parse a string and never fetch anything itself. It runs in the pragma API Lambda.

The npm registry, read on 2026-10-02, lists `ical.js` 2.2.1 (MPL-2.0, no runtime dependency, published 2025-08-08) and `node-ical` 0.27.2 (Apache-2.0, depends on `rrule-temporal` and `temporal-polyfill`, published 2026-09-13).

## Decision

**`ical.js` parses the feeds, called only from `apps/pragma/api/src/calendar-feeds/ics.core.ts`, which returns plain busy intervals.** It has no runtime dependency, and only parses: it has no fetch API that could bypass the SSRF guard. It expands recurrences through its own iterator and resolves zones from the feed's `VTIMEZONE` blocks. A `TZID` with no `VTIMEZONE` block is read in that zone when it is an IANA name the runtime knows, and as Europe/Paris, the band's zone, otherwise; a floating time is read as Europe/Paris. Nothing outside the adapter imports the library, so replacing it later touches one file.

## Consequences

- `+` One new package with no transitive dependency in the Lambda bundle.
- `+` The library cannot make a network call, so the SSRF guard is the only path to the network.
- `-` A feed that names a non-IANA zone it does not define, such as a Windows zone name with no `VTIMEZONE` block, is read as Paris time. That is correct for this band and wrong for a member travelling abroad.
- `-` The latest release is from 2025-08-08. If a parsing bug appears, a fix may have to be patched locally under `patches/`.
- `~` MPL-2.0 is file-level copyleft. Using the package unmodified asks nothing of this repository, and a local patch to its files would be published under MPL-2.0.

## Alternatives considered

### Option A — `ical.js` (chosen)

- **Summary:** As described in *Decision*.
- **Strengths:**
  - No runtime dependency.
  - Parses only.
  - Handles `RRULE`, `EXDATE`, `RECURRENCE-ID` and `VTIMEZONE`.
- **Costs:**
  - Zones missing from the feed fall back to our default.
- **Rationale:** It wins on dependency weight and on having no network surface, both weighted high or medium.

### Option B — `node-ical` (rejected)

- **Summary:** A parser built for Node, with recurrence expansion on top of `rrule-temporal` and zone handling through a Temporal polyfill.
- **Strengths:**
  - Released recently.
  - Resolves zone names through the runtime's zone database rather than through the feed alone.
- **Costs:**
  - Two runtime dependencies, one of them a polyfill.
  - It exposes `fromURL`, a fetch that would bypass the SSRF guard if anyone called it.
- **Rejection rationale:** It loses on dependency weight and on network surface. It would win if members' feeds turned out to name zones they do not define, which the fixture tests will show.

### Option C — A hand-written parser (rejected)

- **Summary:** Parse `VEVENT` blocks and expand recurrence ourselves in a `.core.ts` file.
- **Strengths:**
  - No dependency at all, and 100 % coverage and mutation testing by construction.
- **Costs:**
  - `RRULE` alone has `BYDAY`, `BYSETPOS`, `UNTIL` and `COUNT` combinations, plus zone transitions, which is several days of work and a long tail of bugs.
- **Rejection rationale:** It loses on correctness, the criterion weighted highest, because a wrong recurrence proposes a slot when a member is busy.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Recurrence and zone correctness | high | A wrong expansion books a practice when a member is busy. |
| Runtime dependency weight | medium | It ships in the Lambda bundle, and every dependency needs upgrading later. |
| No network surface of its own | medium | The SSRF guard must be the only path to an address a member typed. |
| Maintenance activity | low | The adapter isolates it, so a replacement touches one file. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Recurrence and zone correctness | ✓ `RRULE`, `EXDATE`, `RECURRENCE-ID`, `VTIMEZONE` | ✓ same, plus the runtime's zone names | ✗ ours to get right |
| Runtime dependency weight | ✓ none | ✗ two, one a polyfill | ✓ none |
| No network surface of its own | ✓ parses only | ✗ `fromURL` | ✓ none |
| Maintenance activity | ✗ last release 2025-08-08 | ✓ released 2026-09-13 | ✗ ours forever |

## Implementation pointers

- Spec: [`docs/features/pragma/practice-free-slots/spec/spec.md`](../features/pragma/practice-free-slots/spec/spec.md), the row "ICS parsing"
- Plan: `docs/features/pragma/practice-free-slots/plan/plan.md`
- Commit: stamped by `/after-task-dantotsus` on merge
- Files: `apps/pragma/api/src/calendar-feeds/ics.core.ts`, `apps/pragma/package.json`
- Related ADRs: ADR-0024
