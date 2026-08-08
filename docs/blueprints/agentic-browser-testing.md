# Blueprint: agentic browser testing

An agentic browser check drives a running application through a real browser
and reports whether what a user sees matches what the specification says. It
covers the things a unit test cannot see, which are layout at a given viewport,
the effect of a real tap, and whether a page renders at all.

The tool is [`agent-browser`](https://www.npmjs.com/package/agent-browser), a
browser automation command line interface built for agents, and it is a
development dependency at the repository root so every workspace can call it.

## Why an agent drives it rather than a script

A recorded script asserts on selectors, and it breaks when a class name
changes, so people delete the script. An agent reads the specification, opens
the page, and decides whether the page satisfies each assertion, so a class
name change does not break it and a layout regression does.

The agent runs with no conversation history, and it receives only the
specification text, the running URL, and the assertion list, so its verdict is
not shaped by what the implementer already believed.

## Running it

Start the application, and then hand the agent the URL:

```bash
pnpm --filter @borso-app/<app> run dev
pnpm exec agent-browser open http://localhost:5173
```

The [`/visual-validation`](../../.claude/skills/visual-validation/SKILL.md)
skill wraps the whole flow, and it dispatches the `visual-validator` agent,
which writes a verdict file under `docs/features/<app>/<slug>/validation/`
along with the screenshots it took.

## Phone viewports

Every screen is checked at 375 pixels wide and at 1280 pixels wide, and the 375
pixel pass also emulates a coarse pointer, so hover-only affordances show up as
failures.

The device profiles we use:

| Profile | Width | Height | Pixel ratio | Pointer |
|---------|-------|--------|-------------|---------|
| iPhone SE | 375 | 667 | 2 | coarse |
| iPhone 15 Pro | 393 | 852 | 3 | coarse |
| Pixel 8 | 412 | 915 | 2.6 | coarse |
| Desktop | 1280 | 800 | 1 | fine |

## Traps we have already hit

A click driven through the Chrome DevTools Protocol does not always trigger a
React `onClick` handler, and the workaround is in
[`docs/knowledge/agent-browser-cdp-click-no-op-on-react-onclick.md`](../knowledge/agent-browser-cdp-click-no-op-on-react-onclick.md).

Coarse pointer emulation needs an explicit flag, and setting the viewport alone
leaves the browser reporting a fine pointer, which hides exactly the bugs the
mobile pass is looking for. The details are in
[`docs/knowledge/agent-browser-coarse-pointer-emulation.md`](../knowledge/agent-browser-coarse-pointer-emulation.md).

The remaining command line quirks are collected in
[`docs/knowledge/agent-browser-cli-quirks.md`](../knowledge/agent-browser-cli-quirks.md).

## What a verdict looks like

The agent returns one of three verdicts. A pass means every assertion held. A
partial pass means every assertion that could be checked held, and it names the
ones the browser could not reach. A failure names the assertion that broke and
attaches the screenshot showing it.

A partial pass is not a pass, so treat an unreachable assertion as work
remaining and not as a rounding error.
