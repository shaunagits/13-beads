// Light or dark. Follows the device until the player picks one with the toggle; their pick is saved on this device.
// index.html sets data-theme before first paint, so there is no flash of the wrong theme.
const KEY = '13beads.theme';
const system = matchMedia('(prefers-color-scheme: dark)');
let pick = null;
try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') pick = v; } catch (e) { /* optional */ }
const subs = [];

export const isDark = () => (pick ? pick === 'dark' : system.matches);
export const onTheme = (fn) => subs.push(fn);

function apply() {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#130e21' : '#f1ebf7';
  subs.forEach((fn) => fn(dark));
}
export function toggleTheme() {
  pick = isDark() ? 'light' : 'dark';
  try { localStorage.setItem(KEY, pick); } catch (e) { /* optional */ }
  apply();
}
system.addEventListener('change', () => { if (!pick) apply(); });
apply();
