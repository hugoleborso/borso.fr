# Visual validation — Add the next concert to my calendar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-27T10:06:43Z
- Tooling: agent-browser 0.41.2

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result 1 | The ticket offers "Ajouter à mon calendrier", through i18n | Open `/` in French at 1280 px, read the link's `textContent` | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/01-desktop-before.png`, textContent = `Ajouter à mon calendrier`, key `addToCalendar` in `fr.json` | PASS |
| 02 | Result 1 | English: "Add to my calendar" | Set `pragma.locale=en`, reload at 1440 px | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/03-english-before.png`, textContent = `Add to my calendar`, `<html lang="en">` | PASS |
| 03 | Result 1 | It sits beside "Je serai là !" | Measure both buttons' `getBoundingClientRect()` at 1920, 1440, 1280, 1024, 1023, 375 in French | `./visual-validation-2026-11-27-0956/01-desktop-before.png`, `./visual-validation-2026-11-27-0956/02-desktop-1440-before.png` | FAIL |
| 04 | Result 2 | It shows before the sign-up | Open `/` with no registration | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/01-desktop-before.png` | PASS |
| 05 | Result 2 | It shows after the sign-up, with "Inscrit·e" and "Un·e ami·e" | Click "Je serai là !", fill first name and email, "Valider", close the dialog | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/07-desktop-1280-after.png`, snapshot lists `Inscrire un·e ami·e` and link `Ajouter à mon calendrier` | PASS |
| 06 | Result 2 | After the sign-up it sits beside "Inscrit·e" and "Un·e ami·e" | Measure the three buttons at 1920, 1280, 1024 in French and English | `./visual-validation-2026-11-27-0956/07-desktop-1280-after.png` | FAIL |
| 07 | Result 3 | Below 1024 px it shows its calendar icon only | Measure the link at 1024 and 1023 px | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/06-width-1023-before.png`, width 267 px at 1024, 56 px at 1023, label span `max-lg:sr-only` | PASS |
| 08 | Result 3 | It keeps the label as its accessible name | Accessibility snapshot at 375 px | snapshot: `link "Ajouter à mon calendrier"` at 375 px, icon `aria-hidden="true"` | PASS |
| 09 | Result 3 | The buttons stay inside the ticket at every width, before the sign-up | Compare button rects with the `<article>` ticket rect at 1920 to 320 px | `./visual-validation-2026-11-27-0956/04-mobile-375-before.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/05-tablet-768-before.png` | FAIL |
| 10 | Result 3 | The buttons stay inside the ticket at every width, after the sign-up | Same measurement after the sign-up | `./visual-validation-2026-11-27-0956/08-mobile-320-after.png`, `./visual-validation-2026-11-27-0956/09-mobile-375-after.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/10-tablet-768-after.png` | FAIL |
| 11 | Result 3 | They wrap to a second row when they do not fit on one | Measure rows after the sign-up at 768 and 320 px | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/10-tablet-768-after.png` (wraps to three rows), `./visual-validation-2026-11-27-0956/08-mobile-320-after.png` (no wrap, clipped) | FAIL |
| 12 | Result 4 | A tap opens the concert's calendar file in the same tab | `scripts/phone.sh touch 'a[href*="/calendar"]'` at 375 × 812, then list requests and tabs | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/12-phone-after-tap.png`, verdict `isRealTouch: true`, `GET …/concerts/7b1cc03a-…/calendar (Document) 200`, one tab, no `target`, no `download` | PASS |
| 13 | Result 4 | The phone offers to add it to the calendar app | none possible | Headless Chromium has no calendar app | UNVERIFIABLE |
| 14 | Calendar 5 | `GET /api/concert-registrations/concerts/:sessionId/calendar` is public | `curl` with no cookie | `HTTP/1.1 200 OK` without a session | PASS |
| 15 | Calendar 5 | Rate limited like the other public reads | 130 requests in a row, then `GET /upcoming` | 118 × 200, 12 × 429, then `/upcoming` answers 429 (shared bucket) | PASS |
| 16 | Calendar 5 | Answers `text/calendar; charset=utf-8` as an attachment named `pragma-concert.ics` | Read the response headers | `content-type: text/calendar; charset=utf-8`, `content-disposition: attachment; filename="pragma-concert.ics"` | PASS |
| 17 | Calendar 6 | One event with a stable UID from the session id | Fetch twice, compare | One `VEVENT`, `UID:7b1cc03a-b23d-4731-98ba-5cdd52be9f42@pragma.borso.fr` both times | PASS |
| 18 | Calendar 6 | The concert's start, an end two hours later | Compare with `/upcoming` date `2026-12-04T09:59:41.719Z` and the ticket's "10 h 59" (Paris) | `DTSTART:20261204T095941Z`, `DTEND:20261204T115941Z` | PASS |
| 19 | Calendar 6 | Summary `pragma · <venue>`, the venue as location | Read the file | `SUMMARY:pragma · Le Petit Bain`, `LOCATION:Le Petit Bain` | PASS |
| 20 | Calendar 6 | Summary `pragma` without a venue, location left out | Try to make a concert with no venue | Create and update schemas need `venue` with at least one character | UNVERIFIABLE |
| 21 | Calendar 6 | The public message as description, left out when absent | Fetch before and after `PATCH …/announcement` with a message holding `,` `;` and `é` | Before: no `DESCRIPTION` line. After: `DESCRIPTION:Venez nombreux\, entrée libre\; ouverture 20h\, avec virgule\,` folded onto ` et accent é` | PASS |
| 22 | Calendar 7 | A practice answers 422 `not-an-upcoming-concert` | Make a future practice through `POST /api/sessions`, fetch its calendar | `{"error":"not-an-upcoming-concert"} 422` | PASS |
| 23 | Calendar 7 | A past concert answers 422 `not-an-upcoming-concert` | Make a concert dated 2026-11-01, fetch its calendar | `{"error":"not-an-upcoming-concert"} 422` | PASS |
| 24 | Calendar 7 | An unknown id answers 422 `not-an-upcoming-concert` | Fetch with `00000000-0000-4000-8000-000000000000` | `{"error":"not-an-upcoming-concert"} 422` | PASS |
| 25 | Calendar 7 | It is the refusal the sign-up already uses | `POST …/registrations` on the past concert | `{"error":"not-an-upcoming-concert"} 422` | PASS |
| 26 | Calendar 8 | The route reveals nothing the `upcoming` list does not already show | Compare the file's fields with `GET /upcoming` | The file holds the session id, date, venue and message, all in `/upcoming`. It holds no capacity, count or member. `DTSTAMP` is the time of the request | PASS |
| 27 | Reachability | The public page that shows the concert offers a way to create a registration | Sign up through "Je serai là !" | Row 05 flow, dialog "Tu es inscrit·e, Validatrice !" | PASS |
| 28 | Edge | Dark mode keeps the button legible | `set media dark`, 1280 px, after sign-up | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0956/13-dark-1280-after.png`, link color `rgb(241, 235, 223)` on `rgb(22, 19, 15)` | PASS |

Every screenshot passed `scripts/browser/broken-images.sh`.

## Notes

- **03 and 06, never beside at desktop widths.** The ticket is capped at 960 px, so its right panel is the same width at every viewport from 1024 to 1920 px. In French the two buttons need about 463 px, so "Ajouter à mon calendrier" always drops to a second row under "Je serai là !" (1920 px: "Je serai là !" at y 594, calendar at y 660). After the sign-up the calendar drops under "Inscrit·e" and "Un·e ami·e" in both languages at every width from 1024 to 1920 px. In English it does sit beside "I'll be there!" before the sign-up. It sits beside the other buttons only below 1024 px, where it is icon only. Item 3 says the icon-only rule exists because the panel is too narrow *below 1024 px* for the French label. The measurements show the French label does not fit on the row above 1024 px either. The wrap clause allows a second row. The claim that it sits "beside" holds only in English, before the sign-up, at desktop widths. Verdict FAIL on the "beside" wording. The fix is either the layout or the spec.
- **09, outside the ticket at phone widths before the sign-up.** Below `md` the action row is a `fixed inset-x-0 bottom-0` bar. It is a DOM child of the `<article>`, but at 375 px it sits at y 712–812 while the ticket's border ends at y 381. The buttons are visually outside the ticket. The bar was already on `origin/main` before this feature (inferred from `git show origin/main:apps/pragma/site/src/components/organisms/ConcertTicket.tsx`). At 768 px and above, every button sits inside the ticket's border.
- **10 and 11, the calendar button is clipped at 320 px after the sign-up.** The fixed bar does not wrap. At 320 px "Inscrit·e" (90 px), "Un·e ami·e" (151 px) and the calendar icon (56 px) share one row, and the icon ends at x 337 on a 320 px viewport. Only a sliver of it shows (`08-mobile-320-after.png`). At 375 px all three fit, ending at x 355. The md+ panel wraps correctly. At 768 px after the sign-up the three buttons stack on three rows inside the ticket. 320 px is below the repository's 375 px floor. The spec says "at every width", so it is recorded as a FAIL.
- **13, unverifiable.** The tap made a top-level `Document` request in the same tab, which answered 200 with an attachment, and the page stayed on `/`. Whether a phone then offers its calendar app depends on the OS. Headless Chromium cannot show that.
- **20, unverifiable.** No concert without a venue can be made. `concertCreateSchema` and `concertUpdateSchema` require `venue` with at least one character, so the summary `pragma` and the missing `LOCATION` cannot be driven.
- **24, side observation.** A malformed id (`not-a-uuid`) answers 400 with a ZodError body, not 422. A well-formed unknown id answers 422 as specified. Recorded as PASS because a malformed string is not an id.
- **Data left in the local dev database.** This run created a practice (2026-12-10), a past concert at "Le Past Venue" (2026-11-01), a public message on the 2026-12-04 concert and a registration "Validatrice". The next `pnpm dev` reseeds and clears them.

## Verdict: FAIL
