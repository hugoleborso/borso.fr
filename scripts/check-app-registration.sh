#!/usr/bin/env bash
# Every directory under apps/ is declared where the workflows and the commit
# gate look for it.
#
# CLAUDE.md has said "don't add an app without updating .github/path-filters.yml
# and the commitlint scope-enum" for as long as there have been apps, and
# nothing checked it. Both failures are silent in the way that matters: a
# missing path-filters key means the app never gets a preview deploy and no
# workflow reports an error, and a missing commitlint scope means the first
# commit naming the app is rejected by a hook with a message about an enum
# rather than about the app being unregistered.
#
# A directory read and two greps, so it costs nothing and belongs on the commit.

set -euo pipefail

PATH_FILTERS=.github/path-filters.yml
COMMITLINT=commitlint.config.js

missing=0

for app_directory in apps/*/; do
  [ -d "$app_directory" ] || continue
  slug=$(basename "$app_directory")

  if ! grep -qE "^${slug}: 'apps/${slug}/\*\*'\$" "$PATH_FILTERS"; then
    echo "[check-app-registration] $slug has no filter in $PATH_FILTERS." >&2
    echo "    Append: ${slug}: 'apps/${slug}/**'" >&2
    echo "    Without it the app never gets a preview deploy, and nothing reports that." >&2
    missing=$((missing + 1))
  fi

  if ! grep -qE "^\s*'${slug}',?\$" "$COMMITLINT"; then
    echo "[check-app-registration] $slug is not in the scope-enum in $COMMITLINT." >&2
    echo "    Add '${slug}' to the scope list." >&2
    missing=$((missing + 1))
  fi
done

# The other direction: a slug declared for an application that no longer exists
# sends a reader looking for a directory that is not there.
while IFS= read -r declared; do
  [ -z "$declared" ] && continue
  [ "$declared" = "infra" ] && continue
  if [ ! -d "apps/$declared" ]; then
    echo "[check-app-registration] $PATH_FILTERS declares '$declared' and apps/$declared does not exist." >&2
    missing=$((missing + 1))
  fi
done < <(grep -oE "^[a-z0-9-]+(?=:)" -P "$PATH_FILTERS" 2>/dev/null || grep -oE "^[a-z0-9-]+:" "$PATH_FILTERS" | tr -d ':')

if [ "$missing" -gt 0 ]; then
  echo "[check-app-registration] $missing registration problem(s)." >&2
  exit 1
fi

echo "[check-app-registration] every app is declared in the workflows and the commit gate"
