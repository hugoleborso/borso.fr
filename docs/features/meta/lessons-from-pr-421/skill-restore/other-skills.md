# Restore decisions: specification, tech-lead-orchestrator, route, open-pr, dantotsu, implementation

Worktree: /home/user/borso.fr/.claude/worktrees/agent-ab6c55ec10c6ee0e7, based on origin/main 18653a2c.
Sweeps: #410 = 458e886c, #406 = 214ec4bc, #401 = b2238b1a, #400 = c122c579, #382 = f2e16181.

| sweep | file | passage (first ~12 words) | decision | evidence |
| --- | --- | --- | --- | --- |
| #410 | route/SKILL.md | Two failures, and they cost about the same. Running `/specification` on a one-line fix... | restore (condensed, route/SKILL.md:8) | Nothing else says that over-process and under-process cost the same. Tier 0's "waste" line covers only one side |
| #410 | route/SKILL.md | Give each agent a disjoint file ownership list and tell it not to commit | keep cut | Rewording. CLAUDE.md:80 "Subagents never commit", and `scripts/hooks/checks/subagent-no-staging.core.ts` refuses it |
| #410 | route/SKILL.md | A gate fails for a reason unrelated to your change, that is its own task | restore (route/SKILL.md escalation list) | CLAUDE.md "Fix the failures you find" says fix it but not how it is routed. The bullet changes the task list |
| #410 | route/SKILL.md | A feature is one branch and one pull request at every tier. Slices are commits | restore (route/SKILL.md after the escalation list) | docs/VOCABULARY.md:101 says one PR per feature but not "never stacked". grep for "stacked" in .claude, CLAUDE.md, docs finds no other copy |
| #410 | route/SKILL.md | Parallel agents: One git index. Agents share it. An agent that runs git add | keep cut | CLAUDE.md:80 (worktree isolation, subagents never commit, explicit paths not `git add -A`), plus the subagent-no-staging hook |
| #410 | route/SKILL.md | Whole-repository generators. blueprint-indexing.ts and convention-drift.ts read the entire tree | keep cut | CLAUDE.md:81 "Run scripts/reports.sh once, after every agent has finished". Reports are no longer committed (docs/knowledge/generated-reports-are-rebuilt-not-committed.md) |
| #410 | route/SKILL.md | One app, half-built by others. While several agents change one app, typecheck | keep cut | Premise gone. CLAUDE.md:80 now gives each writing agent `isolation: "worktree"`, so no agent sees another's half-built files |
| #410 | route/SKILL.md | For Tier 0, the task list is the exception: do not create one | keep cut | route/SKILL.md Tier 0 already says "No spec, no plan, no task list" |
| #410 | specification/SKILL.md | It is a working document used to surface misalignments, confront PM/tech perspectives | keep cut | Rewording only (SKILL.md:8) |
| #410 | specification/SKILL.md | Edit standard.md when the underlying standard evolves; edit this file when enforcement | keep cut | Advice for skill editors. It changes nothing for an agent running the spec, so it is a no-op here |
| #410 | specification/SKILL.md | Do not silently fill in assumptions; if you are tempted to guess, ask | keep cut | SKILL.md:16 "If you are tempted to guess, ask instead" |
| #410 | specification/SKILL.md | The whole point of this phase is to surface misalignments through dialogue | keep cut | Restates SKILL.md:8 and :16 |
| #410 | specification/SKILL.md | Suggested cadence: ask, capture the answer in the draft, ask the next | keep cut | SKILL.md:16 "capturing each answer in the draft before the next question... Batch only..." |
| #410 | specification/SKILL.md | The standard names five perspectives that must look at the spec from | keep cut | standard.md "Audience — five perspectives" lists them. The partitioning failure is the first row of standard.md *Common mistakes* |
| #410 | specification/SKILL.md | In this single-developer repo one human wears several hats... switch hats out loud | keep cut | SKILL.md:19 still says it |
| #410 | specification/SKILL.md | Five `> ⚠️ Missing <perspective> discussion` blockquotes, each with what was not challenged | keep cut | SKILL.md:24 gives the pattern. standard.md "Audience" gives what each perspective covers. template.md:23-25 holds the fallback |
| #410 | specification/SKILL.md | The flag stays in the file until the missing pass happens | keep cut | SKILL.md:24 and :33 (no flag may remain before the chain) |
| #410 | specification/SKILL.md | When to invoke: the start of a feature... If unsure, ask one question | keep cut | SKILL.md:12 still says it |
| #410 | specification/SKILL.md | Deliverable: single markdown file, folder tree with spec/ plan/ validation/ | keep cut | SKILL.md:18 gives the path and slug rule. CLAUDE.md *Layout* and docs/VOCABULARY.md "Feature" give the folder |
| #410 | specification/SKILL.md | `<app>` is the workspace slug. Use `<app> = infra` for infra-only features | keep cut | SKILL.md:18 still says it |
| #410 | specification/SKILL.md | Drop screenshots, Figma frames, BPMN next to spec.md; validation evidence under validation/ | keep cut | SKILL.md:18 and template.md:5. Validation evidence belongs to /visual-validation |
| #410 | specification/SKILL.md | The spec itself is short by design, past ~2 pages nobody can iterate | keep cut | SKILL.md:22 step 5 |
| #410 | specification/SKILL.md | Every spec must have these sections in order. Empty sections are a smell | restore (SKILL.md step 1) | template.md says "keep the heading" only for *Architectural choices*. The rule for every section was stated nowhere else |
| #410 | specification/SKILL.md | Section names match the canonical template so local and external specs read the same | keep cut | template.md:3 |
| #410 | specification/SKILL.md | Required sections block: Why (one objective, Gemba link) | keep cut | template.md:29-34 |
| #410 | specification/SKILL.md | Result: visible result, 3 or 4 mockups on a Design canvas, "no visible result" | keep cut | standard.md step 9 (canvas) and template.md:40-42 |
| #410 | specification/SKILL.md | Use cases: visual first, numbered happy path, edge and error cases | keep cut | template.md:49-53 |
| #410 | specification/SKILL.md | Q.O.D.: question, options, decision with date; link ADRs; out of scope | keep cut | template.md:59-65 |
| #410 | specification/SKILL.md | Changes, Types: a new term goes in VOCABULARY.md, rules in INVARIANTS.md | keep cut | standard.md step 7, moved there in the same hunk |
| #410 | specification/SKILL.md | Changes, Records: one row per table, two closed questions, PR #327 | keep cut | SKILL.md:20, template.md:98-104, and `scripts/check-spec-records.sh` enforces it |
| #410 | specification/SKILL.md | Files to change marked NEW / UPDATE; pure helpers in *.utils.ts | keep cut | template.md:107-110 and :116 |
| #410 | specification/SKILL.md | Test strategy: autonomous pipeline, manual sweeps forbidden | keep cut | template.md:114-120 and SKILL.md:28 |
| #410 | specification/SKILL.md | Production strategy: analytics events, thresholds, zero-defect error classes | keep cut | template.md:126-141 |
| #410 | specification/SKILL.md | For tone and depth, mirror the worked example ("As a commuter...") | keep cut | SKILL.md:10 |
| #410 | specification/SKILL.md | Operating mode table, 13 steps with "why this step exists" | keep cut | standard.md *Operating mode* holds the same 13 steps with a rationale column |
| #410 | specification/SKILL.md | Do not skip ahead, each step exists because the next is unsafe | keep cut | SKILL.md:20 "in order" |
| #410 | specification/SKILL.md | After the draft is written, do step 12 explicitly... non-negotiable | keep cut | SKILL.md:21 step 4 |
| #410 | specification/SKILL.md | Failure mode "PM does discovery, tech-lead does the tech part" | keep cut | standard.md *Common mistakes* row 1, plus the flag rule at SKILL.md:24 |
| #410 | specification/SKILL.md | Failure mode "bureaucratic"... if the why of a section is not in it, delete or fix | restore (as the fix in standard.md *Common mistakes* row "bureaucratic tool") | The standard row named the consequence but not the action |
| #410 | specification/SKILL.md | Failure mode "My vision only". Ask the user what they have not considered | restore (as the fix in standard.md row "my vision only") | The standard row named the consequence but not the action |
| #410 | specification/SKILL.md | Failure mode "The schema already says what it is", PR #327 story | keep cut | SKILL.md:20 holds the rule and the reason, and `scripts/check-spec-records.sh` enforces it |
| #410 | specification/SKILL.md | Failure mode "Forgot to link the ADR / Figma / blueprint / BPMN" | keep cut | standard.md *Common mistakes* "Forget to update the deliverable with the ADR..." row |
| #410 | specification/SKILL.md | Failure mode "The spec is too long". Two pages is the soft ceiling | keep cut | SKILL.md:22 and the standard.md row |
| #410 | specification/SKILL.md | Failure mode "Adoption is someone else's problem". Step 13 not optional | keep cut | standard.md row "I do not consider adoption", plus step 13 is walked in order (SKILL.md:20) |
| #410 | specification/SKILL.md | "I'll click around": approved when validators clear it with no human | keep cut | SKILL.md:28 still says it |
| #410 | specification/SKILL.md | "Frontend-only apps don't need tests": regardless of backend, Sentry or size | keep cut | SKILL.md:29 "in every app" covers every case listed |
| #410 | specification/SKILL.md | Repo notes: create spec/, plan/, validation/ as siblings | keep cut | CLAUDE.md *Layout*. Each later skill creates its own folder |
| #410 | specification/SKILL.md | Repo notes: commitlint scope is `<app>` directly | keep cut | CLAUDE.md *Commits* lists the scopes, and commitlint enforces them |
| #410 | specification/SKILL.md | Repo notes: architectural decisions go to their own ADR, referenced not duplicated | keep cut | template.md:64 and template.md *Architectural choices* |
| #410 | specification/SKILL.md | Repo notes: infra changes must call out the test-coverage impact | keep cut | template.md:119 |
| #410 | specification/SKILL.md | What comes next: ready for /technical-conception; do not start implementation directly | keep cut | SKILL.md:33 |
| #410 | specification/SKILL.md | Do not stop and wait for the user to type it; chain is operational | keep cut | SKILL.md:33 "without waiting for the user to type it" |
| #410 | specification/SKILL.md | The orchestrator handles the next stage itself | keep cut | Says nothing new. The suppression paragraph already says "stop" |
| #410 | specification/standard.md | Source standard note: edit this when standard evolves, plus companion docs list | keep cut | standard.md:3 points to SKILL.md and template.md. The editing advice is for maintainers and does nothing here |
| #410 | specification/standard.md | A good spec lets every perspective look at the feature from its angle | keep cut | Restates the *Audience* section |
| #410 | specification/standard.md | "Ne pas prévoir, c'est déjà gémir." Leonardo da Vinci | keep cut | Does not change behaviour |
| #410 | specification/standard.md | An hour spent on the spec is far cheaper than fighting delays | keep cut | The jidoka paragraph (standard.md:13) makes the same argument |
| #410 | specification/standard.md | Required sections (canonical template), six prompts reproduced verbatim | keep cut | template.md carries the same prompts under each heading (lines 29, 38, 47, 57, 85, 124) |
| #410 | specification/standard.md | Step 7 rationale "(PR #327)" | restore (standard.md step 7) | Restores evidence for the claim. CLAUDE.md requires evidence in the same sentence |
| #410 | specification/standard.md | Worked example section: depth reference, well under two pages | keep cut | SKILL.md:10 points to worked-example.md. SKILL.md:22 covers brevity |
| #410 | specification/template.md | The pipeline was told to read this table for months while template had none | keep cut | History of a fixed gap. The rule it supported is still there, reworded |
| #410 | tech-lead-orchestrator/SKILL.md | description: emits ADRs when a decision matches one of 4 triggers | keep cut | Body stage 2 and standard.md *ADR triggers*. Description text is loaded every turn |
| #410 | tech-lead-orchestrator/SKILL.md | description: state committed alongside the feature; reads standard and contract first | keep cut | standard.md *Run artefacts (all committed)* and Procedure step 1 |
| #410 | tech-lead-orchestrator/SKILL.md | This skill replaces the previous linear auto-chain | keep cut | Stale history |
| #410 | tech-lead-orchestrator/SKILL.md | Markdown-driven. Every primitive below is described in prose; no package.json | keep cut | SKILL.md:18-21 "It carries no code. You are the runtime" |
| #410 | tech-lead-orchestrator/SKILL.md | A run that finishes without escalation is the goal | keep cut | SKILL.md:25 says the same thing as its inverse |
| #410 | tech-lead-orchestrator/SKILL.md | When to invoke: user triggers; not for one-line fix or mechanical rename | keep cut | The description carries the triggers. SKILL.md:28-30 covers scope, and /route assigns tiers |
| #410 | tech-lead-orchestrator/SKILL.md | Operating mode: state machine diagram spec → adrs → ... → escalated | keep cut | standard.md *Stage diagram* transition table |
| #410 | tech-lead-orchestrator/SKILL.md | State committed with the feature, every run including aborted stays for audit | keep cut | standard.md:253 and :269 (Q-RUN-COMMIT) |
| #410 | tech-lead-orchestrator/SKILL.md | The orchestrator never reads back its own journal during a run | restore (standard.md *Journal event schema*) | grep of the skill, feature-pipeline.md and docs/knowledge/tech-lead-orchestrator.md finds no other copy. It keeps the context small |
| #410 | tech-lead-orchestrator/SKILL.md | Stage 1: /adr cannot conjure architectural choices that weren't surfaced | keep cut | Reworded at SKILL.md:55-57 (spec-thin-on-tech-surface) |
| #410 | tech-lead-orchestrator/SKILL.md | Stage 2: AskUserQuestion per candidate with three options; guidance not correction | keep cut | standard.md *Tech-lead validation* |
| #410 | tech-lead-orchestrator/SKILL.md | Stage 3: plan must shape its Files / Test strategy / Risk register around ADRs | restore (SKILL.md stage 3) | technical-conception/SKILL.md and standard.md never mention the ADR index, so only this brief says it |
| #410 | tech-lead-orchestrator/SKILL.md | Stage 4: consolidated brief contents; verdict per sub-agent-contract | keep cut | standard.md *Sub-agent dispatch hygiene* first bullet, plus Procedure step 1 |
| #410 | tech-lead-orchestrator/SKILL.md | Stage 5: round 1 whole branch; never hand to subagent, it has no Agent tool | keep cut | standard.md *Retry policy*. `scripts/hooks/checks/validation-runs-as-its-agent.core.ts` enforces it |
| #410 | tech-lead-orchestrator/SKILL.md | Stage 6: fix / replan / escalate sub-bullets, retries.implement++ | keep cut | standard.md *Retry policy* and the *Stage diagram* rows arbitrate→implement, arbitrate→plan |
| #410 | tech-lead-orchestrator/SKILL.md | Stage 7: remind Hugo to approve pending prod-shared deploy | keep cut | Stale. infra/shared deploys only on operator dispatch of shared-deploy (CLAUDE.md *Commits*, *Self-improvement loop* item 1) |
| #410 | tech-lead-orchestrator/SKILL.md | Sub-agent contract: read only front matter; body stays on disk | keep cut | standard.md *Verdict YAML contract* and SKILL.md stage 6 |
| #410 | tech-lead-orchestrator/SKILL.md | Context discipline section (no code, limit 15, bytesRead, milestones) | keep cut | Moved to standard.md *Context discipline* |
| #410 | tech-lead-orchestrator/SKILL.md | Human-message classification section | keep cut | standard.md *Human-message classification* |
| #410 | tech-lead-orchestrator/SKILL.md | Hooks: pre-commit or pre-push failure at ship is fail-local | keep cut | SKILL.md stage 7 |
| #410 | tech-lead-orchestrator/SKILL.md | Spec immutability section | keep cut | standard.md *Spec immutability*, plus SKILL.md Procedure step 3 |
| #410 | tech-lead-orchestrator/SKILL.md | Procedure: read SKILL.md; runId example; at ship commit and push | keep cut | Procedure steps 1-2, the state.json schema example, and stage 7 |
| #410 | tech-lead-orchestrator/SKILL.md | Procedure 6: tell Hugo to approve prod-shared deploy | keep cut | Stale, same evidence as the stage 7 reminder |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: walking the chain without state | keep cut | Procedure step 3 |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: absorbing verdict bodies | keep cut | Stage 6 and standard.md *Verdict YAML contract* |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: editing spec.md after checksum | keep cut | standard.md *Spec immutability* |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: bypassing the retry-action table | keep cut | Stage 6 "never one guessed from the body" |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: auto-chaining sub-skills when piloted | keep cut | specification/SKILL.md:37 and technical-conception/SKILL.md:136 run the check themselves |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: writing ADRs after the plan; plan ossifies | keep cut | Stage 2 and standard.md *Stage diagram* "ADRs come before the plan" |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: skipping tech-lead validation pollutes docs/adr | keep cut | standard.md:111-112 |
| #410 | tech-lead-orchestrator/SKILL.md | Failure mode: inventing TS code for the orchestrator | keep cut | SKILL.md:19 "It carries no code" |
| #410 | tech-lead-orchestrator/standard.md | The contract this skill is held to | keep cut | Rewording (standard.md:3) |
| #410 | tech-lead-orchestrator/standard.md | Skill in chat: perspective sweeps, AskUserQuestion, ratification, decision-support walk | keep cut | Condensed into standard.md:12-13 with the same reason |
| #410 | tech-lead-orchestrator/standard.md | Workflow invokes the listed skills as subagents, does not reimplement them | keep cut | Condensed into standard.md:17-18 |
| #410 | tech-lead-orchestrator/standard.md | Transition column names where each row lives; link to feature-pipeline.md | keep cut | standard.md:14 links feature-pipeline.md |
| #410 | tech-lead-orchestrator/standard.md | The 8 stages are: spec, adrs, plan, implement, validate, arbitrate, ship, escalated | keep cut | The transition table lists every stage |
| #410 | tech-lead-orchestrator/standard.md | ship (end): deploy reminder issued | keep cut | Stale, same evidence as the prod-shared reminder |
| #410 | tech-lead-orchestrator/standard.md | Thin spec paragraph: escalate spec-thin-on-tech-surface | keep cut | Moved to SKILL.md stage 1 |
| #410 | tech-lead-orchestrator/standard.md | front-matter, the block between the leading --- delimiters | keep cut | Does not change behaviour |
| #410 | tech-lead-orchestrator/standard.md | Detection is fuzzy, the orchestrator (the LLM) reads the spec | keep cut | Reworded at standard.md:98 |
| #410 | tech-lead-orchestrator/standard.md | If none of the four fires, no ADR; that's the gate against ADR spam | keep cut | standard.md:107 keeps the rule. The tag line adds nothing |
| #410 | tech-lead-orchestrator/standard.md | Confirming a draft list is productive engagement, not a defect signal | keep cut | standard.md:120 keeps the rule, and :226-228 defines correction |
| #410 | tech-lead-orchestrator/standard.md | If Hugo declines every candidate... not every feature has an ADR | keep cut | standard.md:121-122 |
| #410 | tech-lead-orchestrator/standard.md | Blank line inside dispatch hygiene list; brief half-gate rewording | keep cut | Formatting and rewording only |
| #410 | tech-lead-orchestrator/standard.md | A question verdict does not consume a retry; ask, then re-invoke | keep cut | The `question` row of the *Deriving verdictKind* table, plus specification/SKILL.md:35 |
| #410 | tech-lead-orchestrator/standard.md | Context signal "surfaced by /after-task-kaizen" | keep cut | Stale. grep finds `context_growth` only in docs/knowledge/tech-lead-orchestrator.md and nowhere in after-task-kaizen |
| #410 | tech-lead-orchestrator/standard.md | Visual-validation skip section (Q-VIS-VAL), example reason | keep cut | SKILL.md stage 5 and the journal schema `visual_validation_skipped` row with `reason` |
| #410 | tech-lead-orchestrator/standard.md | git add -A on runs/ at ship is part of the commit, not a follow-up | keep cut | standard.md:269 "staged at ship" and SKILL.md stage 7 |
| #410 | tech-lead-orchestrator/standard.md | PR description: example of a "seed X" PR that grew a redesign | keep cut | standard.md:274 keeps the reason |
| #410 | tech-lead-orchestrator/standard.md | PR description: before issuing the deploy reminder; deploy reminder still fires | keep cut | Stale, same evidence as the prod-shared reminder |
| #410 | tech-lead-orchestrator/standard.md | This list used to prescribe ## Summary ... which the checker refuses | keep cut | History. `scripts/pr/check-pr-body.ts` enforces the shape |
| #410 | dantotsu/SKILL.md | `scripts/list.sh` → `list.ts` invocation | keep cut | Rewording only. Nothing removed |
| #410 | dantotsu/standard.md | SKILL.md anchor links (#6-eradication, *Output* section) | keep cut | Rewording only. The links were updated to the current anchors |
| #410 | implementation/standard.md | visual-validation rubric path `.claude/skills/visual-validation/standard.md` | keep cut | Rewording only. The path now points to `.claude/agents/visual-validator.md` |
| #410 | open-pr/SKILL.md | Hook names `pretool-github-pr-body.sh`, `pretool-gh-pr-create.sh` | keep cut | Rewording only, to `scripts/hooks/checks/*.core.ts` |
| #406 | implementation/SKILL.md | e. Update local commits as you go, not one giant commit | keep cut | Contradicts CLAUDE.md:80 "Subagents never commit". `subagent-no-staging.core.ts` refuses it. Step 7 hands commits back |
| #406 | implementation/SKILL.md | 7. Push. The branch's CI is the last gate; local gates stricter | keep cut | Replaced by "Hand back" for the same reason. The main session pushes |
| #401 | open-pr/SKILL.md | Kaizen prompt names any line logged after the archive, pasted verbatim | keep cut | The same commit made `scripts/kaizen/operator-messages.ts` print "Friction the listed sessions logged, archived or not" (line 45), so the sweep reads late lines itself |
| #400 | implementation/SKILL.md | Pair this with the broken-image scan: agent-browser screenshot + eval snippet | keep cut | `scripts/browser/broken-images.sh` runs the same scan (it also covers SVG `<image>`) and exits 1 on a hit. SKILL.md names it |
| #400 | implementation/SKILL.md | A non-empty eval result is a stop-the-line, the row is not done | keep cut | Reworded as "A non-zero exit means the slice is not done" |
| #382 | open-pr/SKILL.md | (no removal: step 7 gained a clause only) | keep cut | Addition only |

Counts: 122 rows. 9 restored, 113 kept cut. Of the kept-cut rows, 8 are pure rewordings or additions with nothing removed.
