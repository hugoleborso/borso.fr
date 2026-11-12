#!/usr/bin/env python3
# Stop hook: a turn that reports how screens compare has to show them.
#
# PR #249 moved fourteen of pragma's primitives onto React Aria with the
# condition that the screens stay as they were. Two subagents took before and
# after shots and left them as PNGs in the scratchpad. The main session's
# report said the screens were "identical by eye" and differed by "at most
# 41/255 on one pixel channel", with no image and no link, and the operator had
# to answer "SCREENSHOTS !!!!!" before seeing one. A claim about what a screen
# looks like is evidence only when the reader can look.
#
# The hook reads the turn that is ending. When its text claims a visual
# comparison and the turn neither published an Artifact, sent a file nor
# embedded an image, the stop is blocked with the reason, once: a second stop
# in a row passes, so the hook can never trap a turn. Quoted text and
# blockquote lines are skipped: the sweep of PR #249 quoted the old report's
# "identical by eye" and was blocked for a comparison it never made. "Before
# and after" is no claim on its own: it blocked three turns of PR #302 that
# compared probe output and quoted a kaizen prompt, and PR #249's report is
# still caught by "by eye" and "pixel channel".
#
# Best-effort by contract: any error lets the turn end.
#
# See docs/dantotsus/the-screens-described-instead-of-shown.md.
import json
import re
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


def main():
    payload = json.load(sys.stdin)
    if payload.get("stop_hook_active"):
        return
    if must_show(read_turn(payload["transcript_path"])):
        print(json.dumps({"decision": "block", "reason": REASON}))


try:
    main()
except Exception:
    pass
sys.exit(0)
