// Musical sounds. Every sound in the game is a note in one key, so playing always sounds like music.
// Nothing plays until the player has interacted with the page.
//
// - Stringing beads plays a melody over a four-chord pop progression (I, V, vi, IV). Each bead is the next note.
//   After a short pause the melody starts again from the top, so every bracelet plays its own little tune.
// - Materials change the voice, not the key: charms add a bell an octave up, wood drops an octave, soft charms swell.
// - Strumming plays the current chord as an arpeggio. Plucking the cord plays its bass note.
// - Hanging a bracelet on the wall resolves to the home chord.
// - One instrument voices it all (music box, kalimba, or synth pluck), through an echo and a small room.
let ac = null, bus = null, roomSend = null, echoSend = null, muted = false, armed = false;
let instrument = 'musicbox';

export const arm = () => { armed = true; };
export const setMuted = (m) => { muted = m; };
export const setInstrument = (name) => { if (VOICES[name]) instrument = name; };

function ctx() {
  if (muted || !armed) return null;
  try {
    if (!ac) build();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) { return null; }
}

const BPM = 104, BEAT = 60 / BPM;
function build() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const out = ac.createGain();
  out.gain.value = 0.85;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
  bus = ac.createGain();
  bus.connect(comp); comp.connect(out); out.connect(ac.destination);
  // Small room.
  const room = ac.createConvolver(), len = Math.floor(ac.sampleRate * 1.6), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / ac.sampleRate;
      lp += ((Math.random() * 2 - 1) - lp) * (0.45 - Math.min(0.4, t * 0.4));
      d[i] = lp * Math.exp(-t / 0.35) * (t < 0.01 ? t / 0.01 : 1);
    }
  }
  room.buffer = ir;
  roomSend = ac.createGain();
  roomSend.gain.value = 0.28;
  roomSend.connect(room); room.connect(comp);
  // Ping-pong echo on a dotted eighth, in time with the music.
  const dl = ac.createDelay(1), dr = ac.createDelay(1), fb = ac.createGain(), damp = ac.createBiquadFilter();
  dl.delayTime.value = dr.delayTime.value = BEAT * 0.75;
  fb.gain.value = 0.32; damp.type = 'lowpass'; damp.frequency.value = 3200;
  const merge = ac.createChannelMerger(2);
  echoSend = ac.createGain();
  echoSend.gain.value = 0.2;
  echoSend.connect(dl); dl.connect(damp); damp.connect(dr); dr.connect(fb); fb.connect(dl);
  dl.connect(merge, 0, 0); dr.connect(merge, 0, 1);
  merge.connect(comp);
}

const vary = (amt) => 1 + (Math.random() * 2 - 1) * amt;
const hz = (semi) => ROOT * Math.pow(2, semi / 12);

// Output for one note: pan, dry level, and sends to the room and echo.
function out(a, { pan = 0, vol = 0.2, room = 1, echo = 1 } = {}) {
  const g = a.createGain();
  g.gain.value = vol;
  let node = g;
  if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  node.connect(bus);
  const r = a.createGain(), e = a.createGain();
  r.gain.value = room; e.gain.value = echo;
  node.connect(r); r.connect(roomSend);
  node.connect(e); e.connect(echoSend);
  return g;
}
// Sine partials, each with its own decay: [ratio, level, seconds to silence].
function partials(a, t, freq, list, dest, attack = 0.002) {
  let end = t;
  for (const [ratio, level, decay] of list) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = freq * ratio;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setTargetAtTime(0, t + attack, decay / 6.9);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + attack + decay + 0.05);
    end = Math.max(end, t + decay);
  }
  return end;
}

// The three instruments. Each plays one note: frequency, loudness 0 to 1, start offset, stereo position.
const VOICES = {
  // Music box: bright metal tines with a gentle shimmer.
  musicbox: (a, f, v, t, pan) => {
    const o = out(a, { pan, vol: 0.13 * v, room: 1.1, echo: 0.9 });
    partials(a, t, f, [[1, 1, 1.6], [2, 0.22, 0.7], [3.01, 0.08, 0.35], [5.43, 0.05, 0.15], [8.1, 0.025, 0.07]], o);
  },
  // Kalimba: warm thumb-piano tines, round and woody.
  kalimba: (a, f, v, t, pan) => {
    const o = out(a, { pan, vol: 0.2 * v, room: 0.9, echo: 0.7 });
    partials(a, t, f, [[1, 1, 1.1], [2, 0.08, 0.35], [5.95, 0.2, 0.09], [11.8, 0.05, 0.03]], o, 0.003);
    partials(a, t, f * 0.5, [[1, 0.25, 0.06]], o);
  },
  // Synth pluck: two detuned saws through a closing filter, like a pop record.
  synth: (a, f, v, t, pan) => {
    const o = out(a, { pan, vol: 0.075 * v, room: 0.8, echo: 1.3 });
    const flt = a.createBiquadFilter(), env = a.createGain();
    flt.type = 'lowpass'; flt.Q.value = 3;
    flt.frequency.setValueAtTime(Math.min(12000, f * 9), t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.2), t + 0.32);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.004);
    env.gain.setTargetAtTime(0, t + 0.004, 0.13);
    for (const d of [-7, 7]) {
      const s = a.createOscillator();
      s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = d;
      s.connect(flt); s.start(t); s.stop(t + 1.2);
    }
    flt.connect(env); env.connect(o);
  },
};
// A soft bell layered an octave up for metal and glass charms.
function bell(a, f, v, t, pan) {
  const o = out(a, { pan, vol: 0.05 * v, room: 1.2, echo: 1 });
  partials(a, t, f, [[1, 1, 1.4], [2.76, 0.3, 0.5], [5.4, 0.12, 0.2]], o);
}
// A soft swell, for fabric charms and the bracelet flying onto the wall.
function pad(a, freqs, v, t, len = 0.6, attack = 0.18) {
  const o = out(a, { vol: 0.05 * v, room: 1.4, echo: 0.6 });
  for (const f of freqs) for (const d of [-6, 6]) {
    const s = a.createOscillator(), g = a.createGain();
    s.type = 'triangle'; s.frequency.value = f; s.detune.value = d;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1 / freqs.length, t + attack);
    g.gain.setTargetAtTime(0, t + attack, len / 4);
    s.connect(g); g.connect(o);
    s.start(t); s.stop(t + attack + len * 1.6);
  }
}
// Plucked string (Karplus-Strong) for the cord.
function pluck(a, f, v, bright) {
  const sr = a.sampleRate, n = Math.floor(sr * 1.4), period = Math.max(2, Math.round(sr / f));
  const buf = a.createBuffer(1, n, sr), d = buf.getChannelData(0), line = new Float32Array(period);
  let lp = 0;
  for (let i = 0; i < period; i++) { lp += ((Math.random() * 2 - 1) - lp) * bright; line[i] = lp; }
  for (let i = 0, p = 0; i < n; i++) { const nx = (p + 1) % period, x = line[p]; line[p] = (x + line[nx]) * 0.4975; d[i] = x; p = nx; }
  const t = a.currentTime, s = a.createBufferSource(), o = out(a, { vol: 0.35 * v, room: 0.7, echo: 0.5 });
  s.buffer = buf; s.connect(o); s.start(t);
}

