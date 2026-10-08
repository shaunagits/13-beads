# Project status

Last updated: 2026-10-08 (second session). Everything below is on `main` and in production, except the items marked **(preview)**, which are on the `polish-wall-sound` branch waiting for Shauna's review.

## What exists

**Stringing (mode `line`)**
- 3D string with sag and bounce. Tap a bead to add it. It slides on, squashes, and clicks.
- Add to either end of the string (Left / Right switch). Type a phrase and the letters string themselves, rising in pitch.
- On the string: tap to pull a bead off, drag to reorder, pluck the string, strum across the beads.
- Limit of 26 beads. Undo and Clear.
- Tilt leans the string and hanging charms. iPhone shows a Tilt button because it needs a tap for permission.

**Catalog (`src/beads.js`)**
- Beads tab: 12 colors, pearl, 3 glitter, 2 glow, silver spacer.
- Letters tab: A to Z, 0 to 9, and ! ? &.
- Charms tab, 19: Lucky 13, star, sparkle, heart, pastel heart, wire heart, mirror ball, jewel, snake, butterfly, cat, seagull, crescent moon, midnight clock, rainbow, evergreen tree, autumn leaf, instant photo, bow and arrow.
- Dangles tab, 8 hanging charms: guitar, microphone, cowboy boot, cardigan, red scarf, champagne glass, chair, ladder.

**Tie-off (mode `tied`)**
- The string morphs into a knotted loop. Drag to spin it, tap for sparkles.
- Controls float on the canvas: Untie (top left), camera icon for Save photo (top right), "Add to my wall" (bottom center), and a hint note that fades after a few seconds.

**The wall (mode `stack`)**
- Limewash plaster wall (soft cloudy tone shifts, fine grain, trowel ridges, all generated in code), slim dark wood floating shelf, gold three-tier T-bar stand, neon-style script sign. **(preview)** The plant is gone, and the stand and shelf cast no shadows.
- Each wall color has its own night tint. **(preview)**
- Controls float on the canvas: Decorate and Save photo icons grouped top right, "Make another" (bottom center, dark ink button), and a short hint note that fades. The "on display" label moved to a badge on the header's wall button. **(preview)**
- Decorate popover: wall color (white by default, pink, or sage) and the neon sign word (defaults to "13 beads", up to 12 letters, numbers, spaces, or ! ? &, shrinks to fit). Saved under `13beads.wall`.
- Take any bracelet off: press and hold it (phone), or hold or right-click (computer). A confirm popover appears beside it.
- Keyboard: Tab reaches each bracelet (an invisible button over it, with a focus ring around the bracelet). Arrow keys move between them. Enter or Delete opens the confirm. Popovers keep Tab inside, close on Escape, and return focus.
- Bracelets hang from gold hooks facing forward. Grab to swing, brush across to knock them, tap for a jingle, tilt to lean.
- Shows the newest 9 on a phone and 12 on desktop. Up to 24 are remembered.
- Day mood in light mode (window light across the wall). Evening mood in dark mode (lamp glow, lit neon).
- Slight depth-of-field blur behind the bracelets.

**Header (preview)**: a muted "‹ Games" link back to games.shauna.digital (chevron only on phones), the wordmark, then icon buttons for Tilt, Sound, and Your wall (with a count badge).

**Sound (`src/audio.js`, preview)**: synthesized, chosen by material (plastic, block, pearl, metal, glass, wood, soft). Hits are modal (a few partials at a real object's frequency ratios, each with its own decay, started by a short click). The cord pluck is a plucked-string model. Every hit varies slightly in pitch, level, and stereo position. All of it runs through a soft low-pass, a compressor, and a small generated room.

**Games site**: `games.shauna.digital` is live from the `games` repository, with 13 Beads mounted at `/13-beads`.

## Not verified

No one has tested these on a real device. Treat each as unknown, not as working.

- Anything on a real phone: touch feel, performance, layout in mobile Safari.
- All sounds. The test browser has no audio.
- Tilt, and the iPhone permission button.
- The phone share sheet for Save photo. Only the desktop download was exercised.
- Performance of the wall's depth-of-field effect on phones. It renders the scene more than once per frame. If the wall is slow on a phone, this is the first thing to turn off (`renderWall` in `src/main.js`).
- The daytime neon sign is faint against the wall (pink and white both). To review now that white is the default.
- Press-and-hold to take a bracelet off, on a real phone.
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
| 2026-10-08 | Sound | Rebuilt in code (modal hits, plucked string, room). Recorded CC0 samples are the next step up if needed | Shauna said the old sounds were bad. |
| 2026-10-08 | Daytime neon on white | Fine for now | Shauna. |

## Wrong turns worth knowing

- `gh repo create` fails in a cloud session. Repositories must be created by Shauna, then attached.
- The games site returned "not found" at `/13-beads/` until a rewrite for the bare folder path was added. A wildcard rewrite does not match it. See the `games` README.
- Git in the local Mac folder leaves `.lock` files unless delete permission has been granted for that folder in the session. Pulls then fail with "another git process seems to be running". Grant delete permission, remove the stale lock files, and pull again.
- Screenshots at device scale 2 or 3 time out in the software renderer. Use scale 1.
