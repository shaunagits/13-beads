import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import qrcode from 'qrcode-generator';
import { encodeBracelet, decodeBracelet, COLORS, colorBeads, FIXED, LETTERS, letterBeads, LETTER_STYLES, CHARMS, DANGLES, UNIT, DANGLE, makeBead, tickMaterials, defKey, capFacing } from './beads.js';
import { isDark, onTheme, toggleTheme } from './theme.js';
import tableUrl from './assets/table-dark.jpg';
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
const SIGN_DEFAULT = '13 beads', SIGN_MAX = 12;
const cleanSign = (t) => String(t || '').replace(/[^A-Za-z0-9 !?&]/g, '').replace(/\s+/g, ' ').slice(0, SIGN_MAX);
let decor = { color: 'white', sign: SIGN_DEFAULT };
try {
  const d = JSON.parse(localStorage.getItem('13beads.wall') || 'null');
  if (d && WALL_COLORS[d.color]) decor.color = d.color;
  if (d && typeof d.sign === 'string' && cleanSign(d.sign).trim()) decor.sign = cleanSign(d.sign).trim();
} catch (e) { /* optional */ }
const STACK_HINT = matchMedia('(pointer: coarse)').matches
  ? 'Tap a bracelet to jingle it. Hold it to edit it or take it off.'
  : 'Click a bracelet to jingle it. Hold or right-click it to edit it or take it off.';
const EMPTY_WALL = 'Nothing on display yet. Finish a bracelet and hang it here.';
const STACK_MAX = 12;

/* ---------- State ---------- */
let beads = [], fallers = [], undoStack = [], redoStack = [];
let letterStyle = 'white';
let mode = 'line', kLin = 0, tiedFired = false, side = 'R';
let W = 300, H = 300, sizeCur = 34, lineLen = 600;
let T = 0, last = 0;
let phraseTimer = null, lastTubeKey = '';
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
let tableLoaded = false;
// The tabletop texture is a photo-scanned wood surface (CC0, Poly Haven "Dark Wood"), in both light and dark mode.
const tableLoader = new THREE.TextureLoader();
function buildTable() {
  if (tableLoaded) return;
  tableLoaded = true;
  tableLoader.load(tableUrl, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (table.material.map) table.material.map.dispose();
    table.material.map = t;
    // Part of the color comes from the texture itself, so the moving colored lights do not tint the table.
    table.material.emissive.set(0xffffff);
    table.material.emissiveMap = t;
    applyMood();
    table.material.needsUpdate = true;
  });
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
tube.castShadow = true;
strand.add(tube);
const knot = new THREE.Group();
knot.add(new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12), stringMat));
for (const sgn of [-1, 1]) {
  const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sgn * 10, 13, 3), new THREE.Vector3(sgn * 20, 22, 0)]);
  knot.add(new THREE.Mesh(new THREE.TubeGeometry(c, 12, 1.4, 6), stringMat));
}
knot.visible = false;
strand.add(knot);

// Tie-off confetti, like the paper confetti at a stadium show: soft pastel paper rectangles that tumble and
// flutter down, with little maple leaves mixed in.
const PAPER_N = 96, LEAF_N = 28;
const CONFETTI_COLORS = [0xf7a8c8, 0xa9d6f2, 0xc8b4f2, 0xf6e2a2, 0xffffff, 0xf9c4a8].map((c) => new THREE.Color(c));
function mapleShape() {
  const pts = [[0, 0.5], [0.08, 0.32], [0.2, 0.38], [0.17, 0.13], [0.36, 0.3], [0.4, 0.2], [0.5, 0.22], [0.43, 0.05], [0.48, 0], [0.3, -0.13],
    [0.34, -0.22], [0.06, -0.18], [0.035, -0.46], [-0.035, -0.46], [-0.06, -0.18], [-0.34, -0.22], [-0.3, -0.13], [-0.48, 0], [-0.43, 0.05],
    [-0.5, 0.22], [-0.4, 0.2], [-0.36, 0.3], [-0.17, 0.13], [-0.2, 0.38], [-0.08, 0.32]];
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  return sh;
}
const confettiMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.55, metalness: 0, transparent: true, opacity: 1, depthWrite: false });
const sparks = new THREE.Group();
const paperMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1.55), confettiMat, PAPER_N);
const leafMesh = new THREE.InstancedMesh(new THREE.ShapeGeometry(mapleShape(), 4), confettiMat, LEAF_N);
for (const m of [paperMesh, leafMesh]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sparks.add(m); }
sparks.visible = false;
scene.add(sparks);
const confetti = [];
const cfObj = new THREE.Object3D();
let sparkLife = 0;

