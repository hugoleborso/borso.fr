---
date: 2026-05-02
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: '#2'
fix-commits: [5c47cc223c]
eradication-level: 5
eradication-paths: [docs/aws-setup.md]
time-to-detect: minutes (failed at first cdk deploy of shared)
tags: [aws-budgets, cfn, currency]
zone: infra/shared/lib/shared-stack.ts
---

# AWS Budgets evaluates spend in USD only, and `EUR` is rejected at deploy

## User impact

The operator's first deploy of the shared stack failed, and the whole
bootstrap waited on it (his run of `pnpm --filter @borso/shared-infra run deploy`).

| | Seen | Expected |
| --- | --- | --- |
| First deploy of the shared stack | CloudFormation answers `InvalidParameterValue` on `AWS::Budgets::Budget`, and nothing deploys | The stack deploys with three monthly cost alarms |

## Causal chain

- The shared stack failed to deploy.
  - CloudFormation rejected the three budgets, whose limit said `Unit: EUR`.

    ```ts
    budgetLimit: { amount, unit: 'EUR' }, // ❌ Budgets accepts USD only
    ```

    - Commit `68af89935` (2026-05-01, written by an agent) ported the shared stack and wrote the unit. Its message and the stack's doc comment describe the budgets as "€5/€20/€50".
      - The input described the alarms in euros, the currency the operator pays in, so euros became the unit. (Material)
      - CDK types `CfnBudget.budgetLimit.unit` as `string`, so nothing in the code knew the allowed values. (Machine)

## Root cause of occurrence

*Thought a budget's unit followed the account's billing currency, actually AWS Budgets evaluates spend in USD whatever currency the console displays.*

Material. The agent wrote the unit from a request phrased in euros. The
account's default currency is `EUR`, so "€5" read as the natural unit.

[`docs/aws-setup.md`](../aws-setup.md) §1: "AWS Budgets only supports USD;
the EUR default-currency setting above only affects how invoices are
displayed in the console."

## Detection failure causes

- **Typing:** `unit: string` accepts any string. The allowed values live in the AWS validator only.
- **Local:** `cdk synth` does not call the Budgets API, and deploys run only through the operator.
- **CI:** the unit test asserted `Unit: 'EUR'`, the value the construct produced, so it confirmed the defect.
- **Review:** `EUR` reads as plausible for an account billed in euros.

## Countermeasure

Commit [`5c47cc2`](https://github.com/hugoleborso/borso.fr/commit/5c47cc2)
passes `{ amount, unit: 'USD' }` and names the budgets
`borso-monthly-<amount>usd`. The thresholds are now dollars, close to euros at
this scale.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `5c47cc2` added an inline comment above the budgets,
"AWS Budgets only accepts USD as the currency unit". Commit `8621866aa`
(2026-08-20) removed every comment from the code, that one with it. What holds
today:

- `shared-stack.ts` names its four amounts `MONTHLY_BUDGET_*_USD` and writes `unit: 'USD'` once, in the loop of `createMonthlyBudgets`.
- `shared-stack.test.ts` asserts `Unit: 'USD'` on each budget. It catches an accidental change, but a deliberate one would update it, as the first test did.
- `docs/aws-setup.md` §1 states the rule.

The original entry rejected a typed helper because three budgets with no
expected addition did not justify it, and promised to revisit when budgets
were added. A fourth amount, `MONTHLY_BUDGET_FIRST_ALERT_USD = 2`, has since
been added.

**Proposed:** a function in `shared-stack.ts` such as
`monthlyUsdBudget(amountUsd: number)` returns the `CfnBudget` props with
`unit: 'USD'` as a literal no caller passes. A budget created through it
cannot carry another currency, and the amount's name says what it is counted
in.

**Proof it can fail:** none. Nothing refuses `unit: 'EUR'` before AWS does.

**Similar instances:** `grep -rn "unit: '" infra apps/*/cdk --include=*.ts`
finds only the budget loop.
