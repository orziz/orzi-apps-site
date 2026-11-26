import { parseColor, rgbaToHex } from './color-math.js';
import { cleanComputedStyles } from './style-diff.js';

/**
 * Tailwind CSS v4 spacing scale mapping (px -> utility token).
 * Tailwind v4 uses 0.25rem (4px) base unit for standard spacing steps.
 */
const SPACING_PX_MAP = new Map([
  [0, '0'],
  [1, 'px'],
  [2, '0.5'],
  [4, '1'],
  [6, '1.5'],
  [8, '2'],
  [10, '2.5'],
  [12, '3'],
  [14, '3.5'],
  [16, '4'],
  [20, '5'],
  [24, '6'],
  [28, '7'],
  [32, '8'],
  [36, '9'],
  [40, '10'],
  [44, '11'],
  [48, '12'],
  [56, '14'],
  [64, '16'],
  [80, '20'],
  [96, '24'],
  [112, '28'],
  [128, '32'],
  [144, '36'],
  [160, '40'],
  [192, '48'],
  [224, '56'],
  [256, '64'],
]);

const FONT_SIZE_MAP = new Map([
  [12, 'text-xs'],
  [14, 'text-sm'],
  [16, 'text-base'],
  [18, 'text-lg'],
  [20, 'text-xl'],
  [24, 'text-2xl'],
  [30, 'text-3xl'],
  [36, 'text-4xl'],
  [48, 'text-5xl'],
  [60, 'text-6xl'],
]);

const FONT_WEIGHT_MAP = new Map([
  ['100', 'font-thin'],
  ['200', 'font-extralight'],
  ['300', 'font-light'],
  ['400', 'font-normal'],
  ['500', 'font-medium'],
  ['600', 'font-semibold'],
  ['700', 'font-bold'],
  ['800', 'font-extrabold'],
  ['900', 'font-black'],
]);

const RADIUS_PX_MAP = new Map([
  [0, 'rounded-none'],
  [2, 'rounded-xs'],
  [4, 'rounded-sm'],
  [6, 'rounded-md'],
  [8, 'rounded-lg'],
  [12, 'rounded-xl'],
  [16, 'rounded-2xl'],
  [24, 'rounded-3xl'],
]);

