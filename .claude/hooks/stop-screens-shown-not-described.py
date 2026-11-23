#!/usr/bin/env python3
# Stop hook: a turn that reports how screens compare has to show them.
#
# When the turn's text claims a visual comparison and the turn neither
# published an Artifact, sent a file nor embedded an image, the stop is blocked
# once. Quoted text and blockquotes are skipped. When the turn ran `git push`
# over a range touching `apps/*/site/src/` on a branch already pushed, and
# uploaded no screenshot, the stop is blocked once too.
#
# Best-effort by contract: any error lets the turn end.
#
# See docs/dantotsus/the-screens-described-instead-of-shown.md.
import json
import re
import subprocess
import sys

VISUAL_CLAIM = re.compile(
    r"\b(by eye|side[- ]by[- ]side|pixel (diff|channel|difference)s?"
    r"|visible differences?|screens? (match|are identical|look the same|unchanged))\b",
    re.IGNORECASE,
)
QUOTED_SPAN = re.compile(r'"[^"\n]*"|“[^”\n]*”|`[^`\n]*`|^[ \t]*>.*$', re.MULTILINE)
SHOWING_TOOLS = {"Artifact", "SendUserFile"}
SHOWN_IN_TEXT = re.compile(r"!\[[^\]]*\]\(|claude\.ai/(code/)?artifact/")
REASON = (
    "[screens-shown] This turn describes how screens compare but shows none of them. "
    "Publish the before and after images (Artifact, or SendUserFile with display render) "
    "or link where they are, then give the verdict beside them. "
    "See docs/dantotsus/the-screens-described-instead-of-shown.md."
)


def is_turn_start(row):
    if row.get("type") != "user" or row.get("isMeta"):
        return False
    content = row.get("message", {}).get("content")
    if isinstance(content, str):
        return True
    return isinstance(content, list) and not any(
        isinstance(block, dict) and block.get("type") == "tool_result" for block in content
    )


def read_turn(transcript_path):
    rows = []
    with open(transcript_path, encoding="utf-8") as transcript:
        for line in transcript:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    starts = [index for index, row in enumerate(rows) if is_turn_start(row)]
    return rows[starts[-1] + 1 :] if starts else rows


def must_show(turn):
    text_parts = []
    for row in turn:
        if row.get("type") != "assistant" or row.get("isSidechain"):
            continue
        for block in row.get("message", {}).get("content", []):
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_use" and block.get("name") in SHOWING_TOOLS:
                return False
            if block.get("type") == "text":
                text_parts.append(block.get("text", ""))
    text = "\n".join(text_parts)
    claims = QUOTED_SPAN.sub("", text)
    return bool(VISUAL_CLAIM.search(claims)) and not SHOWN_IN_TEXT.search(text)


PUSH = re.compile(r"\bgit\s+push\b")
SCREENSHOTS_TAKEN = re.compile(r"screenshots/pr-|screenshots\.yml|visual-validation")
VISIBLE_SOURCE = re.compile(r"^apps/[^/]+/site/src/", re.MULTILINE)
PUSH_REASON = (
    "[screens-shown] This turn pushed a change to a screen and posted no new screenshot. "
    "Take the changed screens at 375 px and publish them as open-pr step 5b says, "
    "so the Screenshots comment shows the screen the preview now serves. "
    "See docs/dantotsus/a-screen-pushed-without-its-picture.md."
)


def turn_inputs(turn):
    for row in turn:
        if row.get("type") != "assistant":
            continue
        for block in row.get("message", {}).get("content", []):
            if isinstance(block, dict) and block.get("type") == "tool_use":
                yield json.dumps(block.get("input", {}))


def git(*arguments):
    return subprocess.run(["git", *arguments], capture_output=True, text=True, timeout=10).stdout


def pushed_a_screen_unshown(turn):
    inputs = "\n".join(turn_inputs(turn))
    if not PUSH.search(inputs) or SCREENSHOTS_TAKEN.search(inputs):
        return False
    moves = git("reflog", "--format=%H", "-n", "2", "@{upstream}").split()
    return len(moves) == 2 and bool(VISIBLE_SOURCE.search(git("diff", "--name-only", moves[1], moves[0])))


def main():
    payload = json.load(sys.stdin)
    if payload.get("stop_hook_active"):
        return
    turn = read_turn(payload["transcript_path"])
    if must_show(turn):
        print(json.dumps({"decision": "block", "reason": REASON}))
    elif pushed_a_screen_unshown(turn):
        print(json.dumps({"decision": "block", "reason": PUSH_REASON}))


try:
    main()
except Exception:
    pass
sys.exit(0)
