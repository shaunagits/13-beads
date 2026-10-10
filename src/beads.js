// Bead catalog and 3D bead factory.
// Beads are data: to add one, add a catalog entry and (for a new shape) a builder below.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Width each bead takes up along the string, as a fraction of bead size.
export const UNIT = { seed: 0.28, seedg: 0.28, seedl: 0.28, seedx: 0.28, matte: 0.84, starb: 1.0, dice: 0.7, facet: 0.42, marble: 0.84, moon2: 0.72, gunspacer: 0.24, pony: 0.78, clay: 0.3, round: 0.86, crystal: 0.84, cube: 0.86, smiley: 0.9, jelly: 0.78, metal: 0.8, ball: 0.44, daisy: 0.2, rondelle: 0.32, cap: 0.2, letter: 0.96, pearl: 0.92, glitter: 0.78, glow: 0.78, star: 1.06, heart: 1.04, mirror: 0.98, spacer: 0.3,
  lucky13: 1.04, snake: 1.06, butterfly: 1.12, moon: 0.84, guitar: 0.36,
  pheart: 1.04, sparkle: 1.0, jewel: 0.95, gull: 1.18, rainbow: 1.0, leaf: 1.08, tree: 0.9, clock: 1.0, photo: 0.86, cat: 1.0, wheart: 1.0, arrow: 1.3,
  mic: 0.36, chair: 0.36, ladder: 0.36, cardigan: 0.36, scarf: 0.36, boot: 0.36, coupe: 0.36,
  shades: 1.6, note: 1.04, vinyl: 1.25, cassette: 1.3, ticket: 1.34, chihuahua: 1.38, lips: 1.3,
  minibead: 0.36, rock: 0.36, evileye: 0.36, arrowheart: 0.36, cactus: 0.36, teacup: 0.36, rod: 0.36, redwood: 0.36, feather: 0.36, hat: 0.36, discube: 0.36, globe: 0.36 };

// Charms that hang below the string from a ring instead of sitting on it.
export const DANGLE = new Set(['rock', 'evileye', 'arrowheart', 'cactus', 'guitar', 'mic', 'chair', 'ladder', 'cardigan', 'scarf', 'boot', 'coupe', 'minibead', 'teacup', 'rod', 'redwood', 'feather', 'hat', 'discube', 'globe']);

// The color strip above the Beads tab. Every bead type below that takes a color uses the one picked here.
export const COLORS = [
  ['Hot pink', 330, 90, 58], ['Red', 355, 85, 52], ['Orange', 24, 95, 56], ['Yellow', 48, 98, 56],
  ['Lime', 95, 75, 50], ['Teal', 174, 75, 42], ['Sky', 198, 90, 60], ['Blue', 226, 80, 54],
  ['Purple', 272, 70, 56], ['Lavender', 262, 75, 76], ['Black', 260, 12, 10], ['White', 260, 15, 94],
  // Added 2026-10-10 from Shauna's bracelet photos. New colors always go at the end, since trade links name a color
  // by its place in this list; COLOR_ORDER sets where each one shows on the strip.
  ['Blush', 14, 60, 80], ['Baby blue', 200, 78, 80], ['Cream', 40, 70, 90], ['Navy', 228, 70, 28],
].map(([name, h, s, l]) => ({ name, h, s, l }));
export const COLOR_ORDER = [0, 12, 1, 2, 3, 14, 4, 5, 6, 13, 7, 15, 8, 9, 10, 11];

// Bead types that come in every strip color. A bead's def is { k, h, s, l }.
export const COLOR_TYPES = [
  ['pony', 'pony bead'], ['clay', 'clay disc'], ['round', 'round bead'], ['crystal', 'crystal'], ['cube', 'cube bead'],
  ['smiley', 'smiley bead'], ['jelly', 'jelly bead'], ['metal', 'metallic bead'], ['glitter', 'glitter bead'], ['glow', 'glow bead'],
  ['matte', 'matte bead'], ['starb', 'star bead'], ['dice', 'dice bead'], ['facet', 'small faceted crystal'],
  ['seed', 'seed bead'], ['seedg', 'frosted glitter seed bead'], ['seedl', 'silver-lined seed bead'],
];
export const colorBeads = (c) => COLOR_TYPES.map(([k, label]) => ({
  name: c.name + ' ' + label, def: { k, h: c.h, s: c.s, l: c.l },
}));

// Letter beads come in two shapes and five looks. Shape: flat round coins (sh: 'round', the default for new beads)
// or cubes (no sh, so every bracelet saved before round letters existed keeps its cubes). Look (st): white with dark
// letters (no st), black with white letters, white with pink letters, black with gold letters, or frosted clear with
// gold letters. The heart is a letter bead too: a pink heart on any look.
export const LETTER_STYLES = {
  white: { cube: 0xfbf9ff, ink: '#1c1830', label: 'White' },
  black: { cube: 0x1d1a24, ink: '#ffffff', label: 'Black' },
  pink: { cube: 0xfbf9ff, ink: '#ff3d9a', label: 'Pink' },
  gold: { cube: 0x1d1a24, ink: 'gold', label: 'Gold' },
  frost: { cube: 0xe9e5e2, ink: 'deepgold', label: 'Frosted', frost: true },
};
export const LETTER_STYLE_ORDER = ['white', 'black', 'pink', 'gold', 'frost'];
export const HEART = '\u2665';
const CHARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', HEART, ...'0123456789!?&'];
export const isLetterChar = (ch) => /^[A-Z0-9!?&]$/.test(ch) || ch === HEART;
export function letterDef(ch, st, sh) {
  const d = { k: 'letter', ch };
  if (st && st !== 'white' && LETTER_STYLES[st]) d.st = st;
  if (sh === 'round') d.sh = 'round';
  return d;
}
export const letterBeads = (st, sh = 'round') => CHARS.map((ch) => ({
  name: [st && st !== 'white' ? LETTER_STYLES[st].label : '', sh === 'round' ? 'round' : 'cube', ch === HEART ? 'heart bead' : 'letter ' + ch]
    .filter(Boolean).join(' ').replace(/^./, (c) => c.toUpperCase()),
  def: letterDef(ch, st, sh),
}));
export const LETTERS = letterBeads('white');

// Beads with one fixed look, shown after the colored ones.
export const FIXED = [
  { name: 'Pearl', def: { k: 'pearl' } },
  { name: 'Silver spacer', def: { k: 'spacer' } },
  { name: 'Gold ball spacer', def: { k: 'ball' } },
  { name: 'Silver daisy spacer', def: { k: 'daisy' } },
  { name: 'Rhinestone rondelle', def: { k: 'rondelle' } },
  { name: 'Marbled pearl', def: { k: 'marble' } },
  { name: 'Moonstone bead', def: { k: 'moon2' } },
  { name: 'Clear seed bead', def: { k: 'seedx', m: 'clear' } },
  { name: 'Pearl seed bead', def: { k: 'seedx', m: 'pearl' } },
  { name: 'Gunmetal seed bead', def: { k: 'seedx', m: 'gunmetal' } },
  { name: 'Frosted square seed bead', def: { k: 'seedx', m: 'square' } },
  { name: 'Gunmetal spacer', def: { k: 'gunspacer' } },
  { name: 'Gold bead cap', def: { k: 'cap', m: 'gold' } },
  { name: 'Silver bead cap', def: { k: 'cap', m: 'silver' } },
];
// Spacers and caps are the small metal findings. A bead cap's cup faces its nearest real bead: the next one if it is
// a bead, otherwise the one before. Returns 1 to face the next bead (toward +x), -1 to face the one before.
export const FINDING = new Set(['spacer', 'ball', 'daisy', 'rondelle', 'cap', 'gunspacer']);
export function capFacing(list, i) {
  const solid = (d) => d && !FINDING.has(d.k);
  if (solid(list[i + 1])) return 1;
  if (solid(list[i - 1])) return -1;
  return 1;
}

const named = (list) => list.map(([name, k]) => ({ name, def: { k } }));
export const CHARMS = named([
  ['Lucky 13', 'lucky13'], ['Star', 'star'], ['Sparkle', 'sparkle'], ['Heart', 'heart'], ['Pastel heart', 'pheart'], ['Wire heart', 'wheart'],
  ['Mirror ball', 'mirror'], ['Jewel', 'jewel'], ['Snake', 'snake'], ['Butterfly', 'butterfly'], ['Cat', 'cat'], ['Seagull', 'gull'],
  ['Crescent moon', 'moon'], ['Midnight clock', 'clock'], ['Rainbow', 'rainbow'], ['Evergreen tree', 'tree'], ['Autumn leaf', 'leaf'],
  ['Instant photo', 'photo'], ['Bow and arrow', 'arrow'], ['Music note', 'note'], ['Vinyl record', 'vinyl'], ['Cassette tape', 'cassette'],
  ['Ticket stub', 'ticket'], ['Chihuahua', 'chihuahua'], ['Red lips', 'lips'], ['Heart sunglasses', 'shades'],
]);
export const DANGLES = named([
  ['Acoustic guitar', 'guitar'], ['Microphone', 'mic'], ['Cowboy boot', 'boot'], ['Cardigan', 'cardigan'], ['Red scarf', 'scarf'],
  ['Champagne glass', 'coupe'], ['Chair', 'chair'], ['Ladder', 'ladder'], ['Storm in a teacup', 'teacup'], ['Lightning rod', 'rod'],
  ['Redwood tree', 'redwood'], ['Showgirl feather', 'feather'], ['Cowboy hat', 'hat'], ['Disco cube', 'discube'], ['Snow globe', 'globe'], ['Mini bracelet', 'minibead'],
  ['Lucky rock', 'rock'], ['Evil eye', 'evileye'], ['Heart and arrow', 'arrowheart'], ['Potted cactus', 'cactus'],
]);

export const defKey = (d) => JSON.stringify(d);

/* ---------- Surprise me: ready-made bracelets in each era's colors ---------- */
// Named by album title (Shauna's call, 2026-10-10, with a fan-made note in the footer). Never the artist's name,
// logos or title lettering, cover art, or lyrics.
const tint = (name) => { const c = COLORS.find((o) => o.name === name); return { h: c.h, s: c.s, l: c.l }; };
const B = (k, color) => ({ k, ...tint(color) });
const mirrorAround = (half, mid) => [...half, ...mid, ...half.slice().reverse()];
export const PRESETS = [
  ['Midnights', mirrorAround([B('seed', 'Navy'), B('seed', 'Navy'), B('facet', 'Navy'), B('starb', 'Blue'), B('facet', 'Navy'), B('starb', 'Baby blue'), B('facet', 'Navy'), { k: 'moon2' }], [{ k: 'moon' }])],
  ['Fearless', mirrorAround([{ k: 'pearl' }, B('glitter', 'Yellow'), B('pony', 'Cream'), B('pony', 'Cream'), B('glitter', 'Yellow'), { k: 'ball' }, B('pony', 'Cream')], [{ k: 'guitar' }])],
  ['Speak Now', mirrorAround([B('jelly', 'Lavender'), B('glitter', 'Purple'), { k: 'rondelle' }, B('crystal', 'Purple'), { k: 'pearl' }, B('glitter', 'Purple')], [{ k: 'butterfly' }])],
  ['Red', mirrorAround([B('pony', 'Black'), B('pony', 'Red'), B('pony', 'White'), B('pony', 'Red'), B('metal', 'Red'), B('pony', 'Red')], [{ k: 'scarf' }])],
  ['1989', mirrorAround([B('pony', 'Baby blue'), B('pony', 'White'), B('round', 'Sky'), B('pony', 'White'), { k: 'spacer' }, B('pony', 'Baby blue')], [{ k: 'photo' }])],
  ['Reputation', mirrorAround([B('metal', 'Black'), { k: 'seedx', m: 'gunmetal' }, { k: 'seedx', m: 'gunmetal' }, B('crystal', 'Black'), { k: 'spacer' }, B('matte', 'Black')], [{ k: 'snake' }])],
  ['Lover', mirrorAround([B('pony', 'Blush'), B('pony', 'Baby blue'), B('pony', 'Lavender'), { k: 'pearl' }, B('jelly', 'Hot pink'), B('pony', 'Blush')], [{ k: 'pheart' }])],
  ['Folklore', mirrorAround([B('clay', 'Cream'), B('clay', 'Cream'), B('matte', 'White'), B('round', 'Black'), B('clay', 'Cream'), B('matte', 'White'), { k: 'pearl' }], [{ k: 'cardigan' }])],
  ['Evermore', mirrorAround([B('clay', 'Orange'), B('round', 'Cream'), B('matte', 'Orange'), B('clay', 'Cream'), { k: 'ball' }, B('round', 'Teal')], [{ k: 'leaf' }])],
  ['The Tortured Poets Department', mirrorAround([B('matte', 'Black'), B('pony', 'White'), { k: 'pearl' }, B('matte', 'White'), B('pony', 'Black'), { k: 'spacer' }], [{ k: 'wheart' }])],
  ['The Life of a Showgirl', mirrorAround([B('glitter', 'Orange'), B('pony', 'Teal'), B('glitter', 'Orange'), { k: 'pearl' }, B('glitter', 'Teal'), { k: 'ball' }], [{ k: 'feather' }])],
].map(([name, beads]) => ({ name, beads }));

