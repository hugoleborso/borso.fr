---
date: 2026-05-02
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commits: [5c47cc2]
eradication-rung: 5
time-to-detect: minutes (failed at first cdk deploy of shared)
tags: [aws-budgets, cfn, currency]
---

# AWS Budgets evaluates spend in USD only — `EUR` is rejected at deploy

## Symptom

`pnpm --filter @borso/shared-infra run deploy` failed with
`InvalidParameterValue` from CloudFormation on the
`AWS::Budgets::Budget` resource. The synth had emitted
`{ amount: 5, unit: 'EUR' }` (and the same for €20, €50) for the three
monthly cost alarms.

User impact: the shared stack didn't deploy at all, blocking the
whole bootstrap until the unit was fixed.

## Root-cause chain

1. **Why?** CFN rejected `Unit: EUR`.
   Because the Budgets API validates the unit against an allow-list
   that doesn't include `EUR`.
2. **Why does AWS Budgets only accept USD?**
   AWS billing is denominated in USD globally; Budgets compares
   spend against the USD value. The display currency in the billing
   console is independent — a per-account presentation choice — but
   Budgets thresholds are evaluated in USD.
3. **Why did we write `EUR`?**
   Hugo pays invoices in euros (account default currency = EUR), so
   "€5 budget" was the natural unit when modelling it in CDK.
4. **Why didn't the CDK / TS layer flag it?**
   CDK's `CfnBudget.budgetLimit.unit` is typed as `string`, not as
   an enum. The constraint lives on the AWS-side validator, not on
   the CDK type.

**Root cause:** we thought "budget unit" tracked the account's
display currency. Actually Budgets evaluates spend in USD only,
regardless of account display preference. The display currency in
the billing console is separate.

## Detection failure causes

- **Typing:** `unit: string` accepts anything; the AWS-side enum
  isn't surfaced as a TS literal type.
- **Linter:** no rule.
- **Functional validation locally:** we ran `cdk synth` not
  `cdk deploy` while iterating — synth doesn't validate against the
  AWS Budgets API.
- **CI:** unit tests asserted `Unit: 'EUR'` matched what the
  construct produced — the test confirmed the bug rather than
  catching it.
- **Code review:** "EUR" reads as plausible for an EU-based account.
- **Operator-deploy:** caught the moment Hugo first ran shared
  deploy — fastest detection layer that could have caught it given
  the type system limitation.

## Countermeasure

- **Code:** commit `5c47cc2` — `infra/shared/lib/shared-stack.ts`
  passes `{ amount, unit: 'USD' }`, names the budgets
  `borso-monthly-{5,20,50}usd`. Tests + docs (`flows.md`,
  `architecture.md`) updated. Budget thresholds are now dollars,
  which on a personal infra bill at this scale tracks closely with
  euros (€5 ≈ $5 ± a few %).

## Eradication (rung 5 — knowledge as floor, justified)

- **Rung:** 5 (knowledge).
- **Why not higher:** rung 1 (a typed `monthlyUsdBudget(amountUsd)`
  helper that hardcodes USD) was considered and explicitly rejected.
  This codebase has exactly three budget alarms; we don't expect to
  add more, and the inline comment above the loop already documents
  the USD-only constraint clearly. Extracting a helper for a
  one-time-only call site would add ceremony without preventing a
  realistic recurrence. Rung 5 is the honest ceiling here.
- **What changed:** the original countermeasure flipped `unit: 'EUR'`
  → `unit: 'USD'` and renamed the budgets to `borso-monthly-Xusd`.
  An inline comment above the `for (const amount of [5, 20, 50])`
  loop in `infra/shared/lib/shared-stack.ts` documents that AWS
  Budgets only accepts USD. This entry plus that comment is the
  full eradication.
- **PR:** [#2](https://github.com/hugoleborso/borso.fr/pull/2).
- **Commit:** [`5c47cc2`](https://github.com/hugoleborso/borso.fr/commit/5c47cc2).
- **Diff snippet (essence of the fix):**
  ```diff
  - budgetName: `borso-monthly-${amount}eur`,
  - budgetLimit: { amount, unit: 'EUR' },
  + // AWS Budgets only accepts USD as the currency unit.
  + budgetName: `borso-monthly-${amount}usd`,
  + budgetLimit: { amount, unit: 'USD' },
  ```
- **Sibling defects swept:** verified Budgets is the only place a
  currency literal lives — `grep -rn "unit: '" infra/` shows no
  other matches.
- **If we ever add more budgets:** revisit this; promote to rung 1
  (extract the helper).
