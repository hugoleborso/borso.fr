# Visual validation — Pause the sign-up follow-up questions

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-28T11:31:08Z
- Tooling: agent-browser 0.41.2

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result 1 | The public concert page at `/` shows "Je serai là !" (English "I'll be there!") | Open `/` at 375 × 812 with the en locale, then with `pragma.locale=fr`; snapshot | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/01-concert-page.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/10-fr-concert-page.png`; snapshot `button "I'll be there!"` / `button "Je serai là !"` | PASS |
| 02 | Result 1 | That button opens a sheet with only a first name and an email field | Click the button, list visible `input, select, textarea` labels (en and fr) | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/02-sign-up-sheet.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/11-fr-sign-up-sheet.png`; labels = `["First name","Email"]` and `["Prénom","Email"]` | PASS |
| 03 | Result 2 | After a valid sign-up and the opening animation, no sheet asks "Tu viens soutenir qui dans le groupe ?" | Fr locale, submit with Enter, poll `body.textContent` every 50 ms for 5 s; record | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/13-fr-sign-up-enter.gif`; strings seen = `["Inscrit"]`, "soutenir qui" never present | PASS |
| 04 | Result 2 | …and none asks "Un morceau que tu rêves de nous entendre jouer ?" | Same 50 ms poll for "rêves de nous"; en run polled "Who in the band" / "dream of hearing" | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/05-sign-up-flow.gif` (opening logo animation, then the ticket); question text never present in either locale | PASS |
| 05 | Result 2 | The ticket shows "Inscrit·e" (English "Signed up") right away | Read the ticket text at the end of the animation, both locales | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/06-ticket-signed-up.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/14-fr-ticket-inscrit.png`; body text contains `Signed up` / `Inscrit·e`; first 1 s poll already true | PASS |
| 06 | Result 3 | "Un·e ami·e" (English "Sign up a friend") is offered after sign-up | Snapshot after sign-up, both locales | snapshot `button "Sign up a friend"` (visible text "A friend") / `button "Inscrire un·e ami·e"` (visible text "Un·e ami·e") | PASS |
| 07 | Result 3 | The friend path asks only first name and email | Click the friend button, list visible field labels | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/07-friend-sheet.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/15-fr-friend-sheet.png`; labels = `["First name","Email"]` / `["Prénom","Email"]` | PASS |
| 08 | Result 3 | …then the ticket, with no follow-up questions | Submit the friend, poll text for 4 to 5 s, record (en); 50 ms poll (fr) | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/08-friend-flow.gif`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/09-friend-ticket.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/16-fr-friend-ticket.png`; question strings seen = `[]`, 0 visible inputs; both friend POSTs to `/api/concert-registrations/concerts/<id>/registrations` returned 201 | PASS |
| 09 | Result 4 | At 375 px wide the page never scrolls sideways | `scrollWidth` vs `clientWidth` on the page, the open sheet, and sampled every 30 to 50 ms through both sign-up flows and the friend flow | `scrollWidth = clientWidth = 375` at every check; phone-session sampler logging `scrollWidth !== clientWidth` recorded 0 samples over a full sign-up | PASS |
| 10 | Edge | Empty submit does not sign up and does not open a follow-up | Click Confirm with both fields empty | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/03-empty-submit.png`; `validationMessage` = "Please fill out this field." on both inputs | PASS |
| 11 | Edge | Invalid email blocks submission | Fill "not-an-email" | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/04-invalid-email.png`; Confirm `[disabled]` | PASS |
| 12 | Edge | Escape mid-flow closes the sheet without signing up | Type a first name, press Escape | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/12-fr-escape.png`; snapshot shows `button "Je serai là !"` again, no ticket | PASS |
| 13 | Edge | Enter submits the two-field form straight to the ticket | Press Enter in the email field | Row 03 evidence; `Inscrit·e` shown, no question | PASS |
| 14 | Edge | Reload after sign-up keeps "Inscrit·e" and shows no question | Reload `/` after sign-up | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/17-fr-reload.png`; `{inscrit:true, q:false}` | PASS |
| 15 | Error | A failed registration does not show a ticket or a question | `network route **/registrations --abort`, submit | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/18-fr-post-aborted.png`; text "pragma n'a pas pu joindre les données du groupe." with "Réessayer", button stays "Je serai là !", `scrollWidth` 375 | PASS |
| 16 | Edge | A real touch tap opens the two-field sheet and completes the sign-up on a phone | `scripts/phone.sh start`, `touch "text=I'll be there!"`, fill, `touch 'text=Confirm'` | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/19-phone-tap-sheet.png`, `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/20-phone-ticket.png`; labels `["First name","Email"]`, `Signed up` true, question strings `[]` | PASS |
| 17 | Edge | Dark mode sheet carries only the two fields | `set media dark`, open the sheet | `https://screenshots-pr-<n>.preview.borso.fr/2026-11-28-1127/21-dark-sign-up-sheet.png`; labels `["Prénom","Email"]`, `scrollWidth` 375 | PASS |
| 18 | Reachability | The public page offers a path to create a registration, for oneself and a friend | Followed both paths to a 201 POST | Rows 05 and 08 | PASS |

## Notes

- No FAIL or UNVERIFIABLE row.
- Row 09: a first phone-session probe that tracked the maximum `scrollWidth` read 1280. A 20 ms sampler across a neutral `scripts/phone.sh touch 'h1'` showed `innerWidth/scrollWidth/clientWidth` = `1280/1280/1280` for a moment, then `375/375/375`. So the whole viewport was 1280 wide during the tap (measured), and the page never overflowed its own viewport. The probe that logs only `scrollWidth !== clientWidth` recorded nothing over a full sign-up. Logged as friction.
- Outside the spec: in the fr locale the sheet's backdrop button keeps the English accessible name "Dismiss", while its other controls read "Fermer", "Prénom" and "Valider" (measured by snapshot). Logged as friction. It is not a verdict row.

## Verdict: PASS
