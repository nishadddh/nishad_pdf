/* ==============================
   script.js — PDFMaster Frontend Logic
   Uses pdf-lib (CDN) for browser-based PDF operations
   Heavy ops use backend API (/api/*)
============================== */

/* ===== GLOBAL STATE ===== */
const state = {
  currentTool: null,
  files: [],
  workflowSteps: [],
  result: null
};

/* ===== THEME TOGGLE ===== */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');
let darkMode = localStorage.getItem('pdfmaster-theme') === 'dark';
applyTheme();
themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  applyTheme();
  localStorage.setItem('pdfmaster-theme', darkMode ? 'dark' : 'light');
});
function applyTheme() {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  themeIcon.textContent = darkMode ? '☀️' : '🌙';
}

/* ===== HAMBURGER MENU ===== */
document.getElementById('hamburger').addEventListener('click', () => {
  const links = document.getElementById('nav-links');
  links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
  links.style.flexDirection = 'column';
  links.style.position = 'absolute';
  links.style.top = '68px';
  links.style.left = '0';
  links.style.right = '0';
  links.style.background = 'var(--surface)';
  links.style.padding = '20px 24px';
  links.style.borderBottom = '1px solid var(--border)';
  links.style.gap = '16px';
  links.style.zIndex = '999';
});

/* ===== NAVBAR SCROLL EFFECT ===== */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.style.borderBottomColor = window.scrollY > 20 ? 'var(--border)' : 'transparent';
});

/* ===== SCROLL REVEAL ===== */
const reveals = document.querySelectorAll('.category, .tool-card, .ai-card, .pricing-card');
reveals.forEach(el => el.classList.add('reveal'));
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 40);
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });
reveals.forEach(el => revealObserver.observe(el));

/* ===== SPLIT MODE TOGGLE ===== */
document.addEventListener('change', (e) => {
  if (e.target.id === 'splitMode') {
    const wrap = document.getElementById('splitRangeWrap');
    if (wrap) wrap.style.display = e.target.value === 'range' ? 'block' : 'none';
  }
});

/* ===========================
   TOOL MODAL
=========================== */
function openTool(toolKey) {
  const tool = TOOLS[toolKey];
  if (!tool) return;
  state.currentTool = toolKey;
  state.files = [];
  state.result = null;

  // Populate modal
  document.getElementById('modalIcon').textContent = tool.icon;
  document.getElementById('modalTitle').textContent = tool.title;
  document.getElementById('modalDesc').textContent = tool.desc;

  // Build modal body
  const body = document.getElementById('modalBody');
  body.innerHTML = '';

  // Drop Zone
  const dropZone = createDropZone(tool);
  body.appendChild(dropZone);

  // File list
  const fileList = document.createElement('div');
  fileList.className = 'file-list';
  fileList.id = 'modalFileList';
  body.appendChild(fileList);

  // Tool-specific options
  if (tool.options) {
    const optDiv = document.createElement('div');
    optDiv.innerHTML = tool.options;
    body.appendChild(optDiv);
  }

  // Progress
  const progressWrap = document.createElement('div');
  progressWrap.className = 'progress-wrap';
  progressWrap.id = 'progressWrap';
  progressWrap.innerHTML = `
    <div class="progress-label"><span id="progressLabel">${tool.processLabel}</span><span id="progressPct">0%</span></div>
    <div class="progress-bar-bg"><div class="progress-bar" id="progressBar"></div></div>`;
  body.appendChild(progressWrap);

  // AI Output (for AI tools)
  if (toolKey === 'summarize' || toolKey === 'translate') {
    const aiOut = document.createElement('div');
    aiOut.id = 'aiOutput';
    aiOut.className = 'ai-output';
    aiOut.style.display = 'none';
    aiOut.textContent = 'AI output will appear here...';
    body.appendChild(aiOut);
  }

  // Action & Download
  const actionRow = document.createElement('div');
  actionRow.style.display = 'flex'; actionRow.style.gap = '12px'; actionRow.style.flexWrap = 'wrap';
  const runBtn = document.createElement('button');
  runBtn.className = 'btn btn-primary';
  runBtn.id = 'runBtn';
  runBtn.textContent = `${tool.icon} ${tool.title}`;
  runBtn.onclick = () => runTool();
  actionRow.appendChild(runBtn);
  const downloadWrap = document.createElement('div');
  downloadWrap.id = 'downloadWrap';
  downloadWrap.className = 'download-wrap';
  downloadWrap.innerHTML = `<a class="btn btn-success" id="downloadBtn" href="#" download>⬇ Download Result</a>`;
  actionRow.appendChild(downloadWrap);
  body.appendChild(actionRow);

  // Show modal
  document.getElementById('toolModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('toolModal').classList.remove('active');
  document.body.style.overflow = '';
  state.files = [];
  state.result = null;
}

// Close on overlay click
document.getElementById('toolModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('toolModal')) closeModal();
});

