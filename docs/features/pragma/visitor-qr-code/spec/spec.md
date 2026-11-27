# Visitor QR code

A band member shows a QR code on their phone during a concert, and a fan scans it to reach the public concert sign-up page. The operator chose the scope in this session: a "QR code visiteur" button on the members' home and on each concert, both answers given on 2026-11-27.

## Who it is for

- A band member, on a phone, at a concert, who wants fans to sign up without typing an address.
- A fan, who scans the code with their phone camera.

## Use cases

1. On the members' home (`/app`), a "QR code visiteur" button sits in the page header actions, next to the streak chip. It shows whether or not a concert is ahead.
2. On a concert session, the "Page publique" tab shows the same button at the top of the tab. A practice session has no such tab and no button.
3. The button opens a bottom sheet (the existing `Sheet` molecule) titled "QR code visiteur". The sheet holds the QR code, large, and under it the address it leads to, in the mono font, for example `pragma.borso.fr`. A "Fermer" control closes it, as every sheet does.
4. The code encodes `<page origin>/`. In production that is `https://pragma.borso.fr/`. On a preview it is the preview's own address, so the preview can be tested by scanning.
5. The code is dark modules on a white square with a quiet zone of at least four modules, in light and dark theme alike, because phone cameras read dark on light most reliably. It is as wide as the sheet allows at 375 px, capped so it stays inside the screen on a computer.
6. The code draws with no network request, so it works in the installed app in a bar with no signal ([ADR-2026-11-27T1426](../../../../adr/2026-11-27T1426-qr-code-library-for-visitor-qr.md)).

## Rules

- Every visible string goes through `en.json` and `fr.json` ("Visitor QR code" in English).
- Every screen works at 375 px.
- No API, schema or route change.

## Out of scope

- Raising the screen brightness while the code shows.
- A printable poster with the code.
- A code per concert. The public page always shows the next concert, so one address serves them all.
