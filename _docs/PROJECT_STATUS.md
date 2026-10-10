# Project status

Last updated: 2026-10-10 (end of session 3). Everything below is on `main` and live, including these docs.

## What exists

**Stringing (mode `line`)**
- A 3D cord simulated as a weighted rope (Verlet chain with gravity): beads weigh it down, a pluck bends it at the finger, phone tilt tips gravity. Drawn zoomed out a little (`ZOOM = 0.82` in `frame` in `src/main.js`): beads are about 18 percent smaller than the cord has room for.
- Tabletop: gray felt like a bead mat by default (`src/assets/felt.jpg` and `felt-normal.jpg`, CC0 ambientCG "Fabric 034"), or dark wood (`src/assets/table-dark.jpg`, CC0 Poly Haven "Dark Wood"). Picked in the More menu (Table: Felt / Wood), saved as `13beads.table`. The cord is lavender gray on felt and pale on wood. In dark mode the room dims under a warm desk lamp. The table is drawn beneath everything and is partly self-lit so stage lights do not tint it much.
- Canvas controls: bead count with a fill bar (top left); Undo, Redo, and Clear (trash) icons (top right, each grayed out when it would do nothing); "See it finished" (bottom center). No pop-up hint box anywhere: messages go only to a hidden screen-reader live region (`#status`).
- Header: wordmark, Tilt (iPhone only, until allowed), Your wall (with count badge), and a "⋯" More menu: Sound, Light or Dark mode, Table (Felt / Wood), which end new beads go on, and Start over.
- Touch: tap a case compartment to add a bead (it slides on and plays the next note). On the string: tap to pull a bead off, drag to reorder, pluck the cord (press must start on it), swipe fast to strum. Cmd or Ctrl + Z undoes; with Shift, or Ctrl + Y, redoes.
- Length budget: the string holds beads by total width (`BUDGET = 25` units, about 32 pony beads or 26 letters, or about 80 clay discs), not by count. Older saved strings over the budget keep all their beads.
- Starter bracelet (first visit, and Start over): pearl, gold glitter, sparkle, 1 3, hot pink, B E A D S, sparkle, gold glitter, pearl. Round white letters; an older saved cube starter still counts as the untouched starter (`LEGACY_STARTER` in `src/main.js`).
- Shake to spill: on a phone, two hard jolts within half a second pour 18 loose beads onto the table (mostly the picked color, some letters, the odd charm). Tap one to string it; untouched, they roll back into the case after 12 seconds. iPhone gets motion access from the Tilt button tap. Off with reduced motion. Tested only with simulated motion events.

**Two strands** (More menu: Strands One / Two)
- A second cord hangs below the first. A Top / Bottom / Both picker sits at the bottom left of the canvas (the "See it finished" button moves to the right); new beads, typed phrases, and spilled beads go on the picked cord. "Both" threads a bead on both cords, and the cords meet there.
- On two strands the Beads tab starts with two one-tap patterns in the picked color: Cross (a seed bead on both cords, one on each cord, one on both) and Diamond (a small faceted crystal on both cords, three seed beads on each cord, another crystal on both). A pattern skips its first shared bead when the string already ends on one.
- Drag a bead above or below the middle of the string to move it to the top or bottom cord; let go right between them to thread it on both.
- Saved as `c` on each bead: no `c` is the top cord, `c: 1` the bottom, `c: 2` both, so single-strand bracelets are unchanged. `layoutCords` in `src/beads.js` places beads: between two shared beads each cord carries its own run, centered, and the stretch is as long as the longer run. The length budget counts the longer cord. `cordGap` sets how far apart the cords are (they meet at shared beads and toward the ends).
- The cords are drawn as offsets from the one simulated rope, so plucking, tilt, and the tied loop work as before. In the tied loop the top cord is the inner ring. On the wall the cords sit one above the other around the cone, and a two-strand bracelet takes extra height in the stack.
- Opening a two-strand bracelet (saved string, Edit from the wall, trade link, undo) turns two strands on. Turning two strands off puts every bead back on one cord (undoable).
- Trade links: a bead token ending in `~1` or `~2` is on the bottom cord or both.

**Bead case** (clear plastic organizer, lid folds it away; tabs Beads, Letters, Charms, Dangles)
- Beads tab: a 16-color strip (saved as `13beads.color`; blush, baby blue, cream, and navy were added at the end of `COLORS` and placed by `COLOR_ORDER`), then one compartment per type in that color: pony, clay disc, round, crystal, solid cube, smiley, jelly, metallic, glitter, glow, matte, star bead, dice, small faceted crystal, seed bead, frosted glitter seed bead, silver-lined seed bead. Then pearl, silver spacer, gold ball spacer, silver daisy spacer, rhinestone rondelle, marbled pearl, moonstone, clear, pearl, and gunmetal seed beads, frosted square seed bead, gunmetal spacer, gold and silver bead caps. Seed beads are about a third of a pony bead wide (about 89 fit). Tiny beads are drawn larger in their compartments (`TINY` in `src/main.js`). A cap turns its cup toward the nearest bead. Mid-tone colors are drawn deeper (`deep` in `src/beads.js`) so beads match their dots.
- Letters tab: a row with the shape switch (Round, the default, or Cube) and five looks (White, Black, Pink letters on white, Gold letters on black, Frosted clear with gold letters), then the phrase field ("Type a word or phrase"), then A to Z, a pink heart bead, 0 to 9, ! ? &. Typing a heart (or <3) in the phrase adds a heart bead. Saved as `{ k: 'letter', ch, st?, sh? }`: no `st` is white, no `sh` is a cube, so every bracelet saved before round letters keeps its cubes. Shape and look are not remembered between visits.
- Charms (26) and Dangles (20 hanging charms; the last four, from Shauna's photos: lucky rock, evil eye, heart and arrow, potted cactus); sizes in `BOOST` in `src/beads.js`.

**Tie-off (mode `tied`)**
- The cord morphs into a knotted loop; drag to spin, tap for more confetti. Confetti: about 85 shiny pastel foil stars and 30 small maple leaves that tumble and flutter down (off with reduced motion).
- Bottom: "Keep editing" (back to the string) and "Add to my wall".
- Camera button opens "Share this bracelet": optional gift tag note (40 characters), then Save card (1080 x 1920 story picture: wordmark, the loop, the phrase, the date, the tag, the site address), Send link (share sheet on phones, clipboard on computers), or QR code (`qrcode-generator`, MIT).

**Trade links**
- Link: game address plus `#t=<code>&n=<note>`. `encodeBracelet` / `decodeBracelet` in `src/beads.js` write one token per bead by kind (letters as themselves, colored beads as type letter plus strip color, everything else as `-name`), so new beads never break old links. Off-strip colors from older bracelets map to the nearest strip color.
- Opening a link: the code is cleared from the address bar, the player's own string is set aside (`trade.saved`, never saved over), the bracelet strings itself bead by bead and ties off, and a pill reads "A bracelet for you: <note>". "Hang it on my wall" or "Back to mine" (leaving any other way also restores the player's string).

