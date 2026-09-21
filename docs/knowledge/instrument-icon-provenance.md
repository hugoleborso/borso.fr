# Where pragma's instrument glyphs come from

The lineup column on a setlist card draws one glyph per instrument at
17 px. Six glyphs ship with the application, and they do not all come
from the same place. This page records which is which, because the
no-comments rule keeps the notice out of `Icon.tsx` and a licence
notice that lives nowhere is a licence notice nobody honours.

The glyphs live in the `ICONS` map in
[`apps/pragma/site/src/components/atoms/Icon.tsx`](../../apps/pragma/site/src/components/atoms/Icon.tsx),
under the keys `micVocal`, `guitar`, `bass`, `piano`, `drum` and
`music`. [ADR-0022](../adr/0022-instruments-carry-their-own-icon-order-and-primacy.md)
is the decision to copy path data into that map rather than add an
icon library as a dependency.

## Five glyphs are Lucide, copied verbatim

`micVocal`, `guitar`, `piano`, `drum` and `music` are the Lucide icons
of the same names, taken from `lucide-static` 1.47.0. The path data is
copied unchanged. Only the wrapper differs: the atom sets
`viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` and
`strokeWidth="1.6"` once for every glyph, where Lucide's own files
carry `stroke-width="2"` per file.

Lucide is ISC licensed, which permits use and redistribution with the
copyright notice preserved. The notice:

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022
as part of Feather (MIT). All other copyright (c) for Lucide are held
by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for
any purpose with or without fee is hereby granted, provided that the
above copyright notice and this permission notice appear in all
copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL
DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR
PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

## The bass is ours, and it is built rather than drawn

Lucide has no bass. The sixth glyph was generated for this repository
from a photograph of the operator's own instrument: the photograph was
traced to get the proportions, and the traced proportions were then fed
to a parametric build that emits the path data. Tracing alone gave
fretboard edges that were close to parallel and not exactly parallel,
which reads as a bent neck at any size; the parametric build makes both
edges parallel by construction.

The two facts a future editor needs before touching that entry:

- The glyph is six paths in this order: the body, the upper fretboard
  edge, the lower fretboard edge, the headstock, and two tuner
  notches. The two edge paths run from (12.35, 13.83) to (18.87, 7.31)
  and from (10.02, 12.70) to (17.14, 5.58), both at exactly -45
  degrees. Moving either endpoint by hand breaks the one property the
  build exists to guarantee.
- The tuner notches disappear below about 24 px. That is deliberate.
  The alternative shape kept them visible and read as the jaw of a
  wrench at 17 px, which is the size the column actually renders.

Below about 24 px nothing identifies the glyph as a bass rather than a
guitar beyond its proportions, which is the honest limit of a 17 px
stroke icon and the reason the column is positional in the first place:
the reader learns which column is the bass, and the glyph confirms it.
