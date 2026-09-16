#!/usr/bin/env bash
# Pre-commit gate: a package.json script has to be a command, not a version.
#
# Bumping dependencies means rewriting version strings in package.json, and the
# quickest way to rewrite thirty of them is a regex keyed on the package name.
# That regex cannot tell a dependency entry from a script entry, because both
# are `"<name>": "<string>"` at the same depth. On PR #95 it rewrote
#
#     "knip": "knip"        (scripts)      ->  "knip": "6.33.0"
#
# alongside the real `"knip": "6.10.0"` in devDependencies. Nothing downstream
# noticed: `pnpm run knip` would have tried to execute `6.33.0` as a command,
# and the pre-push gate runs `pnpm exec knip`, which resolves the binary and
# never reads the script. It was caught by reading the diff, which is not a
# gate.
#
# The check is narrow on purpose. A script value that is a bare semver, with no
# command around it, is never intentional — no runner is named `1.2.3`. Anything
# else is left alone, including scripts that merely contain a version.
set -euo pipefail

cd "$(dirname "$0")/.."

failed=0
checked=0

while IFS= read -r manifest; do
  checked=$((checked + 1))
  offenders=$(
    node -e '
      const fs = require("node:fs");
      const BARE_SEMVER = /^[~^]?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
      const manifest = process.argv[1];
      let parsed;
      try {
        parsed = JSON.parse(fs.readFileSync(manifest, "utf8"));
      } catch {
        process.exit(0);
      }
      const scripts = parsed.scripts ?? {};
      for (const [name, value] of Object.entries(scripts)) {
        if (typeof value === "string" && BARE_SEMVER.test(value.trim())) {
          console.log(`${name} -> ${value}`);
        }
      }
    ' "$manifest"
  )
  if [ -n "$offenders" ]; then
    failed=1
    while IFS= read -r offender; do
      echo "[check-package-scripts] $manifest: script \"${offender}\" is a version, not a command" >&2
    done <<<"$offenders"
  fi
done < <(git ls-files '*package.json' ':!:**/node_modules/**')

if [ "$failed" -ne 0 ]; then
  cat >&2 <<'NOTE'

A script whose whole value is a version string is a botched edit, almost always
a regex that matched the scripts block while rewriting dependency versions.
Restore the command it replaced.

See docs/dantotsus/the-regex-that-rewrote-a-script-into-a-version.md.
NOTE
  exit 1
fi

echo "[check-package-scripts] every script in $checked manifest(s) is a command"
