# ADR-0016: `qrcode.react` renders the audience-vote QR code

- **Status:** deprecated
- **Date:** 2026-08-26
- **Deciders:** Hugo Borsoni
- **Tags:** audience-song-voting, pragma, frontend, dependency

## Context

Audience song voting reaches the room two ways: a short address the band announces at the microphone, and a QR code the band shows on stage. The QR code is generated in the band's own screen, inside the setlist editor, from the concert's public vote URL. Nothing in the repository encodes QR symbols today, so this needs either a dependency or an implementation, and CLAUDE.md makes a new third-party dependency an ADR trigger.

Two constraints narrow the field before the trade-off. The site's components follow atomic design and are React function components styled with Tailwind classes inline, so a rendered `<svg>` fits the tree and a canvas or a custom element does not. And the code is shown on a phone or a projector in a dark room, so it must scale without resampling, which an SVG does and a fixed-size raster does not.

## Decision

**Add `qrcode.react` and render the SVG variant.** It is the only candidate that ships zero runtime dependencies, renders an SVG React element directly, and declares a peer range covering the React 19 this workspace pins. The alternatives either drag a command-line argument parser into the browser bundle or ask the atomic-design tree to host a custom element.

## Consequences

- `+` One direct dependency and no transitive ones, so the audit surface added is exactly one package.
- `+` The output is an `<svg>` element in the React tree, so it inherits the surrounding Tailwind classes and scales to a projector without resampling.
- `-` One more package to keep current, and the QR code stops working if the package breaks against a future React major.
- `-` The band's screen now fails to build if the peer range and the workspace's React drift apart, which the `catalog:` pin makes visible but does not prevent.
- `~` The component is an atom under `apps/pragma/site/src/components/atoms/`, so the dependency is reachable from exactly one file and a later swap touches only that file.

## Alternatives considered

### Option A — `qrcode.react` (chosen)

- **Summary:** A React component that renders a QR symbol as an `<svg>` or a `<canvas>`. Version 4.2.0, ISC licence, 114,980 bytes unpacked, no runtime dependencies, peer `react` covering `^19.0.0`.
- **Strengths:**
  - Zero transitive dependencies, so the supply-chain surface is one package.
  - Renders an SVG React element, which the atomic-design tree and the inline Tailwind convention both accept unchanged.
  - Its peer range already covers the React 19 pinned in the workspace catalog.
- **Costs:**
  - 114,980 bytes unpacked, on a page the band opens and the audience never does.
  - A React peer dependency, so a React major bump is now gated on this package following.
- **Rationale:** It wins on every criterion that was weighted, and its only real cost falls on the band's screen rather than the public page the room loads.

### Option B — `qrcode` (rejected)

- **Summary:** The general-purpose encoder, usable from Node and the browser, producing a data URI or an SVG string. Version 1.5.4, MIT licence, 135,364 bytes unpacked.
- **Strengths:**
  - Framework-agnostic, so it would also serve a future server-side rendering of the code.
  - Slightly better known than the React wrapper.
- **Costs:**
  - Three runtime dependencies: `pngjs`, `dijkstrajs` and `yargs`. `yargs` is a command-line argument parser, which has no business in a browser bundle.
  - Produces a string, so the component still has to inject it, which the repository's rules make awkward.
- **Rejection rationale:** It loses on supply-chain surface, the criterion weighted highest, and it loses on it for a reason that is hard to defend to a reviewer: a CLI argument parser reaching a phone in a bar.

### Option C — write the encoder in a covered `.utils.ts` (rejected)

- **Summary:** Implement QR encoding ourselves. It is pure and deterministic, so it lands in a `*.utils.ts` and ships at 100% coverage like every other pure module here.
- **Strengths:**
  - No dependency at all, and no peer range to track across React majors.
  - Fits the repository's purity rules perfectly.
- **Costs:**
  - Reed-Solomon error correction, mask-pattern selection and version sizing are a real body of algorithm to write, cover and debug.
  - Every hour spent on it is an hour not spent on the feature, against CLAUDE.md's north star that the operator's time goes to design conversations.
- **Rejection rationale:** It loses on cost of the change by a wide margin, for a component that renders one square on one screen. It would only win if the dependency budget were closed, and it is not.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Supply-chain surface added | high | A one-person lab audits what it installs. Transitive dependencies are the part nobody reads. |
| Fit with the repository's front-end rules | high | Atomic design, function components and inline Tailwind. A custom element or a canvas is a foreign body in that tree. |
| Cost of the change | medium | The north star reserves the operator's hours for design, not for re-implementing solved problems. |
| Output scales on a projector | medium | The code is shown across a room, so a vector output is worth more than a raster one. |

|  | A — `qrcode.react` | B — `qrcode` | C — own encoder |
|---|---|---|---|
| Supply-chain surface | ✓ zero runtime dependencies | ✗ pulls `pngjs`, `dijkstrajs`, `yargs` | ✓ none |
| Front-end fit | ✓ renders an `<svg>` React element | ✗ returns a string the component must inject | ✓ a pure module plus a small atom |
| Cost of the change | ✓ one atom wrapping one component | ✓ one atom plus the injection | ✗ Reed-Solomon, masking and version sizing to write and cover |
| Scales on a projector | ✓ SVG | ✓ SVG output available | ✓ SVG |

## Implementation pointers

- Spec: [`docs/features/pragma/audience-song-voting/spec/spec.md`](../features/pragma/audience-song-voting/spec/spec.md)
- Plan: `docs/features/pragma/audience-song-voting/plan/plan.md` (row "QR code atom")
- Commit: pending
- Files: `apps/pragma/site/src/components/atoms/VoteQrCode.tsx` (new), `apps/pragma/package.json`, `pnpm-workspace.yaml` (catalog entry)
- Related ADRs: [ADR-0015](./0015-musicbrainz-stays-the-song-search-source.md)

## Sources

- Package metadata read from the npm registry on 2026-08-26: `qrcode.react@4.2.0`, `qrcode@1.5.4`, `@bitjson/qr-code@1.0.2`.

## Revisions

### Revision 2026-08-27 — the QR code is gone, so the dependency is too

What changed: the feature this record chose a library for no longer exists. The
band's panel shows the short address alone, and `qrcode.react` is out of the
catalog, out of `apps/pragma/package.json`, and its atom is deleted.

Why: the operator asked what the QR code was for, given that the audience can
simply open `pragma.borso.fr/vote`. The QR encoded the long per-concert URL
rather than that address, so it was not even a shortcut to the thing people
should reach. Pointing it at the short address would have worked, and was
rejected on the same reasoning: twenty-two characters that never change from one
concert to the next, said at a microphone, do not need a dependency and a screen
to display them.

This record stays because the comparison it holds is still the right one to read
the day a QR code is genuinely wanted somewhere in this repository. Nothing in
its rubric was wrong; the feature under it was.

Implication for the original decision: withdrawn, not overturned.
