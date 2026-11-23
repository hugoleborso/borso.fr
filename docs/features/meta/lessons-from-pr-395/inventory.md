# Friction inventory of PR #395

PR #395 shipped pragma's flames redesign. This sweep ran in its own session,
because the shipping session ended at 355,327 tokens of context, above the
150,000 threshold (measured, `get_session` `context_usage.used_tokens`).

Sources: `scripts/kaizen.sh sweep-input 82d20cae1` (6 lines, 1 archive), the
8 commits, the 3 validation reports, the PR's 2 bot comments and 0 review
threads, and the open pull requests (no open `kaizen` one). Writers: `main` 2,
`impl` 1, `technical-validator` 1, `visual-validator` 2. Each logged a
different wall, so none is systemic by count.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | spec | Mockups redrew the rest of the Home screen from memory instead of drawing the change over a capture. | log: `main` 13:07; commit:7b285c09 | The mockup hook named no capture to draw over | none, the hook is where mockups start | no-op: eradicated in #395, `.claude/hooks/pretool-mockup-reads-visual-rules.sh` now names the capture |
| 02 | spec | The mockup-rule commit shipped in both #394 and this branch, and merging #394 back conflicted on the hook. | commit:2fb3d1e2 | One commit split into a second PR mid-task | none, a one-time split by this session | no-op: one merge commit, no rule would have prevented a deliberate split |
| 03 | implementation | The verb lint refused a test helper as `list…`, then `find…`, before `get…` passed. | log: `impl` 13:23 | The lint messages pointed at docs/standards/01-naming.md instead of carrying the verb table | `eslint-rules/verb-promises-match-return-type.js` | fixed: both messages now carry the verb table |
| 04 | implementation | Knip refused the push on an exported type nothing read. | commit:3cba8ad5 | Knip runs at pre-push only | none, the gate caught it before review | no-op: the gate worked, the fix was one deletion |
| 05 | validation | The branch head moved by a commit while round 1 ran. | log: `technical-validator` 13:42 | Row 04's fix landed after the dispatch | none, the round protocol records the reviewed SHA and round 2 reads what followed | no-op: absorbed by the recorded `Reviewed:` SHA |
| 06 | implementation | The persisted cache buster stayed `'2'` while `GET /api/streaks` gained `week`, which would crash the sheet on restored data. | report: technical-validation-2026-11-23-1329.md A12; log: `main` 13:47; commit:79fc9da5 | A version string bumped by hand, tied to no type | `apps/pragma/site/src/lib/query-client.setup.ts`, and PR #363's sweep, which chose a knowledge entry | dantotsu: a-version-string-nobody-remembers-to-bump |
| 07 | implementation | The knowledge entry naming the buster rule did not prevent row 06. | `docs/knowledge/a-pragma-response-shape-change-needs-the-cache-buster.md` triggers on `api/src/**/*.core.ts`, which #395 edited; the field came from `domain/` | A level 5 reminder standing in for a mechanism | weak point `prose-stands-in-for-a-check` | merge into a-version-string-nobody-remembers-to-bump; the entry is deleted |
| 08 | validation | Round 1 found no test pinning the chip's singular name. The fix copied Home's label composition into a FlameChip test marked as a component render, and round 2 left that open. | report: 1329 D05, 1350 B07 | Home builds the label inline, so the test rebuilt it by hand | `apps/pragma/site/src/routes/home/HomePage.tsx` | fixed: the singular case now mounts Home in `HomePage.test.tsx`, and the copy is gone |
| 09 | validation | A spent joker read as a bare "Wed" to a screen reader. | report: 1329 Notes | The visible short day was the only text | `apps/pragma/site/src/components/molecules/JokersCard.tsx` | fixed: the short day is hidden from screen readers, which hear "Wed, saved by a joker" |
| 10 | validation | `formatWeekday` builds an `Intl.DateTimeFormat` per call, 14 per render. | report: 1329 Notes | none measured | none | no-op: seven cells, and no slow render was reported (inferred) |
| 11 | validation | The 20:00 push text and the assistant read could not be seen in a browser. | report: visual-validation rows 30 to 33 | A push is not a screen | none | no-op: `sw/service-worker.test.ts` and `streak-reminder.core.test.ts` cover them, both changed in #395 |
| 12 | validation | `agent-browser network route` on `/api/streaks` never matched, because pragma sends reads as one `POST /api/read-batch`. | log: `visual-validator` 13:49 | The batching is invisible from the route list | `docs/knowledge/driving-previews-with-agent-browser-and-argent.md` named the saved cache but not the batch | knowledge: driving-previews-with-agent-browser-and-argent, extended and triggered on `network route` |
| 13 | validation | The saved query cache restored old streak data over the mocked payload. | log: `visual-validator` 13:49 | The entry already says it, but triggers only on a preview URL or the dev-server start | the validator mocked because the seed lacks the flame states | merge into driving-previews-with-agent-browser-and-argent |
| 14 | post-merge | The shipping session ran past the threshold and handed the sweep over. | `get_session` 355,327 tokens | A long feature session | none | no-op: the hand-off is the rule working |
