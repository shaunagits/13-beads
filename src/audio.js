// Synthesized sounds. Nothing plays until the player has interacted with the page.
//
// How it works:
// - Hits are modal: a few sine partials at the frequency ratios of a real object (a plastic bead, an acrylic
//   cube, a glass drop, a little bell), each fading at its own rate, started by a tiny filtered click.
// - The cord pluck is a plucked-string model (Karplus-Strong), so it sounds like an elastic string, not a beep.
// - Every hit varies slightly in pitch, level, and stereo position, so repeated sounds never machine-gun.
// - Everything runs through a soft low-pass, a compressor, and a small generated room, which glues it together.
let ac = null, bus = null, roomSend = null, clickBuf = null, muted = false, armed = false;

export const arm = () => { armed = true; };
export const setMuted = (m) => { muted = m; };

function ctx() {
  if (muted || !armed) return null;
  try {
    if (!ac) build();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) { return null; }
}

function build() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const out = ac.createGain();
  out.gain.value = 0.8;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3.5; comp.attack.value = 0.003; comp.release.value = 0.2;
  // Rolls off the harsh top end that makes synthesized sounds feel cheap.
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass'; tone.frequency.value = 9000; tone.Q.value = 0.5;
  bus = ac.createGain();
  bus.connect(tone); tone.connect(comp); comp.connect(out); out.connect(ac.destination);
  // A small, bright room: generated decaying noise, a little different in each ear.
  const room = ac.createConvolver(), len = Math.floor(ac.sampleRate * 1.1), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / ac.sampleRate;
      lp += ((Math.random() * 2 - 1) - lp) * (0.5 - Math.min(0.42, t * 0.5));
      d[i] = lp * Math.exp(-t / 0.22) * (t < 0.008 ? t / 0.008 : 1);
    }
  }
  room.buffer = ir;
  roomSend = ac.createGain();
  roomSend.gain.value = 0.22;
  roomSend.connect(room); room.connect(comp);
  // A short click used to excite every hit.
  clickBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.012), ac.sampleRate);
  const c = clickBuf.getChannelData(0);
  for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.0018));
}

const vary = (amt) => 1 + (Math.random() * 2 - 1) * amt;

// One voice: a panner and level feeding the dry bus and the room.
function voice(a, t, { pan = 0, wet = 1 } = {}) {
  const g = a.createGain();
  let node = g;
  if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  node.connect(bus);
  const send = a.createGain();
  send.gain.value = wet;
  node.connect(send); send.connect(roomSend);
  return g;
}

// A struck object. partials: [ratio, level, decay in seconds to near silence].
function strike(freq, partials, { vol = 0.2, click = 0.5, clickFreq = 4000, at = 0, pan = (Math.random() - 0.5) * 0.4, wet = 1 } = {}) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + at, out = voice(a, t, { pan, wet });
  out.gain.value = vol * vary(0.12);
  let end = t;
  for (const [ratio, level, decay] of partials) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = freq * ratio * vary(0.004);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.0015);
    g.gain.setTargetAtTime(0, t + 0.0015, decay / 6.9);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + decay + 0.05);
    end = Math.max(end, t + decay);
  }
  if (click > 0) {
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = clickBuf;
    f.type = 'bandpass'; f.frequency.value = clickFreq * vary(0.1); f.Q.value = 1.2;
    g.gain.value = click;
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t);
  }
}

// Filtered noise for soft things, air, and felt.
function hush({ vol = 0.1, len = 0.1, freq = 800, q = 0.7, type = 'bandpass', sweep = 1, at = 0, attack = 0.005 } = {}) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + at, n = Math.floor(a.sampleRate * (len + 0.05));
  const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), out = voice(a, t, { wet: 0.6 });
  s.buffer = buf;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweep !== 1) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + len);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vol, t + attack);
  out.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f); f.connect(out);
  s.start(t); s.stop(t + len + 0.05);
}

// Plucked string (Karplus-Strong), rendered into a buffer.
function pluckString(freq, { vol = 0.3, damp = 0.996, bright = 0.5, len = 1.2 } = {}) {
  const a = ctx();
  if (!a) return;
  const sr = a.sampleRate, n = Math.floor(sr * len), period = Math.max(2, Math.round(sr / freq));
  const buf = a.createBuffer(1, n, sr), d = buf.getChannelData(0), line = new Float32Array(period);
  let lp = 0;
  for (let i = 0; i < period; i++) { lp += ((Math.random() * 2 - 1) - lp) * bright; line[i] = lp; }
  for (let i = 0, p = 0; i < n; i++) {
    const next = (p + 1) % period, v = line[p];
    line[p] = (v + line[next]) * 0.5 * damp;
    d[i] = v;
    p = next;
  }
  const t = a.currentTime, s = a.createBufferSource(), out = voice(a, t, { pan: 0, wet: 0.8 });
  s.buffer = buf;
  out.gain.value = vol;
  s.connect(out);
  s.start(t);
}

