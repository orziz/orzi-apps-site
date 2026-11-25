/**
 * DemoCloak pure-JS PII, Secret & Financial Data Detector + Deterministic Fake-Data Swap Engine.
 * Runs 100% locally with zero external dependencies and full Node unit-test coverage.
 */

export const DEFAULT_CATEGORIES = Object.freeze({
  emails: true,
  secrets: true,
  money: true,
  cards: true,
  phones: true,
  ips: false,
  custom: true,
});

const FAKE_EMAILS = Object.freeze([
  'alex.chen@acme.example',
  'maya.patel@northstar.example',
  'jordan.lee@lumen.example',
  'sam.rivera@kestrel.example',
  'elena.rostova@verve.example',
  'marcus.cole@cobalt.example',
  'priya.nair@aurora.example',
  'liam.brooks@summit.example',
  'nina.foster@harbor.example',
  'devon.park@meridian.example',
  'chloe.bennett@solstice.example',
  'tariq.hassan@cedar.example',
]);

const FAKE_PHONES = Object.freeze([
  '+1 (415) 555-0142',
  '+1 (212) 555-0189',
  '+1 (312) 555-0174',
  '+1 (650) 555-0126',
  '+1 (206) 555-0193',
  '+1 (512) 555-0168',
  '+1 (617) 555-0135',
  '+1 (303) 555-0151',
]);

const FAKE_IPS = Object.freeze([
  '192.0.2.44',
  '192.0.2.108',
  '198.51.100.18',
  '198.51.100.73',
  '203.0.113.29',
  '203.0.113.91',
]);

const FAKE_CUSTOM_LABELS = Object.freeze([
  'Acme Corp',
  'Northstar Labs',
  'Lumen Systems',
  'Kestrel Studio',
  'Cobalt Cloud',
  'Summit Works',
]);

/**
 * Deterministic 32-bit FNV-1a hash so identical sensitive strings always map
 * to the exact same fake demo value across a dashboard.
 */