**The wall (mode `stack`)**
- Plain painted wall (white, pink, or sage) with a soft top-to-bottom fade and faint grain; no shadows on it.
- Display: white velvet bracelet cones (pile texture plus sheen) on a lacquered riser whose color follows the wall; cones and riser tilt slightly toward the viewer. Bracelets stack as level rings around a cone, oldest lowest, letters facing out. Up to 12 shown (2 cones of 6 on phones, 3 cones of 4 wider), up to 24 remembered.
- Drag sideways on a cone to spin it; tap to jingle; hold or right-click a bracelet for Edit it, Take it off, or Leave it. Edit puts it on the string; a string in progress hangs in its place unless it is the untouched starter.
- Neon sign: always lit, letters spaced like separate tubes, centered between the cones and the top buttons. Decorate sets the wall color, the sign word (12 characters), and the sign color (Rainbow default, White, Pink, Blue), all saved in `13beads.wall`.
- Keyboard: Tab reaches each bracelet, Enter or Delete opens its options, popovers trap Tab and close on Escape.

**Sound (`src/audio.js`)**: musical, D major. Stringing plays a melody over I, V, vi, IV; charms add bells; strumming arpeggiates; hanging resolves home. Acoustic guitar voice by default, through a small room reverb. The ping-pong echo is off for the guitar (it made plucks sound doubled); the other voices still use it.

**Footer**: "‹ More games" and "Made by Shauna".

## Not verified

- Two strands on a real phone: the cord picker and moved finish button, dragging beads between cords, and how the Cross and Diamond patterns read at phone size.

- Shake to spill on a real phone (only simulated motion events were tested), and whether two 17 m/s² jolts is the right strength.
- Tilt and the iPhone permission button.
- The phone share sheet for Save card, Send link, and Save photo (only desktop downloads and clipboard were exercised).
- Trade links on a phone end to end, and QR scanning with a real camera.
- Cone spinning and press-and-hold on a real phone; wall performance on older phones.
- Screen reader announcements (keyboard only was tested).

## Open with Shauna

- Era presets ("Surprise me"): she likes the concept but is unsure how the control could avoid being intrusive. Placement and naming are open.
- Shake strength, after a real phone test.
- Length budget: kept for now, to revisit.
- Name feature (ask the player's name, starter spells it, sign says "<name>'s beads"): not yet.
- True-size beads: on hold.

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
| 2026-10-08 | Wall and tie-off controls | Float on the canvas instead of panels below it | Shauna asked. Direct manipulation: act on the bracelet itself, icons in corners, one labeled primary action. |
| 2026-10-08 | Taking a bracelet off | Press and hold (or right-click) a bracelet, then confirm | Replaces "Take one off", which only removed the newest. |
| 2026-10-08 | Wall color | Player picks from 3: white (default), pink, sage | Shauna approved. Neutral white makes bead colors pop. Few curated options all look good with the gold stand. |
| 2026-10-08 | Neon sign word | Player can change it. Default is the game name, "13 beads" | Shauna: if it is editable it should be the player's word, within limits that keep it looking good. |
| 2026-10-08 | Accessibility | Wall is keyboard operable | Shauna wants accessibility standards followed where possible. |
| 2026-10-08 | Wall props | Plant removed. Stand and shelf shadows off. Focus on the wall texture | Shauna: the shadows looked odd and the plant was clutter. |
| 2026-10-08 | Night wall | Each color keeps its own feel at night | Shauna asked. |
| 2026-10-08 | Interface style | Fewer, quieter controls: icon header, grouped icons, one dark primary button | Shauna asked for a simpler, more sophisticated interface. |
| 2026-10-08 | Back to games | Muted "‹ Games" link at the start of the header | Shauna: visible but not obvious or intrusive. (Superseded 2026-10-09: moved to the footer.) |
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
| 2026-10-09 | Controls | Hybrid: Undo, Redo, Clear on the canvas; Sound, theme, end switch, Start over, Table in a "⋯" menu; phrase field in the Letters tab | Shauna picked option C, then asked for Redo and for Clear back on the canvas as a trash icon. |
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
| 2026-10-10 | Confetti | Pastel foil stars with small maple leaves, replacing the paper | Shauna asked. |
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
