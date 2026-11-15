# Friction inventory of PRs #331, #332, #333, #335 and #337

One session, `session_01K69KnFKamw16kPJs4YikHZ`, shipped five pull requests
from one branch, `claude/determined-bell-qv15df`, on 2026-11-14. Four fixed
iOS bugs in pragma, and #335 declared borsouvertures' externals in its
architecture manifest. The sources were:

- `scripts/kaizen.sh sweep-input <merge>` on each merge. It listed 6 lines in
  four archives, all written by `main` or a hook, and found no archive for
  #335 (`7d7a496cc`);
- the commit messages and file lists of the five merges;
- the pull requests' comments, all from the preview bot, and no review thread;
- the `wiki` workflow runs on `main`, and the failed job logs of runs
  `43632826902` and `43488274525`;
- the open kaizen pull requests #334 and #340, read for overlap;
- `get_session` on the one session in the commits' trailers.

No subagent wrote to the logs. The four iOS lines come from one writer and
describe one wall four times, which is what promotes them above a local fix.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The broad-kill hook refused `pkill` or `killall` | kaizen:`hook:no-broad-kill` 14:38 (#331) | merge into PR #334, whose `the-kill-recipe-that-left-the-server-listening` puts a working process-group stop in the refusal |
| 02 | implementation | No iOS WebKit in the sandbox, so the keyboard and fixed-position bug could not be reproduced before the preview | kaizen:`main` 14:38 (#331); `ls /opt/pw-browsers` lists Chromium only (measured) | dantotsu: four-iphone-fixes-checked-in-a-browser-that-could-not-fail |
| 03 | post-merge | The first fix did not cover a text field inside a sheet, so the setlist note stayed under the keyboard | kaizen:`main` 15:13 (#332) | merge into four-iphone-fixes-checked-in-a-browser-that-could-not-fail |
| 04 | post-merge | The bottom gap read `offsetTop` as-is, so the bounce at the top of a page lifted the tab bar | kaizen:`main` 19:21 (#333), commit:`9aaf0398a` | merge into four-iphone-fixes-checked-in-a-browser-that-could-not-fail. The clamp in #333 and `overscroll-behavior-y: none` in #337 both remove it, with two bounce tests |
| 05 | post-merge | The sheet footer rule guessed Save by `type=submit`, so the plain Save of the transition comment hid while typing | kaizen:`main` 19:21 (#333), commit:`9aaf0398a` | no-op. #333 replaced the guess by `isFooterHiddenWhileTyping`, a prop a sheet declares, with `Sheet.test.tsx` cases. The class is named in the knowledge table |
| 06 | post-merge | A header strip vanished on iPhone after a page bounce, and no tool here renders WebKit | kaizen:`main` 20:58 (#337) | merge into four-iphone-fixes-checked-in-a-browser-that-could-not-fail |
| 07 | post-merge | Four iOS pull requests were each merged about twenty minutes after opening, and the next bug was found on the phone after the merge | PR #331 opened 14:40, merged 15:00 UTC (measured) | merge into four-iphone-fixes-checked-in-a-browser-that-could-not-fail. pragma now reports a misplaced tab bar or a hidden focused field to Sentry from the phone itself |
| 08 | post-merge | The `wiki` workflow on `main` failed from #324 to #332 because the talos manifest lacked `browser-location` | `list_workflow_runs wiki.yml`: 7 failures from `02755aa1a` to `161640e47`; commit:`f9eda3e6d` | dantotsu: the-manifest-check-that-only-ran-after-the-merge |
| 09 | post-merge | The `wiki` workflow failed again from #321 to #333 because the borsouvertures manifest lacked `aws-dsql` | job `132562985422` log; commit:`7d7a496cc` | merge into the-manifest-check-that-only-ran-after-the-merge |
| 10 | implementation | A pragma pull request (#332) carried a talos manifest fix, because a red `main` was nobody's task | commit:`f9eda3e6d` | merge into the-manifest-check-that-only-ran-after-the-merge. With the check on pull requests, the author of the tag meets it |
| 11 | post-merge | #335 archived no friction log | `sweep-input 7d7a496cc` | no-op. Its whole diff is the manifest entry the failing job named, and its friction is rows 08 and 09 |
| 12 | post-merge | The iOS knowledge entry already said a Chromium resize is not a phone test, and no trigger printed it while the adapters were written | `agentic-device-testing.md` triggers before this sweep | fixed: this PR. Path triggers on `*viewport*`, `*keyboard*` and `Sheet.tsx`, proved by feeding the hook an Edit of `visual-viewport.adapter.ts` |

| 13 | pr-description | The sweep offered the operator a per-PR iPhone checklist, then a WebKit run of a browser suite pragma does not have. He refused tasks handed to him | transcript: the operator's reply in this sweep's session, kaizen:`main` | merge into four-iphone-fixes-checked-in-a-browser-that-could-not-fail, whose eradication is now a detection that needs nobody |

Counts: 2 dantotsus, 8 merged into them, 1 fixed, 2 no-op.
