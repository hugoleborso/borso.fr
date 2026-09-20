# Design exploration — setlist density

These three renders are where the spec's decisions come from. They were drawn at
real size and read at real size, which is why the spec can say that a glyph set
was refused at 17 px rather than in principle. Each one is the artefact behind a
row of the spec's [Questions, Options and Decisions](../spec/spec.md#questions-options-and-decisions)
table.

## [`sheet.png`](./sheet.png)

Two columns. On the left, four icon sets rendered at 34, 24, 20 and 17 px, each
tinted with the colour of the member holding the instrument: Lucide alone with
the guitar standing in for the bass, Lucide plus the generated bass, Lucide plus
a traced bass, and Qlementine throughout. This is the evidence behind the icon
set decision and the bass construction decision. Read the 17 px row, which is
the size the column ships at.

On the right, six row layouts at 375 px wide: the card as it was before this
feature with no lineup at all, the column inline at 20 px, the column inline at
17 px and compressible, the column replacing the artist line, the column on a
second row, and the card with no album cover. This is the evidence behind the
column placement decision, which picked the third one.

## [`lineup-preview.png`](./lineup-preview.png)

The dense card with the column in place, five songs deep, with a held seam and a
risky seam between them. It shows what the spec means by scanning a column: the
instrument icons sit at the same horizontal position on every row, so an
instrument changing hands reads as a colour change down a fixed line. It also
shows the two seam heights and the colour a seam carries.

## [`qle-vs-mine.png`](./qle-vs-mine.png)

The icon set comparison in full. Qlementine's 67 music glyphs at the top, filled
and one path each, with a strip of them at 15 px that shows why they were
refused. The generated stroke set in the middle, fitted inside the same viewbox
as the Icon atom so the weights match. Lucide's own 34 candidates below, which
is what the column uses wherever Lucide has the instrument. The three row
layouts at the bottom repeat the placement question against the final glyphs.
