---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: high
related-pr: n/a (present since the StaticSite construct was first written)
fix-pr: TBD
fix-commits: [TBD]
eradication-level: 4
time-to-detect: ~10 days
tags: [cdk, route53, cloudfront, static-site, drift]
---

# The DNS record that pointed nowhere: CDK's relative recordName trap

## Symptom

The `borso-fr-prod` CDK stack reported `CREATE_COMPLETE` and the CloudFormation
resources listed `SiteAliasA5601B07F` and `SiteAliasAAAAD7B32221` as healthy.
But `borso.fr` did not resolve to the CDK distribution — it kept returning the
output of a different, manually-created CloudFront distribution
(`E80907R476ZAJ`) backed by a manually-uploaded S3 website bucket. An operator
investigating cost drift queried Route 53 directly:

```text
$ aws route53 list-resource-record-sets --hosted-zone-id Z040…
…
{ "Name": "borso.fr.borso.fr.", "Type": "A",    "AliasTarget": { … d2yfgg8…cloudfront.net … } }
{ "Name": "borso.fr.borso.fr.", "Type": "AAAA", "AliasTarget": { … d2yfgg8…cloudfront.net … } }
```

Two phantom records — `borso.fr.borso.fr.`, not `borso.fr.` — owned by the
CDK stack, resolving nothing useful. Whoever had brought the site online had
silently created `A borso.fr. → cloudfront(E80907R476ZAJ)` by hand outside CDK
because the CDK stack's alias was inert. The same trap was about to bite
`borsouvertures-prod`: a deploy attempt on 2026-05-12 failed mid-rollback,
leaving an orphan `borsouvertures-prod` S3 bucket — and even if it had
succeeded, the synthesised record would have been
`borsouvertures.borso.fr.borso.fr.`.

## Root-cause chain

1. **Why did the CDK stack create `borso.fr.borso.fr.` instead of `borso.fr.`?**
   The construct passed `recordName: props.domainName` to `ARecord` with
   `props.domainName = 'borso.fr'`.
2. **Why does that double the suffix?**
   CDK's `ARecord` interprets `recordName` as a **relative** name when it has
   no trailing dot, and appends `.${zone.zoneName}.` to make it absolute.
   With `zone.zoneName = 'borso.fr'`, the final R53 record name becomes
   `borso.fr` + `.` + `borso.fr` + `.` = `borso.fr.borso.fr.`.
3. **Why was the relative-vs-absolute distinction invisible to the author?**
   Both forms type-check, both deploy without an error, and CDK doesn't warn.
   Browsing the CFN stack outputs shows the CDK-rendered domain
   (`d2yfgg8…cloudfront.net`) without surfacing the synthesised R53 record
   name — so the deploy looks healthy from CFN's perspective.
4. **Why did the operator never notice the phantom record?**
   Because something else was already serving `borso.fr`. The manual record
   created out-of-band hid the breakage: traffic resolved, the site loaded,
   no alarm fired. The CDK-created record sat next to the manual one in Route
   53, never queried.

**Root cause:** I thought `recordName: 'borso.fr'` against zone `'borso.fr'`
would produce the apex record `borso.fr.`; actually CDK's `ARecord` treats
the value as relative and silently double-suffixes the zone, producing a
phantom record that resolves nothing.

Validate with the standard's check: *if I had known recordName-without-dot
is relative-to-zone, would I have written correct code on the first try?*
Yes — I'd have passed `${props.domainName}.` or omitted `recordName` for
the apex case.

## Detection failure causes

- **Typing:** `recordName` is `string | undefined` — the relative/absolute
  distinction is encoded by a trailing-dot character, invisible to the type
  system. No way for `tsc` to catch it.
- **Linter / static analysis:** Biome doesn't ship a CDK-aware rule. A
  generic "string must end with `.`" rule would be too narrow to justify.
- **Functional validation locally:** `cdk synth` happily prints
  `borso.fr.borso.fr` in the rendered template. The literal would have
  jumped out on a diff review, but no test inspected it.
- **CI (tests / build):** The existing `infra/cdk` test suite asserted
  bucket properties, error responses, OAC policy — but never asserted the
  R53 record `Name`. The defect lived outside the covered surface.
- **Code review:** Two `recordName: props.domainName` lines look obviously
  correct because they read like English. The bug needs CDK-internals
  knowledge to spot.
