# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [09:54] `coordinator` the pragma dev fixture seeds only 6 songs and one setlist, too thin for a layout or scroll audit, and vite.config.ts hardcodes ports 5174 and 3001 so parallel instances need a wrapper
- [09:57] `bench-musician` Vendor screenshots for a benchmark carry no reuse licence, so the task's 'download screenshots' step could not be done and only links were possible
- [09:59] `bench-productivity` Apple HIG and m3.material.io pages render client-side, so WebFetch returns only the title; HIG text is only reachable through the developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json endpoint, and M3 pages had no fallback.
- [09:59] `bench-productivity` Every pragma component named *Sheet (RecordingSheet, SetlistEntrySheet, InstallWalkthroughSheet) renders as a centred dialog, so the name promises a bottom sheet the code does not draw.
- [10:12] `coordinator` CDP Emulation.setEmulatedMedia with display-mode standalone has no effect on Chromium 153, so standalone PWA mode can only be faked by shimming matchMedia
- [10:12] `coordinator` signing in through /api/auth/login alone still redirects every pragma page to /login because the site also requires a localStorage marker, with nothing saying so
- [10:15] `audit-structure` rtk truncates grep and cat output of source files with a '+N more' marker, so reading a component needs sed -n or nl to see the whole file
- [10:21] `audit-structure` scripts/argent.sh with no arguments starts a browser and tool-server on the default ports instead of printing usage, so asking it for help launched processes on 9222 and 4310
- [10:30] `audit-structure` the workflow asked for findings.md in the agent folder but the Write tool refuses report .md files from subagents, so the findings could only be returned as text
- [10:31] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [10:31] `audit-pwa-touch` pragma-instance.sh reseed keeps the setlist entry order changed by earlier drags, so a reorder test is not repeatable after a reseed
- [10:31] `audit-pwa-touch` Playwright setOffline leaves navigator.onLine true after a reload, so the offline banner cannot be checked across navigations
- [10:31] `audit-pwa-touch` the pragma service worker does not register in dev, so offline checks need a production build served separately, which the runbook does not cover
- [10:43] `audit-design-system` Six pragma voting components use a bg-surface/text-surface class whose token does not exist in tokens.css, and no gate catches a Tailwind class naming an undefined theme token
- [10:43] `audit-design-system` No tool in the repo inventories computed styles per screen, so a design-system audit has to write its own Playwright collector
- [10:59] `skeptic` The skeptic started while the three findings.md files it must refute did not exist yet, so it had to poll for them.
- [11:15] `skeptic` The three auditors left raw logs but no findings.md, so the skeptic had to rebuild candidate findings from JSON before it could verify anything.
- [11:17] `solution-designer` audit-design-system/DESIGN.md, a named input of the solution-designer step, was never written, so the design-system proposals rest on the raw inventory and the skeptic's D-system row
- [11:37] `coordinator-deck` The deck brief named audit-design-system/DESIGN.md and three auditor findings files that were never written, so design system counts had to come from raw inventories
- [11:37] `coordinator-deck` No auditor recorded end-to-end tap counts per top task, so the findability slides show depths and positions instead of the tap counts the brief asked for
- [11:37] `main` workflow subagents were refused Write on report .md files in the scratchpad, so three audit findings files existed only in transcripts and the skeptic and deck worked without them
- [07:43] `task-metrics` argent gesture-tap on Chromium dispatches CDP mouse events (mousePressed/mouseReleased), not touch events, so a 'real tap' there has pointerType mouse and no touchstart
- [07:43] `task-metrics` argent caches the page viewport at connect time, so an Emulation.setDeviceMetricsOverride made afterwards makes every gesture-tap land at the old scale until describe or open-url refreshes it
- [07:45] `skeptic-2` audit-structure-14 claimed Escape leaves the song picker open, but the native dialog closes on Escape; auditor claims about keyboard and dialog dismissal were not tested the way they were stated
- [07:50] `design-system` audit-design-system/findings.md exists on disk but opens with a paragraph saying the harness blocked it and it was not written, so a reader cannot tell whether the file is the final version
- [07:59] `task-metrics` argent keyboard --text fails with 'No CDP key descriptor' on accented characters such as î, so French text cannot be typed through it
- [08:28] `solution-designer-2` The runbook gives no site port to a designer who only needs the code and the earlier screenshots, so it is unclear whether starting an instance is required.
- [00:35] `ds-studio` lucide-react 1.52 ESM icon files are not uniform (aliases such as trash-2 hold no node data), so extracting static SVG paths by regex fails; there is no lucide-static in the tree to read instead.
- [00:51] `ds-notebook` the shared agent-browser default session was at drive 64 when this agent started, so renders had to move to a named session to avoid the known wedge
- [00:51] `ds-notebook` lucide-react 1.x ships trash-2.mjs as a re-export of trash.mjs, so a generator that parses __iconData from each icon file fails on aliases
- [00:55] `ds-critic` the contrast check for translucent fill tokens had to be rewritten from scratch because each direction shipped its own contrast script and none composites alpha fills over the surface they sit on
- [01:03] `deck-3` The published Slides artifact is private on claude.ai, so scripts/browser.sh cannot open it without a session; slides were checked with a local approximation of the slide subset instead
- [01:11] `archivist` check-doc-links.ts reads only git-tracked markdown and takes no path argument, so a no-commit task cannot run it on a new subset without a scratch wrapper
- [01:11] `archivist` audit helper scripts hard-coded /home/user/borso.fr and the scratchpad path, so archiving them needed hand edits to make them runnable from docs/
