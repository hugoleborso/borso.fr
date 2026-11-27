---
date: 2026-08-18
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#59'
fix-commits: [0770ef3fe4, ef6b988c9]
eradication-level: 2
eradication-paths: [scripts/check-no-racy-pipelines.sh, .husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: hours
tags: [ci, gates, shell, meta, self-improvement-loop]
zone: scripts/check-mutation-covers-gated-files.sh
recurs: none (the first entry on a walk piped into an early-exiting reader under pipefail)
---

# The gate that failed on a broken pipe

## User impact

The `build` job of PR #62 failed, twelve minutes after PR #59 merged the check
it failed in. PR #62 changed no application code. The whole error:

```
find: ‘standard output’: Broken pipe
find: write error
##[error]Process completed with exit code 1.
```

| | Seen | Expected |
| --- | --- | --- |
| PR #62, `build` | red on a broken pipe, with nothing about mutation configuration | green, since the change touched no gated file |

Measured locally on 2026-08-18: the script failed once in five runs before the
fix, and zero in thirty after it.

## Causal chain

- The `build` job of PR #62 failed with `find: write error`.
  - `scripts/check-mutation-covers-gated-files.sh` exited 141, which is 128 plus SIGPIPE.
    - `set -o pipefail` gave the pipeline `find`'s status, and `set -e` ended the script on it.
      - `find` wrote a path after `head -1` had printed its line and closed the pipe, so `find` took SIGPIPE.
        - `find` was still walking. `-not -path '*/node_modules/*'` filters each path but does not prune, so it walked tens of thousands of dependency paths against a reader that stops at one.
        - The faulty line, written twice in the script by commit `01e8a281d`:

```bash
  gated=$(find "$workspace" -type f \
    \( -name '*.core.ts' -o -name '*.utils.ts' -o -name '*.adapter.ts' \
    -o -name '*.core.tsx' -o -name '*.utils.tsx' -o -name '*.adapter.tsx' \) \
    -not -path '*/node_modules/*' -not -path '*/.stryker-tmp/*' \
    -not -name '*.test.*' | head -1)   # head exits after one line, find keeps writing
```

          - An agent wrote `01e8a281d` to add the mutation coverage gate. It asked "is there at least one gated file" with `| head -1`, in a script that opens with `set -euo pipefail`.

## Root cause of occurrence

*Thought `| head -1` asks whether anything matched, actually under `pipefail`
it kills the producer mid-write, and whether that ends the script depends on
how much the producer still had to write.* (Material)

The right answer was absent from the agent's context when it wrote the line.
At the parent commit, `git grep -il 'sigpipe\|broken pipe' 01e8a281d^` finds
nothing, `git grep -- '-print -quit' 01e8a281d^` finds no example to copy, and
no shell linter ran. Had the agent known, it would have written `-print -quit`,
which asks the same question with no pipe.

## Detection failure causes

- **Typing:** shell has none.
- **Linter:** `actionlint` reads workflow YAML, not the scripts a workflow calls. No shellcheck ran in this repository.
- **Local validation:** the race passes most runs on a small tree (one failure in five, measured).
- **CI:** green on the pull request that added it, because on that run `find` finished before `head` closed the pipe.
- **Review:** `find … | head -1` reads as idiomatic, and it is outside `pipefail`.

## Countermeasure

Commit `0770ef3` replaces both existence tests with `find … -print -quit`.
`-quit` stops the walk at the first match. No pipe is left, so no signal can
be raised, and the walk is shorter.

```diff
-    -not -name '*.test.*' | head -1)
+    -not -name '*.test.*' -print -quit)
```

The script itself was later deleted, in `c54e32da7` (#224).

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `ef6b988c9` added `scripts/check-no-racy-pipelines.sh`.
`.husky/pre-commit:361` runs it on staged shell scripts and hooks.
`.github/workflows/ci.yml:163` runs it on every tracked one. It fails a script
that pipes a walking producer (`find`, `git ls-files`) into a consumer that
stops early (`head`, `grep -q`). It joins backslash continuations first,
because this `find` spread over five lines.

```bash
RACY_PIPELINE='(find|git ls-files)[^|]*\|[[:space:]]*(head|grep -q)'
```

**Proof it can fail:** on 2026-11-27, a scratch `scripts/zz-planted-writer17.sh`
with `set -euo pipefail` and a `find` split over two lines into `| head -1`,
checked and then deleted:

```
[check-no-racy-pipelines] scripts/zz-planted-writer17.sh pipes a directory walk into a consumer that stops early:
    3:x=$(find . -type f   -name "*.ts" | head -1)
[check-no-racy-pipelines] under `set -o pipefail` the producer's write error fails the script, and whether it happens is timing. Use `find … -print -quit`.
```

It exited 1.

**What stays possible:** a walk assembled through a variable
(`producer="find …"; $producer | head -1`) passes the check.

**Similar instances:** in 2026-08 the hook `.claude/hooks/pretool-gh-pr-create.sh`
had `find docs/features -type d -name validation | head -n1` under `pipefail`
and moved to `-print -quit`. That hook no longer exists. Today
`scripts/check-no-racy-pipelines.sh` with no argument prints "no script pipes a
directory walk into an early-stopping consumer" (measured 2026-11-27).
