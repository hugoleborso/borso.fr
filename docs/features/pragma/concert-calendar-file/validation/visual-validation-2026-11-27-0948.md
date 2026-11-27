# Visual validation — Add the next concert to my calendar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-27T09:51:48Z
- Tooling: agent-browser 0.41.2

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result 1 | Beside "Je serai là !", the ticket offers "Ajouter à mon calendrier" | `pragma.locale=fr`, open `/` at 1280 × 900, snapshot | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0948/02-fr-before-signup.png`. Snapshot has `button "Je serai là !"` then `link "Ajouter à mon calendrier"` | PASS |
| 02 | Result 1 | English: "Add to my calendar", through i18n | Default `en` locale, open `/` at 1280 × 900, snapshot | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0948/01-desktop-before-signup.png`. Snapshot has `link "Add to my calendar"`, `<html lang="en">` | PASS |
| 03 | Result 2 | It shows before the sign-up | Fresh session, `fr`, measure the link against the ticket at 375, 639, 640, 768, 1024, 1280 | `./visual-validation-2026-11-27-0948/07-fr-768-before-signup-overflow.png` | FAIL |
| 04 | Result 2 | It shows after the sign-up, beside "Inscrit·e" and "Un·e ami·e" | Sign up as Camille, close the dialog, measure at 375, 639, 640, 768, 1024, 1280, 1440 | `./visual-validation-2026-11-27-0948/03-fr-after-signup.png`, `./visual-validation-2026-11-27-0948/05-fr-768-after-signup-overflow.png` | FAIL |
| 05 | Result 3 | On a phone (below 640 px) it shows its calendar icon only | Measure the label span at 375 and 639 (both states), and at 640 | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0948/06-fr-375-before-signup.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0948/04-fr-375-after-signup.png`. Label span `max-sm:sr-only` is 1 px wide at 375 and 639, 188.86 px at 640 | PASS |
| 06 | Result 3 | It keeps the label as its accessible name | Snapshot at 375 | Snapshot at 375 has `link "Ajouter à mon calendrier"` in both states | PASS |
| 07 | Result 3 | The bar still fits at 375 px | Measure bar and document scroll width at 375, before and after sign-up | Before: buttons 20-289 and 299-355. After: 20-128, 138-289, 299-355. Bar `scrollWidth = clientWidth = 375`, `documentElement.scrollWidth = 375` in both states | PASS |
| 08 | Result 4 | A tap opens the concert's calendar file in the same tab | `scripts/phone.sh start /`, `scripts/phone.sh touch 'a[href$="/calendar"]'`, then `network requests`, `tab list`, `get url` | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0948/08-phone-after-tap.png`. Real touch (`isRealTouch: true`). Then `GET …/concerts/1d247cbd-…/calendar (Document) 200` in tab `t1`, still one tab. The id is the ticket's concert from `/upcoming` | PASS |
| 09 | Result 4 | …so the phone offers to add it to the calendar app | None possible, headless Chromium has no OS calendar handler | Not observable in this sandbox | UNVERIFIABLE |
| 10 | Result 5 | `GET /api/concert-registrations/concerts/:sessionId/calendar` is public | `curl` without a cookie | `HTTP/1.1 200 OK` | PASS |
| 11 | Result 5 | Rate limited like the other public reads | 125 `curl` calls to the calendar route inside a minute, then `GET /upcoming` | `110 × 200`, `15 × 429`. Then `/upcoming` answers `{"error":"rate-limited"} [429]`, so it is the same bucket as the public reads | PASS |
| 12 | Result 5 | Answers `text/calendar; charset=utf-8` as an attachment named `pragma-concert.ics` | `curl -D -` | `content-type: text/calendar; charset=utf-8`, `content-disposition: attachment; filename="pragma-concert.ics"` | PASS |
| 13 | Result 6 | One event, with a stable UID from the session id | `curl` the file twice, count `BEGIN:VEVENT` | One `VEVENT`. `UID:1d247cbd-413f-439e-af94-fd644c1c5687@pragma.borso.fr` on both calls | PASS |
| 14 | Result 6 | The concert's start, and an end two hours later | Compare with `/upcoming` `date: 2026-12-04T09:48:11.458Z` | `DTSTART:20261204T094811Z`, `DTEND:20261204T114811Z`. A second concert at `2026-12-17T20:30Z` gives `DTSTART:20261217T203000Z`, `DTEND:20261217T223000Z` | PASS |
| 15 | Result 6 | Summary `pragma · <venue>`, or `pragma` without a venue | Seeded concert, then a concert whose venue was set to NULL in the local dev DB | `SUMMARY:pragma · Le Petit Bain`, then `SUMMARY:pragma` | PASS |
| 16 | Result 6 | The venue as location, left out when absent | Same two files | `LOCATION:Le Petit Bain`, then no `LOCATION` line | PASS |
| 17 | Result 6 | The public message as description, left out when absent | Seeded concert (message null), then one with `public_message = 'Bring earplugs; doors at 20:00, first set 20:30'` | No `DESCRIPTION` line, then `DESCRIPTION:Bring earplugs\; doors at 20:00\, first set 20:30` (escaped per RFC 5545) | PASS |
| 18 | Result 7 | A practice answers 422 `not-an-upcoming-concert` | Create a future practice as hugo, `curl` its calendar | `{"error":"not-an-upcoming-concert"} [422]` | PASS |
| 19 | Result 7 | A past concert answers 422 `not-an-upcoming-concert` | Create a concert 3 days ago as hugo, `curl` its calendar | `{"error":"not-an-upcoming-concert"} [422]` | PASS |
| 20 | Result 7 | An unknown id answers 422 `not-an-upcoming-concert` | `curl …/concerts/00000000-0000-4000-8000-000000000000/calendar` | `{"error":"not-an-upcoming-concert"} [422]` | PASS |
| 21 | Result 7 | An unknown id that is not a UUID | `curl …/concerts/not-a-uuid/calendar` | `400` with a `ZodError` body `Invalid GUID` | UNVERIFIABLE |
| 22 | Result 8 | The route reveals nothing the `upcoming` list does not already show | Compare every line of the file with the `/upcoming` entry, and the refusals for a practice, a past concert and an unknown id | The file carries only the id, date, venue and message, which `/upcoming` already lists. The three refusals are byte-identical, so a practice's existence does not leak | PASS |
| 23 | Edge | Dark mode keeps the control legible | `set media dark`, 1280 × 900, `fr` | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-27-0948/09-fr-dark-before-signup.png` | PASS |
| 24 | Reachability | The ticket lists a concert, and a fan can create a registration from it | Tap "Je serai là !", fill Camille / camille@example.com, Valider | Dialog "Tu es inscrit·e, Camille !", then the ticket shows "Inscrit·e" (`03-fr-after-signup.png`) | PASS |

## Notes

- **03 FAIL.** Before sign-up, the calendar link spills out of the ticket at widths from 640 px up to about 1030 px. At 768 px the ticket's right panel ends at x = 720, and "Je serai là !" sits at 518-704. The link sits at 714-981, almost entirely outside the card and the viewport. `documentElement.scrollWidth` is 981, so the page scrolls sideways. At 1024 px the link reaches 981, past the card edge at 976. The bar is `flex-wrap: nowrap`, `overflow: visible`, with `scrollWidth 511` against `clientWidth 248` at 768. Without the new link, "Je serai là !" alone fits at 768, so this change causes the overflow. The bar fits at 375, 639, 640 and 1280.
- **04 FAIL.** After sign-up, the link overflows the ticket at every width from 640 px up that I measured beyond 640. At 1280 px the card ends at x = 1120 and the link reaches 1229, drawn over the page background. At 768 and 1024 px the link sits at 851-1117, fully off-card, and at 768 fully off-screen (`documentElement.scrollWidth` 1117). At 1440 px it reaches 1309 against a card edge at 1200. "Inscrit·e" and "Un·e ami·e" already reach 841 at 768, past the 718 bar edge, so that bar overflowed before this change. The new link makes it worse and pushes itself out of view. At 375 and 639 the icon-only form fits.
- **09 UNVERIFIABLE.** The OS prompt to add the event to a calendar app needs a real phone. What is checkable passed in row 08: a same-tab document request answered 200 with the `text/calendar` attachment.
- **21 UNVERIFIABLE.** A malformed id answers 400 with a zod error, not 422 `not-an-upcoming-concert`. The spec says "an unknown id" and does not say whether a malformed id counts as one. The sign-up route uses the same `concertParamSchema` and would answer the same 400.
- Setup. A concert without a venue or with a public message cannot be created through the API. For rows 15-17 I set them in the local dev database (`pragma_dev_186627034`). I deleted the three sessions I created after the run. The test registration "Camille" on the seeded concert remains until the next reseed.

## Verdict: FAIL
