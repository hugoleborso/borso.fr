# Friction inventory — PR #136

Every friction event from the first screenshot of the instruments page to the
merge of PR #136, in the order it happened. The entries the decision column
names are in [`docs/dantotsus/`](../../../dantotsus/).

`KAIZEN.md` carried 2 entries, both written by hooks as they refused a command
(`no-broad-kill`, `no-swallowed-push`), and none logged by hand. The task ran
no subagents. So most rows below come from the transcript and the commits, and
the hand-logging gap is itself row 17. The log is archived beside this file as
[`kaizen.md`](./kaizen.md).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | Member avatars on the instruments page showed other colours than the ones picked on the members page | transcript: operator screenshots | dantotsu: the-chip-that-rounded-every-colour |
| 02 | conception | "Je ne peux pas sélectionner toutes les icônes" could mean a broken picker or a missing glyph; the picker worked, so one question settled it | transcript: AskUserQuestion, answer "Wider set" | no-op: one question resolved a genuine ambiguity, which is the intended path |
| 03 | implementation | The icon set had six glyphs, so choir, brass and stage roles fell back to the generic note | commit: acd8d10 | no-op: a product gap, closed by the feature itself |
| 04 | implementation | A browser check clicked a ref taken before a page reload and read the wrong form state, nearly reporting a persistence bug that did not exist | transcript: "Generic" after reload, then "Keys" on a fresh snapshot | no-op: `scripts/browser.sh` already warns that refs belong to one snapshot; retaking the snapshot fixed it at once |
| 05 | implementation | The dev fixture seeded every instrument with the fallback icon, so five identical glyphs could not show the icon work | transcript: local screenshots | fixed: 43781d5 |
| 06 | implementation | `dev:db` printed the shared password but no name to sign in with; the seed had to be grepped | transcript: grep of test-seed-fixture.core.ts | fixed: 43781d5 |
| 07 | implementation | `Icon.tsx` passed the 300-line cap after six glyphs were added | transcript: `max-lines` error | no-op: the gate worked; the glyphs moved to their own atom |
| 08 | implementation | A kebab-case `instrument-glyphs.tsx` in a folder of PascalCase atoms was refused by convention-drift | commit: 7f7c1aa | no-op: the gate worked as designed |
| 09 | implementation | The convention-drift refusal arrived under "generated files are stale", which named the wrong problem | transcript: pre-commit output | merge into the-gate-that-refused-its-own-output |
| 10 | implementation | Two commits were refused because the gitignored blueprint index was older than the tree | transcript: "blueprint-index.md is out of date" twice | dantotsu: the-gate-that-refused-its-own-output |
| 11 | implementation | `pkill` was refused by the no-broad-kill hook | kaizen.md, line 1 | no-op: the hook did its job |
| 12 | implementation | The hook's recovery advice, `ss -lptn`, failed: `ss` is not installed | transcript: `ss: command not found` | dantotsu: the-no-op-that-named-its-fix |
| 13 | implementation | `git commit` piped into `grep` was refused by the no-swallowed-push hook | kaizen.md, line 2 | no-op: the hook did its job; the commit was rerun with output to a file |
| 14 | implementation | A commit after two refused attempts swept in every file those attempts had staged | transcript: kaizen branch, first commit took 7 files | no-op: caught before push and split; `git add` of explicit paths is the CLAUDE.md rule, and a refused commit leaving its staging behind is git's normal behaviour |
| 15 | implementation | The operator's lineup requests arrived one at a time mid-turn (two mics, no unused instruments, whole lineup, no grey slots), and the first implementation of seat counts was thrown away | transcript: four messages in one turn | no-op: requirements arriving during the work; the discarded code was about ten minutes and never committed |
| 16 | validation | Stryker left a surviving mutant on the overflow counter's `>= 1`, which no test could kill because the counter is wider than a slot | ci: pre-push mutation-pragma, 97.62% | no-op: the gate found a redundant rule, and removing it was the fix (e4f3498) |
| 17 | post-merge | No friction was logged by hand during the task; the inventory was rebuilt from the transcript | kaizen.md has 2 hook-written lines | no-op: CLAUDE.md already requires it; this sweep recovered every row from the transcript |
| 18 | post-merge | The fixture test still held primary instruments under "members plus two", a budget PR #136 removed from the setlist row | apps/pragma/api/src/__test/test-seed-fixture.core.test.ts | fixed: 43781d5 |
