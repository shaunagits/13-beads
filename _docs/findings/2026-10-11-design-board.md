# Design board and screenshot recipe (2026-10-11)

## Question

How to give Shauna a board where she can refine the main screens, without rebuilding the game in a design tool.

## What was built

A Claude design canvas, "13 Beads screens": https://claude.ai/artifact/Qk83C6ApFhPk5JgtKghznm (private to Shauna until she shares it).

- Row 1 Stringing, row 2 Finished and wall, row 3 Menus and pop-ups.
- Editable mockups (light mode, 400 x 780): `Main` (stringing), `Finished`, `Wall`, `Menu`, `Share`, `Decorate`. Markup and colors are copied from `src/style.css` and the icons from `index.html`. The pop-up boards import the screen behind them (`<dc-import name="Main">` and so on), so a change to a screen shows under its pop-up.
- The 3D views (string, tied loop, wall with cones) and the bead compartment pictures are uploaded PNGs, not live 3D. They can be moved and resized on the board but not reshaped.
- Reference boards are plain screenshots: dark mode for every screen, desktop for Stringing and the Wall.
- Each mockup has one tweak, the accent color.

Nothing on the board reaches the game. Changes Shauna makes there have to be built into `src/` by hand.

## How the pictures were made

Cloud Playwright with the pre-installed Chromium and the swiftshader flags from `CLAUDE.md`, against `npx vite preview` of a fresh build.

- Seed the wall before load with `page.addInitScript` writing `13beads.stack` (three short bracelets), guarded by a `sessionStorage` flag so a reload does not reseed.
- Wait about 6 seconds after load for the starter to finish stringing; 4 to 5 seconds after tie-off and after opening the wall.
- Pop-ups fade in: wait at least 2 seconds before a screenshot, or they are caught half transparent.
- For a 3D view without buttons, hide `#hud` and `#count` (`visibility: hidden`) and screenshot the `#stage` rectangle.
- Compartment pictures are already data URLs on `#tray .bead-btn img`; decode them straight to PNG files.

## Before redoing it

- The board is a snapshot of the game on 2026-10-10 (Surprise compartment, jump chips, two strands off). Recapture if the screens have changed.
- Assets upload to the canvas with the Artifact tool (`asset: true`), then are referenced by their `/_blob/<id>` URL.
