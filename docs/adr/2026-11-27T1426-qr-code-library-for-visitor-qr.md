# ADR-2026-11-27T1426: Draw the visitor QR code with qrcode.react

- **Status:** proposed
- **Date:** 2026-11-27
- **Deciders:** hugoleborso
- **Tags:** visitor-qr-code, pragma, front-end

## Context

Band members show a QR code on their phone during a concert, so the audience scans it and lands on the public sign-up page at pragma.borso.fr. The operator asked for a "QR code visiteur" button on the members' home and on each concert. Pragma has no QR encoder today (measured: `grep -ri qr apps/pragma/package.json` finds nothing). Encoding a QR code means Reed-Solomon error correction, mask selection and version sizing, which nobody should keep by hand. The code must render in the installed app with no network, since a bar's signal is unreliable. It touches only `apps/pragma/site`.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A member opens a scannable code in one tap, even offline | The sheet renders the code with the network off, and a decoder reads the origin back |
| Encoding stays correct without us | author | high | A wrong mask or version gives a code phones refuse to read | Which package owns the encoder |
| Fits the React and no-`dangerouslySetInnerHTML` style | author | medium | `docs/standards/` render React elements, not HTML strings | How the code reaches the DOM |

## Decision

**`qrcode.react` 4.2.0, through its `QRCodeSVG` component.** It returns React SVG elements, so the code is drawn inline with no canvas, no HTML string and no request. It has no runtime dependency and supports React 16 to 19 (measured: `npm view qrcode.react@4.2.0 dependencies peerDependencies`).

## Consequences

- `+` The code draws offline, crisp at any size, from the page's own origin, so a preview encodes its own address.
- `+` The encoder and its error correction live upstream.
- `-` One new dependency. Its last release is 4.2.0 of 11 December 2024 (measured: `npm view qrcode.react time`), so a bug found upstream may wait.
- `-` The SVG carries no logo or styling beyond colours, so a branded code would need another library.
- `~` About 115 kB unpacked on disk (measured: `dist.unpackedSize`). Only the sheet that shows the code imports it.

## Alternatives considered

### Option A — qrcode.react (chosen)

- **Raised by:** author
- **Summary:** A React component that encodes the value and renders `<svg>` paths.
- **Strengths:**
  - React elements, offline, no dependency of its own.
- **Costs:**
  - One package, quiet upstream since December 2024.
- **Rationale:** It wins on all three criteria.

### Option B — qrcode (rejected)

- **Raised by:** author
- **Summary:** The `qrcode` package returns an SVG string or a PNG data URL.
- **Strengths:** Widely used, and it also serves Node.
- **Costs:** The string needs `dangerouslySetInnerHTML`, or an `<img>` from a data URL built in an effect or a promise.
- **Rejection rationale:** It loses on the React style criterion. Its promise-based API would also need a query or a state to render.

### Option C — Hand-written encoder (rejected)

- **Raised by:** author
- **Summary:** Implement QR version, mask and Reed-Solomon in a `.core.ts`.
- **Strengths:** No dependency.
- **Costs:** Several hundred lines of encoding logic to test and keep.
- **Rejection rationale:** It loses on "encoding stays correct without us".

### Option D — Third-party QR image API (rejected)

- **Raised by:** author
- **Summary:** Point an `<img>` at a public service that draws the code from a URL parameter.
- **Strengths:** No code and no dependency.
- **Costs:** It needs the network and a vendor that may vanish.
- **Rejection rationale:** It loses on the offline criterion, which is the one that matters in a bar.

## Scores

|             | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| Does it change the app for its users | ✓ offline, one tap | ✓ offline, one tap | ✓ offline, one tap | ✗ fails without signal |
| Encoding stays correct without us | ✓ upstream | ✓ upstream | ✗ kept by hand | ✓ vendor |
| Fits the React style | ✓ React elements | ✗ HTML string or data URL | ✓ our own elements | ✓ plain img |

## Implementation pointers

- Spec: docs/features/pragma/visitor-qr-code/spec/spec.md
- Plan: none, Tier 1 after the spec.
- Commit: stamped by /after-task-kaizen on merge.
- Files: the visitor QR sheet under `apps/pragma/site/src/components/`.
- Related ADRs: none.
