# Scene preferences and stage status bar

A musician reading a chart on stage sees a cream band above the dark scene, and loses the zoom, the transposition and the scroll speed every time a scene opens. This change removes both.

## Assertions

1. While a scene is open (song scene or setlist scene), every `meta[name="theme-color"]` holds the stage background colour, `rgb(13, 10, 7)`.
2. Once the scene is left, each `theme-color` meta holds its paper colour again: `#f5f1e8` for light and `#16130f` for dark.
3. The zoom and the scroll speed chosen in a scene are shown again the next time any scene opens on the same device, after a reload too.
4. The transposition is kept per song. In a setlist scene, transposing song 1 to +2 then moving to song 2 shows +0; going back to song 1 shows +2, after a reload too.
5. The scene works at 375 px wide.