/* ---------- Two strands ---------- */
// A bead's def can carry c: 1 (it is on the bottom cord) or c: 2 (both cords pass through it). No c is the top
// cord, so every single-strand bracelet saved before two strands existed is unchanged.
export const cordOf = (d) => (d && (d.c === 1 || d.c === 2) ? d.c : 0);
export const withCord = (d, c) => { const o = { ...d }; delete o.c; if (c === 1 || c === 2) o.c = c; return o; };
// Where each bead sits along the bracelet, in bead units from its middle, and which cord it is on (-1 top, 1 bottom,
// 0 both). Between two shared beads each cord carries its own run of beads, centered, and that stretch is as long as
// the longer run, plus a little room for the cords to part around a shared bead.
const PART = 0.22;
export function layoutCords(list) {
  const n = list.length, off = new Array(n), side = new Array(n).fill(0), joins = [];
  const two = list.some((d) => cordOf(d));
  let acc = 0;
  if (!two) {
    list.forEach((d, i) => { const w = UNIT[d.k] || 0; off[i] = acc + w / 2; acc += w; });
  } else {
    let run = { a: [], b: [] }, afterShared = false;
    const len = (ids) => ids.reduce((t, i) => t + UNIT[list[i].k], 0);
    const flush = (nearShared) => {
      const la = len(run.a), lb = len(run.b), L = Math.max(la, lb) + ((la || lb) && nearShared ? PART : 0);
      for (const [ids, l, sd] of [[run.a, la, -1], [run.b, lb, 1]]) {
        let x = acc + (L - l) / 2;
        for (const i of ids) { const w = UNIT[list[i].k]; off[i] = x + w / 2; side[i] = sd; x += w; }
      }
      acc += L;
      run = { a: [], b: [] };
    };
    list.forEach((d, i) => {
      const c = cordOf(d);
      if (c === 2) {
        flush(true);
        const w = UNIT[d.k] || 0;
        off[i] = acc + w / 2; joins.push(off[i]); acc += w;
        afterShared = true;
      } else (c === 1 ? run.b : run.a).push(i);
    });
    flush(afterShared);
  }
  const mid = acc / 2;
  return { U: acc, off: off.map((o) => o - mid), side, joins: joins.map((j) => j - mid), two };
}
// How far apart the two cords are at a point, from 0 (pressed together) to 1 (fully apart). They meet at each
// shared bead and at the ends (lo, hi), and part over a distance t on either side.
// Toward the ends they come together more gradually (tEnd), the way two cords meet at a knot.
export function cordGap(u, joins, lo, hi, t, tEnd = t) {
  if (u <= lo || u >= hi) return 0;
  let x = Math.min(1, Math.min(u - lo, hi - u) / tEnd);
  for (const j of joins) x = Math.min(x, Math.abs(u - j) / t);
  return x * x * (3 - 2 * x);
}

/* ---------- Trade links: a bracelet written as a short code that fits in a link or QR code ---------- */
// One token per bead, joined with dots. Tokens name beads by kind, never by list position, so adding new beads
// later never changes old links.
//   A to Z, 0 to 9: white letter cubes. x1 x2 x3 x4: ! ? & and the heart. A leading _ makes it a black letter cube.
//   o, then shape (0 cube, 1 round), then look (0 to 4 in LETTER_STYLE_ORDER), then the letter: any other letter
//   bead, for example o10A is a round white A.
//   A type letter plus a color number (0 to b): a colored bead, for example p0 is a hot pink pony bead.
//   - and a name: any other bead, for example -pearl, -lucky13, or -cap:gold.
const TYPE_CODE = { pony: 'p', clay: 'c', round: 'r', crystal: 'y', cube: 'q', smiley: 's', jelly: 'j', metal: 'm', glitter: 'g', glow: 'w',
  matte: 'a', starb: 't', dice: 'd', facet: 'v', seed: 'e', seedg: 'f', seedl: 'l' };
const CODE_TYPE = Object.fromEntries(Object.entries(TYPE_CODE).map(([k, v]) => [v, k]));
const SYMBOL = { '!': 'x1', '?': 'x2', '&': 'x3', [HEART]: 'x4' }, UNSYMBOL = { x1: '!', x2: '?', x3: '&', x4: HEART };
// The nearest strip color for a bead saved with its own hue (older bracelets had a few colors outside the strip).
function nearestColor(d) {
  const s = d.s == null ? 85 : d.s, l = d.l == null ? 55 : d.l;
  let best = 0, bd = 1e9;
  COLORS.forEach((c, i) => {
    const dh = Math.min(Math.abs(c.h - d.h), 360 - Math.abs(c.h - d.h)) * (Math.min(s, c.s) / 100);
    const dist = dh * dh + (c.s - s) * (c.s - s) * 0.3 + (c.l - l) * (c.l - l) * 2;
    if (dist < bd) { bd = dist; best = i; }
  });
  return best;
}
export function encodeBracelet(list) {
  return list.map((d) => encodeOne(d) + (cordOf(d) ? '~' + cordOf(d) : '')).join('.');
}
function encodeOne(d) {
  if (d.k === 'letter') {
    const c = SYMBOL[d.ch] || d.ch;
    if (!d.sh && (!d.st || d.st === 'black') && d.ch !== HEART) return (d.st === 'black' ? '_' : '') + c;
    return 'o' + (d.sh === 'round' ? 1 : 0) + Math.max(0, LETTER_STYLE_ORDER.indexOf(d.st || 'white')) + c;
  }
  if (TYPE_CODE[d.k]) return TYPE_CODE[d.k] + nearestColor(d).toString(16);
  return '-' + d.k + (d.m ? ':' + d.m : '');
}
export function decodeBracelet(code) {
  const out = [];
  for (const tc of String(code || '').split('.').slice(0, 120)) {
    if (!tc) continue;
    // A ~1 or ~2 on the end puts the bead on the bottom cord or on both.
    const [t, cs] = tc.split('~'), at = out.length;
    decodeOne(t, out);
    if (out.length > at && (cs === '1' || cs === '2')) out[at].c = +cs;
  }
  return out;
}
function decodeOne(t, out) {
  if (t[0] === '-') {
    const [k, m] = t.slice(1).split(':');
    if (!UNIT[k] || TYPE_CODE[k] || k === 'letter') return;
    out.push(m && /^(gold|silver|clear|pearl|gunmetal|square)$/.test(m) ? { k, m } : { k });
    return;
  }
  if (/^o[01][0-4]/.test(t)) {
    const ch = UNSYMBOL[t.slice(3)] || t.slice(3);
    if (isLetterChar(ch)) out.push(letterDef(ch, LETTER_STYLE_ORDER[+t[2]], t[1] === '1' ? 'round' : ''));
    return;
  }
  const black = t[0] === '_', body = black ? t.slice(1) : t;
  const ch = UNSYMBOL[body] || body;
  if (/^[A-Z0-9!?&]$/.test(ch)) { out.push(black ? { k: 'letter', ch, st: 'black' } : { k: 'letter', ch }); return; }
  const k = CODE_TYPE[t[0]], i = parseInt(t.slice(1), 16);
  if (k && COLORS[i]) out.push({ k, h: COLORS[i].h, s: COLORS[i].s, l: COLORS[i].l });
}
// Charms that read small on a phone are drawn larger. All hanging charms share roughly one size. Widths in UNIT match.
const BOOST = { mic: 1.35, boot: 1.35, cardigan: 1.35, scarf: 1.35, coupe: 1.35, chair: 1.35, ladder: 1.3, minibead: 1.75, shades: 1.15, note: 1.3, vinyl: 1.25, cassette: 1.22, ticket: 1.22, chihuahua: 1.3, lips: 1.3,
  rock: 1.3, evileye: 1.35, arrowheart: 1.3, cactus: 1.35, teacup: 1.4, rod: 1.3, redwood: 1.3, feather: 1.3, hat: 1.4, discube: 1.4, globe: 1.4 };
const hsl = (h, s, l) => new THREE.Color().setHSL(h / 360, s / 100, l / 100);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Bead plastic in a strip color. Gloss and the room light lift every color toward white, so mid tones are drawn
// deeper and a little richer, so a bead on the string matches its dot on the color strip. Very light and very dark
// colors barely change.
const deep = (h, s, l) => hsl(h, Math.min(100, s * 1.08), l - 13 * Math.sin((Math.PI * l) / 100));
const TAU = Math.PI * 2;

/* ---------- Geometry (built once, at size 1, string axis = x) ---------- */
const geo = {};
function ponyGeo() {
  if (geo.pony) return geo.pony;
  const pts = [], rin = 0.17, rout = 0.5, half = 0.39;
  for (let i = 0; i <= 28; i++) {
    const t = (i / 28) * Math.PI;
    pts.push(new THREE.Vector2(rin + (rout - rin) * Math.pow(Math.sin(t), 0.42), -half * Math.cos(t)));
  }
  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateZ(Math.PI / 2);
  return (geo.pony = g);
}
// A seed bead: a tiny squat donut, about a third the size of a pony bead.
function seedGeo() {
  if (geo.seed) return geo.seed;
  const pts = [], rin = 0.08, rout = 0.25, half = 0.14;
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * Math.PI;
    pts.push(new THREE.Vector2(rin + (rout - rin) * Math.pow(Math.sin(t), 0.5), -half * Math.cos(t)));
  }
  return (geo.seed = new THREE.LatheGeometry(pts, 24).rotateZ(Math.PI / 2));
}
// A small faceted rondelle crystal: two shallow cones, few facets, so it flashes as it turns.
function facetGeo() {
  if (geo.facet) return geo.facet;
  const pts = [[0.06, -0.21], [0.15, -0.21], [0.3, -0.07], [0.3, 0.07], [0.15, 0.21], [0.06, 0.21]].map(([x, y]) => new THREE.Vector2(x, y));
  return (geo.facet = new THREE.LatheGeometry(pts, 12).rotateZ(Math.PI / 2));
}
// The marbled pearl's swirl of lilac, pink, and white.
function marbleTex() {
  if (tex.marble) return tex.marble;
  const t = canvasTex(256, (x, s) => {
    x.fillStyle = '#f6f0fb';
    x.fillRect(0, 0, s, s);
    const cols = ['rgba(176,120,230,0.55)', 'rgba(255,170,215,0.45)', 'rgba(140,110,220,0.45)', 'rgba(255,255,255,0.7)'];
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = cols[i % cols.length];
      x.lineWidth = 6 + Math.random() * 18;
      x.beginPath();
      let px = Math.random() * s, py = Math.random() * s;
      x.moveTo(px, py);
      for (let j = 0; j < 4; j++) { px += (Math.random() - 0.5) * s * 0.7; py += (Math.random() - 0.3) * s * 0.4; x.quadraticCurveTo(px + 30, py - 40, px, py); }
      x.stroke();
    }
  });
  return (tex.marble = t);
}
// Dice pips, one texture per face count, white dots on clear.
function pipTex(n) {
  return (tex['pip' + n] ||= canvasTex(96, (x, s) => {
    const at = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
      5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]], 6: [[0.3, 0.24], [0.3, 0.5], [0.3, 0.76], [0.7, 0.24], [0.7, 0.5], [0.7, 0.76]] }[n];
    x.fillStyle = '#ffffff';
    for (const [u, v] of at) { x.beginPath(); x.arc(u * s, v * s, s * 0.085, 0, TAU); x.fill(); }
  }));
}
// A polymer clay disc (heishi): a thin washer with flat faces and a softly rounded rim.
function clayGeo() {
  if (geo.clay) return geo.clay;
  const pts = [], rin = 0.13, rout = 0.5, half = 0.125;
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI;
    pts.push(new THREE.Vector2(rin + (rout - rin) * Math.pow(Math.sin(t), 0.16), -half * Math.cos(t)));
  }
  const g = new THREE.LatheGeometry(pts, 40);
  g.rotateZ(Math.PI / 2);
  return (geo.clay = g);
}
// A flat daisy spacer: eight round petals around a hole, face-on to the string.
function daisyGeo() {
  if (geo.daisy) return geo.daisy;
  const s = new THREE.Shape(), n = 8;
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * TAU, r = 0.3 + 0.09 * Math.pow(Math.abs(Math.cos((a * n) / 2)), 0.6);
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.09, 0, TAU, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -0.04);
  g.rotateY(Math.PI / 2);
  return (geo.daisy = g);
}
// A bead cap: a shallow scalloped metal cup, open toward +x.
function capGeo() {
  if (geo.cap) return geo.cap;
  const pts = [[0.08, 0], [0.14, 0.01], [0.24, 0.05], [0.32, 0.11], [0.37, 0.18], [0.39, 0.22]].map(V2);
  const g = new THREE.LatheGeometry(pts, 64), p = g.attributes.position;
  // Scallop the rim: petals grow toward the open edge.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), w = y / 0.22;
    const f = 1 + 0.1 * w * w * Math.cos(a * 8);
    p.setXYZ(i, x * f, y - 0.05 * w * w * (1 - Math.cos(a * 8)) * 0.5, z * f);
  }
  g.computeVertexNormals();
  g.translate(0, -0.11, 0);
  g.rotateZ(-Math.PI / 2);
  return (geo.cap = g);
}
// A faceted bicone crystal: two cones point to point, with few sides so the facets catch the light.
function crystalGeo() {
  if (geo.crystal) return geo.crystal;
  const pts = [[0.1, -0.42], [0.16, -0.4], [0.5, -0.03], [0.5, 0.03], [0.16, 0.4], [0.1, 0.42]].map(V2);
  const g = new THREE.LatheGeometry(pts, 10);
  g.rotateZ(Math.PI / 2);
  return (geo.crystal = g);
}
// The smiley's face is a grid bent onto the front of the squashed sphere, so the print hugs the curve.
function smileyFaceGeo() {
  if (geo.smileyFace) return geo.smileyFace;
  const g = new THREE.PlaneGeometry(0.66, 0.66, 16, 16), p = g.attributes.position, R = 0.45, Z = 0.45 * 0.72;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), q = Math.max(0, 1 - (x * x + y * y) / (R * R));
    p.setZ(i, Z * Math.sqrt(q) + 0.004);
  }
  g.computeVertexNormals();
  return (geo.smileyFace = g);
}
function extruded(shape, depth, scale) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 5, curveSegments: 14 });
  g.center();
  g.scale(scale, scale, scale);
  return g;
}
function starGeo() {
  if (geo.star) return geo.star;
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.23 : 0.5, a = Math.PI / 2 + (i * Math.PI) / 5;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return (geo.star = extruded(s, 0.2, 0.88));
}
function heartGeo() {
  if (geo.heart) return geo.heart;
  const s = new THREE.Shape();
  s.moveTo(0, -0.44);
  s.bezierCurveTo(-0.66, -0.02, -0.44, 0.54, 0, 0.2);
  s.bezierCurveTo(0.44, 0.54, 0.66, -0.02, 0, -0.44);
  return (geo.heart = extruded(s, 0.24, 0.9));
}