const EXACT_COLORS = new Map([
  ['#ffffff', 'white'],
  ['#000000', 'black'],
  // Slate
  ['#f8fafc', 'slate-50'], ['#f1f5f9', 'slate-100'], ['#e2e8f0', 'slate-200'],
  ['#cbd5e1', 'slate-300'], ['#94a3b8', 'slate-400'], ['#64748b', 'slate-500'],
  ['#475569', 'slate-600'], ['#334155', 'slate-700'], ['#1e293b', 'slate-800'],
  ['#0f172a', 'slate-900'], ['#020617', 'slate-950'],
  // Gray
  ['#f9fafb', 'gray-50'], ['#f3f4f6', 'gray-100'], ['#e5e7eb', 'gray-200'],
  ['#d1d5db', 'gray-300'], ['#9ca3af', 'gray-400'], ['#6b7280', 'gray-500'],
  ['#4b5563', 'gray-600'], ['#374151', 'gray-700'], ['#1f2937', 'gray-800'],
  ['#111827', 'gray-900'], ['#030712', 'gray-950'],
  // Zinc (Linear / Vercel / shadcn primary neutrals)
  ['#fafafa', 'zinc-50'], ['#f4f4f5', 'zinc-100'], ['#e4e4e7', 'zinc-200'],
  ['#d4d4d8', 'zinc-300'], ['#a1a1aa', 'zinc-400'], ['#71717a', 'zinc-500'],
  ['#52525b', 'zinc-600'], ['#3f3f46', 'zinc-700'], ['#27272a', 'zinc-800'],
  ['#18181b', 'zinc-900'], ['#09090b', 'zinc-950'],
  // Neutral
  ['#f5f5f5', 'neutral-100'], ['#e5e5e5', 'neutral-200'], ['#d4d4d4', 'neutral-300'],
  ['#a3a3a3', 'neutral-400'], ['#737373', 'neutral-500'], ['#525252', 'neutral-600'],
  ['#404040', 'neutral-700'], ['#262626', 'neutral-800'], ['#171717', 'neutral-900'],
  ['#0a0a0a', 'neutral-950'],
  // Red / Rose / Orange / Amber / Yellow
  ['#fef2f2', 'red-50'], ['#fecaca', 'red-200'], ['#f87171', 'red-400'], ['#ef4444', 'red-500'], ['#dc2626', 'red-600'], ['#b91c1c', 'red-700'],
  ['#fff1f2', 'rose-50'], ['#f43f5e', 'rose-500'], ['#e11d48', 'rose-600'],
  ['#fff7ed', 'orange-50'], ['#fb923c', 'orange-400'], ['#f97316', 'orange-500'], ['#ea580c', 'orange-600'],
  ['#fffbeb', 'amber-50'], ['#fbbf24', 'amber-400'], ['#f59e0b', 'amber-500'], ['#d97706', 'amber-600'],
  ['#fefce8', 'yellow-50'], ['#facc15', 'yellow-400'], ['#eab308', 'yellow-500'],
  // Green / Emerald / Teal / Cyan / Sky
  ['#f0fdf4', 'green-50'], ['#4ade80', 'green-400'], ['#22c55e', 'green-500'], ['#16a34a', 'green-600'],
  ['#ecfdf5', 'emerald-50'], ['#d1fae5', 'emerald-100'], ['#34d399', 'emerald-400'], ['#10b981', 'emerald-500'], ['#059669', 'emerald-600'], ['#065f46', 'emerald-800'],
  ['#f0fdfa', 'teal-50'], ['#14b8a6', 'teal-500'], ['#0d9488', 'teal-600'],
  ['#ecfeff', 'cyan-50'], ['#06b6d4', 'cyan-500'], ['#0891b2', 'cyan-600'],
  ['#f0f9ff', 'sky-50'], ['#38bdf8', 'sky-400'], ['#0ea5e9', 'sky-500'], ['#0284c7', 'sky-600'],
  // Blue / Indigo / Violet / Purple / Fuchsia / Pink
  ['#eff6ff', 'blue-50'], ['#dbeafe', 'blue-100'], ['#93c5fd', 'blue-300'], ['#60a5fa', 'blue-400'], ['#3b82f6', 'blue-500'], ['#2563eb', 'blue-600'], ['#1d4ed8', 'blue-700'], ['#1e40af', 'blue-800'],
  ['#eef2ff', 'indigo-50'], ['#818cf8', 'indigo-400'], ['#6366f1', 'indigo-500'], ['#4f46e5', 'indigo-600'], ['#4338ca', 'indigo-700'],
  ['#f5f3ff', 'violet-50'], ['#a78bfa', 'violet-400'], ['#8b5cf6', 'violet-500'], ['#7c3aed', 'violet-600'],
  ['#faf5ff', 'purple-50'], ['#a855f7', 'purple-500'], ['#9333ea', 'purple-600'],
  ['#fdf4ff', 'fuchsia-50'], ['#d946ef', 'fuchsia-500'], ['#c026d3', 'fuchsia-600'],
  ['#fdf2f8', 'pink-50'], ['#ec4899', 'pink-500'], ['#db2777', 'pink-600'],
]);

const PALETTE_RGB_ENTRIES = [...EXACT_COLORS.entries()].map(([hex, token]) => ({
  hex,
  token,
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
}));

