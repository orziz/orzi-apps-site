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
  ['#f8fafc', 'slate-50'],
  ['#f1f5f9', 'slate-100'],
  ['#e2e8f0', 'slate-200'],
  ['#cbd5e1', 'slate-300'],
  ['#94a3b8', 'slate-400'],
  ['#64748b', 'slate-500'],
  ['#475569', 'slate-600'],
  ['#334155', 'slate-700'],
  ['#1e293b', 'slate-800'],
  ['#0f172a', 'slate-900'],
  ['#020617', 'slate-950'],
  ['#f9fafb', 'gray-50'],
  ['#f3f4f6', 'gray-100'],
  ['#e5e7eb', 'gray-200'],
  ['#d1d5db', 'gray-300'],
  ['#9ca3af', 'gray-400'],
  ['#6b7280', 'gray-500'],
  ['#4b5563', 'gray-600'],
  ['#374151', 'gray-700'],
  ['#1f2937', 'gray-800'],
  ['#111827', 'gray-900'],
  ['#eff6ff', 'blue-50'],
  ['#3b82f6', 'blue-500'],
  ['#2563eb', 'blue-600'],
  ['#1d4ed8', 'blue-700'],
  ['#6366f1', 'indigo-500'],
  ['#4f46e5', 'indigo-600'],
  ['#10b981', 'emerald-500'],
  ['#059669', 'emerald-600'],
  ['#ef4444', 'red-500'],
  ['#dc2626', 'red-600'],
]);

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
  const hex = rgbaToHex(parsed);
  if (EXACT_COLORS.has(hex)) {
    return `${prefix}-${EXACT_COLORS.get(hex)}`;
  }
  return `${prefix}-[${hex}]`;
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
  if (pt && pt !== '0') list.push(`${prefix}t-${pt}`);
  if (pr && pr !== '0') list.push(`${prefix}r-${pr}`);
  if (pb && pb !== '0') list.push(`${prefix}b-${pb}`);
  if (pl && pl !== '0') list.push(`${prefix}l-${pl}`);
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
    if (cols.length >= 2 && cols.length <= 12 && cols.every((c) => c === cols[0])) {
      classes.push(`grid-cols-${cols.length}`);
    } else if (cols.length > 0 && declarations['grid-template-columns'] !== 'none') {
      classes.push(`grid-cols-[${declarations['grid-template-columns'].trim().replace(/\s+/g, '_')}]`);
    }
  }

  // Spacing
  classes.push(...emitFourSideUtility('p', declarations.padding));
  classes.push(...emitFourSideUtility('m', declarations.margin));

  // Sizing
  if (declarations['max-width'] && declarations['max-width'] !== 'none') {
    classes.push(`max-w-[${declarations['max-width'].replace(/\s+/g, '_')}]`);
  }
  if (declarations['min-height']) {
    const px = parsePx(declarations['min-height']);
    if (px !== null && px > 0) classes.push(`min-h-${mapSpacingToken(px)}`);
  }

  // Background & Text color
  if (declarations['background-color']) {
    const c = mapColorToken(declarations['background-color'], 'bg');
    if (c) classes.push(c);
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

  // Shadows, opacity, overflow, cursor
  if (declarations['box-shadow']) {
    const s = declarations['box-shadow'];
    if (s.includes('0px 1px 2px') || s.includes('0 1px 2px')) classes.push('shadow-xs');
    else if (s.includes('0px 1px 3px') || s.includes('0 1px 3px')) classes.push('shadow-sm');
    else if (s.includes('0px 4px 6px') || s.includes('0 4px 6px')) classes.push('shadow-md');
    else if (s.includes('0px 10px 15px') || s.includes('0 10px 15px')) classes.push('shadow-lg');
    else classes.push(`shadow-[${s.replace(/\s+/g, '_')}]`);
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
