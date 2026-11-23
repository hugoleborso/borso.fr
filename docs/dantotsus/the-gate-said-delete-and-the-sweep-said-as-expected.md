---
date: 2026-11-23
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#399'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-push, scripts/kaizen.sh, .claude/skills/after-task-kaizen/SKILL.md]
time-to-detect: 70 minutes
tags: [kaizen, ci, deps, skills]
zone: .claude/skills/after-task-kaizen/SKILL.md
weak-point: prose-stands-in-for-a-check
recurs: [built-my-own-before-checking-the-library]
---

# The gate said delete, and the sweep said "as expected"

## User impact

The operator corrected the sweep of PR #395 three times before it reached
for the library it already imported (measured, his messages in
`session_01K69KnBaHhTLkshdgJbYDuV`).

| | Seen | Expected |
| --- | --- | --- |
| 19:52 | "Meh. Cache management whose code you write by hand?" The next options were all hand-written, and he picked the TypeScript 7 compiler one | TanStack Query's own `buster`, set to the build, offered with its cost |
| 20:28 | "In your query library there are surely things that handle the cache. You're rewriting too many scripts." | Nothing to say |
| 20:49 | "Saying 'as expected' is really unpleasant. It's not 'as expected', it's 'you figure it out'." | A sweep that deletes until `kaizen-balance` is green |

## Causal chain

- The operator spent three messages and 70 minutes steering a sweep to a one-line fix.
  - The sweep shipped a 137-line compiler walk, a fixture and a mutation suite to derive the cache buster (commits `eb52a28`, `ba61136`).
    - It never offered the persister's own `buster` set to the build. PR #363's sweep had called that "a product call nobody asked for", so this sweep built around the cost instead of asking.
      - Step 2c of `/after-task-kaizen`, the library search, sat as prose between classification and writing. Nothing fires there.
  - When `kaizen-balance` went red in CI (added 366, removed 30 at `ba61136`), the sweep answered "as expected".
    - The skill said "A sweep that still adds more stays red, and the operator merges it or sends it back." It permitted the red.

## Root cause of occurrence

*Thought a written step would make the sweep search the installed libraries before writing code, actually the only point that reliably fires is the gate that counts the lines, and the skill told the sweep that gate could stay red.*

`docs/dantotsus/built-my-own-before-checking-the-library.md` fixed the same
class at level 4 in May with a paragraph in `/implementation`. This sweep had
three paragraphs saying it (that one, step 2c, and `/technical-conception`'s
pattern pass), and read none at the moment it mattered.

## Detection failure causes

- **CI:** `kaizen-balance` ran only once the pull request was open, after the walk, its fixture and its tests were written.
- **Skill:** its refusal said "remove what each addition replaces". It did not ask whether a library already plays the role.

## Countermeasure

The sweep of PR #395 replaced the walk with `buster: __BUILD_VERSION__`
(commit `fe4ddbe`) and deleted a finished migration script (commit `64b7b4d`).

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

`pre-push` runs the balance on every `claude/lessons-from-*` branch, so the
first push of a heavy sweep is refused before its pull request opens. The
refusal asks for the library at the moment it fires. Step 2c is deleted, and
the sentence that allowed a red balance is gone.

```diff
+case "$(git branch --show-current)" in
+  claude/lessons-from-*) scripts/kaizen.sh balance || exit 1 ;;
+esac
```

```diff
-This sweep adds more than it removes. Remove what each addition replaces, or fold it into a file that exists.
+This sweep adds more than it removes. The best code is the code you do not write.
+For each file you wrote, name its role and look for it in a package already installed
+(node_modules/.modules.yaml) before keeping it. Offer that option to the operator even
+when it costs something he sees.
+Then remove what each addition replaces, or clean up elsewhere, until this passes.
```

Level 1 is not available. A sweep can always write code, and only a count
sees how much.

**Proof it can fail:** on a worktree of `ba61136`, the head that held the walk,
`scripts/kaizen.sh balance ba0557404` printed:

```
Balance: added 366, removed 30 outside what a sweep does not count
This sweep adds more than it removes. The best code is the code you do not write.
```

and exited 1.

**Similar instances:** `grep -rn "stays red\|as expected" .claude/skills` finds none left.
