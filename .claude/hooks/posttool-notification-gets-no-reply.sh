#!/usr/bin/env bash
# PostToolUse (ReadNotifications): put the reply rule at the moment a
# notification is read.
#
# The operator reads every reply. On PR #406 the session answered each CI and
# preview notification with a restatement, although CLAUDE.md held the rule,
# and an earlier session had been told the same. A rule read once at session
# start did not hold, so it now arrives with each notification instead.
#
# Best-effort by contract: it always exits 0.

printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[notification-reply] Write nothing about a notification unless it brings something new the operator needs or one of your actions follows from it. Never restate it: each reply buries the open question."}}'
exit 0
