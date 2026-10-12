import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import qrcode from 'qrcode-generator';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { encodeBracelet, decodeBracelet, COLORS, COLOR_ORDER, PARTNER, colorBeads, FIXED, LETTERS, letterBeads, letterDef, isLetterChar, HEART, LETTER_STYLE_ORDER, CHARMS, DANGLES, UNIT, DANGLE, makeBead, tickMaterials, defKey, capFacing, layoutCords, cordGap, cordOf, withCord, PRESETS } from './beads.js';
import { isDark, onTheme, toggleTheme } from './theme.js';
import tableUrl from './assets/table-dark.jpg';
import feltUrl from './assets/felt.jpg';
import feltNormalUrl from './assets/felt-normal.jpg';
import { arm, setMuted, land, tick, chime, buzz, note, twang, whoosh, thud } from './audio.js';

// The string holds beads by length, not count. The budget is 25 pony-bead widths' worth of units (26 letter cubes),
// so no bead ever draws smaller on a phone than a full string of letters. MAX_COUNT is a safety cap.
const BUDGET = 25, MAX_COUNT = 120, TAU = Math.PI * 2, N = 90;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const HINT = 'Tap a bead below to add it. On the string: tap to remove, drag to reorder, or pluck it.';
const TIED_HINT = 'Drag to spin it. Tap for sparkles.';
// Wall decoration: a few curated colors, and the word on the neon sign.
const WALL_COLORS = {
  // shade: the deeper tone toward the bottom of the wall. night: how the wall reads under lamp and neon light.
  white: { base: '#f4f0e8', shade: '#ddd3c4', night: 0x8a8ea8 },
  pink: { base: '#f7d3e4', shade: '#e9b3cc', night: 0x9a7fb4 },
  sage: { base: '#cfdecb', shade: '#b4c8b1', night: 0x7d9a94 },
};
const SIGN_DEFAULT = '13 beads', SIGN_MAX = 16, NAME_MAX = 16;
const cleanSign = (t) => String(t || '').replace(/[^A-Za-z0-9 !?&']/g, '').replace(/\s+/g, ' ').slice(0, SIGN_MAX);
const cleanName = (t) => String(t || '').replace(/[^A-Za-z0-9 '.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
// The sign a player gets when they tell the game their name: "Jess's beads", or just the name when that is too long.
const nameSign = (name) => { const full = name + "'s beads"; return cleanSign(full.length <= SIGN_MAX ? full : name).trim(); };
// Neon sign colors. Rainbow gives each letter its own tube color.
const NEON_COLORS = {
  rainbow: ['#ff4fa3', '#ff9a3c', '#ffd93d', '#4fe08a', '#45b8ff', '#a66bff'],
  white: ['#fff4e4'],
  pink: ['#ff4fa3'],
  blue: ['#45b8ff'],
};
// name: the player's name, used on new tags, the sign, and as the sender on copies friends take. lights and
// ticket: the wall props. All saved in 13beads.wall.
let decor = { color: 'white', sign: SIGN_DEFAULT, neon: 'rainbow', name: '', lights: true, ticket: true };
try {
  const d = JSON.parse(localStorage.getItem('13beads.wall') || 'null');
  if (d && WALL_COLORS[d.color]) decor.color = d.color;
  if (d && NEON_COLORS[d.neon]) decor.neon = d.neon;
  if (d && typeof d.sign === 'string' && cleanSign(d.sign).trim()) decor.sign = cleanSign(d.sign).trim();
  if (d && typeof d.name === 'string') decor.name = cleanName(d.name);
  if (d && d.lights === false) decor.lights = false;
  if (d && d.ticket === false) decor.ticket = false;
} catch (e) { /* optional */ }
// What a new tag says: the player's name once they have given one.
const tagDefault = () => decor.name || 'Mine';
const STACK_HINT = matchMedia('(pointer: coarse)').matches
  ? 'Tap a bracelet for its options and its tag. Hold it, then drag it to another peg.'
  : 'Click a bracelet for its options and its tag. Hold it, then drag it to another peg.';
const EMPTY_WALL = 'Nothing on display yet. Finish a bracelet and hang it here.';

/* ---------- State ---------- */
let beads = [], fallers = [], undoStack = [], redoStack = [];
let letterStyle = 'white', letterShape = 'round';
// Two strands: a second cord hangs below the first. New beads go on the active cord: 0 top, 1 bottom, 2 both.
let twoCords = false, activeCord = 0, cordPx = 0;
// Stops any bead-by-bead stringing in progress (a phrase, a pattern, the starter, or a Surprise me bracelet).
function stopStringing() { clearInterval(phraseTimer); starterTimers.forEach(clearTimeout); starterTimers = []; }
let mode = 'line', kLin = 0, tiedFired = false, side = 'R';
let W = 300, H = 300, sizeCur = 34, lineLen = 600;
let T = 0, last = 0;
let phraseTimer = null, starterTimers = [], lastTubeKey = '';
let parX = 0, parY = 0, parTX = 0, parTY = 0;
let pluck = null, spin = null, spinY = 0, spinX = 0, spinVY = 0, spinVX = 0, hop = 9;
let tilt = 0, tiltS = 0, hasTilt = false;

/* ---------- Three.js scene ---------- */
const cv = $('cv');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
} catch (e) {
  const f = document.createElement('p');
  f.className = 'fallback';
  f.textContent = 'This browser could not start 3D graphics. Try a current version of Chrome, Safari, or Firefox.';
  $('stage').appendChild(f);
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const FOV = 26;
const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 6000);

const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 7;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
// Two slow colored stage lights so the gloss on each bead keeps moving.
const stageA = new THREE.PointLight(0xff4fa8, reduce ? 0.5 : 1.0, 0, 0);
const stageB = new THREE.PointLight(0x4fb8ff, reduce ? 0.5 : 1.0, 0, 0);
scene.add(stageA, stageB);

const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.ShadowMaterial({ opacity: 0.26 }));
backdrop.receiveShadow = true;
backdrop.position.z = -46;
backdrop.visible = false;
scene.add(backdrop);
// The craft table under the string: a solid wood slab, built when the theme is known (oak by day, walnut by night).
const table = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }));
table.receiveShadow = true;
// Drawn first and never hides anything: the tied loop tilts toward the viewer and would otherwise dip behind it.
table.material.depthWrite = false;
table.renderOrder = -1;
table.position.z = -46.5;
scene.add(table);
// The tabletop is a photo-scanned surface: gray felt like a bead mat (CC0, ambientCG "Fabric 034"), or dark wood
// (CC0, Poly Haven "Dark Wood"). The player picks one in the More menu; felt is the default.
const SURFACES = {
  felt: { url: feltUrl, normal: feltNormalUrl, tile: 300, cord: 0x7a6f94, day: [0.5, 0.4], night: [0.36, 0.05], tint: 0xf3eef5, normalScale: 0.9, rough: 0.95 },
  wood: { url: tableUrl, tile: 620, cord: 0xe6ddf2, day: [0.62, 0.5], night: [0.4, 0.03], tint: 0xffffff, rough: 0.62 },
};
let surface = 'felt';
try { const v = localStorage.getItem('13beads.table'); if (SURFACES[v]) surface = v; } catch (e) { /* optional */ }
const tableLoader = new THREE.TextureLoader(), tableTex = {};
function loadTex(url, srgb) {
  return (tableTex[url] ||= tableLoader.load(url, (t) => { applyMood(); table.material.needsUpdate = true; }, undefined, () => {}));
}
function buildTable() {
  const sf = SURFACES[surface], t = loadTex(sf.url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  const m = table.material;
  m.map = t;
  // Part of the color comes from the texture itself, so the moving colored lights do not tint the table.
  m.emissive.set(sf.tint);
  m.emissiveMap = t;
  m.roughness = sf.rough;
  if (sf.normal) {
    const n = loadTex(sf.normal);
    n.wrapS = n.wrapT = THREE.RepeatWrapping;
    m.normalMap = n;
    m.normalScale.set(sf.normalScale, sf.normalScale);
  } else m.normalMap = null;
  m.needsUpdate = true;
  // The cord is pale on dark wood and a deeper lavender gray on felt, so it shows on either.
  stringMat.color.set(sf.cord);
  applyMood();
}
function setSurface(v) {
  if (!SURFACES[v] || v === surface) return;
  surface = v;
  try { localStorage.setItem('13beads.table', v); } catch (e) { /* optional */ }
  document.querySelectorAll('.surf').forEach((o) => o.setAttribute('aria-pressed', o.dataset.surf === v ? 'true' : 'false'));
  buildTable();
  tick(1.1, 0.08);
}

const strand = new THREE.Group();
scene.add(strand);
// A twisted thread texture, so the cord reads as cord rather than wire.
function twistTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 64, 32);
  x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 5;
  for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(i * 16, 32); x.lineTo(i * 16 + 32, 0); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2;
  for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(i * 16 + 6, 32); x.lineTo(i * 16 + 38, 0); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const stringMat = new THREE.MeshStandardMaterial({ color: 0x7f7398, roughness: 0.7, map: twistTexture() });
const tube = new THREE.Mesh(new THREE.BufferGeometry(), stringMat);
// The second cord, shown only for two-strand bracelets.
const tube2 = new THREE.Mesh(new THREE.BufferGeometry(), stringMat);
tube2.visible = false;
// While stringing on two strands, the cord new beads go on is drawn a little thicker and brighter, and a faint ghost
// bead shows exactly where the next one will land.
const activeCordMat = new THREE.MeshStandardMaterial({ roughness: 0.6, map: stringMat.map, emissive: 0xffffff, emissiveIntensity: 0.12 });
const ghost = new THREE.Group();
const ghostFill = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
const ghostRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.045, 8, 40), new THREE.MeshBasicMaterial({ color: 0xff5fa8, transparent: true, opacity: 0.9, depthWrite: false }));
ghostRing.position.z = 0.4;
ghost.add(ghostFill, ghostRing);
ghost.visible = false;
let cordPaths = null;
tube.castShadow = true;
strand.add(tube, tube2, ghost);
const knot = new THREE.Group();
knot.add(new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12), stringMat));
for (const sgn of [-1, 1]) {
  const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sgn * 10, 13, 3), new THREE.Vector3(sgn * 20, 22, 0)]);
  knot.add(new THREE.Mesh(new THREE.TubeGeometry(c, 12, 1.4, 6), stringMat));
}
knot.visible = false;
strand.add(knot);

// Tie-off confetti, like the confetti at a stadium show: shiny pastel foil stars that tumble and
// flutter down, with little maple leaves mixed in.
const STAR_N = 84, LEAF_N = 28;
const CONFETTI_COLORS = [0xf7a8c8, 0xa9d6f2, 0xc8b4f2, 0xf6e2a2, 0xffffff, 0xf9c4a8].map((c) => new THREE.Color(c));
function mapleShape() {
  const pts = [[0, 0.5], [0.08, 0.32], [0.2, 0.38], [0.17, 0.13], [0.36, 0.3], [0.4, 0.2], [0.5, 0.22], [0.43, 0.05], [0.48, 0], [0.3, -0.13],
    [0.34, -0.22], [0.06, -0.18], [0.035, -0.46], [-0.035, -0.46], [-0.06, -0.18], [-0.34, -0.22], [-0.3, -0.13], [-0.48, 0], [-0.43, 0.05],
    [-0.5, 0.22], [-0.4, 0.2], [-0.36, 0.3], [-0.17, 0.13], [-0.2, 0.38], [-0.08, 0.32]];
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  return sh;
}
function starShape() {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.21 : 0.5, a = Math.PI / 2 + (i * Math.PI) / 5;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return sh;
}
const confettiMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.55, metalness: 0, transparent: true, opacity: 1, depthWrite: false });
// Stars are foil: a little metal so they catch the light as they turn.
const starMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.32, metalness: 0.45, transparent: true, opacity: 1, depthWrite: false });
const sparks = new THREE.Group();
const starMesh = new THREE.InstancedMesh(new THREE.ShapeGeometry(starShape()), starMat, STAR_N);
const leafMesh = new THREE.InstancedMesh(new THREE.ShapeGeometry(mapleShape(), 4), confettiMat, LEAF_N);
for (const m of [starMesh, leafMesh]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sparks.add(m); }
sparks.visible = false;
scene.add(sparks);
const confetti = [];
const cfObj = new THREE.Object3D();
let sparkLife = 0;

function readTheme() {
  buildTable();
}

function resize() {
  const r = cv.getBoundingClientRect();
  W = Math.max(200, r.width);
  H = Math.max(160, r.height);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const M = Math.max(W, H);
  placeSun();
  const sc = sun.shadow.camera;
  sc.left = -M * 0.8; sc.right = M * 0.8; sc.top = M * 0.8; sc.bottom = -M * 0.8;
  sc.near = 1; sc.far = M * 4;
  sc.updateProjectionMatrix();
  lastTubeKey = '';
}

/* ---------- Beads ---------- */
function mk(def, placed, from) {
  const obj = makeBead(def);
  strand.add(obj);
  return {
    def, obj, s: placed ? null : (from === 'L' ? -70 : lineLen + 70), v: 0, landed: !!placed, sq: 9,
    rock: 0, rv: 0, sw: 0, swv: 0, pv: 0, ph: Math.random() * 6, drag: null, x: 0, y: 0, S: 30,
  };
}
const defs = () => beads.map((b) => b.def);
function setBeads(list) {
  beads.forEach((b) => strand.remove(b.obj));
  // Saved strings keep every bead, even ones from before the length budget.
  beads = list.filter((d) => d && UNIT[d.k]).slice(0, MAX_COUNT).map((d) => mk(d, true));
  // A bracelet made on two cords opens with both cords showing.
  if (beads.some((b) => cordOf(b.def))) setTwo(true, true);
}
// Messages are not shown on screen (a pop-up note covered the string). They still go to a hidden live region,
// so screen readers announce them.
function say(m) {
  const st = $('status');
  st.textContent = '';
  requestAnimationFrame(() => { st.textContent = m; });
}
// While a received bracelet is showing, the player's own string is set aside and not overwritten.
let trade = null;
// Wide screens (900px and up) put the bead case, the share options, and the wall controls in a panel on the right.
const wideCase = matchMedia('(min-width: 900px)');
function save() { if (trade) return; try { localStorage.setItem('13beads.strand', JSON.stringify(defs())); } catch (e) { /* optional */ } }
// On two cords, the length that counts is the longer cord, so the bracelet still fits one wrist.
const usedLen = () => layoutCords(defs()).U;
const fits = (d, more = []) => beads.length + more.length < MAX_COUNT && layoutCords([...defs(), ...more, d]).U <= BUDGET + 1e-6;
function sync() {
  const n = beads.length, pct = Math.min(100, Math.round((usedLen() / BUDGET) * 100)), c = $('count');
  c.firstChild.textContent = n + (n === 1 ? ' bead' : ' beads');
  c.style.setProperty('--fill', pct + '%');
  c.classList.toggle('full', pct >= 100);
  c.setAttribute('aria-label', n + (n === 1 ? ' bead' : ' beads') + ' on the string, ' + pct + ' percent full');
  $('clear').disabled = !n;
  save();
}
function pushUndo() { undoStack.push(JSON.stringify(defs())); if (undoStack.length > 40) undoStack.shift(); redoStack.length = 0; syncUndo(); }
function syncUndo() { $('undo').disabled = !undoStack.length; $('redo').disabled = !redoStack.length; $('clear').disabled = !beads.length; }

function addBead(def, noUndo, end = side, step = null) {
  if (mode !== 'line') return false;
  // On two strands a bead goes on the active cord, unless it already says which (the patterns do).
  if (twoCords) def = withCord(def, 'c' in def ? def.c : activeCord);
  if (!fits(def)) { say('That is a full wrist. Pull a bead off to add more.'); return false; }
  if (!noUndo) pushUndo();
  const b = mk(def, reduce, end);
  b.step = step;
  end === 'L' ? beads.unshift(b) : beads.push(b);
  sync();
  return true;
}
function drop(b) {
  strand.remove(b.obj);
  scene.add(b.obj);
  b.obj.position.set(b.x - W / 2, H / 2 - b.y, 24);
  fallers.push({ obj: b.obj, vx: (Math.random() - 0.5) * 160, vy: 200 + Math.random() * 80, r: [0, 1, 2].map(() => (Math.random() - 0.5) * 12) });
}
function removeBead(b) {
  pushUndo();
  drop(b);
  beads.splice(beads.indexOf(b), 1);
  tick(0.6, 0.14);
  sync();
}
function stringPhrase(text) {
  const list = [];
  // Any heart typed (the plain one or the red emoji) becomes a heart bead.
  for (const ch of text.toUpperCase().replace(/\u2764\uFE0F?|\u2665\uFE0F?|<3/g, HEART)) {
    if (isLetterChar(ch)) list.push(letterDef(ch, letterStyle, letterShape));
    else if (ch === ' ' && list.length) list.push({ k: 'spacer' });
  }
  if (!list.length) { say('Type letters, numbers, or ! ? & to spell a phrase.'); return; }
  // Count how much of the phrase fits in the room left on the string.
  let room = 0;
  const tagged = list.map((d) => (twoCords ? withCord(d, activeCord) : d));
  while (room < tagged.length && fits(tagged[room], tagged.slice(0, room))) room++;
  if (room <= 0) { say('That is a full wrist. Pull a bead off to add more.'); return; }
  if (list.length > room) say('Only ' + room + ' beads fit, so the phrase was cut short.');
  pushUndo();
  stopStringing();
  const end = side;
  // On the left end the last letter goes on first, so the phrase still reads left to right.
  const q = tagged.slice(0, room);
  if (end === 'L') q.reverse();
  if (reduce) { q.forEach((d) => addBead(d, true, end)); return; }
  let step = 0;
  phraseTimer = setInterval(() => { const d = q.shift(); if (!d || !addBead(d, true, end, step++)) stopStringing(); }, 120);
}
function setMode(m) {
  // Leaving a received bracelet any way other than hanging it puts the player's own string back.
  if (trade && m !== 'tied') endTrade();
  if (m !== 'line') clearLoose();
  mode = m;
  $('buildPanel').hidden = m !== 'line';
  $('lineBar').hidden = m !== 'line';
  $('tiedPanel').hidden = m !== 'tied';
  $('wallPanel').hidden = m !== 'stack';
  $('hud').hidden = false;
  $('hud').dataset.mode = m;
  $('menu').dataset.mode = m;
  $('stackBtn').setAttribute('aria-pressed', m === 'stack' ? 'true' : 'false');
  $('backArrow').setAttribute('aria-label', m === 'line' ? 'Back to all games' : 'Back to your string');
  $('backArrow').title = m === 'line' ? 'All games' : 'Back to your string';

  $('count').hidden = m !== 'line';
  closePop(false);
  closeCustom(false);
  closeShare(false);
  closeWallShare(false);
  if (visit && m !== 'stack') endVisit();
  strand.visible = m !== 'stack';
  board.visible = m === 'stack';
  backdrop.visible = false;
  table.visible = m !== 'stack';
  applyMood();
  sparks.visible = false;
  if (m === 'tied') { tiedFired = false; say(TIED_HINT); }
  else if (m === 'stack') { syncStack(); syncAnother(); fillCustom(); say(stack.length ? STACK_HINT : EMPTY_WALL); }
  else say(HINT);
  if (reduce) kLin = m === 'tied' ? 1 : 0;
}

