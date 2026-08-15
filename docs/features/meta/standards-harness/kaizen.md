# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [08:03] `main` a rename on one branch and a new file on the other merged clean but left a dangling import; nothing in the merge itself caught it, only a later full typecheck
- [08:04] `main` pre-commit's eslint --cache-strategy content keys on the linted file's own hash, so type-aware rules replay stale errors after a fix in an imported file; the only way out was deleting .eslintcache by hand
- [08:10] `standards-gap-audit` A repo-wide grep for an ESLint rule name returns 538KB because docs/architecture/*.html embeds every standards document verbatim as JSON, so every enforcement-verification grep has to exclude docs/ by hand.
- [08:19] `site-src-normaliser` moving app source into site/src/ makes generated artefacts outside the app (.claude/skills/blueprint/blueprint-index.md, docs/architecture/*) stale, and their --check pre-commit gates then block the commit even though nothing in those files is a decision
- [08:30] `main` parallel subagents share one git index, so my git add picked up another agent's staged in-flight work and the commit tried to ship it
- [08:31] `ci-gap-closer` pre-commit's whole-repository checks read the git index, so another agent's half-staged file move in the same working tree makes every unrelated commit fail with 138 'No such file or directory' greps
- [08:32] `site-src-normaliser` a vite multi-page app cannot move its html entry points into site/src without changing every page URL, because vite derives the output path from the html file's path relative to root — so 'normalise to site/src' means something different for a multi-page app than for an SPA and nothing in the standards says so
- [08:32] `site-src-normaliser` moving a directory inside one app breaks four gates that live outside it (.prettierignore, scripts/check-pure-modules-have-callers.sh allowlist, the blueprint index, the architecture pages), and three of the four hold hardcoded absolute repo paths rather than deriving them
- [08:32] `site-src-normaliser` the blueprint and architecture --check gates compare against the whole working tree, so with a second agent holding uncommitted changes in the same worktree there is no way to regenerate them for your own change alone
- [08:33] `ci-gap-closer` three agents sharing one working tree means every commit's whole-repository pre-commit checks gate on the other two agents' half-finished file moves, so a finished change waits on unrelated work to reach a consistent state
- [08:39] `ci-gap-closer` an untracked scratch file (.tmp-mn.js) left at the repo root by another agent fails the repo-wide eslint run, because eslint lints untracked files while CI only ever sees committed ones
- [08:40] `magic-numbers` the docs/standards/01-naming.md 'Enforced by' bullet claimed eslint no-magic-numbers was configured, but it was absent from eslint.config.js entirely
- [08:49] `borsolivres-builder` docs/adding-a-fullstack-app.md is stale: it names biome as the linter, python3 -m http.server as the dev server, a flat api/index.ts, and says 'there is no full-stack reference yet' when apps/pragma and apps/last-loop-lepin both exist
- [08:50] `rule-author` every custom eslint rule ships a RuleTester suite, but the seven scripts/check-*.sh gates have no test harness at all, so writing the eighth meant hand-rolling a throwaway harness in the scratchpad to see it fire on anything but the four real stylesheets
- [08:50] `rule-author` routes/ has two spellings for the file a router renders: sixteen files use a Page suffix, pragma's Login.tsx and borsouvertures' OpeningTrainerRoute.tsx do not, and nothing in the repo said which one is the convention
- [08:51] `defect-backfill` blueprint-defects.ts cannot resolve a third of the real blueprint ids: readAdoptions skips test files and takes only the first @Blueprint per file, so every test-* blueprint and every second-in-file blueprint (e.g. query-optimistic-mutation) is reported as 'does not exist'
- [08:55] `borsolivres-builder` the PreToolUse blueprint hook injects the canonical file's full @Blueprint JSDoc block and says 'copy the shape', so copying it literally declares a duplicate blueprint id; the hook never says the copy must be reduced to a // @FollowsBlueprint marker
- [09:05] `bucket-retrofit` moving a component out of routes/ makes the generated blueprint index, coverage heatmap, defects table and context json stale, and all four generators write under .claude/ or docs/, so an agent scoped to apps/**/site/** cannot leave the blueprint gate green
- [09:05] `bucket-retrofit` no-components-outside-buckets suggests atoms/ for a domain panel that imports no component (SongMusicBrainzPanel), but atomic-design-composition rejects the same file in molecules/ and the standard forbids a domain noun in atoms/, so the two rules point opposite ways and only the standard's 'read the answer in both directions' paragraph resolves it
- [09:07] `borsolivres-builder` every new full-stack app must be added by hand to the ALLOWED_TEST_ONLY map in scripts/check-pure-modules-have-callers.sh for its i18n-parity.core.ts, which is byte-identical in all four apps and test-only by design in every one of them
- [09:07] `borsolivres-builder` docs/adding-a-fullstack-app.md lists three repo-root registrations but not commitlint scope-enum wording, knip.json, the local-postgres app slug, or the check-pure-modules-have-callers allowlist, so a new app passes its own gates and fails the repo's
- [09:08] `magic-numbers` eslint core no-magic-numbers flags the unit factors inside a named const initializer (const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000), which is the exact shape docs/standards/01-naming.md gives as its own 'Do' example
- [09:08] `magic-numbers` git stash push <path> to test whether a generated file was already stale silently unstaged another agent's staged changes to that path in this shared worktree; there is no read-only way to ask 'was this generated file up to date before my edit'
- [09:32] `research` WebFetch on an arxiv.org/pdf/ URL returns unparsable binary and the summariser answers 'I cannot read this'; the /abs/ page works, but nothing tells you to use it
- [09:32] `research` reading a public third-party GitHub repo needs HTML scraping: raw.githubusercontent 404s on a guessed branch, api.github.com 403s unauthenticated, gh CLI is absent, and the github MCP refuses any repo outside hugoleborso/*
- [09:37] `standards-reviewer` the reviewable-path predicate in seal.core.ts accepts apps/<app>/test/*.ts helpers because it only excludes the exact suffix .test-utils.ts, so files named database-utils.ts and setup-postgres.ts are asked for a seal while the agent brief describes them as out of scope
- [09:38] `main` piping git push through tail swallowed the pre-push failure and reported exit 0, so a failed push read as a successful one for two hours
- [09:49] `main` I wrote the dantotsu saying agents must not stage, then swept a running agent's half-finished work into an unrelated commit with my own git add -A; the countermeasure only addressed one side of the shared index
- [10:04] `mutation-hardening` another agent in the same checkout ran a commit that swept my uncommitted core-file edits into its commit, and left scripts/standards/hotspots.core.test.ts red by adding a parameter to renderHotspotReport without updating its test
- [10:17] `mutation-hardening` a multi-line `// Stryker disable next-line` comment silently only covers the line right after the comment block, so a disable written above a multi-line statement misses mutants on the statement's later lines
- [10:17] `mutation-hardening` toContain('5 more file(s)...') passed against the mutant that rendered '55 more file(s)...', because a substring assertion cannot see a changed leading digit
- [10:51] `main` a Write produced a NUL byte where a space belonged inside a template literal; tests passed because both call sites carried the same NUL, and only cat -A found it
- [11:39] `vocabulary-borsouvertures` the VOCABULARY.md task set a 150-250 line target while telling me to match sibling files that are 363 and 385 lines, so the two constraints could not both be met
- [11:59] `vocabulary-borso-fr` the vocabulary line budget given in the task (100-180) is hard to hit at the sibling VOCABULARY files' level of traced detail; 15 terms with two invariants each lands near 250 lines
- [11:59] `standards-reviewer` the seal predicate covers apps/ and infra/ only, so a review of a diff that is mostly scripts/ produces findings no gate can carry and the report has to invent a 'reviewed, not sealable' section
- [12:07] `main` a repo-wide sed rename rewrote a dated validation report, silently editing the record of a past review
- [12:13] `standards-reviewer-reseal` a review pass's file set grew under it: a commit landed mid-review and put four more reviewable files in the diff, so the brief the agent was given was already stale when it finished reading
- [12:46] `infra-mutation-hardening` knip's Stryker plugin only resolves runner/checker/plugin package names and never follows stryker.config.js's vitest.configFile, so declaring the Stryker deps did not stop knip flagging infra/cdk/vitest.mutation.config.ts; the four app workspaces pass only because their knip.json project globs exclude the workspace root
- [12:46] `infra-mutation-hardening` eslint.config.js's UNPROJECTED_TYPESCRIPT_FILES listed apps/*/vitest.mutation.config.ts but not infra/*/vitest.mutation.config.ts, so the same file shape that lints in an app is a parsing error under infra/
- [12:46] `infra-mutation-hardening` a regex mutant that only moves the boundary of a capture group re-emitted verbatim through $1 is always equivalent, so the whitespace-capture idiom /KEYWORD(\s+(?!...))/ + 'KEYWORD ...$1' can never reach 100 mutation score
- [12:47] `main` makeIdempotent and asyncifyIndex match the first occurrence anywhere in the statement including inside -- comments, so a comment mentioning CREATE TABLE takes the rewrite and the real DDL ships without IF NOT EXISTS
- [15:39] `main` deleting a slice between two anchors took an unrelated function with it, and eslint did not catch the undefined reference because no-undef is off under typescript-eslint and scripts/ has no tsc project
- [16:06] `main` the verb table in 01-naming promised return values nothing checked, and four find… functions returning arrays survived a reviewer pass before a rule caught them
- [16:11] `main` a generator's --check failure branch is never executed locally, so a ReferenceError in its own error message survived eslint, typecheck and the pre-commit hook and only fired in CI, where a stale file finally took that path
- [17:13] `main` CLAUDE.md stated the unlayered-file count as a budget that only goes down and named four numbers, all four of which were already stale, with no gate behind the claim
- [17:19] `main` the drift ratchet counted the minority spelling, so renaming a file TO the documented convention pushed role-marker:hook from 11 to 12 — the instrument punished the fix, and only using it revealed that
- [17:34] `main` spent twenty minutes diagnosing agent-browser ERR_CONNECTION_RESET from first principles when docs/knowledge/driving-previews-with-agent-browser-and-argent.md names the exact cause and flag, and CLAUDE.md links that doc from the section about checking a screen
- [17:34] `main` agent-browser on a hosted session has no browser in its own cache and the fix is an env var the preview-driving doc did not mention, so the documented recipe fails at step zero
- [17:37] `main` the visual-validation skill and its agent both told the validator to run agent-browser install, which is the wrong move in this image and the first thing an isolated agent would try after Chrome not found
- [17:57] `main` no gate read the documents' own links, and the /code-standards routing table had thirteen dead ones, each a single ../ short of the repository root and invisible in a rendered preview
