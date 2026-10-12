# Wall not loading, and the bead size audit (2026-10-12, session 7)

## Wall not loading

Shauna reported the wall did not load after session 6. It was working again before a cause was found.

Checked, all fine:
- The live site (both addresses) served the same build file as `main` (`assets/index-*.js` name compared with `curl`).
- `npm run build` clean.
- Cloud renderer at 400 x 780: wall opened with no page errors for an empty wall, bare bead-list saves, old hue-style beads (`{k, h, s, l}`), old wall settings (`word` field), a name set, traded two-strand entries, 24 bracelets, and dark mode.
- Shauna's desktop Chrome (via Claude in Chrome): no errors; that browser had no bracelets saved.

Not found: the cause. Candidates were a deploy in progress, the offline copy serving an older page for a moment, or a slow first draw on a phone. The staying-current check (`checkBuild` in `src/main.js`) was added afterward.

Before redoing this: ask which device, how many bracelets, and what "doesn't load" looked like. Read the phone's own console if it happens again (Safari Web Inspector over USB).

## Bead size audit

Method: in the dev server, import `src/beads.js` in the page, build each bead with `makeBead`, and measure its bounding box. One game unit is about a pony bead's width, taken as 9mm.

Before the audit (unit width x height x depth): dice 0.62 cube (about 5.5mm, smaller than every neighbor), clay disc 1.0 across (as wide as a pony), daisy spacer 0.84 across, smiley 0.9 across, letters 0.94 to 0.96.

Real kit sizes used: pony 9 x 6mm, clay heishi 6mm x 1mm, round, crystal, cube, pearl 8mm, smiley 10mm, dice 8mm, daisy spacer 4 to 6mm, seed 6/0 about 4mm, letters 6 to 7mm.

Changed: dice to 0.86 (UNIT 0.9), clay disc to 0.67 across and 0.2 thick (UNIT 0.24, so about 100 fit instead of 80), daisy to about 0.56 across, smiley to 1.1 across (UNIT 1.1).

Left alone: letters (big so they read on a phone), charms (free shapes, balanced against each other), and everything else within about 1mm of real.
