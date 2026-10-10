# 13 Beads

A craft room in the browser, for the concert bracelet-trading crowd. The player strings a friendship bracelet in 3D, ties it off, and hangs it on a display wall. A portfolio piece by Shauna.

Read `_docs/PROJECT_STATUS.md` first, then `_docs/TODO.md`. `README.md` covers the code layout and how to add a bead.

## Where things are

- Live: https://games.shauna.digital/13-beads (also https://13-beads.vercel.app)
- Repository: `shaunagits/13-beads`. Vercel project `13-beads`, team `shaunagits-projects`. Every push to `main` deploys to production.
- Local copy on Shauna's Mac: `~/Desktop/claudecode/13-beads`
- Games home page: separate repository `shaunagits/games`, live at https://games.shauna.digital

## Run and check

```
cd ~/Desktop/claudecode/13-beads && npm install && npm run dev
```

Then open http://localhost:5173.

There is no test suite. The check is `npm run build` (must finish with no errors) plus looking at the result in a browser. In a cloud session, take screenshots with Playwright and the pre-installed Chromium, launched with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, at phone (400 x 780) and desktop sizes, in light and dark.

## Rules that must hold

- Stack: Vite and Three.js, plain JavaScript modules, no framework, no backend, no accounts. Player data lives in local storage under `13beads.strand`, `13beads.stack`, `13beads.wall` (wall color and neon sign word), `13beads.theme` (light or dark, once the player picks one), and `13beads.color` (the color picked on the bead case's color strip).
- `vite.config.js` keeps `base: './'`. The game is served both at a domain root and under `/13-beads`.
- Third-party 3D models need a license that allows hosting on a public site (CC0 or CC BY), or written permission. See the heart-hands finding.
- Mobile first. Every change is checked at phone width.
- Respect `prefers-reduced-motion`.

## How Shauna works

- No em dashes in any text, especially text players see.
- No AI or assistant credit in code, commits, or docs.
- After local changes, give the full run command with the project path.
- Flag open questions at the end of each reply, and keep repeating unanswered ones until she answers.
- She cannot create GitHub repositories from a session. She creates empty ones on request.
- Organic shapes built from code primitives have been rejected twice (a display arm, then heart hands). Geometric objects built in code look good. Organic ones need a real model.
