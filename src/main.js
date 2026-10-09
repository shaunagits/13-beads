import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BEADS, LETTERS, CHARMS, DANGLES, UNIT, DANGLE, makeBead, tickMaterials, defKey } from './beads.js';
import { arm, setMuted, land, tick, chime, buzz, note, twang, whoosh, thud } from './audio.js';

const MAX = 26, TAU = Math.PI * 2, N = 90;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const HINT = 'Tap a bead below to add it. On the string: tap to remove, drag to reorder, or pluck it.';
const TIED_HINT = 'Drag to spin it. Tap for sparkles.';
// Wall decoration: a few curated colors, and the word on the neon sign.
const WALL_COLORS = {
  // shade: the deeper tone in the limewash clouds. night: how the wall reads under lamp and neon light.
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
  ? 'Tap a bracelet to jingle it. Hold to take it off.'
  : 'Click a bracelet to jingle it. Hold or right-click to take it off.';
const EMPTY_WALL = 'Nothing on display yet. Tie off a bracelet and hang it on the stand.';
const STACK_MAX = 12;

/* ---------- State ---------- */
let beads = [], fallers = [], undoStack = [];
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
// The craft table under the string: wood planks, built when the theme is known (oak by day, walnut by night).
const table = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }));
table.receiveShadow = true;
table.position.z = -46.5;
scene.add(table);
let tableDark = null;
function woodTableTexture(dark) {
  const S = 768, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S), px = img.data;
  const light = dark ? [112, 74, 50] : [226, 196, 156], deep = dark ? [78, 49, 33] : [196, 156, 110];
  const warp = [0, 1, 2].map((o) => noiseField(2 << o, 120 + o)), streaks = [0, 1].map((o) => noiseField(5 << o, 150 + o));
  const fine = noiseField(160, 140);
  const PLANKS = 4, joints = [0.31, 0.77, 0.12, 0.58];
  for (let j = 0; j < S; j++) {
    const v = j / S, p = Math.floor(v * PLANKS), local = v * PLANKS - p, tint = [0.98, 1.03, 0.95, 1.01][p];
    for (let i = 0; i < S; i++) {
      const u = i / S;
      // Fine grain running along the plank, drifting gently.
      const w = fbm(warp, u, v + p * 0.37);
      const ring = 0.5 + 0.5 * Math.sin((local * 22 + w * 1.8 + p * 1.7) * TAU);
      // Long streaks: noise stretched along the plank.
      const st = fbm(streaks, u, (v * 24) % 1);
      const k = Math.min(1, Math.max(0, Math.pow(ring, 5) * 0.4 + (st - 0.5) * 0.9 + 0.3 + (fine(u, v) - 0.5) * 0.12));
      // Seams between planks, and one butt joint per plank.
      const seam = Math.min(local, 1 - local) * S / PLANKS, joint = Math.abs(u - joints[p]) * S;
      let shade = tint;
      if (seam < 2.2) shade *= 0.6 + seam * 0.16;
      if (joint < 1.4) shade *= 0.65;
      const o = (j * S + i) * 4;
      for (let ch = 0; ch < 3; ch++) px[o + ch] = (light[ch] + (deep[ch] - light[ch]) * k) * shade;
      px[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function buildTable() {
  const dark = darkScheme.matches;
  if (dark === tableDark) return;
  tableDark = dark;
  if (table.material.map) table.material.map.dispose();
  table.material.map = woodTableTexture(dark);
  table.material.needsUpdate = true;
}
const darkScheme = matchMedia('(prefers-color-scheme: dark)');

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

// Tie-off sparkle
const SPARKS = 48;
const sparkPos = new Float32Array(SPARKS * 3), sparkCol = new Float32Array(SPARKS * 3);
const sparkVel = [];
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
const sparkMat = new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
const sparks = new THREE.Points(sparkGeo, sparkMat);
sparks.frustumCulled = false;
sparks.visible = false;
scene.add(sparks);
let sparkLife = 0;

function readTheme() {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--string').trim();
  if (c) stringMat.color.set(c);
  buildTable();
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);

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
  beads = list.filter((d) => d && UNIT[d.k]).slice(0, MAX).map((d) => mk(d, true));
}
// On the tie-off and wall screens, messages show as a note on the canvas that fades after a few seconds.
let noteTimer = 0;
function say(m) {
  $('status').textContent = m;
  const n = $('note');
  n.textContent = m;
  n.classList.remove('gone');
  clearTimeout(noteTimer);
  if (mode !== 'stack' || stack.length) noteTimer = setTimeout(() => n.classList.add('gone'), m === STACK_HINT || m === TIED_HINT || m === HINT ? 7000 : 3500);
}
function save() { try { localStorage.setItem('13beads.strand', JSON.stringify(defs())); } catch (e) { /* optional */ } }
function sync() { $('count').textContent = beads.length + ' / ' + MAX; save(); }
function pushUndo() { undoStack.push(JSON.stringify(defs())); if (undoStack.length > 40) undoStack.shift(); }

function addBead(def, noUndo, end = side, step = null) {
  if (mode !== 'line') return false;
  if (beads.length >= MAX) { say('That is a full wrist. Pull a bead off to add more.'); return false; }
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
    if (/[A-Z0-9!?&]/.test(ch)) list.push({ k: 'letter', ch });
    else if (ch === ' ' && list.length) list.push({ k: 'spacer' });
  }
  if (!list.length) { say('Type letters, numbers, or ! ? & to spell a phrase.'); return; }
  const room = MAX - beads.length;
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
  mode = m;
  $('buildPanel').hidden = m !== 'line';
  $('hud').hidden = false;
  $('hud').dataset.mode = m;
  $('stackBtn').setAttribute('aria-pressed', m === 'stack' ? 'true' : 'false');

  $('count').hidden = m !== 'line';
  closePop(false);
  closeCustom(false);
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

// Tileable value noise, layered into soft clouds. Used for the limewash paint and the plaster relief.
function noiseField(period, seed) {
  const g = new Float32Array(period * period);
  let st = seed * 9301 + 49297;
  for (let i = 0; i < g.length; i++) { st = (st * 9301 + 49297) % 233280; g[i] = st / 233280; }
  // Coordinates run 0 to 1 across one tile; the lattice wraps at the edge so the texture repeats seamlessly.
  return (x, y) => {
    x *= period; y *= period;
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0], b = g[y0 * period + x1], c = g[y1 * period + x0], d = g[y1 * period + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(fields, x, y) {
  let sum = 0, amp = 0.5, norm = 0;
  for (const f of fields) { sum += f(x, y) * amp; norm += amp; amp *= 0.5; }
  return sum / norm;
}
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// Limewash: one base color with slow cloudy shifts in tone and a little brushed mottling, like a hand-painted wall.
function paintTexture(name) {
  const col = WALL_COLORS[name] || WALL_COLORS.white, S = 768;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S), px = img.data;
  const clouds = [0, 1, 2, 3, 4].map((o) => noiseField(4 << o, 11 + o)), mott = [0, 1, 2].map((o) => noiseField(48 << o, 40 + o));
  const [r0, g0, b0] = hexRGB(col.base), [rs, gs, bs] = hexRGB(col.shade);
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const u = i / S, v = j / S;
      // Warp the clouds with themselves so the patches look brushed rather than blobby.
      const w = fbm(clouds, u + 0.13, v + 0.71) - 0.5;
      const n = fbm(clouds, u + w * 0.35, v + w * 0.2);
      const m = fbm(mott, u, v);
      const k = Math.min(1, Math.max(0, (n - 0.38) * 1.9)) * 0.85 + (m - 0.5) * 0.12;
      const lift = 1 + (m - 0.5) * 0.035;
      const o = (j * S + i) * 4;
      px[o] = (r0 + (rs - r0) * k) * lift; px[o + 1] = (g0 + (gs - g0) * k) * lift; px[o + 2] = (b0 + (bs - b0) * k) * lift; px[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Plaster relief: fine grain plus soft trowel ridges, so raking light picks out a real wall surface.
function plasterTexture() {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S), px = img.data;
  const grain = [0, 1, 2].map((o) => noiseField(64 << o, 70 + o)), ridge = [0, 1, 2].map((o) => noiseField(6 << o, 90 + o));
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const u = i / S, v = j / S;
      const r = fbm(ridge, u, v), ridges = 1 - Math.abs(r - 0.5) * 2;
      const val = 128 + (fbm(grain, u, v) - 0.5) * 120 + Math.pow(ridges, 6) * 46;
      const o = (j * S + i) * 4;
      px[o] = px[o + 1] = px[o + 2] = val; px[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const plaster = plasterTexture();
const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: paintTexture(decor.color), roughness: 0.95, bumpMap: plaster, bumpScale: 3 }));
wall.receiveShadow = true;
wall.position.z = -70;
board.add(wall);

// Daylight: a soft patch of window light across the wall, with the shadow of the window frame.
function windowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.filter = 'blur(9px)';
  x.transform(1, 0.22, -0.3, 1, 150, -40);
  x.fillStyle = 'rgba(255,238,205,.9)';
  for (let col = 0; col < 2; col++) for (let row = 0; row < 3; row++) x.fillRect(90 + col * 150, 70 + row * 130, 134, 114);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const windowLight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
  map: windowTexture(), transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
}));
windowLight.position.z = -68.5;
board.add(windowLight);

