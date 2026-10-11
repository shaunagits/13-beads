# Stringing screen UX review and "clear view" proposal (2026-10-11)

## Question

Shauna asked to move every control off the bracelet view, and for a more intuitive, modern, stylish bead case, with an expert UX/UI review of the stringing screen.

## Review findings (independent reviewer, from live screenshots and the code)

1. Overlays sit where the bracelet hangs: the Undo/Redo/Clear pill covers the right end of the string; the top and bottom 60 px of the canvas go to controls.
2. The bead case changes height per tab (case top at y 437 Beads, 403 Letters, 498 Charms at 400 x 780), so the string reframes and the finish button moves on every tab switch.
3. Many touch targets are under 44 px: tabs about 31, jump chips about 21, color dots 22 to 28, lid row 34, undo icons 40, header buttons 36. The color strip is cut off at 375 px with no scroll cue.
4. Three dark filled pills (Beads tab, Ideas chip, See it finished) compete; the one dark primary button is no longer unique.
5. The case header spends a 34 px row on "Bead case" text, a handle that cannot be dragged, and a chevron.
6. The footer costs about 60 px of canvas on every phone.
7. The Letters grid fills down then across, so it reads A C E over B D F.

## Proposal (artboard "Stringing, clear view" on the design board)

- Nothing on the canvas. A 48 px command bar between canvas and case: Undo, Redo, Clear (bare 44 px icons) on the left, bead count over a 56 x 4 bar in the middle, "See it finished" on the right as the only dark fill. On two strands, a full-width Top / Bottom / Both segmented row above it.
- Heights at 400 x 780: header 40, canvas 368 (594 with the case closed), command bar 48, case 282 fixed for every tab (56 closed). Footer moves below the fold.
- Case: one 44 px header row with a draggable grabber, tabs as a segmented control (white thumb), and a chevron. A fixed 88 px options band (Beads: scrolling 28 px color dots in 44 px targets with an edge fade, then jump chips in a pink tint, not dark; Letters: shape and look, then the phrase field). Grid wells 60 px, gap 6, radius 12, beads at 48 px, scroll snap; Charms and Dangles get three rows. Letters flow row by row. Collapsed shows only the tab row; tapping a tab opens it.
- Finish icon: a closed loop with a knot instead of the ring of dots that reads as a spinner.
- Desktop idea (not mocked): above 900 px, dock the case as a 360 px right-hand panel.

## To test with players

Finding the finish button in the bar; one color tap recoloring the case; whether jump chips are used; whether the collapsed tab row reads as "tap to open"; one-handed reach.

## Board notes

The proposal is clickable (tabs, colors, chips, collapse; a Tweak turns on two strands). Dangles shows the charm pictures as stand-ins, and only hot pink bead pictures exist, so a color tap moves the ring but does not recolor the beads. Canvas pictures were captured from the live game at the new sizes with the controls hidden. Not yet built in the game.
