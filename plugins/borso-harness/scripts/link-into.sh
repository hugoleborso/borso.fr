#!/usr/bin/env bash
# Link the harness into a repository's .claude/ as plain project files.
#
#   link-into.sh <repo-root> <prefix>            create or repair the links
#   link-into.sh --check <repo-root> <prefix>    fail on a missing or stale link
#   link-into.sh --hooks <repo-root> <prefix>    print the settings.json hooks
#
# <prefix> is where the plugin sits, relative to <repo-root>:
# `plugins/borso-harness` in borso.fr, `vendor/borso.fr/plugins/borso-harness`
# in a repository that vendors it as a submodule.
#
# Why links rather than the plugin: Claude Code loads a plugin that a
# repository ships under .claude/skills/ only in a workspace someone trusted,
# and a cloud session never shows the trust dialog, so it skips the plugin and
# every skill, agent and guard hook with it. A skill directory, an agent file
# and a hook in .claude/settings.json load without that dialog. So each part is
# linked into the place Claude Code reads it from, and the plugin stays the one
# copy. Measured on PR #129: the whole-plugin link was skipped in a cloud
# session, and a `git reset --hard` over tracked changes went through.
#
# A skill directory that already exists as a real directory (borso.fr keeps its
# blueprint generators in .claude/skills/blueprint/) gets its SKILL.md linked
# instead of the whole directory.
#
# Hooks cannot be links: they are entries in .claude/settings.json. `--hooks`
# prints them from hooks/hooks.json with the plugin root replaced by the
# repository-relative path, and `--check` fails when one is missing from the
# repository's settings.

set -euo pipefail

mode=link
case "${1:-}" in
  --check | --hooks)
    mode="${1#--}"
    shift
    ;;
esac

if [ "$#" -ne 2 ]; then
  echo "usage: link-into.sh [--check|--hooks] <repo-root> <prefix>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$1" && pwd)"
PREFIX="${2%/}"

if [ ! -f "$REPO_ROOT/$PREFIX/.claude-plugin/plugin.json" ]; then
  echo "[link-into] $REPO_ROOT/$PREFIX holds no borso-harness plugin." >&2
  echo "[link-into] In a repository that vendors borso.fr, check the submodule out first:" >&2
  echo "[link-into]   git submodule update --init" >&2
  exit 1
fi

exec python3 - "$mode" "$REPO_ROOT" "$PREFIX" <<'PY'
import json
import os
import sys

mode, repo_root, prefix = sys.argv[1:4]
plugin = os.path.join(repo_root, prefix)


def links():
    wanted = []
    skills = os.path.join(plugin, "skills")
    for name in sorted(os.listdir(skills)):
        if not os.path.isfile(os.path.join(skills, name, "SKILL.md")):
            continue
        place = os.path.join(repo_root, ".claude", "skills", name)
        if os.path.isdir(place) and not os.path.islink(place):
            wanted.append((os.path.join(place, "SKILL.md"), os.path.join(skills, name, "SKILL.md")))
        else:
            wanted.append((place, os.path.join(skills, name)))
    for folder in ("agents", "commands"):
        source = os.path.join(plugin, folder)
        if not os.path.isdir(source):
            continue
        for name in sorted(os.listdir(source)):
            if name.endswith(".md"):
                wanted.append((os.path.join(repo_root, ".claude", folder, name), os.path.join(source, name)))
    return wanted


def hook_block():
    with open(os.path.join(plugin, "hooks", "hooks.json"), encoding="utf-8") as handle:
        text = handle.read()
    text = text.replace('\\"${CLAUDE_PLUGIN_ROOT}\\"', '\\"$CLAUDE_PROJECT_DIR\\"/' + prefix)
    return json.loads(text)["hooks"]


def hook_commands(hooks):
    for groups in hooks.values():
        for group in groups:
            for hook in group.get("hooks", []):
                yield hook.get("command", "")


def relative(place, target):
    return os.path.relpath(target, os.path.dirname(place))


if mode == "hooks":
    print(json.dumps({"hooks": hook_block()}, indent=2))
    sys.exit(0)

problems = []
for place, target in links():
    expected = relative(place, target)
    shown = os.path.relpath(place, repo_root)
    if os.path.islink(place):
        if os.readlink(place) == expected:
            continue
        if mode == "check":
            problems.append(f"{shown} points at {os.readlink(place)}, expected {expected}")
            continue
        os.remove(place)
    elif os.path.exists(place):
        problems.append(f"{shown} is a real file or directory; move it aside to link the harness copy")
        continue
    elif mode == "check":
        problems.append(f"{shown} is missing; it should link to {expected}")
        continue
    os.makedirs(os.path.dirname(place), exist_ok=True)
    os.symlink(expected, place)
    print(f"[link-into] linked {shown} -> {expected}")

claude_dir = os.path.join(repo_root, ".claude")
for folder in ("skills", "agents", "commands"):
    directory = os.path.join(claude_dir, folder)
    if not os.path.isdir(directory):
        continue
    for name in os.listdir(directory):
        place = os.path.join(directory, name)
        if os.path.islink(place) and not os.path.exists(place):
            target = os.readlink(place)
            if prefix in target:
                problems.append(f"{os.path.relpath(place, repo_root)} links to {target}, which the plugin no longer has")

settings_path = os.path.join(claude_dir, "settings.json")
declared = set()
if os.path.isfile(settings_path):
    with open(settings_path, encoding="utf-8") as handle:
        declared = set(hook_commands(json.load(handle).get("hooks", {})))
for command in hook_commands(hook_block()):
    if command not in declared:
        problems.append(f".claude/settings.json does not declare the hook {command}")

if problems:
    for problem in problems:
        print(f"[link-into] {problem}", file=sys.stderr)
    print("[link-into] Run plugins/borso-harness/scripts/link-into.sh <repo-root> <prefix> to repair the links,", file=sys.stderr)
    print("[link-into] and --hooks to print the hook entries .claude/settings.json needs.", file=sys.stderr)
    sys.exit(1)

print("[link-into] every harness skill, agent, command and hook is wired into .claude/")
PY