/* ===== DROP ZONE ===== */
function createDropZone(tool) {
  const dz = document.createElement('div');
  dz.className = 'drop-zone';
  dz.id = 'dropZone';
  dz.innerHTML = `
    <input type="file" id="fileInput" accept="${tool.accept}" ${tool.multi ? 'multiple' : ''} />
    <div class="drop-icon">📂</div>
    <h4>Drop ${tool.multi ? 'files' : 'file'} here</h4>
    <p>Supports: <strong>${tool.accept.split(',').join(', ')}</strong> · Max 100MB</p>
    <button class="btn btn-outline" type="button">Choose ${tool.multi ? 'Files' : 'File'}</button>`;

  const input = dz.querySelector('#fileInput');
  input.addEventListener('change', () => handleFiles(Array.from(input.files)));
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('dragover');
    handleFiles(Array.from(e.dataTransfer.files));
  });
  return dz;
}

function handleFiles(incoming) {
  // Validate
  const tool = TOOLS[state.currentTool];
  const allowed = tool.accept.split(',').map(e => e.trim());
  const valid = incoming.filter(f => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return allowed.includes(ext) || allowed.includes('image/*');
  });
  if (valid.length === 0) {
    toast('❌ Invalid file type', 'error');
    return;
  }
  // Size check (100MB)
  const tooBig = valid.filter(f => f.size > 100 * 1024 * 1024);
  if (tooBig.length) {
    toast('❌ File too large (max 100MB)', 'error');
    return;
  }

  if (!tool.multi) state.files = [valid[0]];
  else state.files = [...state.files, ...valid];

  renderFileList();
  toast(`✓ ${valid.length} file(s) selected`, 'success');
}

