# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [17:56] `main` a click on a button below the fold of the page's nested scroller reported success and sent nothing — the exact trap PR #62 documented in agent-browser-cli-quirks section 4, hit again three hours later, because nothing surfaces it at click time
- [17:56] `main` the dev seed cannot reset the admin password: a database that survived an earlier seed answers Wrong password at login, the seed reports adminCredentials already-set, and the only way through is a manual DELETE on app_config
- [18:52] `standards-reviewer` the seal predicate in seal.core.ts counts apps/pragma/test/*.ts (back-e2e harness helpers) as reviewable source, while the reviewer prompt says test helpers are out of scope, so the two disagree on which files a seal is owed for
- [19:12] `standards-reviewer` the review scope is computed from the committed diff but seal.ts verify hashes the working tree, so a branch with uncommitted edits makes the two disagree and the reviewer has to reconcile them by hand
- [19:34] `standards-reviewer` a branch can falsify apps/<app>/VOCABULARY.md and pass every gate, because the seal ledger only covers .ts files and nothing hashes the vocabulary against the slice it describes
- [19:34] `standards-reviewer` a seal recorded by an earlier review pass cannot be withdrawn by a later one, so a finding raised on already-sealed content blocks nothing and only lives in the report
- [10:44] `main` check-doc-links failed with 'not there' for a generated file because only one reports.sh group had run — the error names a missing file, not a missing generator run
- [10:44] `main` git checkout -- <dir> silently undid a git rm --cached for every file under it, re-tracking files I had just untracked; only git ls-files caught it
- [10:44] `main` a regex over '^## (\S+)' in the PR-comment step matched the diff report's own '## Architecture' heading and posted four 404 links before anyone read them
- [11:57] `standards-reviewer` scripts/reports.sh does not exist in the tree though CLAUDE.md and the standards-reviewer agent both instruct running it first
- [12:00] `standards-reviewer` the repository moved under the review: HEAD advanced from 2217539 to 94c66ab and a mid-merge conflicted tree resolved itself while I was reading files, so a file read at minute 1 had different content at minute 2
- [12:03] `standards-reviewer` seal.ts record hashes the file on disk but the file list comes from the committed diff, so a reviewer running in a checkout that has since switched branches would silently seal another branch's content under the wrong ledger hash
- [12:24] `standards-reviewer` CLAUDE.md tells every agent that reads a generated page to run scripts/reports.sh <group> first, and that script does not exist in the tree
- [12:25] `standards-reviewer` the reviewer bullet on 04-backend-architecture says a multi-table write is wrapped in a transaction 'owned by the service' while 11-database's prose says the transaction is opened in the repository because only a repository may import the client — a reviewer reading only the ledger would fail correct code
- [12:25] `standards-reviewer` the 05-frontend reviewer bullet says a route owns no layout primitive, but the canonical route-detail-page blueprint (apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx:147) opens with px-4 sm:px-9 py-7 pb-20 max-w-[1280px], so every route copying the blueprint reads as a violation
