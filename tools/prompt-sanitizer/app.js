import { findSensitiveMatches } from '../../lib/pii-detector.js';

const rawInput = document.getElementById('raw-input');
const safeOutput = document.getElementById('safe-output');
const aiReplyInput = document.getElementById('ai-reply-input');
const restoredOutput = document.getElementById('restored-output');
const customTerms = document.getElementById('custom-terms');
const matchBadge = document.getElementById('match-badge');
const mapCount = document.getElementById('map-count');
const mapTbody = document.getElementById('map-tbody');
const btnSample = document.getElementById('btn-sample');
const btnClear = document.getElementById('btn-clear');
const btnCopySafe = document.getElementById('btn-copy-safe');
const btnCopyRestored = document.getElementById('btn-copy-restored');

const SAMPLE_STRIPE_DEMO = ['sk', 'live', '51ExampleDemoKeyAbCdEfGhIj'].join('_');
const SAMPLE_AWS_DEMO = ['AKIA', 'EXAMPLE00000DEMO'].join('');

const SAMPLE_PAYLOAD = `{
  "event": "invoice.payment_failed",
  "customer": {
    "name": "Project Titan",
    "email": "billing@realclient.io",
    "phone": "+1 (415) 890-4321",
    "ip": "10.24.88.105",
    "card": "4242-4242-4242-4242"
  },
  "amount_due": "$48,920.50",
  "debug_headers": {
    "authorization": "Bearer ${SAMPLE_STRIPE_DEMO}",
    "aws_key": "${SAMPLE_AWS_DEMO}"
  }
}`;

let replacementToOriginal = new Map();

function getCategories() {
  const out = { custom: true };
  document.querySelectorAll('#cat-checks input[type="checkbox"]').forEach((box) => {
    out[box.dataset.cat] = box.checked;
  });
  return out;
}

function getMode() {
  const checked = document.querySelector('input[name="scrub-mode"]:checked');
  return checked ? checked.value : 'tokens';
}

function runScrub() {
  const text = rawInput.value || '';
  const mode = getMode();
  const matches = findSensitiveMatches(text, {
    categories: getCategories(),
    customTerms: customTerms.value,
  });

  const originalToSafe = new Map();
  const counters = {};
  replacementToOriginal = new Map();
  const mappingRows = [];

  let safeText = '';
  let cursor = 0;

  for (const m of matches) {
    safeText += text.slice(cursor, m.start);
    let rep = originalToSafe.get(m.text);
    if (!rep) {
      if (mode === 'demo') {
        rep = m.replacement;
      } else {
        const tag = m.category.toUpperCase().replace(/S$/, '');
        counters[tag] = (counters[tag] || 0) + 1;
        rep = `[${tag}_${counters[tag]}]`;
      }
      originalToSafe.set(m.text, rep);
      replacementToOriginal.set(rep, m.text);
      mappingRows.push({ category: m.category, safe: rep, original: m.text });
    }
    safeText += rep;
    cursor = m.end;
  }
  safeText += text.slice(cursor);

  safeOutput.value = safeText;
  matchBadge.textContent = `${matches.length} item${matches.length === 1 ? '' : 's'} masked`;
  mapCount.textContent = String(mappingRows.length);

  mapTbody.replaceChildren();
  for (const row of mappingRows) {
    const tr = document.createElement('tr');
    const tdCat = document.createElement('td');
    tdCat.textContent = row.category;
    const tdSafe = document.createElement('td');
    tdSafe.className = 'mono';
    tdSafe.textContent = row.safe;
    const tdOrig = document.createElement('td');
    tdOrig.className = 'mono';
    tdOrig.textContent = row.original;
    tr.append(tdCat, tdSafe, tdOrig);
    mapTbody.appendChild(tr);
  }

  runRehydrate();
}

function runRehydrate() {
  const reply = aiReplyInput.value || '';
  if (!reply) {
    restoredOutput.value = '';
    return;
  }
  let out = reply;
  // Replace longest keys first to avoid partial collisions
  const pairs = Array.from(replacementToOriginal.entries()).sort((a, b) => b[0].length - a[0].length);
  for (const [safeToken, original] of pairs) {
    out = out.split(safeToken).join(original);
  }
  restoredOutput.value = out;
}

rawInput.addEventListener('input', runScrub);
customTerms.addEventListener('input', runScrub);
aiReplyInput.addEventListener('input', runRehydrate);
document.querySelectorAll('#cat-checks input, input[name="scrub-mode"]').forEach((el) => {
  el.addEventListener('change', runScrub);
});

btnSample.addEventListener('click', () => {
  customTerms.value = 'Project Titan';
  rawInput.value = SAMPLE_PAYLOAD;
  runScrub();
  aiReplyInput.value = 'Fix applied: rotate [SECRET_1] and [SECRET_2], then notify [EMAIL_1] about the failed [MONEY_1] charge.';
  runRehydrate();
});

btnClear.addEventListener('click', () => {
  rawInput.value = '';
  aiReplyInput.value = '';
  customTerms.value = '';
  runScrub();
});

async function copyText(btn, value, defaultLabel) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = defaultLabel; }, 1400);
  } catch {
    btn.textContent = 'Select & Copy';
    setTimeout(() => { btn.textContent = defaultLabel; }, 1400);
  }
}

btnCopySafe.addEventListener('click', () => copyText(btnCopySafe, safeOutput.value, 'Copy Safe Text'));
btnCopyRestored.addEventListener('click', () => copyText(btnCopyRestored, restoredOutput.value, 'Copy Restored Text'));

// Load sample immediately so first-time visitors see instant value
btnSample.click();
