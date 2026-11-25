/**
 * Lightweight CSS declaration block parser for the public CSS-to-Tailwind v4 web tool.
 * Extracts property: value pairs from raw CSS rules or inline style blocks without regex pitfalls.
 */
import { cleanComputedStyles } from './style-diff.js';
import { cssToTailwindClasses } from './tailwind-compiler.js';

export function parseCssDeclarations(rawCss) {
  if (!rawCss || typeof rawCss !== 'string') return {};
  // Strip /* ... */ comments
  const noComments = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
  // If wrapped in selector { ... }, extract the inner block (or merge multiple blocks)
  const blockBody = noComments.includes('{')
    ? Array.from(noComments.matchAll(/\{([^{}]*)\}/g)).map((m) => m[1]).join(';')
    : noComments;

  const decls = {};
  for (const part of blockBody.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).replace(/!important\s*$/i, '').trim();
    if (!prop || !val || prop.startsWith('--')) continue;
    decls[prop] = val;
  }
  return expandShorthandsForCompiler(decls);
}

function expandFourSide(val) {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

function expandShorthandsForCompiler(decls) {
  const out = { ...decls };
  if (out.padding && !out['padding-top']) {
    const [t, r, b, l] = expandFourSide(out.padding);
    out['padding-top'] = t;
    out['padding-right'] = r;
    out['padding-bottom'] = b;
    out['padding-left'] = l;
  }
  if (out.margin && !out['margin-top']) {
    const [t, r, b, l] = expandFourSide(out.margin);
    out['margin-top'] = t;
    out['margin-right'] = r;
    out['margin-bottom'] = b;
    out['margin-left'] = l;
  }
  if (out['border-radius'] && !out['border-top-left-radius']) {
    const [tl, tr, br, bl] = expandFourSide(out['border-radius']);
    out['border-top-left-radius'] = tl;
    out['border-top-right-radius'] = tr;
    out['border-bottom-right-radius'] = br;
    out['border-bottom-left-radius'] = bl;
  }
  if (out.background && !out['background-color'] && !out.background.includes('gradient') && !out.background.includes('url(')) {
    out['background-color'] = out.background;
  } else if (out.background && !out['background-image'] && out.background.includes('gradient')) {
    out['background-image'] = out.background;
  }
  if (out.border && !out['border-top-width']) {
    const parts = out.border.trim().split(/\s+/);
    if (parts.length >= 3) {
      for (const side of ['top', 'right', 'bottom', 'left']) {
        out[`border-${side}-width`] = parts[0];
        out[`border-${side}-style`] = parts[1];
        out[`border-${side}-color`] = parts.slice(2).join(' ');
      }
    }
  }
  return out;
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