/* ---------- The wall: a painted wall with peg rails, where finished things go on display ---------- */
const board = new THREE.Group();
board.visible = false;
scene.add(board);

const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// A plain painted wall: one color, a touch lighter at the top and a touch deeper toward the shelf, with a faint
// grain so it does not read as flat plastic. (A limewash, plaster relief, and window light were too busy.)
function paintTexture(name) {
  const col = WALL_COLORS[name] || WALL_COLORS.white, S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const [r0, g0, b0] = hexRGB(col.base), [rs, gs, bs] = hexRGB(col.shade);
  const mix = (k) => `rgb(${Math.round(r0 + (rs - r0) * k)},${Math.round(g0 + (gs - g0) * k)},${Math.round(b0 + (bs - b0) * k)})`;
  const g = x.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, mix(0));
  g.addColorStop(1, mix(0.35));
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.025)' : 'rgba(255,255,255,.04)';
    x.fillRect(Math.random() * S, Math.random() * S, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: paintTexture(decor.color), roughness: 0.95 }));
// No shadows on the wall: the bracelets hang well in front of it, so their shadows landed far below them as gray ghosts.
wall.receiveShadow = false;
wall.position.z = -70;
board.add(wall);

// A neon-style sign in script. It glows at night and sits unlit by day.
// How much of the sign's width the word takes up, so a tap on the sign can tell the word from the bare wall.
let signFrac = 0.6;
function neonTexture(lit) {
  const c = document.createElement('canvas');
  c.width = NEON_W; c.height = NEON_H;
  const x = c.getContext('2d');
  const word = decor.sign || SIGN_DEFAULT;
  // Letters are drawn one at a time with a little air between them, like separate neon tubes.
  // The script shrinks to fit, so longer words stay inside the sign.
  const font = (sz) => sz + 'px Pacifico, "Brush Script MT", cursive';
  const lay = (sz) => {
    x.font = font(sz);
    const gap = sz * 0.07, ws = [...word].map((ch) => x.measureText(ch).width);
    return { ws, gap, total: ws.reduce((a, w) => a + w, 0) + gap * Math.max(0, ws.length - 1) };
  };
  let size = 130, L = lay(size);
  const room = NEON_W - 60;
  if (L.total > room) { size = Math.max(56, Math.floor((size * room) / L.total)); L = lay(size); }
  signFrac = Math.min(1, L.total / NEON_W);
  x.textAlign = 'left'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineCap = 'round';
  const cy = NEON_H / 2 + 4;
  const strokeAll = () => {
    let px = (NEON_W - L.total) / 2;
    [...word].forEach((ch, i) => { x.strokeText(ch, px, cy); px += L.ws[i] + L.gap; });
  };
  // Always lit: a colored glow, the colored tube, then a hot white core. At night the glow spreads wider; by day a
  // soft shadow on the wall keeps the tubes readable against a light paint color.
  const cols = NEON_COLORS[decor.neon] || NEON_COLORS.rainbow;
  const each = (fn) => {
    let px = (NEON_W - L.total) / 2, ci = 0;
    [...word].forEach((ch, i) => { if (ch !== ' ') { fn(ch, px, cols[ci % cols.length]); ci++; } px += L.ws[i] + L.gap; });
  };
  if (!lit) {
    x.shadowColor = 'rgba(40,25,35,.35)'; x.shadowBlur = 6; x.shadowOffsetX = 3; x.shadowOffsetY = 5;
    each((ch, px, col) => { x.strokeStyle = col; x.lineWidth = 7; x.strokeText(ch, px, cy); });
    x.shadowOffsetX = 0; x.shadowOffsetY = 0;
  }
  for (const [blur, lw, alpha] of lit ? [[30, 9, 0.9], [14, 6, 1]] : [[14, 6.5, 0.95]]) {
    x.globalAlpha = alpha;
    each((ch, px, col) => { x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = lw; x.strokeText(ch, px, cy); });
  }
  x.globalAlpha = 1;
  each((ch, px, col) => { x.shadowColor = col; x.shadowBlur = 5; x.strokeStyle = lit ? '#ffffff' : '#fffaf6'; x.lineWidth = 2.4; x.strokeText(ch, px, cy); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const NEON_W = 640, NEON_H = 220;
const neonMaps = { on: null, off: null };
const neon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
neon.position.z = -40;
board.add(neon);
const neonGlow = new THREE.PointLight(0xfff0dc, 0, 0, 0);
const lamp = new THREE.PointLight(0xffb873, 0, 0, 0);
const deskLamp = new THREE.PointLight(0xffc98a, 0, 1, 1.4);
scene.add(deskLamp);
board.add(neonGlow, lamp);

// Day in light mode, evening in dark mode. Leaving the wall restores the stage lighting.
function placeSun() {
  const M = Math.max(W, H);
  if (mode === 'stack') sun.position.set(-0.95 * M, 0.75 * M, 0.85 * M);
  else sun.position.set(-0.3 * M, 0.55 * M, 1.1 * M);
}
function applyMood() {
  const onWall = mode === 'stack', night = onWall && isDark();
  placeSun();
  sun.color.set(!onWall ? 0xffffff : night ? 0x8fa2ff : 0xfff0dc);
  sun.intensity = !onWall ? 1.7 : night ? 0.6 : 2.1;
  scene.environmentIntensity = !onWall ? 0.55 : night ? 0.32 : 0.5;
  stageA.intensity = stageB.intensity = onWall ? 0.12 : reduce ? 0.5 : 1.0;
  wall.material.color.set(night ? (WALL_COLORS[decor.color] || WALL_COLORS.white).night : 0xffffff);
  railMat.color.set(RAIL_COLORS[decor.color] || RAIL_COLORS.white);
  // The craft table: evenly lit by day; in dark mode the room dims and a warm desk lamp pools light in the middle.
  const deskNight = !onWall && isDark();
  if (table.material.map) {
    const sf = SURFACES[surface], [c, e] = deskNight ? sf.night : sf.day;
    table.material.emissiveIntensity = e;
    table.material.color.set(sf.tint).multiplyScalar(c);
  }
  deskLamp.intensity = deskNight ? 7 : 0;
  if (deskNight) { sun.intensity = 0.55; sun.color.set(0xffe2c4); scene.environmentIntensity = 0.35; stageA.intensity = stageB.intensity = 0.35; }
  lamp.intensity = night ? 1.6 : 0;
  // At night the sign is the room's main light: its color washes down the wall and catches the pegs and beads.
  neonGlow.intensity = night ? 3.4 : 0;
  bulbMat.emissiveIntensity = night ? 2.2 : 0.15;
  for (const l of props.lamps) l.intensity = night ? 1.4 : 0;
  neonGlow.color.set(decor.neon === 'blue' ? 0x7fc8ff : decor.neon === 'white' ? 0xfff0dc : decor.neon === 'pink' ? 0xff8cc4 : 0xffb0d8);
  if (!neonMaps.on) { neonMaps.on = neonTexture(true); neonMaps.off = neonTexture(false); }
  neon.material.map = night ? neonMaps.on : neonMaps.off;
  neon.material.blending = THREE.NormalBlending;
  neon.material.needsUpdate = true;
}
onTheme(applyMood);

// The display: lacquered peg rails across the wall, one bracelet per peg. Each bracelet hangs from its peg as a
// loop facing the viewer, the phrase along the bottom where it reads, with a paper tag on the peg beside it (a name
// and the day it was hung). Newest hangs top left and the rest shift along. Tap one for its options; hold it, then
// drag it to another peg. Tilting the phone, hanging a new one, or dropping one sets the loops swinging.
// Everything on the wall (the sign and the rails) scrolls as one room when there are more rows than fit.
const room = new THREE.Group();
board.add(room);
room.add(neon);
const display = new THREE.Group();
room.add(display);
const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xe9c070, metalness: 0.9, roughness: 0.26, clearcoat: 0.6 });
const RAIL_COLORS = { white: 0xe9d6cc, pink: 0xe2b6c9, sage: 0xeee6d6 };
const railMat = new THREE.MeshPhysicalMaterial({ color: RAIL_COLORS.white, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
const pegGeo = new THREE.CylinderGeometry(4.2, 4.8, 26, 18).rotateX(Math.PI / 2).translate(0, 0, 13);
const pegCapGeo = new THREE.SphereGeometry(5.2, 18, 12);
// What hangs on the wall. Each entry: the beads (b), a tag name (n), the day it was hung (d, YYYY-MM-DD), and
// t: 'trade' for a bracelet that arrived by trade link. Older saves were bare bead lists; they become entries here.
const entryOf = (e) => (Array.isArray(e) ? { b: e, n: tagDefault() } : e && Array.isArray(e.b) ? e : null);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? new Date(+m[1], m[2] - 1, +m[3]).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};
const TAG_MAX = 24;
const cleanTag = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, TAG_MAX);
// Where the pegs go on this stage, in stage pixels (y measured down from the top).
function wallGrid() {
  const n = stack.length;
  const cols = W < 520 ? 2 : W < 760 ? 3 : 4;
  const colW = Math.min((W * 0.94) / cols, 300);
  const R = clamp(colW * 0.34, 34, 92);
  // Bead size: a full bracelet fills its loop; a short one shows more cord, as a real one would.
  const S = clamp(R * 0.36, 13, 28);
  const rowH = R * 2.75 + 48;
  const rows = Math.max(1, Math.ceil(n / cols));
  const SIGN_ROOM = 118, top = SIGN_ROOM + 30;
  const bottom = top + (rows - 1) * rowH + R * 2.75 + 36;
  return { cols, colW, R, S, rowH, rows, top, bottom, total: bottom + (decor.ticket ? 96 : 0), railW: cols * colW + 24 };
}
// A peg's place, in room coordinates (y up, origin at the stage center before scrolling).
function slotPos(i, grid) {
  const col = i % grid.cols, row = Math.floor(i / grid.cols);
  return { x: (col - (grid.cols - 1) / 2) * grid.colW, y: H / 2 - grid.top - row * grid.rowH };
}
let standKey = '';
const railMeshes = [];
function buildStand(grid) {
  for (const m of railMeshes) { display.remove(m); m.traverse((o) => { if (o.userData.own) o.geometry.dispose(); }); }
  railMeshes.length = 0;
  const railGeo = new RoundedBoxGeometry(grid.railW, 14, 10, 3, 4);
  for (let row = 0; row < grid.rows; row++) {
    const y = slotPos(row * grid.cols, grid).y;
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, y, -5);
    rail.userData.own = row === 0;
    display.add(rail);
    railMeshes.push(rail);
    for (let col = 0; col < grid.cols; col++) {
      const p = slotPos(row * grid.cols + col, grid), peg = new THREE.Group();
      peg.position.set(p.x, y, 0);
      // Pegs point out and a little up, the way a real peg rail is cut, so a loop cannot slide off.
      peg.rotation.x = -0.18;
      const stem = new THREE.Mesh(pegGeo, goldMat), cap = new THREE.Mesh(pegCapGeo, goldMat);
      cap.position.z = 26;
      stem.castShadow = cap.castShadow = true;
      peg.add(stem, cap);
      display.add(peg);
      railMeshes.push(peg);
    }
  }
}
// Wall props: a string of warm fairy lights pinned along the top of the wall in two swags (they glow at night),
// and a ticket stub pinned below the last rail, with the player's name on it once they have given one.
const props = { group: null, bulbs: null, lamps: [], ticket: null };
const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffd58a, emissiveIntensity: 0.15, roughness: 0.3 });
const wireMat = new THREE.MeshStandardMaterial({ color: 0x3b3246, roughness: 0.8 });
const pinMat = new THREE.MeshPhysicalMaterial({ color: 0xff4fa3, roughness: 0.25, clearcoat: 0.8 });
function ticketTexture() {
  const Wt = 360, Ht = 150, c = document.createElement('canvas');
  c.width = Wt; c.height = Ht;
  const x = c.getContext('2d');
  // Pale ticket paper with a perforated stub on the right.
  x.fillStyle = '#fbe9a8';
  x.beginPath(); x.roundRect(6, 6, Wt - 12, Ht - 12, 10); x.fill();
  for (let i = 0; i < 500; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(120,80,0,.05)' : 'rgba(255,255,255,.1)'; x.fillRect(6 + Math.random() * (Wt - 12), 6 + Math.random() * (Ht - 12), 2, 2); }
  const tear = Wt * 0.7;
  x.save();
  x.globalCompositeOperation = 'destination-out';
  x.beginPath(); x.arc(tear, 6, 9, 0, TAU); x.arc(tear, Ht - 6, 9, 0, TAU); x.fill();
  x.restore();
  x.setLineDash([5, 6]); x.strokeStyle = 'rgba(90,60,0,.45)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(tear, 20); x.lineTo(tear, Ht - 20); x.stroke();
  x.setLineDash([]);
  x.strokeStyle = 'rgba(90,60,0,.5)'; x.lineWidth = 3;
  x.beginPath(); x.roundRect(16, 16, Wt - 32, Ht - 32, 6); x.stroke();
  x.fillStyle = '#3a2d1a'; x.textBaseline = 'middle';
  x.textAlign = 'left';
  x.font = '800 44px Fredoka, "Arial Rounded MT Bold", sans-serif';
  x.fillText('ADMIT ONE', 32, 58);
  x.font = '600 21px Fredoka, "Arial Rounded MT Bold", sans-serif';
  x.fillStyle = 'rgba(58,45,26,.75)';
  x.fillText((decor.name ? decor.name.toUpperCase() + '  ·  ' : '') + '13 BEADS', 32, 100);
  x.save();
  x.translate(tear + (Wt - tear) / 2, Ht / 2); x.rotate(-Math.PI / 2);
  x.textAlign = 'center';
  x.font = '700 22px Fredoka, "Arial Rounded MT Bold", sans-serif';
  x.fillStyle = '#3a2d1a';
  x.fillText('ROW 13', 0, 0);
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildProps() {
  const grid = wallGrid();
  if (props.group) { display.remove(props.group); props.group.traverse((o) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); }
  for (const l of props.lamps) display.remove(l);
  props.lamps = [];
  props.bulbs = null;
  props.ticket = null;
  const g = new THREE.Group();
  props.group = g;
  display.add(g);
  if (decor.lights) {
    // The wire: pinned at both top corners and the middle, sagging a little between.
    const top = H / 2 - 9, sag = Math.min(20, W * 0.05), pts = [];
    const anchors = [-W / 2 + 10, 0, W / 2 - 10];
    for (let k = 0; k < 2; k++) {
      const a = anchors[k], b = anchors[k + 1];
      for (let i = k ? 1 : 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(lerp(a, b, t), top - Math.sin(t * Math.PI) * sag, 18)); }
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.6, 5), wireMat);
    wire.userData.own = true;
    g.add(wire);
    const n = Math.max(8, Math.round(W / 30)), bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(3.4, 12, 10), bulbMat, n);
    const m = new THREE.Matrix4(), capGeo = new THREE.CylinderGeometry(1.4, 1.6, 3.4, 8), caps = new THREE.InstancedMesh(capGeo, wireMat, n);
    for (let i = 0; i < n; i++) {
      const p = curve.getPointAt((i + 0.5) / n);
      m.makeTranslation(p.x, p.y - 6, p.z);
      bulbs.setMatrixAt(i, m);
      m.makeTranslation(p.x, p.y - 2, p.z);
      caps.setMatrixAt(i, m);
    }
    bulbs.userData.own = caps.userData.own = true;
    g.add(bulbs, caps);
    props.bulbs = bulbs;
    for (const px of [-W / 4, W / 4]) {
      const l = new THREE.PointLight(0xffc987, 0, Math.max(W, H) * 0.8, 1.6);
      l.position.set(px, top - sag - 10, 60);
      display.add(l);
      props.lamps.push(l);
    }
  }
  if (decor.ticket) {
    const w = clamp(W * 0.32, 112, 160), h = w * (150 / 360);
    const tk = new THREE.Group();
    const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: ticketTexture(), transparent: true, roughness: 1, alphaTest: 0.2 }));
    card.userData.own = true;
    tk.add(card);
    // A pushpin through the top left corner.
    const head = new THREE.Mesh(new THREE.SphereGeometry(4.2, 14, 10), pinMat), pin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 9, 6).rotateX(Math.PI / 2), wireMat);
    head.position.set(-w / 2 + 12, h / 2 - 10, 7);
    pin.position.set(-w / 2 + 12, h / 2 - 10, 2);
    head.userData.own = pin.userData.own = true;
    tk.add(head, pin);
    tk.position.set(-W * 0.2, H / 2 - grid.bottom - 44, 4);
    tk.rotation.z = -0.1;
    g.add(tk);
    props.ticket = card;
  }
}
let stack = [];
let rings = [], grabRing = null;
try { const st = JSON.parse(localStorage.getItem('13beads.stack') || '[]'); if (Array.isArray(st)) stack = st.map(entryOf).filter(Boolean); } catch (e) { /* optional */ }
function saveStack() { if (visit) return; try { localStorage.setItem('13beads.stack', JSON.stringify(stack)); } catch (e) { /* optional */ } }
const tradedCount = () => stack.filter((e) => e.t === 'trade').length;
function syncStack() {
  const n = stack.length, t = tradedCount();
  $('wallCount').textContent = n;
  $('wallCount').hidden = !n || mode === 'stack';
  const line = n + (n === 1 ? ' bracelet' : ' bracelets');
  $('wallLine').textContent = visit ? 'Visiting a wall · ' + line + '. Tap one to take a copy.' : n ? line + ' on your wall' + (t ? ' · ' + t + ' traded' : '') : 'Nothing on display yet';
  $('hungTitle').textContent = visit ? 'Their wall · ' + n : n ? 'On your wall · ' + n + (t ? ' · ' + t + ' traded' : '') : 'On your wall';
  $('stackBtn').setAttribute('aria-label', n ? 'Your wall, ' + n + ' on display' : 'Your wall');
  $('photoBtn').disabled = !n;
}
// The wall's main button says where it goes: back to a string in progress, or a fresh one.
function stringInProgress() {
  const current = defs();
  return current.length > 0 && !isStarterList(current);
}
function syncAnother() {
  const back = stringInProgress();
  $('anotherLabel').textContent = visit ? 'Back to my wall' : back ? 'Back to my string' : 'Make another';
  $('another').querySelector('.another-plus').hidden = back || !!visit;
}
// A bracelet's phrase: letters in a row form a word; any other bead between them becomes a space.
const phraseOf = (list) => list.map((d) => (d && d.k === 'letter' ? (d.ch === HEART ? '♥' : d.ch) : ' ')).join('').replace(/\s+/g, ' ').trim();
const entryName = (e) => phraseOf(e.b) || 'Bracelet with ' + e.b.length + ' beads';
// Wide screens list the bracelets on the wall beside it, each with Edit and Take off, so nobody has to press and hold.
function buildHungList() {
  const ul = $('hungList');
  ul.textContent = '';
  rings.forEach((r, i) => {
    const e = r.entry, name = entryName(e);
    const li = document.createElement('li'), label = document.createElement('span'), tag = document.createElement('span'), edit = document.createElement('button'), off = document.createElement('button');
    label.className = 'hung-name';
    label.textContent = name;
    tag.className = 'hung-tag';
    tag.textContent = [e.n, fmtDate(e.d)].filter(Boolean).join(' · ');
    label.appendChild(tag);
    edit.type = 'button'; edit.className = 'tint-btn'; edit.textContent = 'Edit';
    edit.setAttribute('aria-label', 'Edit ' + name);
    off.type = 'button'; off.className = 'quiet-danger small'; off.textContent = 'Take off';
    off.setAttribute('aria-label', 'Take ' + name + ' off the wall');
    edit.addEventListener('click', () => { popRing = rings[i]; popOpener = null; $('editRing').click(); });
    off.addEventListener('click', () => { popRing = rings[i]; popOpener = $('another'); $('takeOff').click(); });
    li.append(label, edit, off);
    ul.appendChild(li);
  });
}
// The shape of a bracelet hanging from a peg: narrow at the top where the cord sits on the peg, round at the
// bottom. Traced from the peg down the left side, along the bottom left to right, and back up, so beads along
// the bottom read in order.
function loopPath(R, M = 120) {
  const k = 0.38, c = R * 1.15, pts = [];
  let mx = 0;
  for (let i = 0; i <= M; i++) {
    const t = (i / M) * TAU, x = -Math.sin(t) * (1 - k * Math.cos(t));
    mx = Math.max(mx, Math.abs(x));
    pts.push({ x, y: -c * (1 - Math.cos(t)) });
  }
  for (const p of pts) p.x *= R / mx;
  return pts;
}
// The paper tag: kraft card with an eyelet, the name in the display face and the date under it. A traded bracelet
// gets a blush card with a "Traded" ink stamp.
function tagTexture(entry) {
  const Wt = 320, Ht = 196, c = document.createElement('canvas');
  c.width = Wt; c.height = Ht;
  const x = c.getContext('2d');
  const trade = entry.t === 'trade';
  x.fillStyle = trade ? '#f9dde8' : '#e8d8bb';
  x.beginPath(); x.roundRect(8, 8, Wt - 16, Ht - 16, 22); x.fill();
  for (let i = 0; i < 700; i++) {
    x.fillStyle = Math.random() < 0.5 ? 'rgba(80,50,20,.05)' : 'rgba(255,255,255,.08)';
    x.fillRect(8 + Math.random() * (Wt - 16), 8 + Math.random() * (Ht - 16), 2, 2);
  }
  // The eyelet: a punched hole with a thin brass ring at the top, where the thread goes through.
  x.save();
  x.globalCompositeOperation = 'destination-out';
  x.beginPath(); x.arc(Wt / 2, 30, 10, 0, TAU); x.fill();
  x.restore();
  x.strokeStyle = '#d2b06a'; x.lineWidth = 5;
  x.beginPath(); x.arc(Wt / 2, 30, 12.5, 0, TAU); x.stroke();
  if (trade) {
    // An ink stamp across the top right corner.
    x.save();
    x.translate(Wt - 86, 58); x.rotate(-0.2); x.globalAlpha = 0.62;
    x.strokeStyle = '#d6336c'; x.lineWidth = 5;
    x.beginPath(); x.roundRect(-68, -23, 136, 46, 8); x.stroke();
    x.fillStyle = '#d6336c'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 31px Fredoka, "Arial Rounded MT Bold", sans-serif';
    x.fillText('TRADED', 0, 1);
    x.restore();
  }
  const name = entry.n || '', date = fmtDate(entry.d);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  let size = 52;
  const room = Wt - 48;
  for (; size > 30; size -= 2) { x.font = `700 ${size}px Fredoka, "Arial Rounded MT Bold", sans-serif`; if (x.measureText(name).width <= room) break; }
  let shown = name;
  while (shown.length > 1 && x.measureText(shown + '…').width > room) shown = shown.slice(0, -1);
  if (shown !== name) shown += '…';
  x.textAlign = 'center';
  x.fillStyle = '#2a2235';
  x.fillText(shown, Wt / 2, date ? 122 : 134);
  if (date) {
    x.font = '500 30px Fredoka, "Arial Rounded MT Bold", sans-serif';
    x.fillStyle = 'rgba(42,34,53,.62)';
    x.fillText(date, Wt / 2, 164);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// The tag hangs from the peg on its own thread, inside the loop where the bracelet is bare, the way a shop tag sits.
function makeTag(entry, R) {
  const w = clamp(R * 1.18, 58, 104), h = w * (196 / 320);
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tagTexture(entry), transparent: true, roughness: 1, alphaTest: 0.2 }));
  card.castShadow = false;
  const tilt = -0.05;
  g.position.set(R * 0.02, -R * 0.66 - h / 2, 14);
  g.rotation.z = tilt;
  g.add(card);
  // The thread runs from the peg to the eyelet at the top of the card.
  const hole = new THREE.Vector3(0, h / 2 - h * (30 / 196), 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt).add(g.position);
  const thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 2, 10), hole), 1, 0.7, 5), stringMat);
  const redraw = () => { const old = card.material.map; card.material.map = tagTexture(entry); card.material.needsUpdate = true; if (old) old.dispose(); };
  return { g, thread, redraw };
}
// A bracelet on its peg. The group's origin is the point of the cord resting on the peg, so a swing turns it there.
function buildRing(entry, grid) {
  const list = entry.b.filter((d) => d && UNIT[d.k]);
  const lay = layoutCords(list), U = lay.U, R = grid.R;
  const path = loopPath(R), cum = cumOf(path), Lp = cum[cum.length - 1];
  const S = Math.min(grid.S, (Lp * 0.9) / Math.max(U, 1));
  const g = new THREE.Group(), loop = new THREE.Group(), hangs = [];
  // Distance along the cord: the middle of the bead run sits at the bottom of the loop.
  const sAt = (u) => Lp / 2 + u * S;
  // Two strands sit side by side around the loop, meeting at shared beads and at the peg.
  const half = Lp / S / 2, gapAt = (u) => (lay.two ? S * 0.56 * cordGap(u, lay.joins, -half, half, 1.05) : 0);
  const at = (u, sd) => {
    const p = pointAt(path, cum, sAt(u)), gp = sd * gapAt(u);
    return { x: p.x - Math.sin(p.a) * gp, y: p.y + Math.cos(p.a) * gp, a: p.a };
  };
  list.forEach((d, i) => {
    const o = makeBead(d), u = lay.off[i], p = at(u, lay.side[i]);
    if (o.userData.cup) o.userData.cup.rotation.y = capFacing(list, i) > 0 ? 0 : Math.PI;
    o.scale.setScalar(S);
    o.position.set(p.x, p.y, 0);
    o.rotation.set(0, 0, p.a);
    // Hanging charms hang straight down whatever the cord's angle there.
    if (o.userData.hang) { o.userData.hang.rotation.set(0, 0, -p.a); hangs.push(o); }
    loop.add(o);
  });
  const tubeOf = (pts) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.9, 6, true), stringMat);
  if (!lay.two) loop.add(tubeOf(path.slice(0, -1).map((p) => new THREE.Vector3(p.x, p.y, 0))));
  else {
    for (const sd of [-1, 1]) {
      const pts = [];
      for (let i = 0; i < path.length - 1; i++) { const p = at((cum[i] - Lp / 2) / S, sd); pts.push(new THREE.Vector3(p.x, p.y, 0)); }
      loop.add(tubeOf(pts));
    }
  }
  // The knot sits on the peg, its tails hanging down the front.
  const kn = knot.clone();
  kn.visible = true;
  kn.scale.setScalar(S / 30);
  kn.rotation.z = Math.PI;
  kn.position.set(0, 1, 3);
  loop.add(kn);
  const tag = makeTag(entry, R);
  g.add(loop, tag.g, tag.thread);
  // Shadows from the loop land on the rail and the wall below it.
  loop.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, loop, tag, R, S, hangs, entry, a: 0, av: 0, fly: 0, lift: 0, x: 0, y: 0, tx: 0, ty: 0, slot: 0, sx: 0, sy: 0, rx: R, ry: R, drag: null };
}
// Newest bracelet on the first peg, the rest along the rails in order. Bracelets already hanging keep their
// place on screen and glide to a new peg when one is added, taken off, or moved.
function rebuildStack() {
  const grid = wallGrid();
  standKey = [grid.cols, Math.round(grid.R), grid.rows, Math.round(W / 30), Math.round(H / 30)].join('|');
  const was = new Map(rings.map((r) => [r.entry, { x: r.x, y: r.y, a: r.a, av: r.av }]));
  rings.forEach((r) => r.g.parent && r.g.parent.remove(r.g));
  buildStand(grid);
  buildProps();
  rings = stack.slice().reverse().map((e) => buildRing(e, grid));
  rings.forEach((r, i) => {
    const p = slotPos(i, grid), old = was.get(r.entry);
    r.slot = i;
    r.tx = p.x; r.ty = p.y;
    r.x = old ? old.x : p.x; r.y = old ? old.y : p.y;
    if (old) { r.a = old.a; r.av = old.av; }
    r.g.position.set(r.x, r.y, 10);
    display.add(r.g);
  });
  buildRingButtons();
  buildHungList();
}
const tmpV = new THREE.Vector3();
function toScreen(obj, x, y) {
  tmpV.set(x, y, 0);
  obj.localToWorld(tmpV);
  tmpV.project(camera);
  return { x: ((tmpV.x + 1) / 2) * W, y: ((1 - tmpV.y) / 2) * H };
}
// Keyboard and screen reader access: one focusable button per hanging bracelet, kept over it each frame.
let kbRing = null;
function braceletName(e) {
  const word = e.b.filter((d) => d && d.k === 'letter').map((d) => d.ch).join('');
  return (word ? 'Bracelet that says ' + word : 'Bracelet with ' + e.b.length + ' beads') + (e.n ? ', tagged ' + e.n : '');
}
function buildRingButtons() {
  const box = $('ringBtns');
  const hadFocus = box.contains(document.activeElement) ? [...box.children].indexOf(document.activeElement) : -1;
  box.textContent = '';
  kbRing = null;
  rings.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ring-btn';
    b.setAttribute('aria-label', braceletName(r.entry) + ', ' + (i + 1) + ' of ' + rings.length + '. Press Enter for its options.');
    b.addEventListener('focus', () => { kbRing = r; scrollToRing(r); });
    b.addEventListener('blur', () => { if (kbRing === r) kbRing = null; });
    b.addEventListener('click', () => { if (rings.includes(r)) openPop(r, b); });
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); openPop(r, b); }
      // Arrow keys move between bracelets.
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); const n = box.children[clamp(i + step, 0, rings.length - 1)]; if (n) n.focus(); }
    });
    r.btn = b;
    box.appendChild(b);
  });
  if (hadFocus >= 0) {
    const n = box.children[Math.min(hadFocus, box.children.length - 1)];
    if (n) n.focus(); else $('another').focus();
  }
}
// Hanging a finished bracelet: it goes on the first peg and everything else shifts along a peg.
function wear() {
  if (!beads.length) return;
  const back = trade ? trade.saved : [];
  const entry = { b: defs(), n: trade ? cleanTag(trade.note) || 'A trade' : tagDefault(), d: today() };
  if (trade) { entry.t = 'trade'; trade = null; tradeUI(); }
  stack.push(entry);
  if (stack.length > 24) stack.shift();
  saveStack();
  scrollY = 0; scrollV = 0;
  rebuildStack();
  const r = rings[0];
  if (r && !reduce) {
    // It flies up from where the string was, lands on its peg, and swings.
    r.fly = 1;
    r.fromX = 0; r.fromY = -H / 2 - r.R * 2.4;
    r.x = r.fromX; r.y = r.fromY;
    whoosh();
  }
  pushUndo();
  setBeads(back);
  sync();
  kLin = 0;
  setMode('stack');
}
// Scrolling the room: a tall wall moves up and down under a finger, a mouse wheel, or keyboard focus.
let scrollY = 0, scrollV = 0, scrollTo = null;
const scrollMax = () => Math.max(0, wallGrid().total - H);
function scrollToRing(r) {
  const top = H / 2 - r.ty, bottom = top + r.R * 2.75 + 10;
  const lo = bottom - H + 20, hi = top - 20;
  scrollTo = clamp(scrollY, lo, hi);
}
function updateStack(dt) {
  wall.scale.set(W * 1.4, H * 1.4, 1);
  const grid = wallGrid();
  if ([grid.cols, Math.round(grid.R), grid.rows, Math.round(W / 30), Math.round(H / 30)].join('|') !== standKey) rebuildStack();
  if (scrollTo != null) { scrollY += (scrollTo - scrollY) * Math.min(1, dt * 10); if (Math.abs(scrollTo - scrollY) < 0.5) scrollTo = null; }
  else if (!(spin && spin.scrolling)) { scrollY += scrollV * dt; scrollV *= Math.pow(0.08, dt); }
  scrollY = clamp(scrollY, 0, scrollMax());
  room.position.y = scrollY;
  {
    // The sign sits in the band between the top of the first rail and the top of the screen.
    const topY = H / 2 - grid.top, lo = topY + 24, hi = H / 2 - 50;
    const signH = clamp((hi - lo) * 1.25, 60, 110), signW = Math.min(signH * (NEON_W / NEON_H), W * 0.92);
    neon.scale.set(signW, signW * (NEON_H / NEON_W), 1);
    neon.position.set(0, clamp(lo + signH * 0.45 + 6, lo + 10, Math.max(lo + 10, (lo + hi) / 2)), -60);
    neonGlow.position.set(0, neon.position.y + scrollY, 60);
    lamp.position.set(W * 0.42, -H * 0.3, 220);
  }
  const rest = tiltS * 0.35;
  rings.forEach((r) => {
    // Flying up to the peg after "Add to my wall": an arc from below, then a swing on landing.
    if (r.fly > 0) {
      r.fly = Math.max(0, r.fly - dt / 0.75);
      const t = ease(1 - r.fly);
      r.x = lerp(r.fromX, r.tx, t);
      r.y = lerp(r.fromY, r.ty, t) + Math.sin(t * Math.PI) * 50;
      if (r.fly === 0) { thud(); chime(); buzz(25); r.av += 3.2; }
    } else if (r.drag) {
      r.x += (r.drag.x - r.x) * Math.min(1, dt * 22);
      r.y += (r.drag.y - r.y) * Math.min(1, dt * 22);
      r.av -= (r.x - (r.px ?? r.x)) * 0.25;
    } else {
      const k = reduce ? 1 : Math.min(1, dt * 9);
      r.x += (r.tx - r.x) * k;
      r.y += (r.ty - r.y) * k;
    }
    r.px = r.x;
    // A pendulum: each loop swings about its peg and settles; tilting the phone leans them all.
    r.av += ((rest - r.a) * 40 - r.av * 1.7) * dt;
    r.a = clamp(r.a + r.av * dt, -0.9, 0.9);
    if (reduce) { r.a = 0; r.av = 0; }
    const want = popRing === r || kbRing === r || r.drag || (spin && spin.lift && spin.ring === r) ? 1 : 0;
    r.lift = lerp(r.lift, want, reduce ? 1 : Math.min(1, dt * 14));
    r.g.position.set(r.x, r.y, 10 + r.lift * 36);
    r.g.rotation.z = r.a;
    r.g.scale.setScalar(1 + r.lift * 0.06);
    // Where the bracelet is on screen: its center and half-widths, for pointer hits and the keyboard button.
    r.g.updateWorldMatrix(true, false);
    const c = toScreen(r.g, 0, -r.R * 1.15), e = toScreen(r.g, r.R + r.S, 0), f = toScreen(r.g, 0, -r.R * 2.3 - r.S);
    r.sx = c.x; r.sy = c.y; r.rx = Math.max(10, Math.abs(e.x - c.x)); r.ry = Math.max(10, Math.abs(f.y - c.y));
    if (r.btn) {
      r.btn.style.width = r.rx * 2 + 'px';
      r.btn.style.height = r.ry * 2 + 'px';
      r.btn.style.transform = `translate(${r.sx - r.rx}px, ${r.sy - r.ry}px)`;
    }
  });
}
// Which bracelet is under the pointer (stage pixels, y down): the nearest one whose loop the point falls in.
function ringAt(p) {
  let best = null, bd = 1e9;
  for (const r of rings) {
    const dx = (p.x - r.sx) / (r.rx + 6), dy = (p.y - r.sy) / (r.ry + 6);
    const d = dx * dx + dy * dy;
    if (d < 1 && d < bd) { bd = d; best = r; }
  }
  return best;
}
// Which peg is nearest the pointer, for dropping a dragged bracelet.
function slotAt(p) {
  const grid = wallGrid();
  const x = p.x - W / 2, y = H / 2 - p.y - scrollY;
  let best = 0, bd = 1e9;
  for (let i = 0; i < rings.length; i++) {
    const s = slotPos(i, grid), d = Math.hypot(x - s.x, y - (s.y - grid.R * 1.1));
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
// While a bracelet is being dragged, the others step aside so its new peg is free.
function previewOrder(r, slot) {
  if (rings[slot] === r) return;
  rings.splice(rings.indexOf(r), 1);
  rings.splice(slot, 0, r);
  const grid = wallGrid();
  rings.forEach((o, i) => { const s = slotPos(i, grid); o.slot = i; o.tx = s.x; o.ty = s.y; if (o !== r) o.av += (Math.random() - 0.5) * 1.2; });
  tick(1.1 + slot * 0.03, 0.05);
}
// Is the pointer on the neon sign's word? (Stage pixels, y down.) A tap there opens the sign editor.
function signAt(p) {
  if (mode !== 'stack' || !neon.visible) return false;
  const c = toScreen(neon, 0, 0), e = toScreen(neon, 0.5, 0.5);
  const hw = Math.max(60, Math.abs(e.x - c.x) * signFrac + 16), hh = Math.max(28, Math.abs(e.y - c.y) * 0.7);
  return Math.abs(p.x - c.x) < hw && Math.abs(p.y - c.y) < hh;
}

// The confirm popover sits just below the picked bracelet, or above it if there is no room.
let popRing = null, holdTimer = 0, popOpener = null;
function openPop(r, opener) {
  closeCustom(false);
  popRing = r;
  popOpener = opener || r.btn || null;
  buzz(30);
  tick(0.9, 0.1);
  const pop = $('pop'), e = r.entry;
  $('popTitle').textContent = phraseOf(e.b) || 'This bracelet';
  $('tagName').value = e.n || '';
  syncTagSrc(e);
  $('tagDate').textContent = e.d ? 'Hung ' + fmtDate(e.d) : 'Hung a while ago';
  pop.hidden = false;
  pop.style.left = pop.style.top = '';
  if (!wideCase.matches) { $('editRing').focus({ preventScroll: true }); return; }
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const cx = r.sx, top = r.sy - r.ry, bottom = r.sy + r.ry;
  let y = bottom + 8;
  if (y + ph > H - 74) y = top - ph - 8;
  pop.style.left = clamp(cx - pw / 2, 10, W - pw - 10) + 'px';
  pop.style.top = clamp(y, 10, H - ph - 10) + 'px';
  $('editRing').focus({ preventScroll: true });
}
function closePop(restore = true) {
  if (!popRing) return;
  popRing = null;
  $('pop').hidden = true;
  if (restore && popOpener && popOpener.isConnected) popOpener.focus({ preventScroll: true });
  popOpener = null;
}
// Keep Tab inside an open popover, the way a dialog should behave.
function trapTab(e, box) {
  if (e.key !== 'Tab') return;
  const f = [...box.querySelectorAll('button, input:checked, input[type="text"]')].filter((el) => !el.disabled);
  if (!f.length) return;
  const first = f[0], lastEl = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
  else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
}
$('pop').addEventListener('keydown', (e) => trapTab(e, $('pop')));
$('popClose').addEventListener('click', () => closePop());
// The tag: its name, and whether the bracelet was made here or traded for. Changes redraw the tag on the wall.
function syncTagSrc(e) {
  document.querySelectorAll('#tagSrc .seg').forEach((b) => b.setAttribute('aria-checked', (b.dataset.src === 'trade') === (e.t === 'trade') ? 'true' : 'false'));
}
let tagTimer = 0;
$('tagName').addEventListener('input', (e) => {
  const v = cleanTag(e.target.value);
  clearTimeout(tagTimer);
  tagTimer = setTimeout(() => {
    if (!popRing) return;
    popRing.entry.n = v;
    saveStack();
    popRing.tag.redraw();
    buildHungList();
  }, 180);
});
document.querySelectorAll('#tagSrc .seg').forEach((b) => b.addEventListener('click', () => {
  if (!popRing) return;
  const e = popRing.entry;
  if (b.dataset.src === 'trade') e.t = 'trade'; else delete e.t;
  syncTagSrc(e);
  saveStack();
  popRing.tag.redraw();
  syncStack();
  buildHungList();
  tick(b.dataset.src === 'trade' ? 1.3 : 1.0, 0.08);
}));

// Decorate popover: wall color and the neon sign word, saved on this device.
function saveDecor() { try { localStorage.setItem('13beads.wall', JSON.stringify(decor)); } catch (e) { /* optional */ } }
function applyDecor() {
  const old = wall.material.map;
  wall.material.map = paintTexture(decor.color);
  wall.material.needsUpdate = true;
  if (old) old.dispose();
  if (neonMaps.on) { neonMaps.on.dispose(); neonMaps.off.dispose(); neonMaps.on = null; }
  applyMood();
}
// Show the saved wall color, sign color, and sign word in the Decorate controls.
function fillCustom() {
  const box = $('custom');
  box.querySelector(`input[name="wallColor"][value="${decor.color}"]`).checked = true;
  box.querySelector(`input[name="signColor"][value="${decor.neon}"]`).checked = true;
  $('signText').value = decor.sign;
  $('playerName').value = decor.name;
  $('propLights').checked = decor.lights;
  $('propTicket').checked = decor.ticket;
}
function openCustom(focusSign = false) {
  closePop(false);
  const box = $('custom');
  box.hidden = false;
  $('customBtn').setAttribute('aria-expanded', 'true');
  fillCustom();
  if (focusSign) { const f = $('signText'); f.focus({ preventScroll: true }); f.select(); }
  else box.querySelector('input:checked').focus({ preventScroll: true });
}
function closeCustom(restore = true) {
  const box = $('custom');
  if (box.hidden) return;
  box.hidden = true;
  $('customBtn').setAttribute('aria-expanded', 'false');
  if (!decor.sign) { decor.sign = SIGN_DEFAULT; saveDecor(); applyDecor(); }
  if (restore) $('customBtn').focus({ preventScroll: true });
}
$('customBtn').addEventListener('click', () => { if ($('custom').hidden) openCustom(); else closeCustom(); });
$('customDone').addEventListener('click', () => closeCustom());
$('customClose').addEventListener('click', () => closeCustom());
$('custom').addEventListener('keydown', (e) => trapTab(e, $('custom')));
$('custom').addEventListener('change', (e) => {
  if (e.target.name === 'signColor') { decor.neon = e.target.value; saveDecor(); applyDecor(); tick(1.2, 0.08); return; }
  if (e.target.name === 'lights' || e.target.name === 'ticket') { decor[e.target.name] = e.target.checked; saveDecor(); buildProps(); applyMood(); tick(e.target.checked ? 1.3 : 0.9, 0.08); return; }
  if (e.target.name !== 'wallColor') return;
  decor.color = e.target.value;
  saveDecor();
  applyDecor();
  tick(1.1, 0.08);
});
// The player's name: new tags carry it, placeholder "Mine" tags take it, and the sign reads "<name>'s beads" unless
// the player has already written their own sign.
let nameTimer = 0;
$('playerName').addEventListener('input', (e) => {
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    const was = decor.name, name = cleanName(e.target.value);
    if (name === was) return;
    const autoSign = !decor.sign || decor.sign === SIGN_DEFAULT || (was && decor.sign === nameSign(was));
    decor.name = name;
    if (autoSign) { decor.sign = name ? nameSign(name) : SIGN_DEFAULT; $('signText').value = decor.sign; }
    let retag = false;
    for (const en of stack) if (en.n === 'Mine' || (was && en.n === was)) { en.n = name || 'Mine'; retag = true; }
    saveDecor();
    saveStack();
    applyDecor();
    if (retag) { rings.forEach((r) => r.tag.redraw()); buildHungList(); }
    buildProps();
  }, 220);
});
let signTimer = 0;
$('signText').addEventListener('input', (e) => {
  const v = cleanSign(e.target.value);
  if (v !== e.target.value) e.target.value = v;
  clearTimeout(signTimer);
  signTimer = setTimeout(() => { decor.sign = v.trim(); saveDecor(); if (decor.sign) applyDecor(); }, 180);
});

