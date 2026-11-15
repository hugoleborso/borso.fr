# ADR-2026-11-15T0620: every site sends its User-Agent to Sentry, and installed apps tag their display mode

- **Status:** accepted
- **Date:** 2026-11-15
- **Deciders:** operator
- **Tags:** observability, sentry, mobile

## Context

ADR-2026-10-10T0457 switched every Sentry header collection off, and
ADR-2026-11-11T1903 carried that block to all six sites. Since then no error or
trace names a browser or an OS. Every prod error in the last 90 days has an
empty `browser` field (measured, Sentry Discover). Four iPhone-only screen bugs
shipped in one day (#331 to #337). Their cause, the keyboard resizing only the
visual viewport, is fixed by `interactive-widget=resizes-content`. Safari
honours that only from 27.3 (MDN browser-compat-data 8.1.9). Nobody can tell
which Safari the band runs, so nobody can tell whether pragma's JavaScript
emulation is still needed.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | low | Nothing visible changes | The app renders the same |
| A screen bug can be tied to a device | operator | high | iOS-only bugs are invisible in the sandbox | `browser.version` and `os` filled on prod events |
| Personal data stays off | author | high | Visitors are EU residents | Only the User-Agent header leaves the browser, cookies and bodies stay off |

## Decision

**Allow the User-Agent header only.** Each site's `dataCollection` sets
`httpHeaders: { allow: ['User-Agent'] }`. Sentry parses it into browser, OS
and device. pragma, talos and banana-rush, the three apps a phone installs,
also tag `display.mode` as `standalone` or `browser`, because iOS treats an
installed app and a Safari tab differently (#131 hit only the installed app).

## Consequences

- `+` Every event names the browser and its version, so a Safari below 27.3 is
  visible in Sentry.
- `+` An iOS bug can be split by installed app against Safari tab.
- `-` From Safari 26, the OS version in the User-Agent is frozen at 18.x. Read
  `browser.version`, not `os.version`, for an iPhone.
- `~` The Referer header is collected as `[Filtered]`, because the allow-list
  keeps only the User-Agent value.

## Alternatives considered

### Option A — allow the User-Agent only (chosen)

- **Raised by:** operator
- **Summary:** one header, parsed by Sentry.
- **Strengths:** no parsing code, every app the same.
- **Costs:** the frozen iOS version above.
- **Rationale:** the smallest change that names the device.

### Option B — tag a parsed Safari version by hand (rejected)

- **Raised by:** author
- **Summary:** parse `Version/` in each app and set a tag.
- **Strengths:** a field named for the question.
- **Costs:** a parser per app, which Sentry already runs on its side.
- **Rejection rationale:** duplicates what `browser.version` already holds.

### Option C — all headers (rejected)

- **Raised by:** author
- **Summary:** `httpHeaders: true`.
- **Strengths:** no list to keep.
- **Costs:** sends the Referer, which can carry a path with ids.
- **Rejection rationale:** loses on the personal data criterion.

## Scores

|             | Option A | Option B | Option C |
|---|---|---|---|
| A screen bug can be tied to a device | ✓ browser, OS, device | ✓ Safari version only | ✓ |
| Personal data stays off | ✓ one header | ✓ | ✗ Referer |

## Implementation pointers

- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/*/site/src/observability/error-reporting.adapter.ts`, `apps/last-loop-lepin/site/src/observability/sentry.ts`
- Related ADRs: builds on ADR-2026-10-10T0457 and ADR-2026-11-11T1903
