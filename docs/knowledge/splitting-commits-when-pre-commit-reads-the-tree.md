---
summary: 'Pre-commit reads the whole tree, so split commits with stash --keep-index --include-untracked, and stage a rename only when its commit is next.'
triggers:
  commands:
    - 'stash\s+push\s+.*--keep-index'
---

# Splitting commits when pre-commit reads the whole tree

Several pre-commit checks read the working tree, not only the staged files:
`check-named-paths-exist.sh` follows paths named in workflows and hooks,
`check-coupled-lists.sh` compares `docs/knowledge/` against its README, and
the link check opens every link in every tracked markdown file. So with work
for two commits on disk, the first commit can fail on a file that belongs to
the second: a workflow cites a dantotsu not yet written, or a README links an
entry still untracked.

## Splitting the work

Stage the first commit's paths, then hide everything else:

```bash
git add <paths of commit one>
git stash push --keep-index --include-untracked -m rest
git commit ...
git stash pop
```

## The trap

`--keep-index` keeps everything staged, and a `git mv` stages its rename the
moment it runs. On PR #154 a rename meant for the second commit was already
staged, so it went into the first commit with the content of the old file,
and `stash pop` then conflicted on the renamed path. Check `git diff --cached
--stat` before committing, and stage renames only when their commit is next.