function matchTailwindPaletteToken(rgba) {
  const opaqueHex = rgbaToHex({ r: rgba.r, g: rgba.g, b: rgba.b, a: 1 });
  if (EXACT_COLORS.has(opaqueHex)) return EXACT_COLORS.get(opaqueHex);
  // Snap within <= 4 RGB Euclidean distance to handle oklch()->sRGB 1-bit rounding cleanly
  let best = null;
  let bestDist = 17; // 4^2 + 1
  for (const entry of PALETTE_RGB_ENTRIES) {
    const dr = rgba.r - entry.r;
    const dg = rgba.g - entry.g;
    const db = rgba.b - entry.b;
    const d2 = dr * dr + dg * dg + db * db;
    if (d2 < bestDist) {
      bestDist = d2;
      best = entry.token;
    }
  }
  return best;
}

function parsePx(val) {
  if (!val || typeof val !== 'string') return null;
  const match = val.trim().match(/^(-?[\d.]+)px$/);
  return match ? Number(match[1]) : null;
}

function mapSpacingToken(pxValue) {
  if (pxValue === null || Number.isNaN(pxValue)) return null;
  const rounded = Math.round(pxValue * 10) / 10;
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';
  if (SPACING_PX_MAP.has(abs)) {
    return `${sign}${SPACING_PX_MAP.get(abs)}`;
  }
  if (abs % 4 === 0 && abs <= 384) {
    return `${sign}${abs / 4}`;
  }
  return `${sign}[${Number(abs.toFixed(1))}px]`;
}

function mapColorToken(cssValue, prefix) {
  const parsed = parseColor(cssValue);
  if (!parsed) return null;
  if (parsed.a === 0) return `${prefix}-transparent`;
  const paletteToken = matchTailwindPaletteToken(parsed);
  const opaqueHex = rgbaToHex({ r: parsed.r, g: parsed.g, b: parsed.b, a: 1 });
  const base = paletteToken ? `${prefix}-${paletteToken}` : `${prefix}-[${opaqueHex}]`;
  if (parsed.a < 0.999) {
    const pct = Math.round(parsed.a * 100);
    return pct % 5 === 0 ? `${base}/${pct}` : `${base}/[${Number(parsed.a.toFixed(2))}]`;
  }
  return base;
}

function emitFourSideUtility(prefix, shorthand) {
  if (!shorthand) return [];
  const parts = shorthand.trim().split(/\s+/);
  const mapVal = (p) => {
    const px = parsePx(p);
    return px !== null ? mapSpacingToken(px) : `[${p}]`;
  };
  if (parts.length === 1) {
    const t = mapVal(parts[0]);
    return t && t !== '0' ? [`${prefix}-${t}`] : [];
  }
  if (parts.length === 2) {
    const py = mapVal(parts[0]);
    const px = mapVal(parts[1]);
    const list = [];
    if (py && py !== '0') list.push(`${prefix}y-${py}`);
    if (px && px !== '0') list.push(`${prefix}x-${px}`);
    return list;
  }
  if (parts.length === 3) {
    const [pt, px, pb] = parts.map(mapVal);
    const list = [];
    if (pt && pt !== '0') list.push(`${prefix}t-${pt}`);
    if (px && px !== '0') list.push(`${prefix}x-${px}`);
    if (pb && pb !== '0') list.push(`${prefix}b-${pb}`);
    return list;
  }
  const [pt, pr, pb, pl] = parts.map(mapVal);
  const list = [];
  if (pt === pb) {
    if (pt && pt !== '0') list.push(`${prefix}y-${pt}`);
    if (pr && pr !== '0') list.push(`${prefix}r-${pr}`);
    if (pl && pl !== '0') list.push(`${prefix}l-${pl}`);
  } else {
    if (pt && pt !== '0') list.push(`${prefix}t-${pt}`);
    if (pr && pr !== '0') list.push(`${prefix}r-${pr}`);
    if (pb && pb !== '0') list.push(`${prefix}b-${pb}`);
    if (pl && pl !== '0') list.push(`${prefix}l-${pl}`);
  }
  return list;
}

/**
 * Compiles a cleaned CSS declarations object into clean Tailwind CSS v4 utility classes.
 */
