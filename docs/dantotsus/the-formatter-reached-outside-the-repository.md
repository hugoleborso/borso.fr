---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#171'
fix-pr: none (the kaizen pull request that adds this file)
fix-commits: [self]
eradication-level: 1
eradication-paths: [plugins/borso-harness/hooks/posttool-format-write.sh]
time-to-detect: minutes
tags: [hooks, harness, agents, tooling]
zone: plugins/borso-harness/hooks/posttool-format-write.sh
recurs: none (the-formatter-was-a-detector-with-no-writer added this hook; this is its scope, not a missing writer)
---

# The formatter reached outside the repository

## Symptom

On PR #171 three agents each wrote one HTML mock-up sheet into the session scratchpad, under a brief that capped each file at about 900 lines. Two of them reported the same thing independently: the file they wrote at about 600 lines was 2,000 lines when they read it back. Both logged it to `KAIZEN.md` (`da-planche`, `da-bronze`), and one wrote a build script to compact its own output again.

## Root-cause chain

1. **Why did the files grow?** The `PostToolUse` hook `posttool-format-write.sh` ran Prettier on them after each Write.
2. **Why did it run on a file outside the repository?** It filtered by extension only. Any `.html`, `.json` or `.ts` the agent wrote, anywhere on disk, was formatted with this repository's Prettier.
3. **Why was that never noticed?** Until this task every Write an agent made was a repository file, where formatting is exactly what the hook is for. Mock-ups in the scratchpad were the first real files written elsewhere.

**Root cause:** thought every file an agent writes belongs to the repository, actually agents write working files in the scratchpad too, and the repository's formatting rules are not theirs.

## Detection failure causes

- **Linter / static analysis:** no gate reads a hook's scope.
- **Functional validation locally:** the hook is best-effort and silent by contract, so a rewrite shows only when the writer reads its file again.
- **Code review:** the hook's review asked whether it formats repository files correctly, which it does.

## Countermeasure

- **Code:** this commit resolves the written file's real directory and returns before Prettier when it is not under the project root.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commit adding this file.

**The actual fix:**

```diff
 cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
+
+PROJECT_ROOT=$(pwd -P)
+FILE_DIRECTORY=$(cd -- "$(dirname -- "$FILE")" 2>/dev/null && pwd -P) || exit 0
+FILE_PATH="$FILE_DIRECTORY/$(basename -- "$FILE")"
+case "$FILE_PATH" in
+  "$PROJECT_ROOT"/*) ;;
+  *) exit 0 ;;
+esac
```

Checked by feeding the hook the same unformatted JSON three ways: a scratchpad path stays byte for byte, and an absolute and a relative repository path are both formatted. `cd` and `pwd -P` rather than `realpath -m`, which macOS lacks, because the hook ships in a plugin other machines install.

**Sibling defects swept:** the other `PostToolUse` hooks read tool output, not files, and write nothing.

## See also

- [`the-formatter-was-a-detector-with-no-writer.md`](./the-formatter-was-a-detector-with-no-writer.md), which added the hook.
- [`../knowledge/parallel-agents-share-one-scratchpad.md`](../knowledge/parallel-agents-share-one-scratchpad.md)
