// Small synthesized sounds. Nothing plays until the player has interacted.
let ac = null, muted = false, armed = false;

export const arm = () => { armed = true; };
export const setMuted = (m) => { muted = m; };

const VOICE = {
  pony: [1500, 'triangle', 0.2], glitter: [1650, 'triangle', 0.2], glow: [1400, 'triangle', 0.2],
  letter: [1050, 'triangle', 0.24], pearl: [2100, 'sine', 0.16], heart: [1300, 'triangle', 0.2],
  lucky13: [1900, 'sine', 0.16], moon: [2400, 'sine', 0.14], snake: [2000, 'sine', 0.14], guitar: [1250, 'sine', 0.18],
  star: [2600, 'sine', 0.14], mirror: [2900, 'sine', 0.14], spacer: [3300, 'sine', 0.1],
};

function blip(freq, type, vol, len) {
  if (muted || !armed) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    const f = freq * (0.93 + Math.random() * 0.14);
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (type === 'sine' ? 0.9 : 0.45), t + len * 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + len + 0.02);
  } catch (e) { /* audio is optional */ }
}

// Click of a bead landing. Plastic clicks, metal and pearl ring a little longer.
export function land(kind) {
  const [f, type, vol] = VOICE[kind] || VOICE.pony;
  blip(f, type, vol, type === 'sine' ? 0.16 : 0.08);
}
export const tick = (pitch = 1, vol = 0.14) => blip(1500 * pitch, 'triangle', vol, 0.08);
export function chime() {
  [1, 1.26, 1.5, 2].forEach((p, i) => setTimeout(() => blip(830 * p, 'sine', 0.16, 0.3), i * 90));
}
export function buzz(ms) {
  if (!armed) return;
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* optional */ }
}
