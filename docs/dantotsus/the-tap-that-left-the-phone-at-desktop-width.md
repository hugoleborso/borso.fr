---
date: 2026-11-14
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#327'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/phone.sh]
time-to-detect: minutes
tags: [visual-validation, agent-browser, touch, tooling, agents]
zone: scripts/phone.sh
recurs: none (the-touch-probe-that-left-with-the-page lost the record of a tap; here the tap was recorded and the session lost its viewport)
---

# The tap that left the phone at desktop width

## User impact

Two visual validators of PR #327 measured widths on the phone session after a
tap. Both logged the same friction: `innerWidth` read 1280 while the
screenshots still came out 375 px wide. Every width taken after a
`scripts/phone.sh touch` was a desktop width labelled as a phone one, until
the agent noticed and re-ran `set viewport`.

| | Seen | Expected |
| --- | --- | --- |
| `eval 'window.innerWidth'` after `scripts/phone.sh touch '#b'` | `1280` | `375` |
| `screenshot` after the same tap | 375 x 812 | 375 x 812 |

Reproduced on 2026-11-14 with a one-button page: `start` then `eval` gave
`375`, `touch` passed (`isRealTouch: true`), and the next `eval` gave `1280`
while the PNG header read `(375, 812)` (measured).

## Causal chain

- A width read after a tap is the desktop width.
  - The page lays out at the 1280 px browser window again.
    - The phone metrics that `touch-tap.ts` set with
      `Emulation.setDeviceMetricsOverride` lived on its own CDP connection,
      and Chromium drops them when that connection closes at the end of the
      script. That also drops the 375 px override agent-browser had set,
      because both overrides act on the same page (inferred from the
      measured width, which is 375 before the script closes and 1280 after).
      - `phone.sh touch` returned without putting the viewport back.
- The screenshot still read 375 because agent-browser crops to the viewport
  it believes it set, so the two witnesses disagreed.

## Root cause of occurrence

*Thought the tap script's emulation was a private layer over the session's,
actually the page keeps one set of device metrics and closing the tap's
connection clears it for everyone.*

Measured: after the tap, `agent-browser --session phone set viewport 375 812`
brought `innerWidth` back to `375`.

## Detection failure causes

- `touch-tap.ts` reads the page's width before it closes the connection, so
  its own report said 375 (measured, in its `page` field).
- Nothing read the width after the script had exited, which is the moment the
  next command sees.

## Countermeasure

The validators re-ran `set viewport` by hand after each tap and logged the
friction.

## Eradication

**Level 1, structural impossibility.**

`scripts/phone.sh touch` now runs `restore_viewport` on exit, whether the tap
passed or failed. It re-applies the phone viewport through agent-browser,
reads `innerWidth`, and exits 1 if the page is not 375 px wide. No caller can
see the session wider after a touch than before it.

```diff
+restore_viewport() {
+  local status=$? width
+  agent-browser --session "$SESSION" set viewport "$PHONE_WIDTH" "$PHONE_HEIGHT" >/dev/null
+  width="$(agent-browser --session "$SESSION" eval 'window.innerWidth' 2>/dev/null | tr -dc '0-9')"
+  if [ "$width" != "$PHONE_WIDTH" ]; then
+    printf '[phone] after the tap the page is %s px wide, not %s; measurements would be wrong\n' ...
+    exit 1
+  fi
+  exit "$status"
+}
...
+    trap restore_viewport EXIT
     pnpm exec tsx scripts/browser/touch-tap.ts --selector "$2" --port "$port" \
```

After the change, measured on the same page:

- `touch '#b'` exits 0 and `innerWidth` reads 375.
- `touch '#nope'` exits 1 and `innerWidth` still reads 375.

**The check can fail.** On a scratch copy with the `set viewport` line
removed, `touch '#b'` refused with exit 1:

```
[phone] after the tap the page is 1280 px wide, not 375; measurements would be wrong
```

**Sibling defects swept.**
`grep -rn setDeviceMetricsOverride scripts apps .claude` finds the other
callers in `apps/pragma/scripts/task-metrics/*.setup.ts`. Each drives a
browser it launched itself and is not shared with an agent-browser session,
so none hands a dropped override to a later command.

**Related.**

- [`docs/knowledge/real-touch-gestures-over-cdp.md`](../knowledge/real-touch-gestures-over-cdp.md)
- [`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md)
- [the-touch-probe-that-left-with-the-page](./the-touch-probe-that-left-with-the-page.md)
