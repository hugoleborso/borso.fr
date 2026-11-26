#!/usr/bin/env bash
# PostToolUse (ReadNotifications): put the reply rule at the moment a
# notification is read.
#
# On PR #406 a session restated every notification although CLAUDE.md held
# this rule, and on PR #411 after it. See lessons-from-pr-406 row 18, -410 row 47.

printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[notification-reply] End this turn with no text unless you push, merge or fix something, or CI turned red. CI running or green on a pull request that waits on the operator is not news to him: a reply buries his open question."}}'
exit 0
