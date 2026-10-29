# Friction inventory — PR #199

PR #199 gave agents a read-only path into the production databases of pragma,
last-loop-lepin and banana-rush. It was built on claude.ai/code over two days
and merged from a laptop, after the manual IAM step its body asked for.

**Its friction log never reached this sweep.** The session was hosted, the log
is gitignored, and nobody ran `scripts/kaizen.sh archive`. Rows 01 to 09 below
were rebuilt from thirteen commits, the CI history, the pull-request body and
the session that applied the IAM step — which is the expensive, lossy
reconstruction row 09 is about, and everything the subagents of that session hit
is simply gone. Rows 15 and 16 were found while shipping the eradications above, which is
where the sweep's sharpest finding came from. Rows 10 to 14 are carried over:
five entries from the talos memory work that were sitting unswept in the same
file — and row 16 explains why nobody was told they were there.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | `gh pr merge 199` deployed six applications to production and the hook that names the blast radius printed nothing | transcript: the merge ran through Bash; `.claude/settings.json` matched the hook to `mcp__github__merge_pull_request` only | `dantotsu: the-merge-whose-blast-radius-nobody-printed` |
| 02 | pr-description | The body said the merge deploys three applications; `deploy.yml` fans `infra/cdk/**` out to all six, which is what ran | PR #199 body, *Notable*; run 40429364268 shows six green deploy jobs | `merge into the-merge-whose-blast-radius-nobody-printed` |
| 03 | validation | `db-read.sh` let a blocklisted table through before the deploy: the blocklist is read from the deployed template, and an absent reader read as an empty list | transcript: `APP=last-loop-lepin … admin_sessions` reached `psql` instead of being refused, against §12.7 which documents a refusal | `dantotsu: the-blocklist-that-was-empty-because-nothing-was-deployed` |
| 04 | validation | The first fix keyed on `readerPrincipalArns`, which CloudFormation stores as `Fn::Join` objects, so a just-deployed stack still read as unprovisioned | transcript: deployed `pragma-prod` template; the string-list check matched nothing | `merge into the-blocklist-that-was-empty-because-nothing-was-deployed` |
| 05 | post-merge | PR #199's own friction log was lost; this inventory was rebuilt from commits and CI | `KAIZEN.md` held only talos entries at sweep time; PR #199's diff commits no `kaizen.md` | `dantotsu: the-friction-log-that-never-left-the-container` |
| 06 | validation | The auto mode classifier refused four calls — two guard probes, one `pg_roles` catalogue read, and the heredoc writing the entry about it | transcript: `Production Reads`, `Cloud Storage Mass Delete`, and one with no reason given; PR #199's body already records the same refusal as its validation gap | `knowledge: the-auto-mode-classifier-refuses-guard-probes` |
| 07 | post-merge | `Explicit-write-deny` on `AI-Dev-ReadOnly` had never received §12.6's screenshot carve-out, and `Screenshots-publish` did not exist, so `/visual-validation` has been committing screenshots since ADR-0023 | `iam get-user-policy` on 2026-10-27: one blanket statement, `s3:Put*` inside it, no second statement | `fixed: applied §12.6 to the account and verified with simulate-principal-policy` |
| 08 | post-merge | §12.7's jq was written against §12.6's two-statement deny, which the account did not have; it produced the right policy only because its filter matched both shapes | PR #199 body, *Before merge*; the live document had one statement | `merge into 07` |
| 09 | post-merge | The end-to-end prod read still cannot be proven from a laptop: the reader role is mapped to the `AI-Dev-ReadOnly` user, whose keys live in the hosted environment | transcript: `FATAL: unable to accept connection, access denied` as the SSO admin, after a green deploy | **Closed 2026-10-29.** Not a hosted-session problem after all: the sandbox refuses 5432, so that session could never have proven it either. [ADR-0049](../../../adr/0049-agents-read-production-through-an-invoked-reader-lambda.md) moved the read behind an invoked Lambda, which a laptop holding `borso-admin` can call, and the path was then proven from one — `{"members":"5"}` on pragma, `{"editions":"1"}` on last-loop-lepin, `{"games":"0"}` on banana-rush, with talos and three blocklisted or locking reads refused at exit 3. |
| 15 | post-merge | Pre-commit refused the kaizen commit, saying this session never ran the repository's hooks, while the knowledge-trigger and blueprint hooks had been printing all session | transcript: `check-claude-harness-active.sh` found no marker; `--acknowledge` exited 1 without recording | `dantotsu: the-session-install-that-died-looking-for-a-linux-chromium` |
| 16 | post-merge | `install-repo-deps.sh` has been exiting 1 on every macOS session at the agent-browser block, so its last four steps — the blueprint lookups among them — never ran there | `bash -x` trace: `find /opt/pw-browsers …` exits 1, `pipefail` promotes it, `set -e` ends the script | `merge into the-session-install-that-died-looking-for-a-linux-chromium` |
| 10 | carried over | `zsh` does not word-split an unquoted variable, so a bash-style `set -- $pair` loop passed empty ARNs to eight `aws` calls before the error named the cause | transcript: eight `Invalid length for parameter ResourceArns[0]` in one call | `no-op: the error named the parameter, and the fix was to run the loop under bash` |
| 11 | carried over | The hand-started Postgres of talos lot 1 only restarts on macOS with `LC_ALL=en_US.UTF-8` before `pg_ctl` | `KAIZEN.md`, writer `lot3-pwa-db` | `no-op: scripts/local-postgres.sh is the supported path and sets this; the hand-started cluster was a one-off` |
| 12 | carried over | CloudFront answers an API 404 on `talos.borso.fr/api/*` with the SPA `index.html` and status 200 | `KAIZEN.md`, writer `main` | `no-op: shipped with the talos agent API in PR #186; a client reading HTML now has a typed error` |
| 13 | carried over | A SessionStart hook's stdout over 10 000 characters is moved to a file with a 2 000-character preview | `KAIZEN.md`, writer `main` | `no-op: already recorded in docs/knowledge/, and the plan that assumed 80 KB was corrected in PR #186` |
| 14 | carried over | `scripts/browser.sh` fails silently on macOS, looking for Chromium under `/opt/pw-browsers` | `KAIZEN.md`, writer `ux-audit` | `no-op: CLAUDE.md documents the wrapper as the sandbox's, and the macOS path belongs with the browser recipe rather than here` |