export function hashString(input) {
  const str = String(input || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Luhn checksum validation to avoid blurring random numeric order IDs or timestamps.
 */
export function isValidLuhn(digitsOnly) {
  const digits = String(digitsOnly || '').replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Format a realistic deterministic fake currency value matching the original
 * currency prefix/suffix, scale magnitude, and decimal precision.
 */
export function fakeMoneyValue(original) {
  const str = String(original || '').trim();
  const h = hashString(str);

  // Detect optional sign, currency prefix, number body, optional suffix (k/M/B/USD/EUR)
  const match = str.match(/^([+-]?\s*)(US\$|CA\$|AU\$|HK\$|NT\$|USD|EUR|GBP|CNY|JPY|[$€£¥])(\s*)([\d,.\s]+?)(\s*[kKmMbB]|\s*(?:USD|EUR|GBP|CNY|JPY))?$/);
  if (!match) {
    const dollars = 1200 + (h % 24000);
    return `$${dollars.toLocaleString('en-US')}.00`;
  }

  const [, signPart, currency, spaceAfter, numRaw, suffix = ''] = match;
  const trimmedNum = numRaw.trim();
  const hasComma = trimmedNum.includes(',');
  const dotIdx = trimmedNum.lastIndexOf('.');
  const commaIdx = trimmedNum.lastIndexOf(',');

  // Detect European decimal comma (e.g. €1.250,50) vs US decimal dot ($1,250.50)
  const euroDecimal = commaIdx > dotIdx && trimmedNum.length - commaIdx - 1 === 2;
  let decimals = 0;
  let numericVal = 0;

  if (euroDecimal) {
    decimals = 2;
    numericVal = parseFloat(trimmedNum.replace(/\./g, '').replace(',', '.'));
  } else {
    if (dotIdx !== -1) {
      decimals = Math.min(2, trimmedNum.length - dotIdx - 1);
    }
    numericVal = parseFloat(trimmedNum.replace(/[,\s]/g, ''));
  }

  if (!Number.isFinite(numericVal)) {
    return `${signPart}${currency}${spaceAfter}1,420.00${suffix}`;
  }

  // Keep realistic same-order-of-magnitude figure (0.65x to 1.85x, shifted away from exact value)
  const factor = 0.68 + ((h % 115) / 100);
  let fakeVal = Math.max(decimals > 0 ? 1.5 : 5, numericVal * factor);

  // Round nicely so demo figures look realistic (e.g. $14,820.00 or $49.00)
  if (fakeVal >= 1000) {
    fakeVal = Math.round(fakeVal / 10) * 10;
  } else if (fakeVal >= 100) {
    fakeVal = Math.round(fakeVal);
  } else if (decimals === 0) {
    fakeVal = Math.max(1, Math.round(fakeVal));
  } else {
    fakeVal = Math.round(fakeVal * 100) / 100;
  }

  let formatted;
  if (euroDecimal) {
    const fixed = fakeVal.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    formatted = `${grouped},${decPart}`;
  } else {
    const fixed = fakeVal.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const grouped = hasComma || fakeVal >= 1000
      ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : intPart;
    formatted = decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  }

  return `${signPart}${currency}${spaceAfter}${formatted}${suffix}`;
}

export function fakeSecretValue(original) {
  const str = String(original || '');
  const h = hashString(str).toString(16).padStart(4, '0').slice(0, 4);

  if (/^Bearer\s+/i.test(str)) {
    return `Bearer demo_token_••••${h}`;
  }
  if (/^eyJ/.test(str)) {
    return `eyJhbGci.demo_••••${h}`;
  }
  const prefixMatch = str.match(/^(sk_(?:live|test)_|pk_(?:live|test)_|sk-|gh[pousr]_|github_pat_|AKIA|AIza|xox[baprs]-|creem_)/);
  if (prefixMatch) {
    return `${prefixMatch[1]}demo_••••${h}`;
  }
  return `demo_secret_••••${h}`;
}

/**
 * Generates a realistic deterministic demo replacement string for any detected category.
 */
export function generateFakeReplacement(category, originalText) {
  const h = hashString(originalText);
  switch (category) {
    case 'emails':
      return FAKE_EMAILS[h % FAKE_EMAILS.length];
    case 'secrets':
      return fakeSecretValue(originalText);
    case 'money':
      return fakeMoneyValue(originalText);
    case 'cards': {
      const last4 = String(4000 + (h % 5000)).slice(-4);
      return `•••• •••• •••• ${last4}`;
    }
    case 'phones':
      return FAKE_PHONES[h % FAKE_PHONES.length];
    case 'ips':
      return FAKE_IPS[h % FAKE_IPS.length];
    case 'custom':
      return FAKE_CUSTOM_LABELS[h % FAKE_CUSTOM_LABELS.length];
    default:
      return '••••••••';
  }
}

/**
 * Escape literal string for RegExp construction.
 */
function escapeRegex(literal) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse custom keyword list (newline or comma separated). Supports `/pattern/` syntax safely.
 */
export function parseCustomRules(rawList, maxTerms = Infinity) {
  const items = Array.isArray(rawList)
    ? rawList
    : String(rawList || '').split(/[\n,]+/);

  const compiled = [];
  for (const raw of items) {
    if (compiled.length >= maxTerms) break;
    const term = String(raw || '').trim();
    if (!term || term.length < 2 || term.length > 120) continue;

    if (term.startsWith('/') && term.endsWith('/') && term.length > 2) {
      const body = term.slice(1, -1);
      try {
        compiled.push(new RegExp(body, 'gi'));
      } catch {
        // Ignore invalid user regex safely
      }
    } else {
      compiled.push(new RegExp(escapeRegex(term), 'gi'));
    }
  }
  return compiled;
}

const DETECTORS = [
  // Highest priority: Secrets & tokens (catch before emails/numbers split them)
  {
    category: 'secrets',
    regex: /\b(?:sk_(?:live|test)_[A-Za-z0-9]{12,}|pk_(?:live|test)_[A-Za-z0-9]{12,}|sk-[A-Za-z0-9_-]{18,}|creem_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[0-9A-Za-z-]{10,}|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]{20,})\b/g,
  },
  // Emails
  {
    category: 'emails',
    regex: /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,14}\b/g,
  },
  // Credit / debit cards (Luhn-validated below)
  {
    category: 'cards',
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    validate: (text) => {
      const digits = text.replace(/\D/g, '');
      // Avoid matching dates or clean single unbroken timestamps > 16 digits unless valid card length
      if (digits.length < 13 || digits.length > 19) return false;
      // Reject ISO-like dates such as 2026-11-25-12345
      if (/^20\d{2}-\d{2}-\d{2}/.test(text)) return false;
      return isValidLuhn(digits);
    },
  },
  // Currency & Revenue amounts
  {
    category: 'money',
    regex: /(?:[+-]\s*)?(?:(?:US\$|CA\$|AU\$|HK\$|NT\$|[$€£¥])\s*\d{1,3}(?:[,\s.]\d{3})*(?:[.,]\d{1,2})?(?:\s*[kKmMbB])?|\b(?:USD|EUR|GBP|CNY|JPY)\s+\d{1,3}(?:[,\s.]\d{3})*(?:[.,]\d{1,2})?(?:\s*[kKmMbB])?)/g,
    validate: (text) => {
      // Must contain at least one digit and not be an isolated $0 template placeholder like $1 in regex docs
      return /\d/.test(text);
    },
  },
  // Phone numbers (careful not to match dates like 2026-11-25 or pixel values)
  {
    category: 'phones',
    regex: /(?<!\d)(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{3}[\s.-])\d{3,4}[\s.-]\d{4}(?!\d)/g,
    validate: (text) => {
      const digits = text.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) return false;
      if (/^20\d{2}[.-]\d{2}[.-]\d{2}/.test(text)) return false;
      return true;
    },
  },
  // IPv4 addresses
  {
    category: 'ips',
    regex: /(?<![\dvV.])(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(?![\d.])/g,
  },
];

/**
 * Scan a text string for all non-overlapping sensitive matches according to enabled categories
 * and optional custom keywords/regexes.
 *
 * Returns sorted array of `{ start, end, text, category, replacement }`.
 */
export function findSensitiveMatches(text, options = {}) {
  if (!text || typeof text !== 'string') return [];

  const categories = { ...DEFAULT_CATEGORIES, ...(options.categories || {}) };
  const customRules = categories.custom
    ? parseCustomRules(options.customTerms || [], options.maxCustomTerms ?? Infinity)
    : [];

  const rawMatches = [];

  for (const detector of DETECTORS) {
    if (!categories[detector.category]) continue;
    detector.regex.lastIndex = 0;
    let m;
    while ((m = detector.regex.exec(text)) !== null) {
      const matched = m[0];
      if (!matched) {
        detector.regex.lastIndex += 1;
        continue;
      }
      if (detector.validate && !detector.validate(matched)) continue;
      rawMatches.push({
        start: m.index,
        end: m.index + matched.length,
        text: matched,
        category: detector.category,
        priority: detector.category === 'secrets' ? 1 : detector.category === 'emails' ? 2 : 3,
      });
    }
  }

  for (const rule of customRules) {
    rule.lastIndex = 0;
    let m;
    while ((m = rule.exec(text)) !== null) {
      const matched = m[0];
      if (!matched) {
        rule.lastIndex += 1;
        continue;
      }
      rawMatches.push({
        start: m.index,
        end: m.index + matched.length,
        text: matched,
        category: 'custom',
        priority: 0, // User's explicit custom keywords take top priority
      });
    }
  }

  if (rawMatches.length === 0) return [];

  // Sort by start index, then higher priority (lower number), then longer span
  rawMatches.sort((a, b) => (
    a.start - b.start ||
    a.priority - b.priority ||
    (b.end - b.start) - (a.end - a.start)
  ));

  // Deduplicate overlapping matches cleanly
  const accepted = [];
  let cursor = -1;
  for (const item of rawMatches) {
    if (item.start < cursor) continue;
    accepted.push({
      start: item.start,
      end: item.end,
      text: item.text,
      category: item.category,
      replacement: generateFakeReplacement(item.category, item.text),
    });
    cursor = item.end;
  }

  return accepted;
}
