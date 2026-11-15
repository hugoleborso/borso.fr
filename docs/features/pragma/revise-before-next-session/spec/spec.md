# Revise a song before the next session

## Why

A member reading a setlist notices a song they do not know well enough. Today
they have to leave the setlist, open the band tab, write a task, pick the song
and the session by hand. They want one tap on the song that says "I need to
revise this", and a box to tick once it is done.

The data already holds it. A task has a `songId`, a `sessionId` and a
`dueDate` (`api/src/tasks/tasks.schema.ts`), and a session's screen lists its
tasks with a checkbox (`SessionTasks`). Nothing changes on the API.

## Who

Any signed-in member, on the setlist screen (`/setlists/:id`), on a phone.

## Behaviour

1. **Next session.** The next session is the earliest practice or concert
   on today's band day or later (`selectNextSession` in
   `domain/session-schedule.core.ts`, the rule the home screen uses). It does
   not have to carry this setlist.
   Decision taken without the operator: the operator said "the next practice
   or the next concert", so the nearest of either wins.
2. **The action.** Each song row's menu (the `⋯` button) shows **To revise**
   when a next session exists and the signed-in member has no task yet for
   that song on that session. Choosing it creates one task:
   - title `Revise <song title>` in the member's language;
   - assigned to the signed-in member (decision taken without the operator:
     "I need to revise it" is about the person tapping);
   - `songId` the song, `sessionId` the next session, `dueDate` the session's
     date, status `todo`.
   With no next session, the item is not shown.
3. **The checkbox.** Under a song row, each task of that song on the next
   session is drawn as one line: a checkbox, the assignee's first name and
   the session label (kind and date). Ticking it marks the task done;
   unticking reopens it. A done task stays on the row, ticked and struck
   through, until the session's day is past.
4. **Elsewhere.** The task is an ordinary task. It shows on the session's
   tasks, on the band tab and through the assistants' task tools, where it
   can be edited or deleted.
5. The line and the menu item fit at 375 px wide.

## Out of scope

- Revising for a session other than the next one. The task can be moved to
  another session from its task sheet.
- Showing revision lines on the scene view, the order screen or practice mode.
