import {
  buildColorPalette,
  getContrastReport,
  parseColor,
  rgbaToHex,
  rgbaToOklch,
} from '../../lib/color-math.js';

const fgPicker = document.getElementById('fg-picker');
const fgText = document.getElementById('fg-text');
const fgOklch = document.getElementById('fg-oklch');
const bgPicker = document.getElementById('bg-picker');
const bgText = document.getElementById('bg-text');
const bgOklch = document.getElementById('bg-oklch');
const previewBox = document.getElementById('contrast-preview-box');
const ratioValue = document.getElementById('ratio-value');
const badgeAaNormal = document.getElementById('badge-aa-normal');
const badgeAaLarge = document.getElementById('badge-aa-large');
const badgeAaaNormal = document.getElementById('badge-aaa-normal');
const paletteChips = document.getElementById('palette-chips');
const paletteFormat = document.getElementById('palette-format');
const outTheme = document.querySelector('#out-theme code');
const statusToast = document.getElementById('tool-status');

let paletteEntries = [
  { value: '#ffffff', role: 'background' },
  { value: '#0f172a', role: 'text' },
  { value: '#2563eb', role: 'accent' },
  { value: '#059669', role: 'success' },
  { value: '#64748b', role: 'muted' },
];

let toastTimer = null;
function notify(msg) {
  statusToast.textContent = msg;
  statusToast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => statusToast.classList.remove('visible'), 2200);
}

function setBadge(el, pass, label) {
  el.textContent = pass ? `✓ Pass ${label}` : `✗ Fail ${label}`;
  el.className = `status-pill ${pass ? 'pass' : 'fail'}`;
}

function renderContrast() {
  const fg = parseColor(fgText.value);
  const bg = parseColor(bgText.value);
  if (!fg || !bg) return;

  const fgHex = rgbaToHex(fg).slice(0, 7);
  const bgHex = rgbaToHex(bg).slice(0, 7);
  fgPicker.value = fgHex;
  bgPicker.value = bgHex;
  fgOklch.textContent = rgbaToOklch(fg);
  bgOklch.textContent = rgbaToOklch(bg);

  previewBox.style.color = fgHex;
  previewBox.style.backgroundColor = bgHex;

  const normal = getContrastReport(fg, bg, { fontSizePx: 16, fontWeight: 400 });
  const large = getContrastReport(fg, bg, { fontSizePx: 24, fontWeight: 700 });

  ratioValue.textContent = normal.ratio ? `${normal.ratio}:1` : 'N/A';
  setBadge(badgeAaNormal, normal.passAA, 'AA');
  setBadge(badgeAaLarge, large.passAA, 'AA');
  setBadge(badgeAaaNormal, normal.passAAA, 'AAA');
}

function renderPalette() {
  const palette = buildColorPalette(paletteEntries, 16);
  paletteChips.innerHTML = '';

  palette.forEach((c) => {
    const li = document.createElement('li');
    li.className = 'palette-chip-item';

    const dot = document.createElement('span');
    dot.className = 'chip-dot';
    dot.style.backgroundColor = c.hex;

    const label = document.createElement('span');
    label.className = 'mono';
    label.textContent = `${c.tokenName} ${c.hex}`;

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'chip-remove';
    rm.setAttribute('aria-label', `Remove ${c.tokenName} ${c.hex}`);
    rm.textContent = '×';
    rm.addEventListener('click', () => {
      paletteEntries = paletteEntries.filter((e) => rgbaToHex(parseColor(e.value)) !== c.hex);
      renderPalette();
    });

    li.append(dot, label, rm);
    paletteChips.append(li);
  });

  const fmt = paletteFormat.value;
  if (fmt === 'tailwind') {
    outTheme.textContent = [
      '@import "tailwindcss";',
      '',
      '@theme {',
      ...palette.map((c) => `  --color-brand-${c.tokenName}: ${c.oklch}; /* ${c.hex} */`),
      '}',
    ].join('\n');
  } else if (fmt === 'css') {
    outTheme.textContent = [
      ':root {',
      ...palette.map((c) => `  --color-${c.tokenName}: ${c.hex}; /* ${c.oklch} */`),
      '}',
    ].join('\n');
  } else {
    const dtcg = { color: {} };
    for (const c of palette) {
      dtcg.color[c.tokenName] = { $type: 'color', $value: c.hex, $extensions: { oklch: c.oklch } };
    }
    outTheme.textContent = JSON.stringify(dtcg, null, 2);
  }
}

fgPicker.addEventListener('input', () => {
  fgText.value = fgPicker.value;
  renderContrast();
});
bgPicker.addEventListener('input', () => {
  bgText.value = bgPicker.value;
  renderContrast();
});
fgText.addEventListener('input', renderContrast);
bgText.addEventListener('input', renderContrast);

document.getElementById('btn-swap').addEventListener('click', () => {
  const prevFg = fgText.value;
  fgText.value = bgText.value;
  bgText.value = prevFg;
  renderContrast();
});

document.getElementById('btn-add-fg').addEventListener('click', () => {
  if (!parseColor(fgText.value)) return;
  paletteEntries.push({ value: fgText.value, role: 'text' });
  renderPalette();
  notify('Added foreground color to palette');
});

document.getElementById('btn-add-bg').addEventListener('click', () => {
  if (!parseColor(bgText.value)) return;
  paletteEntries.push({ value: bgText.value, role: 'background' });
  renderPalette();
  notify('Added background color to palette');
});

paletteFormat.addEventListener('change', renderPalette);

document.getElementById('btn-copy-theme').addEventListener('click', async () => {
  await navigator.clipboard.writeText(outTheme.textContent);
  notify('Copied design tokens to clipboard');
});

renderContrast();
renderPalette();
