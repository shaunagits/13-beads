// Bead catalog and 3D bead factory.
// Beads are data: to add one, add a catalog entry and (for a new shape) a builder below.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Width each bead takes up along the string, as a fraction of bead size.
export const UNIT = { pony: 0.78, letter: 0.96, pearl: 0.92, glitter: 0.78, glow: 0.78, star: 1.06, heart: 1.04, mirror: 0.98, spacer: 0.3 };

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
function letterTex(ch) {
  return (tex['L' + ch] ||= canvasTex(160, (x, s) => {
    x.fillStyle = '#1c1830';
    x.font = `700 ${s * 0.78}px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(ch, s / 2, s * 0.54);
  }));
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
      group.add(mesh(starGeo(), mat('star', () => new THREE.MeshPhysicalMaterial({ color: 0xffbf2e, metalness: 1, roughness: 0.2 }))));
      break;
    case 'heart':
      group.add(mesh(heartGeo(), mat('heart', () => plastic(0xf0245c))));
      break;
  }
  return group;
}
