// Bead catalog and 3D bead factory.
// Beads are data: to add one, add a catalog entry and (for a new shape) a builder below.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Width each bead takes up along the string, as a fraction of bead size.
export const UNIT = { pony: 0.78, letter: 0.96, pearl: 0.92, glitter: 0.78, glow: 0.78, star: 1.06, heart: 1.04, mirror: 0.98, spacer: 0.3,
  lucky13: 1.04, snake: 1.06, butterfly: 1.12, moon: 0.84, guitar: 0.36,
  pheart: 1.04, sparkle: 1.0, jewel: 0.95, gull: 1.18, rainbow: 1.0, leaf: 1.08, tree: 0.9, clock: 1.0, photo: 0.86, cat: 1.0, wheart: 1.0, arrow: 1.3,
  mic: 0.36, chair: 0.36, ladder: 0.36, cardigan: 0.36, scarf: 0.36, boot: 0.36, coupe: 0.36 };

// Charms that hang below the string from a ring instead of sitting on it.
export const DANGLE = new Set(['guitar', 'mic', 'chair', 'ladder', 'cardigan', 'scarf', 'boot', 'coupe']);

export const COLORS = [
  ['Hot pink', 330, 90, 58], ['Red', 355, 85, 52], ['Orange', 24, 95, 56], ['Yellow', 48, 98, 56],
  ['Lime', 95, 75, 50], ['Teal', 174, 75, 42], ['Sky', 198, 90, 60], ['Blue', 226, 80, 54],
  ['Purple', 272, 70, 56], ['Lavender', 262, 75, 76], ['Black', 260, 12, 10], ['White', 260, 15, 94],
].map(([name, h, s, l]) => ({ name: name + ' bead', def: { k: 'pony', h, s, l } }));

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?&'.split('')
  .map((ch) => ({ name: 'Letter ' + ch, def: { k: 'letter', ch } }));

export const FINISHES = [
  { name: 'Pearl', def: { k: 'pearl' } },
  { name: 'Pink glitter', def: { k: 'glitter', h: 325 } },
  { name: 'Gold glitter', def: { k: 'glitter', h: 44 } },
  { name: 'Blue glitter', def: { k: 'glitter', h: 215 } },
  { name: 'Green glow', def: { k: 'glow', h: 135 } },
  { name: 'Pink glow', def: { k: 'glow', h: 315 } },
  { name: 'Silver spacer', def: { k: 'spacer' } },
];
export const BEADS = [...COLORS, ...FINISHES];

const named = (list) => list.map(([name, k]) => ({ name, def: { k } }));
export const CHARMS = named([
  ['Lucky 13', 'lucky13'], ['Star', 'star'], ['Sparkle', 'sparkle'], ['Heart', 'heart'], ['Pastel heart', 'pheart'], ['Wire heart', 'wheart'],
  ['Mirror ball', 'mirror'], ['Jewel', 'jewel'], ['Snake', 'snake'], ['Butterfly', 'butterfly'], ['Cat', 'cat'], ['Seagull', 'gull'],
  ['Crescent moon', 'moon'], ['Midnight clock', 'clock'], ['Rainbow', 'rainbow'], ['Evergreen tree', 'tree'], ['Autumn leaf', 'leaf'],
  ['Instant photo', 'photo'], ['Bow and arrow', 'arrow'],
]);
export const DANGLES = named([
  ['Acoustic guitar', 'guitar'], ['Microphone', 'mic'], ['Cowboy boot', 'boot'], ['Cardigan', 'cardigan'], ['Red scarf', 'scarf'],
  ['Champagne glass', 'coupe'], ['Chair', 'chair'], ['Ladder', 'ladder'],
]);

