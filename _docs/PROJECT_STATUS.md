# Project status

Last updated: 2026-10-09. Everything below is committed, merged to `main`, and deployed to production.

## What exists

**Stringing (mode `line`)**
- Controls float on the canvas like the other screens: bead count (top left), Undo and Clear icons (top right), the Left/Right end switch as two arrow icons (bottom left), "Finish bracelet" (bottom center), and a hint note that fades. Below the canvas: the phrase field (with an arrow button inside it), the tabs, and the tray.
- 3D string simulated as a weighted rope (Verlet chain with gravity): beads weigh it down where they sit, plucks bend it locally at the finger, tilt tips gravity, and it has a twisted-thread texture.
- The string lies over a wood tabletop made from a photo-scanned CC0 texture, Poly Haven "Dark Wood" (`src/assets/table-dark.jpg`), in both themes. The cord is pale lavender in both themes so it shows on the dark wood, and the bead counter has a dark backing. In dark mode the room dims and a warm desk lamp pools light in the middle of the table. The table catches shadows but is drawn beneath everything, so the tilted loop never dips behind it, and part of its color is self-lit so the colored stage lights do not tint it.
- Touch: the string is only caught by a press that starts on it (22 px band on touch screens, 14 px with a mouse) and only follows after the finger moves 8 px. Pulling is silent; the pluck sounds on release if pulled more than 18 px. Only a fast swipe across beads plays strum notes. Double-tap zoom is off (pinch zoom still works). Tap a bead to add it. It slides on, squashes, and clicks.
- Add to either end of the string (Left / Right switch). Type a phrase and the letters string themselves, rising in pitch.
- On the string: tap to pull a bead off, drag to reorder, pluck the string, strum across the beads.
- Limit of 26 beads. Undo and Clear.
- Tilt leans the string and hanging charms. iPhone shows a Tilt button because it needs a tap for permission.

**Bead case**: the tray sits in a clear plastic organizer (recessed compartments with clear walls), one bead picture per compartment. The Beads, Letters, Charms, and Dangles tabs are inside the case. Its top edge is a lid button that folds the case away ("Show beads" brings it back), which gives the string more room.

**Catalog (`src/beads.js`)**
- Beads tab: 12 colors, pearl, 3 glitter, 2 glow, silver spacer.
- Letters tab: A to Z, 0 to 9, and ! ? &.
- Charms tab, 26 (adds heart sunglasses): Lucky 13, star, sparkle, heart, pastel heart, wire heart, mirror ball, jewel, snake, butterfly, cat, seagull, crescent moon, midnight clock, rainbow, evergreen tree, autumn leaf, instant photo, bow and arrow, music note, vinyl record, cassette tape, ticket stub, chihuahua (flat die-cut enamel style), red lips (die-cut).
- The 13 charms from set three are drawn 1.2 to 1.4 times larger (`BOOST` in `src/beads.js`) after reading small on a phone.
- Dangles tab, 15 hanging charms: guitar, microphone, cowboy boot, cardigan, red scarf, champagne glass, chair, ladder, storm in a teacup (a lightning bolt striking a teacup), lightning rod, redwood tree, showgirl feather, pink cowboy hat, disco cube, snow globe.

**Tie-off (mode `tied`)**
- The string morphs into a knotted loop. Drag to spin it, tap for sparkles.
- Controls float on the canvas: Untie (top left), camera icon for Save photo (top right), "Add to my wall" (bottom center), and a hint note that fades after a few seconds.

**The wall (mode `stack`)**
- Limewash plaster wall (soft cloudy tone shifts, fine grain, trowel ridges, all generated in code), slim dark wood floating shelf, gold three-tier T-bar stand, neon-style script sign. The plant is gone, and the stand and shelf cast no shadows.
- Each wall color has its own night tint.
- Controls float on the canvas: Decorate and Save photo icons grouped top right, "Make another" (bottom center, dark ink button), and a short hint note that fades. The "on display" label moved to a badge on the header's wall button.
- Decorate popover: wall color (white by default, pink, or sage) and the neon sign word (defaults to "13 beads", up to 12 letters, numbers, spaces, or ! ? &, shrinks to fit). Saved under `13beads.wall`.
- Take any bracelet off: press and hold it (phone), or hold or right-click (computer). A confirm popover appears beside it.
- Keyboard: Tab reaches each bracelet (an invisible button over it, with a focus ring around the bracelet). Arrow keys move between them. Enter or Delete opens the confirm. Popovers keep Tab inside, close on Escape, and return focus.
- Bracelets hang from gold hooks facing forward. Grab to swing, brush across to knock them, tap for a jingle, tilt to lean.
- Shows the newest 9 on a phone and 12 on desktop. Up to 24 are remembered.
- Day mood in light mode (window light across the wall). Evening mood in dark mode (lamp glow, lit neon).
- Slight depth-of-field blur behind the bracelets.

