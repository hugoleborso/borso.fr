# Friction inventory — PR #131

Every friction event from the iPhone bug report to the merge of PR #131, in
the order it happened. The decision column is the classification; the entries
it names are in [`docs/dantotsus/`](../../../dantotsus/).

`KAIZEN.md` carried 4 entries, all from `main`: two written by the
`no-swallowed-push` hook during the work, one written by that hook when this
sweep tested its new message, and one logged by hand during the sweep. The
task ran no subagents, so there is no per-agent grouping to read, and most
rows below come from the transcript and the commits rather than from the log.
The log is archived beside this file as [`kaizen.md`](./kaizen.md).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The installed pragma app showed an empty band of about 410 points under the last session card on an iPhone | transcript: operator screenshot | dantotsu: the-shell-that-scrolled-inside-a-window-that-still-could |
| 02 | conception | The diagnosis had to be inferred from pixel measurements in a screenshot, because no tool here opens an iOS keyboard | transcript; `scripts/argent.sh` drives Chromium only | merge into the-shell-that-scrolled-inside-a-window-that-still-could (its detection section names the gap; no tool can close it from this sandbox) |
| 03 | conception | The first fix proposed reset the window offset in JavaScript; the operator asked what PWAs normally do and pushed for a design fix | transcript: "je pense que ça peut se régler by design" | merge into the-shell-that-scrolled-inside-a-window-that-still-could (recorded in its countermeasure; the lint rule makes the two-scroller shape unwritable, so the JavaScript patch is no longer tempting) |
| 04 | implementation | Running vitest from `apps/pragma/site` failed 50 files at import, because the projects are declared in `apps/pragma/vitest.config.ts` | transcript: 50 failed, then 1177 passed from the app root | no-op: a hand-typed command from the wrong directory; the package scripts run from the right one |
| 05 | implementation | `pnpm --filter ./apps/pragma/site` matched no project, because `site/` is a folder of the pragma workspace and not a workspace itself | transcript: "No projects matched the filters" | no-op: the layout is documented in CLAUDE.md under *Layout* |
| 06 | implementation | The `no-swallowed-push` hook refused `git push … \| tail` | `KAIZEN.md` 11:24 | no-op: the hook did its job and the next command ran correctly |
| 07 | implementation | The same hook refused `git add … && git commit … \| grep`, told the agent to run `git push`, and did not say the `git add` had not run, so the next commit found nothing staged | `KAIZEN.md` 16:37; transcript: "no changes added to commit" | fixed in this PR: the hook now names the refused command, gives the matching example, and says nothing in the command ran (commit `bf93d2d`) |
| 08 | pr-description | The PR body checker refused one validation item at 122 characters against a limit of 100 | transcript | no-op: the gate worked; one edit fixed it |
| 09 | validation | Asked for the preview's code, the agent said it was production's password, citing a knowledge entry instead of the stack | transcript; `docs/knowledge/a-pragma-preview-cannot-be-signed-into.md` | merge into the-commit-that-reversed-an-adr-without-touching-it (step 5 of its chain) |
| 10 | validation | With the right group password, the preview answered *L'application n'est pas encore initialisée*, because commit `03bd354` had blocklisted every credential table | operator screenshot; commit `03bd354` | dantotsu: the-commit-that-reversed-an-adr-without-touching-it |
| 11 | validation | The agent offered to run the fixture seed, which wipes the preview's copy of production; the operator refused | transcript: "Nooon" | merge into the-commit-that-reversed-an-adr-without-touching-it (the seed was the only path left because the credentials were missing; with them cloned, it is not needed) |
| 12 | validation | The operator's screenshot showed the real group password in clear text | transcript | no-op: pointed out to the operator once, who decides whether to rotate it; nothing in the repository holds it |
| 13 | validation | `docs/knowledge/a-pragma-preview-cannot-be-signed-into.md` and its index line described the state before `03bd354` | commit `a0cf303` | merge into the-commit-that-reversed-an-adr-without-touching-it (rewritten in `a0cf303`) |
| 14 | post-merge | `DsqlSchema`'s error message offers the blocklist first, as if both lists were equally fine for a credential table | `infra/cdk/src/constructs/dsql-schema.ts:96` | merge into the-commit-that-reversed-an-adr-without-touching-it (its detection section; the message already points at ADR-0009, and the new check is what makes the choice binding) |
| 15 | post-merge | `apps/banana-rush` has an `h-dvh overflow-hidden` shell with form fields and a web manifest, the neighbouring shape of row 01 | `apps/banana-rush/site/src/components/organisms/AppShell.tsx:17` | surfaced to the operator: a single-screen game layout, so changing it is their layout decision |
| 16 | post-merge | `scripts/kaizen.sh` printed a usage line that listed `show` and not `archive`, so the archive step CLAUDE.md requires looked like a command that did not exist | `KAIZEN.md`, logged during the sweep | fixed in this PR: the usage line names `archive` |