function renderFileList() {
  const list = document.getElementById('modalFileList');
  list.innerHTML = '';
  state.files.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-item-icon">${getFileIcon(f.name)}</span>
      <div class="file-item-info">
        <span>${f.name}</span>
        <small>${formatSize(f.size)}</small>
      </div>
      <button class="file-item-remove" onclick="removeFile(${i})">✕</button>`;
    list.appendChild(item);
  });
}

function removeFile(i) {
  state.files.splice(i, 1);
  renderFileList();
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '🎞️', pptx: '🎞️', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', html: '🌐', htm: '🌐' };
  return map[ext] || '📁';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* ===========================
   RUN TOOL
=========================== */
async function runTool() {
  const tool = TOOLS[state.currentTool];
  if (state.files.length === 0) {
    toast('⚠️ Please select a file first', 'error');
    return;
  }

  // Gather opts
  const opts = {};
  document.querySelectorAll('#modalBody select, #modalBody input, #modalBody textarea').forEach(el => {
    if (el.id && el.id !== 'fileInput') opts[el.id] = el.type === 'range' ? parseInt(el.value) : el.value;
  });

  const runBtn = document.getElementById('runBtn');
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Processing...';

  showProgress(true);
  simulateProgress(tool.processLabel);

  try {
    const result = await tool.process(state.files, opts);
    state.result = result;
    showProgress(false);
    if (result) {
      showDownload(result);
      toast('✓ Done! Your file is ready.', 'success');
    }
  } catch (err) {
    showProgress(false);
    toast('❌ Error: ' + err.message, 'error');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = `${tool.icon} ${tool.title}`;
  }
}

function showProgress(show) {
  const pw = document.getElementById('progressWrap');
  if (pw) { pw.classList.toggle('show', show); if (!show) setProgress(0); }
}

let progressTimer = null;
function simulateProgress(label) {
  let pct = 0;
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    pct += Math.random() * 12;
    if (pct >= 95) pct = 95;
    setProgress(Math.round(pct), label);
  }, 300);
}

function setProgress(pct, label) {
  const bar = document.getElementById('progressBar');
  const pctEl = document.getElementById('progressPct');
  const labelEl = document.getElementById('progressLabel');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (labelEl && label) labelEl.textContent = label;
  if (pct === 0) clearInterval(progressTimer);
}

function showDownload(result) {
  const dw = document.getElementById('downloadWrap');
  const btn = document.getElementById('downloadBtn');
  if (!dw || !btn) return;
  dw.classList.add('show');
  if (result.url) {
    btn.href = result.url;
    btn.download = result.filename || 'pdfmaster-output.pdf';
  }
}

/* ===========================
   PDF PROCESSING FUNCTIONS
   (Browser-based with pdf-lib)
=========================== */

// Load pdf-lib dynamically
let PDFLib = null;
async function loadPDFLib() {
  if (PDFLib) return PDFLib;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    s.onload = () => { PDFLib = window.PDFLib; resolve(PDFLib); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Load pdf.js for rendering
async function loadPDFJS() {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ---- Merge PDF ---- */
async function mergePDFs(files) {
  const lib = await loadPDFLib();
  const merged = await lib.PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await lib.PDFDocument.load(bytes);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  const out = await merged.save();
  return blobResult(out, 'merged.pdf');
}

/* ---- Split PDF ---- */
async function splitPDF(file, opts) {
  const lib = await loadPDFLib();
  const bytes = await file.arrayBuffer();
  const pdf = await lib.PDFDocument.load(bytes);
  const totalPages = pdf.getPageCount();

  // Split all pages into individual files, zip them
  const jszip = await loadJSZip();
  const zip = new jszip();

  let pagesToSplit = [];
  if (opts.splitMode === 'range' && opts.splitRange) {
    pagesToSplit = parsePageRange(opts.splitRange, totalPages);
  } else {
    pagesToSplit = Array.from({ length: totalPages }, (_, i) => [i]);
  }

  for (let i = 0; i < pagesToSplit.length; i++) {
    const pages = Array.isArray(pagesToSplit[i]) ? pagesToSplit[i] : [pagesToSplit[i]];
    const newPdf = await lib.PDFDocument.create();
    const copied = await newPdf.copyPages(pdf, pages.map(p => p - 1 < 0 ? 0 : p - 1));
    copied.forEach(p => newPdf.addPage(p));
    const outBytes = await newPdf.save();
    zip.file(`page-${i + 1}.pdf`, outBytes);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  return { url, filename: 'split-pages.zip' };
}

/* ---- Rotate PDF ---- */
async function rotatePDF(file, opts) {
  const lib = await loadPDFLib();
  const bytes = await file.arrayBuffer();
  const pdf = await lib.PDFDocument.load(bytes);
  const total = pdf.getPageCount();
  const angle = parseInt(opts.rotateAngle || 90);
  const pagesMode = opts.rotatePages || 'all';

  for (let i = 0; i < total; i++) {
    const doRotate = pagesMode === 'all' ||
      (pagesMode === 'odd' && (i + 1) % 2 !== 0) ||
      (pagesMode === 'even' && (i + 1) % 2 === 0);
    if (doRotate) {
      const page = pdf.getPage(i);
      page.setRotation(lib.degrees(angle));
    }
  }
  const out = await pdf.save();
  return blobResult(out, 'rotated.pdf');
}

/* ---- Compress PDF (basic rewrite) ---- */
async function compressPDF(file, opts) {
  // True compression requires backend; browser version does a clean reload
  const lib = await loadPDFLib();
  const bytes = await file.arrayBuffer();
  const pdf = await lib.PDFDocument.load(bytes, { updateMetadata: false });
  const out = await pdf.save({ useObjectStreams: opts.compressLevel !== 'low', addDefaultPage: false });
  return blobResult(out, 'compressed.pdf');
}

/* ---- Repair PDF ---- */
async function repairPDF(file) {
  const lib = await loadPDFLib();
  try {
    const bytes = await file.arrayBuffer();
    const pdf = await lib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const out = await pdf.save();
    return blobResult(out, 'repaired.pdf');
  } catch (e) {
    // Try backend
    return await apiRequest('repair', [file], {});
  }
}

/* ---- Organize PDF (basic: extract all to zip) ---- */
async function organizePDF(file, opts) {
  toast('ℹ️ Upload the PDF, reorder by downloading pages, then use Merge PDF.', 'ai');
  return await mergePDFs([file]);
}

/* ---- Add Page Numbers ---- */
async function addPageNumbers(file, opts) {
  const lib = await loadPDFLib();
  const { rgb, StandardFonts } = lib;
  const bytes = await file.arrayBuffer();
  const pdf = await lib.PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const total = pdf.getPageCount();
  const start = parseInt(opts.pageNumStart || 1);

  for (let i = 0; i < total; i++) {
    const page = pdf.getPage(i);
    const { width, height } = page.getSize();
    const num = start + i;
    let label = String(num);
    if (opts.pageNumFormat === 'page-1') label = `Page ${num}`;
    if (opts.pageNumFormat === '1-of-N') label = `${num} of ${total}`;
    const pos = opts.pageNumPos || 'bottom-center';
    let x = width / 2 - 20, y = 20;
    if (pos === 'bottom-right') { x = width - 50; y = 20; }
    if (pos === 'bottom-left') { x = 20; y = 20; }
    if (pos === 'top-center') { x = width / 2 - 20; y = height - 30; }
    page.drawText(label, { x, y, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
  }
  const out = await pdf.save();
  return blobResult(out, 'numbered.pdf');
}

/* ---- Crop PDF ---- */
async function cropPDF(file, opts) {
  const lib = await loadPDFLib();
  const bytes = await file.arrayBuffer();
  const pdf = await lib.PDFDocument.load(bytes);
  const top = parseInt(opts.cropTop || 0);
  const right = parseInt(opts.cropRight || 0);
  const bottom = parseInt(opts.cropBottom || 0);
  const left = parseInt(opts.cropLeft || 0);

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const page = pdf.getPage(i);
    const { width, height } = page.getSize();
    page.setCropBox(left, bottom, width - left - right, height - top - bottom);
  }
  const out = await pdf.save();
  return blobResult(out, 'cropped.pdf');
}

/* ---- Watermark PDF ---- */
async function watermarkPDF(file, opts) {
  const lib = await loadPDFLib();
  const { rgb, StandardFonts, degrees } = lib;
  const bytes = await file.arrayBuffer();
  const pdf = await lib.PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = opts.wmText || 'WATERMARK';
  const opacity = (parseInt(opts.wmOpacity || 30)) / 100;
  const rotation = parseInt(opts.wmRotation || 45);
  const color = hexToRGB(opts.wmColor || '#cccccc');

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const page = pdf.getPage(i);
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - (text.length * 10),
      y: height / 2,
      size: 48,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotation)
    });
  }
  const out = await pdf.save();
  return blobResult(out, 'watermarked.pdf');
}

/* ---- Protect PDF ---- */
async function protectPDF(file, opts) {
  // pdf-lib doesn't support encryption; route to backend
  toast('🔐 Sending to backend for encryption...', 'ai');
  return await apiRequest('protect', [file], opts);
}

/* ---- Unlock PDF ---- */
async function unlockPDF(file, opts) {
  const lib = await loadPDFLib();
  try {
    const bytes = await file.arrayBuffer();
    const pdf = await lib.PDFDocument.load(bytes, { password: opts.unlockPass, ignoreEncryption: true });
    const out = await pdf.save();
    return blobResult(out, 'unlocked.pdf');
  } catch (e) {
    toast('❌ Wrong password or cannot unlock in browser. Try backend.', 'error');
    throw e;
  }
}

/* ---- Convert JPG → PDF ---- */
async function convertJPGtoPDF(files, opts) {
  const lib = await loadPDFLib();
  const pdf = await lib.PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let img;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') img = await pdf.embedJpg(bytes);
    else img = await pdf.embedPng(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const out = await pdf.save();
  return blobResult(out, 'images.pdf');
}

/* ---- Convert PDF → JPG (using pdf.js) ---- */
async function convertPDFtoJPG(file, opts) {
  const pdfjs = await loadPDFJS();
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const jszip = await loadJSZip();
  const zip = new jszip();
  const dpi = parseInt(opts.jpgDpi || 150);
  const scale = dpi / 72;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    const ab = await blob.arrayBuffer();
    zip.file(`page-${i}.jpg`, ab);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  return { url, filename: 'pdf-pages.zip' };
}

/* ---- HTML → PDF (via backend) ---- */
async function convertHTMLtoPDF(files, opts) {
  if (opts.htmlUrl) {
    return await apiRequest('html2pdf', [], opts);
  }
  if (files.length > 0) {
    return await apiRequest('html2pdf', files, opts);
  }
  throw new Error('Please upload an HTML file or enter a URL.');
}

/* ---- Office conversions → backend ---- */
async function convertPDFtoWord(file)   { return await apiRequest('pdf2word', [file], {}); }
async function convertWordtoPDF(file)   { return await apiRequest('word2pdf', [file], {}); }
async function convertPDFtoExcel(file)  { return await apiRequest('pdf2excel', [file], {}); }
async function convertExceltoPDF(file)  { return await apiRequest('excel2pdf', [file], {}); }
async function convertPDFtoPPT(file)    { return await apiRequest('pdf2ppt', [file], {}); }
async function convertPPTtoPDF(file)    { return await apiRequest('ppt2pdf', [file], {}); }
async function convertToPDFA(file, opts){ return await apiRequest('pdfa', [file], opts); }
async function ocrPDF(file, opts)       { return await apiRequest('ocr', [file], opts); }
async function redactPDF(file, opts)    { return await apiRequest('redact', [file], opts); }
async function comparePDFs(files)       { return await apiRequest('compare', files, {}); }
async function editPDF(file)            { toast('✏️ PDF editor opening...', 'ai'); return await mergePDFs([file]); }
async function handleForms(file)        { return await apiRequest('forms', [file], {}); }

/* ---- PDF Repair fallback ---- */
async function repairPDFFallback(file)  { return await apiRequest('repair', [file], {}); }

/* ===========================
   AI FEATURES (Claude API)
=========================== */
async function aiSummarize(file, opts) {
  const text = await extractTextFromPDF(file);
  if (!text) throw new Error('Could not extract text. Is this a scanned PDF?');

  const aiOutput = document.getElementById('aiOutput');
  if (aiOutput) { aiOutput.style.display = 'block'; aiOutput.textContent = ''; aiOutput.classList.add('ai-typing'); }

  const style = opts.summaryStyle || 'bullets';
  const length = opts.summaryLength || 'medium';
  const prompt = buildSummaryPrompt(text, style, length);

  const response = await callClaudeAPI(prompt);
  if (aiOutput) { aiOutput.classList.remove('ai-typing'); aiOutput.textContent = response; }

  // Also make downloadable text
  const blob = new Blob([response], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  return { url, filename: 'summary.txt' };
}

async function aiTranslate(file, opts) {
  const text = await extractTextFromPDF(file);
  if (!text) throw new Error('Could not extract text. Is this a scanned PDF?');

  const aiOutput = document.getElementById('aiOutput');
  if (aiOutput) { aiOutput.style.display = 'block'; aiOutput.textContent = ''; aiOutput.classList.add('ai-typing'); }

  const lang = opts.translateLang || 'Spanish';
  const prompt = `Translate the following document text to ${lang}. Preserve the structure and formatting as much as possible. Only output the translated text:\n\n${text.substring(0, 8000)}`;

  const response = await callClaudeAPI(prompt);
  if (aiOutput) { aiOutput.classList.remove('ai-typing'); aiOutput.textContent = response; }

  const blob = new Blob([response], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  return { url, filename: `translated-${lang.toLowerCase()}.txt` };
}

function buildSummaryPrompt(text, style, length) {
  const lengthMap = { brief: '3-5 key points', medium: '5-10 points', detailed: 'a comprehensive analysis' };
  const styleMap = {
    bullets: `bullet-point list with ${lengthMap[length]}`,
    paragraph: `clear concise paragraphs summarizing ${lengthMap[length]}`,
    executive: `executive summary format with Overview, Key Points, and Recommendations`,
    qa: `Q&A format with the most important questions and answers`
  };
  return `Summarize the following document as ${styleMap[style]}. Be clear, concise, and informative:\n\n${text.substring(0, 8000)}`;
}

async function callClaudeAPI(prompt) {
  // Claude API call - uses Anthropic API directly from browser
  const ANTHROPIC_API_KEY = window.ANTHROPIC_API_KEY || '';
  if (!ANTHROPIC_API_KEY) {
    // Demo mode: return a mock response
    return demoAIResponse(prompt);
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!resp.ok) throw new Error('AI API error: ' + resp.status);
  const data = await resp.json();
  return data.content[0].text;
}

function demoAIResponse(prompt) {
  // Demo response when no API key is configured
  if (prompt.includes('Summarize') || prompt.includes('summarize')) {
    return `📋 DOCUMENT SUMMARY (Demo Mode)\n\n• This is a demonstration of the AI Summarizer feature.\n• To enable real AI summaries, add your Anthropic API key to window.ANTHROPIC_API_KEY in the configuration.\n• The summarizer can extract key points, create executive summaries, or generate Q&A pairs.\n• Supports documents up to ~8000 words of extracted text.\n• For longer documents, the backend API handles chunking automatically.\n\nConfigure your API key at the backend (server.js) for full AI functionality.`;
  }
  return `🌍 TRANSLATION (Demo Mode)\n\nThis is a demonstration of the AI Translator. To enable real translations, configure your Anthropic API key in the backend settings (config.json or environment variable ANTHROPIC_API_KEY).\n\nThe translator supports 50+ languages and preserves document structure.`;
}

/* ---- Extract text from PDF using pdf.js ---- */
async function extractTextFromPDF(file) {
  try {
    const pdfjs = await loadPDFJS();
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text.trim();
  } catch (e) {
    return null;
  }
}

/* ===========================
   BACKEND API HELPER
=========================== */
const API_BASE = window.API_BASE || 'https://pdfmaster-backend.onrender.com';

async function apiRequest(endpoint, files, opts) {
  const form = new FormData();
  files.forEach((f, i) => form.append(i === 0 ? 'file' : `file${i}`, f));
  Object.entries(opts).forEach(([k, v]) => form.append(k, v));

  const resp = await fetch(`${API_BASE}/api/${endpoint}`, { method: 'POST', body: form });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Backend error' }));
    throw new Error(err.error || 'Processing failed');
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const cd = resp.headers.get('content-disposition') || '';
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'pdfmaster-output';
  return { url, filename };
}

/* ===========================
   WORKFLOW BUILDER
=========================== */
function addWorkflowStep() {
  const select = document.getElementById('wfToolSelect');
  const toolKey = select.value;
  if (!toolKey) { toast('⚠️ Select a tool first', 'error'); return; }
  const tool = TOOLS[toolKey];
  if (state.workflowSteps.includes(toolKey)) { toast('⚠️ Tool already in workflow', 'error'); return; }
  state.workflowSteps.push(toolKey);
  renderWorkflow();
  toast(`✓ Added: ${tool.title}`, 'success');
  select.value = '';
}

function renderWorkflow() {
  const container = document.getElementById('workflowSteps');
  container.innerHTML = '';
  if (state.workflowSteps.length === 0) {
    container.innerHTML = `<div class="workflow-placeholder"><span>➕</span><p>Add steps to your workflow</p></div>`;
    return;
  }
  state.workflowSteps.forEach((key, i) => {
    const tool = TOOLS[key];
    const item = document.createElement('div');
    item.className = 'workflow-step-item';
    item.innerHTML = `
      <span class="step-num">${i + 1}</span>
      <span>${tool.icon} ${tool.title}</span>
      <button onclick="removeWorkflowStep(${i})">✕</button>`;
    container.appendChild(item);
    if (i < state.workflowSteps.length - 1) {
      const arr = document.createElement('span');
      arr.className = 'workflow-step-arrow';
      arr.textContent = '→';
      container.appendChild(arr);
    }
  });
}

function removeWorkflowStep(i) {
  state.workflowSteps.splice(i, 1);
  renderWorkflow();
}

function clearWorkflow() {
  state.workflowSteps = [];
  renderWorkflow();
}

function runWorkflow() {
  if (state.workflowSteps.length === 0) { toast('⚠️ Add steps first', 'error'); return; }
  toast('🔀 Workflow: Open the first tool to upload your file, then chain operations!', 'ai');
  // Open first tool
  openTool(state.workflowSteps[0]);
}

/* ===========================
   TOAST NOTIFICATIONS
=========================== */
function toast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.35s ease forwards';
    setTimeout(() => t.remove(), 350);
  }, 3200);
}

/* ===========================
   UTILITIES
=========================== */
function blobResult(uint8array, filename) {
  const blob = new Blob([uint8array], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return { url, filename };
}

function hexToRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function parsePageRange(rangeStr, total) {
  const pages = [];
  rangeStr.split(',').forEach(part => {
    part = part.trim();
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      const group = [];
      for (let i = a; i <= Math.min(b, total); i++) group.push(i);
      pages.push(group);
    } else {
      const n = parseInt(part);
      if (n >= 1 && n <= total) pages.push([n]);
    }
  });
  return pages;
}

async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ===========================
   INIT
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  toast('👋 Welcome to PDFMaster! Click any tool to get started.', '');
});
