# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [20:32] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [20:40] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [20:41] `technical-conception-01` check-instructions-name-installed-tools failed once in pre-commit on an existing workspace (@borso-app/last-loop-lepin) that its own printed list contained, and passed when run by hand right after
- [21:06] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [21:08] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [23:21] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [23:26] `technical-validation-01` the four implementation rounds left their commits on worktree branches and the main checkout HEAD still had only the plan, so validation of 'current HEAD' had no code to review until a fast-forward
- [23:37] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [23:52] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [23:59] `technical-validation-02` the fix round landed on worktree-wf_035cd72e-a86-7 (1412fe64) but the main checkout stayed at d4a31ea9, and a fast-forward from the validator is refused by the auto-mode classifier
- [00:10] `visual-validation-02` the visual-validation skill requires dispatching the visual-validator agent through an Agent tool that a workflow subagent does not have, so the subagent must validate in its own context
- [00:13] `visual-validation-02` scripts/browser.sh overwrites AGENT_BROWSER_ARGS unconditionally and agent-browser lets that env win over --args, so the spec's fake-media-device Chromium flags cannot be passed through the wrapper
- [00:14] `visual-validation-02` agent-browser relaunches Chromium when a later call carries a different AGENT_BROWSER_ARGS, so one scripts/browser.sh call after a custom-args launch silently drops the custom flags
- [00:26] `visual-validation-02` agent-browser has no command to grant a permission, and a raw CDP Browser.grantPermissions is dropped the moment its websocket closes, so granting notifications needs a background CDP client held open for the whole run
- [00:28] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [00:29] `visual-validation-02` scripts/argent.sh looks for /opt/pw-browsers/chromium-*/chrome-linux/chrome but this image ships chrome-linux64, so argent refuses to start and no real touch can be sent
- [00:48] `technical-validation-03` the technical-validation skill says to dispatch the technical-validator agent but a workflow subagent has no Agent tool, so the validator brief had to be run inline
- [01:01] `technical-validation-03` the fix rounds landed on two diverged worktree branches and the main checkout held neither, so the validator had to integrate them by fast-forward plus cherry-pick before it had anything to validate
- [01:02] `visual-validation-03` the visual-validation skill says to dispatch the visual-validator agent, but a workflow subagent has no Agent tool, so the standalone rule cannot be applied as written (second round in a row)
- [01:02] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [01:22] `visual-validation-03` scripts/argent.sh still looks for chrome-linux/chrome while the image ships chrome-linux64/chrome, so no touch pass is possible through it (second validation round hitting this)
- [01:32] `open-pr-01` standards-review skill requires dispatching the standards-reviewer agent, but a pipeline subagent has no Agent tool, so the review had to be done inline
- [01:49] `hook:pr-body` wrote a pull-request body carrying markup the server silently strips
- [01:50] `open-pr-01` previews screenshot upload in /open-pr step 5b failed with an explicit AccessDenied on s3:PutObject for AI-Dev-ReadOnly, so the aws-setup 12.6 grant is still not applied
- [02:07] `install-banner` scripts/browser.sh --user-agent on the command line was silently ignored (navigator.userAgent stayed HeadlessChrome) while AGENT_BROWSER_USER_AGENT in the environment worked
- [02:10] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [02:13] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [02:17] `visual-validation-banner` scripts/browser.sh --restart --session <name> runs 'agent-browser close' without the session flag, so it closes the shared default session another agent may be driving instead of the named one
- [02:17] `visual-validation-banner` AGENT_BROWSER_USER_AGENT must be exported on every scripts/browser.sh call, not just the launch: a later call without it relaunches the browser to about:blank and drops the page and the signed-in session
- [02:21] `tech-validation-banner` The spec amendment for the install banner added Result, edge-case, Q.O.D. and test-strategy text but no Changes/Files-to-change entries and no plan section, so category A had no file list to walk.
- [02:21] `tech-validation-banner` pragma's coverage report prints only a total with an empty per-file table, so confirming a specific new *.utils.ts is at 100% means trusting the perFile threshold exit code rather than seeing the file's row.
- [02:23] `standards-reviewer` apps/pragma/VOCABULARY.md has no Held by: line anywhere, so every new term a branch adds inherits the gap and the reviewer bullet fires on the whole file each time
- [02:23] `standards-reviewer` docs/standards/11-database.md says no application has a cross-slice cascade, but pragma's songs, sessions and members repositories each call other slices' services inside their own transaction, so the standard and the tree disagree on the shape
- [02:23] `standards-reviewer` an earlier inline review sealed 68 files of this branch, several carrying findings an isolated read turns up in minutes (impure recorder.core, restated API rules in site cores), so the inline seal attests less than it says
- [02:23] `visual-validation-banner` agent-browser 0.35.2 --help lists an 'addinitscript' command that the CLI then rejects as 'Unknown command'
- [02:27] `visual-validation-banner` Chromium silently ignores display-mode in CDP Emulation.setEmulatedMedia and agent-browser has no display-mode setting, so the spec's display-mode: standalone check has no real-browser emulation and needs a matchMedia shim
- [02:43] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [04:02] `standards-fix` the standards review told me to move beginRecording into an adapter, and borso/pure-functions-live-in-core-files then refused it there because a function that only touches injected arguments reads as pure, so the reviewer and the lint rule disagree about where injected orchestration belongs
- [04:02] `standards-fix` a git commit runs past the default 120 s Bash timeout because of the pre-commit wave, and the no-swallowed-push guard refuses piping its output, so every commit needed a message file and an explicit long timeout
- [04:02] `standards-fix` no standard or blueprint says how to serialise writes to rows that share a parent on Aurora DSQL without a schema change; I used a no-op UPDATE of the parent row as the conflict point, which is unverified against a real DSQL cluster from here
- [04:02] `standards-fix` the route-detail-page blueprint itself (SessionDetailPage) owned layout primitives the standard forbids in a route, so the canonical example was the defect the review reported
- [07:34] `deezer-unique` the first concurrent-suggestion back-e2e passed on the old code because two in-process Promise.all requests did not overlap their read and insert until the Deezer fetch stub held both track reads at a barrier
- [07:53] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [08:37] `pr-body` check-pr-body allows exactly one before-merge block and one command block, so a two-step operator list with an SSM step and a SQL step must be folded into one shell fence holding a SQL query
- [08:41] `standards-reviewer-2` the standards-reviewer agent prompt says a seal covers only .ts/.tsx under apps/ or infra/, but seal.core.ts also treats VOCABULARY.md as reviewable, so verify lists a file the prompt says is out of scope
- [08:41] `standards-reviewer-2` standard 02 names helpers/calendar/paris-clock.utils.ts as the shape for a cross-cutting helper, while the helper-module blueprint and every pragma helpers/ file use .core.ts, so the core-vs-utils reviewer bullet has two contradicting references
- [08:41] `standards-reviewer-2` round 1 sealed takes.core.ts with orderCommentsByTime marked core-canonical-ordering, a blueprint about filtering a declared order, and nothing checks that a marker's claim matches the blueprint's shape
- [09:14] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [09:38] `standards-fix-2` Every pre-commit run here takes over two minutes, so a plain foreground git commit exceeds the Bash tool's default timeout and lands in the background with no clear signal of when it finished.
- [09:49] `standards-reviewer-3` Each fix round pulls a newly edited file into review whole, so round 3 found four pre-existing findings that rounds 1 and 2 never saw, including one round 2 missed in a file it had already reported on.
- [10:15] `standards-fix-3` the setlist rows live in a table named setlist_sheet, so a test holding the table by the slice's name locked nothing and the race helper timed out naming the waiter count rather than the wrong table
- [11:44] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [12:14] `final-fixes` the brief said app_config in tablesToReplace gives each preview its own VAPID pair, but tablesToReplace empties the preview row and then copies production's, so columns there would have leaked prod's pair
- [12:14] `final-fixes` the brief asked for Stryker on changed *.schema.ts, but pragma's stryker.config.js never mutates schema files and their Drizzle tables have no core test, so the gate cannot reach 0 survivors there
- [12:14] `final-fixes` local Postgres never raises a commit conflict, so no back-e2e could exercise a DSQL retry until a deferred trigger raising serialization_failure was written into test/database-utils.ts
- [12:52] `standards-reviewer-4` Round 4 still surfaced pre-existing derived-type and check-then-write findings in files rounds 1-3 had sealed (setlists.repository, setlist-entry.repository), because each round's reviewer applies the bullets to the whole file and earlier rounds passed over the same lines
- [13:09] `round-4-fixes` check-vocabulary-paths.sh's 'the comment (above|beside|on)' pattern has no word boundary, so a Held by test title containing 'the comment once' fails as 'sources a claim from a comment'
- [13:24] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [13:52] `standards-reviewer-5` Each review round reads VOCABULARY.md in full again and finds a few more pre-existing false sentences, because the file is never audited as a whole, so every edit to it reopens the seal and adds a round.
- [14:08] `round-5-fixes` pnpm run test -- <path> in apps/pragma runs all 29 back-e2e files (about nine minutes) because the forwarded -- swallows the filter, and the output is silent until the end
- [14:25] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [14:25] `main` pretool-no-discarding-reset refused 'git restore --staged <file>' run in another worktree, naming the main checkout's unrelated WIP as what would be discarded
- [14:34] `standards-reviewer-6` the verb-promises lint rule reads only the return annotation, so a find… function that throws instead of returning null (findWrittenTakeWithin) passed lint and two fix rounds and was only caught by reading the body
- [14:59] `technical-validator` pragma back-e2e takes 12 minutes and test:core 7 minutes when run side by side, so a final validation pass spends most of its time waiting on two suites
- [15:19] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [15:23] `visual-validator` scripts/argent.sh still looks for /opt/pw-browsers/chromium-*/chrome-linux/chrome while the image ships chrome-linux64, so every touch row of a visual validation goes UNVERIFIABLE (already noted in the 0102 run)
- [15:23] `visual-validator` scripts/browser.sh exports AGENT_BROWSER_ARGS unconditionally, so the spec-mandated --use-fake-device-for-media-stream flags can only be passed by repeating the whole list through --args on every call
- [15:23] `visual-validator` a browser.sh session wedged at drive ~360 (reload never returned) and, just before, recorded a cut take as a 0-byte queue entry that a fresh session did not reproduce; the drive-count warning fires every call past 30 so it no longer distinguishes
- [15:23] `visual-validator` Browser.grantPermissions for notifications is revoked when the CDP client disconnects, so a one-shot grant script reports success and Notification.permission stays default
- [15:23] `visual-validator` agent-browser fill on an input[type=datetime-local] leaves its value empty without an error; only clicking each spinbutton segment and pressing digits changes it
- [15:30] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [15:49] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [15:50] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [16:02] `final-validation-fixes` piping a Stryker run into head cut it short with no error, so a mutation gate looked finished while it had been killed mid-run
- [16:50] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [16:55] `visual-validator` argent 0.22.1 gesture-tap on a Chromium device sends Input.dispatchMouseEvent (pointerType mouse, no touchstart), while docs/knowledge/real-touch-gestures-over-cdp.md, driving-previews-with-agent-browser-and-argent.md and scripts/argent.sh all state it is a real touch event
- [16:55] `visual-validator` scripts/argent.sh launches Chromium with --window-size=375,812 but the page reports innerWidth 500 x innerHeight 669, so an argent 'phone' pass is not at phone width
- [16:55] `visual-validator` scripts/argent.sh has no way to pass Chromium flags such as the fake-microphone pair, so a recording row needs a hand-launched browser on 9222 for argent to reuse
- [16:55] `visual-validator` argent run screenshot ignores --out and writes under /tmp/argent-chromium-media, so evidence has to be copied by parsing the returned path
- [17:04] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [17:20] `copy-and-targets` no test rendered the takes.recording.empty message, so its wording could drift from the cases that show it with nothing failing
- [17:56] `visual-validator` Changing AGENT_BROWSER_USER_AGENT between scripts/browser.sh calls silently relaunches the browser, dropping the page, the session cookie and the CDP port with no message saying it restarted.
- [18:00] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [09:01] `operator` The operator wants agents free to READ the production DSQL database (never write): either the auto-mode classifier allows a read-only query, or a GitHub Action named 'DSQL prod read' takes the agent's query, proves no row can change (e.g. runs it inside BEGIN READ ONLY and refuses anything but SELECT), and returns the result. Today a hosted session cannot answer a one-line SELECT that gates a merge (PR #193, 2026-10-25), and the operator had no laptop to run it.
