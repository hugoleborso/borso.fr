# Chart pills named in one word

## Goal

The chart switcher, the row of pills above a chart on a song's Chords tab,
named each chart by all its instruments and its label, such as
"Chant + Guitare + Piano + Batterie + Chœurs · Accords". That is too long on
a phone. The operator asked that each pill read one word.

## Rule

- A chart for exactly one instrument reads that instrument's name, such as
  "Basse".
- A chart for several instruments, or for every instrument (none chosen),
  reads "Accords" in French and "Chords" in English when it is a ChordPro
  chart, and "Ensemble" in both languages when it is a PDF or an image.
- A title already on an earlier pill gets its rank: "Basse", then
  "Basse 2", then "Basse 3".
- The chart label no longer shows on the pill. It stays in the edit form.
- A song with one chart shows no switcher, as before.

## Assertions

1. A song with a ChordPro chart for Chant and Guitare and a PDF chart for
   Basse shows two pills, "Chords" and "Basse" (English UI).
2. A song with two charts for every instrument, one ChordPro and one PDF,
   shows "Chords" and "Ensemble".
3. A song with two charts for the same single instrument shows its name,
   then its name followed by " 2".
4. Every pill fits on one line at 375 px wide for a song with two charts.
5. The song scene (full screen) shows the same titles for its ChordPro
   charts.
