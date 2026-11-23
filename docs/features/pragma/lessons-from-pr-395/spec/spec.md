# Spoken joker days and a cache keyed by response shapes

The sweep of PR #395 changes two things a member can meet in pragma.

## Use cases

### A member opens the flames sheet

- On Home, a tap on the flame chip opens the sheet titled "Flames".
- In the jokers card, each spent joker shows its short weekday, such as "Wed", under its pip.
- A screen reader hears that pip as "Wed, saved by a joker", and does not hear the bare "Wed".
- A joker still left shows no weekday and nothing is read for it.
- The card fits a 375 px wide screen without horizontal scroll.

### A member reloads the app

- After a first load, the browser's `localStorage` holds `pragma.query-cache`, and its `buster` is a 12-character hexadecimal string, not `'3'`.
- After a reload, Home shows the same flame chip and sessions, without an error screen.