/* ---------- Photo: save the current view as a picture ---------- */
function savePhoto() {
  const css = getComputedStyle(document.documentElement);
  const pr = renderer.getPixelRatio();
  renderer.setPixelRatio(Math.max(2, Math.min(3, pr * 1.5)));
  renderer.setSize(W, H, false);
  const sparkWas = sparks.visible;
  sparks.visible = false;
  renderer.render(scene, camera);
  const k = cv.width / W, foot = Math.round(64 * k);
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height + foot;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(c.width / 2, 0, 0, c.width / 2, 0, c.height * 1.1);
  g.addColorStop(0, css.getPropertyValue('--stage-a').trim() || '#fff6fb');
  g.addColorStop(1, css.getPropertyValue('--stage-b').trim() || '#e2d6f1');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(cv, 0, 0);
  // Wordmark as a row of letter beads on a string.
  const chars = ['1', '3', '', 'B', 'E', 'A', 'D', 'S'], t = 26 * k, gap = 4 * k;
  const total = chars.reduce((w, ch) => w + (ch ? t : t * 0.5) + gap, -gap);
  let px = (c.width - total) / 2;
  const py = cv.height + (foot - t) / 2 - 6 * k;
  x.fillStyle = css.getPropertyValue('--string').trim() || '#7f7398';
  x.fillRect(px - 10 * k, py + t / 2 - k, total + 20 * k, 2 * k);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 ${16 * k}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
  for (const ch of chars) {
    const w = ch ? t : t * 0.5;
    x.fillStyle = ch ? '#ffffff' : '#d3217c';
    x.beginPath(); x.roundRect(px, py, w, t, 7 * k); x.fill();
    if (ch) { x.fillStyle = '#1c1830'; x.fillText(ch, px + w / 2, py + t / 2 + k); }
    px += w + gap;
  }
  renderer.setPixelRatio(pr);
  renderer.setSize(W, H, false);
  sparks.visible = sparkWas;
  c.toBlob(async (blob) => {
    if (!blob) { say('The photo could not be made in this browser.'); return; }
    const file = new File([blob], '13-beads-bracelet.png', { type: 'image/png' });
    // Phones get the share sheet, so the photo can go straight to messages or the camera roll.
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '13 Beads' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say('Photo saved as 13-beads-bracelet.png.');
  }, 'image/png');
}

