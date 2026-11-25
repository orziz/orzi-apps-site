/**
 * Pure color parsing, conversion (Hex, RGB, HSL, OKLCH), WCAG 2.1 contrast,
 * and semantic palette clustering utilities. Zero external dependencies.
 */

const NAMED_COLORS = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  red: { r: 255, g: 0, b: 0, a: 1 },
  green: { r: 0, g: 128, b: 0, a: 1 },
  blue: { r: 0, g: 0, b: 255, a: 1 },
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function parseAlpha(str) {
  if (str === undefined || str === null || str === '') return 1;
  const s = String(str).trim();
  if (s === 'none') return 0;
  const val = s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s);
  return Number.isNaN(val) ? 1 : Number(clamp(val, 0, 1).toFixed(3));
}

function parseAngleDeg(str) {
  const s = String(str || '0').trim().toLowerCase();
  if (s === 'none') return 0;
  if (s.endsWith('rad')) return (parseFloat(s) * 180) / Math.PI;
  if (s.endsWith('turn')) return parseFloat(s) * 360;
  if (s.endsWith('grad')) return parseFloat(s) * 0.9;
  return parseFloat(s) || 0;
}

function linearToSrgbChannel(c) {
  const v = clamp(c, 0, 1);
  const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return clamp(Math.round(srgb * 255), 0, 255);
}

/**
 * Inverse Bjorn Ottosson OKLab -> sRGB { r, g, b, a }.
 */
function oklabToRgba(L, a, b, alpha = 1) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return {
    r: linearToSrgbChannel(rLin),
    g: linearToSrgbChannel(gLin),
    b: linearToSrgbChannel(bLin),
    a: alpha,
  };
}

/**
 * Parses #hex, rgb/rgba, hsl/hsla, oklch, oklab, color(srgb), color(display-p3), or basic named colors.
 * Returns null if unparseable.
 */
