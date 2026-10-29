---
summary: An IAM user's inline policies share one 2048-character budget, and the LimitExceeded error names only the document you just sent.
triggers:
  commands:
    - 'iam put-user-policy'
    - 'iam list-user-policies'
    - 'iam get-user-policy'
  output:
    - 'Maximum policy size of 2048 bytes exceeded'
    - 'LimitExceeded.*PutUserPolicy'
  paths:
    - 'docs/aws-setup.md'
---

# An IAM user's inline policies share one 2048-character budget

`iam put-user-policy` refuses with:

```
An error occurred (LimitExceeded) when calling the PutUserPolicy operation:
Maximum policy size of 2048 bytes exceeded for user AI-Dev-ReadOnly
```

The sentence names one user and one number, and arrives on a call that carries
one document, so it reads as *this document is too large*. It usually is not.

**The 2048 is the aggregate across every inline policy on that user.** Measured
on 2026-10-29 against `AI-Dev-ReadOnly`: a 1887-character `Explicit-write-deny`
was refused while `Prod-db-read` (352) and `Screenshots-publish` (173) were
already deployed — 2412 together. The same document applied once the other two
shrank. Nothing in the message mentions the other policies, and the quota page
calls the line "User policy size", singular.

**IAM counts whitespace.** A pretty-printed document pays for every indent, so
`jq -c` buys back roughly a third before anything has to be cut. Do that first:
it is free and it is not a workaround.

Measure the whole budget before composing an edit, not after a refusal:

```bash
for p in $(aws --profile borso-admin iam list-user-policies \
             --user-name AI-Dev-ReadOnly --query 'PolicyNames[]' --output text); do
  printf '%s: %s\n' "$p" "$(aws --profile borso-admin iam get-user-policy \
    --user-name AI-Dev-ReadOnly --policy-name "$p" \
    --query PolicyDocument --output json | jq -c . | tr -d ' \n' | wc -c)"
done
```

**When compacting is not enough, the answer is a customer-managed policy**, not
shorter Sids. Managed policies are capped at 6144 characters, attach to the user
the same way, and the cap is per policy. Golfing identifiers buys a hundred
characters once and makes the document unreadable for as long as it lives.

Two corollaries for this repository. The budget is a reason to delete a grant
rather than add one: ADR-0049 dropped `AI-Dev-ReadOnly`'s `dsql:DbConnect`
break-glass under this cap, and the result was tighter than the plan. And the
deployed policies are unreadable from a hosted session, because `iam:*` is
inside the deny — so the budget can only be measured from a session holding
`borso-admin`, and a claim about what fits is unverified anywhere else.

Last verified: 2026-10-29 — against the live `AI-Dev-ReadOnly` user, where the
three inline policies now spend 1243 + 375 + 173 = 1791 of 2048.

## See also

- [`docs/aws-setup.md`](../aws-setup.md) §12.7 — the policies this bit.
- [`docs/adr/0049-agents-read-production-through-an-invoked-reader-lambda.md`](../adr/0049-agents-read-production-through-an-invoked-reader-lambda.md)
- [`the-auto-mode-classifier-refuses-guard-probes.md`](./the-auto-mode-classifier-refuses-guard-probes.md) — the other wall between a session and this user's policies.
