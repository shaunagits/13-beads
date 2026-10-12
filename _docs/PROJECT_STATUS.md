# Project status

Last updated: 2026-10-12 (session 7). Everything below is on `main` and live, including these docs.

## What exists

**Design board**: a private Claude design canvas, "13 Beads screens" (https://claude.ai/artifact/Qk83C6ApFhPk5JgtKghznm), made 2026-10-10. Editable light-mode mockups of Stringing, Finished, Wall, the More menu, Share, and Decorate, built from the real styles in `src/style.css` with pictures of the 3D views, beside dark and desktop screenshots of the live game. Session 5 added two rows at the top: "Stringing redesign (live now)" and "Finished and Wall redesign" (both now built), each with phone and desktop screens in light and dark that can be clicked through. The rows below them show the game as it was on 2026-10-10. The board's Wall screens still show the velvet cones: the hook wall (session 6) was built straight to live without a board, so the board is behind on the wall. Changes made on the board do not reach the game until they are built into the code. How the proposal screens were made: `_docs/findings/2026-10-11-design-board.md`.

**Stringing (mode `line`)**
- A 3D cord simulated as a weighted rope (Verlet chain with gravity): beads weigh it down, a pluck bends it at the finger, phone tilt tips gravity. Drawn zoomed out a little (`ZOOM = 0.82` in `frame` in `src/main.js`): beads are about 18 percent smaller than the cord has room for.
- Tabletop: gray felt like a bead mat by default (`src/assets/felt.jpg` and `felt-normal.jpg`, CC0 ambientCG "Fabric 034"), or dark wood (`src/assets/table-dark.jpg`, CC0 Poly Haven "Dark Wood"). Picked in the More menu (Table: Felt / Wood), saved as `13beads.table`. The cord is lavender gray on felt and pale on wood. In dark mode the room dims under a warm desk lamp. The table is drawn beneath everything and is partly self-lit so stage lights do not tint it much.
- Nothing sits on the canvas while stringing (redesign of 2026-10-11). A command bar under it (`#cmdBar` in `#lineBar`): Undo, Redo, Clear as bare 44px icons on the left (grayed out when they would do nothing), the bead count over a 56 x 4 fill bar in the middle, and "See it finished" (loop-and-knot icon, the one dark button) on the right. On two strands, the Top / Bottom / Both picker is a full-width row above it. No pop-up hint box anywhere: messages go only to a hidden screen-reader live region (`#status`), which also says the color picked ("Navy beads").
- Header: a back arrow before the wordmark (to the games site while stringing; back to the string on Finished and the wall), Tilt (iPhone only, until allowed), a labeled "Wall" pill with the bracelet count inside (on every screen; tinted pink while on the wall, tap again to go back; icon shown from 431px up), and a "⋯" More menu: Sound, Light or Dark mode, Table (Felt / Wood), Strands (One / Two), which end new beads go on, and Start over. Every header button is 44px.
- The game fills one screen (100dvh); the footer sits below it, one swipe down.
- Wide screens (900px and up): the bead case is a 360px panel on the right, full height, scrolling down in labeled groups with colors in rows of eight; the bracelet and command bar take the left. On Finished and Wall the canvas spans the full width (those screens are not redesigned yet).
- Touch: tap a case compartment to add a bead (it slides on and plays the next note). On the string: tap to pull a bead off, drag to reorder, pluck the cord (press must start on it), swipe fast to strum. Cmd or Ctrl + Z undoes; with Shift, or Ctrl + Y, redoes.
- Length budget: the string holds beads by total width (`BUDGET = 25` units, about 32 pony beads or 26 letters, or about 100 clay discs), not by count. Older saved strings over the budget keep all their beads.
- Starter bracelet (first visit, and Start over): pearl, gold glitter, sparkle, 1 3, hot pink, B E A D S, sparkle, gold glitter, pearl. Round white letters; an older saved cube starter still counts as the untouched starter (`LEGACY_STARTER` in `src/main.js`).
- Shake to spill: on a phone, two hard jolts within half a second pour 18 loose beads onto the table (mostly the picked color, some letters, the odd charm). Tap one to string it; untouched, they roll back into the case after 12 seconds. iPhone gets motion access from the Tilt button tap. Off with reduced motion. Tested only with simulated motion events.

**Two strands** (More menu: Strands One / Two)
- A second cord hangs below the first. A Top / Bottom / Both picker (words, not icons) is a full-width row just under the canvas, above the command bar; new beads, typed phrases, and spilled beads go on the picked cord. "Both" threads a bead on both cords, and the cords meet there. Tapping a cord also picks it (a drag still plucks). The picked cord is drawn thicker and brighter, and a ghost bead (white with a pulsing pink ring) shows where the next bead will land.
- On two strands the Beads tab starts with one-tap patterns in the picked color: Cross (a seed bead on both cords, one on each cord, one on both), Diamond (a small faceted crystal on both cords, three seed beads on each cord, another crystal on both), and Bubble (a pearl on both cords, five seed beads on each cord, another pearl). A pattern skips its first shared bead when the string already ends on one. The beads where the cords meet in Cross and Diamond take a partner color, one hand-picked per strip color (`PARTNER` in `src/beads.js`), for example white with hot pink, cream with navy, yellow with blue; Bubble keeps its pearls. Compartment pictures and labels show the pair.
- Drag a bead above or below the middle of the string to move it to the top or bottom cord; let go right between them to thread it on both.
- Saved as `c` on each bead: no `c` is the top cord, `c: 1` the bottom, `c: 2` both, so single-strand bracelets are unchanged. `layoutCords` in `src/beads.js` places beads: between two shared beads each cord carries its own run, centered, and the stretch is as long as the longer run. The length budget counts the longer cord. `cordGap` sets how far apart the cords are (they meet at shared beads and toward the ends).
- The cords are drawn as offsets from the one simulated rope, so plucking, tilt, and the tied loop work as before. In the tied loop the top cord is the inner ring. On the wall the two cords run side by side around the hanging loop, meeting at shared beads and at the peg.
- Opening a two-strand bracelet (saved string, Edit from the wall, trade link, undo) turns two strands on. Turning two strands off puts every bead back on one cord (undoable).
- Trade links: a bead token ending in `~1` or `~2` is on the bottom cord or both.

**Surprise me**: the first compartment of the Beads tab (labeled "Surprise") replaces the string with a ready-made bracelet; each tap brings the next one, starting at a random one. Undo restores the string. Eleven presets, one per album (`PRESETS` in `src/beads.js`, built with `era()`): the album name spelled in round letter beads in the middle, the era's charm right after the word, and the era's beads on both sides. Letter looks: white (Midnights, Speak Now, 1989, Folklore, Evermore, TTPD), black (Red, Reputation), pink (Lover), gold on black (Fearless, Showgirl); frosted gold read too faintly. Two long titles use short forms: TTPD and SHOWGIRL. The debut album is left out because its title is the artist's name. The footer carries "Fan-made. Not affiliated with any artist or label." Nothing is shown in the bead count (Shauna wanted the name on the bracelet, not in a label).

**Finding beads**: the Beads tab is sorted into groups, one after another with no empty compartments (empty ones read as missing beads, Shauna's phone test): Recent, Ideas (Surprise me and, on two strands, the patterns), Basics, Shiny, Fun, Seed, Pearls (`BEAD_GROUPS` in `src/main.js`). A row of chips above the tray jumps to each group and lights up the one in view. Recent holds the last six beads picked from the case in any tab, newest first; it refreshes the next time the tray is drawn (switching tab or color), so compartments never move under a finger. Recent is not saved between visits.

**Bead case** (clear plastic organizer; tabs Beads, Letters, Charms, Dangles)
- Layout (2026-10-11): one 44px header row (a grabber, the tabs as a segmented control, a fold chevron), then a fixed 88px options band, then the compartments. The case is the same height (282px on a phone) on every tab, so the string never jumps. Folded, only the tab row shows (56px); tapping a tab opens it, and swiping the header row down or up folds or opens it (220ms, instant with reduced motion). Colors are 28px dots in 44px targets, scrolling with an edge fade, and the picked color scrolls into view. Jump chips mark the group in view with a soft pink tint, not a dark fill. Wells are 60px with 48px pictures and snap as they scroll. Letters read A to M along the top and N to Z below on phones. Charms and Dangles have no options band, so they get three rows.
- Beads tab: a 23-color strip (saved as `13beads.color`; blush, baby blue, cream, and navy were added 2026-10-10, then burgundy, forest green, mint, coral, lilac, gray, and tan 2026-10-12, always at the end of `COLORS` and placed by `COLOR_ORDER`; each has a partner in `PARTNER`), then one compartment per type in that color: pony, clay disc, round, crystal, solid cube, smiley, jelly, metallic, glitter, glow, matte, star bead, dice, small faceted crystal, seed bead, frosted glitter seed bead, silver-lined seed bead. Then pearl, silver spacer, gold ball spacer, silver daisy spacer, rhinestone rondelle, marbled pearl, moonstone, clear, pearl, and gunmetal seed beads, frosted square seed bead, gunmetal spacer, gold and silver bead caps. Seed beads are about a third of a pony bead wide (about 89 fit). Sizes follow real kit beads, taking a pony bead as 9mm (size audit 2026-10-12): dice 8mm (the size of a cube bead), clay discs 6mm across, daisy spacers about 5mm, smileys 10mm. Letters stay larger than real (about 8.5mm) so they read on a phone. Tiny beads are drawn larger in their compartments (`TINY` in `src/main.js`). A cap turns its cup toward the nearest bead. Mid-tone colors are drawn deeper (`deep` in `src/beads.js`) so beads match their dots.
- Letters tab: a row with the shape switch (Round, the default, or Cube) and five looks (White, Black, Pink letters on white, Gold letters on black, Frosted clear with gold letters), then the phrase field ("Type a word or phrase"), then A to Z, a pink heart bead, 0 to 9, ! ? &. Typing a heart (or <3) in the phrase adds a heart bead. Saved as `{ k: 'letter', ch, st?, sh? }`: no `st` is white, no `sh` is a cube, so every bracelet saved before round letters keeps its cubes. Shape and look are not remembered between visits.
- Charms (27) and Dangles (20 hanging charms; the last four, from Shauna's photos: lucky rock, evil eye, heart and arrow, potted cactus in 3D); sizes in `BOOST` in `src/beads.js`. The snake charm is an S-curve with a diamond head lying along the string (`snakeGeo`, `snakeHeadGeo`), about two beads wide; compartment pictures shrink long charms to fit. A black snake (`{ k: 'snake', m: 'black' }`, glossy black with an oil-slick sheen) sits right after the green one. The Reputation bracelet carries both: black before the word, green after (`pre` in `era()`); trade links carry it as `-snake:black`.

**Tie-off (mode `tied`)**
- The cord morphs into a knotted loop; drag to spin, tap for more confetti. Confetti: about 85 shiny pastel foil stars and 30 small maple leaves that tumble and flutter down (off with reduced motion).
- Nothing on the canvas (redesign of 2026-10-12). Under it (`#tiedPanel`): "Keep editing" and a labeled "Share" side by side, then "Add to my wall" full width as the one dark button.
- Share opens a sheet from the bottom (`#shareCard`): a live preview of the story card (redrawn as the note changes and once the loop closes) beside the gift tag note (40 characters, placeholder "For Maya, love Jess"), then Save card (1080 x 1920 story picture: wordmark, the loop, the phrase, the date, the tag, the site address; `cardCanvas` in `src/main.js`), Send link (share sheet on phones, clipboard on computers), and QR code (`qrcode-generator`, MIT), which shows in place of the preview. While a sheet is open the buttons under it step aside.
- Wide screens: the share options sit in the right-hand panel, always open (Save card in the pink tint), with Keep editing and Add to my wall at the bottom.

**Trade links**
- Link: game address plus `#t=<code>&n=<note>`. `encodeBracelet` / `decodeBracelet` in `src/beads.js` write one token per bead by kind (letters as themselves, colored beads as type letter plus strip color, everything else as `-name`), so new beads never break old links. Off-strip colors from older bracelets map to the nearest strip color.
- Opening a link: the code is cleared from the address bar, the player's own string is set aside (`trade.saved`, never saved over), the bracelet strings itself bead by bead and ties off, and a paper tag above the buttons reads "A bracelet for you: <note>". "Back to mine" and "Hang it on my wall"; Share is hidden (leaving any other way also restores the player's string).

**The wall (mode `stack`)**
- Plain painted wall (white, pink, or sage) with a soft top-to-bottom fade and faint grain; no shadows on it.
- Display (2026-10-12, session 6): lacquered peg rails across the wall, in a tone that follows the wall color, with brass pegs. Every finished bracelet hangs from its own peg as a loop facing the viewer (`loopPath` in `src/main.js`: narrow at the peg, round at the bottom), the phrase along the bottom where it reads, a small knot on the peg. Newest hangs on the first peg (top left) and the rest shift along. 2 columns on phones, 3 at 520 to 759px, 4 from 760px; rows are added as needed; up to 24 shown (the whole remembered wall). A tall wall scrolls: drag it, use a mouse wheel, or Tab to a bracelet (the sign scrolls with it).
- Tags: a kraft paper tag hangs from the peg on its own thread inside the loop, with a name (default "Mine") and the day it was hung; a bracelet that arrived by trade link gets a blush tag with a red "Traded" stamp and the sender's note as its name. Drawn to a canvas texture (`tagTexture`). Saved per entry as `n`, `d` (YYYY-MM-DD), and `t: 'trade'`; bare bead-list saves from before load as entries named "Mine" with no date.
- Touch: tap a bracelet (it lifts and jingles) for its options sheet: the tag name field, a Made it / Traded switch, "Hung <date>", Edit it (dark), Done, and a quiet red Take it off. Hold a bracelet (300ms, it lifts) and drag it to another peg; the others step aside and the new order is saved. Loops swing about their peg: on landing, on a tap, when dropped, and when the phone tilts. Reduced motion: no swing, no fly-in.
- "Add to my wall" flies the loop up from below onto the first peg while the rest glide along a peg, then it lands with a thud, a chime, and a swing.
- Under the canvas (`#wallPanel`): a count line ("7 bracelets on your wall · 2 traded", or "Nothing on display yet"), then Decorate (ghost), Share (ghost: a sheet with Save photo and Send link), and the dark button, "Make another" or "Back to my string" when a string is in progress.
- Wide screens: the right-hand panel holds Decorate (always open), "On your wall · n · t traded", a list of the hung bracelets by phrase with tag and date under each and Edit and Take off, then Share your wall (always open) and Make another.
- Night (dark mode): the neon sign is the room's main light, washing its color down the wall and over the pegs; the wall keeps its own night tone per color.
- Neon sign: always lit, letters spaced like separate tubes, centered above the first rail. Decorate sets the wall color, the sign word (12 characters), and the sign color (Rainbow default, White, Pink, Blue), all saved in `13beads.wall`. Tapping the sign's word opens the Decorate sheet with the word selected (`signAt`); a mouse shows a pointer over the sign and bracelets.
- Keyboard: Tab reaches each bracelet (the wall scrolls to it), Enter or Delete opens its options, popovers trap Tab and close on Escape.

**Name** (2026-10-12): Decorate starts with "Your name" (16 characters, saved as `name` in `13beads.wall`). Setting it puts the name on every new tag, renames placeholder "Mine" tags (and tags carrying the previous name), sets the sign to "<name>'s beads" unless the player already wrote their own sign (`nameSign`; the sign limit is now 16 characters and allows an apostrophe), prints it on the ticket stub, and makes it the sender on copies friends take ("From Shauna"). The wall link carries it as `u`. Once a name is set, Start over (and a first visit on a device that already has the name) strings the name instead of 13 BEADS (`nameStarter`: letters and digits, up to 12, a pink bead between two words, the same pearls, gold, and sparkles on each side); a name starter also counts as the untouched starter (`isStarterList`).

**Wall props** (2026-10-12): Decorate has an "On the wall" row with Fairy lights and Ticket stub switches (saved as `lights` and `ticket`, both on by default; the wall link carries `l=0` / `x=0` when off). Fairy lights: a dark wire pinned at the top corners and the middle in two swags, warm bulbs along it (an instanced mesh), glowing at night with two soft point lights. Ticket stub: a pale yellow "ADMIT ONE" ticket with a perforated stub reading "ROW 13", the player's name and "13 BEADS", pushpinned below the last rail (`ticketTexture`, `buildProps`). Polaroid frame not built: there is no real picture to put in it.

**Visit my wall** (2026-10-12): Share on the wall, then Send link (share sheet on phones, clipboard on computers). The link is `#w=` plus one entry per bracelet (bead code, tag name, date, `t` for traded, joined by commas; entries by semicolons) and `c`, `k`, `s` for the wall color, sign color, and sign word (`wallLink` / `readVisit` in `src/main.js`). About 80 characters per bracelet. Opening it shows that wall read-only: the visitor's own wall and decor are set aside in memory (never saved over, `saveStack` is a no-op while visiting), Decorate and Share are hidden, and the dark button reads "Back to my wall". Tapping a bracelet offers "Take a copy": it strings itself like a trade and ties off, tagged "From <sign word>" (or "From a friend" when the sign is the default), and hangs as traded. Leaving the wall any way ends the visit.

**Installable** (2026-10-12): `public/manifest.webmanifest` (standalone, icons 192 and 512, maskable), apple-touch-icon, and `public/sw.js`, registered on https. The worker fetches pages fresh and falls back to the kept copy, keeps hashed build files and Google Fonts once seen, and drops old caches on activate (`CACHE` version in `sw.js`). Staying current (2026-10-12): each time the player comes back to the game (tab shown again, home screen app reopened), `checkBuild` in `src/main.js` fetches the page past the worker (`cache: 'no-store'`, which the worker lets through) and compares its build file name with its own; if a newer version is live it reloads, but only on the string screen with no sheet, menu, or field open and no trade or visit, otherwise it waits for the next return. Tested on the live site in Chrome by faking a newer page; not yet on a phone. The app icons are the favicon bracelet drawn larger (generated with Python PIL; the script is not in the repository).

**Haptics**: `buzz` in `src/audio.js` (`navigator.vibrate`): a bead landing, the knot tying, a tap on a bracelet, lifting one, dropping one. Android only; iPhone Safari has no vibrate API.

**Sound (`src/audio.js`)**: musical, D major. Stringing plays a melody over I, V, vi, IV; charms add bells; strumming arpeggiates; hanging resolves home. Acoustic guitar voice by default, through a small room reverb. The ping-pong echo is off for the guitar (it made plucks sound doubled); the other voices still use it.

**Footer**: below the fold, one swipe under the game: "‹ More games" and "Made by Shauna", with "Fan-made. Not affiliated with any artist or label." centered below.

## Not verified

- Session 6 on a real phone: the name field and prop switches in Decorate, the hook wall (tap, hold and drag between pegs, scroll by drag, swing on tilt), the tag field above the keyboard, Share your wall through the share sheet, opening a wall link and taking a copy, adding to the home screen and opening with no signal (the service worker was only checked by a build; it is not exercised by the cloud renderer), and wall performance with 24 bracelets on an older phone (24 loops of beads is a lot more geometry than 12 rings were).
- Everything from the session 5 redesigns on a real phone: swiping the bead case header, the fold animation, the command bar, the footer below the fold, the Share, Decorate, and bracelet options sheets (especially that they sit above the keyboard in iPhone Safari, via `visualViewport`), and the live card preview's speed on an older phone. Only the cloud software renderer was used.
- Desktop at sizes between 900 and 1280px wide, and very short desktop windows (the right-hand panels scroll, untested at small heights).
- Two strands on a real phone: the cord picker row, tapping a cord to pick it, dragging beads between cords, and how Cross, Diamond, and Bubble read at phone size.
- Session 4 beads and charms on a phone (seed beads, round letters, the new dangles, the S snake), and the jump chips and Recent row.
- Shake to spill on a real phone (only simulated motion events were tested), and whether two 17 m/s² jolts is the right strength.
- Tilt and the iPhone permission button.
- The phone share sheet for Save card, Send link, and Save photo (only desktop downloads and clipboard were exercised).
- Trade links on a phone end to end, and QR scanning with a real camera.
- Screen reader announcements (keyboard only was tested).

## Open with Shauna

- Shake strength, after a real phone test.
- Length budget: kept for now, to revisit.
- True-size beads: on hold.
- Nothing from session 6 is waiting on an answer. Everything she was asked was decided (see the 2026-10-12 decision rows).

## Decisions

| Date | Decision | Resolution | Why |
|---|---|---|---|
| 2026-10-07 | Audience | Concert bracelet-trading fans | Shauna's choice. Drives the phrase-first design and charm list. |
| 2026-10-07 | Name | "13 Beads" | Name only. It is not a 13-bead limit. The string holds 26 so full phrases fit. (Superseded 2026-10-09: a length budget replaces the 26 count.) |
| 2026-10-07 | Rendering | Real 3D with Three.js | Shauna ranked glossy, realistic beads as the top priority over a lighter flat build. |
| 2026-10-07 | Backend | None. Local storage only | Portfolio piece with nothing to maintain. A collection lives on one device. |
| 2026-10-07 | Hosting | Vercel, deployed from GitHub, under `games.shauna.digital/13-beads` | Free at this scale, auto-deploys, and the account was already connected. |
| 2026-10-07 | Music player | Skipped | Only YouTube plays full songs without login. Shauna chose to skip for now. |
| 2026-10-07 | Charm finishes | One signature finish per charm, no color variants | Shauna: charms are one-of-a-kind. Also keeps the tray small. |
| 2026-10-07 | Lucky 13 look | Die-cut blue glitter numerals, black outline, white border | Matches Shauna's reference. Drawn fresh, not traced. |
| 2026-10-07 | "Lover" script charm | Not built | That lettering is album logo artwork. Players can spell the word in letter beads. (Confirmed 2026-10-09, see below.) |
| 2026-10-07 | Hanging charm type | Tall or irregular charms hang from a ring instead of sitting on the string | A string through a cardigan or boot looked wrong. |
| 2026-10-08 | Hanging charm size | Charm scale 1.02 (guitar 0.92) | 0.78 was too small, 1.3 too big. Shauna approved the middle. (Superseded 2026-10-09: all dangles enlarged.) |
| 2026-10-08 | Collection display: arm | Rejected | A code-built mannequin arm looked bad. |
| 2026-10-08 | Collection display: denim jacket with safety pins | Built, then removed | Replaced by the wall idea. Returns later as its own craft with patches and pins. |
| 2026-10-08 | Collection concept | A decorated wall, like a fan's merch wall | Shauna's idea. A wall can display every future craft. A jacket could only hold bracelets. |
| 2026-10-08 | Heart hands built in code | Rejected twice | Tubes and spheres cannot make convincing hands. Needs a real 3D model. |
| 2026-10-08 | MakerWorld heart-hands model | Not usable | Its license forbids hosting or distributing the file. |
| 2026-10-08 | Current display piece | Gold T-bar stand | Geometric, so it renders well in code. Shauna approved it as the display for now. (Superseded 2026-10-09: velvet cones.) |
| 2026-10-08 | Bracelets on the T-bar | Hang from hooks facing forward | On a real T-bar they sit edge-on and phrases cannot be read. (Superseded 2026-10-09: rings around cones.) |
| 2026-10-08 | Wall color | Soft pink painted plaster | Shauna chose a painted wall to start. Whether players pick the color is still open. (Superseded the same day: player picks, white default.) |
| 2026-10-08 | Unlocks and trading links | Deferred | Shauna: hold until the core is further along. |
| 2026-10-08 | Wall and tie-off controls | Float on the canvas instead of panels below it | Shauna asked. Direct manipulation: act on the bracelet itself, icons in corners, one labeled primary action. (Superseded 2026-10-11 and 2026-10-12: controls moved off the canvas into bars and panels, after a UX review found they covered the bracelet.) |
| 2026-10-08 | Taking a bracelet off | Press and hold (or right-click) a bracelet, then confirm | Replaces "Take one off", which only removed the newest. |
| 2026-10-08 | Wall color | Player picks from 3: white (default), pink, sage | Shauna approved. Neutral white makes bead colors pop. Few curated options all look good with the gold stand. |
| 2026-10-08 | Neon sign word | Player can change it. Default is the game name, "13 beads" | Shauna: if it is editable it should be the player's word, within limits that keep it looking good. |
| 2026-10-08 | Accessibility | Wall is keyboard operable | Shauna wants accessibility standards followed where possible. |
| 2026-10-08 | Wall props | Plant removed. Stand and shelf shadows off. Focus on the wall texture | Shauna: the shadows looked odd and the plant was clutter. |
| 2026-10-08 | Night wall | Each color keeps its own feel at night | Shauna asked. |
| 2026-10-08 | Interface style | Fewer, quieter controls: icon header, grouped icons, one dark primary button | Shauna asked for a simpler, more sophisticated interface. |
| 2026-10-08 | Back to games | Muted "‹ Games" link at the start of the header | Shauna: visible but not obvious or intrusive. (Superseded 2026-10-09: moved to the footer; then 2026-10-11: a back arrow before the wordmark.) |
| 2026-10-08 | Sound | Musical: every sound is a note in one key, stringing plays a melody | Shauna rejected both the original sounds and a realistic rebuild, and asked for music notes. (2026-10-09: echo off for the guitar.) |
| 2026-10-08 | Daytime neon on white | Fine for now | Shauna. |
| 2026-10-09 | Instrument | Acoustic guitar by default | Shauna asked for a guitar option. Music box, kalimba, and synth pluck stay available in code. |
| 2026-10-09 | Stringing screen | Same on-canvas treatment as the wall and tie-off screens | Shauna approved the simplification pass. |
| 2026-10-09 | String feel | Real rope simulation and a thread texture, same thickness | Shauna: it looked and felt like a rigid wire. Thickness kept for visibility. |
| 2026-10-09 | Stringing surface | Wood (superseded below: Dark Wood in both themes) | Shauna asked for a surface someone would make a bracelet on. |
| 2026-10-09 | Tray | Clear plastic bead organizer around single-bead pictures, collapsible | Shauna's reference: how people store pony beads in real life. She meant the container, not the bead images; a pile-of-beads version was tried and reverted. |
| 2026-10-09 | Table surface | Photo-scanned CC0 wood (Poly Haven; Plywood by day at first, then Dark Wood in both themes) | Code-generated wood tiled into bricks, then still looked off. Real scans look right. CC0 needs no credit. Shauna's reference photo is not used (license unknown). |
| 2026-10-09 | Table wood | Dark Wood in both themes | Shauna's pick from the six CC0 scans. (Superseded 2026-10-10: felt default, wood selectable.) |
| 2026-10-09 | Dark mode on the table | Dim room with a warm desk lamp | Shauna's idea. |
| 2026-10-09 | Light/Dark toggle | Icon in the header; follows the device until used, then remembered | Shauna asked. |
| 2026-10-09 | "Lover" charm | Not built | Shauna wanted it only if it could look like the real logo; that version will not be made. |
| 2026-10-09 | Shauna's sticker drawings | Use as reference for code-built charms, not pasted in | She drew them from online clip art; the generic subjects (heart sunglasses, disco ball, heart hands, bracelet) are fine as ideas. Heart sunglasses built from sticker 21. |
| 2026-10-09 | Starter bracelet | "13 BEADS" in letter beads, mirroring the logo; replaces "ENCORE". Start over button restores it | Shauna asked. |
| 2026-10-09 | Charms from Shauna's drawings | Mini bracelet built; heart hands not built in code | Shauna: only if they look good. Heart hands are organic and need a real model. |
| 2026-10-09 | Start over | Resets the string only, never the wall | Shauna. |
| 2026-10-09 | Credit and back link | Both kept, moved from the header to a footer line | Different jobs: back to the arcade, and credit to Shauna. Frees the header on small phones. |
| 2026-10-09 | Hanging charm size | All dangles drawn at one size (about 1.3 to 1.4 times the original) | The first eight looked tiny next to the newer ones. Supersedes the 1.02 decision. |
| 2026-10-09 | Send feedback link | Not added for now; footer stays as is | Shauna: not necessary right now. |
| 2026-10-09 | Favicon | A tiny bracelet: colored beads on the lower two thirds of a cord loop, top left bare | Shauna asked. A full ring of beads read as a wreath. |
| 2026-10-09 | Finish button | "Finish bracelet" replaces "Tie it off"; back button reads "Back to stringing" | Shauna: the old wording was poor. (Superseded 2026-10-09: "See it finished", then "Keep editing".) |
| 2026-10-09 | String grabbing | Press must start on the string; silent until release | Shauna's phone test: it was too easy to grab by accident and made noise. |
| 2026-10-09 | Charm set three | Music note, vinyl, cassette, ticket stub, chihuahua, red lips; dangles: storm in a teacup, lightning rod, redwood, showgirl feather, cowboy hat, disco cube, snow globe | Shauna's picks. Organic subjects (chihuahua, lips) use the flat die-cut enamel style of Lucky 13 instead of sculpted primitives. |
| 2026-10-09 | Song snippets | Not built | Shauna asked about playing part of a real song. A recognizable snippet carries the protected part (melody, hook). Alternative offered: an original easter-egg melody behind a secret phrase. |
| 2026-10-09 | Bead case | One compartment per bead type plus a 12-color strip; one tap adds a bead | Shauna: too many same-shape beads. The strip keeps adding to one tap (her option A). |
| 2026-10-09 | New bead types | Clay disc, round, crystal, solid cube, smiley, jelly, metallic; spacers (gold ball, daisy, rondelle) and gold and silver caps | Shauna agreed to the suggested batch. All geometric, so code-built shapes look right. |
| 2026-10-09 | Clasps and cord choices | Deferred | Shauna. |
| 2026-10-09 | Bead limit | Length budget (25 units) instead of 26 beads | A count made no sense once clay discs (a third as wide) existed. Revisit later, Shauna said. |
| 2026-10-09 | Guitar echo | Off for the guitar only | Shauna: plucks sounded doubled. |
| 2026-10-09 | Bead board view (open C on a tilted table) | Built, put live, rejected | Shauna preferred the hanging string. Kept on branch `bead-board`. |
| 2026-10-09 | True-size beads and wrist sizes | On hold; one bead size | True size only helps planning if accurate; without it wrist size is irrelevant (Shauna). |
| 2026-10-09 | View | Hanging string, zoomed out about 18 percent | Shauna: "zoom out a little", then "perfect". |
| 2026-10-09 | Pop-up hint box | Removed everywhere | Shauna: it blocks the player. Messages still reach screen readers. |
| 2026-10-09 | Controls | Hybrid: Undo, Redo, Clear on the canvas; Sound, theme, end switch, Start over, Table in a "⋯" menu; phrase field in the Letters tab | Shauna picked option C, then asked for Redo and for Clear back on the canvas as a trash icon. (Superseded 2026-10-11: Undo, Redo, Clear moved to the command bar under the canvas.) |
| 2026-10-09 | Finish flow | "See it finished" then "Keep editing" or "Add to my wall" | Shauna wanted to preview the finished bracelet and keep editing. |
| 2026-10-09 | Edit from the wall | Edit it / Take it off / Leave it; a string in progress swaps onto the wall | Shauna: yes to the swap, so nothing is lost. |
| 2026-10-09 | Wall background | Plain painted wall; limewash, plaster ridges, window light, depth of field, and wall shadows removed | Shauna: it looked weird and overcomplicated. The shadows read as gray ghosts. |
| 2026-10-09 | Display piece | White velvet cones on a lacquered riser replace the gold T-bar stand and wood shelf | Shauna was not keen on the stand. Cones are geometric and read like a jewelry counter. The stand is in git history. |
| 2026-10-09 | Neon sign | Always lit, spaced, larger, raised; Rainbow default with White, Pink, Blue options | Shauna: not right above the stand, not hot pink, more lit, maybe rainbow. |
| 2026-10-09 | Black letters | Added with a White / Black switch | Shauna asked. Other letter styles are suggested, not built. |
| 2026-10-09 | Share card and gift tag | Built | Shauna: do it if not too difficult. |
| 2026-10-09 | Trade links and QR | Built, inside "Share this bracelet" | Shauna said yes; no server needed, nothing to manage. |
| 2026-10-09 | Confetti | Pastel paper with small maple leaves | Shauna asked for stadium-style confetti with maple leaves. (Superseded 2026-10-10: stars.) |
| 2026-10-10 | Felt and velvet | Keep the gray felt and the velvet cones as they are | Shauna. |
| 2026-10-10 | Round letters | Flat round letter beads added and made the default; cubes stay a choice. Starter uses round letters | Shauna's photos: every real bracelet uses round letters. She chose round as default. |
| 2026-10-10 | Letter looks | White, Black, Pink on white, Gold on black, Frosted clear with gold, plus a heart bead | Shauna said yes to pink and gold; frosted and the heart come from her photos. |
| 2026-10-10 | Beads from Shauna's photos | Seed beads (opaque, frosted glitter, silver-lined, clear, pearl, gunmetal, frosted square), matte, star beads, dice, small faceted crystals, marbled pearl, moonstone, gunmetal spacer; colors blush, baby blue, cream, navy | Picked from her real bracelets. All geometric. |
| 2026-10-10 | Charms from Shauna's photos | Rock, evil eye (own symmetric design), heart and arrow (no initials), and a 3D potted cactus, all as dangles | Shauna wants to see the cactus in 3D before deciding; flat enamel is the fallback. The artist's monogram and name stay out. |
| 2026-10-10 | Cactus charm | Keep the 3D version | Shauna loved all four new charms. |
| 2026-10-10 | Two strands | Built: Top / Bottom / Both picker on the canvas, Strands switch in the More menu, Cross and Diamond patterns | Shauna's photos (two strands tied together, shared beads, little crosses). She left the build order to Claude; both steps shipped together because one layout covers them. |
| 2026-10-10 | Surprise me | A compartment in the Beads tab (option A); presets named by mood and color for now | Shauna picked A. Naming (album titles or mood names) is still open. |
| 2026-10-10 | Two-strand controls | Word labels, tap a cord to pick it, highlighted cord, ghost bead | Shauna asked for easier controls and approved all four. |
| 2026-10-10 | Bubble pattern | Added; Twist and Daisy wait | Shauna wanted to see Bubble first. |
| 2026-10-10 | Switching bead types | Recent group and jump chips | Shauna picked ideas 1 and 2 of four (press and hold to copy a bead, and add three at once, not built). |
| 2026-10-10 | Surprise me names | Album titles, plus a fan-made note in the footer | Shauna picked option A. Still never the artist's name, logos or title lettering, cover art, or lyrics. Revisit if the game ever becomes paid or sponsored. |
| 2026-10-10 | Surprise me name | Spelled in letter beads on the bracelet; the count pill label was removed | Shauna: she wants the name in the bracelet with the other styled beads, not in the corner of the screen. |
| 2026-10-10 | Snake charm | Redrawn as an S-curve (diamond head, tail tapering to a point) lying along the string, replacing the coil | Shauna's reference: a simple S-shaped snake silhouette. Drawn fresh in code, not traced. Width 2.05 units; compartment thumbnails shrink long charms to fit. |
| 2026-10-10 | Design board | A Claude design canvas with editable mockups built from the real CSS plus live screenshots | Shauna wanted somewhere to refine the screens. Built in the game's own look, not a design system (her pick). See `_docs/findings/2026-10-11-design-board.md`. |
| 2026-10-10 | Confetti | Pastel foil stars with small maple leaves, replacing the paper | Shauna asked. |
| 2026-10-11 | Twist and Daisy patterns | Dropped for now | Shauna: not right now. |
| 2026-10-11 | Snake color | Green stays; a black snake added as its own charm | Shauna: keep green, add black if possible. |
| 2026-10-11 | Reputation bracelet charm | Both snakes: black before the word, green after | Shauna: stay green, or add the black as a second one. |
| 2026-10-11 | Pattern joining beads | Automatic partner color per strip color, no picker; Bubble keeps pearls | Claude's recommendation, Shauna approved. Keeps patterns one tap and makes Cross readable. |
| 2026-10-11 | "Some of the beads are missing" | Resolved | Shauna: all good now (it was the empty compartments). |
| 2026-10-11 | Stringing screen redesign | Proposal on the design board (phone and desktop "clear view"); not built until Shauna reviews, refines, and approves it there | Shauna: she wants to see the board and approve before anything is built. See `_docs/findings/2026-10-11-stringing-ux-review.md`. |
| 2026-10-11 | Footer in the redesign | Moves below the fold; a way back to the games site is still needed on screen | Shauna: OK, she can add them back; asked for back-link ideas. |
| 2026-10-11 | Desktop layout in the redesign | Bead case becomes a 360 px panel on the right, canvas takes the full height | Shauna approved the reviewer's idea. |
| 2026-10-11 | Edit the sign from the wall | Tap the neon sign to open the sign editor, same limits (12 characters, letters, numbers, spaces, ! ? &) | Shauna asked. Reuses Decorate so there is one editor. |
| 2026-10-11 | Stringing redesign | Built and live: controls off the canvas, command bar, fixed-height case, desktop right panel, footer below the fold | Shauna asked to see it on the live site after the boards. |
| 2026-10-11 | Back to the games site | Back arrow before the wordmark (her option B) | Shauna's pick of three ideas. |
| 2026-10-11 | Back arrow on Finished and Wall | Goes back to the stringing screen; on stringing it goes to the games site | Shauna. |
| 2026-10-12 | Finished and Wall redesign | Built from the approved boards: controls off the canvas, labeled Share, bottom sheets, desktop panels, larger bracelets on one cone | Shauna approved the boards and said build them. |
| 2026-10-12 | Display piece | Peg rails with hanging loops replace the velvet cones (session 6) | The cones made the display the hero and the bracelets small, half of every phrase around the back. Hooks put every bracelet front-facing and readable and use the whole canvas. Shauna picked the hook wall over a shadow box and acrylic tiers, built straight to live. The cones are in git history. |
| 2026-10-12 | Tags | Name and date on a kraft tag inside the loop; "Mine" default, the trade note for trades, editable from the options sheet | Shauna wanted name and date, "intentional and cool". Inside the loop so no tag crosses a neighbor or the canvas edge (beside the peg, they did). |
| 2026-10-12 | Wall gestures | Tap opens the options (with a lift and jingle); hold then drag moves a bracelet; plain drag scrolls | Press and hold was undiscoverable as the only way in. Tap is the obvious one; hold-and-drag follows the home screen convention. |
| 2026-10-12 | Visit my wall | Built: a link carrying the whole wall, read-only, with Take a copy | Shauna's pick from the session 6 ideas. No backend, the link is the wall. |
| 2026-10-12 | Installable | Manifest, icons, service worker | Stadium signal. Shauna approved. |
| 2026-10-12 | Wrist shot (camera try-on) | Not built | Shauna: everything but that one. |
| 2026-10-12 | Name feature | Built: "Your name" in Decorate drives tags, the sign, the ticket, the sender on copies, and the Start over bracelet | Shauna asked which default to use; the name was recommended and she said add it now, then "go with your rec" on the starter spelling it. Ticket wording kept. |
| 2026-10-12 | Wall props | Fairy lights and a ticket stub, each switchable; no polaroid | Shauna said add them. A polaroid needs a real picture; a stock one would be fake. |
| 2026-10-12 | Empty wall | Stays as one bare rail, no ghost loop | Shauna. |
| 2026-10-12 | Share on the wall | A labeled Share sheet (Save photo, Send link) replaces the bare camera icon | Two actions need labels; matches the Finished screen's Share. |
| 2026-10-09 | Shake to spill | Built: tap a loose bead to string it; they roll back after 12 seconds | Shauna approved. |
| 2026-10-09 | Name feature | Not yet | Shauna. |
| 2026-10-09 | Era presets | Approved in principle; placement and naming open | Shauna liked the idea. Trademark caution: no artist name, logos, cover art, or lyrics in the app. |
| 2026-10-10 | Tabletop | Felt bead mat by default, wood selectable | Shauna asked to see felt. Photo scan (CC0), per the wood lesson that code-made textures look fake. |
| 2026-10-09 | Workflow | Push finished work straight to `main`; never give local run commands | Shauna's rule: she checks on the live site. Recorded in `CLAUDE.md`. |


## Wrong turns worth knowing

- `gh repo create` fails in a cloud session. Repositories must be created by Shauna, then attached.
- The games site returned "not found" at `/13-beads/` until a rewrite for the bare folder path was added. A wildcard rewrite does not match it. See the `games` README.
- Git in the local Mac folder leaves `.lock` files unless delete permission has been granted for that folder in the session. Pulls then fail with "another git process seems to be running". Grant delete permission, remove the stale lock files, and pull again.
- Screenshots at device scale 2 or 3 time out in the software renderer. Use scale 1.
- Wood generated in code failed twice: planks with seams tiled into a brick pattern, then a single slab still looked synthetic. Photo-scanned CC0 textures fixed it. See `_docs/findings/2026-10-09-wood-textures-and-sound-checks.md`.
- A "pile of beads" in each tray compartment was a misread of Shauna's request (she meant the case around them). Reverted to one bead per compartment.
- Sound went through three versions: synthesized clicks (rejected), realistic struck-object synthesis (rejected), then musical notes in one key (kept, guitar voice).
- The Playwright software renderer stalls on element-level screenshots and on click stability checks. Use page screenshots with `clip`, and click with `$eval(sel, e => e.click())`.
- Vercel preview builds sat in a queue for over 30 minutes once; production builds were not affected afterward. If a preview stalls, check the deployments page.
- Another session also pushes to `main` (the README screenshot commit). Always `git fetch` and rebase before pushing.
- A new CSS class reused existing names (`.swatch`, `.swatches` from the Decorate popover) and broke both. Check `src/style.css` for a name before adding one.
- Copying files to the Mac with the device commit tool reported success for two files that did not update before `git commit` ran there, so a commit message listed spacers that were not in it. After copying, check the content on the Mac (`grep`) before committing.
- The Mac link has no GitHub login. Commit and push from the cloud clone (`/home/claude/13-beads`), then fast-forward the Mac copy with `git fetch` and `git merge --ff-only origin/main`.
- Pushes to `main` from the cloud were blocked by the permission check until Shauna made "push to main" an explicit project rule; after that they went through.
- When the questions list changes between replies, keep the numbering stable. Shauna answered an older list once and the numbers no longer matched.
- `pkill -f "vite preview"` from the shell killed the shell itself. Start the preview with `setsid` on a fresh port instead.
- In tests, Playwright's `$eval(click)` has `detail` 0, so the More menu opens as if from the keyboard and focuses its first item. That focus ring in screenshots is expected.
- The share card's QR canvas sat under a global `.stage canvas` rule (absolute, full size). Scope canvas rules to the game canvas.
- Session 4: `pkill -f "vite preview"` killed the shell again. Start each preview on a new port with `setsid` instead; the preview also stopped by itself between some tool calls, so check it answers before screenshotting.
- Session 4: the device link cannot push (no GitHub login on the Mac) and the first `add_repo` request was refused by the permission check; on the second try it went through. Shauna pushed the confetti commit herself in between. Fetch before assuming what is on `main`.
- Session 5: the first commit carried an assistant co-author line from the session's default attribution. Shauna's rule (no AI credit) overrides it; the commit was amended within a minute. Check every commit message before pushing.
- Session 5: I told Shauna the design board might be out of date without checking it. It was not. Compare the board with the live game before claiming drift.
- Session 6: the `vite preview` server died between tool calls once (curl returned 000); start a fresh one on a new port with `setsid`, as in session 4.
- Session 6: a `wheel` on the wall only scrolls the room when it is taller than the canvas; otherwise the event passes through and the page scrolls to the footer. Expected, but a test that wheels on a short wall gets a page scroll, not a wall scroll.
- Session 6: a tag hung beside the peg (mirrored on the last column so it stayed on stage) crossed the neighboring loop. Inside the loop, where the bracelet is bare, it reads cleanly and needs no mirroring.
- Session 6: "Take a copy" from a visited wall did nothing until the mode was switched to `line` first, because the trade stringing only adds beads while stringing. Call `setMode('line')` before `receiveTrade` from anywhere but boot.
- Session 6: Playwright's `mouse.wheel` and drag both scroll the wall fine; `$eval(click)` on `#popKeep` leaves a keyboard focus ring on the bracelet button (expected, as with the More menu).
- Session 5: Shauna asked to approve redesigns on the board first, then asked to see the stringing redesign live; the Finished and Wall redesign went board first, then build on her "go ahead". Ask which she wants for each large change.
- In Playwright tests, "See it finished" on an empty string does nothing (correctly), so tests that hang bracelets must string another before tying again. A page opened from a trade link stalls the software renderer's screenshot; check its state with `$eval` instead.
- Session 4: git on the Mac needed delete permission for the folder (lock files). Granted once per session via the delete permission prompt.
- Era bracelet names went through three versions in one evening: a 3.5 second label in the count pill (missed), the label kept while customizing (she did not want a label at all), then the name spelled in letter beads on the bracelet. Ask where text should live before building a label.
- Frosted gold letters read too faintly on the felt at bracelet size; gold on black or white letters read well.
- Empty spacer compartments (to start each tray group on a new column) looked like missing beads on her phone. Do not leave empty wells in the case.
- The first S snake was too small and thin on the string; it needed about twice the length and a thicker tube to read.
