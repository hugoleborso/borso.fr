# Concert sign-up page

pragma.borso.fr becomes a public page where anyone signs up for an upcoming concert. The first use is the 17 December 2026 concert at Punk Paradise, where three free beers are drawn among the registrants. The operator set the scope in the session that built it. This file records that scope so the review has a contract.

## Who it is for

- A fan, on a phone, who opens pragma.borso.fr from a post on social media.
- A band member, who sets the poster and the message of a concert and draws the winners.

## Use cases

1. A visitor on `/` sees every concert from today onward, soonest first. Each one shows its poster when set, its date, its venue and its message with line breaks kept. With no concert ahead, the page shows an empty state.
2. A visitor types a first name and an email and presses "Je serai là !". While the request runs, pragma's opening screen shows "On s'accorde…". It leaves with its usual exit animation, or at once under reduced motion.
3. One mailbox signs up once per concert. The check runs on a canonical email that `validator`'s `normalizeEmail` computes, plus a `+tag` dropped on every domain. A second sign-up of the same mailbox is refused with "Cet email est déjà inscrit à ce concert". A throwaway mailbox that `mailchecker` knows is refused with its own message ([ADR-2026-11-26T0937](../../../../adr/2026-11-26T0937-email-dedup-libraries-for-concert-registration.md)).
4. After signing up, an optional sheet asks who the visitor comes for (one band member, or none). It also asks for one song they would love to hear at a later concert, picked from a Deezer search. "Passer" skips both. Only the browser that signed up can send these answers, through an edit token.
5. A wished song resolves onto the catalogue song linked to that Deezer track. Otherwise it creates a song with status `idea`. The catalogue gains a "Proposées par les fans" filter listing every wished song.
6. A member, on a concert's page in the ERP, sets or clears the public message, uploads a poster (JPEG, PNG or WebP, 10 MB at most), and lists the registrations. Each one shows its first name, its email, who it comes for and its wished song. "Tirer au sort 3 gagnants" picks three registrations at random in the browser and saves nothing.
7. The ERP home moves from `/` to `/app`. Every link and redirect to it follows, and the installed app opens on `/app`. Every other ERP route keeps its path.

## Rules

- Emails are personal data. Previews never clone `concert_registration`, and the production read-only reader cannot read it.
- Deleting a concert deletes its registrations.
- The public API exposes only a member's id and first name.
- Every public write is rate limited.
- Every visible string goes through `en.json` and `fr.json`. Every page works at 375 px.
