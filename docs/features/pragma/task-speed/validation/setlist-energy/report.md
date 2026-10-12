# Energy curve toggle

The energy curve keeps its full height (56px on a phone, 72px from `sm`).
A chart icon on the setlist page's action row shows or hides it; it starts
shown, and the icon is outlined while the curve is visible.

At 375 x 667 the first song starts at 264px with the curve and at 177px
without it. `375-energy-shown-and-hidden.png` shows both.

The choice lasts while the page stays open; it is not remembered between
visits.
