---
status: done
summary: Visual row 06 fixed. A take row's summary wraps instead of truncating, so at 375 px the date, session, duration and member all show on two lines; the separator carries a no-break space so a line never starts with a dot. TakeList.test.tsx asserts the summary carries no ellipsis class and holds every fact. Core 2506/2506, back-e2e 259/259, typecheck, eslint and prettier clean.
next:
  kind: validate
artifacts:
  - apps/pragma/site/src/components/organisms/TakeList.tsx
  - apps/pragma/site/src/components/organisms/TakeList.test.tsx
---

Root cause: the summary span used `truncate` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`), so a line wider than the row was cut after the session name on a phone. The span now uses `min-w-0 break-words` and wraps.

Self-check: the row's markup and classes rendered at 375 px in a 300 px row with the validator's text, "Sat, Oct 24, 2026 · Practice · 0:17 · Hugo", wrap onto two lines with "0 comments" on the right and nothing hidden. That page was a copy of the row, not the running app, so row 06 should be checked again on the real song page.