export function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'inherit' || raw === 'initial' || raw === 'currentcolor') {
    return null;
  }
  if (NAMED_COLORS[raw]) {
    return { ...NAMED_COLORS[raw] };
  }

  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (raw.startsWith('#')) {
    const hex = raw.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a: Number(a.toFixed(3)) };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a: Number(a.toFixed(3)) };
    }
    return null;
  }

  // rgb() / rgba() (comma or space syntax with optional / alpha)
  const rgbMatch = raw.match(
    /^rgba?\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
  );
  if (rgbMatch) {
    const parseChannel = (val) => {
      if (val.endsWith('%')) return clamp(Math.round((parseFloat(val) / 100) * 255), 0, 255);
      return clamp(Math.round(parseFloat(val)), 0, 255);
    };
    return {
      r: parseChannel(rgbMatch[1]),
      g: parseChannel(rgbMatch[2]),
      b: parseChannel(rgbMatch[3]),
      a: parseAlpha(rgbMatch[4]),
    };
  }

  // hsl() / hsla()
  const hslMatch = raw.match(
    /^hsla?\(\s*([-\d.]+(?:deg|rad|turn|grad)?|none)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
  );
  if (hslMatch) {
    const h = ((parseAngleDeg(hslMatch[1]) % 360) + 360) % 360;
    const s = clamp(parseFloat(hslMatch[2]) / 100, 0, 1);
    const l = clamp(parseFloat(hslMatch[3]) / 100, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60) [rp, gp, bp] = [c, x, 0];
    else if (h < 120) [rp, gp, bp] = [x, c, 0];
    else if (h < 180) [rp, gp, bp] = [0, c, x];
    else if (h < 240) [rp, gp, bp] = [0, x, c];
    else if (h < 300) [rp, gp, bp] = [x, 0, c];
    else [rp, gp, bp] = [c, 0, x];
    return {
      r: clamp(Math.round((rp + m) * 255), 0, 255),
      g: clamp(Math.round((gp + m) * 255), 0, 255),
      b: clamp(Math.round((bp + m) * 255), 0, 255),
      a: parseAlpha(hslMatch[4]),
    };
  }

  // oklch(L C H / a) — Tailwind CSS v4 & Chromium modern computed style output
  const oklchMatch = raw.match(
    /^oklch\(\s*([-\d.e+]+%?|none)\s+([-\d.e+]+%?|none)\s+([-\d.e+]+(?:deg|rad|turn|grad)?|none)(?:\s*\/\s*([\d.e+-]+%?|none))?\s*\)$/
  );
  if (oklchMatch) {
    const rawL = oklchMatch[1];
    const L = rawL === 'none' ? 0 : (rawL.endsWith('%') ? parseFloat(rawL) / 100 : parseFloat(rawL));
    const rawC = oklchMatch[2];
    const C = rawC === 'none' ? 0 : (rawC.endsWith('%') ? (parseFloat(rawC) / 100) * 0.4 : parseFloat(rawC));
    const Hdeg = parseAngleDeg(oklchMatch[3]);
    const Hrad = (Hdeg * Math.PI) / 180;
    if ([L, C, Hrad].some(Number.isNaN)) return null;
    return oklabToRgba(clamp(L, 0, 1), C * Math.cos(Hrad), C * Math.sin(Hrad), parseAlpha(oklchMatch[4]));
  }

  // oklab(L a b / a) — Chromium computed style for color-mix(in oklab, ...)
  const oklabMatch = raw.match(
    /^oklab\(\s*([-\d.e+]+%?|none)\s+([-\d.e+]+%?|none)\s+([-\d.e+]+%?|none)(?:\s*\/\s*([\d.e+-]+%?|none))?\s*\)$/
  );
  if (oklabMatch) {
    const parseL = (v) => (v === 'none' ? 0 : (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)));
    const parseAB = (v) => (v === 'none' ? 0 : (v.endsWith('%') ? (parseFloat(v) / 100) * 0.4 : parseFloat(v)));
    const L = parseL(oklabMatch[1]);
    const a = parseAB(oklabMatch[2]);
    const b = parseAB(oklabMatch[3]);
    if ([L, a, b].some(Number.isNaN)) return null;
    return oklabToRgba(clamp(L, 0, 1), a, b, parseAlpha(oklabMatch[4]));
  }

  // color(srgb r g b / a) or color(display-p3 r g b / a)
  const colorFnMatch = raw.match(
    /^color\(\s*(srgb|display-p3)\s+([-\d.e+]+|none)\s+([-\d.e+]+|none)\s+([-\d.e+]+|none)(?:\s*\/\s*([\d.e+-]+%?|none))?\s*\)$/
  );
  if (colorFnMatch) {
    const space = colorFnMatch[1];
    const c1 = colorFnMatch[2] === 'none' ? 0 : parseFloat(colorFnMatch[2]);
    const c2 = colorFnMatch[3] === 'none' ? 0 : parseFloat(colorFnMatch[3]);
    const c3 = colorFnMatch[4] === 'none' ? 0 : parseFloat(colorFnMatch[4]);
    const alpha = parseAlpha(colorFnMatch[5]);
    if ([c1, c2, c3].some(Number.isNaN)) return null;

    if (space === 'srgb') {
      return {
        r: clamp(Math.round(c1 * 255), 0, 255),
        g: clamp(Math.round(c2 * 255), 0, 255),
        b: clamp(Math.round(c3 * 255), 0, 255),
        a: alpha,
      };
    }

    // display-p3 -> linear P3 -> linear sRGB -> sRGB
    const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const pr = toLin(c1);
    const pg = toLin(c2);
    const pb = toLin(c3);
    const rLin = 1.2249401 * pr - 0.2249404 * pg;
    const gLin = -0.0420569 * pr + 1.0420571 * pg;
    const bLin = -0.0196376 * pr - 0.0786361 * pg + 1.0982735 * pb;
    return {
      r: linearToSrgbChannel(rLin),
      g: linearToSrgbChannel(gLin),
      b: linearToSrgbChannel(bLin),
      a: alpha,
    };
  }

  return null;
}

export function rgbaToHex(rgba) {
  if (!rgba) return '';
  const toHex = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  const base = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
  if (rgba.a < 0.999) {
    return `${base}${toHex(rgba.a * 255)}`;
  }
  return base;
}

/**
 * Converts sRGB { r, g, b, a } to CSS oklch(L% C H) string using Bjorn Ottosson's exact matrix.
 */
