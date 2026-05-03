# AWS Budgets only accepts USD as `budgetLimit.unit`

## Symptom

`pnpm --filter @borso/shared-infra run deploy` failed with
`InvalidParameterValue` from CloudFormation on the
`AWS::Budgets::Budget` resource. The synth produced
`{ amount: 5, unit: 'EUR' }` for each of the three monthly cost
alarms (€5 / €20 / €50).

## Root-cause chain

1. **Why** does CFN reject `Unit: EUR`?
   The Budgets API validates the unit against an allow-list and
   `EUR` isn't in it.
2. **Why** does the API only accept USD?
   AWS billing is denominated in USD globally; Budgets compares
   spend against the USD value. The display currency in the
   billing console is independent (it's a presentation choice
   per-account), but Budgets thresholds are evaluated in USD.
3. **Why** did we write `EUR`?
   We pay invoices in euros (account default currency = EUR), so
   "€5 budget" was the natural unit when modelling it in CDK.
   Budgets-the-API doesn't share that intuition.

**Root cause:** AWS Budgets evaluates spend in USD only; the
account-level display-currency setting doesn't extend to the API.

## Fix

- **Code:** commit `5c47cc2` —
  `infra/shared/lib/shared-stack.ts` now passes
  `{ amount, unit: 'USD' }`, with budget names
  `borso-monthly-{5,20,50}usd`. Tests + docs (`flows.md`,
  `architecture.md`) updated.
- **Operator note:** the absolute thresholds (5/20/50) are now
  dollars, which on a personal infra bill closely tracks euros at
  these amounts. Adjust if exchange rate diverges enough to matter.
- **Convention:** any future Budgets resource must use `USD`.
  Display currency in the AWS console is independent and stays
  whatever you set per-account.