/* ---------- Share card: a story-sized picture of the tied bracelet, with its phrase, the date, and a gift tag ---------- */
function openShare() {
  closePop(false);
  closeCustom(false);
  $('shareCard').hidden = false;
  $('shareBtn').setAttribute('aria-expanded', 'true');
  cardPreview();
  $('cardNote').focus({ preventScroll: true });
}
// A small live preview of the story card, redrawn as the gift tag note changes.
let previewTimer = 0;
function cardPreview() {
  if (mode !== 'tied') return;
  const note = $('cardNote').value.replace(/\s+/g, ' ').trim().slice(0, 40);
  const c = cardCanvas(note), t = document.createElement('canvas');
  t.width = 216; t.height = 384;
  t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
  $('cardThumb').src = t.toDataURL('image/jpeg', 0.85);
}
function tradeLink() {
  const note = $('cardNote').value.replace(/\s+/g, ' ').trim().slice(0, 40);
  return location.origin + location.pathname + '#t=' + encodeBracelet(defs()) + (note ? '&n=' + encodeURIComponent(note) : '');
}
$('sendLink').addEventListener('click', async () => {
  const url = tradeLink(), btn = $('sendLink');
  // Phones open the share sheet; computers copy the link.
  if (matchMedia('(pointer: coarse)').matches && navigator.share) {
    try { await navigator.share({ title: '13 Beads', text: 'I made you a bracelet.', url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const label = btn.querySelector('span');
  try { await navigator.clipboard.writeText(url); label.textContent = 'Link copied'; } catch (e) { label.textContent = 'Copy failed'; }
  say(label.textContent + '.');
  setTimeout(() => { label.textContent = 'Send link'; }, 2200);
});
$('showQr').addEventListener('click', () => {
  const box = $('qrBox'), open = box.hidden;
  box.hidden = !open;
  $('showQr').setAttribute('aria-expanded', open ? 'true' : 'false');
  if (!open) return;
  const qr = qrcode(0, 'M');
  qr.addData(tradeLink());
  qr.make();
  const n = qr.getModuleCount(), c = $('qrCanvas'), x = c.getContext('2d'), q = 2, cell = Math.floor(c.width / (n + q * 2)), off = Math.floor((c.width - cell * n) / 2);
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#1c1830';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) x.fillRect(off + col * cell, off + r * cell, cell, cell);
});
$('cardNote').addEventListener('input', () => {
  if (!$('qrBox').hidden) { $('qrBox').hidden = true; $('showQr').click(); }
  clearTimeout(previewTimer);
  previewTimer = setTimeout(cardPreview, 400);
});
function closeShare(restore = true) {
  if ($('shareCard').hidden) return;
  $('shareCard').hidden = true;
  $('qrBox').hidden = true;
  $('showQr').setAttribute('aria-expanded', 'false');
  $('shareBtn').setAttribute('aria-expanded', 'false');
  if (restore && !wideCase.matches) $('shareBtn').focus({ preventScroll: true });
}
function deliverPng(c, name, done) {
  c.toBlob(async (blob) => {
    if (!blob) { say('The picture could not be made in this browser.'); return; }
    const file = new File([blob], name, { type: 'image/png' });
    // Phones get the share sheet, so the picture can go straight to stories, messages, or the camera roll.
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '13 Beads' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say(done);
  }, 'image/png');
}
// The 13 BEADS wordmark as a row of letter beads on a string, centered at (cx, cy), t pixels tall.
function drawMark(x, cx, cy, t, stringColor) {
  const chars = ['1', '3', '', 'B', 'E', 'A', 'D', 'S'], gap = t * 0.15;
  const total = chars.reduce((w, ch) => w + (ch ? t : t * 0.5) + gap, -gap);
  let px = cx - total / 2;
  const py = cy - t / 2;
  x.fillStyle = stringColor;
  x.fillRect(px - t * 0.4, cy - t * 0.04, total + t * 0.8, t * 0.08);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 ${t * 0.62}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
  for (const ch of chars) {
    const w = ch ? t : t * 0.5;
    x.save();
    x.shadowColor = 'rgba(30,15,40,.25)'; x.shadowBlur = t * 0.12; x.shadowOffsetY = t * 0.05;
    x.fillStyle = ch ? '#ffffff' : '#d3217c';
    x.beginPath(); x.roundRect(px, py, w, t, t * 0.27); x.fill();
    x.restore();
    if (ch) { x.fillStyle = '#1c1830'; x.fillText(ch, px + w / 2, cy + t * 0.04); }
    px += w + gap;
  }
}
function shareCard(note) {
  deliverPng(cardCanvas(note), '13-beads-card.png', 'Card saved as 13-beads-card.png.');
}
function cardCanvas(note) {
  const css = getComputedStyle(document.documentElement), v = (n, f) => css.getPropertyValue(n).trim() || f;
  const ink = v('--ink', '#1c1830'), muted = v('--muted', '#6b6280');
  // Render the stage sharp, then cut a square around the tied loop.
  const pr = renderer.getPixelRatio();
  renderer.setPixelRatio(Math.max(2, Math.min(3, pr * 1.5)));
  renderer.setSize(W, H, false);
  const sparkWas = sparks.visible;
  sparks.visible = false;
  renderer.render(scene, camera);
  const k = cv.width / W, R = Math.min(W, H) * 0.33, side = Math.min(R * 2.9, W, H);
  const sx = clamp(W / 2 - side / 2, 0, W - side), sy = clamp(H / 2 + R * 0.06 - side / 2, 0, H - side);
  const CW = 1080, CH = 1920, c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, v('--stage-a', '#fff6fb'));
  g.addColorStop(1, v('--stage-b', '#e2d6f1'));
  x.fillStyle = g;
  x.fillRect(0, 0, CW, CH);
  drawMark(x, CW / 2, 150, 62, v('--string', '#7f7398'));
  // The bracelet, in a rounded frame.
  const P = 940, px = (CW - P) / 2, py = 270;
  x.save();
  x.shadowColor = 'rgba(30,15,40,.28)'; x.shadowBlur = 40; x.shadowOffsetY = 14;
  x.beginPath(); x.roundRect(px, py, P, P, 56); x.fillStyle = '#3a2418'; x.fill();
  x.restore();
  x.save();
  x.beginPath(); x.roundRect(px, py, P, P, 56); x.clip();
  x.drawImage(cv, sx * k, sy * k, side * k, side * k, px, py, P, P);
  x.restore();
  renderer.setPixelRatio(pr);
  renderer.setSize(W, H, false);
  sparks.visible = sparkWas;
  // The phrase, the date, and the gift tag.
  // Letters in a row form a word; any other bead between them becomes a space.
  const word = defs().map((d) => (d.k === 'letter' ? d.ch : ' ')).join('').replace(/\s+/g, ' ').trim();
  let y = py + P + 150;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (word) {
    let size = 120;
    x.font = `${size}px Pacifico, "Brush Script MT", cursive`;
    const w = x.measureText(word).width;
    if (w > CW - 140) { size = Math.floor((size * (CW - 140)) / w); x.font = `${size}px Pacifico, "Brush Script MT", cursive`; }
    x.fillStyle = ink;
    x.fillText(word, CW / 2, y);
    y += size * 0.55 + 50;
  } else y -= 40;
  x.font = `500 40px Figtree, system-ui, sans-serif`;
  x.fillStyle = muted;
  x.fillText(new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }), CW / 2, y);
  if (note) {
    // A paper tag on a string, tilted a little.
    y += 150;
    x.save();
    x.translate(CW / 2, y);
    x.rotate(-0.045);
    x.font = `600 46px Fredoka, "Arial Rounded MT Bold", sans-serif`;
    const tw = Math.min(CW - 220, Math.max(380, x.measureText(note).width + 150)), th = 140;
    x.strokeStyle = v('--string', '#7f7398'); x.lineWidth = 4;
    x.beginPath(); x.moveTo(-tw / 2 + 34, 0); x.quadraticCurveTo(-tw / 2 - 40, -70, -tw / 2 - 90, -40); x.stroke();
    x.shadowColor = 'rgba(30,15,40,.18)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
    x.fillStyle = '#fffaf2';
    x.beginPath();
    x.moveTo(-tw / 2 + 50, -th / 2); x.lineTo(tw / 2 - 18, -th / 2); x.quadraticCurveTo(tw / 2, -th / 2, tw / 2, -th / 2 + 18);
    x.lineTo(tw / 2, th / 2 - 18); x.quadraticCurveTo(tw / 2, th / 2, tw / 2 - 18, th / 2); x.lineTo(-tw / 2 + 50, th / 2);
    x.lineTo(-tw / 2, 0); x.closePath(); x.fill();
    x.shadowColor = 'transparent';
    x.fillStyle = v('--stage-b', '#e2d6f1');
    x.beginPath(); x.arc(-tw / 2 + 34, 0, 10, 0, TAU); x.fill();
    x.fillStyle = '#1c1830';
    x.fillText(note, 25, 3, tw - 120);
    x.restore();
  }
  x.font = `500 32px Figtree, system-ui, sans-serif`;
  x.fillStyle = muted;
  x.fillText('games.shauna.digital/13-beads', CW / 2, CH - 70);
  return c;
}

/* ---------- Geometry helpers (2D layout in stage pixels, then lifted into 3D) ---------- */
function cumOf(p) {
  const c = [0];
  for (let i = 1; i < p.length; i++) c[i] = c[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  return c;
}
function pointAt(p, c, s) {
  s = clamp(s, 0, c[c.length - 1]);
  let i = 1;
  while (i < c.length - 1 && c[i] < s) i++;
  const a = p[i - 1], b = p[i], f = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), a: Math.atan2(b.y - a.y, b.x - a.x) };
}

