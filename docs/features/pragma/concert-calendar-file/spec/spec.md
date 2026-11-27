# Add the next concert to my calendar

The operator asked for an "ajouter à mon calendrier" on pragma's home page.
Asked which home page, he chose the public concert sign-up page at `/`, the
one fans see. The members' home at `/app` is out of scope.

## What a fan sees

1. Beside "Je serai là !", the ticket offers a calendar button, as the
   operator chose. From 1024 px it reads "Agenda" (English: "Calendar")
   with its calendar icon. Below 1024 px, where the ticket's right panel is
   too narrow, it shows the icon only, with "Agenda" as its accessible
   name. Its tooltip is "Ajouter à mon calendrier" (English: "Add to my
   calendar"). Every text goes through i18n.
2. It shows before the sign-up and after it, on the same row as
   "Inscrit·e" and "Un·e ami·e" whenever they fit on one row.
3. From 375 px up, no button leaves the screen and the page never scrolls
   sideways. From 768 px, where the buttons sit inside the ticket, they
   wrap to another row inside it rather than overflow. Below 768 px they
   keep the fixed bar at the bottom of the screen that the page already
   had.
4. A tap opens the concert's calendar file in the same tab, so the phone
   offers to add it to the calendar app.

## The calendar file

5. `GET /api/concert-registrations/concerts/:sessionId/calendar` is public,
   rate limited like the other public reads, and answers
   `text/calendar; charset=utf-8` as an attachment named `pragma-concert.ics`.
6. It holds one event: a stable UID from the session id, the concert's
   start, an end two hours later (sessions store no end), the summary
   `pragma · <venue>` or `pragma` without a venue, the venue as location
   and the public message as description, each left out when absent.
7. A practice, a past concert or an unknown id answers 422
   `not-an-upcoming-concert`, the refusal the sign-up already uses.
8. The route reveals nothing the `upcoming` list does not already show.
