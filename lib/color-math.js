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

/**
 * Parses rgb(), rgba(), #hex, or basic named CSS colors into { r, g, b, a }.
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
    const r = parseChannel(rgbMatch[1]);
    const g = parseChannel(rgbMatch[2]);
    const b = parseChannel(rgbMatch[3]);
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%')
        ? clamp(parseFloat(rgbMatch[4]) / 100, 0, 1)
        : clamp(parseFloat(rgbMatch[4]), 0, 1);
    }
    return { r, g, b, a: Number(a.toFixed(3)) };
  }

  // color(srgb r g b / a) — modern Chromium computed style output
  const srgbMatch = raw.match(
    /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+%?))?\)$/
  );
  if (srgbMatch) {
    const r = clamp(Math.round(parseFloat(srgbMatch[1]) * 255), 0, 255);
    const g = clamp(Math.round(parseFloat(srgbMatch[2]) * 255), 0, 255);
    const b = clamp(Math.round(parseFloat(srgbMatch[3]) * 255), 0, 255);
    let a = 1;
    if (srgbMatch[4] !== undefined) {
      a = srgbMatch[4].endsWith('%')
        ? clamp(parseFloat(srgbMatch[4]) / 100, 0, 1)
        : clamp(parseFloat(srgbMatch[4]), 0, 1);
    }
    return { r, g, b, a: Number(a.toFixed(3)) };
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