/* ---------- The string: a chain of linked points with gravity (Verlet rope) ---------- */
// The rope's length grows with the bead count, so a fuller string hangs lower. Beads add weight where they sit,
// a finger grabs the nearest point and pulls it, and tilting the phone tips gravity.
const RX = new Float32Array(N + 1), RY = new Float32Array(N + 1), OX = new Float32Array(N + 1), OY = new Float32Array(N + 1);
const RW = new Float32Array(N + 1);
let ropeKey = '', ropeSeg = 0;
function ropeShape(n) {
  return { ay: H * 0.16, sag: lerp(0.14, 1, Math.min(1, usedLen() / BUDGET)) * Math.min(H * 0.6, W * 0.6) };
}
function ropeLength(n) {
  const { ay, sag } = ropeShape(n);
  let L = 0, px = -12, py = ay;
  for (let i = 1; i <= 60; i++) {
    const t = i / 60, x = lerp(-12, W + 12, t), y = ay + sag * 4 * t * (1 - t);
    L += Math.hypot(x - px, y - py); px = x; py = y;
  }
  return L;
}
function resetRope(n) {
  const { ay, sag } = ropeShape(n);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    RX[i] = OX[i] = lerp(-12, W + 12, t);
    RY[i] = OY[i] = ay + sag * 4 * t * (1 - t);
  }
  ropeSeg = ropeLength(n) / N;
}
// Push the rope at a point (0 to 1 along it), in pixels per second.
function kickRope(f, vx, vy) {
  const c = Math.round(clamp(f, 0, 1) * N), k = (reduce ? 0.3 : 1) / 120;
  for (let i = Math.max(1, c - 6); i <= Math.min(N - 1, c + 6); i++) {
    const fall = 1 - Math.abs(i - c) / 7;
    OX[i] -= vx * fall * k; OY[i] -= vy * fall * k;
  }
}
function stepRope(dt, n) {
  const key = W + 'x' + H;
  if (key !== ropeKey) { ropeKey = key; resetRope(n); }
  const ay = H * 0.16;
  // Ease the length toward its target, so adding beads lowers the string smoothly.
  ropeSeg += (ropeLength(n) / N - ropeSeg) * Math.min(1, dt * 6);
  // Weight: each bead loads the point under it.
  RW.fill(1);
  for (const b of beads) {
    if (b.drag || b.s == null) continue;
    const c = Math.round(clamp(b.s / (lineLen || 1), 0, 1) * N);
    if (c > 0 && c < N) RW[c] += UNIT[b.def.k] * 2.2;
  }
  const g = 1400, gx = Math.sin(tiltS * 0.5) * g, gy = Math.cos(tiltS * 0.5) * g;
  const SUB = 3, h = dt / SUB, damp = reduce ? 0.9 : 0.992;
  let gi = -1, fx = 0, fy = 0;
  if (pluck && pluck.armed) {
    if (pluck.i == null) {
      let bd = 1e9;
      for (let i = 1; i < N; i++) { const d = Math.hypot(RX[i] - pluck.x, RY[i] - pluck.y); if (d < bd) { bd = d; pluck.i = i; } }
    }
    gi = pluck.i;
    fx = pluck.x + clamp(pluck.dx, -80, 80); fy = pluck.y + clamp(pluck.dy, -90, 110);
  }
  for (let st = 0; st < SUB; st++) {
    for (let i = 1; i < N; i++) {
      const vx = (RX[i] - OX[i]) * damp, vy = (RY[i] - OY[i]) * damp;
      OX[i] = RX[i]; OY[i] = RY[i];
      RX[i] += vx + gx * h * h; RY[i] += vy + gy * h * h;
    }
    if (gi > 0) { RX[gi] += (fx - RX[gi]) * 0.6; RY[gi] += (fy - RY[gi]) * 0.6; OX[gi] = RX[gi]; OY[gi] = RY[gi]; }
    RX[0] = OX[0] = -12; RY[0] = OY[0] = ay;
    RX[N] = OX[N] = W + 12; RY[N] = OY[N] = ay;
    // Keep each link close to its rest length. A little give makes the cord feel elastic.
    for (let it = 0; it < 14; it++) {
      for (let i = 0; i < N; i++) {
        const dx = RX[i + 1] - RX[i], dy = RY[i + 1] - RY[i], d = Math.hypot(dx, dy) || 1e-6;
        const diff = ((d - ropeSeg) / d) * 0.9;
        const wa = i === 0 || i === gi ? 0 : 1 / RW[i], wb = i + 1 === N || i + 1 === gi ? 0 : 1 / RW[i + 1], ws = wa + wb;
        if (!ws) continue;
        RX[i] += dx * diff * (wa / ws); RY[i] += dy * diff * (wa / ws);
        RX[i + 1] -= dx * diff * (wb / ws); RY[i + 1] -= dy * diff * (wb / ws);
      }
    }
  }
  const line = new Array(N + 1);
  for (let i = 0; i <= N; i++) line[i] = { x: RX[i], y: RY[i] };
  return line;
}

function burst() {
  if (reduce) return;
  const R = Math.min(W, H) * 0.33;
  confetti.length = 0;
  for (let i = 0; i < STAR_N + LEAF_N; i++) {
    const leaf = i >= STAR_N, a = Math.random() * TAU, sp = 120 + Math.random() * 260;
    // Pops out from around the loop and up, then floats down.
    confetti.push({
      leaf, idx: leaf ? i - STAR_N : i,
      x: Math.cos(a) * R * 0.9, y: Math.sin(a) * R * 0.9, z: 40 + Math.random() * 60,
      vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp * 0.6 + 260 + Math.random() * 120,
      rx: Math.random() * TAU, ry: Math.random() * TAU, rz: Math.random() * TAU,
      wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 10, wz: (Math.random() - 0.5) * 8,
      size: leaf ? 15 + Math.random() * 6 : 12 + Math.random() * 5, ph: Math.random() * TAU, sw: 0.8 + Math.random() * 1.4,
    });
    (leaf ? leafMesh : starMesh).setColorAt(leaf ? i - STAR_N : i, CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
  }
  for (const m of [starMesh, leafMesh]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  sparkLife = 3.4;
  sparks.visible = true;
}

/* ---------- Frame ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  if (!reduce) T += dt;

  const dir = mode === 'tied' ? 1 : -1;
  kLin = clamp(kLin + (dir * dt) / 0.95, 0, 1);
  const k = ease(kLin);
  if (mode === 'tied' && kLin >= 1 && !tiedFired) {
    tiedFired = true; burst(); chime(); buzz(30);
    // The card preview (always shown on wide screens) is drawn once the loop has closed.
    if (wideCase.matches || !$('shareCard').hidden) setTimeout(cardPreview, 60);
  }

  tiltS += (tilt - tiltS) * 0.1;
  const n = beads.length;
  const lay = layoutCords(defs()), U = lay.U;
  const line = stepRope(dt, n);
  const lc = cumOf(line);
  lineLen = lc[N];
  // Zoomed out a little: beads are drawn smaller than the string has room for, so more cord and table show.
  const ZOOM = 0.82, SMAX = clamp(W / 10, 28, 48) * ZOOM;
  // Keep the end beads fully on screen: measure how much string is lost past each edge.
  let edge = 0;
  for (let i = 0; i <= N; i++) { if (line[i].x >= sizeCur * 0.62 + 10) { edge = lc[i]; break; } }
  const sizeT = U ? Math.min(SMAX, ((lineLen - 2 * edge) / U) * ZOOM) : SMAX;
  sizeCur += (sizeT - sizeCur) * (reduce ? 1 : 0.2);

  beads.forEach((b, i) => {
    b.off = lay.off[i] * sizeCur;
    b.target = lineLen / 2 + b.off;
    b.side = lay.side[i];
    if (b.s == null) b.s = b.target;
    if (!b.drag) {
      b.v += ((b.target - b.s) * 240 - b.v * 21) * dt;
      b.s += b.v * dt;
      if (!b.landed && Math.abs(b.target - b.s) < 5) {
        b.landed = true; b.sq = 0; b.rv += (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 2);
        kickRope(b.s / lineLen, (Math.random() - 0.5) * 60, 110);
        for (const o of beads) o.swv += (Math.random() - 0.5) * 1.6;
        land(b.def.k, b.step); buzz(8);
      }
    }
    b.rv += (-b.rock * 70 - b.rv * 4.5) * dt;
    b.rock += b.rv * dt;
    // Hanging charms swing like a pendulum, pushed by the bead's own motion along the string.
    b.swv += (-(b.sw + tiltS * 0.7) * 42 - b.swv * 2.2) * dt - clamp(b.v - b.pv, -400, 400) * 0.006;
    b.sw = clamp(b.sw + b.swv * dt, -1.3, 1.3);
    b.pv = b.v;
    b.sq += dt;
  });

  // Tied bracelet: the string morphs into a loop.
  const R = Math.min(W, H) * 0.33, cx = W / 2, cy = H / 2 + R * 0.06, C = TAU * R;
  const Sc = U ? Math.min(sizeCur, (C * 0.93) / U) : sizeCur;
  let pts = line, cum = lc;
  if (k > 0) {
    pts = [];
    for (let i = 0; i <= N; i++) {
      const th = -Math.PI / 2 - (TAU * i) / N;
      pts.push({ x: lerp(line[i].x, cx + R * Math.cos(th), k), y: lerp(line[i].y, cy + R * Math.sin(th), k) });
    }
    cum = cumOf(pts);
  }
  const Lm = cum[N], S = lerp(sizeCur, Sc, k);

  // Lift into 3D. The strand pivots around the loop center so the tied bracelet can turn.
  strand.position.set(cx - W / 2, H / 2 - cy, 0);
  // Tied bracelet: gentle idle turn, plus whatever spin the player has given it.
  if (!spin) { spinY += spinVY * dt; spinX += spinVX * dt; spinVY *= 0.965; spinVX *= 0.9; spinX *= 0.97; }
  if (k === 0) { spinY = 0; spinX = 0; spinVY = 0; spinVX = 0; }
  hop += dt;
  const hopS = 1 + (hop < 0.7 ? 0.12 * Math.exp(-hop * 6) * Math.cos(hop * 22) : 0);
  strand.scale.setScalar(hopS);
  strand.rotation.set((-0.3 + clamp(spinX, -0.9, 0.9)) * k, ((reduce ? 0 : Math.sin(T * 0.8) * 0.4) + spinY) * k, 0);

  // Two strands: each cord is the rope's path pushed up (top cord) or down (bottom cord) by half the gap between
  // them. The cords meet at the ends and at every bead threaded on both, and part in between.
  const fracOf = (b) => lerp(b.s / lineLen, 0.5 + (b.off * (Sc / sizeCur)) / C, k);
  let cordA = pts, cordB = pts;
  const gapPx = twoCords ? S * 0.56 : 0;
  cordPx = gapPx;
  if (twoCords) {
    const fr = beads.map(fracOf), wf = (b) => (UNIT[b.def.k] * S) / Lm / 2;
    let lo = 0.32, hi = 0.68;
    if (beads.length) {
      lo = Math.min(...beads.map((b, i) => fr[i] - wf(b)));
      hi = Math.max(...beads.map((b, i) => fr[i] + wf(b)));
    }
    // Past the last bead on each end the cords take a while to come together, unless the tied loop leaves no room.
    const room = Math.min(lo, 1 - hi), endT = Math.max((0.5 * S) / Lm, Math.min(room * 0.9, (2.4 * S) / Lm));
    // Past an end bead threaded on both cords, the cords stay together all the way out.
    const firstI = fr.indexOf(Math.min(...fr)), lastI = fr.indexOf(Math.max(...fr));
    if (beads.length && beads[firstI].side === 0) lo = fr[firstI]; else lo -= endT * 0.8;
    if (beads.length && beads[lastI].side === 0) hi = fr[lastI]; else hi += endT * 0.8;
    // A wide parting curve, so loops between shared beads come out round rather than flat.
    const joins = beads.filter((b) => b.side === 0).map((b) => fr[beads.indexOf(b)]), tw = (1.05 * S) / Lm;
    const gapAt = (f) => gapPx * cordGap(f, joins, lo, hi, tw, endT);
    cordA = []; cordB = [];
    for (let i = 0; i <= N; i++) {
      const a = pts[Math.max(0, i - 1)], c2 = pts[Math.min(N, i + 1)], tl = Math.hypot(c2.x - a.x, c2.y - a.y) || 1;
      const nx = -(c2.y - a.y) / tl, ny = (c2.x - a.x) / tl, g = gapAt(cum[i] / Lm);
      cordA.push({ x: pts[i].x - nx * g, y: pts[i].y - ny * g });
      cordB.push({ x: pts[i].x + nx * g, y: pts[i].y + ny * g });
    }
  }
  // Which cords are highlighted: only while stringing on two strands.
  const lit = twoCords && mode === 'line' && k === 0 ? [activeCord !== 1, activeCord !== 0] : [false, false];
  const tubeKey = [0, 15, 30, 45, 60, 75].map((i) => pts[i].x.toFixed(1) + ',' + pts[i].y.toFixed(1) + ',' + cordB[i].y.toFixed(1)).join() + k.toFixed(3) + W + 'x' + H + twoCords + lit;
  if (tubeKey !== lastTubeKey) {
    lastTubeKey = tubeKey;
    const tubeOf = (path, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(p.x - cx, cy - p.y, 0))), 140, r, 8, false);
    tube.geometry.dispose();
    tube.geometry = tubeOf(cordA, twoCords && k === 0 ? (lit[0] ? 1.75 : 1.1) : 1.35);
    tube2.visible = twoCords;
    if (twoCords) { tube2.geometry.dispose(); tube2.geometry = tubeOf(cordB, k === 0 ? (lit[1] ? 1.75 : 1.1) : 1.35); }
    stringMat.map.repeat.set(Lm / 9, 1);
  }
  tube.material = lit[0] ? activeCordMat : stringMat;
  tube2.material = lit[1] ? activeCordMat : stringMat;
  if (lit[0] || lit[1]) activeCordMat.color.copy(stringMat.color).offsetHSL(0, 0.08, 0.1);
  cordPaths = twoCords && k === 0 ? { A: cordA, B: cordB, cum, Lm } : null;
  // The ghost bead: where a bead added now would sit, worked out by laying out the string with one more bead.
  ghost.visible = false;
  if (lit[0] || lit[1]) {
    const probe = withCord({ k: 'pony' }, activeCord), list = defs();
    if (fits(probe)) {
      const nl = layoutCords(side === 'L' ? [probe, ...list] : [...list, probe]), at = side === 'L' ? 0 : list.length;
      const off = nl.off[at] + ((side === 'L' ? -1 : 1) * (nl.U - U)) / 2;
      const gp = pointAt(nl.side[at] < 0 ? cordA : nl.side[at] > 0 ? cordB : pts, cum, lineLen / 2 + off * sizeCur);
      ghost.visible = true;
      ghost.position.set(gp.x - cx, cy - gp.y, 0);
      ghost.scale.setScalar(S * (reduce ? 1 : 1 + 0.06 * Math.sin(T * 3.2)));
      ghostRing.material.opacity = reduce ? 0.85 : 0.65 + 0.25 * Math.sin(T * 3.2);
    }
  }
  knot.visible = k > 0.5;
  if (knot.visible) {
    knot.position.set(pts[0].x - cx, cy - pts[0].y, 0);
    knot.scale.setScalar((k - 0.5) * 2);
  }

  const defList = defs();
  beads.forEach((b, i) => { if (b.obj.userData.cup) b.obj.userData.cup.rotation.y = capFacing(defList, i) > 0 ? 0 : Math.PI; });
  for (const b of beads) {
    const f = fracOf(b), p = pointAt(b.side < 0 ? cordA : b.side > 0 ? cordB : pts, cum, f * Lm);
    b.S = S;
    const o = b.obj;
    if (b.drag) {
      b.x = b.drag.x; b.y = b.drag.y;
      o.position.set(b.x - cx, cy - b.y + 6, 34);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(S * 1.15);
      if (o.userData.hang) o.userData.hang.rotation.set(0, 0, b.sw);
    } else {
      b.x = p.x; b.y = p.y;
      const q = b.sq < 0.6 ? Math.exp(-b.sq * 9) * Math.cos(b.sq * 34) : 0;
      o.position.set(p.x - cx, cy - p.y, 0);
      if (o.userData.hang) {
        o.rotation.set(0, 0, -p.a);
        o.userData.hang.rotation.set(b.rock * 0.5, 0, p.a + b.sw);
      } else o.rotation.set(b.rock, 0, -p.a, 'ZYX');
      o.scale.set(S * (1 - 0.22 * q), S * (1 + 0.18 * q), S * (1 + 0.18 * q));
    }
    if (o.userData.spin) o.userData.spin.rotation.y = T * 0.9;
    if (o.userData.flap) {
      const a = 0.3 + 0.32 * Math.sin(T * 4.5 + b.ph);
      o.userData.flap[0].rotation.y = -a;
      o.userData.flap[1].rotation.y = a;
    }
  }

  for (let i = fallers.length - 1; i >= 0; i--) {
    const f = fallers[i], o = f.obj;
    f.vy -= 1500 * dt;
    o.position.x += f.vx * dt; o.position.y += f.vy * dt;
    o.rotation.x += f.r[0] * dt; o.rotation.y += f.r[1] * dt; o.rotation.z += f.r[2] * dt;
    if (o.position.y < -H / 2 - 120 || reduce) { scene.remove(o); fallers.splice(i, 1); }
  }
  updateLoose(dt);

  if (sparkLife > 0) {
    sparkLife -= dt;
    // Paper falls slowly: strong air drag, a gentle side-to-side flutter, and a constant tumble.
    const drag = Math.pow(0.18, dt);
    for (const c of confetti) {
      c.vy -= 520 * dt;
      c.vx *= drag; c.vy *= drag;
      if (c.vy < -95) c.vy = -95;
      c.x += (c.vx + Math.sin(T * 3 * c.sw + c.ph) * 38) * dt;
      c.y += c.vy * dt;
      c.rx += c.wx * dt; c.ry += c.wy * dt; c.rz += c.wz * dt;
      cfObj.position.set(c.x, c.y, c.z);
      cfObj.rotation.set(c.rx, c.ry, c.rz);
      cfObj.scale.setScalar(c.size);
      cfObj.updateMatrix();
      (c.leaf ? leafMesh : starMesh).setMatrixAt(c.idx, cfObj.matrix);
    }
    starMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;
    confettiMat.opacity = starMat.opacity = clamp(sparkLife / 0.8, 0, 1);
    sparks.position.copy(strand.position);
    if (sparkLife <= 0) sparks.visible = false;
  }

  // Camera: 1 world unit = 1 stage pixel at the string's depth, with a slight parallax.
  if (hasTilt) parTX = tiltS;
  parX += (parTX - parX) * 0.06; parY += (parTY - parY) * 0.06;
  const dist = H / 2 / Math.tan((FOV * Math.PI) / 360);
  camera.position.set(parX * 26, parY * 18, dist);
  camera.lookAt(0, 0, 0);
  stageA.position.set(Math.cos(T * 0.45) * W * 0.6, H * 0.2 + Math.sin(T * 0.6) * H * 0.3, 240);
  table.scale.set(W * 1.6, H * 1.6, 1);
  // The surface pattern is drawn at a scale that reads as a real tabletop a little way off.
  if (table.material.map) {
    const tile = SURFACES[surface].tile;
    table.material.map.repeat.set((W * 1.6) / tile, (H * 1.6) / tile);
    if (table.material.normalMap) table.material.normalMap.repeat.copy(table.material.map.repeat);
  }
  stageB.position.set(Math.cos(T * 0.38 + 2.6) * W * 0.6, H * 0.1 + Math.sin(T * 0.5 + 1.7) * H * 0.3, 240);
  deskLamp.position.set(-W * 0.08, H * 0.12, 230);
  deskLamp.distance = Math.max(W, H) * 0.9;
  if (mode === 'stack') updateStack(dt);
  tickMaterials(T);
  renderer.render(scene, camera);
}

/* ---------- Pointer: tap to pull off, drag to reorder ---------- */
let grab = null;
const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
cv.addEventListener('pointerdown', (e) => {
  arm();
  const p = pos(e);
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
  if (mode !== 'line') {
    spin = { x: p.x, y: p.y, x0: p.x, y0: p.y, moved: false, scroll0: scrollY, vy: 0, at: performance.now() };
    spinVY = 0; spinVX = 0;
    grabRing = mode === 'stack' ? ringAt(p) : null;
    spin.ring = grabRing;
    spin.sign = mode === 'stack' && !grabRing && signAt(p);
    if (!$('custom').hidden) { closeCustom(false); spin.dismiss = true; }
    else if (!$('shareCard').hidden) { closeShare(false); spin.dismiss = true; }
    else if (popRing) { closePop(false); spin.dismiss = true; }
    else if (!$('wallShare').hidden) { closeWallShare(false); spin.dismiss = true; }
    else if (grabRing && !visit) {
      // Hold a bracelet and it lifts off its peg; a drag then carries it to another peg.
      const r = grabRing;
      scrollV = 0;
      holdTimer = setTimeout(() => {
        if (!spin || spin.moved || grabRing !== r) return;
        spin.lift = true;
        r.g.updateWorldMatrix(true, false);
        spin.offX = r.x - (p.x - W / 2); spin.offY = r.y - (H / 2 - p.y - scrollY);
        buzz(20); tick(1.4, 0.07);
      }, 300);
    } else if (mode === 'stack') scrollV = 0;
    return;
  }
  // A loose bead on the table: tap it to string it.
  const lb = looseAt(p);
  if (lb) { pickLoose(lb); return; }
  let best = null, bd = 1e9;
  for (const b of beads) {
    let d = Math.hypot(b.x - p.x, b.y - p.y);
    // A hanging charm can also be grabbed by its body below the string.
    if (DANGLE.has(b.def.k)) d = Math.min(d, Math.hypot(b.x - p.x, b.y + b.S * 1.3 - p.y) - b.S * 0.7);
    if (d < bd) { bd = d; best = b; }
  }
  if (best && bd < Math.max(24, best.S * 0.75)) { grab = { b: best, x: p.x, y: p.y, moved: false }; return; }
  // The string is only caught by a press that starts right on it, so stray touches leave it alone.
  let rd = 1e9;
  for (let i = 1; i < N; i++) rd = Math.min(rd, Math.hypot(RX[i] - p.x, RY[i] - p.y));
  // On two strands, a tap on a cord makes it the one new beads go on. A drag still plucks.
  let cordTap = null;
  if (cordPaths) {
    let da = 1e9, db = 1e9;
    for (let i = 1; i < N; i++) {
      da = Math.min(da, Math.hypot(cordPaths.A[i].x - p.x, cordPaths.A[i].y - p.y));
      db = Math.min(db, Math.hypot(cordPaths.B[i].x - p.x, cordPaths.B[i].y - p.y));
    }
    rd = Math.min(rd, da, db);
    if (Math.abs(da - db) > 3) cordTap = da < db ? 0 : 1;
  }
  const band = matchMedia('(pointer: coarse)').matches ? 22 : 14;
  if (rd < band) pluck = { x: p.x, y: p.y, dx: 0, dy: 0, armed: false, cordTap };
});
// Running a finger across the beads strums them: each one rocks and plays a note.
// Only a quick, deliberate swipe plays notes; a slow drag just rocks the beads quietly.
function strum(p) {
  const now = performance.now(), loud = Math.abs(p.vx) > 9;
  beads.forEach((b, i) => {
    if (Math.hypot(b.x - p.x, b.y - p.y) > b.S * 0.62 || now - (b.strumAt || 0) < 260) return;
    b.strumAt = now;
    kickRope(b.s / lineLen, p.vx * 3, 40);
    b.rv += (p.vx >= 0 ? 1 : -1) * 6;
    b.swv += (p.vx >= 0 ? 1 : -1) * 3;
    b.sq = 0;
    if (loud) { note(i); buzz(5); }
  });
}
let lastX = 0, lastMoveAt = 0;
// Seconds since the previous pointer move, for the scroll's fling speed.
function dtMove() { const now = performance.now(), d = (now - lastMoveAt) / 1000; lastMoveAt = now; return d; }
cv.addEventListener('pointermove', (e) => {
  const p = pos(e);
  p.vx = p.x - lastX;
  lastX = p.x;
  if (e.pointerType === 'mouse') { parTX = (p.x / W - 0.5) * 2; parTY = -(p.y / H - 0.5) * 2; }
  if (spin) {
    const dx = p.x - spin.x, dy = p.y - spin.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) { spin.moved = true; clearTimeout(holdTimer); }
    if (spin.held || spin.dismiss) return;
    if (mode === 'stack') {
      if (spin.lift && grabRing) {
        // Carrying a bracelet: it follows the finger, and the others step aside for its new peg.
        grabRing.drag = { x: p.x - W / 2 + spin.offX, y: H / 2 - p.y - scrollY + spin.offY };
        const slot = slotAt({ x: grabRing.drag.x + W / 2, y: H / 2 - grabRing.drag.y - scrollY });
        if (slot !== grabRing.slot) previewOrder(grabRing, slot);
      } else if (spin.moved) {
        // Dragging the wall scrolls it when there are more rows than fit.
        spin.scrolling = true;
        scrollY = clamp(spin.scroll0 + (spin.y0 - p.y), 0, scrollMax());
        spin.vy = (spin.y - p.y) / Math.max(0.004, dtMove());
      }
      spin.x = p.x; spin.y = p.y;
      return;
    }
    spinY += dx * 0.012; spinX += dy * 0.006;
    spinVY = dx * 0.25; spinVX = dy * 0.1;
    spin.x = p.x; spin.y = p.y;
    return;
  }
  if (pluck) {
    pluck.dx = p.x - pluck.x; pluck.dy = p.y - pluck.y;
    // The string follows only after the finger has clearly moved, so a tap does not yank it.
    if (!pluck.armed && Math.hypot(pluck.dx, pluck.dy) > 8) pluck.armed = true;
    if (pluck.armed) strum(p);
    return;
  }
  if (!grab) return;
  if (!grab.moved && Math.hypot(p.x - grab.x, p.y - grab.y) > 10) { grab.moved = true; pushUndo(); }
  if (!grab.moved) return;
  const b = grab.b;
  b.drag = p;
  const others = beads.filter((o) => o !== b);
  let idx = 0;
  for (const o of others) if (o.x < p.x) idx++;
  if (beads.indexOf(b) !== idx) { others.splice(idx, 0, b); beads = others; tick(1.3, 0.08); }
  // On two strands, dragging a bead above or below the middle moves it to the top or bottom cord; letting go
  // right between them threads it on both.
  if (twoCords) {
    let ri = 1, bd = 1e9;
    for (let i = 1; i < N; i++) { const d = Math.abs(RX[i] - p.x); if (d < bd) { bd = d; ri = i; } }
    const dy = p.y - RY[ri], band = Math.max(5, cordPx * 0.4);
    const c = dy > band ? 1 : dy < -band ? 0 : 2;
    if (c !== cordOf(b.def)) { b.def = withCord(b.def, c); tick(c === 2 ? 1.5 : c ? 0.9 : 1.2, 0.06); }
  }
});
function release() {
  if (spin) {
    // A tap on the tied bracelet makes it hop and throw sparkles.
    if (!spin.moved && mode === 'tied' && kLin >= 1) { hop = 0; burst(); chime(); buzz(20); }
    clearTimeout(holdTimer);
    // A tap on the neon sign opens the editor with the sign's word ready to retype.
    if (!spin.moved && !spin.dismiss && spin.sign) { openCustom(true); chime(); }
    else if (mode === 'stack' && spin.lift && grabRing) {
      // Dropped onto a peg: the new order is kept, and the loop swings as it settles.
      const r = grabRing;
      r.drag = null;
      r.av += 2.4;
      stack = rings.slice().reverse().map((o) => o.entry);
      saveStack();
      buildRingButtons();
      buildHungList();
      thud(); buzz(15);
      if (spin.moved) say(entryName(r.entry) + ' moved to peg ' + (r.slot + 1) + '.');
      else openPop(r);
    } else if (!spin.moved && !spin.dismiss && mode === 'stack' && grabRing) {
      // A tap: the bracelet lifts and jingles, and its options open.
      grabRing.av += 2.6;
      const base = rings.indexOf(grabRing);
      [0, 2, 4].forEach((n, i) => setTimeout(() => note(base + n), i * 60));
      buzz(15);
      openPop(grabRing);
    } else if (mode === 'stack' && spin.scrolling) {
      scrollV = clamp(spin.vy, -2400, 2400);
    }
    grabRing = null;
    spin = null;
    return;
  }
  if (pluck) {
    if (!pluck.armed && pluck.cordTap != null && twoCords && mode === 'line') pickCord(pluck.cordTap);
    const pull = Math.hypot(pluck.dx, pluck.dy);
    if (pluck.armed && pull > 18) {
      twang(pull);
      for (const b of beads) { b.rv += (Math.random() - 0.5) * pull * 0.12; b.swv += (Math.random() - 0.5) * pull * 0.06; }
    }
    pluck = null;
    return;
  }
  if (!grab) return;
  const b = grab.b;
  if (!grab.moved) removeBead(b);
  else {
    b.s = clamp((b.drag.x + 12) / (W + 24), 0, 1) * lineLen;
    b.v = 0; b.drag = null; b.landed = false;
    sync();
  }
  grab = null;
}
cv.addEventListener('pointerup', release);
// A mouse wheel or trackpad scrolls a tall wall.
cv.addEventListener('wheel', (e) => {
  if (mode !== 'stack' || scrollMax() <= 0) return;
  e.preventDefault();
  scrollTo = null;
  scrollY = clamp(scrollY + e.deltaY, 0, scrollMax());
}, { passive: false });
// A pointer cursor over the sign on the wall hints that it can be tapped.
cv.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const on = mode === 'stack' && (signAt(pos(e)) || ringAt(pos(e)));
  cv.style.cursor = on ? 'pointer' : '';
});
cv.addEventListener('pointercancel', release);

