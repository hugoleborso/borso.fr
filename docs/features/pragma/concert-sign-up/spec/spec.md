# Concert sign-up page

pragma.borso.fr becomes a public page where anyone signs up for the next pragma concert. The first use is the 17 December 2026 concert at Punk Paradise, where three free beers are drawn among the registrants. The operator set the scope in the session that built it, and validated the design on mockups ("parfait, on y va", 2026-11-26). This file records that scope so the review has a contract.

## Who it is for

- A fan, on a phone, who opens pragma.borso.fr from a post on social media.
- A band member, who sets the poster, the prize and the message of a concert and draws the winners.

## Use cases

1. A visitor on `/` sees only the next concert, the first one dated today or later. The page has the pragma logo, the concert ticket and one "Je serai là !" button. There is no link to the members' area. With no concert ahead, the page shows an empty state.
2. The ticket always shows the date and the hour large. With a poster, the whole poster shows above a dark band that holds "17", "DÉCEMBRE", "JEUDI" and a clock icon with "20 h". Without a poster, the dark band becomes the top of the ticket, with the day number very large. The poster is never cropped.
3. The venue is a link with a map-pin icon. It opens a Google Maps search for the venue text (`https://www.google.com/maps/search/?api=1&query=<venue>`).
4. The concert message shows under the venue when a member set one.
5. When a member set a prize, a yellow coupon below a dashed line shows the prize's icon and label, for example a beer and "3 bières à gagner". Without a prize there is no coupon.
6. "Je serai là !" opens a bottom sheet with a first name and an email field and a "Valider" button. While the request runs, pragma's opening screen shows "On s'accorde…". It leaves with its usual exit animation, or at once under reduced motion.
7. One mailbox signs up once per concert. The check runs on a canonical email that `validator`'s `normalizeEmail` computes, plus a `+tag` dropped on every domain. A second sign-up of the same mailbox is refused with "Cet email est déjà inscrit à ce concert". A throwaway mailbox that `mailchecker` knows is refused with its own message ([ADR-2026-11-26T0937](../../../../adr/2026-11-26T0937-email-dedup-libraries-for-concert-registration.md)).
8. After signing up, a second bottom sheet reads "Tu es inscrit·e, <first name> !" and asks two optional questions: "Tu viens soutenir qui dans le groupe ?" (one band member as a chip with the member's colour mark, or none) and "Un morceau que tu rêves de nous entendre jouer ?" (one pick from a Deezer search whose placeholder reads "Cherche un morceau, un artiste…"). "Passer" skips both, "Envoyer" sends them. Only the browser that signed up can send these answers, through an edit token.
9. Once signed up, the button area reads "Inscrit·e" and, beside it, "Un·e ami·e" reopens the sign-up sheet for someone else. The browser remembers the sign-up per concert, so a returning visitor sees "Inscrit·e".
10. A wished song resolves onto the catalogue song linked to that Deezer track. Otherwise it creates a song with status `idea`. The catalogue gains a "Proposées par les fans" filter listing every wished song.
11. On a computer, the ticket is horizontal. The poster, or the dark date panel when there is none, is on the left. The right side holds the date, the hour, the venue, the message and the button, with the coupon at its bottom.
12. A member, on a concert's "Page publique" tab in the ERP:
    - replaces or removes the poster, sent as a PDF, JPEG, PNG or WebP of 10 MB at most. A PDF's first page is drawn to a PNG in the browser and the white margins around it are trimmed before the upload, so the operator's poster PDF (a portrait poster centred on a white landscape page) shows as the poster alone;
    - sets or clears the prize label, and picks its icon among beer (the default), gift, ticket and t-shirt (Lucide icons);
    - sets or clears the public message;
    - lists the registrations, each with its first name, its email, who it comes for and its wished song;
    - presses "Tirer au sort 3 gagnants", which picks three registrations at random in the browser and saves nothing.
13. The ERP home moves from `/` to `/app`. Every link and redirect to it follows, and the installed app opens on `/app`. Every other ERP route keeps its path.

## Rules

- Emails are personal data. Previews never clone `concert_registration`, and the production read-only reader cannot read it.
- No IP or device address is stored to detect duplicates: people at one venue share an IP.
- Deleting a concert deletes its registrations.
- The public API exposes only a member's id, first name and colour.
- Every public write is rate limited.
- Every visible string goes through `en.json` and `fr.json`. Every page works at 375 px.
- The validated mockups are the reference for layout and copy.
