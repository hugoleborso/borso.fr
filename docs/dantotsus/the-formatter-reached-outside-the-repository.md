---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#45'
fix-commits: [516b92c81, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/format-write.core.ts, scripts/hooks/checks/format-write.core.test.ts]
time-to-detect: months (shipped 2026-08-10, seen on PR #171)
tags: [hooks, harness, agents, tooling]
zone: scripts/hooks/checks/format-write.core.ts
recurs: none (the-formatter-was-a-detector-with-no-writer added this hook; this is its scope, not a missing writer)
---

# The formatter reached outside the repository

## User impact

On PR #171, three agents each wrote one HTML mock-up sheet into the session
scratchpad, under a brief that capped each file at about 900 lines. Two of
them reported the same thing on their own: the file they wrote at about 600
lines was 2,000 lines when they read it back. Both logged it (`da-planche`,
`da-bronze`), and one wrote a build script to compact its own output again.
Expected: a scratchpad file stays byte for byte what the agent wrote.

## Causal chain

- The mock-ups grew from about 600 to 2,000 lines after they were written.
  - The `PostToolUse` hook `posttool-format-write.sh` ran Prettier on each
    file after its Write.
    - It filtered by extension only, so any `.html`, `.json` or `.ts` an agent
      wrote, anywhere on disk, was formatted with this repository's Prettier:

      ```sh
      case "$FILE" in
        *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css | *.html | *.yml | *.yaml) ;;  # ← ❌ no test of where the file lives
        *) exit 0 ;;
      esac
      cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
      pnpm exec prettier --write --ignore-unknown --cache "$FILE"
      ```

      - Commit `ebabfe765` (PR #45), written by an agent, added the hook. Its
        header speaks only of repository files: "format the file that was
        just written, so style drift never reaches the pre-commit gate". The
        hook received an absolute path and never compared it with the
        project root it `cd`-ed into one line later. The writer pictured
        every Write as a repository Write. **Man** (inferred: the writing
        session's transcript is not in the repository, so whether the
        scratchpad was named in its context cannot be read).

## Root cause of occurrence

*Thought every file an agent writes belongs to the repository, actually
agents write working files in the scratchpad too, and the repository's
formatting rules are not theirs.* Man (inferred): the hook already held the
project root, and the picture of "the file just written" as a repository file
won.

## Detection failure causes

- **Linter:** no gate reads a hook's scope.
- **Local validation:** the hook was best-effort and silent by contract, so a
  rewrite showed only when the writer read its file again.
- **Code review:** the hook's review asked whether it formats repository
  files correctly, which it did.

## Countermeasure

Commit `516b92c81` (PR #175) resolved the written file's real directory and
returned before Prettier when it was not under the project root. Fed the same
unformatted JSON three ways, a scratchpad path stayed byte for byte, and an
absolute and a relative repository path were both formatted.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`516b92c81`](https://github.com/hugoleborso/borso.fr/commit/516b92c81)
added the scope test to the shell hook. Commit
[`458e886c4`](https://github.com/hugoleborso/borso.fr/commit/458e886c4) deleted
`.claude/hooks/posttool-format-write.sh` and ported it to
`scripts/hooks/checks/format-write.core.ts`, which keeps the test:

```ts
export function isInsideProject(file: string, world: HookWorld): boolean {
  const resolved = world.run('realpath', ['-e', '--', world.projectDirectory, dirname(file)]);
  ...
  return `${fileDirectory}/${basename(file)}`.startsWith(`${projectRoot}/`);
}
```

The hook formats nothing outside the project root. This entry first said
level 1. The test is a runtime check inside one hook, so a second writer hook
could repeat the defect, and level 2 is what holds.

**Proposed:** delete the edit-time writer. Since commit `9b8d380ed`,
`.husky/pre-commit` formats exactly the staged files, which are always inside
the repository, and it covers writes made with `sed` and heredocs too.
Deleting `scripts/hooks/checks/format-write.core.ts` and its registration in
`scripts/hooks/hook-events.ts` would make this scope defect impossible, and
remove the hook's "read it again before an exact-text replace" notice.

**Proof it can fail:** `scripts/hooks/checks/format-write.core.test.ts` drives
a path outside the project and expects no format.

**Similar instances:** `grep -l "realpath" scripts/hooks/checks/*.core.ts`
lists the checks that act on the file just written. `lint-write.core.ts`
carries the same project-root test and reports without rewriting. Only
`format-write` rewrites the agent's file.
