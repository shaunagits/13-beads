// Synthesized sounds, shaped by what each bead is made of.
// Nothing plays until the player has interacted with the page.
let ac = null, master = null, noiseBuf = null, muted = false, armed = false;

export const arm = () => { armed = true; };
export const setMuted = (m) => { muted = m; };

function ctx() {
  if (muted || !armed) return null;
  try {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(ac.destination);
      // A quiet echo gives the bell-like sounds some shimmer.
      const delay = ac.createDelay(0.5), fb = ac.createGain(), wet = ac.createGain();
      delay.delayTime.value = 0.19; fb.gain.value = 0.24; wet.gain.value = 0.22;
      master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.4), ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) { return null; }
}

function tone(freq, { type = 'sine', vol = 0.15, len = 0.1, bend = 1, at = 0 } = {}) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (bend !== 1) o.frequency.exponentialRampToValueAtTime(freq * bend, t + len * 0.8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + len + 0.03);
}
function noise({ vol = 0.2, len = 0.04, freq = 2000, q = 1, type = 'bandpass', sweep = 1, at = 0 } = {}) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + at, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweep !== 1) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + len);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + len + 0.03);
}

const jitter = () => 0.95 + Math.random() * 0.1;
const MATERIAL = {
  plastic: (p) => { noise({ vol: 0.22, len: 0.03, freq: 2600 * p }); tone(1500 * p * jitter(), { type: 'triangle', vol: 0.17, len: 0.07, bend: 0.5 }); },
  block: (p) => { noise({ vol: 0.26, len: 0.04, freq: 1500 * p }); tone(920 * p * jitter(), { type: 'triangle', vol: 0.2, len: 0.09, bend: 0.55 }); },
  pearl: (p) => { tone(2050 * p * jitter(), { vol: 0.14, len: 0.2 }); tone(4100 * p, { vol: 0.04, len: 0.12 }); },
  metal: (p) => {
    const f = 1850 * p * jitter();
    tone(f, { vol: 0.12, len: 0.55 }); tone(f * 2.76, { vol: 0.06, len: 0.35 }); tone(f * 5.4, { vol: 0.03, len: 0.18 });
    noise({ vol: 0.08, len: 0.02, freq: 6000 });
  },
  glass: (p) => { const f = 2500 * p * jitter(); tone(f, { vol: 0.1, len: 0.8 }); tone(f * 2.32, { vol: 0.045, len: 0.45 }); },
  wood: (p) => { noise({ vol: 0.3, len: 0.05, freq: 520 * p, q: 2 }); tone(230 * p * jitter(), { vol: 0.2, len: 0.12, bend: 0.8 }); },
  soft: () => { noise({ vol: 0.16, len: 0.09, freq: 420, type: 'lowpass' }); },
};
const KIND = {
  letter: 'block', pearl: 'pearl', jewel: 'glass', coupe: 'glass', guitar: 'wood', chair: 'wood', boot: 'wood',
  cardigan: 'soft', scarf: 'soft', gull: 'soft',
  star: 'metal', moon: 'metal', sparkle: 'metal', wheart: 'metal', arrow: 'metal', spacer: 'metal', mirror: 'metal',
  snake: 'metal', clock: 'metal', ladder: 'metal', mic: 'metal', leaf: 'metal',
};
const SCALE = [0, 2, 4, 7, 9];
const semis = (i) => SCALE[i % 5] + 12 * Math.floor(i / 5);

// A bead landing. `step` raises the pitch along a scale, used while a phrase strings itself.
export function land(kind, step) {
  const pitch = step == null ? 1 : Math.pow(2, (semis(Math.min(step, 12)) - 7) / 12);
  MATERIAL[KIND[kind] || 'plastic'](pitch);
}
export const tick = (pitch = 1, vol = 0.14) => tone(1500 * pitch, { type: 'triangle', vol, len: 0.08, bend: 0.45 });
export function chime() {
  [0, 4, 7, 12, 16].forEach((s, i) => {
    const f = 784 * Math.pow(2, s / 12);
    tone(f, { vol: 0.12, len: 0.6, at: i * 0.085 });
    tone(f * 2.76, { vol: 0.03, len: 0.3, at: i * 0.085 });
  });
}
// Strumming across the beads plays up a pentatonic scale, so any sweep sounds musical.
export function note(i) {
  const f = 392 * Math.pow(2, semis(i) / 12);
  tone(f, { vol: 0.13, len: 0.36 });
  tone(f * 2, { vol: 0.03, len: 0.2 });
}
export function twang(pull) {
  const f = 150 + Math.min(pull, 90) * 1.3;
  tone(f, { type: 'triangle', vol: 0.24, len: 0.5, bend: 0.94 });
  tone(f * 2.01, { type: 'sine', vol: 0.06, len: 0.3 });
}
export const whoosh = () => noise({ vol: 0.14, len: 0.32, freq: 500, q: 0.8, sweep: 5 });
export function thud() {
  tone(140, { vol: 0.3, len: 0.16, bend: 0.6 });
  noise({ vol: 0.2, len: 0.05, freq: 900 });
}
export function buzz(ms) {
  if (!armed) return;
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* optional */ }
}
