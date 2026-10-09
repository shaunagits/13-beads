# 13 Beads

A craft room in the browser. String a friendship bracelet, spell a phrase, finish it, and put it on display on your wall.

Built with Vite and Three.js. No backend and no accounts: everything a player makes is saved in their browser's local storage.

- Live: https://games.shauna.digital/13-beads (also https://13-beads.vercel.app)
- Hosting: Vercel project `13-beads`, deployed automatically from the `main` branch of this repository.
- The games home page that links here lives in the separate `games` repository.

## Run locally

```
npm install
npm run dev
```

## How the code is organised

| File | What it holds |
|---|---|
| `index.html` | Page structure: header, stage, the bead tray panel, and the controls that float on the canvas for the tie-off and wall screens (`#hud`, shown per mode with `data-show`). |
| `src/main.js` | The 3D scene, string physics, pointer and tilt input, the tie-off animation, the wall (stand, lighting moods, depth of field), and photo export. |
| `src/beads.js` | The bead and charm catalog, and the code that builds each one in 3D. |
| `src/audio.js` | Musical sounds: every sound is a note in one key, voiced by an acoustic guitar model by default. |
| `src/style.css` | Layout and colors, light and dark. |
| `src/assets/` | Tabletop textures: CC0 scans from Poly Haven (Plywood, lightened; Dark Wood). |

The app has three modes, set by `setMode` in `main.js`: `line` (stringing), `tied` (the finished loop), and `stack` (the wall).

## Add a bead or charm

1. Add an entry to `BEADS`, `CHARMS`, or `DANGLES` in `src/beads.js`.
2. Give it a width in `UNIT`. Hanging charms also go in the `DANGLE` set.
3. Add a builder for its shape in `CHARM_BUILDERS`. Hanging charms start with `hanger(g)`.
4. Optionally give it a sound role in `KIND` in `src/audio.js`: `bell` (adds a bell an octave up), `low` (an octave down), or `soft` (a soft swell).

## Design rules

- `vite.config.js` sets `base: './'` so the game works both at a domain root and under `/13-beads`. Keep asset paths relative.
- Saved data keys: `13beads.strand` (the bracelet in progress), `13beads.stack` (finished bracelets), and `13beads.wall` (wall color and neon sign word).

## Project docs

- `CLAUDE.md`: orientation and the rules that must hold.
- `_docs/PROJECT_STATUS.md`: what exists, what is unverified, and the decisions table.
- `_docs/TODO.md`: the queue.
- `_docs/findings/`: research worth keeping, including how to get a heart-hands 3D model.
