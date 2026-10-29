---
summary: 'Under `ignoreStatic`, a gated file of module-level tables gets no mutant and passes with a score of NaN; its `toEqual` tests are the only pin, and the drawing needs a screenshot.'
triggers:
  output:
    - 'Final mutation score of NaN'
---

# A file of constant tables passes mutation with no mutant

`stryker.shared.js` sets `ignoreStatic: true`. A static mutant changes a value
computed once when the module loads, so Stryker would have to re-run every test
for each one, and it drops them instead.

A gated file that holds only module-level tables has nothing else to mutate.
Measured on 2026-10-29 on `apps/pragma/site/src/components/atoms/flame-mark.utils.ts`
from PR #234:

```
Instrumented 1 source file(s) with 51 mutant(s)
 flame-mark.utils.ts |    n/a |     n/a |        0 |         0 |          0 |
Final mutation score of NaN is greater than or equal to break threshold 100
```

The gate passes and measures nothing. Sixteen gated files in `apps/` held no
function on that date (measured with a grep for `function ` and `=>`), most of
them limits and codes that the api and the site share. For those, the n/a is
the right answer, because there is no logic for a mutant to break.

What pins such a file is a test that compares each table whole with `toEqual`.
Any edited value then fails it, which is what a killed static mutant would have
shown. A test that checks only a prefix, such as `startsWith('M12 1.8')` on an
SVG path, leaves the rest of the value free. The flame paths were checked that
way until the kaizen of PR #234 pinned them whole. Whether the paint and the geometry
look right is a question for a screenshot, in `/visual-validation`, and not for
mutation.

See [`how-a-mutation-survivor-hides.md`](./how-a-mutation-survivor-hides.md) for
the cases where a mutant does exist and still hides.
