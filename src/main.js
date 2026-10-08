import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BEADS, LETTERS, CHARMS, DANGLES, UNIT, DANGLE, makeBead, tickMaterials, defKey } from './beads.js';
import { arm, setMuted, land, tick, chime, buzz, note, twang, whoosh, thud } from './audio.js';

const MAX = 26, TAU = Math.PI * 2, N = 90;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const HINT = 'Tap a bead to string it. On the string: tap to pull off, drag to reorder, or pluck and strum the string itself.';
const TIED_HINT = 'Drag to spin your bracelet. Tap it for sparkles.';
const STACK_HINT = 'Swing a bracelet, brush across them, or tap one for a jingle.';
const STACK_MAX = 12;

/* ---------- State ---------- */
let beads = [], fallers = [], undoStack = [];
let mode = 'line', kLin = 0, tiedFired = false, side = 'R';
let W = 300, H = 300, sizeCur = 34, lineLen = 600;
let sagDyn = 0, sagVel = 0, sway = 0, swayVel = 0, T = 0, last = 0;
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
scene.add(backdrop);

const strand = new THREE.Group();
scene.add(strand);
const stringMat = new THREE.MeshStandardMaterial({ color: 0x7f7398, roughness: 0.85 });
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
  sun.position.set(-0.3 * M, 0.55 * M, 1.1 * M);
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
function say(m) { $('status').textContent = m; }
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
  $('tiedPanel').hidden = m !== 'tied';
  $('stackPanel').hidden = m !== 'stack';
  $('count').hidden = m === 'stack';
  strand.visible = m !== 'stack';
  board.visible = m === 'stack';
  backdrop.visible = m !== 'stack';
  sparks.visible = false;
  if (m === 'tied') { tiedFired = false; say(TIED_HINT); }
  else if (m === 'stack') { say(stack.length ? STACK_HINT : 'Your jacket is bare. Tie off a bracelet and pin it on.'); syncStack(); }
  else say(HINT);
  if (reduce) kLin = m === 'tied' ? 1 : 0;
}

/* ---------- The jacket: finished bracelets hang from safety pins on a denim panel ---------- */
const board = new THREE.Group();
board.visible = false;
scene.add(board);

function denimCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = Math.max(256, Math.round((1024 * h) / w));
  const x = c.getContext('2d'), cw = c.width, ch = c.height;
  x.fillStyle = '#3d629c';
  x.fillRect(0, 0, cw, ch);
  // Twill weave: fine diagonal threads, lighter and darker.
  for (let i = -ch; i < cw; i += 5) {
    x.strokeStyle = `rgba(${i % 10 ? '255,255,255' : '10,20,60'},${0.05 + Math.random() * 0.07})`;
    x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + ch, ch); x.stroke();
  }
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '8,18,50'},${Math.random() * 0.1})`;
    x.fillRect(Math.random() * cw, Math.random() * ch, 2, 2);
  }
  // Worn fade toward the middle.
  const fade = x.createRadialGradient(cw / 2, ch * 0.5, 0, cw / 2, ch * 0.5, cw * 0.75);
  fade.addColorStop(0, 'rgba(160,190,235,.22)'); fade.addColorStop(1, 'rgba(10,20,60,.28)');
  x.fillStyle = fade;
  x.fillRect(0, 0, cw, ch);
  // Yoke seam with double topstitching, like the shoulder of a jacket.
  const seamY = ch * 0.075;
  x.fillStyle = 'rgba(10,20,60,.35)';
  x.fillRect(0, seamY - 3, cw, 6);
  x.strokeStyle = '#e0a04a'; x.lineWidth = 3; x.setLineDash([13, 7]);
  for (const dy of [-11, 11]) { x.beginPath(); x.moveTo(0, seamY + dy); x.lineTo(cw, seamY + dy); x.stroke(); }
  return c;
}
const denimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
const denim = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), denimMat);
denim.receiveShadow = true;
denim.position.z = -16;
board.add(denim);
let denimKey = '';
function fitDenim() {
  const key = Math.round(W / 40) + 'x' + Math.round(H / 40);
  if (key !== denimKey) {
    denimKey = key;
    if (denimMat.map) denimMat.map.dispose();
    const t = new THREE.CanvasTexture(denimCanvas(W, H));
    t.colorSpace = THREE.SRGBColorSpace;
    denimMat.map = t;
    denimMat.needsUpdate = true;
  }
  denim.scale.set(W * 1.12, H * 1.12, 1);
}

const pinGold = new THREE.MeshPhysicalMaterial({ color: 0xffc94a, metalness: 0.75, roughness: 0.22, clearcoat: 1 });
const pinGeo = {
  bar: new THREE.CylinderGeometry(1, 1, 32, 8).rotateZ(Math.PI / 2),
  coil: new THREE.TorusGeometry(3, 1, 8, 18),
  cap: new THREE.CapsuleGeometry(2.6, 4.5, 4, 10),
};
function makePin() {
  const g = new THREE.Group();
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, pinGold); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(pinGeo.bar, 0, 0, 3);
  add(pinGeo.bar, 0, 4.4, -1).scale.x = 0.82;
  add(pinGeo.coil, -17, 2.2, 1);
  add(pinGeo.cap, 15.5, 2.2, 1);
  return g;
}

let stack = [];
let rings = [], ringKey = '', grabRing = null;
try { const st = JSON.parse(localStorage.getItem('13beads.stack') || '[]'); if (Array.isArray(st)) stack = st.filter(Array.isArray); } catch (e) { /* optional */ }
function saveStack() { try { localStorage.setItem('13beads.stack', JSON.stringify(stack)); } catch (e) { /* optional */ } }
function syncStack() {
  $('stackBtn').textContent = stack.length ? 'Jacket ' + stack.length : 'Jacket';
  $('stackTitle').textContent = stack.length === 1 ? '1 bracelet on your jacket' : stack.length + ' bracelets on your jacket';
  $('takeOff').disabled = !stack.length;
  $('stackPhoto').disabled = !stack.length;
}
// How many pins fit, and how big a bracelet loop can be, for the current stage size.
function jacketGrid() {
  const cols = W < 520 ? 3 : W < 900 ? 4 : 5;
  const slotW = W / cols, rowH = Math.min(slotW * 1.18, H * 0.44), top = H * 0.17;
  const rows = Math.max(1, Math.floor((H - top - 8) / rowH));
  return { cols, rows, slotW, rowH, top, rMax: Math.min(slotW * 0.42, rowH * 0.41), cap: Math.min(STACK_MAX, cols * rows) };
}
function buildRing(list, grid) {
  let U = 0;
  for (const d of list) U += UNIT[d.k];
  // Every bracelet hangs as the same size loop, so short ones show more cord, like real ones do.
  const R = grid.rMax * 0.94;
  const S = Math.min(clamp(grid.rMax * 0.27, 14, 26), (TAU * R - 10) / Math.max(U, 1));
  const g = new THREE.Group(), loop = new THREE.Group(), hangs = [];
  let acc = (-U * S) / 2;
  for (const d of list) {
    const w = UNIT[d.k] * S, o = makeBead(d), phi = (acc + w / 2) / R;
    acc += w;
    o.scale.setScalar(S);
    o.position.set(R * Math.sin(phi), -R - R * Math.cos(phi), 0);
    o.rotation.z = phi;
    if (o.userData.hang) hangs.push({ hang: o.userData.hang, phi });
    loop.add(o);
  }
  const cord = new THREE.Mesh(new THREE.TorusGeometry(R, 0.8, 6, 72), stringMat);
  cord.position.y = -R;
  cord.castShadow = true;
  loop.add(cord);
  g.add(makePin(), loop);
  board.add(g);
  return { g, loop, R, hangs, th: (Math.random() - 0.5) * 0.3, thv: 0, drop: 0, dropv: 0, landed: true, ph: Math.random() * 6, x: 0, y: 0 };
}
// Newest bracelet takes the first pin. Older ones shift along.
function rebuildStack() {
  const grid = jacketGrid();
  ringKey = grid.cols + '|' + Math.round(grid.rMax / 4);
  rings.forEach((r) => board.remove(r.g));
  rings = stack.slice(-grid.cap).reverse().map((list) => buildRing(list.filter((d) => d && UNIT[d.k]), grid));
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
  fitDenim();
  const grid = jacketGrid();
  if (grid.cols + '|' + Math.round(grid.rMax / 4) !== ringKey) rebuildStack();
  rings.forEach((r, i) => {
    const col = i % grid.cols, row = Math.floor(i / grid.cols);
    r.x = -W / 2 + grid.slotW * (col + 0.5);
    r.y = H / 2 - (grid.top + row * grid.rowH);
    // Falling onto the pin.
    r.dropv += (-r.drop * 150 - r.dropv * 13) * dt;
    r.drop += r.dropv * dt;
    if (!r.landed && r.drop < 6) { r.landed = true; thud(); chime(); buzz(25); r.thv += 2.4; }
    // Pendulum swing around the pin, leaning with the phone.
    if (grabRing !== r) {
      r.thv += (-(r.th - tiltS * 0.55) * 34 - r.thv * 1.5) * dt;
      r.th = clamp(r.th + r.thv * dt, -1.4, 1.4);
    }
    const idle = reduce ? 0 : Math.sin(T * 0.9 + r.ph) * 0.025;
    r.g.position.set(r.x, r.y, 0);
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

  sagVel += (-sagDyn * 130 - sagVel * 9) * dt; sagDyn += sagVel * dt;
  tiltS += (tilt - tiltS) * 0.1;
  if (pluck) {
    // Finger on the string: it follows the pull, then springs back when released.
    sagDyn += (clamp(pluck.dy, -70, 90) - sagDyn) * 0.4; sagVel = 0;
    sway += (clamp(pluck.dx * 0.4, -36, 36) - sway) * 0.4; swayVel = 0;
  } else {
    swayVel += (-(sway - tiltS * 20) * 90 - swayVel * 6) * dt; sway += swayVel * dt;
  }

  const n = beads.length;
  let U = 0;
  for (const b of beads) U += UNIT[b.def.k];
  const ay = H * 0.16, sagMax = Math.min(H * 0.6, W * 0.6);
  const sag = lerp(0.14, 1, Math.min(1, n / MAX)) * sagMax + sagDyn;
  const line = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    line.push({ x: lerp(-12, W + 12, t), y: ay + sag * 4 * t * (1 - t) + sway * Math.sin(TAU * t) });
  }
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
        sagVel += 80; swayVel += (Math.random() - 0.5) * 60;
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

  const tubeKey = [sag.toFixed(1), sway.toFixed(1), k.toFixed(3), W, H].join();
  if (tubeKey !== lastTubeKey) {
    lastTubeKey = tubeKey;
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x - cx, cy - p.y, 0)));
    tube.geometry.dispose();
    tube.geometry = new THREE.TubeGeometry(curve, 110, 1.4, 6, false);
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
  stageB.position.set(Math.cos(T * 0.38 + 2.6) * W * 0.6, H * 0.1 + Math.sin(T * 0.5 + 1.7) * H * 0.3, 240);
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
    return;
  }
  let best = null, bd = 1e9;
  for (const b of beads) {
    let d = Math.hypot(b.x - p.x, b.y - p.y);
    // A hanging charm can also be grabbed by its body below the string.
    if (DANGLE.has(b.def.k)) d = Math.min(d, Math.hypot(b.x - p.x, b.y + b.S * 1.3 - p.y) - b.S * 0.7);
    if (d < bd) { bd = d; best = b; }
  }
  if (best && bd < Math.max(24, best.S * 0.75)) grab = { b: best, x: p.x, y: p.y, moved: false };
  else pluck = { x: p.x, y: p.y, dx: 0, dy: 0 };
});
// Running a finger across the beads strums them: each one rocks and plays a note.
function strum(p) {
  const now = performance.now();
  beads.forEach((b, i) => {
    if (Math.hypot(b.x - p.x, b.y - p.y) > b.S * 0.62 || now - (b.strumAt || 0) < 260) return;
    b.strumAt = now;
    b.rv += (p.vx >= 0 ? 1 : -1) * 6;
    b.swv += (p.vx >= 0 ? 1 : -1) * 3;
    b.sq = 0;
    note(i);
    buzz(5);
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
    if (Math.abs(dx) + Math.abs(dy) > 6) spin.moved = true;
    if (mode === 'stack') {
      const px = p.x - W / 2, py = H / 2 - p.y;
      if (grabRing) {
        // Hold a bracelet and it follows your finger around its pin.
        const th = clamp(Math.atan2(px - grabRing.x, -(py - grabRing.y)), -1.4, 1.4);
        grabRing.thv = clamp((th - grabRing.th) * 30, -9, 9);
        grabRing.th = th;
      } else {
        // Brushing across the jacket knocks each bracelet you pass.
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
  if (pluck) { pluck.dx = p.x - pluck.x; pluck.dy = p.y - pluck.y; strum(p); return; }
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
    if (!spin.moved && mode === 'stack' && grabRing) {
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
    if (pull > 12) {
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
  r.setSize(112, 112, false);
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
  for (const item of [...BEADS, ...LETTERS, ...CHARMS, ...DANGLES]) {
    const o = makeBead(item.def);
    if (o.userData.hang) {
      // Hanging charms vary in size, so fit each one to the thumbnail.
      o.rotation.set(0, -0.3, 0);
      o.updateMatrixWorld(true);
      box.setFromObject(o).getSize(size);
      box.getCenter(mid);
      const fit = 1.2 / Math.max(size.x, size.y);
      o.scale.setScalar(fit);
      o.position.set(-mid.x * fit, -mid.y * fit, 0);
    } else o.rotation.set(0.25, -0.3, 0);
    if (o.userData.flap) { o.userData.flap[0].rotation.y = -0.35; o.userData.flap[1].rotation.y = 0.35; }
    s.add(o);
    r.render(s, cam);
    thumbs[defKey(item.def)] = c.toDataURL('image/png');
    s.remove(o);
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
$('tiedPhoto').addEventListener('click', savePhoto);
$('stackPhoto').addEventListener('click', savePhoto);
$('another').addEventListener('click', () => setMode('line'));
$('takeOff').addEventListener('click', () => {
  if (!stack.length) return;
  stack.pop();
  saveStack();
  rebuildStack();
  syncStack();
  tick(0.6, 0.14);
  say(stack.length ? 'Took the newest bracelet off.' : 'Your jacket is bare. Tie off a bracelet and pin it on.');
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
  $('sound').textContent = muted ? 'Muted' : 'Sound';
  $('sound').setAttribute('aria-pressed', muted ? 'false' : 'true');
  if (!muted) tick(1);
});

/* ---------- Boot ---------- */
async function start() {
  // Letter beads are drawn with the display font, so wait briefly for it.
  try { await Promise.race([document.fonts.load('700 64px Fredoka'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fallback font */ }
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
  requestAnimationFrame((t) => { last = t; frame(t); });
}
start();
