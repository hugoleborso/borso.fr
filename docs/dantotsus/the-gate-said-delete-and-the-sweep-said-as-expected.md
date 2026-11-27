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
    - It never offered the persister's own `buster` set to the build. It knew that option and built around its cost instead of asking.
      - It read PR #363's inventory row 04, which ends "Deriving the buster from the build would wipe every member's cache at each deploy, which is a product call nobody asked for." The sweep took that sentence as the operator's answer.
        - PR #363's sweep wrote row 04. It labelled an option a product call and recorded it as settled, without putting the question to the operator (`docs/features/meta/lessons-from-pr-363/inventory.md:14`).
  - When `kaizen-balance` went red in CI (added 366, removed 30 at `ba61136`), the sweep answered "as expected".
    - It followed the skill's sentence "A sweep that still adds more stays red, and the operator merges it or sends it back."

## Root cause of occurrence

*Thought the build-derived `buster` was an option the operator had already declined, because a merged inventory called it "a product call nobody asked for", actually nobody had asked him, and a product call is a question to put, not a reason to drop the option.* (Material)

The input from the previous workstation, row 04 of PR #363's inventory,
stated an unasked question as settled. CLAUDE.md was in the sweep's context
and says "Removing, narrowing or adding anything a user sees beyond the ask
is a product call [...] List each one in the question." Row 04 read as the
answer to that question, so the rule did not fire. Had the sweep known no one
had decided, it would have offered the one-line `buster` with its cost first
(inferred from the operator picking a costed option at 19:52).

`docs/dantotsus/built-my-own-before-checking-the-library.md` fixed a related
class at level 4 in May with a paragraph in `/implementation`.

## Detection failure causes

- **Skill:** step 2c of `/after-task-kaizen`, the library search, sat as prose between classification and writing. No gate fires at that step, and the sweep already knew the library option anyway.
- **Skill:** it told the sweep a red balance was acceptable, so the one count that saw the size did not stop it.
- **CI:** `kaizen-balance` ran only once the pull request was open, after the walk, its fixture and its tests were written.
- **Gate:** its refusal said "remove what each addition replaces". It did not ask whether a library already plays the role.
- **Inventory:** nothing reads an inventory row that calls an option a product call and checks that a question to the operator went with it.

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

The refusal in `scripts/kaizen.sh` reads today:

```
This sweep adds more code than it removes. Delete or simplify code to earn the additions.
For each file you wrote, name its role and look for it in a package already installed (node_modules/.modules.yaml) before keeping it. Offer that option to the operator even when it costs something he sees.
Then remove what each addition replaces, or clean up elsewhere, until this passes.
```

What it does not hold: it fires only once a sweep is over the balance. An
option dismissed as a "product call" in an inventory, a plan or a spec that
stays under the balance is never offered.

**Proposed:** a check in `.husky/pre-commit` over staged
`docs/features/*/*/inventory.md` and `plan.md` files refuses a line that
says "product call" unless the same line links the operator's answer or
carries the closed question to ask him. No inventory check exists today
(`grep -rln inventory scripts .husky`). That moves the
refusal to the moment the label is written, and makes "a product call nobody
asked for" impossible to record as settled.

Level 1 is not available. A sweep can always write code, and only a count
sees how much.

**Proof it can fail:** on a worktree of `ba61136`, the head that held the walk,
`scripts/kaizen.sh balance ba0557404` printed (measured on 2026-11-23, with
the wording of that day):

```
Balance: added 366, removed 30 outside what a sweep does not count
This sweep adds more than it removes. The best code is the code you do not write.
```

and exited 1.

**Similar instances:** `grep -rn "stays red\|as expected" .claude/skills` finds none left.
