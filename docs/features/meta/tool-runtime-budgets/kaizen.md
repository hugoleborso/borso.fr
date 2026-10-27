# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [14:31] `runtime-budgets` check-claude-harness-active refused a session whose .claude hooks visibly run, because the main checkout's SessionStart predates the --record line and the worktree shares its git dir
- [15:28] `runtime-budgets` pre-push timings swung from 55 s to 323 s on the same fixture because other sessions drove the shared machine to load 11, and the pragma tests timed out under it
- [01:34] `rework-197` an npm alias of typescript@7 next to typescript@5 shadows the tsc bin of every workspace that declares both, silently, because pnpm links the higher version
- [01:34] `rework-197` oxlint reports an eslint-disable directive for a type-aware rule as unused whenever it runs without --type-aware, so a fast non-type-aware pass cannot also report unused directives
- [01:34] `rework-197` oxlint's native react/purity, unicorn/consistent-function-scoping, jsx-a11y/autocomplete-valid and jsx-a11y/no-autofocus disagree with the ESLint plugins they port on this tree, and @oxlint/migrate maps them as equivalent
- [01:34] `rework-197` oxlint places a JS plugin's report on a comment one line above the comment, so @eslint-community/eslint-comments/require-description points at the wrong line
- [01:34] `rework-197` jsPlugins load eagerly even when declared inside an override, so eslint-plugin-react-hooks adds about 0.3 s to every oxlint run including ones that lint no React file
- [02:09] `rework-197` oxlint turns ESLint's column -1 force-location into an offset on the previous line, so @eslint-community/eslint-comments reports one line early and crashes on line 1
- [02:09] `rework-197` under oxlint a blanket /* eslint-disable */ silences @eslint-community/eslint-comments/no-unlimited-disable's own report, so the rule passes the exact defect it exists for
- [02:09] `rework-197` oxlint reports React hooks rules as react-hooks(rule) while the configuration names them react/rule, so a tool mapping diagnostics to configured rules needs a translation
- [08:11] `rework-197` pnpm why typescript -r did not show @stryker-mutator/core, which imports typescript dynamically without declaring it, so dropping TypeScript 5.9 broke every mutation run and only the slow gate canaries showed it
- [08:46] `rework-197` the pre-commit-budget fixture on CI's runner read 2732 ms, then 2274 and 2427 ms on reruns of the same commit, with every check's CPU, including untouched shell checks, up by the same factor, so one runner sample cannot tell a regression from a slower machine
