# Visual-validation cut passages: restore or keep cut

Sweeps: #400 = c122c579, #406 = 214ec4bc, #410 = 458e886c. Current line numbers are the worktree after the restores. Abbreviations: agent = `.claude/agents/visual-validator.md`, SKILL/standard/template = `.claude/skills/visual-validation/*`.

Totals: 105 rows, 13 restored, 92 kept cut, plus 1 fix that is not a restore (template brief).

| sweep | file | passage (first ~12 words) | decision | evidence |
|---|---|---|---|---|
| #400 | agent | Pixel-content check inline `eval` of `img.complete && naturalWidth === 0` | keep cut | Replaced in the same hunk by `scripts/browser/broken-images.sh` (exists, also covers SVG `<image>`); agent:68 |
| #400 | agent | "(CDN 403, hotlink block, missing asset)... users see broken alt-text" | keep cut | Rationale only; agent:68 states the rule and its FAIL outcome "whatever the DOM says" |
| #400 | SKILL | Do not invoke when the dev server isn't running and no `dev` script | keep cut | Stale: step 2 starts the server with `scripts/dev-server.sh start <app>` |
| #400 | SKILL | This section used to prescribe `## Validation gaps` and `## Visual evidence` | keep cut | History; `docs/dantotsus/two-skills-asked-for-sections-the-checker-refuses.md` and `scripts/pr/check-pr-body.ts` hold it |
| #400 | SKILL | Falling back to Playwright when agent-browser is missing... surface the install command | keep cut | Contradicts agent:23 "Never run `agent-browser install`" and agent:52 "no fallback tool and no install" |
| #400 | SKILL | The brief template in `template.md` carries the canonical broken-image-scan `eval` | keep cut | Stale: template no longer carries it by design; agent:68 holds the scan |
| #400 | SKILL | Gitignoring the validation folder. The evidence is part of the report. Commit both | keep cut | "Commit both" contradicts ADR-2026-09-21T0819; the valid half (do not ignore the folder) is restored in standard (see #406 row) |
| #400 | SKILL | Workspaces live under `apps/<app>/`. Dev server: `pnpm --filter ... dev` | keep cut | CLAUDE.md Layout; `scripts/dev-server.sh` replaced the pnpm call |
| #400 | SKILL | Default dev port is 5173; check `vite.config.ts` to override | keep cut | `scripts/dev-server.sh start` prints the URL (script header line 4) |
| #400 | SKILL | Reports + evidence go in `docs/features/<app>/<slug>/validation/` | keep cut | SKILL:34-40 step 3 paths |
| #400 | SKILL | The validator only writes inside `evidence_dir` and `report_path` | keep cut | agent:86 "Write only `report_path` and `evidence_dir`" |
| #400 | SKILL | When the verdict is FAIL, the user is shown the failing rows verbatim | keep cut | SKILL:50-51 step 5 |
| #400 | standard | Why this matters (Jidoka): catch defects at the earliest place | keep cut | Exposition; changes no step. standard:10-15 keeps what the gate catches |
| #400 | standard | A visible defect that ships erodes trust faster than any other kind | keep cut | Exposition, no-op for behaviour |
| #400 | standard | agent-browser pitch: reference-based snapshots, stateful daemon, Playwright comparison | keep cut | Exposition; agent:21-39 holds the commands the agent uses |
| #400 | standard | Built-in emulation... `set device` leaves `pointer: coarse` false; tap via `scripts/phone.sh` | keep cut | agent:73 touch bullet holds it; `docs/knowledge/agentic-device-testing.md` too |
| #400 | standard | Storage measurement: 791 PNGs, 96.6 MB of 118 MB `.git`, 82% | keep cut | ADR-2026-09-21T0819 lines 17-18 hold the same measurement |
| #400 | standard | Pixel-content long section: rationale, canonical JS, "every screenshot, not just suspect ones" | keep cut | agent:68 "after every screenshot", script replaces the JS |
| #400 | standard | Sibling checks: `textContent` verbatim and `getBoundingClientRect()` placement | keep cut | agent:68 last sentence |
| #400 | template | PIXEL-CONTENT CHECK block in the dispatch brief | keep cut | Agent definition is loaded with `subagent_type: visual-validator`; agent:68 holds it (single source) |
| #406 | agent | `evidence_dir`... "The folder is committed alongside the report" | keep cut | Stale: `evidence_dir` is now gitignored `.pending-upload/` (.gitignore:90) |
| #406 | agent | "The report and the screenshots are committed together" | keep cut | Stale for the same reason; agent:115 states the citation split |
| #406 | SKILL | Step 8 bash block: `pending_dir`, `mv` each non-FAIL file, `rmdir` | keep cut | Mechanism replaced: the agent writes straight into `.pending-upload/`; SKILL step 7 moves only FAIL files |
| #406 | SKILL | `.pending-upload/` is gitignored, so a `git add` cannot commit it | keep cut | SKILL:41-42 and the .gitignore:86-89 comment |
| #406 | SKILL | Step 9: stage the report and surviving evidence for commit | keep cut | standard:59 "The report is always committed"; CLAUDE.md "stage explicit paths" |
| #406 | SKILL | Deliverable: two artefacts... everything else at `screenshots-pr-<n>`, expires 60 days | keep cut | standard:62-66 |
| #406 | SKILL | Do not gitignore either path. A FAIL report gets contested without its screenshot | keep cut | Merged into the restored standard line on `.gitignore`; standard:62-63 holds the FAIL reason |
| #406 | standard | "as before... that argument is the whole reason this section exists" | keep cut | Rewording; standard:62-63 keeps the rule and its reason |
| #406 | standard | A PASS screenshot is read once, by the reviewer; deliberately temporary | keep cut | Rationale held by ADR-2026-09-21T0819 |
| #406 | standard | `.gitignore` must not match `docs/features/**/validation/**`, FAIL set lands there | **restore** | True today (.gitignore:90 names only `.pending-upload/`), stated nowhere else, and a guardrail against widening the ignore. Restored at standard:68-69 |
| #406 | standard | The published URL is what the report cites, never a local path | keep cut | standard:65-66 and agent:115 |
| #406 | standard | Per-file URL never in the PR body; hook blocks images and image links; `index.html` gallery | keep cut | `scripts/hooks/checks/github-pr-body.core.ts:9` enforces it; open-pr SKILL:71 holds the gallery; SKILL:87-93 points there |
| #406 | standard | The upload runs in `/open-pr`, because the destination carries the PR number | keep cut | SKILL:58-60 step 7 |
| #406 | standard | Upload needs `s3:PutObject`... "no test here can verify" | keep cut | No-op: the denial is met when it happens, the fallback steps follow |
| #406 | standard | "A denial is not a failed validation" | **restore** | Stated nowhere else (grep of open-pr and standard); keeps a session from re-running or failing the gate on an IAM denial. Restored at standard:71 |
| #406 | standard | "Silently dropping... the failure this section has always guarded against" | keep cut | Rewording; standard:74 keeps "trust me" |
| #410 | agent | "You are a visual-validation agent... be skeptical, not generous" | keep cut | Rewording; agent:9 |
| #410 | agent | "absolute path" qualifiers and `e.g. http://localhost:5173/...` on the brief fields | keep cut | template.md:20-24 gives absolute paths and the example |
| #410 | agent | "On PR #216 two validators read the two instructions as a contradiction" | keep cut | Story; the rule stays at agent:17 |
| #410 | agent | "The skill creates this folder; you fill it." | keep cut | No-op: the folder exists when the agent starts (SKILL step 3 `mkdir -p`) |
| #410 | agent | "You receive nothing else. No implementation summary. No 'this should work'" | keep cut | Rewording; agent:13 "and nothing else" |
| #410 | agent | "a CLI over a browser daemon... finds Chromium and reaches https and localhost" | keep cut | CLAUDE.md *Checking a screen* "it needs no flag here"; agent:23 "needs no setup" |
| #410 | agent | `agent-browser record start` row in the command table | keep cut | Replaced in the same hunk by the GIF block, agent:41-50 |
| #410 | agent | "Do not fall back to a different tool silently, and do not install" | keep cut | Rewording; agent:52 |
| #410 | agent | Step 2 Q.O.D.: "(build tool, file layout, dependency choice)" engineering examples | keep cut | The visible-side examples restored below draw the line; these add nothing to "engineering decisions" |
| #410 | agent | Short form: "(PR #314's were *The icon* and *The opening*)" and "Eleven short-form features..." | keep cut | Story and count; the rule stays at agent:65 |
| #410 | agent | Step 4 a-e sub-steps ("Plan the browser action", `?seed=DEADBEEF&palette=classic`) | keep cut | Rewording; agent:66-69 |
| #410 | agent | Edge cases: "Narrow-viewport thresholds (e.g. ≤ 960 px, ≤ 520 px, ≤ 380 px)" | keep cut | Breakpoints of one app; the spec names its own, CLAUDE.md fixes 375 px |
| #410 | agent | Dark mode: "re-check first-visit palette claim" | keep cut | Mondrian-specific; the spec names its claims |
| #410 | agent | Touch: "with `Input.dispatchTouchEvent`", "do not pass it on a click" | keep cut | Rewording; agent:75 keeps the rule and the UNVERIFIABLE outcome |
| #410 | agent | Friction examples: tool named the wrong problem, spec assertion, harness limit | **restore** | Not in the agent; `scripts/kaizen.sh:31` holds only the first and the agent never reads it. Widens what a validator logs. Restored at agent:78 |
| #410 | agent | "It is swept at merge by `/after-task-kaizen`" | keep cut | Exposition; changes nothing the validator does |
| #410 | agent | "Do not summarise findings — the skill reads the report" | keep cut | agent:84 "Return only the report path" already excludes it |
| #410 | agent | Verdict semantics: mergeable only with disclosure; FAIL never mergeable | keep cut | Mergeability is the skill's, SKILL:67-75 |
| #410 | agent | "A row you couldn't test goes UNVERIFIABLE with a one-line note" | keep cut | agent:59, agent:86 and the Notes rule in the report layout |
| #410 | agent | Rules list (no questions, spec alone, edge cases, evidence, 600 ms, write scope) | keep cut | Each moved: agent:86, agent:9, agent:70, agent:115, agent:66, agent:86 |
| #410 | agent | Helper script "never in `evidence_dir`... PR #278 `request-log.init.js`" | keep cut | agent:86 puts it in the scratchpad; story dropped |
| #410 | SKILL | Description: "discovers the dev-server command from the workspace's `package.json`" | keep cut | Stale: `scripts/dev-server.sh` |
| #410 | SKILL | Description: "Reads the standard at `standard.md` before dispatching" | keep cut | SKILL:12-14 points to it; the dispatch needs nothing from it |
| #410 | SKILL | "A spec is a list of assertions... most common failure mode of LLM-shipped UI" | keep cut | Exposition; SKILL:8-10 keeps the gate's job |
| #410 | SKILL | "non-negotiable"; `Agent({...})` call block; brief carries four paths | keep cut | template.md:14 holds the call; SKILL:18-22 the rule |
| #410 | SKILL | Tooling section: agent-browser, GIF recording, ffmpeg, "ten frames a second" | keep cut | Moved to agent:41-50 (single source); ffmpeg flags carry the frame rate |
| #410 | SKILL | When to invoke: dev server or preview URL, user asks, gate 5 | keep cut | The description carries the triggers; SKILL:24-25 the skip |
| #410 | SKILL | Step 2: `app_pkg = "@borso-app/<app>"`; confirm `apps/<app>/package.json` | keep cut | The agent takes no `app_pkg` (agent:13-19). Fixed instead: template brief dropped the dangling `app_pkg` line |
| #410 | SKILL | Dev server "reuses a server it already started", sign-in "on stderr" | keep cut | Environment lookup: `scripts/dev-server.sh` behaviour, not a convention |
| #410 | SKILL | Step 5 story "on PR #406 it could not open the picked artboard" | keep cut | Story; the reason stays at SKILL:46 |
| #410 | SKILL | "Do not summarise — the user reads the report" (step 6) | **restore** | Not stated elsewhere; a session summarises a report by default. Restored positively at SKILL:53 |
| #410 | SKILL | Step 8: ADR link and "On PR #406 the operator had to ask for screenshots" | keep cut | ADR linked at standard:60; `scripts/hooks/checks/screens-shown.core.ts` PENDING_REASON now blocks a push while screenshots wait |
| #410 | SKILL | "A file moved out keeps a path relative to the report" | keep cut | agent:115 |
| #410 | SKILL | Deliverable and three return lines with mergeability | keep cut | standard:59, SKILL:64-75 |
| #410 | SKILL | Acceptance: "Failing rows are real defects"; "no disclose-and-merge path" | keep cut | Rewording; SKILL:69-70 "never accepted" |
| #410 | SKILL | PR carry: "this document does not name a heading" | keep cut | SKILL:79-80 names open-pr as owner; open-pr SKILL:18 says it alone holds the shape |
| #410 | SKILL | UNVERIFIABLE reason points at `docs/knowledge/` or the other validator's report; "slip into main silently" | **restore** | open-pr SKILL:18 asks only for "the one-line reason"; the pointer is stated nowhere else. Restored at SKILL:84-86 |
| #410 | SKILL | Screenshots: "with the folder link in the body as the fallback" | keep cut | open-pr SKILL:71-79 holds the folder fallback |
| #410 | SKILL | Failure modes list (optimism, general-purpose, animation, evidence, DOM, spec, edge cases, UNVERIFIABLE) | keep cut | Each held once: SKILL:18-22, agent:66, agent:115, agent:68, agent:9, agent:70, SKILL:71 |
| #410 | SKILL | "If a feature exists in code but isn't claimed in the spec, it isn't validated" | keep cut | agent:9 "Validate from the spec alone" |
| #410 | standard | Header: "Edit this file when the standard evolves; SKILL.md when enforcement" + companions | keep cut | Stale split: rules now live in the agent; standard:3-6 states the new split |
| #410 | standard | "not a type-check, not a lint"; "high confidence the feature ships"; "not negotiate" | keep cut | Rewording; standard:10-15 |
| #410 | standard | "structural mitigation, not a culture rule"; frontmatter carries the rule | keep cut | Rewording; standard:19-23 |
| #410 | standard | Tooling pointer section | keep cut | standard:3-5 header points to the agent |
| #410 | standard | Design bundle README "recreate them pixel-perfectly"; bundle ships babel-rendered React | keep cut | Reason only; agent:58 holds the rule and the prototype path |
| #410 | standard | Captures into `validation/screenshots-<ts>/comparisons/<screen>-{design,impl}.png` | keep cut | Stale path; agent:58 saves into `evidence_dir` |
| #410 | standard | Typography: Instrument Serif via `var(--t-display)`, eyeball-test | keep cut | Pragma-specific example; agent:58 keeps computed `font-family` on the matching node |
| #410 | standard | Layout "in the same order, with comparable spacing" | **restore** | "comparable spacing" was lost from the PASS criteria. Restored at agent:58 |
| #410 | standard | Affordances list... "If the prototype shows it, the implementation has it" | **restore** | Sharper bound than "the affordances". Restored with three examples at agent:58 |
| #410 | standard | Palette tokens "declared in `design-tokens.css` and referenced where the prototype references it" | **restore** | Stricter than "match". Adapted: the file is now `apps/pragma/site/src/styles/tokens.css`, so agent:58 says "the app's token stylesheet" |
| #410 | standard | Microcopy "verbatim from the prototype (allowing for i18n key indirection)" | **restore** | "verbatim" and the i18n allowance were dropped. Restored at agent:58 |
| #410 | standard | FAIL examples: "filter pills absent on `/catalog`", font-family `system-ui`, chips as text | **restore** (one example) | Shows what "concretely" means. One example kept at agent:58 to limit sprawl |
| #410 | standard | Conflict "flags the conflict in *Validation gaps*" | keep cut | Stale heading the PR checker refuses; agent:58 "note the conflict" |
| #410 | standard | Result: "Typography, layout, copy, colours, spacing" | keep cut | Rows come from the spec's own Result list (agent:59) |
| #410 | standard | One-row-per-artefact story (pragma panel) | keep cut | standard:27-31 keeps it |
| #410 | standard | Happy path "in order" | keep cut | Rewording; numbered steps are walked in order by default |
| #410 | standard | Edge cases: slow network, large input, empty input; error cases: invalid URL params, third-party failures, keyboard accidents | **restore** (all but slow network) | Absent from agent step 5. `agent-browser --help` offers `network route --abort` and `set offline`, no throttle, so slow network stays cut. Restored at agent:75-76 |
| #410 | standard | Q.O.D. examples: palette options, default mode, URL behaviour, mobile, accessibility | **restore** | Tells the agent accessibility decisions are visible ones. Restored at agent:62 |
| #410 | standard | Reachability: "A list is the page a person opens to work on that record" + PR #60 story | keep cut | agent:63 holds the rule, standard:32-34 the story |
| #410 | standard | Production strategy not validated | keep cut | agent:65 |
| #410 | standard | "Other browsers are out of scope"; "claims, not a reference snapshot" | keep cut | Rewording; standard:41-44 |
| #410 | standard | Final verdict rules; "PASS_EXCEPT_UNVERIFIABLE is its own verdict"; FAIL re-run | keep cut | agent:119-121, SKILL:67-75 |
| #410 | standard | Pixel-content checks section | keep cut | agent:68, standard:35-36 |
| #410 | standard | Common mistakes rows: summarise, general-purpose, Playwright, settle, infer intent, skip edge cases, DOM | keep cut | SKILL:18-22, agent:52, agent:66, agent:9, agent:70, agent:68 |
| #410 | standard | Common mistakes: "Treat unsourced PASS as UNVERIFIABLE" | **restore** | Names the verdict for a believed-but-unbacked row, which nothing else did. Restored at agent:115 |
| #410 | standard | Common mistakes: "Gitignoring the validation folder" | keep cut | Covered by the restored `.gitignore` line at standard:68-69 |
| #410 | template | "Two templates live here. The skill uses both." | keep cut | Rewording; section 2 is a pointer |
| #410 | template | Report template block | keep cut | Duplicate of agent *Report format* (agent:88-115); old evidence path is stale |
| #410 | template | Path conventions: spec link, relative screenshot paths, write scope, "committed" | keep cut | Spec link in agent:95; relative paths stale (URLs, agent:115); write scope agent:86 |


## Fix that is not a restore

`template.md` brief listed `app_pkg`, which the agent does not take (agent:13-19) and which nothing derives since #410 cut SKILL step 2. It also lacked `design_path` and the seeded sign-in that SKILL step 4 passes. The brief now matches the agent's field list.