- **Staging monitoring:** No staging for this stack; preview deploys don't
  exercise the prod R53 branch.
- **Production monitoring / alerting:** The CDK distribution was reachable
  via its `*.cloudfront.net` hostname. Nothing alerted on "the alias I
  thought I created doesn't resolve" — that signal isn't produced by any
  AWS health check we had configured.

## Countermeasure

- **Code:** commit `TBD` — `infra/cdk/src/constructs/static-site.ts` now
  normalises `props.domainName` to a single-trailing-dot FQDN before
  passing it to `ARecord` / `AaaaRecord`. Idempotent for the
  already-absolute form (`'borso.fr.'`).
- **Operator action:** the existing phantom records and the manual apex
  setup need to be reconciled in a separate migration step — the construct
  fix alone does not erase live state. See migration runbook in PR.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — synth-time test that exercises the
previously-untested R53 surface)

Three unit tests in `infra/cdk/test/unit/static-site.test.ts`:

1. *Prod apex* — synth a `StaticSite` with `domainName: 'borso.fr'`,
   assert both `AWS::Route53::RecordSet` resources have `Name: 'borso.fr.'`,
   and assert the synthesised template JSON does NOT contain the substring
   `borso.fr.borso.fr` anywhere.
2. *Prod subdomain* — same shape with `domainName: 'borsouvertures.borso.fr'`,
   asserting `Name: 'borsouvertures.borso.fr.'` and absence of
   `borsouvertures.borso.fr.borso.fr`.
3. *Trailing-dot idempotence* — caller passes `'borso.fr.'` (already
   absolute), assert `Name: 'borso.fr.'` (single dot) and absence of
   `borso.fr..` (double dot).

These tests fail loudly if anyone re-introduces the bug shape — including a
human or AI editor who decides to "simplify" the normalisation back to
`recordName: props.domainName`. The synth-time assertion runs on every CI
invocation of `pnpm --filter @borso/infra test:coverage`, which is
pre-commit-gated on any `infra/cdk/**` change. Catching at synth time
beats catching at deploy time by ~5 minutes and avoids the failure being
silent in prod.

This is level 4, not level 1, because:

- The misconception is at the layer of `new ARecord({ recordName })`, a CDK
  vendor API we don't own. A future contributor adding a different ARecord
  callsite elsewhere in the construct library could re-open the trap.
- A truly structural fix would need a custom Biome plugin banning
  `recordName: <non-trailing-dot string literal>` on any ARecord/AaaaRecord
  — disproportionate for a single occurrence today. If a second callsite
  ever appears, escalate the eradication.

**Reference:** [PR #TBD](TBD) · commits [`TBD`](TBD)

**The actual fix:**

```diff
-    new ARecord(this, 'AliasA', {
-      zone,
-      recordName: props.domainName,
-      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
-    });
-    new AaaaRecord(this, 'AliasAAAA', {
-      zone,
-      recordName: props.domainName,
-      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
-    });
+    const recordName = props.domainName.endsWith('.')
+      ? props.domainName
+      : `${props.domainName}.`;
+    new ARecord(this, 'AliasA', {
+      zone,
+      recordName,
+      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
+    });
+    new AaaaRecord(this, 'AliasAAAA', {
+      zone,
+      recordName,
+      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
+    });
```

**Sibling defects swept:** `apps/borsouvertures/bin/app.ts` passes
`domainName: 'borsouvertures.borso.fr'` — same relative form, same bug
shape. The construct-level normalisation fixes both apps simultaneously;
no per-app change needed. `apps/borso-fr/bin/app.ts` already passes
`'borso.fr'` (apex) and is also covered.

## See also

- [`cloudfront-cname-must-be-released-before-redeploy.md`](./cloudfront-cname-must-be-released-before-redeploy.md)
  — the *other* reason a CDK prod deploy can land in a broken state when
  reconciling with manually-created resources.
- [`cdk-failed-deploy-leaves-retained-buckets-orphaned.md`](./cdk-failed-deploy-leaves-retained-buckets-orphaned.md)
  — the `borsouvertures-prod` orphan bucket left after the May 12 attempt
  traces to that trap, not this one.
- [`docs/knowledge/cloudfront-cname-uniqueness.md`](../knowledge/cloudfront-cname-uniqueness.md)
  — preflight script and the alias-takeover migration pattern.
