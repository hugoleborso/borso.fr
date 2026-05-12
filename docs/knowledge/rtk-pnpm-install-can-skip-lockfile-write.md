# `rtk`-wrapped `pnpm install` can silently no-op the lockfile write

The repo's PreToolUse hook routes `pnpm` commands through `rtk pnpm` for
compact output. On commands that *would* update `pnpm-lock.yaml`, the
rtk wrapper can short-circuit to `Done in 1.1s` / `ok` without writing
the lockfile. The filesystem `pnpm-lock.yaml` stays as it was; the
in-memory resolution lives only at `node_modules/.pnpm/lock.yaml`.

## How it bit us

During PR #8 I reverted a `pnpm-lock.yaml` change with `git checkout`
and re-ran `pnpm install` expecting it to regenerate the lockfile.
Output was `ok` / `Already up to date` repeatedly; `ls pnpm-lock.yaml`
returned `No such file or directory`. `--lockfile-only`, `--no-frozen-
lockfile`, even `rm pnpm-lock.yaml && pnpm install` all produced the
same `ok` with no file written.

## Recovery

The lockfile that pnpm actually used for the install lives under the
`.pnpm` cache:

```bash
cp node_modules/.pnpm/lock.yaml pnpm-lock.yaml
```

This is the source of truth pnpm consulted during the install — copying
it back makes the workspace consistent again. Verify with `grep -c <new-dep>
pnpm-lock.yaml`.

## Detection

- After a deliberate lockfile change, `ls -la pnpm-lock.yaml` and
  confirm the mtime moved.
- If `git status` doesn't show `pnpm-lock.yaml` modified after adding /
  removing a dep, that's the symptom.

## Mitigation

- After any `package.json` edit, **always** run `ls -la pnpm-lock.yaml`
  before committing.
- If the lockfile didn't update, the recovery copy above is the
  fastest path.
- For multi-package operations, the `node_modules/.pnpm/lock.yaml`
  fallback exists because pnpm writes it eagerly during dependency
  resolution; rtk's short-circuit happens after that write.

## Related

- [`docs/knowledge/biome-stack-overflow-on-dist-binaries.md`](./biome-stack-overflow-on-dist-binaries.md) —
  another tool-wrapper quirk where the wrapper's output didn't match
  the underlying tool's behaviour.