/* ---------- Tilt: the string and hanging charms lean with the phone ---------- */
function listenTilt() {
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    hasTilt = true;
    tilt = clamp(e.gamma / 40, -1, 1);
  });
}
if (!reduce && typeof DeviceOrientationEvent !== 'undefined') {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iPhone asks for permission, and only from a tap.
    const btn = $('tilt');
    btn.hidden = false;
    btn.addEventListener('click', async () => {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) === 'granted') {
          listenTilt();
          btn.hidden = true;
          // Shaking needs motion access too; on iPhone the same tap can ask for it.
          try { if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission && (await DeviceMotionEvent.requestPermission()) === 'granted') listenShake(); } catch (e2) { /* optional */ }
          say('Tilt is on. Lean your phone to swing the string, or shake it to spill some beads.');
        }
        else say('Tilt was not allowed, so the string stays level.');
      } catch (err) { say('Tilt is not available in this browser.'); }
    });
  } else { listenTilt(); listenShake(); }
}
cv.addEventListener('pointerleave', () => { parTX = 0; parTY = 0; });

/* ---------- Shake to spill: loose beads tumble out across the table ---------- */
// A shake while stringing tips a handful of loose beads out of the case. They bounce and settle on the table;
// tap one to string it. Left alone, they roll back into the case. Off with reduced motion.
let loose = [], looseIdle = 0, shakeAt = 0, shakePeaks = [];
function listenShake() {
  if (reduce || typeof DeviceMotionEvent === 'undefined') return;
  window.addEventListener('devicemotion', (e) => {
    const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null;
    if (!a) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0), now = performance.now();
    if (m < 17) return;
    // Two hard jolts within half a second count as a shake. Then wait a moment before the next spill.
    shakePeaks = shakePeaks.filter((t) => now - t < 550);
    shakePeaks.push(now);
    if (shakePeaks.length >= 2 && now - shakeAt > 2500) { shakeAt = now; shakePeaks = []; spill(); }
  });
}
function spillDefs(n) {
  // A mix like a real spilled case: mostly beads in the picked color and a few others, some letters, a charm.
  const out = [], types = ['pony', 'pony', 'round', 'clay', 'clay', 'clay', 'cube', 'crystal', 'jelly', 'glitter', 'smiley', 'metal'];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.18) out.push(letterBeads(letterStyle, letterShape)[Math.floor(Math.random() * 26)].def);
    else if (r < 0.24) out.push(CHARMS[Math.floor(Math.random() * CHARMS.length)].def);
    else {
      const col = Math.random() < 0.55 ? COLORS[colorIdx] : COLORS[Math.floor(Math.random() * COLORS.length)];
      out.push({ k: types[Math.floor(Math.random() * types.length)], h: col.h, s: col.s, l: col.l });
    }
  }
  return out;
}
function spill() {
  if (mode !== 'line' || reduce) return;
  clearLoose();
  buzz(40);
  whoosh();
  const S = sizeCur * 0.95;
  for (const def of spillDefs(18)) {
    const o = makeBead(def);
    o.scale.setScalar(S);
    scene.add(o);
    // They pour up out of the case at the bottom of the stage and scatter across the table.
    loose.push({
      def, obj: o, S, x: W * (0.3 + Math.random() * 0.4), y: H + 20, vx: (Math.random() - 0.5) * 900, vy: -(700 + Math.random() * 600),
      rz: Math.random() * TAU, vr: (Math.random() - 0.5) * 16, tx: Math.random() * TAU, ty: Math.random() * TAU, vt: 6 + Math.random() * 8, hits: 0,
    });
  }
  looseIdle = 0;
}
function updateLoose(dt) {
  if (!loose.length) return;
  looseIdle += dt;
  const home = looseIdle > 12;
  for (let i = loose.length - 1; i >= 0; i--) {
    const b = loose[i], o = b.obj, pad = b.S * 0.6;
    if (home) {
      // Roll back down into the case.
      b.vx *= 0.9; b.vy += 1400 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rz += b.vr * dt;
      if (b.y > H + 60) { scene.remove(o); loose.splice(i, 1); continue; }
    } else {
      // Table friction slows them; walls bounce them back.
      const f = Math.pow(0.08, dt);
      b.vx *= f; b.vy *= f; b.vr *= f; b.vt *= f;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rz += b.vr * dt;
      if (b.x < pad || b.x > W - pad) { b.x = clamp(b.x, pad, W - pad); b.vx *= -0.55; bounceNote(b); }
      if (b.y < pad + 40 || (b.y > H - pad && b.vy > 0)) { b.y = clamp(b.y, pad + 40, H - pad); b.vy *= -0.55; bounceNote(b); }
    }
    b.tx += b.vt * dt; b.ty += b.vt * 0.7 * dt;
    o.position.set(b.x - W / 2, H / 2 - b.y, 8);
    o.rotation.set(Math.sin(b.tx) * 0.5 * Math.min(1, b.vt / 4), Math.cos(b.ty) * 0.5 * Math.min(1, b.vt / 4), b.rz);
  }
}
function bounceNote(b) { if (b.hits++ < 2 && Math.hypot(b.vx, b.vy) > 160) tick(1.2 + Math.random() * 0.4, 0.05); }
function looseAt(p) {
  let best = null, bd = 1e9;
  for (const b of loose) {
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < Math.max(22, b.S * 0.7) && d < bd) { bd = d; best = b; }
  }
  return best;
}
function pickLoose(b) {
  looseIdle = 0;
  if (!addBead(b.def)) return;
  scene.remove(b.obj);
  loose.splice(loose.indexOf(b), 1);
}
function clearLoose() {
  for (const b of loose) scene.remove(b.obj);
  loose = [];
}

