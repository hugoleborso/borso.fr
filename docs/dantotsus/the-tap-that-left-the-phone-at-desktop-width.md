---
date: 2026-11-14
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#327'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/phone.sh]
time-to-detect: minutes
tags: [visual-validation, agent-browser, touch, tooling, agents]
zone: scripts/browser/cdp-session.ts
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
    - `touch-tap.ts` closed its CDP connection at the end of the script, and
      Chromium dropped the device metrics that connection had set. The drop
      also took the 375 px override agent-browser had set, because the page
      keeps one set of metrics (inferred from the measured width, 375 before
      the script closes and 1280 after).
      - `touch-tap.ts` had set its own phone metrics through `emulatePhone`,
        now in `scripts/browser/cdp-session.ts`, the faulty line:

        ```ts
        await send('Emulation.setDeviceMetricsOverride', {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: PHONE_SCALE_FACTOR,
          mobile: true,
        });
        ```

        - Commit `a83f0a600` (#200) wrote that call for `scripts/argent.sh`,
          whose Chromium ran in a 500 px window, so the script had to make
          the phone viewport itself.
          - Commit `c54e32da7` (#224) deleted argent and ran `touch-tap.ts`
            inside the agent-browser session, which `phone.sh start` already
            sizes to 375 px. It kept the script's own override.
            - The same commit rewrote
              `docs/knowledge/real-touch-gestures-over-cdp.md`, which said
              "after the client disconnected, `navigator.maxTouchPoints` was
              back to 0 ... while the 375 px viewport stayed". A second
              override looked harmless (Material).
- The screenshot still read 375 because agent-browser crops to the viewport
  it believes it set, so the two witnesses disagreed.

## Root cause of occurrence

*Thought the tap script's device metrics were a private layer that outlived
its connection harmlessly, as the knowledge entry measured, actually the page
keeps one set of device metrics and closing the connection that set the last
override clears it for every client.* (Material)

The agent that wrote `c54e32da7` had the knowledge entry in its context, since
the commit edits it. The entry held the wrong fact, measured on argent's
separate Chromium on 2026-10-25, so the right answer was absent from the
writer's input.

Measured: after the tap, `agent-browser --session phone set viewport 375 812`
brought `innerWidth` back to `375`.

## Detection failure causes

- **Local:** `touch-tap.ts` reads the page's width before it closes the
  connection, so its own report said 375 (measured, in its `page` field). It
  reads at the one moment the override still holds.
- **Local:** the knowledge entry's claim was measured on argent, where the
  browser was not shared with a later client, so nothing re-measured it when
  the script moved into a shared session.

## Countermeasure

The validators re-ran `set viewport` by hand after each tap and logged the
friction.

## Eradication

**Type:** detection (level 4)

**Reference:** the commit adding this file, `731066132`.

`scripts/phone.sh touch` runs `restore_viewport` on exit, whether the tap
passed or failed. It re-applies the phone viewport through agent-browser,
reads `innerWidth`, and exits 1 if the page is not 375 px wide. It repairs the
session and checks the repair. It does not stop a driver from clearing the
metrics. Commit `ae67892f9` (#379) had to add the same trap to `drag` and
`swipe`, which shows the cause is still there for each new subcommand.

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

**Proof it can fail:** on a scratch copy with the `set viewport` line removed,
`touch '#b'` refused with exit 1:

```
[phone] after the tap the page is 1280 px wide, not 375; measurements would be wrong
```

**Proposed:** remove the second owner of the viewport. Drop
`Emulation.setDeviceMetricsOverride` from `emulatePhone` in
`scripts/browser/cdp-session.ts`, keep only `setTouchEmulationEnabled`, and
let `phone.sh start`'s `set viewport` be the one source of the phone size.
No driver could then clear the session's metrics, and both
`trap restore_viewport` lines in `scripts/phone.sh` could go. Whether
agent-browser's viewport alone gives `mobile: true` layout is unknown and
must be measured first. The knowledge entry's "the 375 px viewport stayed"
also needs correcting, since it teaches the belief this entry disproves.

**Similar instances:** `grep -rn setDeviceMetricsOverride scripts apps .claude`
finds `scripts/browser/cdp-session.ts`, used by `touch-tap.ts` and
`touch-drag.ts`, and the callers in `apps/pragma/scripts/task-metrics/*.setup.ts`.
Each of the pragma ones drives a browser it launched itself, not shared with
an agent-browser session, so none hands a dropped override to a later
command.

**Related.**

- [`docs/knowledge/real-touch-gestures-over-cdp.md`](../knowledge/real-touch-gestures-over-cdp.md)
- [`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md)
- [the-touch-probe-that-left-with-the-page](./the-touch-probe-that-left-with-the-page.md)
