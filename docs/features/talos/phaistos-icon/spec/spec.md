# Talos icon and opening

## Goal

The owner chose a new mark for the Talos PWA: a didrachm of Phaistos showing Talos, in bronze on a warm black. It replaces the old "T" mark everywhere the app shows a mark. A short opening plays when the app starts cold, then hands over to the app.

## Data shape

- `DockTargetBox { left, top, width, height }`: the header logo's box in viewport pixels.
- `ViewportSize { width, height }`.
- `DockMove { x, y, scale }`: the move from the coin's resting centre (50% across, 42% down, 150 px wide) onto the centre of the header logo. `x` and `y` are in pixels, and `scale` is the logo width divided by 150. With no logo on screen it is `{ 0, 0, 0 }`, so the coin shrinks where it stands.
- Session flag: `sessionStorage['talos.opening-played'] = '1'`.

## The icon

1. The manifest icons (192, 512, maskable 512), the apple-touch icon (180) and the favicons (`favicon.ico` with 16, 32 and 48, `favicon-32.png`, `favicon-16.png`) show the coin. The old SVG "T" files are removed.
2. The maskable icon keeps the whole coin inside the 80% safe circle.
3. The colour of the coin is not changed.
4. The page title of each tab screen (Today, Todo, Proposals, Brain, Message) opens with the coin face, 28 px, inside the title line, so it adds no height. It is the dock target of the opening (`data-opening-dock`). The owner refused a header bar that costs height.
5. The service worker cache version moves to `talos-v2`. A device that cached the old icons under the same names then fetches the new ones.
6. The manifest `background_color` is the opening's black, `#070605`, so Android's launch screen leads into the opening without a flash.
7. The README credits the photo: Didrachme de Phaistos, Cabinet des médailles (BnF), photo Jastrow, Wikimedia Commons. Commons lists it as public domain.

## The opening

1. It plays on a cold load once per browser session. A reload in the same session and a navigation inside the app do not play it again.
2. It is skipped under `prefers-reduced-motion: reduce`. The app's base stylesheet already forces every animation to zero there, so a fade would be cut to nothing.
3. Over about 4.2 seconds, on black:
   - The coin arrives spinning twice, so the BORSO back, the thick edge and the Talos face each show. It slows down and stops facing the screen on Talos.
   - A raking light sweeps the relief, a bronze halo appears, and "TALOS" settles under the coin.
   - The app opens in a circle growing from the coin. The coin then flies onto the coin in the page title, whose position is measured when the reveal starts and again when the flight starts.
4. A tap anywhere skips it. The skip runs on `click`, so the tap is spent on the overlay and never reaches the app beneath.
5. The app loads behind it and is never blocked. The overlay leaves the DOM when the coin lands.
6. No `opacity`, `filter` or `mix-blend-mode` reaches the element that holds the 3D context (`preserve-3d`), because each one flattens it and the back then shows as a mirrored face. The fade-in is on the wrapper that carries the perspective. The coin's layers are flat leaves with no children, so the gleam layer may fade its own opacity, as in the validated prototype.

## Out of scope

- The 512 and 1024 originals in the owner's Drive. This session had no Drive access, so every size is derived from the 360 px copies in the validated prototype.
