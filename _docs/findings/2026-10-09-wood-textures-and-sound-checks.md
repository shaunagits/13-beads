# Wood textures and checking sound without speakers

Date: 2026-10-09

## Question 1: a tabletop surface that looks real

Shauna wanted the stringing area to look like a wood craft table.

Tried and rejected:
- Planks generated in code (noise grain, seams, butt joints). The staggered joints repeated across the tiled texture and read as bricks.
- A single seamless slab generated in code, tuned toward a reference photo Shauna shared. Better, but still looked synthetic ("still looks funny").

What worked: photo-scanned CC0 textures from Poly Haven. CC0 means free to host with no credit required, which satisfies the third-party asset rule.

- List wood textures: `curl -s "https://api.polyhaven.com/assets?t=textures&c=wood"`
- File URLs for one asset: `curl -s "https://api.polyhaven.com/files/<id>"` then take `Diffuse.1k.jpg.url`
- Both hosts were reachable from the cloud session (`api.polyhaven.com`, `dl.polyhaven.org`).
- Candidates compared: plywood, oak_veneer_01, kitchen_wood, fine_grained_wood, dark_wood, rosewood_veneer1. Plywood was closest to Shauna's pale reference; she picked `dark_wood`.
- In use: `src/assets/table-dark.jpg` (Poly Haven "Dark Wood", 1k diffuse, recompressed, about 158 KB).
- Shauna's reference photo was not used as an asset because its license is unknown.

Rendering notes: the table is drawn first with depth writes off, so the tied loop (which tilts toward the camera) never disappears behind it. Half its brightness is emissive from the same texture, so the moving pink and blue stage lights do not tint it.

## Question 2: checking sounds when the test browser has no speakers

Render the game's audio module offline and inspect the result.

1. Bundle it: `npx esbuild src/audio.js --bundle --format=iife --global-name=SND --outfile=/tmp/snd.js`
2. In Playwright, replace `AudioContext` with an `OfflineAudioContext` before loading the bundle, override `currentTime` so calls can be scheduled at chosen times, call the exported functions (`land`, `note`, `twang`, `chime`, and so on), then `startRendering()` and write the samples out as a WAV.
3. Check peak level per section (no clipping, nothing silent) with Python `wave` plus `numpy`, and check pitch with an FFT on each note.

This caught a real bug: the plucked string started at time 0 and was silent until fixed. The guitar's tuning was checked this way to within about 7 cents.

Before redoing either: the textures and the audio approach are already in place. Only revisit if Shauna asks for a different surface or a different instrument.
