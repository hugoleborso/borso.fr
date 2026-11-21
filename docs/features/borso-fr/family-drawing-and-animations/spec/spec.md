# Mom's drawing and the girls' page animations

## Goal

The operator asked to remove mom's photo from borso.fr, replace it with a child's drawing, and improve the animations on the girls' page.

## Assertions

### Mom's page, `/family/mom.html`

1. The page shows no photograph of mom. It shows a crayon-style child's drawing of her, with a curly white wig, a big white dress, a baby in her arms, a sun and hearts.
2. The drawing is not cropped into a circle. It sits on a white card that tilts and bounces.
3. The title "Je t'aime maman" stays, and the background still cycles colours.
4. `site/family/mom.png` no longer exists in the tree.

### The girls' page, `/family/les-filles.html`

5. Each letter of the title "Bonne journée bande de crottons" waves in turn, and no word breaks across two lines at 375 px.
6. The photo of the girls stays round, wobbles gently and pulses a glowing halo.
7. About 30 poops fall over the whole screen from the first frame, each with its own size, sway and spin.
8. Tapping the photo squishes it and bursts poops out from the tap point. The burst pieces fade and leave the page.
9. No hint text tells the visitor to tap the photo. The burst stays a hidden surprise.
10. "Votre frère qui vous aime" fades in at the bottom right after a few seconds.
11. With reduced motion requested, no poop falls and the message shows at once.

### Both pages

12. At 375 px wide, neither page scrolls sideways and the console shows no error.