export function rgbaToOklch(rgba) {
  if (!rgba) return '';
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(rgba.r);
  const g = toLinear(rgba.g);
  const b = toLinear(rgba.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bk = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  const C = Math.sqrt(a * a + bk * bk);
  let H = (Math.atan2(bk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  const lPct = (clamp(L, 0, 1) * 100).toFixed(1);
  const cVal = C < 0.0005 ? '0' : C.toFixed(4);
  const hVal = C < 0.0005 ? '0' : H.toFixed(1);

  if (rgba.a < 0.999) {
    return `oklch(${lPct}% ${cVal} ${hVal} / ${Number(rgba.a.toFixed(2))})`;
  }
  return `oklch(${lPct}% ${cVal} ${hVal})`;
}

/**
 * Alpha-composites foreground over an opaque background color.
 */
export function compositeOver(fg, bg = { r: 255, g: 255, b: 255, a: 1 }) {
  const a = clamp(fg.a ?? 1, 0, 1);
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

/**
 * WCAG 2.1 relative luminance.
 */
export function relativeLuminance(rgba) {
  const linear = [rgba.r, rgba.g, rgba.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * Computes WCAG 2.1 contrast ratio (1.00 to 21.00) and compliance level.
 */
export function getContrastReport(fgInput, bgInput, { fontSizePx = 16, fontWeight = 400 } = {}) {
  const fgRaw = typeof fgInput === 'string' ? parseColor(fgInput) : fgInput;
  const bgRaw = typeof bgInput === 'string' ? parseColor(bgInput) : bgInput;
  if (!fgRaw || !bgRaw) {
    return { ratio: null, level: 'N/A', isLargeText: false, passAA: false, passAAA: false };
  }
  const bg = bgRaw.a < 1 ? compositeOver(bgRaw, { r: 255, g: 255, b: 255, a: 1 }) : bgRaw;
  const fg = fgRaw.a < 1 ? compositeOver(fgRaw, bg) : fgRaw;

  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));

  const isBold = Number(fontWeight) >= 700;
  const isLargeText = fontSizePx >= 24 || (isBold && fontSizePx >= 18.66);
  const aaThreshold = isLargeText ? 3.0 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7.0;

  const passAA = ratio >= aaThreshold;
  const passAAA = ratio >= aaaThreshold;
  const level = passAAA ? 'AAA' : passAA ? 'AA' : 'Fail';

  return { ratio, level, isLargeText, passAA, passAAA };
}

/**
 * Classifies an RGB color into a human-friendly semantic role bucket for token naming.
 */
export function classifyColorName(rgba) {
  const { r, g, b } = rgba;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  // Treat low-chroma grays/slates (including cool dark slates like #0f172a or #94a3b8) as neutral/ink/surface
  if (d < 0.16 || s < 0.12) {
    if (l > 0.92) return 'surface';
    if (l < 0.18) return 'ink';
    return 'neutral';
  }

  let h = 0;
  if (d !== 0) {
    if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g / 255) h = ((b / 255 - r / 255) / d + 2) * 60;
    else h = ((r / 255 - g / 255) / d + 4) * 60;
  }

  if (h < 18 || h >= 342) return 'red';
  if (h < 45) return 'orange';
  if (h < 68) return 'amber';
  if (h < 155) return 'green';
  if (h < 195) return 'teal';
  if (h < 250) return 'blue';
  if (h < 290) return 'indigo';
  return 'pink';
}

/**
 * Deduplicates and ranks extracted raw color occurrences into clean semantic tokens.
 * @param {Array<{ value: string, role?: string, count?: number }>} entries
 */
export function buildColorPalette(entries = [], maxColors = 24) {
  const byHex = new Map();

  for (const item of entries) {
    const parsed = parseColor(item.value);
    if (!parsed || parsed.a === 0) continue;
    const hex = rgbaToHex(parsed);
    const existing = byHex.get(hex);
    const weight = item.count ?? 1;
    if (existing) {
      existing.count += weight;
      if (item.role && !existing.roles.includes(item.role)) {
        existing.roles.push(item.role);
      }
    } else {
      byHex.set(hex, {
        hex,
        rgba: parsed,
        oklch: rgbaToOklch(parsed),
        count: weight,
        roles: item.role ? [item.role] : [],
        bucket: classifyColorName(parsed),
      });
    }
  }

  const sorted = [...byHex.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors);

  const bucketCounts = new Map();
  return sorted.map((entry) => {
    const n = (bucketCounts.get(entry.bucket) ?? 0) + 1;
    bucketCounts.set(entry.bucket, n);
    const tokenName = n === 1 ? entry.bucket : `${entry.bucket}-${n}`;
    return {
      ...entry,
      tokenName,
    };
  });
}