function readTheme() {
  // A pale cord in both themes, so it shows up against the dark wood table.
  stringMat.color.set(0xe6ddf2);
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
function save() { if (trade) return; try { localStorage.setItem('13beads.strand', JSON.stringify(defs())); } catch (e) { /* optional */ } }
const usedLen = () => beads.reduce((a, b) => a + UNIT[b.def.k], 0);
const fits = (d, extra = 0) => beads.length < MAX_COUNT && usedLen() + extra + UNIT[d.k] <= BUDGET + 1e-6;
function sync() {
  const n = beads.length, pct = Math.min(100, Math.round((usedLen() / BUDGET) * 100)), c = $('count');
  c.firstChild.textContent = n + (n === 1 ? ' bead' : ' beads');
  c.style.setProperty('--fill', pct + '%');
  c.classList.toggle('full', pct >= 100);
  c.setAttribute('aria-label', n + (n === 1 ? ' bead' : ' beads') + ' on the string, ' + pct + ' percent full');
  save();
}
function pushUndo() { undoStack.push(JSON.stringify(defs())); if (undoStack.length > 40) undoStack.shift(); redoStack.length = 0; syncUndo(); }
function syncUndo() { $('undo').disabled = !undoStack.length; $('redo').disabled = !redoStack.length; }

function addBead(def, noUndo, end = side, step = null) {
  if (mode !== 'line') return false;
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
  for (const ch of text.toUpperCase()) {
    if (/[A-Z0-9!?&]/.test(ch)) list.push(letterStyle === 'black' ? { k: 'letter', ch, st: 'black' } : { k: 'letter', ch });
    else if (ch === ' ' && list.length) list.push({ k: 'spacer' });
  }
  if (!list.length) { say('Type letters, numbers, or ! ? & to spell a phrase.'); return; }
  // Count how much of the phrase fits in the room left on the string.
  let room = 0, len = 0;
  while (room < list.length && fits(list[room], len)) len += UNIT[list[room++].k];
  if (room <= 0) { say('That is a full wrist. Pull a bead off to add more.'); return; }
  if (list.length > room) say('Only ' + room + ' beads fit, so the phrase was cut short.');
  pushUndo();
  clearInterval(phraseTimer);
  const end = side;
  // On the left end the last letter goes on first, so the phrase still reads left to right.
  const q = list.slice(0, room);
  if (end === 'L') q.reverse();
  if (reduce) { q.forEach((d) => addBead(d, true, end)); return; }
  let step = 0;
  phraseTimer = setInterval(() => { const d = q.shift(); if (!d || !addBead(d, true, end, step++)) clearInterval(phraseTimer); }, 120);
}
function setMode(m) {
  // Leaving a received bracelet any way other than hanging it puts the player's own string back.
  if (trade && m !== 'tied') endTrade();
  mode = m;
  $('buildPanel').hidden = m !== 'line';
  $('hud').hidden = false;
  $('hud').dataset.mode = m;
  $('menu').dataset.mode = m;
  $('stackBtn').setAttribute('aria-pressed', m === 'stack' ? 'true' : 'false');

  $('count').hidden = m !== 'line';
  closePop(false);
  closeCustom(false);
  closeShare(false);
  strand.visible = m !== 'stack';
  board.visible = m === 'stack';
  backdrop.visible = false;
  table.visible = m !== 'stack';
  applyMood();
  sparks.visible = false;
  if (m === 'tied') { tiedFired = false; $('photoBtn').disabled = false; say(TIED_HINT); }
  else if (m === 'stack') { syncStack(); say(stack.length ? STACK_HINT : EMPTY_WALL); }
  else say(HINT);
  if (reduce) kLin = m === 'tied' ? 1 : 0;
}

/* ---------- The wall: a painted wall with a shelf, where finished things go on display ---------- */
// Stage one holds one display piece: a gold T-bar stand with bracelets hanging from its bars.
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
  x.textAlign = 'left'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineCap = 'round';
  const cy = NEON_H / 2 + 4;
  const strokeAll = () => {
    let px = (NEON_W - L.total) / 2;
    [...word].forEach((ch, i) => { x.strokeText(ch, px, cy); px += L.ws[i] + L.gap; });
  };
  if (lit) {
    // White neon: a soft warm glow, then the tube, then a bright core, kept thin so the letters stay readable.
    x.shadowColor = 'rgba(255,214,170,.9)'; x.shadowBlur = 16;
    x.strokeStyle = 'rgba(255,238,215,.85)'; x.lineWidth = 6;
    strokeAll();
    x.shadowBlur = 4;
    x.strokeStyle = '#ffffff'; x.lineWidth = 2.6;
    strokeAll();
  } else {
    // Unlit by day: clear glass tubes, with a soft shadow on the wall so they read on a light wall.
    x.shadowColor = 'rgba(60,45,35,.32)'; x.shadowBlur = 5; x.shadowOffsetX = 3; x.shadowOffsetY = 4;
    x.strokeStyle = '#fdfbf8'; x.lineWidth = 8;
    strokeAll();
    x.shadowColor = 'transparent';
    x.strokeStyle = '#b5aa9f'; x.lineWidth = 2.6;
    strokeAll();
  }
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
  sun.intensity = !onWall ? 1.7 : night ? 0.4 : 2.1;
  scene.environmentIntensity = !onWall ? 0.55 : night ? 0.2 : 0.5;
  stageA.intensity = stageB.intensity = onWall ? 0.12 : reduce ? 0.5 : 1.0;
  wall.material.color.set(night ? (WALL_COLORS[decor.color] || WALL_COLORS.white).night : 0xffffff);
  // The craft table: evenly lit by day; in dark mode the room dims and a warm desk lamp pools light in the middle.
  const deskNight = !onWall && isDark();
  if (table.material.map) {
    table.material.emissiveIntensity = deskNight ? 0.03 : 0.5;
    table.material.color.setScalar(deskNight ? 0.4 : 0.62);
  }
  deskLamp.intensity = deskNight ? 7 : 0;
  if (deskNight) { sun.intensity = 0.55; sun.color.set(0xffe2c4); scene.environmentIntensity = 0.35; stageA.intensity = stageB.intensity = 0.35; }
  lamp.intensity = night ? 2.4 : 0;
  neonGlow.intensity = night ? 1.5 : 0;
  if (!neonMaps.on) { neonMaps.on = neonTexture(true); neonMaps.off = neonTexture(false); }
  neon.material.map = night ? neonMaps.on : neonMaps.off;
  neon.material.blending = THREE.NormalBlending;
  neon.material.needsUpdate = true;
}
onTheme(applyMood);

