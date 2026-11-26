/**
 * Lightweight CSS declaration block parser for the public CSS-to-Tailwind v4 web tool.
 * Expands CSS shorthands strictly in declaration order (respecting CSS cascade & !important)
 * so later longhands override earlier shorthands and later shorthands override earlier longhands.
 */
import { cleanComputedStyles } from './style-diff.js';
import { cssToTailwindClasses } from './tailwind-compiler.js';

const SIDES = ['top', 'right', 'bottom', 'left'];

function expandFourSide(val) {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

function expandTwoAxis(val) {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[0], parts[1]];
}

/**
 * Split declaration block on top-level semicolons (ignoring semicolons inside quotes/parens).
 */
function splitDeclarations(blockBody) {
  const out = [];
  let current = '';
  let parenDepth = 0;
  let quote = null;

  for (let i = 0; i < blockBody.length; i += 1) {
    const ch = blockBody[i];
    if (quote) {
      current += ch;
      if (ch === quote && blockBody[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') {
      parenDepth += 1;
      current += ch;
      continue;
    }
    if (ch === ')' && parenDepth > 0) {
      parenDepth -= 1;
      current += ch;
      continue;
    }
    if (ch === ';' && parenDepth === 0) {
      if (current.trim()) out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current);
  return out;
}

function parseBorderShorthand(val) {
  const trimmed = val.trim();
  if (/^(?:none|0(?:px)?)$/i.test(trimmed)) {
    return { width: '0px', style: 'none', color: 'transparent' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 3) {
    return { width: parts[0], style: parts[1], color: parts.slice(2).join(' ') };
  }
  if (parts.length === 2) {
    return { width: parts[0], style: parts[1], color: 'currentColor' };
  }
  return null;
}

export function parseCssDeclarations(rawCss) {
  if (!rawCss || typeof rawCss !== 'string') return {};
  // Strip /* ... */ comments
  const noComments = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
  // If wrapped in selector { ... }, extract the inner block(s) in order
  const blockBody = noComments.includes('{')
    ? Array.from(noComments.matchAll(/\{([^{}]*)\}/g)).map((m) => m[1]).join(';')
    : noComments;

  const decls = {};
  const importantProps = new Set();

  function setLonghand(prop, value, isImportant) {
    if (!isImportant && importantProps.has(prop)) return;
    decls[prop] = value;
    if (isImportant) importantProps.add(prop);
  }

  for (const part of splitDeclarations(blockBody)) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const rawVal = part.slice(idx + 1).trim();
    const isImportant = /!\s*important\s*$/i.test(rawVal);
    const val = rawVal.replace(/!\s*important\s*$/i, '').trim();
    if (!prop || !val || prop.startsWith('--')) continue;

    // Expand shorthands strictly in declaration order
    if (prop === 'padding' || prop === 'margin') {
      const [t, r, b, l] = expandFourSide(val);
      setLonghand(`${prop}-top`, t, isImportant);
      setLonghand(`${prop}-right`, r, isImportant);
      setLonghand(`${prop}-bottom`, b, isImportant);
      setLonghand(`${prop}-left`, l, isImportant);
      continue;
    }

    if (prop === 'padding-inline' || prop === 'margin-inline') {
      const base = prop.startsWith('padding') ? 'padding' : 'margin';
      const [start, end] = expandTwoAxis(val);
      setLonghand(`${base}-left`, start, isImportant);
      setLonghand(`${base}-right`, end, isImportant);
      continue;
    }

    if (prop === 'padding-block' || prop === 'margin-block') {
      const base = prop.startsWith('padding') ? 'padding' : 'margin';
      const [start, end] = expandTwoAxis(val);
      setLonghand(`${base}-top`, start, isImportant);
      setLonghand(`${base}-bottom`, end, isImportant);
      continue;
    }

    if (prop === 'border-radius') {
      const horizontal = val.split('/')[0].trim();
      const [tl, tr, br, bl] = expandFourSide(horizontal);
      setLonghand('border-top-left-radius', tl, isImportant);
      setLonghand('border-top-right-radius', tr, isImportant);
      setLonghand('border-bottom-right-radius', br, isImportant);
      setLonghand('border-bottom-left-radius', bl, isImportant);
      continue;
    }

    if (prop === 'border') {
      const parsedBorder = parseBorderShorthand(val);
      if (parsedBorder) {
        for (const side of SIDES) {
          setLonghand(`border-${side}-width`, parsedBorder.width, isImportant);
          setLonghand(`border-${side}-style`, parsedBorder.style, isImportant);
          setLonghand(`border-${side}-color`, parsedBorder.color, isImportant);
        }
      }
      continue;
    }

    if (prop === 'border-top' || prop === 'border-right' || prop === 'border-bottom' || prop === 'border-left') {
      const parsedBorder = parseBorderShorthand(val);
      if (parsedBorder) {
        setLonghand(`${prop}-width`, parsedBorder.width, isImportant);
        setLonghand(`${prop}-style`, parsedBorder.style, isImportant);
        setLonghand(`${prop}-color`, parsedBorder.color, isImportant);
      }
      continue;
    }

    if (prop === 'border-width' || prop === 'border-style' || prop === 'border-color') {
      const suffix = prop.slice('border-'.length);
      const vals = expandFourSide(val);
      SIDES.forEach((side, i) => setLonghand(`border-${side}-${suffix}`, vals[i], isImportant));
      continue;
    }

    if (prop === 'gap') {
      const [rowGap, colGap] = expandTwoAxis(val);
      setLonghand('row-gap', rowGap, isImportant);
      setLonghand('column-gap', colGap, isImportant);
      continue;
    }

    if (prop === 'background') {
      // Per CSS spec, `background` shorthand resets both background-color and background-image
      if (val.includes('gradient') || val.includes('url(')) {
        setLonghand('background-color', 'transparent', isImportant);
        setLonghand('background-image', val, isImportant);
      } else {
        setLonghand('background-image', 'none', isImportant);
        setLonghand('background-color', val, isImportant);
      }
      continue;
    }

    setLonghand(prop, val, isImportant);
  }

  return decls;
}

export function convertRawCssToTailwind(rawCss, { tag = 'div', jsx = true } = {}) {
  const parsed = parseCssDeclarations(rawCss);
  const cleaned = cleanComputedStyles(parsed, {});
  const classes = cssToTailwindClasses(cleaned);
  const classAttr = jsx ? 'className' : 'class';
  const snippet = classes.length
    ? `<${tag} ${classAttr}="${classes.join(' ')}">\n  ...\n</${tag}>`
    : `<${tag}>\n  ...\n</${tag}>`;

  return {
    cleaned,
    classes,
    classString: classes.join(' '),
    snippet,
  };
}
