# Revise a song before the next session

## Why

A member reading a setlist notices a song they do not know well enough. Today
they have to leave the setlist, open the band tab, write a task, pick the song
and the session by hand. They want one tap on the song that says "I need to
revise this", and a box to tick once it is done.

The setlist screen exists to show as many songs as possible on a phone
(`docs/features/pragma/setlist-density/spec/spec.md`, six songs at 375 px).
So the action lives in the row's menu, which takes no height, and the box to
tick lives with the other tasks.

The data already holds it. A task has a `songId`, a `sessionId` and a
`dueDate` (`api/src/tasks/tasks.schema.ts`), and a session's screen lists its
tasks with a checkbox (`SessionTasks`). Nothing changes on the API.

## Name

In code the task is a **brush-up** (`brush-up.core.ts`). `apps/pragma/VOCABULARY.md`
refuses *revision*, which reads as a version. The screen says *To revise*.

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
   With no next session, or while the task list has not loaded, the item is
   not shown.
3. **The row stays as it was.** Asking adds no line, badge or checkbox to
   the setlist row (operator, 2026-11-16, after seeing a line under the song).
   Once asked, the menu item disappears for that member and song.
4. **Ticking it.** The task is an ordinary task, ticked like any other: on the
   session's tasks (Who does what), on the band tab and through the
   assistants' task tools, where it can also be edited or deleted.
5. The menu item fits at 375 px wide.

## Out of scope

- Revising for a session other than the next one. The task can be moved to
  another session from its task sheet.
- Showing brush-ups on any setlist view. The operator allowed "My part" at
  most; it is left out until asked.