// The music: D major, chords I V vi IV, four beads per chord.
const ROOT = 293.66;
const CHORDS = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];
// Within each chord the melody climbs through its tones, then leans on a passing note.
const SHAPE = [[0, 0], [1, 0], [2, 0], [0, 12]];
let step = 0, lastAt = 0;
function nextNote(now) {
  if (now - lastAt > 2.2) step = 0;
  lastAt = now;
  const n = step++, chord = CHORDS[Math.floor(n / 4) % 4], [tone, up] = SHAPE[n % 4];
  // Every second pass through the progression sits an octave higher, so long bracelets keep rising.
  return chord[tone] + up + (Math.floor(n / 16) % 2) * 12;
}
const currentChord = () => CHORDS[Math.floor(Math.max(0, step - 1) / 4) % 4];

const KIND = {
  letter: 'main', pearl: 'main',
  jewel: 'bell', coupe: 'bell', star: 'bell', moon: 'bell', sparkle: 'bell', wheart: 'bell', arrow: 'bell', spacer: 'bell',
  mirror: 'bell', snake: 'bell', clock: 'bell', ladder: 'bell', mic: 'bell', leaf: 'bell',
  guitar: 'low', chair: 'low', boot: 'low',
  cardigan: 'soft', scarf: 'soft', gull: 'soft',
};
const play = (a, semi, v = 1, at = 0, pan = (Math.random() - 0.5) * 0.5) => VOICES[instrument](a, hz(semi) * vary(0.002), v * vary(0.08), a.currentTime + at, pan);

// A bead landing on the string plays the next note of the melody.
export function land(kind) {
  const a = ctx();
  if (!a) return;
  const semi = nextNote(a.currentTime), k = KIND[kind] || 'main', t = a.currentTime;
  if (k === 'low') play(a, semi - 12, 1.1);
  else if (k === 'soft') pad(a, [hz(semi)], 1.2, t, 0.35, 0.05);
  else play(a, semi, 1);
  if (k === 'bell') bell(a, hz(semi + 12), 1, t + 0.01, 0.2);
}
// Small interface feedback: a quiet note from the current chord.
export function tick(pitch = 1, vol = 0.14) {
  const a = ctx();
  if (!a) return;
  const c = currentChord();
  play(a, c[pitch > 1 ? 2 : pitch < 0.8 ? 0 : 1] + 12, (vol / 0.14) * 0.35, 0, 0);
}
// A rising arpeggio to the home chord, for tying off and hanging a bracelet.
export function chime() {
  const a = ctx();
  if (!a) return;
  [0, 4, 7, 12, 16, 19].forEach((s, i) => play(a, s + 12, 0.75, i * BEAT / 4, -0.5 + i * 0.2));
  bell(a, hz(31), 0.8, a.currentTime + BEAT * 1.5, 0);
}
// Strumming across the beads: an arpeggio of the current chord.
export function note(i) {
  const a = ctx();
  if (!a) return;
  const c = currentChord();
  play(a, c[i % 3] + 12 * (Math.floor(i / 3) % 3), 0.7);
}
// Plucking the cord: the bass note of the current chord.
export function twang(pull) {
  const a = ctx();
  if (!a) return;
  pluck(a, hz(currentChord()[0] - 24), 0.9, 0.3 + Math.min(pull, 90) / 250);
}
// A bracelet flying onto the wall: a soft swell of the home chord.
export function whoosh() {
  const a = ctx();
  if (!a) return;
  pad(a, [hz(0), hz(7), hz(12)], 0.9, a.currentTime, 0.5, 0.35);
}
// Landing on the hook: a low root note.
export function thud() {
  const a = ctx();
  if (!a) return;
  const o = out(a, { vol: 0.22, room: 0.5, echo: 0.2 });
  partials(a, a.currentTime, hz(-12), [[1, 1, 0.5], [2, 0.2, 0.2]], o, 0.004);
}
export function buzz(ms) {
  if (!armed) return;
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* optional */ }
}
