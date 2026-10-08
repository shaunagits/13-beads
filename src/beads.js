// Bead catalog and 3D bead factory.
// Beads are data: to add one, add a catalog entry and (for a new shape) a builder below.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Width each bead takes up along the string, as a fraction of bead size.
export const UNIT = { pony: 0.78, letter: 0.96, pearl: 0.92, glitter: 0.78, glow: 0.78, star: 1.06, heart: 1.04, mirror: 0.98, spacer: 0.3,
  lucky13: 1.04, snake: 1.06, butterfly: 1.12, moon: 0.84, guitar: 0.36 };

// Charms that hang below the string from a ring instead of sitting on it.
export const DANGLE = new Set(['guitar']);

export const COLORS = [
  ['Hot pink', 330, 90, 58], ['Red', 355, 85, 52], ['Orange', 24, 95, 56], ['Yellow', 48, 98, 56],
  ['Lime', 95, 75, 50], ['Teal', 174, 75, 42], ['Sky', 198, 90, 60], ['Blue', 226, 80, 54],
  ['Purple', 272, 70, 56], ['Lavender', 262, 75, 76], ['Black', 260, 12, 10], ['White', 260, 15, 94],
].map(([name, h, s, l]) => ({ name: name + ' bead', def: { k: 'pony', h, s, l } }));

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?&'.split('')
  .map((ch) => ({ name: 'Letter ' + ch, def: { k: 'letter', ch } }));

export const CHARMS = [
  { name: 'Pearl', def: { k: 'pearl' } },
  { name: 'Pink glitter', def: { k: 'glitter', h: 325 } },
  { name: 'Gold glitter', def: { k: 'glitter', h: 44 } },
  { name: 'Blue glitter', def: { k: 'glitter', h: 215 } },
  { name: 'Green glow', def: { k: 'glow', h: 135 } },
  { name: 'Pink glow', def: { k: 'glow', h: 315 } },
  { name: 'Star', def: { k: 'star' } },
  { name: 'Heart', def: { k: 'heart' } },
  { name: 'Mirror ball', def: { k: 'mirror' } },
  { name: 'Silver spacer', def: { k: 'spacer' } },
  { name: 'Lucky 13', def: { k: 'lucky13' } },
  { name: 'Snake', def: { k: 'snake' } },
  { name: 'Butterfly', def: { k: 'butterfly' } },
  { name: 'Crescent moon', def: { k: 'moon' } },
  { name: 'Acoustic guitar', def: { k: 'guitar' } },
];

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

/* ---------- Factory ---------- */
export function makeBead(d) {
  const group = new THREE.Group();
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
      group.add(face);
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
        [0.105, 0.07, -0.09, 0.012, mat('13white', () => plastic(0xffffff, { roughness: 0.35 }))],
        [0.036, 0.07, -0.01, 0.01, mat('13black', () => plastic(0x101018, { roughness: 0.3 }))],
        [0, 0.06, 0.07, 0.022, blue],
      ];
      layers.forEach(([grow, depth, z, bevel, m], i) => {
        group.add(mesh((geo['13_' + i] ||= thirteenGeo(grow, depth, z, bevel)), m));
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
      charm.position.y = -0.17;
      charm.scale.setScalar(0.78);
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
