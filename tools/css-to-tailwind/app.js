import { convertRawCssToTailwind } from '../../lib/css-block-converter.js';

const PRESETS = {
  card: {
    tag: 'article',
    css: `.pricing-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 32px;
  background-color: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  position: static;
  opacity: 1;
}`,
  },
  button: {
    tag: 'button',
    css: `.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
}`,
  },
  badge: {
    tag: 'span',
    css: `.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background-color: #0f172a;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
}`,
  },
};

const cssInput = document.getElementById('css-input');
const tagSelect = document.getElementById('tag-select');
const jsxToggle = document.getElementById('jsx-toggle');
const outClasses = document.querySelector('#out-classes code');
const outSnippet = document.querySelector('#out-snippet code');
const livePreview = document.getElementById('live-preview');
const statusToast = document.getElementById('tool-status');

let toastTimer = null;
function notify(msg) {
  statusToast.textContent = msg;
  statusToast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => statusToast.classList.remove('visible'), 2200);
}

function update() {
  const result = convertRawCssToTailwind(cssInput.value, {
    tag: tagSelect.value,
    jsx: jsxToggle.checked,
  });

  outClasses.textContent = result.classString || '/* No non-default utilities detected */';
  outSnippet.textContent = result.snippet;

  // Apply cleaned visual styles safely to the live preview box
  livePreview.removeAttribute('style');
  const safePreviewProps = [
    'display', 'flex-direction', 'align-items', 'justify-content', 'gap', 'row-gap', 'column-gap',
    'padding', 'margin', 'background-color', 'background-image', 'backdrop-filter', 'color',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
    'box-shadow', 'font-size', 'font-weight', 'font-style', 'text-transform', 'opacity', 'cursor',
  ];
  for (const prop of safePreviewProps) {
    if (result.cleaned[prop]) {
      livePreview.style.setProperty(prop, result.cleaned[prop]);
    }
  }
  livePreview.textContent = tagSelect.value === 'button' ? 'Get Started' : 'Live Styled Preview';
}

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    tagSelect.value = preset.tag;
    cssInput.value = preset.css;
    update();
  });
});

cssInput.addEventListener('input', update);
tagSelect.addEventListener('change', update);
jsxToggle.addEventListener('change', update);

document.getElementById('btn-copy-classes').addEventListener('click', async () => {
  await navigator.clipboard.writeText(outClasses.textContent);
  notify('Copied Tailwind CSS v4 classes');
});

document.getElementById('btn-copy-snippet').addEventListener('click', async () => {
  await navigator.clipboard.writeText(outSnippet.textContent);
  notify('Copied component markup');
});

// Boot with SaaS card example
tagSelect.value = PRESETS.card.tag;
cssInput.value = PRESETS.card.css;
update();
