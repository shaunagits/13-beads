# Felt texture source, and how trade links encode a bracelet

Date: 2026-10-10

## Question 1: a felt tabletop that looks real

Shauna asked to see felt (like a crafter's bead mat) instead of wood.

- Poly Haven has no plain felt. Its fabric list (`curl -s "https://api.polyhaven.com/assets?t=textures&c=fabric"`) has fleece, boucle, velour, and "caban" (boiled wool, orange). None read as a gray bead mat without heavy recoloring.
- ambientCG has one: "Fabric 034" (tags: fabric, felt, grey, white). ambientCG assets are CC0, so no credit is needed and hosting is allowed.
  - Search: `curl -s "https://ambientcg.com/api/v2/full_json?q=felt&type=Material&include=downloadData"`
  - Download: `https://ambientcg.com/get?file=Fabric034_1K-JPG.zip` (about 8 MB zip; the color and NormalGL maps are what we use).
- In use: `src/assets/felt.jpg` (color, resized to 768 and recompressed, about 124 KB) and `src/assets/felt-normal.jpg` (normal map, about 112 KB). Wired through `SURFACES` in `src/main.js`, which also holds the wood.
- The pale lavender cord disappeared on light felt, so each surface sets its own cord color.

Before redoing: the wood lesson still holds (code-generated textures looked fake twice). Use photo scans with a CC0 license.

## Question 2: a bracelet in a link short enough for a QR code

Plain JSON of a 20-bead bracelet is about 600 characters, too dense for a phone-scannable QR code. List-position indexes (one number per catalog entry) would be short but break every old link when a bead is added mid-list.

Chosen: one token per bead, by kind, joined with dots (`encodeBracelet` in `src/beads.js`). Letters are themselves (`x1 x2 x3` for `! ? &`, a leading `_` for black), colored beads are a type letter plus a strip color in hex (`p0` is a hot pink pony bead), and everything else is `-name` (`-pearl`, `-cap:gold`). A 20-bead bracelet is about 60 characters. New bead kinds only need a new token, and a new colored type needs a letter in `TYPE_CODE`.
