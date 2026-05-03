# `deploy` and `destroy` are reserved pnpm built-ins, not script names

## Symptom

The first preview deploy of `borso-fr` failed in CI in 23 s. The
`deploy.yml` step `run: pnpm --filter "@borso-app/borso-fr" deploy`
appeared to execute, but instead of running the package's
`scripts.deploy` (`pnpm build && cdk deploy --all ...`), pnpm did
something else entirely and exited.

## Root-cause chain

1. **Why** didn't the package's `deploy` script run?
   `pnpm <name>` consults pnpm's built-in command table **before**
   falling through to scripts. `deploy` is a built-in command in
   pnpm: it copies a workspace package and its production deps into
   a deployable bundle (intended for things like Docker container
   builds).
2. **Why** is that the default behaviour?
   pnpm's CLI gives built-ins precedence so that adding a script
   named `install` (or `update`, etc.) in your `package.json`
   doesn't accidentally shadow a critical command.
3. **Why** doesn't pnpm warn when a script is shadowed?
   Built-in commands take silent precedence; the user-facing
   `package.json` script is simply unreachable via the bare name.
   Same hazard applies to `destroy` (also a pnpm built-in,
   companion to `deploy`).
4. **Why** were the scripts named `deploy` / `destroy` in the first
   place?
   Convention from CDK projects: `cdk deploy` / `cdk destroy` are
   the verbs CDK uses, so `pnpm deploy` reads naturally for an
   operator. We didn't realise the collision until CI failed.

**Root cause:** pnpm's built-in `deploy` (and `destroy`) command
shadows any user-defined script with the same name when invoked as
`pnpm <pkg> <name>`.

## Fix

- **Code (CI):** commit `10f3f10` — every workflow that invokes the
  per-app deploy/destroy now calls `pnpm --filter <pkg> run deploy`
  (and same for `destroy`). The `run` keyword forces the script
  lookup and bypasses the built-in resolution.
- **CLAUDE.md:** the `pnpm always` convention now spells this out:
  "Always use `pnpm run <script>` for `deploy` / `destroy` (and any
  name pnpm reserves)."
- **Convention:** any future workflow / script invoking a
  reserved name uses `pnpm run`. The local equivalent for shared
  infra is `pnpm --filter @borso/shared-infra run deploy`.