function moonGeo() {
  if (geo.moon) return geo.moon;
  const s = new THREE.Shape(), a = 0.967, b = 1.37;
  s.absarc(0, 0, 0.5, a, Math.PI * 2 - a, false);
  s.absarc(0.2, 0, 0.42, Math.PI * 2 - b, b, true);
  return (geo.moon = extruded(s, 0.2, 0.86));
}
function snakeGeo() {
  if (geo.snake) return geo.snake;
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, ang = t * 2.2 * Math.PI * 2 + 0.6, r = 0.07 + 0.39 * t;
    pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, 0.05 * Math.sin(t * 9)));
  }
  const curve = new THREE.CatmullRomCurve3(pts), seg = 140, rad = 10;
  const g = new THREE.TubeGeometry(curve, seg, 0.082, rad, false);
  // Taper the tail (at the coil's center) so the body thickens toward the head.
  const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, f = 0.3 + 0.7 * Math.min(1, u * 2.2);
    curve.getPointAt(u, c);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(f).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  g.userData.end = curve.getPointAt(1);
  g.userData.tan = curve.getTangentAt(1);
  return (geo.snake = g);
}
function wingGeo(upper) {
  const key = upper ? 'wingU' : 'wingL';
  if (geo[key]) return geo[key];
  const s = new THREE.Shape();
  if (upper) {
    s.moveTo(0.03, 0.02);
    s.bezierCurveTo(0.12, 0.56, 0.66, 0.6, 0.56, 0.2);
    s.bezierCurveTo(0.52, 0.04, 0.3, 0, 0.03, 0.02);
  } else {
    s.moveTo(0.03, -0.01);
    s.bezierCurveTo(0.32, -0.02, 0.48, -0.16, 0.41, -0.34);
    s.bezierCurveTo(0.33, -0.54, 0.08, -0.42, 0.03, -0.01);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -0.035);
  return (geo[key] = g);
}
function guitarBodyGeo() {
  if (geo.guitar) return geo.guitar;
  const right = [[0.2, -0.75], [0.27, -0.92], [0.2, -1.09], [0.3, -1.2], [0.36, -1.39], [0.25, -1.6]];
  const s = new THREE.Shape();
  s.moveTo(0, -0.71);
  s.splineThru([...right.map(([x, y]) => new THREE.Vector2(x, y)), new THREE.Vector2(0, -1.67),
    ...right.slice().reverse().map(([x, y]) => new THREE.Vector2(-x, y)), new THREE.Vector2(0, -0.71)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -0.06);
  return (geo.guitar = g);
}

// The numerals 1 and 3 as flat shapes. `grow` fattens them to make the outline and border layers.
function thirteenGeo(grow, depth, z, bevel) {
  const D = Math.PI / 180, shapes = [];
  const one = new THREE.Shape(), w = 0.085 + grow, h = 0.4 + grow, r = Math.min(0.05 + grow, w), ox = -0.3;
  one.moveTo(ox - w + r, -h);
  one.lineTo(ox + w - r, -h); one.quadraticCurveTo(ox + w, -h, ox + w, -h + r);
  one.lineTo(ox + w + 0.012, h - r); one.quadraticCurveTo(ox + w + 0.012, h, ox + w - r, h);
  one.lineTo(ox - w + r - 0.012, h - 0.015); one.quadraticCurveTo(ox - w - 0.012, h - 0.015, ox - w - 0.012, h - r);
  one.lineTo(ox - w, -h + r); one.quadraticCurveTo(ox - w, -h, ox - w + r, -h);
  shapes.push(one);
  const arc = (cx, cy, R, rin, a0, a1) => {
    const d = grow / ((R + rin) / 2), s = new THREE.Shape();
    s.absarc(cx, cy, R + grow, (a0 * D) + d, (a1 * D) - d, true);
    s.absarc(cx, cy, Math.max(0.012, rin - grow), (a1 * D) - d, (a0 * D) + d, false);
    return s;
  };
  shapes.push(arc(0.13, 0.2, 0.3, 0.125, 152, -90), arc(0.14, -0.19, 0.32, 0.135, 90, -152));
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 28 });
  g.translate(0.02, 0, z);
  g.scale(1.08, 1.08, 1);
  return g;
}