export function cssToTailwindClasses(declarations = {}) {
  const classes = [];

  // Display
  const displayMap = {
    block: 'block',
    'inline-block': 'inline-block',
    inline: 'inline',
    flex: 'flex',
    'inline-flex': 'inline-flex',
    grid: 'grid',
    'inline-grid': 'inline-grid',
    none: 'hidden',
  };
  if (declarations.display && displayMap[declarations.display]) {
    classes.push(displayMap[declarations.display]);
  }

  // Position & z-index
  if (declarations.position && ['relative', 'absolute', 'fixed', 'sticky'].includes(declarations.position)) {
    classes.push(declarations.position);
  }
  if (declarations['z-index'] && /^\d+$/.test(declarations['z-index'])) {
    const z = declarations['z-index'];
    classes.push(['0', '10', '20', '30', '40', '50'].includes(z) ? `z-${z}` : `z-[${z}]`);
  }

  // Flex / Grid
  const flexDirMap = {
    column: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse',
  };
  if (flexDirMap[declarations['flex-direction']]) classes.push(flexDirMap[declarations['flex-direction']]);
  if (declarations['flex-wrap'] === 'wrap') classes.push('flex-wrap');

  const justifyMap = {
    center: 'justify-center',
    'flex-end': 'justify-end',
    end: 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
  };
  if (justifyMap[declarations['justify-content']]) classes.push(justifyMap[declarations['justify-content']]);

  const alignMap = {
    center: 'items-center',
    'flex-start': 'items-start',
    start: 'items-start',
    'flex-end': 'items-end',
    end: 'items-end',
    baseline: 'items-baseline',
  };
  if (alignMap[declarations['align-items']]) classes.push(alignMap[declarations['align-items']]);

  if (declarations.gap) {
    const px = parsePx(declarations.gap);
    if (px !== null) classes.push(`gap-${mapSpacingToken(px)}`);
  } else {
    if (declarations['row-gap']) {
      const px = parsePx(declarations['row-gap']);
      if (px !== null) classes.push(`gap-y-${mapSpacingToken(px)}`);
    }
    if (declarations['column-gap']) {
      const px = parsePx(declarations['column-gap']);
      if (px !== null) classes.push(`gap-x-${mapSpacingToken(px)}`);
    }
  }

  if (declarations['grid-template-columns']) {
    const cols = declarations['grid-template-columns'].trim().split(/\s+/);
    const pxCols = cols.map(parsePx);
    const allEqualTracks = cols.length >= 2 && cols.length <= 12 && (
      cols.every((c) => c === cols[0])
      || (pxCols.every((n) => n !== null && n > 0) && Math.max(...pxCols) - Math.min(...pxCols) <= 2)
    );
    if (allEqualTracks) {
      classes.push(`grid-cols-${cols.length}`);
    } else if (cols.length > 0 && declarations['grid-template-columns'] !== 'none') {
      classes.push(`grid-cols-[${declarations['grid-template-columns'].trim().replace(/\s+/g, '_')}]`);
    }
  }

  // Flex item sizing & alignment
  if (declarations['flex-grow'] === '1') classes.push('grow');
  if (declarations['flex-shrink'] === '0') classes.push('shrink-0');
  const selfMap = {
    'flex-start': 'self-start', start: 'self-start',
    'flex-end': 'self-end', end: 'self-end',
    center: 'self-center', stretch: 'self-stretch',
  };
  if (selfMap[declarations['align-self']]) classes.push(selfMap[declarations['align-self']]);

  // Spacing
  classes.push(...emitFourSideUtility('p', declarations.padding));
  classes.push(...emitFourSideUtility('m', declarations.margin));

  // Sizing
  if (declarations.width) {
    const px = parsePx(declarations.width);
    if (px !== null && px > 0) classes.push(`w-${mapSpacingToken(px)}`);
  }
  if (declarations.height) {
    const px = parsePx(declarations.height);
    if (px !== null && px > 0) classes.push(`h-${mapSpacingToken(px)}`);
  }
  if (declarations['max-width'] && declarations['max-width'] !== 'none') {
    classes.push(`max-w-[${declarations['max-width'].replace(/\s+/g, '_')}]`);
  }
  if (declarations['min-height']) {
    const px = parsePx(declarations['min-height']);
    if (px !== null && px > 0) classes.push(`min-h-${mapSpacingToken(px)}`);
  }
  if (declarations['aspect-ratio'] && declarations['aspect-ratio'] !== 'auto') {
    const ar = declarations['aspect-ratio'].replace(/\s+/g, '');
    if (ar === '1/1' || ar === '1') classes.push('aspect-square');
    else if (ar === '16/9') classes.push('aspect-video');
    else classes.push(`aspect-[${ar}]`);
  }
  if (declarations['object-fit'] && ['cover', 'contain', 'none', 'scale-down'].includes(declarations['object-fit'])) {
    classes.push(`object-${declarations['object-fit']}`);
  }

  // Background color, gradients & background-clip
  if (declarations['background-color']) {
    const c = mapColorToken(declarations['background-color'], 'bg');
    if (c) classes.push(c);
  }
  if (declarations['background-image'] && declarations['background-image'] !== 'none') {
    const bgImg = declarations['background-image'].trim();
    if (/^(?:linear|radial|conic)-gradient\(/.test(bgImg)) {
      const compact = bgImg.replace(/,\s+/g, ',').replace(/\s+/g, '_');
      classes.push(`bg-[${compact}]`);
    }
  }
  if (declarations['background-clip'] === 'text') {
    classes.push('bg-clip-text');
  }
  if (declarations.color) {
    const c = mapColorToken(declarations.color, 'text');
    if (c) classes.push(c);
  }

  // Typography
  if (declarations['font-size']) {
    const px = parsePx(declarations['font-size']);
    if (px !== null) {
      classes.push(FONT_SIZE_MAP.get(Math.round(px)) || `text-[${Number(px.toFixed(1))}px]`);
    }
  }
  if (declarations['font-weight'] && FONT_WEIGHT_MAP.has(String(declarations['font-weight']))) {
    classes.push(FONT_WEIGHT_MAP.get(String(declarations['font-weight'])));
  }
  if (declarations['font-style'] === 'italic') classes.push('italic');
  if (declarations['text-align'] && ['center', 'right', 'justify'].includes(declarations['text-align'])) {
    classes.push(`text-${declarations['text-align']}`);
  }
  if (declarations['text-transform'] === 'uppercase') classes.push('uppercase');
  if (declarations['text-transform'] === 'lowercase') classes.push('lowercase');
  if (declarations['text-transform'] === 'capitalize') classes.push('capitalize');
  if (declarations['text-decoration-line'] === 'underline') classes.push('underline');
  if (declarations['text-decoration-line'] === 'line-through') classes.push('line-through');

  if (declarations['letter-spacing']) {
    const lsPx = parsePx(declarations['letter-spacing']);
    const fsPx = parsePx(declarations['font-size']) || 16;
    if (lsPx !== null && Math.abs(lsPx) >= 0.1) {
      const em = lsPx / fsPx;
      if (em <= -0.04) classes.push('tracking-tighter');
      else if (em <= -0.015) classes.push('tracking-tight');
      else if (em >= 0.08) classes.push('tracking-widest');
      else if (em >= 0.04) classes.push('tracking-wider');
      else if (em >= 0.015) classes.push('tracking-wide');
      else classes.push(`tracking-[${Number(lsPx.toFixed(2))}px]`);
    }
  }

  if (declarations['white-space'] === 'nowrap') classes.push('whitespace-nowrap');
  if (declarations['text-overflow'] === 'ellipsis' && declarations.overflow === 'hidden' && declarations['white-space'] === 'nowrap') {
    classes.push('truncate');
  }

  if (declarations['line-height'] && declarations['font-size']) {
    const lh = parsePx(declarations['line-height']);
    const fs = parsePx(declarations['font-size']);
    if (lh && fs) {
      const ratio = Number((lh / fs).toFixed(2));
      if (ratio <= 1.05) classes.push('leading-none');
      else if (ratio <= 1.28) classes.push('leading-tight');
      else if (ratio <= 1.42) classes.push('leading-snug');
      else if (ratio <= 1.56) classes.push('leading-normal');
      else if (ratio <= 1.7) classes.push('leading-relaxed');
      else classes.push(`leading-[${ratio}]`);
    }
  }

  // Border
  if (declarations.border) {
    const parts = declarations.border.split(/\s+/);
    const wPx = parsePx(parts[0]);
    if (wPx === 1) classes.push('border');
    else if (wPx && [2, 4, 8].includes(wPx)) classes.push(`border-${wPx}`);
    else if (wPx) classes.push(`border-[${wPx}px]`);

    if (parts[1] === 'dashed') classes.push('border-dashed');
    if (parts[1] === 'dotted') classes.push('border-dotted');
    const colorPart = parts.slice(2).join(' ');
    const borderColor = mapColorToken(colorPart, 'border');
    if (borderColor) classes.push(borderColor);
  } else {
    for (const [side, short] of [['top', 't'], ['right', 'r'], ['bottom', 'b'], ['left', 'l']]) {
      const val = declarations[`border-${side}`];
      if (!val) continue;
      const parts = val.split(/\s+/);
      const wPx = parsePx(parts[0]);
      classes.push(wPx === 1 ? `border-${short}` : `border-${short}-[${parts[0]}]`);
      const borderColor = mapColorToken(parts.slice(2).join(' '), `border-${short}`);
      if (borderColor) classes.push(borderColor);
    }
  }

  // Border radius
  if (declarations['border-radius']) {
    const r = declarations['border-radius'].trim();
    const px = parsePx(r);
    if (r === '50%' || r === '9999px' || (px !== null && px >= 999)) {
      classes.push('rounded-full');
    } else if (px !== null) {
      classes.push(RADIUS_PX_MAP.get(Math.round(px)) || `rounded-[${Number(px.toFixed(1))}px]`);
    } else {
      classes.push(`rounded-[${r.replace(/\s+/g, '_')}]`);
    }
  }

  // Shadows, backdrop blur, opacity, overflow, cursor
  if (declarations['box-shadow']) {
    const s = declarations['box-shadow'];
    if (s.includes('0px 1px 2px') || s.includes('0 1px 2px')) classes.push('shadow-xs');
    else if (s.includes('0px 1px 3px') || s.includes('0 1px 3px')) classes.push('shadow-sm');
    else if (s.includes('0px 4px 6px') || s.includes('0 4px 6px')) classes.push('shadow-md');
    else if (s.includes('0px 10px 15px') || s.includes('0 10px 15px')) classes.push('shadow-lg');
    else classes.push(`shadow-[${s.replace(/\s+/g, '_')}]`);
  }

  if (declarations['backdrop-filter']) {
    const blurMatch = declarations['backdrop-filter'].match(/blur\(\s*([\d.]+)px\s*\)/);
    if (blurMatch) {
      const px = Math.round(parseFloat(blurMatch[1]));
      const blurMap = new Map([[4, 'xs'], [8, 'sm'], [12, 'md'], [16, 'lg'], [24, 'xl'], [40, '2xl'], [64, '3xl']]);
      classes.push(blurMap.has(px) ? `backdrop-blur-${blurMap.get(px)}` : `backdrop-blur-[${px}px]`);
    }
  }

  if (declarations.opacity) {
    const op = Math.round(Number(declarations.opacity) * 100);
    if (!Number.isNaN(op) && op < 100) {
      classes.push(op % 5 === 0 ? `opacity-${op}` : `opacity-[${declarations.opacity}]`);
    }
  }

  if (declarations.overflow && ['hidden', 'auto', 'scroll', 'clip'].includes(declarations.overflow)) {
    classes.push(`overflow-${declarations.overflow}`);
  }
  if (declarations.cursor === 'pointer') classes.push('cursor-pointer');

  return [...new Set(classes)];
}

const JSX_ATTR_MAP = Object.freeze({
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  'aria-label': 'aria-label',
});

const VOID_TAGS = new Set(['img', 'input', 'br', 'hr', 'source', 'meta', 'link']);

export function convertSvgToJsx(svgStr) {
  if (!svgStr) return '';
  return svgStr
    .replace(/\bclass=/g, 'className=')
    .replace(/\bviewbox=/gi, 'viewBox=')
    .replace(/\bstroke-width=/g, 'strokeWidth=')
    .replace(/\bstroke-linecap=/g, 'strokeLinecap=')
    .replace(/\bstroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/\bstroke-dasharray=/g, 'strokeDasharray=')
    .replace(/\bstroke-dashoffset=/g, 'strokeDashoffset=')
    .replace(/\bfill-rule=/g, 'fillRule=')
    .replace(/\bclip-rule=/g, 'clipRule=')
    .replace(/\bstop-color=/g, 'stopColor=')
    .replace(/\bstop-opacity=/g, 'stopOpacity=')
    .replace(/\bxmlns:xlink=/g, 'xmlnsXlink=');
}

/**
 * Compiles a serialized DOM subtree into Tailwind HTML or React JSX.
 */
export function compileTreeToTailwind(tree, { jsx = false, componentName = 'ExtractedComponent' } = {}) {
  function renderNode(node, depth = 0, parentStyles = {}) {
    const indent = '  '.repeat(depth);
    if (node.type === 'text') {
      return `${indent}${jsx ? escapeJsxText(node.text) : escapeHtml(node.text)}`;
    }
    if (node.tag === 'svg' && node.outerSvg) {
      return `${indent}${jsx ? convertSvgToJsx(node.outerSvg) : node.outerSvg}`;
    }

    const cleaned = cleanComputedStyles(node.styles, node.baseline || {}, {
      parentInherited: parentStyles,
    });
    const twClasses = cssToTailwindClasses(cleaned);

    const attrs = [];
    if (twClasses.length > 0) {
      attrs.push(`${jsx ? 'className' : 'class'}="${twClasses.join(' ')}"`);
    }

    if (node.attrs) {
      for (const [k, v] of Object.entries(node.attrs)) {
        if (v === undefined || v === null || v === '') continue;
        const key = jsx ? (JSX_ATTR_MAP[k.toLowerCase()] || k) : k;
        attrs.push(`${key}="${escapeAttr(String(v))}"`);
      }
    }

    const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
    if (VOID_TAGS.has(node.tag)) {
      return jsx ? `${indent}<${node.tag}${attrStr} />` : `${indent}<${node.tag}${attrStr}>`;
    }

    const children = node.children || [];
    if (children.length === 0) {
      return `${indent}<${node.tag}${attrStr}></${node.tag}>`;
    }
    if (children.length === 1 && children[0].type === 'text' && children[0].text.length < 70) {
      const text = jsx ? escapeJsxText(children[0].text) : escapeHtml(children[0].text);
      return `${indent}<${node.tag}${attrStr}>${text}</${node.tag}>`;
    }

    const nextInherited = {
      color: node.styles?.color || parentStyles.color,
      'font-family': node.styles?.['font-family'] || parentStyles['font-family'],
      'font-size': node.styles?.['font-size'] || parentStyles['font-size'],
      'font-weight': node.styles?.['font-weight'] || parentStyles['font-weight'],
      'line-height': node.styles?.['line-height'] || parentStyles['line-height'],
    };

    const inner = children.map((c) => renderNode(c, depth + 1, nextInherited)).join('\n');
    return `${indent}<${node.tag}${attrStr}>\n${inner}\n${indent}</${node.tag}>`;
  }

  const markup = renderNode(tree, jsx ? 2 : 0, {});
  if (!jsx) return markup;

  return [
    `export function ${componentName}() {`,
    `  return (`,
    markup,
    `  );`,
    `}`,
  ].join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJsxText(str) {
  return escapeHtml(str).replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
