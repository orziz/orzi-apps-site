import { parseColor, rgbaToHex } from './color-math.js';

/**
 * Default values that carry zero author intent when matched against clean styles.
 */
const TRIVIAL_DEFAULTS = Object.freeze({
  position: new Set(['static']),
  overflow: new Set(['visible']),
  'overflow-x': new Set(['visible']),
  'overflow-y': new Set(['visible']),
  opacity: new Set(['1']),
  'z-index': new Set(['auto']),
  'box-shadow': new Set(['none']),
  'text-shadow': new Set(['none']),
  'text-decoration-line': new Set(['none']),
  'text-transform': new Set(['none']),
  'font-style': new Set(['normal']),
  'letter-spacing': new Set(['normal', '0px']),
  'white-space': new Set(['normal']),
  cursor: new Set(['auto']),
  'pointer-events': new Set(['auto']),
  'background-image': new Set(['none']),
  transform: new Set(['none']),
  'flex-direction': new Set(['row']),
  'flex-wrap': new Set(['nowrap']),
  'align-items': new Set(['normal', 'stretch']),
  'justify-content': new Set(['normal', 'flex-start']),
  'grid-auto-flow': new Set(['row']),
  gap: new Set(['normal', '0px']),
  'row-gap': new Set(['normal', '0px']),
  'column-gap': new Set(['normal', '0px']),
  'border-style': new Set(['none']),
  'border-top-style': new Set(['none']),
  'border-right-style': new Set(['none']),
  'border-bottom-style': new Set(['none']),
  'border-left-style': new Set(['none']),
});

const FLEX_GRID_ONLY = new Set([
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-content',
  'gap',
  'row-gap',
  'column-gap',
  'grid-template-columns',
  'grid-template-rows',
]);

function isZeroPx(v) {
  return !v || v === '0px' || v === '0' || v === '0px 0px' || v === '0px 0px 0px 0px';
}

function normalizeColorValue(val) {
  const parsed = parseColor(val);
  if (!parsed) return val;
  if (parsed.a === 0) return 'transparent';
  return rgbaToHex(parsed);
}

/**
 * Collapses four box sides (top, right, bottom, left) into minimal CSS shorthand.
 */
export function collapseFourSides(top, right, bottom, left) {
  const t = top || '0px';
  const r = right || '0px';
  const b = bottom || '0px';
  const l = left || '0px';
  if (t === r && r === b && b === l) {
    return isZeroPx(t) ? null : t;
  }
  if (t === b && r === l) {
    return `${t} ${r}`;
  }
  if (r === l) {
    return `${t} ${r} ${b}`;
  }
  return `${t} ${r} ${b} ${l}`;
}

/**
 * Given raw computed styles + optional baseline styles (from a fresh same-tag element),
 * returns a clean, minimal, zero-bloat CSS declarations object.
 */
export function cleanComputedStyles(computed = {}, baseline = {}, options = {}) {
  const { includeSize = false, parentInherited = {} } = options;
  const out = {};

  const display = computed.display || 'block';
  const isFlex = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';

  if (display && display !== baseline.display) {
    out.display = display;
  }

  // Collapse padding & margin
  const padding = collapseFourSides(
    computed['padding-top'],
    computed['padding-right'],
    computed['padding-bottom'],
    computed['padding-left']
  );
  if (padding && padding !== collapseFourSides(
    baseline['padding-top'],
    baseline['padding-right'],
    baseline['padding-bottom'],
    baseline['padding-left']
  )) {
    out.padding = padding;
  }

  const margin = collapseFourSides(
    computed['margin-top'],
    computed['margin-right'],
    computed['margin-bottom'],
    computed['margin-left']
  );
  if (margin && margin !== collapseFourSides(
    baseline['margin-top'],
    baseline['margin-right'],
    baseline['margin-bottom'],
    baseline['margin-left']
  )) {
    out.margin = margin;
  }

  // Collapse border-radius
  const radius = collapseFourSides(
    computed['border-top-left-radius'],
    computed['border-top-right-radius'],
    computed['border-bottom-right-radius'],
    computed['border-bottom-left-radius']
  );
  if (radius && !isZeroPx(radius)) {
    out['border-radius'] = radius;
  }

  // Collapse borders cleanly (only if width > 0 and style !== none)
  const sides = ['top', 'right', 'bottom', 'left'];
  const activeBorders = sides.map((side) => {
    const w = computed[`border-${side}-width`];
    const s = computed[`border-${side}-style`];
    const c = normalizeColorValue(computed[`border-${side}-color`]);
    if (!w || isZeroPx(w) || !s || s === 'none' || c === 'transparent') return null;
    return `${w} ${s} ${c}`;
  });
  if (activeBorders.every((b) => b && b === activeBorders[0])) {
    out.border = activeBorders[0];
  } else {
    sides.forEach((side, i) => {
      if (activeBorders[i]) out[`border-${side}`] = activeBorders[i];
    });
  }

  // Background color / image
  const bg = normalizeColorValue(computed['background-color']);
  if (bg && bg !== 'transparent' && bg !== normalizeColorValue(baseline['background-color'])) {
    out['background-color'] = bg;
  }
  if (computed['background-image'] && computed['background-image'] !== 'none') {
    out['background-image'] = computed['background-image'];
  }

  // Typography (strip inherited duplicates if parent already sets identical value)
  const textColor = normalizeColorValue(computed.color);
  const parentColor = normalizeColorValue(parentInherited.color);
  if (textColor && textColor !== 'transparent' && textColor !== parentColor) {
    out.color = textColor;
  }

  const fontProps = [
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-align',
    'text-transform',
    'text-decoration-line',
    'font-style',
    'white-space',
  ];
  for (const prop of fontProps) {
    const val = computed[prop];
    if (!val) continue;
    if (TRIVIAL_DEFAULTS[prop]?.has(val)) continue;
    if (prop === 'font-weight' && (val === '400' || val === 'normal') && !parentInherited[prop]) continue;
    if (prop === 'text-align' && (val === 'start' || val === 'left') && !parentInherited[prop]) continue;
    if (parentInherited[prop] && parentInherited[prop] === val) continue;
    if (baseline[prop] && baseline[prop] === val && !parentInherited[prop]) continue;
    out[prop] = val;
  }

  // Layout & visual properties
  const extraProps = [
    'position',
    'z-index',
    'flex-direction',
    'flex-wrap',
    'justify-content',
    'align-items',
    'gap',
    'row-gap',
    'column-gap',
    'grid-template-columns',
    'grid-template-rows',
    'box-shadow',
    'opacity',
    'overflow',
    'overflow-x',
    'overflow-y',
    'cursor',
    'max-width',
    'min-height',
  ];

  for (const prop of extraProps) {
    const val = computed[prop];
    if (!val || val === 'none' || val === 'auto') continue;
    if (FLEX_GRID_ONLY.has(prop) && !isFlex && !isGrid) continue;
    if ((prop === 'grid-template-columns' || prop === 'grid-template-rows') && !isGrid) continue;
    if (TRIVIAL_DEFAULTS[prop]?.has(val)) continue;
    if (prop === 'min-height' && isZeroPx(val)) continue;
    if (baseline[prop] && baseline[prop] === val) continue;
    out[prop] = val;
  }

  // Deduplicate row-gap / column-gap when gap already covers both
  if (out.gap) {
    delete out['row-gap'];
    delete out['column-gap'];
  } else if (out['row-gap'] && out['row-gap'] === out['column-gap']) {
    out.gap = out['row-gap'];
    delete out['row-gap'];
    delete out['column-gap'];
  }

  if (includeSize) {
    if (computed.width && !isZeroPx(computed.width)) out.width = computed.width;
    if (computed.height && !isZeroPx(computed.height)) out.height = computed.height;
  }

  return out;
}

