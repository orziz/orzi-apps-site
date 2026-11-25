const canvas = document.getElementById('redact-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const dropStage = document.getElementById('drop-stage');
const emptyPrompt = document.getElementById('empty-prompt');
const canvasShell = document.getElementById('canvas-shell');
const fileInput = document.getElementById('file-input');
const strengthRange = document.getElementById('strength-range');
const strengthVal = document.getElementById('strength-val');
const statusText = document.getElementById('status-text');
const boxCounter = document.getElementById('box-counter');

const btnChoose = document.getElementById('btn-choose');
const btnChooseEmpty = document.getElementById('btn-choose-empty');
const btnSample = document.getElementById('btn-sample');
const btnSampleEmpty = document.getElementById('btn-sample-empty');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');

let sourceImage = null;
let sourceName = 'screenshot';
let redactions = [];
let dragging = false;
let dragStart = null;
let dragCurrent = null;

function getSelectedMode() {
  const checked = document.querySelector('input[name="redact-mode"]:checked');
  return checked ? checked.value : 'blur';
}

function getStrength() {
  return Number(strengthRange.value || 14);
}

function syncRangeFallbackProgress() {
  if (!CSS.supports('accent-color', 'auto')) {
    const min = Number(strengthRange.min || 4);
    const max = Number(strengthRange.max || 32);
    const val = Number(strengthRange.value || 14);
    const pct = ((val - min) / (max - min)) * 100;
    strengthRange.style.setProperty('--progress', `${pct}%`);
  }
}

strengthRange.addEventListener('input', () => {
  strengthVal.textContent = strengthRange.value;
  syncRangeFallbackProgress();
});
syncRangeFallbackProgress();

function updateButtons() {
  const hasImg = Boolean(sourceImage);
  btnUndo.disabled = !hasImg || redactions.length === 0;
  btnClear.disabled = !hasImg || redactions.length === 0;
  btnCopy.disabled = !hasImg;
  btnDownload.disabled = !hasImg;
  boxCounter.textContent = `${redactions.length} redaction${redactions.length === 1 ? '' : 's'}`;
}

function applySingleRedaction(targetCtx, box) {
  const x = Math.max(0, Math.round(box.x));
  const y = Math.max(0, Math.round(box.y));
  const w = Math.min(canvas.width - x, Math.round(box.w));
  const h = Math.min(canvas.height - y, Math.round(box.h));
  if (w < 2 || h < 2) return;

  if (box.mode === 'solid') {
    targetCtx.save();
    targetCtx.fillStyle = '#0f172a';
    targetCtx.fillRect(x, y, w, h);
    targetCtx.restore();
    return;
  }

  if (box.mode === 'pixelate') {
    const block = Math.max(4, Math.round(box.strength));
    const smallW = Math.max(1, Math.ceil(w / block));
    const smallH = Math.max(1, Math.ceil(h / block));
    const temp = document.createElement('canvas');
    temp.width = smallW;
    temp.height = smallH;
    const tctx = temp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(canvas, x, y, w, h, 0, 0, smallW, smallH);

    targetCtx.save();
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(temp, 0, 0, smallW, smallH, x, y, w, h);
    targetCtx.restore();
    return;
  }

  // Blur mode (multi-pass safe offscreen blur with clipped bounds so edges don't bleed)
  const pad = Math.ceil(box.strength * 2);
  const sx = Math.max(0, x - pad);
  const sy = Math.max(0, y - pad);
  const sw = Math.min(canvas.width - sx, w + pad * 2);
  const sh = Math.min(canvas.height - sy, h + pad * 2);
  const temp = document.createElement('canvas');
  temp.width = sw;
  temp.height = sh;
  const tctx = temp.getContext('2d');
  tctx.filter = `blur(${box.strength}px)`;
  tctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.rect(x, y, w, h);
  targetCtx.clip();
  targetCtx.drawImage(temp, sx, sy);
  targetCtx.restore();
}

function render(includePreview = true) {
  if (!sourceImage) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  for (const box of redactions) {
    applySingleRedaction(ctx, box);
  }

  if (includePreview && dragging && dragStart && dragCurrent) {
    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const w = Math.abs(dragCurrent.x - dragStart.x);
    const h = Math.abs(dragCurrent.y - dragStart.y);
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = Math.max(2, canvas.width / 420);
    ctx.setLineDash([8, 5]);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}

function loadImageElement(img, filename = 'screenshot') {
  sourceImage = img;
  sourceName = filename.replace(/\.[^.]+$/, '') || 'screenshot';
  redactions = [];
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  emptyPrompt.classList.add('visually-hidden');
  emptyPrompt.style.display = 'none';
  canvasShell.classList.add('visible');
  render();
  updateButtons();
  statusText.textContent = `Loaded ${canvas.width}×${canvas.height}px locally. Drag across sensitive areas to redact.`;
}

function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    statusText.textContent = 'Please drop a valid PNG, JPEG, or WebP image.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => loadImageElement(img, file.name);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function loadSampleDashboard() {
  const sample = document.createElement('canvas');
  sample.width = 1120;
  sample.height = 640;
  const sctx = sample.getContext('2d');
  sctx.fillStyle = '#0f172a';
  sctx.fillRect(0, 0, sample.width, sample.height);

  sctx.fillStyle = '#1e293b';
  sctx.fillRect(36, 36, 1048, 68);
  sctx.fillStyle = '#f8fafc';
  sctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
  sctx.fillText('Acme Billing Dashboard — Sample Screenshot (Drag boxes below to test)', 60, 78);

  const cards = [
    ['Monthly Revenue (MRR)', '$48,920.50'],
    ['Enterprise Contact', 'founder@realcompany.io'],
    ['Live Stripe Secret', 'sk_live_51NxYzAbCdEfGhIjKlMnOp'],
    ['Support Phone', '+1 (415) 890-4321'],
  ];
  cards.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 36 + col * 536;
    const y = 136 + row * 190;
    sctx.fillStyle = '#172236';
    sctx.fillRect(x, y, 512, 162);
    sctx.strokeStyle = '#334155';
    sctx.lineWidth = 2;
    sctx.strokeRect(x, y, 512, 162);
    sctx.fillStyle = '#94a3b8';
    sctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
    sctx.fillText(label, x + 28, y + 52);
    sctx.fillStyle = '#fca5a5';
    sctx.font = 'bold 28px ui-monospace, Menlo, monospace';
    sctx.fillText(value, x + 28, y + 114);
  });

  sctx.fillStyle = '#94a3b8';
  sctx.font = '18px -apple-system, sans-serif';
  sctx.fillText('Tip: Drag over the red values above using Blur, Pixelate, or Solid Black — then click Download Clean PNG.', 40, 586);

  const img = new Image();
  img.onload = () => loadImageElement(img, 'sample-dashboard');
  img.src = sample.toDataURL('image/png');
}

function getCanvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (ev.clientX - rect.left) * scaleX,
    y: (ev.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('pointerdown', (ev) => {
  if (!sourceImage) return;
  canvas.setPointerCapture(ev.pointerId);
  dragging = true;
  dragStart = getCanvasPoint(ev);
  dragCurrent = dragStart;
  render(true);
});

canvas.addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  dragCurrent = getCanvasPoint(ev);
  render(true);
});

canvas.addEventListener('pointerup', (ev) => {
  if (!dragging) return;
  dragging = false;
  dragCurrent = getCanvasPoint(ev);
  const x = Math.min(dragStart.x, dragCurrent.x);
  const y = Math.min(dragStart.y, dragCurrent.y);
  const w = Math.abs(dragCurrent.x - dragStart.x);
  const h = Math.abs(dragCurrent.y - dragStart.y);
  if (w >= 6 && h >= 6) {
    redactions.push({ x, y, w, h, mode: getSelectedMode(), strength: getStrength() });
  }
  dragStart = null;
  dragCurrent = null;
  render(false);
  updateButtons();
});

btnChoose.addEventListener('click', () => fileInput.click());
btnChooseEmpty.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files?.[0]) loadFile(fileInput.files[0]);
  fileInput.value = '';
});

btnSample.addEventListener('click', loadSampleDashboard);
btnSampleEmpty.addEventListener('click', loadSampleDashboard);

btnUndo.addEventListener('click', () => {
  redactions.pop();
  render(false);
  updateButtons();
});

btnClear.addEventListener('click', () => {
  redactions = [];
  render(false);
  updateButtons();
});

btnDownload.addEventListener('click', () => {
  if (!sourceImage) return;
  render(false);
  const link = document.createElement('a');
  link.download = `${sourceName}-redacted.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  statusText.textContent = 'Downloaded clean PNG (100% local · EXIF metadata stripped).';
});

btnCopy.addEventListener('click', async () => {
  if (!sourceImage) return;
  render(false);
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    statusText.textContent = 'Copied clean redacted PNG to clipboard.';
  } catch {
    statusText.textContent = 'Clipboard image write blocked by browser — use Download Clean PNG instead.';
  }
});

// Drag & drop + Ctrl+V / Cmd+V clipboard paste support
dropStage.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  dropStage.classList.add('dragover');
});
dropStage.addEventListener('dragleave', () => dropStage.classList.remove('dragover'));
dropStage.addEventListener('drop', (ev) => {
  ev.preventDefault();
  dropStage.classList.remove('dragover');
  if (ev.dataTransfer?.files?.[0]) loadFile(ev.dataTransfer.files[0]);
});

window.addEventListener('paste', (ev) => {
  const items = ev.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) loadFile(file);
      break;
    }
  }
});

updateButtons();