/* ---------- Tray (thumbnails are real renders of each 3D bead) ---------- */
// The Beads tab shows one compartment per bead type, in the color picked on the color strip.
let colorIdx = 0;
try { colorIdx = clamp(parseInt(localStorage.getItem('13beads.color'), 10) || 0, 0, COLORS.length - 1); } catch (e) { /* optional */ }
// On two strands the Beads tab starts with two one-tap patterns, in the picked color.
const PATTERN_NAMES = { cross: 'Cross', diamond: 'Diamond', bubble: 'Bubble' };
const patterns = () => (twoCords ? Object.keys(PATTERN_NAMES).map((p) => {
  const c = COLORS[colorIdx];
  const pc = COLORS[PARTNER[colorIdx]], with_ = p === 'bubble' ? ' with pearls' : ' and ' + pc.name.toLowerCase();
  return { name: PATTERN_NAMES[p] + ' pattern in ' + c.name.toLowerCase() + with_, pattern: p, def: { k: 'pattern', p, h: c.h, s: c.s, l: c.l, j: PARTNER[colorIdx] } };
}) : []);
// The first compartment strings a ready-made bracelet; each tap brings the next one.
const SURPRISE = { name: 'Surprise me', surprise: true, def: { k: 'surprise' } };
// The Beads tab is sorted into groups, each starting a new column, with a chip above the tray to jump to each one.
// Recent holds the last six beads picked from the case (any tab), so going back and forth is one tap.
const BEAD_GROUPS = [
  ['basics', 'Basics', ['pony', 'round', 'cube', 'matte', 'jelly', 'clay', 'smiley']],
  ['shiny', 'Shiny', ['crystal', 'facet', 'glitter', 'glow', 'metal']],
  ['fun', 'Fun', ['starb', 'dice']],
  ['seed', 'Seed', ['seed', 'seedg', 'seedl', 'seedx']],
  ['pearls', 'Pearls', ['pearl', 'marble', 'moon2', 'spacer', 'ball', 'daisy', 'rondelle', 'gunspacer', 'cap']],
];
let recent = [];
function noteRecent(item) {
  const def = withCord(item.def, 0), key = defKey(def);
  recent = [{ name: item.name, def }, ...recent.filter((r) => defKey(r.def) !== key)].slice(0, 6);
}
function beadsTab() {
  const all = [...colorBeads(COLORS[colorIdx]), ...FIXED], out = [];
  const tag = (list, group) => list.map((it) => ({ ...it, group }));
  if (recent.length) out.push(...tag(recent, 'recent'));
  out.push(...tag([SURPRISE, ...patterns()], 'ideas'));
  const placed = new Set();
  BEAD_GROUPS.forEach(([id, , kinds], gi) => {
    const mine = all.filter((it) => kinds.includes(it.def.k) || (gi === BEAD_GROUPS.length - 1 && !BEAD_GROUPS.some((g) => g[2].includes(it.def.k))));
    mine.forEach((it) => placed.add(it));
    out.push(...tag(mine, id));
  });
  return out;
}
const GROUP_LABELS = { recent: 'Recent', ideas: 'Ideas', ...Object.fromEntries(BEAD_GROUPS.map(([id, label]) => [id, label])) };
const TABS = { colors: beadsTab, letters: () => letterBeads(letterStyle, letterShape), charms: () => CHARMS, dangles: () => DANGLES };
let curTab = 'colors';
const thumbs = {};
const TINY = new Set(['seed', 'seedg', 'seedl', 'seedx', 'facet', 'gunspacer']);
// One small offscreen renderer draws thumbnails as they are needed, so each color is only drawn the first time it is picked.
let thumbKit = null;
function thumbRenderer() {
  if (thumbKit) return thumbKit;
  const c = document.createElement('canvas');
  let r;
  try { r = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
  r.setPixelRatio(1);
  r.setSize(112, 112, false);
  r.toneMapping = THREE.NeutralToneMapping;
  const s = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  s.environmentIntensity = 0.6;
  pm.dispose();
  const l = new THREE.DirectionalLight(0xffffff, 1.8);
  l.position.set(-1, 2, 3);
  s.add(l);
  const cam = new THREE.OrthographicCamera(-0.68, 0.68, 0.68, -0.68, 0.1, 10);
  cam.position.z = 4;
  return (thumbKit = { c, r, s, cam });
}
const tbox = new THREE.Box3(), size = new THREE.Vector3(), mid = new THREE.Vector3();
function renderThumbs(items) {
  const todo = items.filter((it) => !thumbs[defKey(it.def)] && !it.pattern && !it.surprise);
  for (const it of items) if (it.pattern && !thumbs[defKey(it.def)]) thumbs[defKey(it.def)] = patternThumb(it.def);
  if (items.some((it) => it.surprise) && !thumbs[defKey(SURPRISE.def)]) thumbs[defKey(SURPRISE.def)] = surpriseThumb();
  if (!todo.length) return;
  const kit = thumbRenderer();
  if (!kit) return;
  const { c, r, s, cam } = kit;
  for (const item of todo) {
    const o = makeBead(item.def);
    if (o.userData.hang) {
      // Hanging charms vary in size, so fit each one to the thumbnail.
      o.rotation.set(0, -0.3, 0);
      o.updateMatrixWorld(true);
      tbox.setFromObject(o).getSize(size);
      tbox.getCenter(mid);
      const fit = 1.2 / Math.max(size.x, size.y);
      o.scale.setScalar(fit);
      o.position.set(-mid.x * fit, -mid.y * fit, 0);
    } else {
      o.rotation.set(0.25, item.def.k === 'clay' ? -1.05 : -0.3, 0);
      // Tiny beads are shown larger in their compartment so their finish can be seen.
      if (TINY.has(item.def.k)) o.scale.setScalar(1.9);
      else {
        // Long charms (the snake) are shrunk to fit their compartment.
        o.updateMatrixWorld(true);
        tbox.setFromObject(o).getSize(size);
        const big = Math.max(size.x, size.y);
        if (big > 1.25) o.scale.setScalar(1.25 / big);
      }
    }
    if (o.userData.flap) { o.userData.flap[0].rotation.y = -0.35; o.userData.flap[1].rotation.y = 0.35; }
    s.add(o);
    r.render(s, cam);
    thumbs[defKey(item.def)] = c.toDataURL('image/png');
    s.remove(o);
  }
}
// Pattern compartments: a small 2D drawing of the pattern, since it is several beads.
function patternThumb(d) {
  const c = document.createElement('canvas'), x = c.getContext('2d'), s = 112;
  c.width = c.height = s;
  const col = `hsl(${d.h} ${d.s}% ${Math.min(d.l, 70)}%)`, dark = `hsl(${d.h} ${d.s}% ${Math.max(8, d.l - 26)}%)`;
  x.strokeStyle = 'rgba(120, 110, 150, .7)'; x.lineWidth = 2;
  const pc = COLORS[d.j ?? 0], jcol = `hsl(${pc.h} ${pc.s}% ${Math.min(pc.l, 70)}%)`, jdark = `hsl(${pc.h} ${pc.s}% ${Math.max(8, pc.l - 26)}%)`;
  const bead = (bx, by, r, fill, shade = dark) => {
    const g = x.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.1, bx, by, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, fill); g.addColorStop(1, shade);
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2); x.fill();
  };
  if (d.p === 'cross') {
    x.beginPath(); x.moveTo(8, 56); x.quadraticCurveTo(56, 14, 104, 56); x.moveTo(8, 56); x.quadraticCurveTo(56, 98, 104, 56); x.stroke();
    for (const [bx, by] of [[56, 34], [56, 78]]) bead(bx, by, 11, col);
    for (const bx of [30, 82]) bead(bx, 56, 11, jcol, jdark);
  } else if (d.p === 'bubble') {
    x.beginPath(); x.ellipse(56, 56, 36, 26, 0, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.18 + (i / 4) * 0.64); bead(56 - Math.cos(a) * 36, 56 - Math.sin(a) * 26, 6, col); bead(56 - Math.cos(a) * 36, 56 + Math.sin(a) * 26, 6, col); }
    for (const bx of [16, 96]) bead(bx, 56, 11, '#fbf3ea');
  } else {
    x.beginPath(); x.moveTo(6, 56); x.lineTo(56, 28); x.lineTo(106, 56); x.lineTo(56, 84); x.closePath(); x.stroke();
    for (const [bx, by] of [[38, 38], [56, 30], [74, 38], [38, 74], [56, 82], [74, 74]]) bead(bx, by, 7, col);
    for (const bx of [18, 94]) bead(bx, 56, 12, jcol, jdark);
  }
  return c.toDataURL('image/png');
}
// Cross: a bead on both cords, one on each cord, then another on both, like a little plus sign.
// Diamond: a crystal on both cords, three seed beads on each cord, then another crystal on both.
function addPattern(p) {
  if (mode !== 'line' || !twoCords) return;
  const c = COLORS[colorIdx], col = { h: c.h, s: c.s, l: c.l }, end = side;
  const pc = COLORS[PARTNER[colorIdx]], join = { h: pc.h, s: pc.s, l: pc.l };
  const edge = beads.length ? (end === 'L' ? beads[0] : beads[beads.length - 1]).def : null;
  const joined = edge && cordOf(edge) === 2;
  // Bubble: a pearl on both cords, five seed beads on each cord, then another pearl, for big airy loops.
  // The beads where the cords meet take the partner color (Bubble keeps its pearls).
  const shared = p === 'cross' ? { k: 'seed', ...join, c: 2 } : p === 'bubble' ? { k: 'pearl', c: 2 } : { k: 'facet', ...join, c: 2 };
  const seed = (cd) => ({ k: 'seed', ...col, c: cd });
  const each = p === 'cross' ? 1 : p === 'bubble' ? 5 : 3;
  const run = [...Array(each).fill(0).map(() => seed(0)), ...Array(each).fill(0).map(() => seed(1))];
  const q = [...(joined ? [] : [shared]), ...run, { ...shared }];
  if (!fits(q[q.length - 1], q.slice(0, -1))) { say('That is a full wrist. Pull a bead off to add more.'); return; }
  pushUndo();
  stopStringing();
  if (end === 'L') q.reverse();
  if (reduce) { q.forEach((d) => addBead(d, true, end)); return; }
  let step = 0;
  phraseTimer = setInterval(() => { const d = q.shift(); if (!d || !addBead(d, true, end, step++)) stopStringing(); }, 110);
}
// A drawing of loose beads in many colors for the Surprise me compartment.
function surpriseThumb() {
  const c = document.createElement('canvas'), x = c.getContext('2d'), s = 112;
  c.width = c.height = s;
  const spots = [[34, 40, '#ff5fa8'], [62, 30, '#ffd23f'], [84, 50, '#5ab8ff'], [44, 70, '#9b6bff'], [72, 76, '#3fd1b0'], [56, 52, '#ffffff']];
  for (const [bx, by, fill] of spots) {
    const g = x.createRadialGradient(bx - 4, by - 4, 1, bx, by, 13);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, fill); g.addColorStop(1, 'rgba(40, 30, 70, .55)');
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, 12, 0, Math.PI * 2); x.fill();
  }
  x.fillStyle = '#ffd23f';
  x.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 9, a = (i * Math.PI) / 4; x.lineTo(90 + Math.cos(a) * r, 22 + Math.sin(a) * r); }
  x.fill();
  return c.toDataURL('image/png');
}
// Surprise me: replaces the string with the next ready-made bracelet. Undo brings the old string back.
let surpriseAt = Math.floor(Math.random() * PRESETS.length);
function surprise() {
  if (mode !== 'line') return;
  const p = PRESETS[surpriseAt++ % PRESETS.length];
  pushUndo();
  stopStringing();
  beads.forEach(drop);
  beads = [];
  sync();
  const list = p.beads.map((d) => (twoCords ? { ...d, c: 0 } : { ...d }));
  say('Surprise: ' + p.name + '. Undo brings your string back.');
  if (reduce) { list.forEach((d) => addBead(d, true, 'R')); return; }
  let step = 0;
  phraseTimer = setInterval(() => { const d = list.shift(); if (!d || !addBead(d, true, 'R', step++)) stopStringing(); }, 110);
}
// Turn the second cord on or off. Turning it off puts every bead back on one cord.
function setTwo(on, quiet) {
  if (on === twoCords && quiet) return syncTwoUI();
  if (!on && beads.some((b) => cordOf(b.def))) {
    if (!quiet) pushUndo();
    beads.forEach((b) => { b.def = withCord(b.def, 0); });
    sync();
  }
  twoCords = on;
  if (on && !quiet) { activeCord = 0; say('Two strands. Pick the top cord, the bottom cord, or both, just under the bracelet.'); }
  syncTwoUI();
  // The Beads tab shows the patterns only on two strands.
  if (curTab === 'colors') buildTray(true);
  if (!quiet) tick(on ? 1.2 : 0.9, 0.08);
}
function syncTwoUI() {
  document.querySelectorAll('.strands').forEach((o) => o.setAttribute('aria-pressed', (o.dataset.cords === '2') === twoCords ? 'true' : 'false'));
  $('cordPick').hidden = !twoCords;
  $('hud').classList.toggle('two', twoCords);
  document.querySelectorAll('#cordPick .seg').forEach((o) => o.setAttribute('aria-checked', +o.dataset.cord === activeCord ? 'true' : 'false'));
}
function buildSwatches() {
  const strip = $('colorStrip');
  strip.textContent = '';
  COLOR_ORDER.forEach((i) => {
    const col = COLORS[i], b = document.createElement('button');
    b.type = 'button';
    b.className = 'color-dot';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === colorIdx ? 'true' : 'false');
    b.setAttribute('aria-label', col.name);
    b.title = col.name;
    b.style.setProperty('--c', `hsl(${col.h} ${col.s}% ${col.l}%)`);
    b.addEventListener('click', () => {
      if (i === colorIdx) return;
      colorIdx = i;
      try { localStorage.setItem('13beads.color', String(i)); } catch (e) { /* optional */ }
      strip.querySelectorAll('.color-dot').forEach((o) => o.setAttribute('aria-checked', o === b ? 'true' : 'false'));
      tick(1 + i * 0.02, 0.08);
      say(col.name + ' beads');
      buildTray(true);
    });
    strip.appendChild(b);
  });
  // The picked color scrolls into view (a color from the end of the strip would otherwise be hidden).
  requestAnimationFrame(() => {
    const on = strip.querySelector('[aria-checked="true"]');
    if (on && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2);
    stripEdge();
  });
}
// The strip's edge fade shows only while there are more colors to scroll to.
function stripEdge() {
  const strip = $('colorStrip');
  strip.classList.toggle('at-end', strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2);
}
$('colorStrip').addEventListener('scroll', stripEdge, { passive: true });
// Wide screens show the case as a tall panel that scrolls down instead of across.
const trayDown = () => wideCase.matches;
wideCase.addEventListener('change', () => { buildTray(); stripEdge(); });
// On phones the case scrolls across in two rows that fill top then bottom, so letters are reordered to read
// A to M along the top and N to Z along the bottom.
function acrossOrder(list) {
  const half = Math.ceil(list.length / 2), top = list.slice(0, half), bottom = list.slice(half), out = [];
  for (let i = 0; i < half; i++) { out.push(top[i]); if (bottom[i]) out.push(bottom[i]); }
  return out;
}
function letterOrder(list) {
  const letters = list.filter((it) => /^[A-Z]$/.test(it.def.ch)), rest = list.filter((it) => !/^[A-Z]$/.test(it.def.ch));
  return [...acrossOrder(letters), ...acrossOrder(rest)];
}
function buildTray(keepScroll) {
  const down = trayDown();
  let items = TABS[curTab]();
  if (curTab === 'letters' && !down) items = letterOrder(items);
  const tray = $('tray'), x = down ? tray.scrollTop : tray.scrollLeft;
  $('case').dataset.tab = curTab;
  $('colorStrip').hidden = curTab !== 'colors';
  $('letterRow').hidden = curTab !== 'letters';
  renderThumbs(items);
  tray.textContent = '';
  const jump = $('jumpRow'), starts = [];
  jump.hidden = curTab !== 'colors';
  jump.textContent = '';
  let count = 0;
  items.forEach((item, i) => {
    if (item.group && (i === 0 || items[i - 1].group !== item.group)) {
      starts.push({ group: item.group, col: Math.floor(count / 2) });
      if (down) {
        const h = document.createElement('p');
        h.className = 'tray-head';
        h.textContent = GROUP_LABELS[item.group];
        h.setAttribute('aria-hidden', 'true');
        tray.appendChild(h);
        starts[starts.length - 1].el = h;
      }
    }
    count++;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bead-btn';
    btn.setAttribute('aria-label', 'Add ' + item.name);
    btn.title = item.name;
    const img = document.createElement('img');
    img.alt = '';
    img.src = thumbs[defKey(item.def)] || '';
    btn.appendChild(img);
    if (item.surprise) btn.classList.add('surprise');
    btn.addEventListener('click', () => {
      arm();
      if (item.surprise) surprise();
      else if (item.pattern) addPattern(item.pattern);
      else if (addBead(item.def)) noteRecent(item);
    });
    const st = starts[starts.length - 1];
    if (st && !st.el) st.el = btn;
    tray.appendChild(btn);
  });
  // Jump chips, one per group. The chip for the group in view is highlighted as the tray scrolls.
  for (const st of starts) {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'jump';
    c.textContent = GROUP_LABELS[st.group];
    c.setAttribute('aria-label', 'Show ' + GROUP_LABELS[st.group].toLowerCase() + ' beads');
    c.addEventListener('click', () => {
      jumpPick = st;
      tray.dataset.gliding = '1';
      clearTimeout(glideTimer);
      glideTimer = setTimeout(() => { delete tray.dataset.gliding; markJump(); }, reduce ? 0 : 600);
      tray.scrollTo({ [down ? 'top' : 'left']: trayPos(st), behavior: reduce ? 'auto' : 'smooth' });
      markJump();
      tick(1.1, 0.05);
    });
    st.chip = c;
    jump.appendChild(c);
  }
  traySections = starts;
  if (down) { tray.scrollLeft = 0; tray.scrollTop = keepScroll ? x : 0; } else { tray.scrollTop = 0; tray.scrollLeft = keepScroll ? x : 0; }
  markJump();
}
// Where a group starts in the tray, across on phones and down on wide screens.
const trayPos = (st) => (trayDown() ? st.el.offsetTop - 4 : st.el.offsetLeft);
let traySections = [], jumpPick = null, glideTimer = 0;
function markJump() {
  if (!traySections.length) return;
  const tray = $('tray'), down = trayDown(), at = down ? tray.scrollTop : tray.scrollLeft;
  const max = down ? tray.scrollHeight - tray.clientHeight : tray.scrollWidth - tray.clientWidth;
  let cur = traySections[0];
  // When two groups share a column, the earlier one wins.
  for (const st of traySections) if (trayPos(st) <= at + 20 && trayPos(st) > trayPos(cur)) cur = st;
  // A chip just tapped stays lit while the tray glides to it, and when the tray cannot scroll that far.
  if (jumpPick && traySections.includes(jumpPick)) {
    const goal = Math.min(trayPos(jumpPick), max);
    if (Math.abs(at - goal) < 4 || tray.dataset.gliding) cur = jumpPick;
  }
  for (const st of traySections) st.chip.setAttribute('aria-pressed', st === cur ? 'true' : 'false');
}
$('tray').addEventListener('scroll', markJump, { passive: true });
// Fold the bead case away, or open it again.
function setCase(open) {
  const closed = !open;
  if ($('case').classList.contains('closed') === closed) return;
  $('case').classList.toggle('closed', closed);
  $('caseToggle').setAttribute('aria-expanded', closed ? 'false' : 'true');
  $('caseToggle').setAttribute('aria-label', closed ? 'Show the bead case' : 'Hide the bead case');
  tick(closed ? 0.8 : 1.2, 0.1);
}
$('caseToggle').addEventListener('click', () => setCase($('case').classList.contains('closed')));
// Swipe the case's header row down to fold it away, up to open it.
let caseSwipe = null, caseSwiped = false;
$('caseHead').addEventListener('pointerdown', (e) => { caseSwipe = { y: e.clientY, id: e.pointerId }; caseSwiped = false; });
$('caseHead').addEventListener('pointermove', (e) => {
  if (!caseSwipe || e.pointerId !== caseSwipe.id || trayDown()) return;
  const dy = e.clientY - caseSwipe.y;
  if (Math.abs(dy) > 22) { setCase(dy < 0); caseSwiped = true; caseSwipe = null; }
});
window.addEventListener('pointerup', () => { caseSwipe = null; });
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  if (caseSwiped) { caseSwiped = false; return; }
  const wasClosed = $('case').classList.contains('closed');
  setCase(true);
  if (wasClosed && curTab === t.dataset.tab) return;
  curTab = t.dataset.tab;
  document.querySelectorAll('.tab').forEach((o) => o.setAttribute('aria-selected', o === t ? 'true' : 'false'));
  buildTray();
}));
document.querySelectorAll('.seg[data-side]').forEach((t) => t.addEventListener('click', () => {
  side = t.dataset.side;
  document.querySelectorAll('.seg[data-side]').forEach((o) => o.setAttribute('aria-pressed', o === t ? 'true' : 'false'));
  say(side === 'L' ? 'New beads slide on from the left end.' : 'New beads slide on from the right end.');
}));