/* ---------- Textures ---------- */
const tex = {};
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// A flat round letter bead: a coin with softly rounded edges, faces toward the viewer, the hole across its width.
function coinGeo() {
  const r = 0.48, t = 0.2, e = 0.09, pts = [new THREE.Vector2(0, -t)];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; pts.push(new THREE.Vector2(r - e + Math.cos(a) * e, Math.sin(a) * (t))); }
  pts.push(new THREE.Vector2(0, t));
  return new THREE.LatheGeometry(pts, 48).rotateX(Math.PI / 2);
}
function letterTex(ch, fill = '#1c1830', stroke = null) {
  return (tex['L' + ch + fill] ||= canvasTex(160, (x, s) => {
    if (ch === HEART) {
      // A plain pink heart, like the heart beads in a letter bead kit.
      x.fillStyle = '#ff3d9a';
      x.beginPath();
      x.moveTo(s * 0.5, s * 0.78);
      x.bezierCurveTo(s * 0.16, s * 0.56, s * 0.2, s * 0.24, s * 0.37, s * 0.25);
      x.bezierCurveTo(s * 0.45, s * 0.25, s * 0.49, s * 0.31, s * 0.5, s * 0.36);
      x.bezierCurveTo(s * 0.51, s * 0.31, s * 0.55, s * 0.25, s * 0.63, s * 0.25);
      x.bezierCurveTo(s * 0.8, s * 0.24, s * 0.84, s * 0.56, s * 0.5, s * 0.78);
      x.fill();
      return;
    }
    if (fill === 'gold' || fill === 'deepgold') {
      // Gold foil letters: a warm gradient so they read as metal, not yellow paint. On frosted beads the gold is
      // deeper, with a fine dark edge, so it still stands out against the pale bead.
      const deepG = fill === 'deepgold', g = x.createLinearGradient(0, s * 0.2, 0, s * 0.85);
      if (deepG) { g.addColorStop(0, '#f2c94c'); g.addColorStop(0.5, '#c88f12'); g.addColorStop(1, '#8a5c06'); stroke = 'rgba(80, 48, 0, 0.7)'; }
      else { g.addColorStop(0, '#fff0a8'); g.addColorStop(0.45, '#e3b23c'); g.addColorStop(1, '#b07d18'); }
      fill = g;
    }
    x.font = `700 ${s * (ch.length > 1 ? 0.62 : 0.78)}px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineJoin = 'round';
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = s * (typeof fill === 'string' ? 0.07 : 0.035); x.strokeText(ch, s / 2, s * 0.54); }
    x.fillStyle = fill;
    x.fillText(ch, s / 2, s * 0.54);
  }));
}
function scaleTex() {
  if (tex.scales) return tex.scales;
  const t = canvasTex(64, (x, s) => {
    x.fillStyle = '#fff';
    x.fillRect(0, 0, s, s);
    x.strokeStyle = '#000';
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(0, s / 2); x.lineTo(s / 2, 0); x.lineTo(s, s / 2); x.lineTo(s / 2, s); x.closePath();
    x.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 3);
  return (tex.scales = t);
}
function woodTex() {
  if (tex.wood) return tex.wood;
  const t = canvasTex(128, (x, s) => {
    x.fillStyle = '#e09a4a';
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < 46; i++) {
      x.strokeStyle = `rgba(${90 + Math.random() * 60},${40 + Math.random() * 30},10,${0.12 + Math.random() * 0.22})`;
      x.lineWidth = 0.6 + Math.random() * 2;
      const px = Math.random() * s;
      x.beginPath();
      x.moveTo(px, 0);
      x.bezierCurveTo(px + 5, s * 0.3, px - 5, s * 0.7, px + 2, s);
      x.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.6, 1.6);
  return (tex.wood = t);
}
function sparkTex() {
  if (tex.spark) return tex.spark;
  const t = canvasTex(128, (x, s) => {
    x.fillStyle = '#000';
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const v = 120 + Math.random() * 135;
      x.fillStyle = `rgb(${v},${v},${v})`;
      const z = 1 + Math.random() * 2.2;
      x.fillRect(Math.random() * s, Math.random() * s, z, z);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return (tex.spark = t);
}
function smileyTex(ink) {
  return (tex['smile' + ink] ||= canvasTex(128, (x, s) => {
    x.fillStyle = ink;
    x.strokeStyle = ink;
    x.lineCap = 'round';
    x.lineWidth = s * 0.075;
    for (const ex of [0.36, 0.64]) { x.beginPath(); x.ellipse(s * ex, s * 0.38, s * 0.05, s * 0.085, 0, 0, Math.PI * 2); x.fill(); }
    x.beginPath();
    x.arc(s / 2, s * 0.47, s * 0.22, Math.PI * 0.2, Math.PI * 0.8);
    x.stroke();
  }));
}
function haloTex() {
  return (tex.halo ||= canvasTex(128, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
  }));
}

/* ---------- Materials (shared per look) ---------- */
const mats = {};
const animated = [];
const plastic = (color, extra) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, ...extra });
function mat(key, make) {
  return (mats[key] ||= make());
}

export function tickMaterials(t) {
  for (const m of animated) {
    if (m.userData.kind === 'glitter') m.emissiveIntensity = 0.25 + 0.75 * Math.abs(Math.sin(t * 2.4 + m.userData.ph));
    else m.emissiveIntensity = 0.9 + 0.5 * Math.sin(t * 2.2 + m.userData.ph);
  }
}

function mesh(g, m) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true;
  return o;
}


/* ---------- Charm set two: shared helpers ---------- */
const G = (key, make) => (geo[key] ||= make());
const goldMat = () => mat('gold2', () => new THREE.MeshPhysicalMaterial({ color: 0xffc533, metalness: 0.6, roughness: 0.22, clearcoat: 1 }));
const silverMat = () => mat('silver2', () => new THREE.MeshPhysicalMaterial({ color: 0xdfe3ee, metalness: 1, roughness: 0.18 }));
const V2 = (p) => new THREE.Vector2(p[0], p[1]);
function flat(shapes, depth = 0.16, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 18 });
  g.translate(0, 0, -depth / 2);
  return g;
}
function blob(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  s.splineThru([...pts.slice(1), pts[0]].map(V2));
  return s;
}
function poly(pts) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  s.closePath();
  return s;
}
const mirrored = (half) => [...half, ...half.slice().reverse().map(([x, y]) => [-x, y])];
function part(g, m, x = 0, y = 0, z = 0) {
  const o = mesh(g, m);
  o.position.set(x, y, z);
  return o;
}
function tubeOf(pts, r, closed = false, seg = 48) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2] || 0)), closed), seg, r, 10, closed);
}
function knitTex() {
  if (tex.knit) return tex.knit;
  const t = canvasTex(32, (x, s) => {
    x.fillStyle = '#fff';
    x.fillRect(0, 0, s, s);
    x.strokeStyle = '#000';
    x.lineWidth = 3;
    for (const px of [8, 24]) {
      x.beginPath();
      x.moveTo(px - 6, 0); x.lineTo(px, 16); x.lineTo(px - 6, 32);
      x.moveTo(px + 6, 0); x.lineTo(px, 16); x.lineTo(px + 6, 32);
      x.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 9);
  return (tex.knit = t);
}
const knit = (key, color) => mat(key, () => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.92, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff), bumpMap: knitTex(), bumpScale: 1.4,
}));
function photoTex() {
  return (tex.photo ||= canvasTex(128, (x, s) => {
    const g = x.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#7fc8ff'); g.addColorStop(0.55, '#ffc2de'); g.addColorStop(1, '#ffe2a8');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    x.fillStyle = '#fff6c9';
    x.beginPath(); x.arc(s * 0.68, s * 0.42, s * 0.14, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#5b7fd6';
    x.beginPath(); x.moveTo(0, s); x.lineTo(0, s * 0.74);
    x.bezierCurveTo(s * 0.3, s * 0.62, s * 0.6, s * 0.86, s, s * 0.7); x.lineTo(s, s); x.fill();
  }));
}
// Jump ring on the string plus a swinging pivot. Returns the group to build the charm into,
// with its origin at the hang point and the charm extending downward.
function hanger(group) {
  group.add(mesh(G('jump', () => new THREE.TorusGeometry(0.2, 0.05, 12, 32).rotateY(Math.PI / 2)), silverMat()));
  const hang = new THREE.Group();
  hang.position.y = -0.2;
  hang.add(part(G('bail', () => new THREE.TorusGeometry(0.11, 0.034, 10, 24)), silverMat(), 0, -0.12));
  const charm = new THREE.Group();
  charm.position.y = -0.22;
  // Sized so a charm hangs about one to one and a half beads tall.
  charm.scale.setScalar(1.02);
  hang.add(charm);
  group.add(hang);
  group.userData.hang = hang;
  return charm;
}

// A small flat lightning bolt, shared by the teacup and the lightning rod.
const boltGeo = () => G('bolt', () => flat(poly([[0.06, 0.12], [-0.1, -0.04], [0.0, -0.04], [-0.08, -0.22], [0.13, 0.0], [0.03, 0.0], [0.12, 0.12]]), 0.05, 0.015));
const CHARM_BUILDERS = {
  /* ---------- Charm set four, from Shauna's photos ---------- */
  rock(g) {
    // A chunky faceted stone. Each corner is nudged by a value worked out from where it sits, so the flat faces still
    // meet cleanly, and every rock comes out the same.
    const c = hanger(g);
    c.add(part(G('rockCap', () => new THREE.CylinderGeometry(0.05, 0.07, 0.08, 12)), silverMat(), 0, -0.1));
    const stone = mesh(G('rock', () => {
      const geom = new THREE.IcosahedronGeometry(0.36, 1), pos = geom.attributes.position;
      const hash = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 0.78 + 0.36 * hash(+x.toFixed(3), +y.toFixed(3), +z.toFixed(3));
        pos.setXYZ(i, x * k * 1.08, y * k * 0.92, z * k * 0.78);
      }
      geom.computeVertexNormals();
      return geom;
    }), mat('rock', () => new THREE.MeshPhysicalMaterial({ color: 0x34424a, roughness: 0.5, metalness: 0.12, clearcoat: 0.35, clearcoatRoughness: 0.4, flatShading: true, sheen: 0.5, sheenColor: new THREE.Color(0x7d8fb8) })));
    stone.position.y = -0.42;
    stone.rotation.set(0.3, 0.5, 0.2);
    c.add(stone);
  },
  evileye(g) {
    // An almond-shaped gold frame lined with rhinestones, around a purple glitter iris and a faceted crystal pupil.
    const c = hanger(g), h = 0.48, w = 0.3, cy = -0.52;
    const almond = (sc) => {
      const s = new THREE.Shape();
      s.moveTo(0, h * sc); s.quadraticCurveTo(2 * w * sc, 0, 0, -h * sc); s.quadraticCurveTo(-2 * w * sc, 0, 0, h * sc);
      return s;
    };
    const frame = mesh(G('eyeFrame', () => {
      const s = almond(1);
      s.holes.push(almond(0.74));
      return flat(s, 0.07, 0.025);
    }), goldMat());
    frame.position.y = cy;
    c.add(frame);
    const stone = mat('rhinestone', () => new THREE.MeshPhysicalMaterial({
      color: 0xf4f8ff, roughness: 0, metalness: 0.1, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.6, flatShading: true, emissive: 0x30384a,
    }));
    const mid = almond(0.87).getSpacedPoints(26);
    for (let i = 0; i < 26; i++) {
      for (const z of [0.066, -0.066]) {
        const st = part(G('eyeStone', () => new THREE.OctahedronGeometry(0.034, 1)), stone, mid[i].x, cy + mid[i].y, z);
        st.scale.z = 0.6;
        c.add(st);
      }
    }
    const iris = mat('eyeIris', () => {
      const m = new THREE.MeshPhysicalMaterial({
        color: 0x7a2bd6, metalness: 0.45, roughness: 0.35, clearcoat: 1, bumpMap: sparkTex(), bumpScale: 1.2,
        emissive: 0xe0c8ff, emissiveMap: sparkTex(), emissiveIntensity: 0.5,
      });
      m.userData = { kind: 'glitter', ph: 280 };
      animated.push(m);
      return m;
    });
    c.add(part(G('eyeIris', () => new THREE.CylinderGeometry(0.19, 0.19, 0.08, 40).rotateX(Math.PI / 2)), iris, 0, cy));
    c.add(part(G('eyePupil', () => new THREE.CylinderGeometry(0.075, 0.09, 0.1, 8).rotateX(Math.PI / 2)), mat('eyePupil', () => new THREE.MeshPhysicalMaterial({
      color: 0x3d2a6e, roughness: 0, metalness: 0.2, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, flatShading: true, emissive: 0x150a2a,
    })), 0, cy));
  },
  arrowheart(g) {
    // A red glitter puffy heart with a gold arrow through it, feathers at the top where it hangs.
    const c = hanger(g);
    const red = mat('arrowHeart', () => {
      const m = new THREE.MeshPhysicalMaterial({
        color: 0xb5121f, metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, bumpMap: sparkTex(), bumpScale: 0.9,
        emissive: 0xff6a6a, emissiveMap: sparkTex(), emissiveIntensity: 0.45,
      });
      m.userData = { kind: 'glitter', ph: 0 };
      animated.push(m);
      return m;
    });
    const heart = part(heartGeo(), red, 0, -0.62);
    heart.scale.set(0.82, 0.82, 1.7);
    c.add(heart);
    c.add(part(G('arrowShaft', () => new THREE.CylinderGeometry(0.022, 0.022, 0.98, 10)), goldMat(), 0, -0.6));
    c.add(part(G('arrowTip', () => new THREE.ConeGeometry(0.06, 0.15, 14).rotateX(Math.PI)), goldMat(), 0, -1.15));
    for (const sx of [1, -1]) {
      const vane = part(G('arrowVane', () => flat(poly([[0.02, 0], [0.16, 0.06], [0.16, -0.16], [0.02, -0.22]]), 0.02, 0.008)), goldMat(), 0, -0.1);
      vane.scale.x = sx;
      c.add(vane);
    }
  },
  cactus(g) {
    // A glossy little cactus in a terracotta pot, with white tips on its arms and head.
    const c = hanger(g);
    const dots = (tex.cactusDots ||= (() => {
      const t = canvasTex(64, (x, s) => {
        x.fillStyle = '#000'; x.fillRect(0, 0, s, s);
        x.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc((i + (j % 2) * 0.5) * s / 4 + 4, j * s / 4 + 8, 2.4, 0, TAU); x.fill(); }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 2);
      return t;
    })());
    const green = mat('cactus', () => plastic(0x4f9e3a, { roughness: 0.22, clearcoat: 0.8, bumpMap: dots, bumpScale: 2.2 }));
    const tip = mat('cactusTip', () => plastic(0xfaf6ec, { roughness: 0.5 }));
    const head = part(G('cactusHead', () => new THREE.SphereGeometry(0.15, 28, 20)), green, 0, -0.2);
    head.scale.set(1, 0.95, 0.85);
    c.add(head);
    for (const sx of [-1, 1]) c.add(part(G('cactusNub', () => new THREE.SphereGeometry(0.032, 10, 8)), tip, sx * 0.09, -0.07, 0));
    const body = part(G('cactusBody', () => new THREE.CapsuleGeometry(0.13, 0.26, 8, 24)), green, 0, -0.5);
    body.scale.z = 0.85;
    c.add(body);
    for (const sx of [-1, 1]) {
      const arm = mesh(G('cactusArm', () => tubeOf([[0.06, -0.62], [0.2, -0.6], [0.24, -0.5], [0.25, -0.38]], 0.062, false, 24)), green);
      arm.scale.x = sx;
      c.add(arm);
      c.add(part(G('cactusArmEnd', () => new THREE.SphereGeometry(0.062, 16, 12)), green, sx * 0.25, -0.38));
      c.add(part(G('cactusArmTip', () => new THREE.SphereGeometry(0.035, 10, 8)), tip, sx * 0.25, -0.33));
    }
    const clay = mat('pot', () => plastic(0xc4502f, { roughness: 0.55, clearcoat: 0.2 }));
    c.add(part(G('pot', () => new THREE.LatheGeometry([[0, -1.04], [0.15, -1.04], [0.165, -1.02], [0.2, -0.76], [0, -0.76]].map(V2), 32)), clay));
    c.add(part(G('potRim', () => new THREE.CylinderGeometry(0.225, 0.215, 0.09, 32)), clay, 0, -0.73));
    c.add(part(G('potSoil', () => new THREE.CylinderGeometry(0.19, 0.19, 0.02, 24)), mat('soil', () => plastic(0x4a2c1a, { roughness: 0.9, clearcoat: 0 })), 0, -0.68));
  },
  /* ---------- Charm set three: music, keepsakes, and new dangles ---------- */
  note(g) {
    g.add(mesh(G('note', () => {
      const head = new THREE.Shape();
      head.absellipse(-0.13, -0.27, 0.17, 0.12, 0, Math.PI * 2, false, 0.42);
      const stem = poly([[0.0, -0.25], [0.065, -0.22], [0.065, 0.47], [0.0, 0.47]]);
      const flag = blob([[0.06, 0.47], [0.17, 0.36], [0.31, 0.2], [0.3, 0.02], [0.24, 0.12], [0.13, 0.26], [0.06, 0.3]]);
      return flat([head, stem, flag], 0.12, 0.04);
    }), mat('note', () => plastic(0x1a1626, { roughness: 0.16, iridescence: 0.5, iridescenceIOR: 1.6 }))));
  },
  vinyl(g) {
    const grooves = (tex.grooves ||= canvasTex(256, (x, s) => {
      x.fillStyle = '#808080';
      x.fillRect(0, 0, s, s);
      for (let r = 40; r < s / 2; r += 3) {
        x.strokeStyle = r % 2 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)';
        x.lineWidth = 1.2;
        x.beginPath(); x.arc(s / 2, s / 2, r, 0, Math.PI * 2); x.stroke();
      }
    }));
    g.add(mesh(G('vinyl', () => new THREE.CylinderGeometry(0.46, 0.46, 0.05, 56).rotateX(Math.PI / 2)),
      mat('vinyl', () => new THREE.MeshPhysicalMaterial({ color: 0x15121c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2, bumpMap: grooves, bumpScale: 2 }))));
    g.add(mesh(G('vinylLabel', () => new THREE.CylinderGeometry(0.16, 0.16, 0.058, 36).rotateX(Math.PI / 2)), mat('vinylLabel', () => plastic(0xff6fae, { roughness: 0.4 }))));
    g.add(mesh(G('vinylHole', () => new THREE.CylinderGeometry(0.03, 0.03, 0.066, 16).rotateX(Math.PI / 2)), mat('vinylHole', () => plastic(0x15121c))));
  },
  cassette(g) {
    g.add(mesh(G('cassette', () => new RoundedBoxGeometry(0.98, 0.62, 0.16, 3, 0.04)), mat('cassette', () => plastic(0xb9a4ff, { roughness: 0.3 }))));
    const face = new THREE.Mesh(G('cassetteFace', () => new THREE.PlaneGeometry(0.88, 0.54)), mat('cassetteFace', () => new THREE.MeshBasicMaterial({
      transparent: true, toneMapped: false, depthWrite: false,
      map: canvasTex(256, (x, s) => {
        const u = s / 0.88, rr = (px, py, w, h, r) => { x.beginPath(); x.roundRect(px * u, py * u, w * u, h * u, r * u); };
        // Paper label across the top.
        x.fillStyle = '#fff8ee'; rr(0.04, 0.03, 0.8, 0.2, 0.03); x.fill();
        x.fillStyle = '#ff6fae'; x.fillRect(0.08 * u, 0.15 * u, 0.72 * u, 0.025 * u);
        x.fillStyle = '#ffc94a'; x.fillRect(0.08 * u, 0.19 * u, 0.72 * u, 0.02 * u);
        // Window with two reels.
        x.fillStyle = 'rgba(30,22,48,.92)'; rr(0.2, 0.27, 0.48, 0.16, 0.06); x.fill();
        for (const cx of [0.3, 0.58]) {
          x.fillStyle = '#5a3a2a'; x.beginPath(); x.arc(cx * u, 0.35 * u, 0.065 * u, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#fff'; x.beginPath(); x.arc(cx * u, 0.35 * u, 0.032 * u, 0, Math.PI * 2); x.fill();
        }
      }),
    })));
    face.position.z = 0.082;
    const back = face.clone();
    back.position.z = -0.082;
    back.rotation.y = Math.PI;
    g.add(face, back);
  },
  ticket(g) {
    const t = new THREE.Group();
    t.rotation.z = -0.1;
    t.add(mesh(G('ticket', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.5, -0.27); s.lineTo(0.5, -0.27); s.lineTo(0.5, -0.08);
      s.absarc(0.5, 0, 0.08, -Math.PI / 2, Math.PI / 2, true);
      s.lineTo(0.5, 0.27); s.lineTo(-0.5, 0.27); s.lineTo(-0.5, 0.08);
      s.absarc(-0.5, 0, 0.08, Math.PI / 2, -Math.PI / 2, true);
      s.closePath();
      return flat(s, 0.05, 0.015);
    }), mat('ticket', () => plastic(0xffd36b, { roughness: 0.55, clearcoat: 0.3 }))));
    const face = new THREE.Mesh(G('ticketFace', () => new THREE.PlaneGeometry(0.82, 0.46)), mat('ticketFace', () => new THREE.MeshBasicMaterial({
      transparent: true, toneMapped: false, depthWrite: false,
      map: canvasTex(256, (x, s) => {
        const h = s * (0.46 / 0.82), top = (s - h) / 2;
        x.strokeStyle = '#c2401f'; x.lineWidth = 4;
        x.strokeRect(8, top + 8, s - 16, h - 16);
        x.setLineDash([6, 6]); x.beginPath(); x.moveTo(s * 0.74, top + 10); x.lineTo(s * 0.74, top + h - 10); x.stroke(); x.setLineDash([]);
        x.fillStyle = '#c2401f'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = `700 ${Math.round(h * 0.22)}px Fredoka, sans-serif`;
        x.fillText('ADMIT', s * 0.38, top + h * 0.36);
        x.fillText('ONE', s * 0.38, top + h * 0.66);
        x.font = `700 ${Math.round(h * 0.3)}px Fredoka, sans-serif`;
        x.fillText('★', s * 0.87, top + h * 0.52);
      }),
    })));
    face.position.z = 0.043;
    const back = face.clone();
    back.position.z = -0.043;
    back.rotation.y = Math.PI;
    t.add(face, back);
    g.add(t);
  },
  // Die-cut enamel style, like the Lucky 13 charm: flat layers instead of sculpted 3D.
  chihuahua(g) {
    const tan = mat('chiTan', () => plastic(0xd99a5b, { roughness: 0.25 }));
    g.add(mesh(G('chiHead', () => {
      const head = blob([[0, 0.2], [0.22, 0.16], [0.31, -0.02], [0.22, -0.2], [0, -0.29], [-0.22, -0.2], [-0.31, -0.02], [-0.22, 0.16]]);
      const ear = (s) => poly([[s * 0.08, 0.14], [s * 0.46, 0.42], [s * 0.3, -0.02]]);
      return flat([head, ear(1), ear(-1)], 0.14, 0.04);
    }), tan));
    const f = new THREE.Group();
    const pink = mat('chiEar', () => plastic(0xffa8c4, { roughness: 0.3 }));
    for (const s of [-1, 1]) {
      const inner = part(G('chiInner', () => flat(poly([[0.14, 0.13], [0.39, 0.36], [0.28, 0.04]]), 0.03, 0.012)), pink, 0, 0, 0.09);
      inner.scale.x = s;
      f.add(inner);
      f.add(part(G('chiEye', () => new THREE.SphereGeometry(0.068, 16, 12)), mat('chiEye', () => plastic(0x120d18, { roughness: 0.1 })), s * 0.12, 0, 0.1));
      f.add(part(G('chiGlint', () => new THREE.SphereGeometry(0.016, 8, 6)), mat('chiGlint', () => plastic(0xffffff)), s * 0.12 + 0.025, 0.025, 0.16));
    }
    f.add(part(G('chiMuzzle', () => flat(blob([[0, -0.04], [0.13, -0.09], [0.15, -0.18], [0.07, -0.25], [0, -0.26], [-0.07, -0.25], [-0.15, -0.18], [-0.13, -0.09]]), 0.04, 0.015)),
      mat('chiMuzzle', () => plastic(0xf6e2c4, { roughness: 0.3 })), 0, 0, 0.09));
    const nose = part(G('chiNose', () => new THREE.SphereGeometry(0.045, 14, 10)), mat('chiEye', () => plastic(0x120d18, { roughness: 0.1 })), 0, -0.1, 0.13);
    nose.scale.set(1.3, 0.9, 0.8);
    f.add(nose);
    const back = f.clone();
    back.scale.z = -1;
    g.add(f, back);
  },
  lips(g) {
    g.add(mesh(G('lips', () => {
      const upper = blob([[0, 0.07], [0.1, 0.17], [0.24, 0.15], [0.38, 0.06], [0.48, -0.01], [0.3, -0.03], [0.12, -0.02], [0, 0.01],
        [-0.12, -0.02], [-0.3, -0.03], [-0.48, -0.01], [-0.38, 0.06], [-0.24, 0.15], [-0.1, 0.17]]);
      const lower = blob([[0, -0.05], [0.2, -0.055], [0.4, -0.045], [0.46, -0.055], [0.32, -0.18], [0.14, -0.25], [0, -0.26],
        [-0.14, -0.25], [-0.32, -0.18], [-0.46, -0.055], [-0.4, -0.045], [-0.2, -0.055]]);
      return flat([upper, lower], 0.12, 0.05);
    }), mat('lips', () => plastic(0xd10f2f, { roughness: 0.12, clearcoat: 1, sheen: 0.4, sheenColor: new THREE.Color(0xff8090) }))));
  },
  teacup(g) {
    const c = hanger(g), china = mat('china', () => plastic(0xfdfbff, { roughness: 0.2 }));
    // A lightning bolt striking down into the tea.
    const bolt = part(boltGeo(), goldMat(), 0.02, -0.33, 0.02);
    bolt.scale.setScalar(1.35);
    c.add(bolt);
    c.add(mesh(G('cup', () => new THREE.LatheGeometry([[0.3, -0.58], [0.29, -0.66], [0.25, -0.78], [0.17, -0.86], [0, -0.87]].map(V2), 36)),
      mat('chinaDouble', () => plastic(0xfdfbff, { roughness: 0.2, side: THREE.DoubleSide }))));
    c.add(part(G('tea', () => new THREE.CircleGeometry(0.28, 32).rotateX(-Math.PI / 2)), mat('tea', () => plastic(0xa35a26, { roughness: 0.15 })), 0, -0.62));
    c.add(part(G('cupRim', () => new THREE.TorusGeometry(0.3, 0.014, 8, 40).rotateX(Math.PI / 2)), goldMat(), 0, -0.58));
    c.add(part(G('cupHandle', () => new THREE.TorusGeometry(0.08, 0.025, 8, 20)), china, 0.31, -0.7));
    c.add(part(G('saucer', () => new THREE.LatheGeometry([[0, -0.89], [0.3, -0.89], [0.42, -0.86], [0.43, -0.87], [0.3, -0.92], [0, -0.92]].map(V2), 40)), china, 0, 0));
  },
  rod(g) {
    const c = hanger(g);
    c.add(part(G('rodTip', () => new THREE.ConeGeometry(0.045, 0.16, 14)), silverMat(), 0, -0.12));
    c.add(part(G('rodPole', () => new THREE.CylinderGeometry(0.024, 0.024, 0.86, 12)), silverMat(), 0, -0.6));
    c.add(part(G('rodBall', () => new THREE.SphereGeometry(0.1, 24, 16)), mat('rodBall', () => new THREE.MeshPhysicalMaterial({
      color: 0x6fc8ff, transparent: true, opacity: 0.6, roughness: 0.02, clearcoat: 1, metalness: 0.1,
    })), 0, -0.46));
    c.add(part(G('rodBase', () => new RoundedBoxGeometry(0.22, 0.07, 0.12, 2, 0.02)), silverMat(), 0, -1.04));
    const bolt = part(boltGeo(), goldMat(), 0.24, -0.02, 0.03);
    bolt.rotation.z = 0.5;
    c.add(bolt);
  },
  redwood(g) {
    const c = hanger(g);
    // Tall and narrow, with a long red trunk below the crown.
    const tiers = [[0.08, 0.2, -0.16, 0x2d7a52], [0.12, 0.22, -0.28, 0x2a7350], [0.15, 0.24, -0.41, 0x24694a], [0.17, 0.24, -0.54, 0x1f5b3a], [0.18, 0.22, -0.66, 0x1a4f32]];
    for (const [r, h, y, col] of tiers) c.add(part(G('rwCone' + r, () => new THREE.ConeGeometry(r, h, 18)), mat('rw' + col, () => plastic(col, { roughness: 0.35 })), 0, y));
    c.add(part(G('rwTrunk', () => new THREE.CylinderGeometry(0.05, 0.085, 0.5, 14)), mat('rwTrunk', () => plastic(0xa8432a, { roughness: 0.45 })), 0, -0.98));
  },
  feather(g) {
    const c = hanger(g);
    // A showgirl plume: a curved quill with soft strands fanning out from it, fuller toward the tip.
    const spineAt = (t) => [0.16 * t * t, -0.05 - t * 1.0];
    const spine = [];
    for (let i = 0; i <= 12; i++) spine.push([...spineAt(i / 12), 0]);
    c.add(mesh(G('quill', () => tubeOf(spine, 0.013, false, 30)), mat('quill', () => plastic(0xfff1dc, { roughness: 0.4 }))));
    const deep = mat('plumeDeep', () => new THREE.MeshPhysicalMaterial({ color: 0xff5f0f, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffc890) }));
    const light = mat('plumeLight', () => new THREE.MeshPhysicalMaterial({ color: 0xff9a3a, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffe0b8) }));
    const strands = G('plumeStrands', () => {
      const parts = [];
      for (let i = 0; i < 26; i++) {
        const t = 0.04 + (i / 25) * 0.92, [sx, sy] = spineAt(t);
        const len = 0.12 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.15));
        for (const side of [-1, 1]) {
          const curl = side * (0.5 + 0.4 * t);
          const pts = [[sx, sy, 0], [sx + side * len * 0.5, sy - len * 0.25, (i % 3 - 1) * 0.03],
            [sx + side * len * 0.85, sy - len * 0.6, (i % 2 ? 0.04 : -0.04)], [sx + side * len * 0.8 + curl * 0.05, sy - len * 0.95, 0]];
          parts.push({ geo: tubeOf(pts, 0.016 - t * 0.006, false, 12), light: i % 2 === 0 });
        }
      }
      return parts;
    });
    for (const st of strands) c.add(mesh(st.geo, st.light ? light : deep));
    // A soft filled plume behind the strands gives it body.
    const vane = G('plumeVane', () => {
      const right = [], left = [];
      for (let i = 0; i <= 30; i++) {
        const t = i / 30, [sx, sy] = spineAt(t), w = (0.1 + 0.27 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * (i % 2 ? 0.9 : 1);
        right.push([sx + w * 0.95, sy - w * 0.5]); left.push([sx - w * 0.95, sy - w * 0.5]);
      }
      return flat(poly([[0, -0.05], ...right, ...left.reverse()]), 0.02, 0.02);
    });
    c.add(part(vane, mat('plumeVane', () => new THREE.MeshPhysicalMaterial({ color: 0xff7a24, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xffd0a0), side: THREE.DoubleSide })), 0, 0, -0.03));
  },
  hat(g) {
    const c = hanger(g), felt = mat('hatFelt', () => new THREE.MeshPhysicalMaterial({ color: 0xf27bb7, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffd0ea), side: THREE.DoubleSide }));
    const h = new THREE.Group();
    h.rotation.x = 0.22;
    // Crown: an oval with a crease along the top.
    h.add(mesh(G('hatCrown2', () => {
      const geom = new THREE.LatheGeometry([[0, -0.08], [0.1, -0.07], [0.17, -0.1], [0.21, -0.22], [0.23, -0.42], [0, -0.42]].map(V2), 36);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (y > -0.16) pos.setY(i, y - 0.06 * Math.max(0, 1 - Math.abs(x) / 0.16));
        pos.setZ(i, z * 0.82);
      }
      geom.computeVertexNormals();
      return geom;
    }), felt));
    // Brim: curled up hard at the sides, dipping slightly front and back.
    h.add(mesh(G('hatBrim2', () => {
      const geom = new THREE.LatheGeometry([[0.22, -0.41], [0.4, -0.43], [0.56, -0.42], [0.58, -0.43], [0.4, -0.46], [0.22, -0.45]].map(V2), 64);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), side = Math.abs(x) / Math.max(r, 1e-6);
        const out = Math.max(0, (r - 0.24) / 0.34);
        pos.setY(i, pos.getY(i) + 0.26 * Math.pow(side, 3) * out * out - 0.03 * (1 - side) * out);
        pos.setZ(i, z * 0.78);
      }
      geom.computeVertexNormals();
      return geom;
    }), felt));
    h.add(part(G('hatBand2', () => new THREE.TorusGeometry(1, 0.1, 8, 40).rotateX(Math.PI / 2).scale(0.23, 0.22, 0.19)), goldMat(), 0, -0.39));
    const star = part(starGeo(), goldMat(), 0, -0.37, 0.19);
    star.scale.setScalar(0.12);
    h.add(star);
    c.add(h);
  },
  discube(g) {
    const c = hanger(g);
    const tiles = (tex.tiles ||= canvasTex(128, (x, s) => {
      x.fillStyle = '#8a8a96'; x.fillRect(0, 0, s, s);
      const n = 6, w = s / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = 225 + Math.floor(Math.random() * 30);
        x.fillStyle = `rgb(${v},${v},${v + 5})`;
        x.fillRect(i * w + 1.5, j * w + 1.5, w - 3, w - 3);
      }
    }));
    const cube = part(G('discube', () => new THREE.BoxGeometry(0.54, 0.54, 0.54)), mat('discube', () => new THREE.MeshPhysicalMaterial({
      color: 0xffffff, map: tiles, metalness: 0.7, roughness: 0.1, envMapIntensity: 2, emissive: 0xffffff, emissiveMap: tiles, emissiveIntensity: 0.35,
    })), 0, -0.56);
    cube.rotation.set(0.5, 0.65, 0.2);
    c.add(cube);
  },
  shades(g) {
    // Heart-shaped sunglasses: pink frames, tinted lenses, a little bridge.
    const frame = mat('shadeFrame', () => plastic(0xff7fae, { roughness: 0.2 }));
    const lens = mat('shadeLens', () => new THREE.MeshPhysicalMaterial({ color: 0xffb6d2, transparent: true, opacity: 0.72, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide }));
    const heart = (sc) => {
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const t = (i / 48) * Math.PI * 2;
        pts.push([(16 * Math.sin(t) ** 3) / 34 * sc, ((13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 34) * sc]);
      }
      return pts;
    };
    for (const sx of [-1, 1]) {
      const side = new THREE.Group();
      side.position.set(sx * 0.33, 0, 0);
      side.rotation.z = sx * 0.12;
      side.add(mesh(G('shadeRim', () => tubeOf(heart(0.74), 0.05, true, 96)), frame));
      const shape = new THREE.Shape();
      heart(0.74).forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      side.add(mesh(G('shadeGlass', () => new THREE.ShapeGeometry(shape, 24)), lens));
      g.add(side);
    }
    g.add(part(G('shadeBridge', () => tubeOf([[-0.1, 0.14], [0, 0.2], [0.1, 0.14]], 0.04, false, 16)), frame));
  },
  minibead(g) {
    // A tiny friendship bracelet: a ring of pastel pony beads with two letter cubes, hanging from the jump ring.
    const c = hanger(g), ring = new THREE.Group();
    ring.position.y = -0.48;
    ring.rotation.x = 0.25;
    const cols = [0xff8cc6, 0xffd36b, 0x8fe3c8, 0x9fc4ff, 0xc9a6ff];
    const N = 14, R = 0.34;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + Math.PI / 2;
      const isLetter = i === 6 || i === 8;
      const b = isLetter
        ? part(G('miniCube', () => new RoundedBoxGeometry(0.14, 0.14, 0.11, 2, 0.03)), mat('miniCube', () => plastic(0xfbf9ff, { roughness: 0.28 })))
        : part(G('miniPony', () => new THREE.CylinderGeometry(0.085, 0.085, 0.13, 16).rotateZ(Math.PI / 2)), mat('mini' + (i % 5), () => plastic(cols[i % 5])));
      b.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      b.rotation.z = a + Math.PI / 2;
      ring.add(b);
    }
    ring.add(mesh(G('miniCord', () => new THREE.TorusGeometry(R, 0.012, 6, 48)), mat('miniCord', () => plastic(0xe6ddf2, { roughness: 0.6 }))));
    c.add(ring);
  },
  globe(g) {
    const c = hanger(g);
    c.add(part(G('globeCap', () => new THREE.CylinderGeometry(0.05, 0.06, 0.06, 14)), goldMat(), 0, -0.15));
    c.add(part(G('globeBase', () => new THREE.CylinderGeometry(0.24, 0.3, 0.16, 32)), mat('globeBase', () => plastic(0x6b3fa0, { roughness: 0.3 })), 0, -0.92));
    c.add(part(G('globeTrim', () => new THREE.TorusGeometry(0.245, 0.018, 8, 36).rotateX(Math.PI / 2)), goldMat(), 0, -0.84));
    const snow = mat('snow', () => plastic(0xffffff, { roughness: 0.5 }));
    const ground = part(G('globeGround', () => new THREE.SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), snow, 0, -0.74);
    ground.scale.y = 0.35;
    c.add(ground);
    c.add(part(G('globeTree', () => new THREE.ConeGeometry(0.1, 0.26, 16)), mat('rw0x2d7a52', () => plastic(0x2d7a52, { roughness: 0.35 })), 0, -0.6));
    let sd = 3;
    for (let i = 0; i < 16; i++) {
      sd = (sd * 16807) % 2147483647; const a = (sd / 2147483647) * Math.PI * 2;
      sd = (sd * 16807) % 2147483647; const r = 0.08 + (sd / 2147483647) * 0.17;
      sd = (sd * 16807) % 2147483647; const y = -0.36 - (sd / 2147483647) * 0.3;
      c.add(part(G('flake', () => new THREE.SphereGeometry(0.014, 6, 5)), snow, Math.cos(a) * r, y, Math.sin(a) * r));
    }
    c.add(part(G('globeGlass', () => new THREE.SphereGeometry(0.32, 36, 24)), mat('globeGlass', () => new THREE.MeshPhysicalMaterial({
      color: 0xdff2ff, transparent: true, opacity: 0.13, roughness: 0.02, clearcoat: 1, depthWrite: false, envMapIntensity: 0.6,
    })), 0, -0.52));
  },
  pheart(g) {
    g.add(mesh(heartGeo(), mat('pheart', () => plastic(0xc9b2ff, { iridescence: 1, iridescenceIOR: 1.5, sheen: 1, sheenColor: new THREE.Color(0xffc8e8) }))));
  },
  sparkle(g) {
    g.add(mesh(G('sparkle', () => {
      const s = new THREE.Shape(), a = 0.52, c = 0.075;
      s.moveTo(0, a);
      s.quadraticCurveTo(c, c, a, 0); s.quadraticCurveTo(c, -c, 0, -a);
      s.quadraticCurveTo(-c, -c, -a, 0); s.quadraticCurveTo(-c, c, 0, a);
      return flat(s, 0.12, 0.05);
    }), mat('sparkle', () => new THREE.MeshPhysicalMaterial({ color: 0xf4f6ff, metalness: 0.9, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.8 }))));
  },
  jewel(g) {
    const m = mat('jewel', () => new THREE.MeshPhysicalMaterial({
      color: 0xe2208c, metalness: 0.35, roughness: 0.04, flatShading: true, clearcoat: 1, iridescence: 1, iridescenceIOR: 2, emissive: 0x3a0020,
    }));
    const gem = new THREE.Group();
    gem.add(part(G('gemTop', () => new THREE.CylinderGeometry(0.27, 0.46, 0.2, 8)), m, 0, 0.19));
    gem.add(part(G('gemBot', () => new THREE.ConeGeometry(0.46, 0.54, 8).rotateX(Math.PI)), m, 0, -0.18));
    g.add(gem);
    g.userData.spin = gem;
  },
  gull(g) {
    g.add(mesh(G('gull', () => flat(blob([[0, 0.02], [0.18, 0.2], [0.42, 0.25], [0.57, 0.12], [0.4, 0.13], [0.2, 0.05], [0.06, -0.12], [0, -0.17], [-0.06, -0.12], [-0.2, 0.05], [-0.4, 0.13], [-0.57, 0.12], [-0.42, 0.25], [-0.18, 0.2]]), 0.1, 0.04)),
      mat('gull', () => plastic(0xffffff, { iridescence: 0.8, iridescenceIOR: 1.4, roughness: 0.18 }))));
  },
  rainbow(g) {
    const bands = [[0.44, 0xff5fa8], [0.345, 0xffc94a], [0.25, 0x4fd6a0], [0.155, 0x5aa9ff]];
    for (const [r, c] of bands) g.add(part(G('bow' + r, () => new THREE.TorusGeometry(r, 0.052, 10, 30, Math.PI)), mat('bow' + c, () => plastic(c)), 0, -0.17));
    for (const sx of [-1, 1]) {
      const cloud = part(G('cloud', () => new THREE.SphereGeometry(0.15, 20, 14)), mat('cloud', () => plastic(0xffffff, { roughness: 0.35 })), sx * 0.3, -0.19, 0.02);
      cloud.scale.set(1.25, 0.8, 0.8);
      g.add(cloud);
    }
  },
  leaf(g) {
    g.add(mesh(G('leaf', () => flat(poly(mirrored([[0, 0.52], [0.08, 0.3], [0.22, 0.38], [0.2, 0.2], [0.42, 0.26], [0.34, 0.08], [0.52, 0], [0.3, -0.1], [0.34, -0.26], [0.12, -0.2], [0.035, -0.3], [0.03, -0.5]])), 0.08, 0.035)),
      mat('leaf', () => new THREE.MeshPhysicalMaterial({ color: 0xd9531a, metalness: 0.5, roughness: 0.28, clearcoat: 1, iridescence: 0.35 }))));
  },
  tree(g) {
    const tiers = [[0.42, 0.42, -0.11, 0x1c7a4b], [0.34, 0.38, 0.11, 0x2f9a63], [0.24, 0.34, 0.33, 0x86cfa0]];
    for (const [r, h, y, c] of tiers) g.add(part(G('cone' + r, () => new THREE.ConeGeometry(r, h, 24)), mat('tree' + c, () => plastic(c, { roughness: 0.3 })), 0, y));
    g.add(part(G('trunk', () => new THREE.CylinderGeometry(0.07, 0.08, 0.18, 14)), mat('trunk', () => plastic(0x7a4a22)), 0, -0.4));
    g.add(part(G('topper', () => new THREE.SphereGeometry(0.05, 12, 10)), goldMat(), 0, 0.52));
  },
  clock(g) {
    g.add(mesh(G('clockFace', () => new THREE.CylinderGeometry(0.42, 0.42, 0.16, 44).rotateX(Math.PI / 2)), mat('clockFace', () => plastic(0x141d4d))));
    g.add(mesh(G('clockRim', () => new THREE.TorusGeometry(0.42, 0.055, 12, 44)), goldMat()));
    const f = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const dot = part(G('tickDot', () => new THREE.SphereGeometry(0.02, 8, 6)), goldMat(), Math.sin(a) * 0.32, Math.cos(a) * 0.32, 0.085);
      if (i % 3 === 0) dot.scale.setScalar(1.7);
      f.add(dot);
    }
    // Both hands point straight up: midnight.
    f.add(part(G('handM', () => new THREE.BoxGeometry(0.03, 0.3, 0.02)), goldMat(), 0, 0.13, 0.095));
    f.add(part(G('handH', () => new THREE.BoxGeometry(0.055, 0.19, 0.02)), goldMat(), 0, 0.08, 0.105));
    f.add(part(G('handHub', () => new THREE.SphereGeometry(0.045, 12, 10)), goldMat(), 0, 0, 0.1));
    const back = f.clone();
    back.scale.z = -1;
    g.add(f, back);
  },
  photo(g) {
    g.add(mesh(G('photoFrame', () => new RoundedBoxGeometry(0.8, 0.94, 0.1, 3, 0.04)), mat('photoFrame', () => plastic(0xffffff, { roughness: 0.4 }))));
    const pic = new THREE.Mesh(G('photoPic', () => new THREE.PlaneGeometry(0.64, 0.62)), mat('photoPic', () => new THREE.MeshBasicMaterial({ map: photoTex(), toneMapped: false })));
    pic.position.set(0, 0.08, 0.052);
    const picBack = pic.clone();
    picBack.position.z = -0.052;
    picBack.rotation.y = Math.PI;
    g.add(pic, picBack);
  },
  cat(g) {
    const fur = mat('cat', () => plastic(0x17131f, { roughness: 0.26, iridescence: 0.6, iridescenceIOR: 1.6 }));
    const c = new THREE.Group();
    c.position.x = -0.07;
    c.add(mesh(G('cat', () => {
      const head = new THREE.Shape();
      head.absarc(0, 0.22, 0.2, 0, Math.PI * 2, false);
      const body = blob([[0, 0.1], [0.2, 0.02], [0.27, -0.25], [0.24, -0.46], [0, -0.5], [-0.24, -0.46], [-0.27, -0.25], [-0.2, 0.02]]);
      const ear = (s) => poly([[s * 0.19, 0.28], [s * 0.17, 0.52], [s * 0.03, 0.38]]);
      return flat([body, head, ear(1), ear(-1)], 0.18, 0.05);
    }), fur));
    c.add(mesh(G('catTail', () => tubeOf([[0.2, -0.44], [0.4, -0.42], [0.5, -0.24], [0.42, -0.06]], 0.045)), fur));
    const eye = mat('catEye', () => new THREE.MeshStandardMaterial({ color: 0xc8ff5a, emissive: 0x9be000, emissiveIntensity: 0.9, roughness: 0.2 }));
    for (const s of [-1, 1]) c.add(part(G('catEyeG', () => new THREE.SphereGeometry(0.036, 12, 10)), eye, s * 0.085, 0.25, 0.135));
    c.add(part(G('catNose', () => new THREE.SphereGeometry(0.02, 10, 8)), mat('catNose', () => plastic(0xff8fb8)), 0, 0.18, 0.145));
    g.add(c);
  },
  wheart(g) {
    g.add(part(G('wheart', () => {
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        pts.push([(16 * Math.sin(t) ** 3) / 34, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 34]);
      }
      return tubeOf(pts, 0.042, true, 96);
    }), goldMat(), 0, 0.05));
  },
  arrow(g) {
    const a = new THREE.Group(), arc = Math.PI * 0.86;
    a.position.x = -0.06;
    a.add(mesh(G('bowArc', () => new THREE.TorusGeometry(0.42, 0.036, 10, 36, arc).rotateZ(-arc / 2)), goldMat()));
    a.add(part(G('bowString', () => new THREE.CylinderGeometry(0.012, 0.012, 2 * 0.42 * Math.sin(arc / 2), 6)), silverMat(), 0.42 * Math.cos(arc / 2), 0));
    a.add(part(G('shaft', () => new THREE.CylinderGeometry(0.024, 0.024, 1.1, 10).rotateZ(Math.PI / 2)), goldMat(), 0.08, 0));
    a.add(part(G('arrowHead', () => new THREE.ConeGeometry(0.075, 0.18, 4).rotateZ(-Math.PI / 2)), goldMat(), 0.7, 0));
    const feather = mat('feather', () => plastic(0xff5fa8));
    for (const s of [-1, 1]) {
      const f = part(G('feather', () => new THREE.BoxGeometry(0.16, 0.09, 0.02)), feather, -0.42, s * 0.05);
      f.rotation.z = s * -0.5;
      a.add(f);
    }
    g.add(a);
  },

  /* ----- Hanging charms ----- */
  mic(g) {
    const c = hanger(g);
    c.add(part(G('micHead', () => new THREE.IcosahedronGeometry(0.21, 2)), mat('mirror', () => new THREE.MeshPhysicalMaterial({ color: 0xeef1fa, metalness: 1, roughness: 0.04, flatShading: true })), 0, -0.2));
    c.add(part(G('micBand', () => new THREE.TorusGeometry(0.13, 0.035, 10, 24).rotateX(Math.PI / 2)), goldMat(), 0, -0.41));
    c.add(part(G('micHandle', () => new THREE.CylinderGeometry(0.12, 0.085, 0.62, 24)), mat('micHandle', () => {
      const m = new THREE.MeshPhysicalMaterial({
        color: hsl(325, 85, 52), metalness: 0.75, roughness: 0.36, clearcoat: 1,
        bumpMap: sparkTex(), bumpScale: 1.2, emissive: 0xffffff, emissiveMap: sparkTex(), emissiveIntensity: 0.6,
      });
      m.userData = { kind: 'glitter', ph: 2 };
      animated.push(m);
      return m;
    }), 0, -0.74));
    c.add(part(G('micCap', () => new THREE.SphereGeometry(0.085, 14, 10)), goldMat(), 0, -1.05));
  },
  chair(g) {
    const c = hanger(g), wood = mat('chairWood', () => plastic(0xffffff, { map: woodTex(), roughness: 0.3 }));
    const ch = new THREE.Group();
    ch.rotation.y = 0.6;
    ch.add(part(G('chSeat', () => new RoundedBoxGeometry(0.5, 0.07, 0.46, 2, 0.02)), wood, 0, -0.62));
    for (const x of [-0.2, 0.2]) {
      for (const z of [-0.18, 0.18]) ch.add(part(G('chLeg', () => new THREE.CylinderGeometry(0.035, 0.03, 0.5, 10)), wood, x, -0.9, z));
      ch.add(part(G('chPost', () => new THREE.CylinderGeometry(0.035, 0.035, 0.58, 10)), wood, x, -0.33, -0.18));
    }
    for (const y of [-0.12, -0.32]) ch.add(part(G('chSlat', () => new RoundedBoxGeometry(0.42, 0.1, 0.04, 2, 0.015)), wood, 0, y, -0.18));
    c.add(ch);
  },
  ladder(g) {
    const c = hanger(g), l = new THREE.Group();
    l.rotation.y = 0.4;
    for (const x of [-0.17, 0.17]) l.add(part(G('ladRail', () => new RoundedBoxGeometry(0.06, 1.12, 0.06, 2, 0.02)), goldMat(), x, -0.6));
    for (let i = 0; i < 5; i++) l.add(part(G('ladRung', () => new THREE.CylinderGeometry(0.026, 0.026, 0.34, 8).rotateZ(Math.PI / 2)), goldMat(), 0, -0.18 - i * 0.21));
    c.add(l);
  },
  cardigan(g) {
    const c = hanger(g), wool = knit('cardigan', 0xf5e8d2), trim = knit('cardiganTrim', 0xdcc7a2);
    c.add(mesh(G('cardigan', () => flat(poly([[0, -0.3], ...[[0.1, -0.02], [0.2, -0.02], [0.34, -0.1], [0.52, -0.72], [0.4, -0.78], [0.3, -0.38], [0.3, -0.92]],
      ...[[0.1, -0.02], [0.2, -0.02], [0.34, -0.1], [0.52, -0.72], [0.4, -0.78], [0.3, -0.38], [0.3, -0.92]].reverse().map(([x, y]) => [-x, y])]), 0.12, 0.05)), wool));
    c.add(part(G('cardPlacket', () => new THREE.BoxGeometry(0.075, 0.62, 0.03)), trim, 0, -0.63, 0.105));
    c.add(part(G('cardHem', () => new RoundedBoxGeometry(0.66, 0.09, 0.24, 2, 0.03)), trim, 0, -0.93));
    for (const y of [-0.42, -0.6, -0.78]) c.add(part(G('cardBtn', () => new THREE.SphereGeometry(0.032, 10, 8)), mat('cardBtn', () => plastic(0x5b3a1c)), 0, y, 0.125));
  },
  scarf(g) {
    // A knit scarf folded over the ring: two long ends of different lengths, with fringe.
    const c = hanger(g), wool = knit('scarf', 0xcf1730);
    c.add(part(G('scarfFold', () => new THREE.CylinderGeometry(0.075, 0.075, 0.3, 18).rotateZ(Math.PI / 2)), wool, 0, -0.12));
    for (const [x, len, z, rot] of [[-0.06, 0.84, 0.05, 0.16], [0.07, 0.7, -0.05, -0.26]]) {
      const end = new THREE.Group();
      end.position.set(x, -0.12, z);
      end.rotation.z = rot;
      end.add(part(G('scarfEnd' + len, () => new RoundedBoxGeometry(0.24, len, 0.07, 2, 0.025)), wool, 0, -len / 2));
      for (let i = 0; i < 5; i++) end.add(part(G('scarfFringe', () => new THREE.CylinderGeometry(0.012, 0.012, 0.11, 6)), wool, -0.088 + i * 0.044, -len - 0.05));
      c.add(end);
    }
  },
  boot(g) {
    const c = hanger(g), b = new THREE.Group(), dark = mat('bootSole', () => plastic(0x2b170c, { roughness: 0.4 }));
    b.position.x = -0.08;
    b.add(mesh(G('boot', () => flat(poly([[-0.2, 0], [-0.05, -0.06], [0.1, 0], [0.1, -0.52], [0.22, -0.64], [0.42, -0.72], [0.48, -0.82], [0.46, -0.87], [-0.2, -0.87]]), 0.16, 0.045)),
      mat('boot', () => plastic(0xb8632c, { roughness: 0.3 }))));
    b.add(part(G('bootSole', () => new RoundedBoxGeometry(0.76, 0.06, 0.27, 2, 0.02)), dark, 0.13, -0.92));
    b.add(part(G('bootHeel', () => new RoundedBoxGeometry(0.22, 0.12, 0.25, 2, 0.02)), dark, -0.13, -1.0));
    const deco = new THREE.Group();
    deco.add(mesh(G('bootStitch', () => tubeOf([[-0.18, -0.2, 0.128], [-0.05, -0.31, 0.128], [0.08, -0.2, 0.128]], 0.014, false, 20)), goldMat()));
    deco.add(mesh(G('bootStitch2', () => tubeOf([[0.04, -0.62, 0.128], [0.2, -0.7, 0.128], [0.4, -0.78, 0.128]], 0.012, false, 16)), goldMat()));
    const star = part(starGeo(), goldMat(), -0.05, -0.46, 0.12);
    star.scale.setScalar(0.2);
    deco.add(star);
    const decoBack = deco.clone();
    decoBack.scale.z = -1;
    b.add(deco, decoBack);
    c.add(b);
  },
  coupe(g) {
    const c = hanger(g);
    const glass = mat('glass', () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, roughness: 0.02, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
    c.add(mesh(G('coupe', () => new THREE.LatheGeometry([[0.36, -0.02], [0.34, -0.12], [0.24, -0.22], [0.08, -0.28], [0.035, -0.32], [0.03, -0.7], [0.06, -0.74], [0.26, -0.78], [0.26, -0.8], [0, -0.8]].map(V2), 40)), glass));
    c.add(mesh(G('fizz', () => new THREE.LatheGeometry([[0, -0.27], [0.07, -0.27], [0.22, -0.21], [0.3, -0.11], [0, -0.11]].map(V2), 40)),
      mat('fizz', () => new THREE.MeshPhysicalMaterial({ color: 0xffd27a, transparent: true, opacity: 0.88, roughness: 0.1, emissive: 0x6b4a00, emissiveIntensity: 0.5 }))));
    c.add(part(G('coupeRim', () => new THREE.TorusGeometry(0.36, 0.016, 8, 44).rotateX(Math.PI / 2)), goldMat(), 0, -0.02));
    c.add(part(G('coupeFoot', () => new THREE.TorusGeometry(0.26, 0.014, 8, 36).rotateX(Math.PI / 2)), goldMat(), 0, -0.79));
    for (const [x, y, z] of [[0.08, -0.07, 0.05], [-0.12, -0.04, -0.03], [0.16, 0.0, -0.06], [-0.03, 0.03, 0.08]]) {
      c.add(part(G('bubble', () => new THREE.SphereGeometry(0.03, 10, 8)), mat('bubble', () => plastic(0xfff3cf)), x, y, z));
    }
  },
};

/* ---------- Factory ---------- */
export function makeBead(d) {
  // Which cord a bead is on does not change how it looks.
  if (d.c != null) { d = { ...d }; delete d.c; }
  const group = new THREE.Group();
  if (CHARM_BUILDERS[d.k]) {
    const boost = BOOST[d.k] || 1;
    if (DANGLE.has(d.k) || boost === 1) {
      CHARM_BUILDERS[d.k](group);
      // Hanging charms grow from their hang point, so the ring stays the same size.
      if (boost !== 1) group.userData.hang.children.forEach((c) => { if (c.type === 'Group') c.scale.multiplyScalar(boost); });
    } else {
      const inner = new THREE.Group();
      CHARM_BUILDERS[d.k](inner);
      inner.scale.setScalar(boost);
      group.add(inner);
    }
    return group;
  }
  switch (d.k) {
    case 'pony':
      group.add(mesh(ponyGeo(), mat(defKey(d), () => plastic(deep(d.h, d.s, d.l)))));
      break;
    case 'ball':
      group.add(mesh((geo.ball ||= new THREE.SphereGeometry(0.22, 24, 16)), goldMat()));
      break;
    case 'daisy':
      group.add(mesh(daisyGeo(), silverMat()));
      break;
    case 'rondelle': {
      group.add(mesh((geo.rondelle ||= new THREE.TorusGeometry(0.26, 0.11, 14, 36).rotateY(Math.PI / 2)), silverMat()));
      const stone = mat('rhinestone', () => new THREE.MeshPhysicalMaterial({
        color: 0xf4f8ff, roughness: 0, metalness: 0.1, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.6, flatShading: true, emissive: 0x30384a,
      }));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU, st = mesh((geo.stone ||= new THREE.OctahedronGeometry(0.075, 0)), stone);
        st.position.set(0, Math.cos(a) * 0.36, Math.sin(a) * 0.36);
        st.rotation.x = a;
        group.add(st);
      }
      break;
    }
    case 'cap': {
      // The cup sits in its own group so the strand can turn it to face a neighboring bead.
      const cup = new THREE.Group();
      cup.add(mesh(capGeo(), mat('cap' + d.m, () => new THREE.MeshPhysicalMaterial({
        color: d.m === 'gold' ? 0xffc533 : 0xdfe3ee, metalness: d.m === 'gold' ? 0.75 : 1, roughness: 0.2, clearcoat: 0.6, side: THREE.DoubleSide,
      }))));
      group.add(cup);
      group.userData.cup = cup;
      break;
    }
    case 'spacer':
      group.add(mesh(
        (geo.spacer ||= new THREE.TorusGeometry(0.2, 0.13, 16, 32).rotateY(Math.PI / 2)),
        mat('spacer', () => new THREE.MeshPhysicalMaterial({ color: 0xdfe3ee, metalness: 1, roughness: 0.18 }))));
      break;
    case 'clay':
      group.add(mesh(clayGeo(), mat(defKey(d), () => new THREE.MeshStandardMaterial({ color: deep(d.h, d.s * 0.92, d.l), roughness: 0.78 }))));
      break;
    case 'round':
      group.add(mesh((geo.round ||= new THREE.SphereGeometry(0.43, 36, 24)), mat(defKey(d), () => plastic(deep(d.h, d.s, d.l)))));
      break;
    case 'cube':
      group.add(mesh((geo.solidCube ||= new RoundedBoxGeometry(0.82, 0.82, 0.82, 4, 0.14)), mat(defKey(d), () => plastic(deep(d.h, d.s, d.l)))));
      break;
    case 'crystal':
      group.add(mesh(crystalGeo(), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
        color: deep(d.h, d.s, clamp(d.l + 8, 22, 86)), emissive: hsl(d.h, d.s, d.l * 0.3), transparent: true, opacity: 0.84,
        roughness: 0.03, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0, iridescence: 0.55, iridescenceIOR: 1.5, specularIntensity: 1, flatShading: true,
      }))));
      break;
    case 'jelly':
      group.add(mesh(ponyGeo(), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
        color: deep(d.h, d.s, clamp(d.l, 38, 82)), emissive: hsl(d.h, d.s, d.l * 0.22), transparent: true, opacity: 0.58,
        roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03,
      }))));
      break;
    case 'metal':
      group.add(mesh((geo.metal ||= new THREE.SphereGeometry(0.4, 36, 24)), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
        color: hsl(d.h, d.s * 0.8, clamp(d.l, 34, 78)), metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.1,
      }))));
      break;
    case 'smiley': {
      group.add(mesh((geo.smiley ||= new THREE.SphereGeometry(0.45, 36, 24).scale(1, 1, 0.72)), mat(defKey(d), () => plastic(deep(d.h, d.s, d.l)))));
      const ink = d.l < 30 ? '#ffffff' : '#1c1830';
      const face = new THREE.Mesh(smileyFaceGeo(), mat('smile' + ink, () => new THREE.MeshBasicMaterial({
        map: smileyTex(ink), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2,
      })));
      const back = face.clone();
      back.rotation.y = Math.PI;
      group.add(face, back);
      break;
    }
    case 'glitter':
      group.add(mesh(ponyGeo(), mat(defKey(d), () => {
        const m = new THREE.MeshPhysicalMaterial({
          color: d.s == null ? hsl(d.h, 85, 52) : deep(d.h, Math.min(d.s, 85), clamp(d.l, 22, 72)), metalness: 0.75, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.1,
          bumpMap: sparkTex(), bumpScale: 1.2, emissive: 0xffffff, emissiveMap: sparkTex(), emissiveIntensity: 0.6,
        });
        m.userData = { kind: 'glitter', ph: d.h };
        animated.push(m);
        return m;
      })));
      break;
    case 'glow': {
      const gs = d.s == null ? 100 : d.s, c = hsl(d.h, gs, 58);
      group.add(mesh(ponyGeo(), mat(defKey(d), () => {
        const m = plastic(hsl(d.h, gs, 72), { emissive: c, emissiveIntensity: 1.1 });
        m.userData = { kind: 'glow', ph: d.h };
        animated.push(m);
        return m;
      })));
      const halo = new THREE.Sprite(mat('halo' + defKey(d), () => new THREE.SpriteMaterial({
        map: haloTex(), color: c, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
      })));
      halo.scale.setScalar(2.3);
      halo.position.z = -0.2;
      group.add(halo);
      break;
    }
    case 'letter': {
      const st = LETTER_STYLES[d.st] ? d.st : 'white', ls = LETTER_STYLES[st], round = d.sh === 'round';
      const body = round ? (geo.coin ||= coinGeo()) : (geo.cube ||= new RoundedBoxGeometry(0.94, 0.94, 0.72, 5, 0.17));
      const bodyMat = ls.frost
        ? mat('frostL', () => new THREE.MeshPhysicalMaterial({ color: ls.cube, roughness: 0.62, clearcoat: 0.3, clearcoatRoughness: 0.5, transparent: true, opacity: 0.8, sheen: 0.4, sheenColor: new THREE.Color(0xffffff) }))
        : mat('cube' + ls.cube, () => plastic(ls.cube, { roughness: 0.28 }));
      group.add(mesh(body, bodyMat));
      const half = round ? 0.212 : 0.362;
      const face = new THREE.Mesh(
        round ? (geo.coinFace ||= new THREE.PlaneGeometry(0.7, 0.7)) : (geo.face ||= new THREE.PlaneGeometry(0.8, 0.8)),
        mat('L' + d.ch + ls.ink, () => new THREE.MeshBasicMaterial({ map: letterTex(d.ch, ls.ink), transparent: true, depthWrite: false, toneMapped: false })));
      face.position.z = half;
      const faceBack = face.clone();
      faceBack.position.z = -half;
      faceBack.rotation.y = Math.PI;
      group.add(face, faceBack);
      break;
    }
    case 'seed': case 'seedg': case 'seedl': {
      const c = deep(d.h, d.s, d.l);
      if (d.k === 'seed') group.add(mesh(seedGeo(), mat(defKey(d), () => plastic(c, { roughness: 0.25 }))));
      else if (d.k === 'seedg') {
        // Frosted glitter: soft and matte, with a fine sparkle, like the blush seed beads in Shauna's photo.
        group.add(mesh(seedGeo(), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
          color: hsl(d.h, d.s * 0.75, clamp(d.l + 4, 24, 88)), roughness: 0.7, metalness: 0.2, bumpMap: sparkTex(), bumpScale: 1.4,
          emissive: 0xffffff, emissiveMap: sparkTex(), emissiveIntensity: 0.35, sheen: 0.6, sheenColor: new THREE.Color(0xffffff),
        }))));
      } else {
        // Silver-lined: clear colored glass with a mirror-bright square hole showing through.
        group.add(mesh(seedGeo(), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
          color: deep(d.h, d.s, clamp(d.l, 30, 80)), transparent: true, opacity: 0.62, roughness: 0.04, clearcoat: 1, depthWrite: false,
          emissive: hsl(d.h, d.s, d.l * 0.25),
        }))));
        group.add(mesh((geo.seedCore ||= new THREE.BoxGeometry(0.26, 0.15, 0.15)), silverMat()));
      }
      break;
    }
    case 'seedx': {
      const m = d.m || 'clear';
      if (m === 'square') {
        group.add(mesh((geo.seedSq ||= new RoundedBoxGeometry(0.28, 0.4, 0.4, 2, 0.05)), mat('seedSq', () => new THREE.MeshPhysicalMaterial({
          color: 0xf7f7fb, transparent: true, opacity: 0.72, roughness: 0.55, clearcoat: 0.4, depthWrite: false,
        }))));
        group.add(mesh((geo.seedSqCore ||= new THREE.BoxGeometry(0.29, 0.14, 0.14)), silverMat()));
      } else if (m === 'clear') {
        group.add(mesh(seedGeo(), mat('seedClear', () => new THREE.MeshPhysicalMaterial({
          color: 0xf4f6ff, transparent: true, opacity: 0.45, roughness: 0.03, clearcoat: 1, depthWrite: false, iridescence: 0.6, iridescenceIOR: 1.5,
        }))));
      } else if (m === 'pearl') {
        group.add(mesh(seedGeo(), mat('seedPearl', () => new THREE.MeshPhysicalMaterial({
          color: 0xfff6ec, roughness: 0.2, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7, sheen: 0.6, sheenColor: new THREE.Color(0xffc8e4),
        }))));
      } else {
        group.add(mesh(seedGeo(), mat('seedGun', () => new THREE.MeshPhysicalMaterial({ color: 0x55565e, metalness: 1, roughness: 0.22, clearcoat: 0.5 }))));
      }
      break;
    }
    case 'gunspacer':
      group.add(mesh((geo.gunspacer ||= new THREE.CylinderGeometry(0.2, 0.2, 0.22, 6).rotateZ(Math.PI / 2)),
        mat('gunspacer', () => new THREE.MeshPhysicalMaterial({ color: 0x4b4c55, metalness: 1, roughness: 0.2, flatShading: true }))));
      break;
    case 'matte':
      // Rubber-coated: soft color with no shine at all.
      group.add(mesh((geo.round ||= new THREE.SphereGeometry(0.43, 36, 24)), mat(defKey(d), () => new THREE.MeshStandardMaterial({ color: deep(d.h, d.s * 0.95, d.l), roughness: 0.92 }))));
      break;
    case 'starb':
      // A clear plastic star bead, threaded point to point.
      group.add(mesh(starGeo(), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
        color: deep(d.h, d.s, clamp(d.l, 36, 84)), emissive: hsl(d.h, d.s, d.l * 0.25), transparent: true, opacity: 0.72,
        roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1,
      }))));
      break;
    case 'dice': {
      // A see-through colored die with white pips. The cord runs through two opposite faces, so four faces show.
      group.add(mesh((geo.dice ||= new RoundedBoxGeometry(0.62, 0.62, 0.62, 3, 0.1)), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
        color: deep(d.h, d.s, clamp(d.l, 30, 78)), emissive: hsl(d.h, d.s, d.l * 0.3), transparent: true, opacity: 0.88, roughness: 0.12, clearcoat: 1,
      }))));
      const pipMat = (n) => mat('pip' + n, () => new THREE.MeshBasicMaterial({ map: pipTex(n), transparent: true, depthWrite: false, toneMapped: false }));
      for (const [n, rx, ry, pos] of [[5, 0, 0, [0, 0, 0.312]], [2, 0, Math.PI, [0, 0, -0.312]], [3, -Math.PI / 2, 0, [0, 0.312, 0]], [4, Math.PI / 2, 0, [0, -0.312, 0]]]) {
        const f = new THREE.Mesh((geo.pipFace ||= new THREE.PlaneGeometry(0.5, 0.5)), pipMat(n));
        f.rotation.set(rx, ry, 0);
        f.position.set(...pos);
        group.add(f);
      }
      break;
    }
    case 'facet':
      group.add(mesh(facetGeo(), mat(defKey(d), () => new THREE.MeshPhysicalMaterial({
        color: deep(d.h, d.s, clamp(d.l + 6, 18, 86)), emissive: hsl(d.h, d.s, d.l * 0.25), transparent: true, opacity: 0.9,
        roughness: 0.02, metalness: 0.2, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.5, flatShading: true,
      }))));
      break;
    case 'marble':
      group.add(mesh((geo.round ||= new THREE.SphereGeometry(0.43, 36, 24)), mat('marble', () => new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: marbleTex(), roughness: 0.16, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, sheen: 0.5, sheenColor: new THREE.Color(0xd9b8ff),
      }))));
      break;
    case 'moon2':
      // Milky moonstone glass with a soft blue glow inside.
      group.add(mesh((geo.moon2 ||= new THREE.SphereGeometry(0.36, 32, 22)), mat('moon2', () => new THREE.MeshPhysicalMaterial({
        color: 0xeef1f8, transparent: true, opacity: 0.86, roughness: 0.12, clearcoat: 1, emissive: 0x9fb4e8, emissiveIntensity: 0.18,
        sheen: 1, sheenColor: new THREE.Color(0xbcd2ff), iridescence: 0.4,
      }))));
      break;
    case 'pearl':
      group.add(mesh((geo.pearl ||= new THREE.SphereGeometry(0.45, 40, 28)), mat('pearl', () => new THREE.MeshPhysicalMaterial({
        color: 0xfff3e8, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 1, iridescenceIOR: 1.7,
        sheen: 0.6, sheenColor: new THREE.Color(0xffb8dc),
      }))));
      break;
    case 'mirror': {
      const ball = mesh((geo.mirror ||= new THREE.IcosahedronGeometry(0.47, 3)), mat('mirror', () => new THREE.MeshPhysicalMaterial({
        color: 0xeef1fa, metalness: 1, roughness: 0.04, flatShading: true,
      })));
      group.add(ball);
      group.userData.spin = ball;
      break;
    }
    case 'star':
      group.add(mesh(starGeo(), mat('star', () => new THREE.MeshPhysicalMaterial({ color: 0xffc533, metalness: 0.6, roughness: 0.22, clearcoat: 1 }))));
      break;
    case 'heart':
      group.add(mesh(heartGeo(), mat('heart', () => plastic(0xf0245c))));
      break;
    case 'lucky13': {
      // Die-cut "13": blue glitter numerals, black outline, white sticker border.
      const blue = mat('13blue', () => {
        const m = new THREE.MeshPhysicalMaterial({
          color: 0x3f8be0, metalness: 0.25, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.1,
          bumpMap: sparkTex(), bumpScale: 0.8, emissive: 0xdff0ff, emissiveMap: sparkTex(), emissiveIntensity: 0.6,
        });
        m.userData = { kind: 'glitter', ph: 13 };
        animated.push(m);
        return m;
      });
      const layers = [
        [0.105, 0.09, -0.045, 0.003, mat('13white', () => plastic(0xffffff, { roughness: 0.35 }))],
        [0.036, 0.05, 0.03, 0.01, mat('13black', () => plastic(0x101018, { roughness: 0.3 }))],
        [0, 0.05, 0.075, 0.022, blue],
      ];
      layers.forEach(([grow, depth, z, bevel, m], i) => {
        const layer = mesh((geo['13_' + i] ||= thirteenGeo(grow, depth, z, bevel)), m);
        group.add(layer);
        // The outline and numerals repeat on the back, the way a real die-cut charm looks from behind.
        if (i > 0) { const back = layer.clone(); back.scale.z = -1; group.add(back); }
      });
      break;
    }
    case 'moon':
      group.add(mesh(moonGeo(), mat('moon', () => new THREE.MeshPhysicalMaterial({
        color: 0xffd470, metalness: 0.55, roughness: 0.24, clearcoat: 1, iridescence: 0.4, iridescenceIOR: 1.5,
      }))));
      break;
    case 'snake': {
      const skin = mat('snake', () => new THREE.MeshPhysicalMaterial({
        color: 0x0fae72, metalness: 0.55, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1,
        iridescence: 0.25, iridescenceIOR: 1.4, bumpMap: scaleTex(), bumpScale: 0.7,
      }));
      const g = snakeGeo();
      group.add(mesh(g, skin));
      const head = new THREE.Group();
      const skull = mesh((geo.snakeHead ||= new THREE.SphereGeometry(0.1, 24, 16)), mat('snakeHead', () => new THREE.MeshPhysicalMaterial({
        color: 0x0fae72, metalness: 0.55, roughness: 0.24, clearcoat: 1, iridescence: 0.25, iridescenceIOR: 1.4,
      })));
      skull.scale.set(1.55, 1.05, 0.85);
      head.add(skull);
      const eyeMat = mat('snakeEye', () => new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb300, emissiveIntensity: 0.9, roughness: 0.2 }));
      for (const sy of [-1, 1]) {
        const eye = new THREE.Mesh((geo.eye ||= new THREE.SphereGeometry(0.026, 12, 8)), eyeMat);
        eye.position.set(0.06, sy * 0.06, 0.06);
        head.add(eye);
      }
      const tongue = new THREE.Mesh((geo.tongue ||= new THREE.BoxGeometry(0.12, 0.022, 0.012)), mat('tongue', () => plastic(0xe0193f)));
      tongue.position.set(0.19, 0, 0);
      head.add(tongue);
      head.position.copy(g.userData.end);
      head.rotation.z = Math.atan2(g.userData.tan.y, g.userData.tan.x);
      group.add(head);
      break;
    }
    case 'butterfly': {
      const up = mat('wingU', () => plastic(0xff6fc8, { iridescence: 1, iridescenceIOR: 1.6, sheen: 1, sheenColor: new THREE.Color(0xc59bff) }));
      const low = mat('wingL', () => plastic(0x63bfff, { iridescence: 1, iridescenceIOR: 1.6, sheen: 1, sheenColor: new THREE.Color(0xb7f4ff) }));
      const wings = [];
      for (const sx of [1, -1]) {
        const w = new THREE.Group();
        w.add(mesh(wingGeo(true), up), mesh(wingGeo(false), low));
        w.scale.x = sx;
        group.add(w);
        wings.push(w);
      }
      const body = mesh((geo.bfBody ||= new THREE.CapsuleGeometry(0.05, 0.46, 6, 14)), mat('bfBody', () => plastic(0x2c1846)));
      body.position.z = 0.03;
      group.add(body);
      group.userData.flap = wings;
      break;
    }
    case 'guitar': {
      // Jump ring on the string, then the charm hangs from a pivot so it can swing.
      const silver = mat('spacer', () => new THREE.MeshPhysicalMaterial({ color: 0xdfe3ee, metalness: 1, roughness: 0.18 }));
      group.add(mesh((geo.jump ||= new THREE.TorusGeometry(0.2, 0.05, 12, 32).rotateY(Math.PI / 2)), silver));
      const hang = new THREE.Group();
      hang.position.y = -0.2;
      const bail = mesh((geo.bail ||= new THREE.TorusGeometry(0.09, 0.028, 10, 24)), silver);
      bail.position.y = -0.1;
      hang.add(bail);
      const charm = new THREE.Group();
      charm.position.y = -0.2;
      // Matches the size of the other hanging charms.
      charm.scale.setScalar(1.24);
      const dark = mat('gDark', () => plastic(0x3d2110, { roughness: 0.35 }));
      const gold = mat('star', () => new THREE.MeshPhysicalMaterial({ color: 0xffc533, metalness: 0.6, roughness: 0.22, clearcoat: 1 }));
      charm.add(mesh(guitarBodyGeo(), mat('gBody', () => plastic(0xffffff, { map: woodTex(), roughness: 0.25 }))));
      const neck = mesh((geo.gNeck ||= new THREE.BoxGeometry(0.1, 0.7, 0.07)), dark);
      neck.position.set(0, -0.5, 0.05);
      const headstock = mesh((geo.gHead ||= new RoundedBoxGeometry(0.19, 0.22, 0.07, 3, 0.03)), dark);
      headstock.position.set(0, -0.1, 0.05);
      const hole = new THREE.Mesh((geo.gHole ||= new THREE.CircleGeometry(0.1, 28)), mat('gHole', () => new THREE.MeshBasicMaterial({ color: 0x1d0d04 })));
      hole.position.set(0, -1.06, 0.092);
      const rosette = new THREE.Mesh((geo.gRing ||= new THREE.RingGeometry(0.1, 0.13, 28)), mat('gRose', () => new THREE.MeshBasicMaterial({ color: 0xfff1d0 })));
      rosette.position.set(0, -1.06, 0.0915);
      const bridge = mesh((geo.gBridge ||= new THREE.BoxGeometry(0.22, 0.045, 0.03)), dark);
      bridge.position.set(0, -1.4, 0.1);
      charm.add(neck, headstock, hole, rosette, bridge);
      for (let i = 0; i < 4; i++) {
        const st = new THREE.Mesh((geo.gString ||= new THREE.BoxGeometry(0.007, 1.26, 0.004)), gold);
        st.position.set(-0.03 + i * 0.02, -0.77, 0.112);
        charm.add(st);
        const peg = mesh((geo.gPeg ||= new THREE.SphereGeometry(0.028, 10, 8)), gold);
        peg.position.set(i < 2 ? -0.115 : 0.115, -0.05 - (i % 2) * 0.1, 0.05);
        charm.add(peg);
      }
      hang.add(charm);
      group.add(hang);
      group.userData.hang = hang;
      break;
    }
  }
  return group;
}