**Header**: a muted "‹ Games" link back to games.shauna.digital (chevron only on phones), the wordmark, then icon buttons for Light/Dark (moon or sun), Tilt, Sound, and Your wall (with a count badge). The theme follows the device until the player taps the toggle; the pick is saved under `13beads.theme`.

**Sound (`src/audio.js`)**: musical. Every sound is a note in D major. Stringing beads plays a melody over I, V, vi, IV (four beads per chord), restarting after a 2 second pause, so each bracelet plays its own tune. Charms add a bell an octave up, wood charms drop an octave, fabric charms swell softly. Strumming arpeggiates the current chord, plucking the cord plays its bass note, and hanging a bracelet resolves to the home chord. One instrument voices everything (acoustic guitar by default: a plucked steel string with a pick-position comb, pitch-dependent decay, and wooden body resonances; music box, kalimba, and synth pluck are built in, chosen with `setInstrument`), through a tempo-synced ping-pong echo and a small room.

**Games site**: `games.shauna.digital` is live from the `games` repository, with 13 Beads mounted at `/13-beads`.

## Not verified

No one has tested these on a real device. Treat each as unknown, not as working.

- Anything on a real phone: touch feel, performance, layout in mobile Safari.
- All sounds. The test browser has no audio.
- Tilt, and the iPhone permission button.
- The phone share sheet for Save photo. Only the desktop download was exercised.
- Performance of the wall's depth-of-field effect on phones. It renders the scene more than once per frame. If the wall is slow on a phone, this is the first thing to turn off (`renderWall` in `src/main.js`).
- The daytime neon sign is faint against the wall (pink and white both). To review now that white is the default.
- Screen reader announcements for the bracelet buttons (tested by keyboard only).
- The rebuilt sounds. The test browser has no speakers; levels were checked by rendering them offline (no clipping, every sound audible).

## Decisions

