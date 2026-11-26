#!/usr/bin/env bash
# PostToolUse (ReadNotifications): put the reply rule at the moment a
# notification is read.
#
# On PR #406 a session restated every notification although CLAUDE.md held
# this rule. See docs/features/meta/lessons-from-pr-406/inventory.md row 18.

printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[notification-reply] Write nothing about a notification unless it brings something new the operator needs or one of your actions follows from it. Never restate it: each reply buries the open question."}}'
exit 0
