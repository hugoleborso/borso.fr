---
date: 2026-10-12
introduced-at: conception
detected-at: review
severity: low
related-pr: '#118, #163, #167'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/skills/adr/SKILL.md, scripts/check-numbered-sequences.sh]
time-to-detect: hours
tags: [adr, git, agents, orchestrator, meta]
zone: docs/adr
recurs: [an-adr-number-goes-to-whoever-writes-it-first]
---

# The reservation nobody else could read

## Symptom

A coordinator running twelve agents reserved ADR numbers by message: 0028
for Sentry, 0029 for weak point management, 0030 for knowledge triggers. In
the meantime a kaizen pull request, #167, which never saw the message, merged
its own `0028-tailwind-merge-resolves-class-conflicts.md`. The Sentry branch
renumbered to 0031, and #118's three ADRs moved to 0032 to 0034. Each move
touches the file name, its heading and every citation.

## Root-cause chain

1. **Why did 0028 go to the wrong record?** #167 took the next number on
   main, which was correct from where it stood.
2. **Why did it not know 0028 was reserved?** The reservation was a message
   in one conversation, readable by the agents in it and by nobody else.
3. **Why was a reservation needed?** The `/adr` skill picks the highest
   number in the local `docs/adr` plus one, and the local folder cannot see
   other branches, so parallel branches all pick the same number.

**Root cause:** the coordinator thought a reservation was the way to keep
parallel branches apart, but only a pushed branch is visible to every agent,
and the allocation step read only its own checkout.

## Detection failure causes

- **CI / pre-commit:** `check-numbered-sequences.sh` refuses two records with
  one number once both are in one tree, which is after the second author
  has written, cited and pushed.

## Countermeasure

`plugins/borso-harness/scripts/next-adr-number.sh` fetches every branch on
origin and prints one more than the highest ADR number in this checkout or on
any of them. The `/adr` skill's numbering step now runs it, and says not to
take or hand out numbers by message.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

> **Superseded mechanism.** `next-adr-number.sh` was removed on 2026-10-29.
> A new ADR is now named after the UTC minute it was written,
> `YYYYMMDDHHMM-<slug>.md`, so parallel branches take different ids without
> reading each other and there is nothing left to allocate. The `/adr` skill's
> id step runs `date -u +%Y%m%d%H%M`, and `check-numbered-sequences.sh` still
> refuses two records that land in the same minute. Records `0001` to `0049`
> kept their numbers.

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

```bash
while read -r reference; do
  consider "$reference" "$(git ls-tree --name-only "$reference" "$ADR_DIRECTORY/" 2>/dev/null || true)"
done < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin)
printf '%0*d\n' "$ADR_NUMBER_WIDTH" $((highest + 1))
```

Run on this branch, it printed `0035` and named
`origin/claude/shared-availability-calculator-dfout2`, #118's branch, as the
holder of 0034, a number main does not have yet.

It takes the highest number on any branch, stale ones included. A skipped
number costs nothing, and the sequence already skips 0024 and 0025. Two
agents that both write an ADR before either pushes can still collide, and
`check-numbered-sequences.sh` still refuses the second.

**Sibling defects swept:** migrations are the other numbered sequence that
`check-numbered-sequences.sh` covers. They are numbered per app, and no
coordinator has reserved one, so they are left as they are.

## See also

- [`an-adr-number-goes-to-whoever-writes-it-first.md`](./an-adr-number-goes-to-whoever-writes-it-first.md)