/* ---------- Controls ---------- */
$('phraseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  arm();
  const i = $('phrase');
  stringPhrase(i.value);
  i.value = '';
  i.blur();
});
// Undo and redo: each keeps snapshots of the string. A new change clears the redo history.
function stepHistory(from, to, pitch, empty) {
  arm();
  const s = from.pop();
  if (!s) { say(empty); return; }
  to.push(JSON.stringify(defs()));
  stopStringing();
  setBeads(JSON.parse(s));
  sync();
  syncUndo();
  tick(pitch, 0.12);
}
$('undo').addEventListener('click', () => stepHistory(undoStack, redoStack, 0.8, 'Nothing to undo yet.'));
$('redo').addEventListener('click', () => stepHistory(redoStack, undoStack, 1.1, 'Nothing to redo.'));
// Keyboard: Cmd or Ctrl + Z to undo, with Shift (or Ctrl + Y) to redo, while stringing and not typing in a field.
document.addEventListener('keydown', (e) => {
  if (mode !== 'line' || !(e.metaKey || e.ctrlKey) || e.target.closest('input')) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); $('undo').click(); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); $('redo').click(); }
});
// The starter bracelet mirrors the logo: 1 3, a hot pink bead, B E A D S, framed with sparkles, gold glitter, and pearls.
// Round letters since 2026-10-10; LEGACY_STARTER is the cube version older players may still have on their string.
const starterWith = (L) => {
  const pink = { k: 'pony', h: 330, s: 90, l: 58 }, gold = { k: 'glitter', h: 48, s: 98, l: 56 };
  return [{ k: 'pearl' }, gold, { k: 'sparkle' }, L('1'), L('3'), pink, ...'BEADS'.split('').map(L), { k: 'sparkle' }, gold, { k: 'pearl' }];
};
const STARTER = starterWith((ch) => letterDef(ch, 'white', 'round'));
const LEGACY_STARTER = starterWith((ch) => ({ k: 'letter', ch }));
// Once the player has given their name, Start over spells it instead (letters and digits only, up to 12), with a
// pink bead between the words of a two-word name. The 13 BEADS starter stays for anyone who has not.
function nameStarter() {
  const word = (decor.name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 12).trim();
  if (!word) return null;
  const pink = { k: 'pony', h: 330, s: 90, l: 58 }, gold = { k: 'glitter', h: 48, s: 98, l: 56 };
  const mid = [...word].map((ch) => (ch === ' ' ? pink : letterDef(ch, 'white', 'round')));
  return [{ k: 'pearl' }, gold, { k: 'sparkle' }, ...mid, { k: 'sparkle' }, gold, { k: 'pearl' }];
}
const isStarterList = (list) => [STARTER, LEGACY_STARTER, nameStarter()].filter(Boolean).some((st) => JSON.stringify(list) === JSON.stringify(st));
// Beads slide on one by one, each playing the next note of the tune.
function stringStarter(delay = 0) {
  stopStringing();
  const st = nameStarter() || STARTER;
  if (reduce) { st.forEach((d) => addBead(d, true, 'R')); sync(); return; }
  // Kept so anything that replaces the string (Surprise me, Clear, a phrase) can stop the starter mid-way.
  starterTimers = st.map((d, i) => setTimeout(() => { if (mode === 'line') addBead(d, true, 'R', i); }, delay + i * 130));
}
$('restart').addEventListener('click', () => {
  arm();
  pushUndo();
  beads.forEach(drop);
  beads = [];
  sync();
  stringStarter(250);
  say('Fresh start. Undo brings your last bracelet back.');
});
$('clear').addEventListener('click', () => {
  arm();
  if (!beads.length) return;
  stopStringing();
  pushUndo();
  beads.forEach(drop);
  beads = [];
  sync();
  tick(0.5, 0.16);
  say('String cleared. Undo brings it back.');
});
$('tie').addEventListener('click', () => {
  arm();
  if (!beads.length) { say('Add at least one bead first.'); return; }
  stopStringing();
  beads.forEach((b) => { b.drag = null; });
  setMode('tied');
});
$('untie').addEventListener('click', () => setMode('line'));
$('wear').addEventListener('click', () => { arm(); wear(); });
// The wall's Share sheet: save a photo of it, or send a link that lets a friend visit it.
$('photoBtn').addEventListener('click', () => { closeWallShare(false); savePhoto(); });
function openWallShare() {
  closePop(false); closeCustom(false);
  $('wallShare').hidden = false;
  $('wallShareBtn').setAttribute('aria-expanded', 'true');
  $('wallLinkBtn').focus({ preventScroll: true });
}
function closeWallShare(restore = true) {
  if ($('wallShare').hidden) return;
  $('wallShare').hidden = true;
  $('wallShareBtn').setAttribute('aria-expanded', 'false');
  if (restore && !wideCase.matches) $('wallShareBtn').focus({ preventScroll: true });
}
$('wallShareBtn').addEventListener('click', () => { if ($('wallShare').hidden) openWallShare(); else closeWallShare(); });
$('wallShareClose').addEventListener('click', () => closeWallShare());
$('wallShare').addEventListener('keydown', (e) => trapTab(e, $('wallShare')));
$('wallLinkBtn').addEventListener('click', async () => {
  const btn = $('wallLinkBtn'), label = btn.querySelector('span');
  if (!stack.length) { say('Hang a bracelet first, then share your wall.'); return; }
  const url = wallLink();
  if (matchMedia('(pointer: coarse)').matches && navigator.share) {
    try { await navigator.share({ title: '13 Beads', text: decor.name ? 'Come see ' + decor.name + "'s bracelet wall." : 'Come see my bracelet wall.', url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); label.textContent = 'Link copied'; } catch (e) { label.textContent = 'Copy failed'; }
  say(label.textContent + '.');
  setTimeout(() => { label.textContent = 'Send link'; }, 2200);
});
$('shareBtn').addEventListener('click', () => { if ($('shareCard').hidden) openShare(); else closeShare(); });
$('shareCard').addEventListener('submit', (e) => {
  e.preventDefault();
  const note = $('cardNote').value.replace(/\s+/g, ' ').trim().slice(0, 40);
  closeShare(!wideCase.matches);
  shareCard(note);
});
$('cardCancel').addEventListener('click', () => closeShare());
$('shareCard').addEventListener('keydown', (e) => trapTab(e, $('shareCard')));
$('another').addEventListener('click', () => { if (visit) { endVisit(); say('Back on your own wall.'); } else setMode('line'); });
// The header's back arrow: on the stringing screen it goes to the games site; on Finished and the wall it goes back
// to the string (Shauna, 2026-10-11).
$('backArrow').addEventListener('click', (e) => {
  if (mode === 'line') return;
  e.preventDefault();
  arm();
  setMode('line');
});
$('takeOff').addEventListener('click', () => {
  const i = rings.indexOf(popRing), fromKeys = popOpener && popOpener.classList.contains('ring-btn');
  closePop(false);
  if (i < 0) return;
  // Rings show the newest bracelet first, so ring i is counted back from the end of the stack.
  stack.splice(stack.length - 1 - i, 1);
  popRing = null;
  saveStack();
  rebuildStack();
  syncStack();
  tick(0.6, 0.14);
  say(stack.length ? 'Taken off the wall.' : EMPTY_WALL);
  // Keyboard users land on the next bracelet, or on Make another if the wall is now empty.
  if (fromKeys) { const n = $('ringBtns').children[Math.min(i, rings.length - 1)]; (n || $('another')).focus({ preventScroll: true }); }
});
$('popKeep').addEventListener('click', closePop);
// Edit a bracelet from the wall: it comes off its peg and back onto the string. A string already in progress is
// not lost: it hangs on the peg in the edited bracelet's place (unless it is just the untouched starter).
$('editRing').addEventListener('click', () => {
  const i = rings.indexOf(popRing);
  closePop(false);
  if (i < 0) return;
  const at = stack.length - 1 - i, list = stack[at].b;
  const current = defs(), isStarter = isStarterList(current);
  if (current.length && !isStarter) stack[at] = { b: current, n: tagDefault(), d: today() };
  else stack.splice(at, 1);
  popRing = null;
  saveStack();
  rebuildStack();
  syncStack();
  stopStringing();
  setBeads(list);
  undoStack.length = 0;
  redoStack.length = 0;
  syncUndo();
  sync();
  kLin = 0;
  setMode('line');
  tick(1.2, 0.12);
  say(current.length && !isStarter ? 'Back on the string. Your string in progress went on the wall in its place.' : 'Back on the string. Edit it, then add it to your wall again.');
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (popRing) closePop();
  else if (!$('custom').hidden) closeCustom();
  else if (!$('shareCard').hidden) closeShare();
  else if (!$('wallShare').hidden) closeWallShare();
});
cv.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (mode !== 'stack') return;
  const r = ringAt(pos(e));
  if (r) openPop(r);
});
$('stackBtn').addEventListener('click', () => {
  arm();
  if (mode === 'stack') { setMode('line'); return; }
  stopStringing();
  kLin = 0;
  setMode('stack');
});
function syncThemeBtn() {
  const dark = isDark();
  $('themeBtn').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  $('themeBtn').title = dark ? 'Light mode' : 'Dark mode';
  $('themeLabel').textContent = dark ? 'Light mode' : 'Dark mode';
}
syncThemeBtn();
onTheme(syncThemeBtn);
$('themeBtn').addEventListener('click', () => { arm(); toggleTheme(); tick(isDark() ? 0.8 : 1.2, 0.1); });
let muted = false;
$('sound').addEventListener('click', () => {
  muted = !muted;
  arm();
  setMuted(muted);
  $('sound').setAttribute('aria-pressed', muted ? 'false' : 'true');
  $('soundState').textContent = muted ? 'Off' : 'On';
  if (!muted) tick(1);
});

// The More menu opens from the header and closes on a tap outside it, on Escape, or after a one-off action.
function setMenu(open, focusFirst) {
  $('menu').hidden = !open;
  $('moreBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open && focusFirst) $('menu').querySelector('button').focus({ preventScroll: true });
}
// Opened from the keyboard (no pointer, so detail is 0), focus moves into the menu.
$('moreBtn').addEventListener('click', (e) => { arm(); setMenu($('menu').hidden, e.detail === 0); });
document.addEventListener('pointerdown', (e) => {
  if (!$('menu').hidden && !$('menu').contains(e.target) && !$('moreBtn').contains(e.target)) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('menu').hidden) { setMenu(false); $('moreBtn').focus({ preventScroll: true }); }
});
$('restart').addEventListener('click', () => setMenu(false));

// Letter bead shape (round coins or cubes) and look. Both apply to the Letters tab and to typed phrases.
document.querySelectorAll('.letter-chip').forEach((b) => b.addEventListener('click', () => {
  letterStyle = b.dataset.st;
  document.querySelectorAll('.letter-chip').forEach((o) => o.setAttribute('aria-checked', o === b ? 'true' : 'false'));
  tick(1.1 - LETTER_STYLE_ORDER.indexOf(letterStyle) * 0.05, 0.08);
  buildTray(true);
}));
document.querySelectorAll('.shape-chip').forEach((b) => b.addEventListener('click', () => {
  letterShape = b.dataset.sh;
  document.querySelectorAll('.shape-chip').forEach((o) => o.setAttribute('aria-checked', o === b ? 'true' : 'false'));
  $('letterRow').classList.toggle('cubes', letterShape !== 'round');
  tick(letterShape === 'round' ? 1.05 : 0.95, 0.08);
  buildTray(true);
}));

/* ---------- Receiving a bracelet from a trade link ---------- */
function readTrade() {
  const m = /[#&]t=([^&]*)/.exec(location.hash);
  if (!m) return null;
  const n = /[#&]n=([^&]*)/.exec(location.hash);
  let note = '';
  try { note = n ? decodeURIComponent(n[1]).replace(/\s+/g, ' ').trim().slice(0, 40) : ''; } catch (e) { /* bad note */ }
  // Clear the code from the address bar, so a reload does not receive the bracelet again.
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* optional */ }
  const list = decodeBracelet(m[1]);
  return list.length ? { list, note } : null;
}
function tradeUI() {
  const g = $('giftNote');
  g.hidden = !trade;
  if (trade) g.textContent = trade.note ? 'A bracelet for you: ' + trade.note : 'A bracelet for you';
  $('untie').lastChild.textContent = trade ? ' Back to mine' : ' Keep editing';
  $('shareBtn').hidden = !!trade;
  $('wear').lastChild.textContent = trade ? ' Hang it on my wall' : ' Add to my wall';
}
// The received bracelet is strung bead by bead in front of the player, then ties itself off.
function receiveTrade(list, note, saved) {
  trade = { saved, note };
  stopStringing();
  beads.forEach((b) => strand.remove(b.obj));
  beads = [];
  tradeUI();
  const done = () => { if (trade && mode === 'line') { beads.forEach((b) => { b.drag = null; }); setMode('tied'); } };
  if (reduce) { list.forEach((d) => addBead(d, true, 'R')); sync(); done(); return; }
  list.forEach((d, i) => setTimeout(() => { if (trade && mode === 'line') addBead(d, true, 'R', i); }, 500 + i * 140));
  setTimeout(done, 500 + list.length * 140 + 900);
}
function endTrade() {
  const t = trade;
  trade = null;
  tradeUI();
  stopStringing();
  setBeads(t.saved);
  undoStack.length = 0;
  redoStack.length = 0;
  syncUndo();
  sync();
}

document.querySelectorAll('.strands').forEach((b) => b.addEventListener('click', () => { setTwo(b.dataset.cords === '2'); setMenu(false); }));
function pickCord(c) {
  activeCord = c;
  syncTwoUI();
  tick([1.2, 0.9, 1.5][activeCord], 0.08);
  say(['New beads go on the top cord.', 'New beads go on the bottom cord.', 'New beads go through both cords.'][activeCord]);
}
document.querySelectorAll('#cordPick .seg').forEach((b) => b.addEventListener('click', () => pickCord(+b.dataset.cord)));
document.querySelectorAll('.surf').forEach((b) => {
  b.setAttribute('aria-pressed', b.dataset.surf === surface ? 'true' : 'false');
  b.addEventListener('click', () => setSurface(b.dataset.surf));
});

/* ---------- Visiting a wall: a link that carries every bracelet on it, with its tags and the decor ---------- */
// The link: one entry per bracelet (its bead code, tag, day, and a t for traded), then the wall color, sign color,
// and sign word. Nothing is stored anywhere; the link is the wall.
let visit = null;
function wallLink() {
  const parts = stack.map((e) => [encodeBracelet(e.b), encodeURIComponent(e.n || ''), (e.d || '').replace(/-/g, ''), e.t === 'trade' ? 't' : ''].join(',').replace(/,+$/, ''));
  return location.origin + location.pathname + '#w=' + parts.join(';') + '&c=' + decor.color + '&k=' + decor.neon + '&s=' + encodeURIComponent(decor.sign) + (decor.name ? '&u=' + encodeURIComponent(decor.name) : '') + (decor.lights ? '' : '&l=0') + (decor.ticket ? '' : '&x=0');
}
function readVisit() {
  const m = /[#&]w=([^&]*)/.exec(location.hash);
  if (!m) return null;
  const get = (k) => { const r = new RegExp('[#&]' + k + '=([^&]*)').exec(location.hash); try { return r ? decodeURIComponent(r[1]) : ''; } catch (e) { return ''; } };
  const entries = m[1].split(';').slice(0, 24).map((part) => {
    const [code, n, d, t] = part.split(',');
    const b = decodeBracelet(code);
    if (!b.length) return null;
    let name = '';
    try { name = cleanTag(decodeURIComponent(n || '')); } catch (e) { /* bad name */ }
    const e = { b, n: name };
    if (/^\d{8}$/.test(d || '')) e.d = d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6);
    if (t === 't') e.t = 'trade';
    return e;
  }).filter(Boolean);
  const theirs = { color: WALL_COLORS[get('c')] ? get('c') : 'white', neon: NEON_COLORS[get('k')] ? get('k') : 'rainbow', sign: cleanSign(get('s')).trim() || SIGN_DEFAULT, name: cleanName(get('u')), lights: get('l') !== '0', ticket: get('x') !== '0' };
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* optional */ }
  return entries.length ? { entries, decor: theirs } : null;
}
function visitUI() {
  document.body.classList.toggle('visiting', !!visit);
  $('copyRing').hidden = !visit;
  syncAnother();
  syncStack();
}
// The player's own wall is set aside, never saved over, while the visited one hangs in its place.
function startVisit(v) {
  visit = { saved: stack, decor: { ...decor } };
  stack = v.entries;
  Object.assign(decor, v.decor);
  applyDecor();
  scrollY = 0; scrollV = 0;
  rebuildStack();
  visitUI();
  setMode('stack');
  say('Visiting a wall with ' + stack.length + ' bracelets. Tap one to take a copy onto your own string.');
}
function endVisit() {
  if (!visit) return;
  const v = visit;
  visit = null;
  stack = v.saved;
  Object.assign(decor, v.decor);
  applyDecor();
  scrollY = 0; scrollV = 0;
  rebuildStack();
  visitUI();
}
// Taking a copy: the bracelet arrives the way a trade does, strung in front of the player and tied off, ready to hang.
$('copyRing').addEventListener('click', () => {
  const r = popRing;
  closePop(false);
  if (!r || !visit) return;
  const who = decor.name || (decor.sign !== SIGN_DEFAULT ? decor.sign : '');
  const note = who ? 'From ' + who : 'From a friend';
  const list = r.entry.b.map((d) => ({ ...d }));
  endVisit();
  setMode('line');
  receiveTrade(list, note, defs());
  tick(1.3, 0.1);
});

/* ---------- Boot ---------- */
async function start() {
  // Letter beads are drawn with the display font, so wait briefly for it.
  try { await Promise.race([Promise.all([document.fonts.load('700 64px Fredoka'), document.fonts.load('120px Pacifico')]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fallback font */ }
  readTheme();
  resize();
  new ResizeObserver(resize).observe(cv);
  buildSwatches();
  buildTray();
  syncUndo();
  // Draw the other tabs' thumbnails once the game is up, so switching tabs is instant.
  setTimeout(() => renderThumbs([...LETTERS, ...CHARMS, ...DANGLES]), 400);

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('13beads.strand') || 'null'); } catch (e) { /* optional */ }
  const got = readTrade(), visiting = readVisit();
  if (Array.isArray(saved) && saved.length) setBeads(saved);
  else if (!got && !visiting) stringStarter(350);
  sync();
  rebuildStack();
  syncStack();
  if (got) receiveTrade(got.list, got.note, Array.isArray(saved) ? saved : []);
  else if (visiting) startVisit(visiting);
  say(HINT);
  requestAnimationFrame((t) => { last = t; frame(t); });
}
start();

// The game installs to a home screen and opens offline: a service worker keeps the page and its files.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {}); });
}
// Staying current: a home screen app can sit open for days. Each time the player comes back to the game, it checks
// whether a newer version is live (the page names a different build file) and, if so, reloads into it, but only on
// the string screen with nothing open. The string is saved on every change, so only undo history is lost. Anywhere
// else (tie-off, the wall, a trade or visit, a sheet or field in use) it waits for the next return.
const ownBuild = (document.querySelector('script[type="module"][src*="assets/index-"]') || {}).src || '';
let newBuild = false, checking = false;
const safeToReload = () => mode === 'line' && !trade && !visit && !document.querySelector('.sheet:not([hidden]), [role="dialog"]:not([hidden]), .menu:not([hidden])')
  && !(document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName));
async function checkBuild() {
  if (!ownBuild || location.protocol !== 'https:' || checking || !navigator.onLine) return;
  checking = true;
  try {
    if (!newBuild) {
      const html = await (await fetch(new URL('../', ownBuild), { cache: 'no-store' })).text();
      const live = (html.match(/assets\/index-[\w-]+\.js/) || [])[0];
      newBuild = !!live && !ownBuild.endsWith(live);
    }
    if (newBuild && safeToReload()) location.reload();
  } catch (e) { /* offline or blocked: try again next time */ }
  checking = false;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkBuild(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) checkBuild(); });

// Bottom sheets sit above the on-screen keyboard: the keyboard's height is kept in a CSS variable.
if (window.visualViewport) {
  const kb = () => document.documentElement.style.setProperty('--kb', Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop) + 'px');
  visualViewport.addEventListener('resize', kb);
  visualViewport.addEventListener('scroll', kb);
}