// A neon-style sign in script. It glows at night and sits unlit by day.
function neonTexture(lit) {
  const c = document.createElement('canvas');
  c.width = 470; c.height = 220;
  const x = c.getContext('2d');
  const word = decor.sign || SIGN_DEFAULT;
  // Shrink the script to fit the sign, so longer words stay inside the glow.
  let size = 120;
  x.font = size + 'px Pacifico, "Brush Script MT", cursive';
  const wid = x.measureText(word).width;
  if (wid > 410) { size = Math.max(54, Math.floor((size * 410) / wid)); x.font = size + 'px Pacifico, "Brush Script MT", cursive'; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round';
  if (lit) {
    x.shadowColor = '#ff3fa0'; x.shadowBlur = 34;
    x.strokeStyle = '#ff6fbd'; x.lineWidth = 9;
    for (let i = 0; i < 3; i++) x.strokeText(word, 235, 112);
    x.shadowBlur = 8;
    x.strokeStyle = '#fff2fa'; x.lineWidth = 3.5;
    x.strokeText(word, 235, 112);
  } else {
    x.shadowColor = 'rgba(90,40,90,.35)'; x.shadowBlur = 5; x.shadowOffsetX = 3; x.shadowOffsetY = 4;
    x.strokeStyle = '#fff4fa'; x.lineWidth = 8;
    x.strokeText(word, 235, 112);
    x.shadowColor = 'transparent';
    x.strokeStyle = '#ee8fbf'; x.lineWidth = 3;
    x.strokeText(word, 235, 112);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const neonMaps = { on: null, off: null };
const neon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
neon.position.z = -40;
board.add(neon);
const neonGlow = new THREE.PointLight(0xff4fa8, 0, 0, 0);
const lamp = new THREE.PointLight(0xffb873, 0, 0, 0);
board.add(neonGlow, lamp);

// Day in light mode, evening in dark mode. Leaving the wall restores the stage lighting.
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function placeSun() {
  const M = Math.max(W, H);
  if (mode === 'stack') sun.position.set(-0.95 * M, 0.75 * M, 0.85 * M);
  else sun.position.set(-0.3 * M, 0.55 * M, 1.1 * M);
}
function applyMood() {
  const onWall = mode === 'stack', night = onWall && darkQuery.matches;
  placeSun();
  sun.color.set(!onWall ? 0xffffff : night ? 0x8fa2ff : 0xfff0dc);
  sun.intensity = !onWall ? 1.7 : night ? 0.4 : 2.1;
  scene.environmentIntensity = !onWall ? 0.55 : night ? 0.2 : 0.5;
  stageA.intensity = stageB.intensity = onWall ? 0.12 : reduce ? 0.5 : 1.0;
  wall.material.color.set(night ? (WALL_COLORS[decor.color] || WALL_COLORS.white).night : 0xffffff);
  windowLight.visible = onWall && !night;
  lamp.intensity = night ? 2.4 : 0;
  neonGlow.intensity = night ? 1.5 : 0;
  if (!neonMaps.on) { neonMaps.on = neonTexture(true); neonMaps.off = neonTexture(false); }
  neon.material.map = night ? neonMaps.on : neonMaps.off;
  neon.material.blending = night ? THREE.AdditiveBlending : THREE.NormalBlending;
  neon.material.needsUpdate = true;
}
darkQuery.addEventListener('change', applyMood);

// Depth of field on the wall: bracelets stay sharp, the wall behind falls slightly soft, like a phone photo.
let composer = null, bokeh = null, composerKey = '';
// With reduced motion the blur is off, but the pipeline stays so the window light and neon are tone mapped the same.
function renderWall(dist) {
  if (!composer) {
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType }));
    composer.addPass(new RenderPass(scene, camera));
    bokeh = new BokehPass(scene, camera, { focus: dist, aperture: 0.000022, maxblur: 0.003 });
    bokeh.enabled = !reduce;
    composer.addPass(bokeh);
    composer.addPass(new OutputPass());
  }
  const key = W + 'x' + H + '@' + renderer.getPixelRatio();
  if (key !== composerKey) { composerKey = key; composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W, H); }
  bokeh.uniforms.focus.value = dist;
  composer.render();
}

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
const hookGeo = {
  ring: new THREE.TorusGeometry(6.5, 1.3, 8, 20).rotateY(Math.PI / 2),
  link: new THREE.CylinderGeometry(1.1, 1.1, 9, 6),
};
// How many bars and hooks fit the current stage, in stage pixels (y measured down from the top).
function wallGrid() {
  const cols = W < 520 ? 3 : W < 900 ? 4 : 5;
  const slotW = Math.min((W * 0.9) / cols, 148), rMax = slotW * 0.42, rowH = rMax * 2 + 36;
  // Space is kept above the top bar for the neon sign.
  const rows = clamp(Math.floor((H * 0.84 - 40) / rowH), 1, 3);
  const top = (H - (rows * rowH + 30)) / 2 + 46;
  return { cols, rows, slotW, rMax, rowH, top, shelf: top + rows * rowH + 4, cap: Math.min(STACK_MAX, cols * rows) };
}
let standKey = '';
function buildStand(grid) {
  for (const m of [...stand.children]) { stand.remove(m); if (m.userData.own) m.geometry.dispose(); }
  // The stand and shelf cast no shadows. Their shadows on the wall read as clutter.
  const solid = (geo, mat, x, y, z = 0, shadow = false) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    m.userData.own = true;
    stand.add(m);
    return m;
  };
  const Y = (py) => H / 2 - py, barW = grid.cols * grid.slotW, shelfY = Y(grid.shelf);
  // Slim floating shelf.
  solid(new THREE.BoxGeometry(Math.min(W * 0.98, barW + 150), 11, 112), woodMat, 0, shelfY - 5.5, -12);
  solid(new THREE.CylinderGeometry(barW * 0.2, barW * 0.22, 9, 48), goldMat, 0, shelfY + 4.5, -6);
  const topY = Y(grid.top);
  solid(new THREE.CylinderGeometry(5.5, 5.5, topY - shelfY + 16, 20), goldMat, 0, (topY + shelfY) / 2 + 8, -8);
  solid(new THREE.SphereGeometry(9, 20, 14), goldMat, 0, topY + 20, -8);
  for (let r = 0; r < grid.rows; r++) {
    const y = Y(grid.top + r * grid.rowH);
    solid(new THREE.CylinderGeometry(4.2, 4.2, barW, 16).rotateZ(Math.PI / 2), goldMat, 0, y, 0);
    for (const sx of [-1, 1]) solid(new THREE.SphereGeometry(7, 16, 12), goldMat, (sx * barW) / 2, y, 0);
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
function buildRing(list, grid) {
  let U = 0;
  for (const d of list) U += UNIT[d.k];
  // Every bracelet hangs as the same size loop, so short ones show more cord, like real ones do.
  const R = grid.rMax * 0.94;
  const S = Math.min(clamp(grid.rMax * 0.27, 14, 26), (TAU * R - 10) / Math.max(U, 1));
  const g = new THREE.Group(), loop = new THREE.Group(), hangs = [], DROP = 13;
  let acc = (-U * S) / 2;
  for (const d of list) {
    const w = UNIT[d.k] * S, o = makeBead(d), phi = (acc + w / 2) / R;
    acc += w;
    o.scale.setScalar(S);
    o.position.set(R * Math.sin(phi), -DROP - R - R * Math.cos(phi), 0);
    o.rotation.z = phi;
    if (o.userData.hang) hangs.push({ hang: o.userData.hang, phi });
    loop.add(o);
  }
  const cord = new THREE.Mesh(new THREE.TorusGeometry(R, 0.8, 6, 72), stringMat);
  cord.position.y = -DROP - R;
  cord.castShadow = true;
  // Hook: a ring over the bar and a short link down to the bracelet.
  const ring = new THREE.Mesh(hookGeo.ring, goldMat), link = new THREE.Mesh(hookGeo.link, goldMat);
  link.position.y = -8.5;
  ring.castShadow = true;
  loop.add(cord, ring, link);
  loop.position.z = 4;
  g.add(loop);
  board.add(g);
  return { g, loop, R: R + DROP / 2, cy: -DROP - R, cr: R, hangs, th: (Math.random() - 0.5) * 0.3, thv: 0, drop: 0, dropv: 0, landed: true, ph: Math.random() * 6, x: 0, y: 0 };
}
// Newest bracelet takes the first hook. Older ones shift along.
function rebuildStack() {
  const grid = wallGrid();
  standKey = [grid.cols, grid.rows, Math.round(grid.rMax / 3), Math.round(W / 30), Math.round(H / 30)].join('|');
  buildStand(grid);
  rings.forEach((r) => board.remove(r.g));
  rings = stack.slice(-grid.cap).reverse().map((list) => buildRing(list.filter((d) => d && UNIT[d.k]), grid));
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
    b.setAttribute('aria-label', braceletName(stack[stack.length - 1 - i]) + ', ' + (i + 1) + ' of ' + rings.length + '. Press Enter to take it off.');
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
  stack.push(defs());
  if (stack.length > 24) stack.shift();
  saveStack();
  rebuildStack();
  if (rings[0] && !reduce) { rings[0].drop = H * 0.8; rings[0].landed = false; whoosh(); }
  pushUndo();
  setBeads([]);
  sync();
  kLin = 0;
  setMode('stack');
}
function updateStack(dt) {
  wall.scale.set(W * 1.4, H * 1.4, 1);
  plaster.repeat.set((W * 1.4) / 360, (H * 1.4) / 360);
  windowLight.scale.set(Math.max(W, H) * 1.15, Math.max(W, H) * 1.15, 1);
  windowLight.position.set(W * 0.12, H * 0.06, -68.5);
  {
    const g = wallGrid(), signH = clamp(g.top - 50, 30, 70), topY = H / 2 - g.top;
    neon.scale.set(signH * 2.14, signH, 1);
    neon.position.set(0, topY + 30 + signH / 2, -40);
    neonGlow.position.set(0, neon.position.y, 60);
    lamp.position.set(W * 0.42, -H * 0.3, 220);
  }
  const grid = wallGrid();
  if ([grid.cols, grid.rows, Math.round(grid.rMax / 3), Math.round(W / 30), Math.round(H / 30)].join('|') !== standKey) rebuildStack();
  rings.forEach((r, i) => {
    const col = i % grid.cols, row = Math.floor(i / grid.cols);
    r.x = (col - (grid.cols - 1) / 2) * grid.slotW;
    r.y = H / 2 - (grid.top + row * grid.rowH);
    // Falling onto the hook.
    r.dropv += (-r.drop * 150 - r.dropv * 13) * dt;
    r.drop += r.dropv * dt;
    if (!r.landed && r.drop < 6) { r.landed = true; thud(); chime(); buzz(25); r.thv += 2.4; }
    // Pendulum swing around the bar, leaning with the phone.
    if (grabRing !== r) {
      r.thv += (-(r.th - tiltS * 0.55) * 34 - r.thv * 1.5) * dt;
      r.th = clamp(r.th + r.thv * dt, -1.4, 1.4);
    }
    const idle = reduce ? 0 : Math.sin(T * 0.9 + r.ph) * 0.025;
    r.g.position.set(r.x, r.y, 0);
    r.pick = lerp(r.pick || 0, popRing === r || kbRing === r ? 1 : 0, reduce ? 1 : Math.min(1, dt * 14));
    if (r.btn) {
      // Keep the invisible button centred on the bracelet as it swings, projected through the camera.
      r.loop.updateWorldMatrix(true, false);
      const c = toScreen(r.loop, 0, r.cy), e = toScreen(r.loop, r.cr, r.cy);
      const d = Math.hypot(e.x - c.x, e.y - c.y) * 2 + 10;
      r.btn.style.width = r.btn.style.height = d + 'px';
      r.btn.style.transform = `translate(${c.x - d / 2}px, ${c.y - d / 2}px)`;
    }
    r.loop.scale.setScalar(1 + r.pick * 0.07);
    r.loop.position.y = r.drop;
    r.loop.rotation.z = r.th + idle;
    for (const h of r.hangs) h.hang.rotation.set(0, 0, -(h.phi + r.th + idle) - r.thv * 0.05);
  });
}
// Which hanging bracelet is under the pointer (stage pixels, y down)?
function ringAt(p) {
  const px = p.x - W / 2, py = H / 2 - p.y;
  let best = null, bd = 1e9;
  for (const r of rings) {
    const cx = r.x + Math.sin(r.th) * r.R, cy = r.y - Math.cos(r.th) * r.R;
    const d = Math.hypot(px - cx, py - cy);
    if (d < r.R + 18 && d < bd) { bd = d; best = r; }
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
  const cx = W / 2 + r.x, top = H / 2 - r.y, bottom = top + r.R * 2 + 12;
  let y = bottom + 8;
  if (y + ph > H - 74) y = top - ph - 8;
  pop.style.left = clamp(cx - pw / 2, 10, W - pw - 10) + 'px';
  pop.style.top = clamp(y, 10, H - ph - 10) + 'px';
  $('popKeep').focus({ preventScroll: true });
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
  return { ay: H * 0.16, sag: lerp(0.14, 1, Math.min(1, n / MAX)) * Math.min(H * 0.6, W * 0.6) };
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
  const R = Math.min(W, H) * 0.33, col = new THREE.Color();
  sparkVel.length = 0;
  for (let i = 0; i < SPARKS; i++) {
    const a = Math.random() * TAU, sp = 60 + Math.random() * 170, b = beads[i % Math.max(1, beads.length)];
    sparkPos.set([Math.cos(a) * R, Math.sin(a) * R, 40], i * 3);
    sparkVel.push([Math.cos(a) * sp, Math.sin(a) * sp + 90]);
    col.setHSL(((b && b.def.h != null ? b.def.h : [330, 48, 198, 272][i % 4]) / 360), 0.95, 0.62);
    sparkCol.set([col.r, col.g, col.b], i * 3);
  }
  sparkGeo.attributes.color.needsUpdate = true;
  sparkLife = 1.3;
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
  const SMAX = clamp(W / 10, 28, 48);
  // Keep the end beads fully on screen: measure how much string is lost past each edge.
  let edge = 0;
  for (let i = 0; i <= N; i++) { if (line[i].x >= sizeCur * 0.62 + 10) { edge = lc[i]; break; } }
  const sizeT = U ? Math.min(SMAX, (lineLen - 2 * edge) / U) : SMAX;
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
    for (let i = 0; i < sparkVel.length; i++) {
      const v = sparkVel[i];
      v[1] -= 260 * dt;
      sparkPos[i * 3] += v[0] * dt;
      sparkPos[i * 3 + 1] += v[1] * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = clamp(sparkLife * 1.6, 0, 1);
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
  if (table.material.map) table.material.map.repeat.set((W * 1.6) / 900, (H * 1.6) / 520);
  stageB.position.set(Math.cos(T * 0.38 + 2.6) * W * 0.6, H * 0.1 + Math.sin(T * 0.5 + 1.7) * H * 0.3, 240);
  if (mode === 'stack') updateStack(dt);
  tickMaterials(T);
  if (mode === 'stack') renderWall(dist); else renderer.render(scene, camera);
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
    if (!$('custom').hidden) { closeCustom(false); spin.dismiss = true; }
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
      const px = p.x - W / 2, py = H / 2 - p.y;
      if (grabRing) {
        // Hold a bracelet and it follows your finger around its hook.
        const th = clamp(Math.atan2(px - grabRing.x, -(py - grabRing.y)), -1.4, 1.4);
        grabRing.thv = clamp((th - grabRing.th) * 30, -9, 9);
        grabRing.th = th;
      } else {
        // Brushing across the stand knocks each bracelet you pass.
        for (const r of rings) {
          const cx = r.x + Math.sin(r.th) * r.R, cy = r.y - Math.cos(r.th) * r.R;
          if (Math.hypot(px - cx, py - cy) < r.R && performance.now() - (r.hitAt || 0) > 300) {
            r.hitAt = performance.now();
            r.thv += clamp(dx * 0.35, -5, 5);
            note(rings.indexOf(r) * 2);
          }
        }
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
    if (!spin.moved && !spin.held && !spin.dismiss && mode === 'stack' && grabRing) {
      grabRing.thv += (Math.random() < 0.5 ? -1 : 1) * 3.5;
      [0, 2, 4].forEach((n, i) => setTimeout(() => note(rings.indexOf(grabRing) + n), i * 60));
      buzz(15);
    }
    grabRing = null;
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
const TABS = { colors: BEADS, letters: LETTERS, charms: CHARMS, dangles: DANGLES };
let curTab = 'colors';
const thumbs = {};
function renderThumbs() {
  const c = document.createElement('canvas');
  let r;
  try { r = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  r.setPixelRatio(1);
  r.setSize(128, 128, false);
  r.toneMapping = THREE.NeutralToneMapping;
  const s = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  s.environmentIntensity = 0.6;
  const l = new THREE.DirectionalLight(0xffffff, 1.8);
  l.position.set(-1, 2, 3);
  s.add(l);
  const cam = new THREE.OrthographicCamera(-0.68, 0.68, 0.68, -0.68, 0.1, 10);
  cam.position.z = 4;
  const box = new THREE.Box3(), size = new THREE.Vector3(), mid = new THREE.Vector3();
  // Each compartment of the bead case holds a little pile: a few copies tumbled at the back,
  // and one on top facing forward so its color or letter is easy to read.
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const item of [...BEADS, ...LETTERS, ...CHARMS, ...DANGLES]) {
    const o = makeBead(item.def), pile = new THREE.Group();
    let heroScale = 0.7, backs = 4, backScale = 0.5;
    if (o.userData.hang) {
      // Hanging charms vary in size, so fit each one first.
      o.rotation.set(0, -0.3, 0);
      o.updateMatrixWorld(true);
      box.setFromObject(o).getSize(size);
      box.getCenter(mid);
      const fit = 1 / Math.max(size.x, size.y);
      o.position.set(-mid.x * fit, -mid.y * fit, 0);
      o.scale.setScalar(fit);
      const holder = new THREE.Group();
      holder.add(o);
      pile.userData.base = holder;
      // Dangles lie one to a compartment, so their ring and bail do not clutter the pile.
      heroScale = 1.04; backs = 0; backScale = 0.7;
    } else {
      pile.userData.base = o;
      if (item.def.k !== 'pony' && item.def.k !== 'letter' && !BEADS.includes(item)) { heroScale = 0.78; backs = 2; backScale = 0.55; }
      if (item.def.k === 'letter') { heroScale = 0.74; backs = 3; }
    }
    const base = pile.userData.base;
    if (o.userData.flap) { o.userData.flap[0].rotation.y = -0.35; o.userData.flap[1].rotation.y = 0.35; }
    for (let b = 0; b < backs; b++) {
      const cpy = base.clone(), a = (b / backs) * TAU + rnd() * 0.8, rr = 0.2 + rnd() * 0.12;
      cpy.position.set(Math.cos(a) * rr, 0.12 + Math.sin(a) * rr * 0.6, -0.4 - b * 0.05);
      cpy.rotation.set(rnd() * TAU, rnd() * TAU, rnd() * TAU);
      cpy.scale.setScalar(backScale);
      pile.add(cpy);
    }
    if (o.userData.hang) { base.scale.setScalar(heroScale); base.position.set(0, 0.02, 0.3); base.rotation.z = -0.2; }
    else { base.scale.setScalar(heroScale); base.rotation.set(0.35, -0.3, 0.05); base.position.set(0, -0.12, 0.3); }
    pile.add(base);
    s.add(pile);
    r.render(s, cam);
    thumbs[defKey(item.def)] = c.toDataURL('image/png');
    s.remove(pile);
  }
  pm.dispose();
  r.dispose();
  r.forceContextLoss();
}
function buildTray() {
  const tray = $('tray');
  tray.textContent = '';
  for (const item of TABS[curTab]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bead-btn';
    btn.setAttribute('aria-label', 'Add ' + item.name);
    const img = document.createElement('img');
    img.alt = '';
    img.src = thumbs[defKey(item.def)] || '';
    btn.appendChild(img);
    btn.addEventListener('click', () => { arm(); addBead(item.def); });
    tray.appendChild(btn);
  }
  tray.scrollLeft = 0;
}
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
$('undo').addEventListener('click', () => {
  arm();
  const s = undoStack.pop();
  if (!s) { say('Nothing to undo yet.'); return; }
  clearInterval(phraseTimer);
  setBeads(JSON.parse(s));
  sync();
  tick(0.8, 0.12);
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
  if (!beads.length) { say('String at least one bead before tying off.'); return; }
  clearInterval(phraseTimer);
  beads.forEach((b) => { b.drag = null; });
  setMode('tied');
});
$('untie').addEventListener('click', () => setMode('line'));
$('wear').addEventListener('click', () => { arm(); wear(); });
$('photoBtn').addEventListener('click', savePhoto);
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
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (popRing) closePop();
  else if (!$('custom').hidden) closeCustom();
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
let muted = false;
$('sound').addEventListener('click', () => {
  muted = !muted;
  arm();
  setMuted(muted);
  $('sound').setAttribute('aria-pressed', muted ? 'false' : 'true');
  if (!muted) tick(1);
});

/* ---------- Boot ---------- */
async function start() {
  // Letter beads are drawn with the display font, so wait briefly for it.
  try { await Promise.race([Promise.all([document.fonts.load('700 64px Fredoka'), document.fonts.load('120px Pacifico')]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fallback font */ }
  readTheme();
  resize();
  new ResizeObserver(resize).observe(cv);
  renderThumbs();
  buildTray();

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('13beads.strand') || 'null'); } catch (e) { /* optional */ }
  if (Array.isArray(saved) && saved.length) setBeads(saved);
  else {
    const P = (h, s, l) => ({ k: 'pony', h, s, l });
    const demo = [P(174, 75, 42), P(330, 90, 58), { k: 'star' }, ...'ENCORE'.split('').map((ch) => ({ k: 'letter', ch })), { k: 'star' }, P(330, 90, 58), P(174, 75, 42)];
    if (reduce) demo.forEach((d) => addBead(d, true, 'R'));
    else demo.forEach((d, i) => setTimeout(() => { if (mode === 'line') addBead(d, true, 'R'); }, 350 + i * 130));
  }
  sync();
  rebuildStack();
  syncStack();
  say(HINT);
  requestAnimationFrame((t) => { last = t; frame(t); });
}
start();