// Depth of field on the wall: bracelets stay sharp, the wall behind falls slightly soft, like a phone photo.
// The display piece: a gold T-bar jewelry stand on a wood shelf. Bracelets hang from its bars on
// small hooks, facing forward so every phrase can be read, and swing when touched.
const stand = new THREE.Group();
board.add(stand);
const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xf6c655, metalness: 0.9, roughness: 0.22, clearcoat: 0.6 });
function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#5b3a27';
  x.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 90; i++) {
    x.strokeStyle = `rgba(${Math.random() < 0.5 ? '25,12,6' : '150,100,70'},${0.08 + Math.random() * 0.2})`;
    x.lineWidth = 0.6 + Math.random() * 2.4;
    const y = Math.random() * 128;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(170, y + 8, 340, y - 8, 512, y + 3); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.75 });
// The display: white velvet bracelet cones on a slim shelf. Bracelets stack around a cone the way they do on a
// real one, each resting on the one below. Drag a cone to spin it and read the phrases; hold a bracelet to edit it.
const velvet = new THREE.MeshPhysicalMaterial({ color: 0xf4f0ea, roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffffff) });
const CONE_TILT = 0.24;
// Where the cones go on this stage, in stage pixels (y measured down from the top).
function wallGrid() {
  const maxCones = W < 520 ? 2 : 3, per = Math.ceil(STACK_MAX / maxCones);
  const n = Math.min(stack.length, STACK_MAX), cones = clamp(Math.ceil(n / per), 1, maxCones);
  const SIGN_ROOM = 118, BTN_ROOM = 92;
  const shelf = H - BTN_ROOM - 10;
  const spacing = Math.min((W * 0.92) / Math.max(cones, maxCones === 2 ? 2 : 2.4), 250);
  const R = clamp(spacing * 0.36, 34, 74);
  // Bracelet bead size: the same rule the loop uses everywhere else, so phrases stay readable.
  const S = clamp(R * 0.3, 13, 24), gap = S * 1.18;
  const avail = shelf - SIGN_ROOM - 12;
  const coneH = clamp(Math.min(avail * 0.92, R * 5.2), R * 2.4, 560);
  return { cones, per, spacing, R, S, gap, coneH, shelf, top: shelf - coneH, cap: Math.min(STACK_MAX, cones * per) };
}
let standKey = '';
const coneGroups = [];
function buildStand(grid) {
  for (const m of [...stand.children]) { stand.remove(m); m.traverse((o) => { if (o.userData.own) o.geometry.dispose(); }); }
  coneGroups.length = 0;
  const solid = (geo, mat, parent, x, y, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.userData.own = true;
    parent.add(m);
    return m;
  };
  const shelfY = H / 2 - grid.shelf, R = grid.R, Hc = grid.coneH;
  // Slim floating shelf.
  solid(new THREE.BoxGeometry(Math.min(W * 0.98, grid.cones * grid.spacing + 140), 11, 140), woodMat, stand, 0, shelfY - 5.5, -20);
  // A cone: a soft velvet taper with a rounded top, standing on a low round foot.
  // Slim, like a jewelry display cone: just wider than a bracelet at the foot, narrowing to a rounded tip.
  const Rb = R * 1.08, Rt = R * 0.2;
  const prof = [[0, 0], [Rb * 1.06, 0], [Rb * 1.07, 3], [Rb * 1.03, 6], [Rb, 7]];
  for (let i = 1; i <= 16; i++) { const t = i / 16; prof.push([Rb + (Rt - Rb) * t, 7 + (Hc - 7 - Rt) * t]); }
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); prof.push([Rt * Math.cos(a), Hc - Rt + Rt * Math.sin(a)]); }
  const coneGeo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 56);
  for (let c = 0; c < grid.cones; c++) {
    const g = new THREE.Group(), spinner = new THREE.Group();
    g.position.set((c - (grid.cones - 1) / 2) * grid.spacing, shelfY, 0);
    g.rotation.x = CONE_TILT;
    const m = solid(coneGeo, velvet, spinner, 0, 0, 0);
    m.userData.own = c === 0;
    g.add(spinner);
    stand.add(g);
    coneGroups.push({ g, spinner, spin: 0, spinV: 0, Rb, Rt, Hc });
  }
}
let stack = [];
let rings = [], grabRing = null;
try { const st = JSON.parse(localStorage.getItem('13beads.stack') || '[]'); if (Array.isArray(st)) stack = st.filter(Array.isArray); } catch (e) { /* optional */ }
function saveStack() { try { localStorage.setItem('13beads.stack', JSON.stringify(stack)); } catch (e) { /* optional */ } }
function syncStack() {
  $('wallCount').textContent = stack.length;
  $('wallCount').hidden = !stack.length;
  $('stackBtn').setAttribute('aria-label', stack.length ? 'Your wall, ' + stack.length + ' on display' : 'Your wall');
  if (mode === 'stack') $('photoBtn').disabled = !stack.length;
}
// A bracelet lying around a cone: the beads stand in a level ring, letters facing out, the front of the
// phrase toward the viewer. Its height on the cone is set each frame.
function buildRing(list, grid) {
  let U = 0;
  for (const d of list) U += UNIT[d.k];
  const R = grid.R, S = Math.min(grid.S, (TAU * R - 10) / Math.max(U, 1));
  const g = new THREE.Group(), loop = new THREE.Group(), hangs = [];
  let acc = (-U * S) / 2;
  list.forEach((d, i) => {
    const w = UNIT[d.k] * S, o = makeBead(d), phi = (acc + w / 2) / R;
    acc += w;
    if (o.userData.cup) o.userData.cup.rotation.y = capFacing(list, i) > 0 ? 0 : Math.PI;
    o.scale.setScalar(S);
    o.position.set(R * Math.sin(phi), 0, R * Math.cos(phi));
    o.rotation.y = phi;
    if (o.userData.hang) hangs.push({ hang: o.userData.hang, phi });
    loop.add(o);
  });
  const cord = new THREE.Mesh(new THREE.TorusGeometry(R, 0.8, 6, 72).rotateX(Math.PI / 2), stringMat);
  loop.add(cord);
  g.add(loop);
  return { g, loop, R, S, hangs, drop: 0, dropv: 0, landed: true, ph: Math.random() * 6, sx: 0, sy: 0, rx: R, ry: R * 0.4, cone: null, wob: 0, wobv: 0 };
}
// Oldest bracelets sit lowest on the first cone; newer ones stack on top, then fill the next cone.
function rebuildStack() {
  const grid = wallGrid();
  standKey = [grid.cones, Math.round(grid.R), Math.round(grid.coneH / 4), Math.round(W / 30), Math.round(H / 30)].join('|');
  rings.forEach((r) => r.g.parent && r.g.parent.remove(r.g));
  buildStand(grid);
  rings = stack.slice(-grid.cap).reverse().map((list) => buildRing(list.filter((d) => d && UNIT[d.k]), grid));
  const n = rings.length;
  rings.forEach((r, i) => {
    const j = n - 1 - i, c = Math.min(coneGroups.length - 1, Math.floor(j / grid.per)), level = j % grid.per;
    const cg = coneGroups[c];
    // Rest where the cone is just narrower than the bracelet, then one bead height higher per bracelet below.
    const y0 = ((cg.Rb - grid.R * 0.94) / (cg.Rb - cg.Rt)) * (cg.Hc - cg.Rt) + 7 + grid.S * 0.6;
    r.cone = cg;
    r.level = level;
    r.y0 = y0 + level * grid.gap;
    r.g.position.y = r.y0;
    cg.spinner.add(r.g);
  });
  buildRingButtons();
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
function braceletName(list) {
  const word = list.filter((d) => d && d.k === 'letter').map((d) => d.ch).join('');
  return word ? 'Bracelet that says ' + word : 'Bracelet with ' + list.length + ' beads';
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
    b.setAttribute('aria-label', braceletName(stack[stack.length - 1 - i]) + ', ' + (i + 1) + ' of ' + rings.length + '. Press Enter to edit it or take it off.');
    b.addEventListener('focus', () => { kbRing = r; });
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
function wear() {
  if (!beads.length) return;
  const back = trade ? trade.saved : [];
  if (trade) { trade = null; tradeUI(); }
  stack.push(defs());
  if (stack.length > 24) stack.shift();
  saveStack();
  rebuildStack();
  if (rings[0] && !reduce) { rings[0].drop = H * 0.8; rings[0].landed = false; whoosh(); }
  pushUndo();
  setBeads(back);
  sync();
  kLin = 0;
  setMode('stack');
}
function updateStack(dt) {
  wall.scale.set(W * 1.4, H * 1.4, 1);
  const grid = wallGrid();
  if ([grid.cones, Math.round(grid.R), Math.round(grid.coneH / 4), Math.round(W / 30), Math.round(H / 30)].join('|') !== standKey) rebuildStack();
  {
    // The sign sits in the band between the top of the cones and the buttons at the top of the screen.
    const topY = H / 2 - grid.top, lo = topY + 24, hi = H / 2 - 50;
    const signH = clamp((hi - lo) * 1.25, 60, 110), signW = Math.min(signH * (NEON_W / NEON_H), W * 0.92);
    neon.scale.set(signW, signW * (NEON_H / NEON_W), 1);
    // Sit the sign a little above the cones rather than up against the top of the screen.
    neon.position.set(0, clamp(lo + signH * 0.45 + 20, lo + 10, Math.max(lo + 10, (lo + hi) / 2)), -60);
    neonGlow.position.set(0, neon.position.y, 60);
    lamp.position.set(W * 0.42, -H * 0.3, 220);
  }
  for (const cg of coneGroups) {
    // A spun cone coasts to a stop. Tilting the phone turns the cones a little.
    if (cg !== grabCone) { cg.spin += cg.spinV * dt; cg.spinV *= Math.pow(0.12, dt); }
    const lean = reduce ? 0 : Math.sin(T * 0.35) * 0.06 + tiltS * 0.3;
    cg.spinner.rotation.y = cg.spin + lean;
  }
  rings.forEach((r) => {
    // Dropping onto the cone from above, with a little settle.
    r.dropv += (-r.drop * 150 - r.dropv * 13) * dt;
    r.drop += r.dropv * dt;
    if (!r.landed && r.drop < 6) { r.landed = true; thud(); chime(); buzz(25); r.wobv += 3; }
    r.wobv += (-r.wob * 60 - r.wobv * 5) * dt;
    r.wob += r.wobv * dt;
    r.g.position.y = r.y0 + r.drop;
    r.g.rotation.set(r.wob * 0.05, 0, r.wob * 0.04);
    r.pick = lerp(r.pick || 0, popRing === r || kbRing === r ? 1 : 0, reduce ? 1 : Math.min(1, dt * 14));
    r.loop.scale.setScalar(1 + r.pick * 0.07);
    // Where the bracelet is on screen: its center and the half-widths of the ellipse it makes.
    r.g.updateWorldMatrix(true, false);
    const c = toScreen(r.g, 0, 0), e = toScreen(r.g, r.R, 0);
    tmpV.set(0, 0, r.R); r.g.localToWorld(tmpV); tmpV.project(camera);
    const fy = ((1 - tmpV.y) / 2) * H;
    r.sx = c.x; r.sy = c.y; r.rx = Math.abs(e.x - c.x); r.ry = Math.max(8, Math.abs(fy - c.y));
    if (r.btn) {
      r.btn.style.width = r.rx * 2 + 10 + 'px';
      r.btn.style.height = r.ry * 2 + r.S * 2 + 'px';
      r.btn.style.transform = `translate(${r.sx - r.rx - 5}px, ${r.sy - r.ry - r.S}px)`;
    }
  });
}
// Which cone is under the pointer, and which bracelet on it (stage pixels, y down)?
let grabCone = null;
function coneAt(p) {
  let best = null, bd = 1e9;
  coneGroups.forEach((cg) => {
    const base = toScreen(cg.g, 0, 0), tip = toScreen(cg.g, 0, cg.Hc);
    const half = (cg.Rb * 1.2 * (W / W));
    if (p.y < tip.y - 20 || p.y > base.y + 30) return;
    const d = Math.abs(p.x - base.x);
    if (d < half + 30 && d < bd) { bd = d; best = cg; }
  });
  return best;
}
// Which bracelet is under the pointer: the nearest ring whose band (its screen ellipse) the point falls in.
function ringAt(p) {
  let best = null, bd = 1e9;
  for (const r of rings) {
    const dx = (p.x - r.sx) / (r.rx + 12), dy = (p.y - r.sy) / (r.ry + r.S + 6);
    const d = dx * dx + dy * dy;
    if (d < 1 && Math.abs(p.y - r.sy) < bd) { bd = Math.abs(p.y - r.sy); best = r; }
  }
  return best;
}

// The confirm popover sits just below the picked bracelet, or above it if there is no room.
let popRing = null, holdTimer = 0, popOpener = null;
function openPop(r, opener) {
  closeCustom(false);
  popRing = r;
  popOpener = opener || r.btn || null;
  buzz(30);
  tick(0.9, 0.1);
  const pop = $('pop');
  pop.hidden = false;
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const cx = r.sx, top = r.sy - r.ry - r.S, bottom = r.sy + r.ry + r.S;
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
function openCustom() {
  closePop(false);
  const box = $('custom');
  box.hidden = false;
  $('customBtn').setAttribute('aria-expanded', 'true');
  box.querySelector(`input[value="${decor.color}"]`).checked = true;
  $('signText').value = decor.sign;
  box.querySelector('input:checked').focus({ preventScroll: true });
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
$('custom').addEventListener('keydown', (e) => trapTab(e, $('custom')));
$('custom').addEventListener('change', (e) => {
  if (e.target.name !== 'wallColor') return;
  decor.color = e.target.value;
  saveDecor();
  applyDecor();
  tick(1.1, 0.08);
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
  $('photoBtn').setAttribute('aria-expanded', 'true');
  $('cardNote').focus({ preventScroll: true });
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
  try { await navigator.clipboard.writeText(url); btn.textContent = 'Link copied'; } catch (e) { btn.textContent = 'Copy failed'; }
  say(btn.textContent + '.');
  setTimeout(() => { btn.textContent = 'Send link'; }, 2200);
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
$('cardNote').addEventListener('input', () => { if (!$('qrBox').hidden) { $('qrBox').hidden = true; $('showQr').click(); } });
function closeShare(restore = true) {
  if ($('shareCard').hidden) return;
  $('shareCard').hidden = true;
  $('qrBox').hidden = true;
  $('showQr').setAttribute('aria-expanded', 'false');
  $('photoBtn').setAttribute('aria-expanded', 'false');
  if (restore) $('photoBtn').focus({ preventScroll: true });
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
  deliverPng(c, '13-beads-card.png', 'Card saved as 13-beads-card.png.');
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
  for (let i = 0; i < PAPER_N + LEAF_N; i++) {
    const leaf = i >= PAPER_N, a = Math.random() * TAU, sp = 120 + Math.random() * 260;
    // Pops out from around the loop and up, then floats down.
    confetti.push({
      leaf, idx: leaf ? i - PAPER_N : i,
      x: Math.cos(a) * R * 0.9, y: Math.sin(a) * R * 0.9, z: 40 + Math.random() * 60,
      vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp * 0.6 + 260 + Math.random() * 120,
      rx: Math.random() * TAU, ry: Math.random() * TAU, rz: Math.random() * TAU,
      wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 10, wz: (Math.random() - 0.5) * 8,
      size: leaf ? 15 + Math.random() * 6 : 8 + Math.random() * 4, ph: Math.random() * TAU, sw: 0.8 + Math.random() * 1.4,
    });
    (leaf ? leafMesh : paperMesh).setColorAt(leaf ? i - PAPER_N : i, CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
  }
  for (const m of [paperMesh, leafMesh]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
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
  if (mode === 'tied' && kLin >= 1 && !tiedFired) { tiedFired = true; burst(); chime(); buzz(30); }

  tiltS += (tilt - tiltS) * 0.1;
  const n = beads.length;
  let U = 0;
  for (const b of beads) U += UNIT[b.def.k];
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

  let acc = (lineLen - U * sizeCur) / 2;
  for (const b of beads) {
    const w = UNIT[b.def.k] * sizeCur;
    b.target = acc + w / 2;
    b.off = acc + w / 2 - lineLen / 2;
    acc += w;
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
  }

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

  const tubeKey = [0, 15, 30, 45, 60, 75].map((i) => pts[i].x.toFixed(1) + ',' + pts[i].y.toFixed(1)).join() + k.toFixed(3) + W + 'x' + H;
  if (tubeKey !== lastTubeKey) {
    lastTubeKey = tubeKey;
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x - cx, cy - p.y, 0)));
    tube.geometry.dispose();
    tube.geometry = new THREE.TubeGeometry(curve, 140, 1.35, 8, false);
    stringMat.map.repeat.set(Lm / 9, 1);
  }
  knot.visible = k > 0.5;
  if (knot.visible) {
    knot.position.set(pts[0].x - cx, cy - pts[0].y, 0);
    knot.scale.setScalar((k - 0.5) * 2);
  }

  const defList = defs();
  beads.forEach((b, i) => { if (b.obj.userData.cup) b.obj.userData.cup.rotation.y = capFacing(defList, i) > 0 ? 0 : Math.PI; });
  for (const b of beads) {
    const f = lerp(b.s / lineLen, 0.5 + (b.off * (Sc / sizeCur)) / C, k), p = pointAt(pts, cum, f * Lm);
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
      (c.leaf ? leafMesh : paperMesh).setMatrixAt(c.idx, cfObj.matrix);
    }
    paperMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;
    confettiMat.opacity = clamp(sparkLife / 0.8, 0, 1);
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
  // The wood grain is drawn finer to match, as if the table is a little farther away.
  if (table.material.map) table.material.map.repeat.set((W * 1.6) / 620, (H * 1.6) / 620);
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
    spin = { x: p.x, y: p.y, moved: false };
    spinVY = 0; spinVX = 0;
    grabRing = mode === 'stack' ? ringAt(p) : null;
    grabCone = mode === 'stack' ? (grabRing ? grabRing.cone : coneAt(p)) : null;
    if (grabCone) grabCone.spinV = 0;
    if (!$('custom').hidden) { closeCustom(false); spin.dismiss = true; }
    else if (!$('shareCard').hidden) { closeShare(false); spin.dismiss = true; }
    else if (popRing) { closePop(false); spin.dismiss = true; }
    else if (grabRing) {
      // Press and hold a bracelet to get the option to take it off.
      const r = grabRing;
      holdTimer = setTimeout(() => { if (spin && !spin.moved && grabRing === r) { spin.held = true; openPop(r); } }, 480);
    }
    return;
  }
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
  const band = matchMedia('(pointer: coarse)').matches ? 22 : 14;
  if (rd < band) pluck = { x: p.x, y: p.y, dx: 0, dy: 0, armed: false };
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
let lastX = 0;
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
      // Drag sideways to spin the cone, like turning a display on a counter.
      if (grabCone && spin.moved) {
        const d = (p.x - spin.x) * 0.014;
        grabCone.spin += d;
        grabCone.spinV = d / 0.016;
        if (Math.abs(p.x - (spin.lastNote || spin.x)) > 28) { spin.lastNote = p.x; note(coneGroups.indexOf(grabCone) * 2 + Math.floor(Math.random() * 3)); }
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
});
function release() {
  if (spin) {
    // A tap on the tied bracelet makes it hop and throw sparkles.
    if (!spin.moved && mode === 'tied' && kLin >= 1) { hop = 0; burst(); chime(); buzz(20); }
    clearTimeout(holdTimer);
    if (!spin.moved && !spin.held && !spin.dismiss && mode === 'stack' && (grabRing || grabCone)) {
      // A tap jingles: the bracelet bounces on its cone, or the cone gives a little turn.
      if (grabRing) grabRing.wobv += 6;
      else grabCone.spinV += (Math.random() < 0.5 ? -1 : 1) * 2.2;
      const base = grabRing ? rings.indexOf(grabRing) : coneGroups.indexOf(grabCone) * 3;
      [0, 2, 4].forEach((n, i) => setTimeout(() => note(base + n), i * 60));
      buzz(15);
    }
    grabRing = null;
    grabCone = null;
    spin = null;
    return;
  }
  if (pluck) {
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
        if ((await DeviceOrientationEvent.requestPermission()) === 'granted') { listenTilt(); btn.hidden = true; say('Tilt is on. Lean your phone to swing the string.'); }
        else say('Tilt was not allowed, so the string stays level.');
      } catch (err) { say('Tilt is not available in this browser.'); }
    });
  } else listenTilt();
}
cv.addEventListener('pointerleave', () => { parTX = 0; parTY = 0; });

/* ---------- Tray (thumbnails are real renders of each 3D bead) ---------- */
// The Beads tab shows one compartment per bead type, in the color picked on the color strip.
let colorIdx = 0;
try { colorIdx = clamp(parseInt(localStorage.getItem('13beads.color'), 10) || 0, 0, COLORS.length - 1); } catch (e) { /* optional */ }
const TABS = { colors: () => [...colorBeads(COLORS[colorIdx]), ...FIXED], letters: () => letterBeads(letterStyle), charms: () => CHARMS, dangles: () => DANGLES };
let curTab = 'colors';
const thumbs = {};
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
  const todo = items.filter((it) => !thumbs[defKey(it.def)]);
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
    } else o.rotation.set(0.25, item.def.k === 'clay' ? -1.05 : -0.3, 0);
    if (o.userData.flap) { o.userData.flap[0].rotation.y = -0.35; o.userData.flap[1].rotation.y = 0.35; }
    s.add(o);
    r.render(s, cam);
    thumbs[defKey(item.def)] = c.toDataURL('image/png');
    s.remove(o);
  }
}
function buildSwatches() {
  const strip = $('colorStrip');
  strip.textContent = '';
  COLORS.forEach((col, i) => {
    const b = document.createElement('button');
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
      strip.querySelectorAll('.color-dot').forEach((o, j) => o.setAttribute('aria-checked', j === i ? 'true' : 'false'));
      tick(1 + i * 0.02, 0.08);
      buildTray(true);
    });
    strip.appendChild(b);
  });
}
function buildTray(keepScroll) {
  const tray = $('tray'), items = TABS[curTab](), x = tray.scrollLeft;
  $('colorStrip').hidden = curTab !== 'colors';
  $('letterRow').hidden = curTab !== 'letters';
  renderThumbs(items);
  tray.textContent = '';
  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bead-btn';
    btn.setAttribute('aria-label', 'Add ' + item.name);
    btn.title = item.name;
    const img = document.createElement('img');
    img.alt = '';
    img.src = thumbs[defKey(item.def)] || '';
    btn.appendChild(img);
    btn.addEventListener('click', () => { arm(); addBead(item.def); });
    tray.appendChild(btn);
  }
  tray.scrollLeft = keepScroll ? x : 0;
}
// Fold the bead case away, or open it again.
$('caseToggle').addEventListener('click', () => {
  const closed = $('case').classList.toggle('closed');
  $('caseToggle').setAttribute('aria-expanded', closed ? 'false' : 'true');
  $('caseToggle').setAttribute('aria-label', closed ? 'Show the bead case' : 'Hide the bead case');
  $('caseToggle').querySelector('.lid-label').textContent = closed ? 'Show beads' : 'Bead case';
  tick(closed ? 0.8 : 1.2, 0.1);
});
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  curTab = t.dataset.tab;
  document.querySelectorAll('.tab').forEach((o) => o.setAttribute('aria-selected', o === t ? 'true' : 'false'));
  buildTray();
}));
document.querySelectorAll('.seg').forEach((t) => t.addEventListener('click', () => {
  side = t.dataset.side;
  document.querySelectorAll('.seg').forEach((o) => o.setAttribute('aria-pressed', o === t ? 'true' : 'false'));
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
  clearInterval(phraseTimer);
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
const STARTER = (() => {
  const L = (ch) => ({ k: 'letter', ch }), pink = { k: 'pony', h: 330, s: 90, l: 58 }, gold = { k: 'glitter', h: 48, s: 98, l: 56 };
  return [{ k: 'pearl' }, gold, { k: 'sparkle' }, L('1'), L('3'), pink, ...'BEADS'.split('').map(L), { k: 'sparkle' }, gold, { k: 'pearl' }];
})();
// Beads slide on one by one, each playing the next note of the tune.
function stringStarter(delay = 0) {
  clearInterval(phraseTimer);
  if (reduce) { STARTER.forEach((d) => addBead(d, true, 'R')); sync(); return; }
  STARTER.forEach((d, i) => setTimeout(() => { if (mode === 'line') addBead(d, true, 'R', i); }, delay + i * 130));
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
  clearInterval(phraseTimer);
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
  clearInterval(phraseTimer);
  beads.forEach((b) => { b.drag = null; });
  setMode('tied');
});
$('untie').addEventListener('click', () => setMode('line'));
$('wear').addEventListener('click', () => { arm(); wear(); });
// On the tie-off screen the camera makes a share card; on the wall it saves a photo of the wall.
$('photoBtn').addEventListener('click', () => {
  if (mode !== 'tied') { savePhoto(); return; }
  if ($('shareCard').hidden) openShare(); else closeShare();
});
$('shareCard').addEventListener('submit', (e) => {
  e.preventDefault();
  const note = $('cardNote').value.replace(/\s+/g, ' ').trim().slice(0, 40);
  closeShare();
  shareCard(note);
});
$('cardCancel').addEventListener('click', () => closeShare());
$('shareCard').addEventListener('keydown', (e) => trapTab(e, $('shareCard')));
$('another').addEventListener('click', () => setMode('line'));
$('takeOff').addEventListener('click', () => {
  const i = rings.indexOf(popRing), fromKeys = popOpener && popOpener.classList.contains('ring-btn');
  closePop(false);
  if (i < 0) return;
  // Rings show the newest bracelet first, so ring i is counted back from the end of the stack.
  stack.splice(stack.length - 1 - i, 1);
  saveStack();
  rebuildStack();
  syncStack();
  tick(0.6, 0.14);
  say(stack.length ? 'Taken off the wall.' : EMPTY_WALL);
  // Keyboard users land on the next bracelet, or on Make another if the wall is now empty.
  if (fromKeys) { const n = $('ringBtns').children[Math.min(i, rings.length - 1)]; (n || $('another')).focus({ preventScroll: true }); }
});
$('popKeep').addEventListener('click', closePop);
// Edit a bracelet from the wall: it comes off the stand and back onto the string. A string already in progress is
// not lost: it hangs on the stand in the edited bracelet's place (unless it is just the untouched starter).
$('editRing').addEventListener('click', () => {
  const i = rings.indexOf(popRing);
  closePop(false);
  if (i < 0) return;
  const at = stack.length - 1 - i, list = stack[at];
  const current = defs(), isStarter = JSON.stringify(current) === JSON.stringify(STARTER);
  if (current.length && !isStarter) stack[at] = current;
  else stack.splice(at, 1);
  saveStack();
  rebuildStack();
  syncStack();
  clearInterval(phraseTimer);
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
  clearInterval(phraseTimer);
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
['restart', 'clear'].forEach((id) => $(id).addEventListener('click', () => setMenu(false)));

// Letter bead color: white or black cubes. Applies to the Letters tab and to typed phrases.
document.querySelectorAll('.letter-chip').forEach((b) => b.addEventListener('click', () => {
  letterStyle = b.dataset.st;
  document.querySelectorAll('.letter-chip').forEach((o) => o.setAttribute('aria-checked', o === b ? 'true' : 'false'));
  tick(letterStyle === 'black' ? 0.9 : 1.1, 0.08);
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
  $('wear').lastChild.textContent = trade ? ' Hang it on my wall' : ' Add to my wall';
}
// The received bracelet is strung bead by bead in front of the player, then ties itself off.
function receiveTrade(list, note, saved) {
  trade = { saved, note };
  clearInterval(phraseTimer);
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
  clearInterval(phraseTimer);
  setBeads(t.saved);
  undoStack.length = 0;
  redoStack.length = 0;
  syncUndo();
  sync();
}

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
  const got = readTrade();
  if (Array.isArray(saved) && saved.length) setBeads(saved);
  else if (!got) stringStarter(350);
  sync();
  rebuildStack();
  syncStack();
  if (got) receiveTrade(got.list, got.note, Array.isArray(saved) ? saved : []);
  say(HINT);
  requestAnimationFrame((t) => { last = t; frame(t); });
}
start();
