---
date: 2026-05-12
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#11'
fix-commits: [17782f10ec, ff6446f6ac]
eradication-level: 2
eradication-paths: [eslint-rules/no-abbreviated-identifier.js, eslint-rules/conditions-live-in-pure-functions.js, .oxlintrc.json]
time-to-detect: hours
tags: [skill, implementation, plan, code-quality, technical-validation]
zone: .claude/skills/implementation
---

# The plan named the one-letter local, and the code shipped it anyway

## User impact

`/technical-validation` on PR #11 returned FAIL with five rows. The operator got
a branch that needed a second round for defects its own plan had predicted.

| | Seen | Expected |
| --- | --- | --- |
| `App.tsx:83-104` | `ALL_YEARS.map((y) => …)` uses `y` six times in a 22-line closure, and `.find((m) => m.m === selected)` at line 34 | named locals, as the plan's last self-check bullet asked: "Variable `y` in App.tsx's year-switch button ... rename in impl" |
| Rows D11 to D14 | `pickDefaultMonth` and its siblings left inside `App.tsx`, untestable | extracted to `data.utils.ts` with `today: Date` injected, as the plan asked |

## Causal chain

- The validator failed `App.tsx` on one-letter locals and on logic left in the
  component.
  - The implementing agent wrote `ALL_YEARS.map((y) => …)` and kept the
    clock-dependent pickers inside `App.tsx`.
    - It walked the plan's *How each spec decision becomes code* table top-down,
      as `/implementation` step 3 said, ran the named gates, and pushed. The
      plan's §3 *Code-quality self-check*, loaded with the rest of `plan.md`,
      was not walked again.
      - The rule against one-letter locals lived in `CLAUDE.md` as prose, and
        the §3 bullet was a hand copy of it.

## Root cause of occurrence

*Thought writing the code from the plan's table and passing the gates was the
whole loop, actually the plan's §3 listed risks no gate checked, and nothing in
the loop came back to it.* (Man)

The plan was in the agent's context, since step 1 of the skill reads `plan.md`
end to end (inferred, no transcript survives), and it named `y` explicitly. The model's
habit of short callback parameters won over a document it had read. Under the
standard's rule for an agent, the fix is a gate that holds when the habit wins,
not one more step to read.

## Detection failure causes

- **Linter:** Biome had no rule for one-letter identifiers, and no repository
  plugin held it. The rule was prose in `CLAUDE.md`.
- **Pre-flight gates:** the implementation skill named typecheck, lint, knip and
  build. None reads a plan.
- **Behaviour tests:** a one-letter local works. Only reading catches it.

## Countermeasure

Commit `17782f10ec` renames `y` to `candidateYear`, `m` to `candidateMonth` and
`n` to `matches`. It extracts `pickDefaultMonth`, `pickDefaultYear`,
`selectYearData` and `selectFeaturedMonth` to `data.utils.ts` with `today: Date`
as a parameter, and adds four unit tests. The validator's re-run passed.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`ff6446f6ac`](https://github.com/hugoleborso/borso.fr/commit/ff6446f6ac)
wrote the repository's lint rules. Two of them refuse both defects at lint time,
under `apps/**/*.{ts,tsx}` in `.oxlintrc.json`.

- `borso/no-abbreviated-identifier`: "`{{name}}` is too short to say what it
  holds. ... keep a single letter for a `for` header counter."
- `borso/conditions-live-in-pure-functions`: "Move this decision into a pure
  function in a `.core.ts` or `.utils.ts` file". A picker that branches on the
  date inside a component trips it (inferred from the rule's message, not
  replayed on `App.tsx`).

The entry first shipped step 3a in `.claude/skills/implementation/SKILL.md`,
"Re-walk the plan's §3 Code-quality self-check section bullet by bullet". That
step is still there. It is a written instruction to an agent that had the plan
in context, so the lint rules are what hold.

**Proof it can fail:** `eslint-rules/no-abbreviated-identifier.test.js` asserts
`tooShort` on `const x = 1;` and on the parameter of `function at(p) { return p; }`.

**Proposed:** subtract from the plan template. `.claude/skills/technical-conception/template.md`
§ *Code-quality self-check* restates rules oxlint already refuses ("No
abbreviations / one-letter locals", "No prose comments", "No `any`"). Deleting
those bullets leaves §3 and step 3a with only the feature-specific checks no
linter can hold, so the list stops training the reader to skim a copy of the
linter.

**Similar instances:** `grep -n '^- \[ \]' .claude/skills/technical-conception/template.md`
lists the starter bullets. Each one that a rule in `.oxlintrc.json` enforces is
the same hand copy.