/**
 * Formats a clean declarations map into readable CSS rules.
 */
export function formatCssBlock(selector, declarations) {
  const entries = Object.entries(declarations);
  if (entries.length === 0) return `/* No non-default visual styles detected for ${selector} */`;
  const lines = entries.map(([prop, val]) => `  ${prop}: ${val};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/**
 * Generates clean semantic CSS + minimal HTML from a serialized component tree.
 */
export function generateCleanHtmlAndCss(tree) {
  const cssRules = [];
  let classIndex = 1;

  function buildNode(node, depth = 0, parentStyles = {}) {
    const indent = '  '.repeat(depth);
    if (node.type === 'text') {
      return `${indent}${escapeHtml(node.text)}`;
    }
    if (node.tag === 'svg' && node.outerSvg) {
      return `${indent}${node.outerSvg}`;
    }

    const styles = cleanComputedStyles(node.styles, node.baseline || {}, {
      parentInherited: parentStyles,
    });
    const hasStyles = Object.keys(styles).length > 0;
    const className = hasStyles ? `${node.semanticName || node.tag}-${classIndex++}` : null;

    if (className) {
      cssRules.push(formatCssBlock(`.${className}`, styles));
    }

    const attrs = [];
    if (className) attrs.push(`class="${className}"`);
    if (node.attrs) {
      for (const [k, v] of Object.entries(node.attrs)) {
        if (v !== undefined && v !== null && v !== '') {
          attrs.push(`${k}="${escapeAttr(String(v))}"`);
        }
      }
    }

    const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
    const voidTags = new Set(['img', 'input', 'br', 'hr', 'source', 'meta', 'link']);
    if (voidTags.has(node.tag)) {
      return `${indent}<${node.tag}${attrStr}>`;
    }

    const children = node.children || [];
    if (children.length === 0) {
      return `${indent}<${node.tag}${attrStr}></${node.tag}>`;
    }
    if (children.length === 1 && children[0].type === 'text' && children[0].text.length < 70) {
      return `${indent}<${node.tag}${attrStr}>${escapeHtml(children[0].text)}</${node.tag}>`;
    }

    const nextInherited = {
      color: node.styles?.color || parentStyles.color,
      'font-family': node.styles?.['font-family'] || parentStyles['font-family'],
      'font-size': node.styles?.['font-size'] || parentStyles['font-size'],
      'font-weight': node.styles?.['font-weight'] || parentStyles['font-weight'],
      'line-height': node.styles?.['line-height'] || parentStyles['line-height'],
    };

    const inner = children.map((c) => buildNode(c, depth + 1, nextInherited)).join('\n');
    return `${indent}<${node.tag}${attrStr}>\n${inner}\n${indent}</${node.tag}>`;
  }

  const html = buildNode(tree, 0, {});
  const css = cssRules.join('\n\n');
  return { html, css };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
