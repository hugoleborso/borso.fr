# `/tmp/cdk.out*` leftover directories silently fill the sandbox disk

## Symptom

CDK construct tests under `infra/cdk/test/unit/` fail with:

```
Error: ENOSPC: no space left on device, copyfile
  '…/aws-cdk-lib/aws-codedeploy/lib/private/utils.d.ts' ->
  '/tmp/cdk.outGHY4Vx/asset.<hash>/node_modules/.../utils.d.ts'
```

`df -h /tmp` shows the root filesystem at 100% used. Listing
`/tmp/cdk.out*` reveals **hundreds** of leftover staging
directories from earlier `vitest run` invocations of the CDK
suites — each one a copy of the `aws-cdk-lib` + workspace tree
(`~24 MB` typical, larger ones hit `~185 MB`), the costliest
ones built when the test exercised the `LambdaApi` or
`MigrationRunner` constructs that asset-stage bundled code.

This session counted 886 directories totalling 29 GB on a 252 GB
volume.

## Cause

CDK's `AssetStaging` copies the asset source into a uniquely-named
`/tmp/cdk.out<random>/asset.<hash>/` directory at synth time
(`aws-cdk-lib/core/lib/asset-staging.js → stageByCopying`). The
directories live for the lifetime of the synth process and are
**not** cleaned up on process exit — the standard CDK CLI handles
its own cleanup, but `Template.fromStack(...)` invoked from a
vitest worker doesn't. The remote-execution sandbox boots fresh,
so every session starts with a clean `/tmp`, but a long-running
sandbox that runs the CDK tests repeatedly accretes one
sub-directory per `synth(...)` helper call.

The vitest workers don't trap signals to clean up either —
`SIGTERM` on suite cancellation leaves the staging dirs in place.

## Recovery (immediate)

```bash
rm -rf /tmp/cdk.out*
df -h /tmp
```

On this volume the cleanup released ~29 GB and the next
`pnpm --filter @borso/infra run test:coverage` ran green.

## Prevention (now wired)

`scripts/install-repo-deps.sh` (the `SessionStart` hook) sweeps
the leftover dirs on every session boot. The cleanup is bounded
(`-mindepth 1 -maxdepth 1`) and idempotent.

```diff
 # scripts/install-repo-deps.sh
+
+# 8. /tmp/cdk.out staging dirs left by previous sessions can fill
+# the sandbox disk and break vitest with ENOSPC. CDK's
+# AssetStaging copies the asset tree under /tmp/cdk.out<random>/
+# and doesn't clean up on process exit. Wipe them at SessionStart
+# so a long-running sandbox can't accrete tens of GBs.
+# See docs/knowledge/cdk-out-tmp-fills-the-sandbox-disk.md.
+find /tmp -maxdepth 1 -name 'cdk.out*' -type d -exec rm -rf {} + 2>/dev/null || true
```

## Why this entry is here (not a dantotsu)

The vendor (CDK) doesn't clean up its temp dirs — that's a fact
of the tool, not a defect in this repo. The local prevention
is a one-line `find … -exec rm -rf {} +` at SessionStart; no
further structural change is reachable.

If CDK ships a cleanup-on-exit fix upstream
(aws/aws-cdk#asset-staging-cleanup or equivalent), this entry
becomes obsolete and the SessionStart line can be removed.

## See also

- [`claude-code-session-attachments-on-disk.md`](./claude-code-session-attachments-on-disk.md) — neighbour: another class of "harness state on disk grows silently across sessions".
