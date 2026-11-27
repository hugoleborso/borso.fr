# Restoring the after-task-kaizen cuts

Files: `.claude/skills/after-task-kaizen/SKILL.md` (changed), `template.md` (no sweep of the six touched it).
Sweep SHAs on origin/main: #382 f2e16181, #388 6914a3fb, #399 7c6106d0, #401 b2238b1a, #407 e94ac3fd, #410 458e886c.
Pure rewordings are not rows. The SKILL.md lines named are in the current file after the restore.

| sweep | passage (first ~12 words) | decision | evidence |
| --- | --- | --- | --- |
| #382 | "do it exhaustively, in writing, in the PR description, before classifying" | keep cut | stale: the inventory lives in `inventory.md`, not the body (SKILL.md step 1 "Commit the table to ...inventory.md") |
| #382 | "The table is the first section of the kaizen PR description so" | keep cut | stale, same reason; template.md:24 "the table lives in the branch" |
| #382 | "the two requirements contradicted each other from the moment the budget landed" | keep cut | reason already stated: SKILL.md "because the table cannot fit the body's budget" |
| #388 | "It leaves out the sweep's records, knowledge entries, ADRs, the operator backlog" | keep cut | held by the script: scripts/kaizen.sh:233-241 `not_counted`, and its printed line says "outside what a sweep does not count" |
| #399 | "2c. Library-search pass, before writing custom anything ... add an ESLint rule" | restore | not in /dantotsu (grep 'library' .claude/skills/dantotsu: none); the balance refusal (kaizen.sh:251) only hints at installed packages, and only on refusal; docs/dantotsus/built-my-own-before-checking-the-library.md:132-147 says this skill carries the rule as its eradication. Restored as the "Look for a library before writing a check" bullet in step 3 |
| #399 | "Name the role of the code you would write, not the bug" | restore | same bullet; the "name the rejected library in Eradication" instruction exists nowhere else |
| #399 | "Rule of thumb: if three rows in the inventory touch the same architectural layer" | restore | same bullet; no other skill folds rows into a "built our own" meta-row (grep 'architectural layer' .claude: none) |
| #399 | "Mirrors built-my-own-before-checking-the-library.md applied at kaizen time" | restore | kept as a one-line back-link, so the next sweep sees the rule is an eradication and not loose text |
| #399 | "See also audit-imported-deps-and-patterns-when-planning.md for the planning-stage analogue" | keep cut | that entry reaches its reader by its own trigger on `docs/features/*/*/plan/plan.md` (its front matter); no kaizen behaviour |
| #399 | "A sweep that still adds more stays red, and the operator merges" | keep cut | superseded: SKILL.md step 4 "A removal is the only answer to its refusal", enforced by CI `kaizen-balance` and pre-push |
| #401 | "the prompt is written by hand and gets this wrong two ways" (PR #281) | keep cut | held at scripts/kaizen.sh:180-187, the `sweep-input` comment |
| #401 | "An archive path the prompt names that the command does not is" | restore | a branch (the mismatch is a row) no script or doc states; restored in the archived-log bullet |
| #401 | "Lines the prompt pasted because they were logged after the archive count" | keep cut | operator-messages.ts prints late lines itself; SKILL.md says "late ones included" |
| #401 | "the inventory has to be rebuilt from the pull request's commits, review" | restore | says what to do on the missing-archive branch; run journals exist (`ls docs/features/*/*/runs`) and are in no source bullet. Restored after "A missing or empty archive is itself a row" |
| #401 | "Save each page and run operator-messages.ts <page.json>... drops tool results" | keep cut | stale: the script takes no page arguments and finds the pages in the transcripts (scripts/kaizen/operator-messages.ts:12-26); filtering lives in operator-messages.core.ts |
| #401 | "Pick a slug kebab-case whose title sparks curiosity, not the user-story" | keep cut | .claude/skills/dantotsu/SKILL.md:48 |
| #401 | "Copy docs/dantotsus/_template.md" | keep cut | .claude/skills/dantotsu/SKILL.md:43 |
| #401 | "Fill the frontmatter by the rules ... zone, weak-point, recurs, fix-commits [self]" | keep cut | .claude/skills/dantotsu/SKILL.md:148-168, enforced by scripts/quality/check-dantotsu-front-matter.ts |
| #401 | "Walk the seven Dantotsu steps" | keep cut | step 3 invokes /dantotsu, which holds the steps |
| #401 | "Pick the highest feasible level of the ladder: 1 structural impossibility" | keep cut | .claude/skills/dantotsu/SKILL.md:110-123 |
| #401 | "everywhere a person reads it, the Eradication block and the Shipped table" | restore | template.md:42-44 covers the Shipped table only; /dantotsu says nothing about the name in the Eradication block (grep 'beside' in dantotsu: none). Restored in step 3 |
| #401 | "Each entry links the commit SHA + diff snippet of the eradication" | keep cut | .claude/skills/dantotsu/SKILL.md:144 |
| #401 | "A new check proves it can fail, here, once. Reintroduce the defect" | keep cut | .claude/skills/dantotsu/SKILL.md:126-127 |
| #401 | "The repository keeps no standing canary, so this step is the only" | keep cut | a reason for the row above, which /dantotsu holds; no added behaviour |
| #401 | "Prefer removing a mechanism over adding a check" | keep cut | .claude/skills/dantotsu/SKILL.md:128-129 "Subtract first" |
| #401 | "extending it beats a second entry the hook would print beside the" | keep cut | docs/knowledge/README.md "so the hook does not print two entries for one trap" |
| #401 | "Write whatever helps the next reader. No fixed sections required; keep it" | keep cut | docs/knowledge/README.md "Adding a new entry" |
| #401 | "Give it front matter with a summary: and triggers: ... paths, commands, output" | keep cut | docs/knowledge/README.md "Every entry has a trigger" |
| #401 | "Prefer the narrowest one that would have fired at that moment" | restore | the README does not say it (grep 'narrow' docs/knowledge/README.md: none), and it changes which trigger an agent picks. Restored in step 3 |
| #401 | "If no path, command or output recognises the moment ... fold the lesson" | keep cut | docs/knowledge/README.md, and scripts/check-knowledge-triggers.sh refuses such an entry |
| #407 | "This session never saw the merged session's chat, so the PR is" | keep cut | stale: the sweep now reads operator messages from the transcript (SKILL.md step 1, second bullet) |
| #407 | "interrupt-and-redirect examples: wait, you missed X, NO, do Y" | keep cut | no-op: "every comment that corrects or redirects" names the class |
| #407 | "Every silent course-correction the user made is a row" | restore | a class with no comment to find; stated nowhere else (grep 'course-correct' .claude docs/knowledge CLAUDE.md: none) |
| #410 | description: "merged or closed" | keep cut | contradicts the first-call rule, stop unless `merged` (SKILL.md "First call") |
| #410 | description: "Implements CLAUDE.md's Self-improvement loop ... starts this skill in a new" | keep cut | body line 8 names the loop; open-pr/SKILL.md:101-106 holds the hand-off |
| #410 | description: "Hard rule, every Dantotsu ships a code-level eradication; knowledge-only floor" | keep cut | step 3 "ship its eradication as code" and dantotsu/SKILL.md:121-123; the description is always loaded |
| #410 | description and Hard rules: "Agent never opens PRs against repos outside hugoleborso/*" | keep cut | dantotsu/SKILL.md:119-120; SKILL.md Hard rules keeps the `patches/` stop |
| #410 | "The operator asked for this on 2026-11-26, after the sweep of PR #407" | keep cut | provenance only; the rule and its reason stay in "When to invoke" |
| #410 | "The operator chose this threshold after PR #371" | keep cut | provenance only; "The operator chose this threshold" stays |
| #410 | "starts it with whatever tool it holds ... The prompt names the merged PR" | keep cut | open-pr/SKILL.md:101-106 |
| #410 | "The sweep also starts from a kaizen task ... the user says /after-task-kaizen" | keep cut | the description holds the triggers |
| #410 | "He asks agents for it about a quarter of the time ... PR #372" | keep cut | the rule "Run it there without asking him to confirm" stays; the count adds no behaviour |
| #410 | "The prompt for PR #253's sweep said merged while the pull request" | keep cut | kept in generic form ("A prompt once said merged ...") |
| #410 | "The instinct is to read the PR, name two or three lessons" | restore | names the default this skill exists to beat (premature completion), stated nowhere else. Restored in "The procedure" |
| #410 | "The archive is the merged session's KAIZEN.md, copied by archive and appended" | keep cut | exposition of scripts/kaizen.sh; "Read the writer" covers subagent lines |
| #410 | "it was created empty at this session's start" | keep cut | a reason for "not the input", which stays |
| #410 | "for the reasons its sweep-input comment gives" | keep cut | a pointer to a rationale the sweep never needs to act |
| #410 | "Map every line to an inventory row" | restore | the completion criterion for the primary input; "one row each" binds moments, not log lines. Restored in the archived-log bullet |
| #410 | "Every operator message of the shipping session (always)" | keep cut | no-op: every source bullet is mandatory |
| #410 | "the operator reads each of their own messages as a correction to learn" | keep cut | "Give each its own row" plus the four classes hold the behaviour |
| #410 | "(or the session link at the end of its body)" | restore | the fallback when a commit lacks the trailer; PR bodies end with the session link (attribution rule) |
| #410 | "It reads every page this session or its subagents listed, inline or spilled" | restore | without it the script call reads as missing its input; verified at scripts/kaizen/operator-messages.ts:12-26 |
| #410 | "On PR #389 almost every operator message was a correction, and the log" | keep cut | reason already stated: "The log holds only what the session chose to write down" |
| #410 | "Every entry names who logged it ... the first a fix where it happened" | keep cut | kaizen.sh stamps the writer; "One agent hitting a wall is local" stays |
| #410 | "The first sweep of PR #385 started from its three archive lines, listed" | restore | the only reason given for walking the turns before the archive; restored as one sentence |
| #410 | "mcp__github__list_pull_requests with state: open" | keep cut | no-op tool lookup |
| #410 | "The sweeps of PR #251 and PR #252 ran at once" | keep cut | reason already stated: "not a second fix" |
| #410 | "read with mcp__github__pull_request_read" | keep cut | no-op tool lookup |
| #410 | "commitlint failures, missed scope; signals: I shipped it then realised" | keep cut | no-op: the bullet still names reverts, amend stretches and refactors after a feat |
| #410 | "CI failures during the PR (get_check_runs)" | keep cut | no-op tool name |
| #410 | "knip noise, ESLint diagnostics, Husky ... build pipeline surprises, dev-server crashes" | restore | build and dev-server crashes widen the net and appear nowhere else; knip and ESLint stay folded into "lint noise" |
| #410 | "tools called with the wrong shape" | restore | a distinct harness class, now absent from the list |
| #410 | "Ask of every row: is this friction a symptom of a problem elsewhere?" | keep cut | the Elsewhere column is mandatory per row and the paragraph stays |
| #410 | "An agent that guessed a path may reveal a skill ... two modules" | restore | the only examples pointing Elsewhere at a skill or at coupling rather than a spec |
| #410 | "so it is not an eradication" | restore | states the verdict the Cause paragraph otherwise leaves implicit |
| #410 | "a guard that measures the wrong thing gets fixed" | restore | a distinct instruction stated nowhere else |
| #410 | "The sweep of PR #351 first shipped a stop script, a refusal message" | keep cut | rule stated in the Cause paragraph |
| #410 | "Friction examples: I assumed X without asking; deploy failed with CNAME conflict" | keep cut | no-op |
| #410 | "Concrete. A row without evidence is a row that can't be audited" | keep cut | the "at least one of" format holds it |
| #410 | "with code-level eradication available. Spawn a docs/dantotsus entry; operator confusion" | keep cut | covered by the Decision list ("shell or CLI quirk") |
| #410 | "The reason is required. Already covered ... is fine; skipped is not" | keep cut | `no-op: <reason>` plus the hard floor |
| #410 | "PR #108's sweep wrote exactly that about the kill hook's ss advice" | keep cut | rule stated ("A reason that names a change is not a no-op") |
| #410 | "No we'll think about this later" | keep cut | hard floor "every row has a decision" |
| #410 | "get_session on every session in the commits' Claude-Session trailers, validation reports" | keep cut | docs/quality/feature-cost.md:12-17 Targets table |
| #410 | "twenty-five ADRs merged from 0010 to 0046 were still proposed" | keep cut | "No other step does it" stays |
| #410 | "Two rows of the validator missed Y ... Five rows of tool W errored" | restore | the only examples of folding into one dantotsu and into one knowledge entry. Restored in step 2 |
| #410 | "the inventory has to come first, so the ruthless cut is informed" | keep cut | the step order holds it |
| #410 | "2b. Classification cheatsheet" table | keep cut | duplicates the Decision list (SKILL.md step 1 conventions) and docs/knowledge/README.md's dantotsu-vs-knowledge table |
| #410 | cheatsheet: "Eradication: structural change so the abandoned approach is no longer expressible" | restore | the one cell not duplicated; restored in the `dantotsu:` decision |
| #410 | "Write the level's name beside its number wherever a person reads it" | restore (same as #401 row) | restored once, in step 3 |
| #410 | "The sweep of PR #310 built four such mechanisms unasked" | keep cut | rule stated |
| #410 | "A manual check, a checklist ... PRs #331 to #337 per-PR iPhone checklist" | keep cut | rule stated with examples |
| #410 | "Cross-link aggressively ... cloudfront-function-throttle-persistence ... corpus compounds" | keep cut | "Link each new entry to the existing ones its chain touches" stays; the example is a no-op |
| #410 | "(replace N with the swept PR's number); scoped docs: (commitlint scope-enum)" | keep cut | no-op; the commit-msg hook enforces scopes |
| #410 | "It counts code, and its not_counted list names what it leaves" | keep cut | scripts/kaizen.sh:233-248 |
| #410 | "PR body shape ... Three sections ... Inventory, Shipped, Patterns" | keep cut | template.md holds the sections and budgets |
| #410 | "This is non-optional, the label is the visible signature" | keep cut | no-op; the signature line stays |
| #410 | "The operator granted this on 2026-11-14 ... which a root cause often calls for" | keep cut | CLAUDE.md Hard rules carries the standing exception |
| #410 | "No issue creation as a substitute for a code commit" | keep cut | CLAUDE.md Principles "No follow-up issues" |
| #410 | "Every Dantotsu links its eradication commit + diff snippet" | keep cut | .claude/skills/dantotsu/SKILL.md:144 |