export const defKey = (d) => JSON.stringify(d);
const hsl = (h, s, l) => new THREE.Color().setHSL(h / 360, s / 100, l / 100);

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
function letterTex(ch, fill = '#1c1830', stroke = null) {
  return (tex['L' + ch + fill] ||= canvasTex(160, (x, s) => {
    x.font = `700 ${s * (ch.length > 1 ? 0.62 : 0.78)}px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineJoin = 'round';
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = s * 0.07; x.strokeText(ch, s / 2, s * 0.54); }
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

const CHARM_BUILDERS = {
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
    const c = hanger(g), wool = knit('scarf', 0xcf1730);
    const loop = part(G('scarfLoop', () => new THREE.TorusGeometry(0.17, 0.09, 12, 28)), wool, 0, -0.2);
    loop.scale.set(1.1, 0.85, 1);
    c.add(loop);
    for (const [x, y, len, rot, z] of [[-0.09, -0.66, 0.66, 0.12, 0.04], [0.1, -0.58, 0.5, -0.16, -0.03]]) {
      const tail = new THREE.Group();
      tail.position.set(x, y, z);
      tail.rotation.z = rot;
      tail.add(mesh(G('scarfTail' + len, () => new RoundedBoxGeometry(0.18, len, 0.06, 2, 0.02)), wool));
      for (let i = 0; i < 4; i++) tail.add(part(G('fringe', () => new THREE.BoxGeometry(0.024, 0.1, 0.02)), wool, -0.066 + i * 0.044, -len / 2 - 0.05));
      c.add(tail);
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
  const group = new THREE.Group();
  if (CHARM_BUILDERS[d.k]) {
    CHARM_BUILDERS[d.k](group);
    return group;
  }
  switch (d.k) {
    case 'pony':
      group.add(mesh(ponyGeo(), mat(defKey(d), () => plastic(hsl(d.h, d.s, d.l)))));
      break;
    case 'spacer':
      group.add(mesh(
        (geo.spacer ||= new THREE.TorusGeometry(0.2, 0.13, 16, 32).rotateY(Math.PI / 2)),
        mat('spacer', () => new THREE.MeshPhysicalMaterial({ color: 0xdfe3ee, metalness: 1, roughness: 0.18 }))));
      break;
    case 'glitter':
      group.add(mesh(ponyGeo(), mat(defKey(d), () => {
        const m = new THREE.MeshPhysicalMaterial({
          color: hsl(d.h, 85, 52), metalness: 0.75, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.1,
          bumpMap: sparkTex(), bumpScale: 1.2, emissive: 0xffffff, emissiveMap: sparkTex(), emissiveIntensity: 0.6,
        });
        m.userData = { kind: 'glitter', ph: d.h };
        animated.push(m);
        return m;
      })));
      break;
    case 'glow': {
      const c = hsl(d.h, 100, 58);
      group.add(mesh(ponyGeo(), mat(defKey(d), () => {
        const m = plastic(hsl(d.h, 100, 72), { emissive: c, emissiveIntensity: 1.1 });
        m.userData = { kind: 'glow', ph: d.h };
        animated.push(m);
        return m;
      })));
      const halo = new THREE.Sprite(mat('halo' + d.h, () => new THREE.SpriteMaterial({
        map: haloTex(), color: c, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
      })));
      halo.scale.setScalar(2.3);
      halo.position.z = -0.2;
      group.add(halo);
      break;
    }
    case 'letter': {
      group.add(mesh((geo.cube ||= new RoundedBoxGeometry(0.94, 0.94, 0.72, 5, 0.17)), mat('cube', () => plastic(0xfbf9ff, { roughness: 0.28 }))));
      const face = new THREE.Mesh(
        (geo.face ||= new THREE.PlaneGeometry(0.8, 0.8)),
        mat('L' + d.ch, () => new THREE.MeshBasicMaterial({ map: letterTex(d.ch), transparent: true, depthWrite: false, toneMapped: false })));
      face.position.z = 0.362;
      const faceBack = face.clone();
      faceBack.position.z = -0.362;
      faceBack.rotation.y = Math.PI;
      group.add(face, faceBack);
      break;
    }
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
      charm.scale.setScalar(0.92);
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
