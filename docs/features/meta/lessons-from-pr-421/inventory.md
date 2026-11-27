# Friction inventory, PR #421

PR #421 added a visitor QR code to pragma's members' home and to each concert's
public page tab. Session `session_01K69KnDb8qvv4dWNHm4zcQG` shipped it. Its
`context_usage.used_tokens` read 231,803 after the merge, over 150,000, but the
operator asked to run the sweep in that session, so it ran there.

Sources: `scripts/kaizen.sh sweep-input 9c780aa4`, which gave 11 lines from
seven writers (`impl`, `validator`, `validator2`, `visual`, `visual2` and two
hooks). Also the operator's six messages and two answers, read in the session
itself, and its own turns, hook refusals included. The four validation reports,
CI (green at its first run on `aad66c08`), and the PR conversation, which holds
only the preview and screenshot bots. No `kaizen` pull request is open
(`gh api search/issues` with `label:kaizen is:open`).

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | implementation | On a phone the QR code was 23 px narrower than the sheet | report:docs/features/pragma/visitor-qr-code/validation/visual-validation-2026-11-27-1450.md row 12; commit:4bed7260 | The implementation brief named `max-w-80`, a cap at every width, and the agent followed the brief over the spec | The main session's hand-written brief, which never named `/implementation` | dantotsu: the-brief-that-rewrote-the-spec-in-class-names |
| 02 | implementation | No test read what the code encodes or its quiet zone | report:docs/features/pragma/visitor-qr-code/validation/technical-validation-2026-11-27-1435.md rows D11, D14; commit:6aa6f196 | The brief listed three presence checks as the tests to write | Same brief; `/implementation` asks an assertion per use case (`.claude/skills/implementation/SKILL.md:93`) | merge into the-brief-that-rewrote-the-spec-in-class-names |
| 03 | implementation | Two test names said more than they checked, and two `Held by:` lines were missing | report:technical-validation-2026-11-27-1435.md rows B08, B25 | The agent wrote to the brief, not to the implementation standard | Same brief | merge into the-brief-that-rewrote-the-spec-in-class-names |
| 04 | implementation | `scripts/phone.sh touch` exited 1 with no message when no `phone` session was open | archive line `impl` 14:32; reproduced this session: `exit=1`, nothing printed | `set -euo pipefail` ended the script inside `cdp_port`, before the `fail` that names the missing session | none, local to the script | fixed: scripts/phone.sh now prints `[phone] no 'phone' session` (measured) |
| 05 | implementation | A subagent ran Prettier in a repository that formats with oxfmt | archive line `hook:no-prettier` 14:31 | An agent's habit from other repositories | none, the hook refused it before it wrote | no-op: `no-prettier` is the eradication and it fired |
| 06 | validation | `test:e2e --changed` printed "No test files found", and the validator's rule says such a run is no pass | archive line `validator` 14:42; report row C02 | The rule in `.claude/agents/technical-validator.md` had no case for a site-only diff | The validator definition | fixed: the rule names the site-only exception and asks for the count |
| 07 | validation | No organism blueprint fits a button that owns its sheet's open state | archive line `validator` 14:42 | `organism-presentational` says "owns no state", while 9 of its 83 followers hold a `useState` (measured, grep) | The blueprint's usage line in `SongCard.tsx` | no-op: one validator note, no defect; rewording it is a pragma deploy and a browser pass for a comment, too small to pay that |
| 08 | validation | The coverage table printed `0/0 Unknown%` when only a test changed | archive line `validator2` 14:48 | No gated source file changed, so there was nothing to cover | none | no-op: the table is right; the validator read the test run beside it |
| 09 | validation | Four agents looked for a QR decoder and found none | archive lines `visual` 14:54, `visual2` 15:00; `impl` hand-back; main session decoded with jsqr | The sandbox has no decoder, and nothing said how to get one | none, an environment fact | knowledge: decoding-a-qr-code-in-the-sandbox |
| 10 | validation | A `snapshot -i` grep matched the root node, and clicking its ref opened the wrong sheet | archive line `visual` 14:54 | The grep took the first line that contained the label, which was an ancestor | none | no-op: one agent, one extra click, recovered by matching the button role; too small for an entry |
| 11 | validation | The resource timing buffer was full after one navigation | archive line `visual` 14:54 | Vite loads hundreds of modules | none | no-op: already in `agent-browser-cli-quirks.md` ("a full resource timing buffer under Vite") |
| 12 | validation | The seed holds no practice session, so the validator created one by hand | archive line `visual2` 15:00 | The default seed is concert-centred | none | no-op: `POST /api/__test/seed?practice=today` adds one, as `driving-pragma-auth-from-a-validator.md` says |
| 13 | pr-description | The first `create_pull_request` was refused for lack of a visual-validation report | archive line `hook:visual-validation` 14:49 | The main session went from technical validation to `/open-pr` | none | no-op: the hook held the PR before it opened, for one call |
| 14 | pr-description | `screens-shown` asked to publish pending screenshots on a push made before the PR existed | session turn after commit `4bed7260` | The check read any push as a push to an open PR, but the upload folder is named after its number | `scripts/hooks/checks/screens-shown.core.ts` | fixed: a push only counts once the session has opened a PR |
| 15 | pr-description | `check-pr-body` refused a Validation item over 100 characters, twice | session turns before PR #421 | The writer wrote prose where the budget wants a line | none | no-op: the checker refused it locally, before any post |
| 16 | conception | The first answer to "génère un qr code" was a PNG, and the operator's "Go" led to a question about where to keep it | operator messages 1 to 3 | The request named a file and the intent was a feature | none | no-op: the file was cheap and reversible, then one closed question settled it, as CLAUDE.md asks |
| 17 | post-merge | Signing in to the preview to scan the code failed with the seeded password | session turn after the preview comment | Previews clone production passwords (`apps/pragma/cdk/test/stack.test.ts:193`) | none | no-op: by design; the gap went to the operator as a scan on the preview |
| 18 | implementation | The stop hook flagged uncommitted changes while a subagent was writing | session stop-hook feedback | The subagent wrote in the shared checkout, as CLAUDE.md allows for one agent | none | no-op: committed once the agent handed back |
