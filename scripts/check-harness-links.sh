#!/usr/bin/env bash
# The harness is one copy, under plugins/borso-harness/, and Claude Code reads
# it through links in .claude/ and hook entries in .claude/settings.json. A
# skill added to the plugin without its link, or a hook added to hooks.json
# without its settings entry, exists in the tree and in no session.
#
# The links replaced a single whole-plugin link on PR #129, after a cloud
# session skipped that plugin as untrusted and let a `git reset --hard` over
# tracked changes through. See docs/adr/0026-the-harness-ships-as-a-plugin-linked-into-claude.md.
set -euo pipefail

cd "$(dirname "$0")/.."

plugins/borso-harness/scripts/link-into.sh --check . plugins/borso-harness