| Date | Decision | Resolution | Why |
|---|---|---|---|
| 2026-10-07 | Audience | Concert bracelet-trading fans | Shauna's choice. Drives the phrase-first design and charm list. |
| 2026-10-07 | Name | "13 Beads" | Name only. It is not a 13-bead limit. The string holds 26 so full phrases fit. |
| 2026-10-07 | Rendering | Real 3D with Three.js | Shauna ranked glossy, realistic beads as the top priority over a lighter flat build. |
| 2026-10-07 | Backend | None. Local storage only | Portfolio piece with nothing to maintain. A collection lives on one device. |
| 2026-10-07 | Hosting | Vercel, deployed from GitHub, under `games.shauna.digital/13-beads` | Free at this scale, auto-deploys, and the account was already connected. |
| 2026-10-07 | Music player | Skipped | Only YouTube plays full songs without login. Shauna chose to skip for now. |
| 2026-10-07 | Charm finishes | One signature finish per charm, no color variants | Shauna: charms are one-of-a-kind. Also keeps the tray small. |
| 2026-10-07 | Lucky 13 look | Die-cut blue glitter numerals, black outline, white border | Matches Shauna's reference. Drawn fresh, not traced. |
| 2026-10-07 | "Lover" script charm | Not built | That lettering is album logo artwork. Players can spell the word in letter beads. |
| 2026-10-07 | Hanging charm type | Tall or irregular charms hang from a ring instead of sitting on the string | A string through a cardigan or boot looked wrong. |
| 2026-10-08 | Hanging charm size | Charm scale 1.02 (guitar 0.92) | 0.78 was too small, 1.3 too big. Shauna approved the middle. |
| 2026-10-08 | Collection display: arm | Rejected | A code-built mannequin arm looked bad. |
| 2026-10-08 | Collection display: denim jacket with safety pins | Built, then removed | Replaced by the wall idea. Returns later as its own craft with patches and pins. |
| 2026-10-08 | Collection concept | A decorated wall, like a fan's merch wall | Shauna's idea. A wall can display every future craft. A jacket could only hold bracelets. |
| 2026-10-08 | Heart hands built in code | Rejected twice | Tubes and spheres cannot make convincing hands. Needs a real 3D model. |
| 2026-10-08 | MakerWorld heart-hands model | Not usable | Its license forbids hosting or distributing the file. |
| 2026-10-08 | Current display piece | Gold T-bar stand | Geometric, so it renders well in code. Shauna approved it as the display for now. |
| 2026-10-08 | Bracelets on the T-bar | Hang from hooks facing forward | On a real T-bar they sit edge-on and phrases cannot be read. |
| 2026-10-08 | Wall color | Soft pink painted plaster | Shauna chose a painted wall to start. Whether players pick the color is still open. |
| 2026-10-08 | Unlocks and trading links | Deferred | Shauna: hold until the core is further along. |
| 2026-10-08 | Wall and tie-off controls | Float on the canvas instead of panels below it | Shauna asked. Direct manipulation: act on the bracelet itself, icons in corners, one labeled primary action. |
| 2026-10-08 | Taking a bracelet off | Press and hold (or right-click) a bracelet, then confirm | Replaces "Take one off", which only removed the newest. |
| 2026-10-08 | Wall color | Player picks from 3: white (default), pink, sage | Shauna approved. Neutral white makes bead colors pop. Few curated options all look good with the gold stand. |
| 2026-10-08 | Neon sign word | Player can change it. Default is the game name, "13 beads" | Shauna: if it is editable it should be the player's word, within limits that keep it looking good. |
| 2026-10-08 | Accessibility | Wall is keyboard operable | Shauna wants accessibility standards followed where possible. |
| 2026-10-08 | Wall props | Plant removed. Stand and shelf shadows off. Focus on the wall texture | Shauna: the shadows looked odd and the plant was clutter. |
| 2026-10-08 | Night wall | Each color keeps its own feel at night | Shauna asked. |
| 2026-10-08 | Interface style | Fewer, quieter controls: icon header, grouped icons, one dark primary button | Shauna asked for a simpler, more sophisticated interface. |
| 2026-10-08 | Back to games | Muted "‹ Games" link at the start of the header | Shauna: visible but not obvious or intrusive. |
| 2026-10-08 | Sound | Musical: every sound is a note in one key, stringing plays a melody | Shauna rejected both the original sounds and a realistic rebuild, and asked for music notes. |
| 2026-10-08 | Daytime neon on white | Fine for now | Shauna. |
| 2026-10-09 | Instrument | Acoustic guitar by default | Shauna asked for a guitar option. Music box, kalimba, and synth pluck stay available in code. |
| 2026-10-09 | Stringing screen | Same on-canvas treatment as the wall and tie-off screens | Shauna approved the simplification pass. |
| 2026-10-09 | String feel | Real rope simulation and a thread texture, same thickness | Shauna: it looked and felt like a rigid wire. Thickness kept for visibility. |
| 2026-10-09 | Stringing surface | Wood (oak by day, walnut by night) | Shauna asked for a surface someone would make a bracelet on. |
| 2026-10-09 | Tray | Clear plastic bead organizer around single-bead pictures, collapsible | Shauna's reference: how people store pony beads in real life. She meant the container, not the bead images; a pile-of-beads version was tried and reverted. |
| 2026-10-09 | Table surface | Photo-scanned CC0 wood (Poly Haven Plywood, lightened; Dark Wood at night) | Code-generated wood tiled into bricks, then still looked off. Real scans look right. CC0 needs no credit. Shauna's reference photo is not used (license unknown). |
| 2026-10-09 | Table wood | Dark Wood in both themes | Shauna's pick from the six CC0 scans. |
| 2026-10-09 | Dark mode on the table | Dim room with a warm desk lamp | Shauna's idea. |
| 2026-10-09 | Light/Dark toggle | Icon in the header; follows the device until used, then remembered | Shauna asked. |
| 2026-10-09 | "Lover" charm | Not built | Shauna wanted it only if it could look like the real logo; that version will not be made. |
| 2026-10-09 | Shauna's sticker drawings | Use as reference for code-built charms, not pasted in | She drew them from online clip art; the generic subjects (heart sunglasses, disco ball, heart hands, bracelet) are fine as ideas. Heart sunglasses built from sticker 21. |
| 2026-10-09 | Favicon | A tiny bracelet: a ring of colored beads on a cord | Shauna asked. |
| 2026-10-09 | Finish button | "Finish bracelet" replaces "Tie it off"; back button reads "Back to stringing" | Shauna: the old wording was poor. |
| 2026-10-09 | String grabbing | Press must start on the string; silent until release | Shauna's phone test: it was too easy to grab by accident and made noise. |
| 2026-10-09 | Charm set three | Music note, vinyl, cassette, ticket stub, chihuahua, red lips; dangles: storm in a teacup, lightning rod, redwood, showgirl feather, cowboy hat, disco cube, snow globe | Shauna's picks. Organic subjects (chihuahua, lips) use the flat die-cut enamel style of Lucky 13 instead of sculpted primitives. |
| 2026-10-09 | Song snippets | Not built | Shauna asked about playing part of a real song. A recognizable snippet carries the protected part (melody, hook). Alternative offered: an original easter-egg melody behind a secret phrase. |

## Wrong turns worth knowing

- `gh repo create` fails in a cloud session. Repositories must be created by Shauna, then attached.
- The games site returned "not found" at `/13-beads/` until a rewrite for the bare folder path was added. A wildcard rewrite does not match it. See the `games` README.
- Git in the local Mac folder leaves `.lock` files unless delete permission has been granted for that folder in the session. Pulls then fail with "another git process seems to be running". Grant delete permission, remove the stale lock files, and pull again.
- Screenshots at device scale 2 or 3 time out in the software renderer. Use scale 1.