## What the table shows that no single row does

**Four of the decisions above are the same shape: a check that ran and returned
the safe-looking value.** The merge hook was registered and silent, the
blocklist was read and empty, the archive step was written down and skipped, and
an installer exited 1 one line after printing a success message.
None of them failed. Each answered a question correctly and the answer meant
nothing, which is `gate-measures-nothing` and `prose-stands-in-for-a-check` in
`docs/quality/weak-points.md`, two of the three weak points this repository has
already named and not yet closed. Row 15 is the sharpest case: a gate fired
correctly, named the wrong cause, and offered a fix that failed in the same
place as the thing it was fixing.

**Two of them were only visible from outside the artefact that was wrong.** The
pull-request body's blast radius was contradicted by `deploy.yml`; the hook's
silence was contradicted by what deployed. In both cases one piece of the
repository knew the right answer and had no way to reach the place the wrong one
was written. That is why the fan-out rule moved into a covered module that both
the hook and a body author can call, rather than being stated more carefully in
two places.

**The IAM half of ADR-0044 is the part with no gate at all.** Rows 07 and 08 are
a manual step whose result nothing in this repository can read, because
`iam:GetUserPolicy` is inside the deny it would be reading. §12.6 had been
unapplied for long enough that the documented screenshot upload has never once
worked, and nothing noticed. No eradication is shipped for it here: the honest
check needs admin credentials, which CI does not have and a session must not.
It is recorded, and `simulate-principal-policy` is the probe that answers it
when someone with the admin profile asks.