// Material recipes. p scales pitch, used for a phrase stringing itself up a scale.
const MATERIAL = {
  // Pony bead: a light, hollow plastic tick.
  plastic: (p) => strike(2300 * p * vary(0.05), [[1, 0.8, 0.045], [2.31, 0.35, 0.03], [3.9, 0.15, 0.02]], { vol: 0.14, click: 0.5, clickFreq: 5200 }),
  // Acrylic letter cube: a fuller, woody tock.
  block: (p) => strike(1250 * p * vary(0.04), [[1, 0.9, 0.07], [1.58, 0.4, 0.05], [2.91, 0.2, 0.03]], { vol: 0.18, click: 0.45, clickFreq: 3400 }),
  // Pearl: a smooth, short glassy ping.
  pearl: (p) => strike(2600 * p * vary(0.03), [[1, 0.9, 0.16], [2.76, 0.18, 0.08]], { vol: 0.1, click: 0.2, clickFreq: 6000 }),
  // Metal charm: a tiny bell with inharmonic overtones and a long tail.
  metal: (p) => strike(1700 * p * vary(0.03), [[1, 0.7, 0.9], [2.0, 0.25, 0.5], [2.76, 0.32, 0.45], [5.4, 0.12, 0.22], [8.93, 0.05, 0.12]], { vol: 0.09, click: 0.25, clickFreq: 7000 }),
  // Glass: clear and ringing.
  glass: (p) => strike(2400 * p * vary(0.03), [[1, 0.8, 1.1], [2.32, 0.3, 0.6], [4.25, 0.1, 0.3]], { vol: 0.08, click: 0.15, clickFreq: 8000 }),
  // Wood: a low, dry knock.
  wood: (p) => strike(480 * p * vary(0.04), [[1, 0.9, 0.09], [2.57, 0.35, 0.05], [4.1, 0.12, 0.03]], { vol: 0.16, click: 0.5, clickFreq: 1400 }),
  // Fabric and feathers: a soft brush.
  soft: () => hush({ vol: 0.07, len: 0.12, freq: 900, q: 0.6, attack: 0.02 }),
};
const KIND = {
  letter: 'block', pearl: 'pearl', jewel: 'glass', coupe: 'glass', guitar: 'wood', chair: 'wood', boot: 'wood',
  cardigan: 'soft', scarf: 'soft', gull: 'soft',
  star: 'metal', moon: 'metal', sparkle: 'metal', wheart: 'metal', arrow: 'metal', spacer: 'metal', mirror: 'metal',
  snake: 'metal', clock: 'metal', ladder: 'metal', mic: 'metal', leaf: 'metal',
};
// Major pentatonic, so anything played in sequence sounds musical.
const SCALE = [0, 2, 4, 7, 9];
const semis = (i) => SCALE[i % 5] + 12 * Math.floor(i / 5);

// A bead landing on the string. `step` walks up the scale while a phrase strings itself.
export function land(kind, step) {
  const pitch = step == null ? 1 : Math.pow(2, (semis(Math.min(step, 12)) - 7) / 12);
  MATERIAL[KIND[kind] || 'plastic'](pitch);
}
// Small interface click: soft and short, felt more than heard.
export const tick = (pitch = 1, vol = 0.14) =>
  strike(1800 * pitch, [[1, 0.6, 0.03], [2.4, 0.2, 0.02]], { vol: vol * 0.7, click: 0.35, clickFreq: 4500, pan: 0, wet: 0.3 });
// A celesta-like arpeggio for moments worth celebrating.
export function chime() {
  [0, 4, 7, 12].forEach((s, i) => {
    const f = 1046.5 * Math.pow(2, s / 12);
    strike(f, [[1, 0.8, 1.2], [3.0, 0.12, 0.4], [4.07, 0.06, 0.2]], { vol: 0.07, click: 0.08, clickFreq: 6000, at: i * 0.07, pan: -0.3 + i * 0.2 });
  });
}
// Strumming across the beads plays a soft mallet up the scale.
export function note(i) {
  const f = 523.25 * Math.pow(2, semis(i % 15) / 12);
  strike(f, [[1, 0.85, 0.5], [3.99, 0.18, 0.12], [10.1, 0.04, 0.04]], { vol: 0.08, click: 0.15, clickFreq: 3000 });
}
// Plucking the cord: a stretchy, low string.
export function twang(pull) {
  const f = 82 + Math.min(pull, 90) * 0.9;
  pluckString(f, { vol: 0.32, damp: 0.994, bright: 0.35 + Math.min(pull, 90) / 300, len: 1.1 });
}
// A bracelet flying onto the wall.
export const whoosh = () => hush({ vol: 0.06, len: 0.35, freq: 350, q: 1.1, sweep: 4, attack: 0.15 });
// Settling on the hook: a muted knock with a little metal.
export function thud() {
  strike(160, [[1, 0.9, 0.12], [2.3, 0.3, 0.06]], { vol: 0.2, click: 0.3, clickFreq: 900, pan: 0, wet: 0.5 });
  strike(2100, [[1, 0.5, 0.25], [2.76, 0.2, 0.15]], { vol: 0.04, click: 0, at: 0.01 });
}
export function buzz(ms) {
  if (!armed) return;
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* optional */ }
}
