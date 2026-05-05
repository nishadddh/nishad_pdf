/* ==============================
   tools.js — Tool Definitions & Modal Logic
============================== */

const TOOLS = {
  merge: {
    icon: '🔀', title: 'Merge PDF', desc: 'Combine multiple PDFs into a single document.',
    multi: true, accept: '.pdf', options: null,
    processLabel: 'Merging PDFs...',
    process: async (files, opts) => mergePDFs(files)
  },
  split: {
    icon: '✂️', title: 'Split PDF', desc: 'Split a PDF into separate pages or page ranges.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Split mode</label>
          <select id="splitMode">
            <option value="all">All pages (one per file)</option>
            <option value="range">Custom range (e.g. 1-3,5,7-9)</option>
          </select>
        </div>
        <div id="splitRangeWrap" style="display:none">
          <label>Page range</label>
          <input type="text" id="splitRange" placeholder="e.g. 1-3, 5, 7-9"/>
        </div>
      </div>`,
    processLabel: 'Splitting PDF...',
    process: async (files, opts) => splitPDF(files[0], opts)
  },
  rotate: {
    icon: '🔄', title: 'Rotate PDF', desc: 'Rotate pages to the correct orientation.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Rotation angle</label>
          <select id="rotateAngle">
            <option value="90">90° Clockwise</option>
            <option value="180">180°</option>
            <option value="270">90° Counter-clockwise</option>
          </select>
        </div>
        <div>
          <label>Apply to pages</label>
          <select id="rotatePages">
            <option value="all">All pages</option>
            <option value="odd">Odd pages only</option>
            <option value="even">Even pages only</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Rotating PDF...',
    process: async (files, opts) => rotatePDF(files[0], opts)
  },
  organize: {
    icon: '📋', title: 'Organize PDF', desc: 'Reorder, delete, or extract pages visually.',
    multi: false, accept: '.pdf', options: null,
    processLabel: 'Organizing PDF...',
    process: async (files, opts) => organizePDF(files[0], opts)
  },
  crop: {
    icon: '🪄', title: 'Crop PDF', desc: 'Trim page margins and crop PDF pages.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><label>Top (pt)</label><input type="number" id="cropTop" value="0" min="0"/></div>
          <div><label>Right (pt)</label><input type="number" id="cropRight" value="0" min="0"/></div>
          <div><label>Bottom (pt)</label><input type="number" id="cropBottom" value="0" min="0"/></div>
          <div><label>Left (pt)</label><input type="number" id="cropLeft" value="0" min="0"/></div>
        </div>
      </div>`,
    processLabel: 'Cropping PDF...',
    process: async (files, opts) => cropPDF(files[0], opts)
  },
  pagenumbers: {
    icon: '🔢', title: 'Add Page Numbers', desc: 'Insert page numbers at custom positions and styles.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Position</label>
          <select id="pageNumPos">
            <option value="bottom-center">Bottom Center</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="top-center">Top Center</option>
          </select>
        </div>
        <div>
          <label>Starting number</label>
          <input type="number" id="pageNumStart" value="1" min="1"/>
        </div>
        <div>
          <label>Format</label>
          <select id="pageNumFormat">
            <option value="1">1, 2, 3...</option>
            <option value="page-1">Page 1, Page 2...</option>
            <option value="1-of-N">1 of N</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Adding page numbers...',
    process: async (files, opts) => addPageNumbers(files[0], opts)
  },
  compress: {
    icon: '🗜️', title: 'Compress PDF', desc: 'Reduce PDF file size without losing quality.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Compression level</label>
          <select id="compressLevel">
            <option value="low">Low (best quality)</option>
            <option value="medium" selected>Medium (recommended)</option>
            <option value="high">High (smallest size)</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Compressing PDF...',
    process: async (files, opts) => compressPDF(files[0], opts)
  },
  repair: {
    icon: '🔧', title: 'Repair PDF', desc: 'Attempt to fix corrupted or damaged PDF files.',
    multi: false, accept: '.pdf', options: null,
    processLabel: 'Repairing PDF...',
    process: async (files, opts) => repairPDF(files[0])
  },
  pdfa: {
    icon: '🏛️', title: 'PDF to PDF/A', desc: 'Convert PDFs to archival PDF/A format.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>PDF/A version</label>
          <select id="pdfaVersion">
            <option value="1b">PDF/A-1b</option>
            <option value="2b">PDF/A-2b</option>
            <option value="3b">PDF/A-3b</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Converting to PDF/A...',
    process: async (files, opts) => convertToPDFA(files[0], opts)
  },
  ocr: {
    icon: '👁️', title: 'OCR PDF', desc: 'Extract and recognize text from scanned PDFs.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Language</label>
          <select id="ocrLang">
            <option value="eng">English</option>
            <option value="fra">French</option>
            <option value="deu">German</option>
            <option value="spa">Spanish</option>
            <option value="por">Portuguese</option>
            <option value="ita">Italian</option>
            <option value="chi_sim">Chinese (Simplified)</option>
            <option value="jpn">Japanese</option>
            <option value="ara">Arabic</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Running OCR...',
    process: async (files, opts) => ocrPDF(files[0], opts)
  },
  pdf2word: {
    icon: '📝', title: 'PDF to Word', desc: 'Convert PDF to editable .docx files.',
    multi: false, accept: '.pdf', options: null,
    processLabel: 'Converting to Word...',
    process: async (files) => convertPDFtoWord(files[0])
  },
  word2pdf: {
    icon: '📄', title: 'Word to PDF', desc: 'Convert .doc / .docx to PDF format.',
    multi: false, accept: '.doc,.docx', options: null,
    processLabel: 'Converting to PDF...',
    process: async (files) => convertWordtoPDF(files[0])
  },
  pdf2excel: {
    icon: '📊', title: 'PDF to Excel', desc: 'Extract tables from PDFs into spreadsheets.',
    multi: false, accept: '.pdf', options: null,
    processLabel: 'Converting to Excel...',
    process: async (files) => convertPDFtoExcel(files[0])
  },
  excel2pdf: {
    icon: '📈', title: 'Excel to PDF', desc: 'Convert .xls / .xlsx spreadsheets to PDF.',
    multi: false, accept: '.xls,.xlsx', options: null,
    processLabel: 'Converting to PDF...',
    process: async (files) => convertExceltoPDF(files[0])
  },
  pdf2ppt: {
    icon: '📊', title: 'PDF to PowerPoint', desc: 'Convert PDF slides to editable .pptx.',
    multi: false, accept: '.pdf', options: null,
    processLabel: 'Converting to PowerPoint...',
    process: async (files) => convertPDFtoPPT(files[0])
  },
  ppt2pdf: {
    icon: '🎞️', title: 'PowerPoint to PDF', desc: 'Turn your presentations into PDF.',
    multi: false, accept: '.ppt,.pptx', options: null,
    processLabel: 'Converting to PDF...',
    process: async (files) => convertPPTtoPDF(files[0])
  },
  jpg2pdf: {
    icon: '🖼️', title: 'JPG to PDF', desc: 'Convert images (JPG, PNG, GIF) into a PDF.',
    multi: true, accept: '.jpg,.jpeg,.png,.gif,.webp,.bmp',
    options: `
      <div class="modal-options">
        <div>
          <label>Page size</label>
          <select id="jpgPageSize">
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="fit">Fit to image</option>
          </select>
        </div>
        <div>
          <label>Orientation</label>
          <select id="jpgOrientation">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Converting images to PDF...',
    process: async (files, opts) => convertJPGtoPDF(files, opts)
  },
  pdf2jpg: {
    icon: '📸', title: 'PDF to JPG', desc: 'Export each PDF page as a JPG image.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Quality (DPI)</label>
          <select id="jpgDpi">
            <option value="72">72 DPI (screen)</option>
            <option value="150" selected>150 DPI (medium)</option>
            <option value="300">300 DPI (print)</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Converting PDF to images...',
    process: async (files, opts) => convertPDFtoJPG(files[0], opts)
  },
  html2pdf: {
    icon: '🌐', title: 'HTML to PDF', desc: 'Convert any HTML page or URL to PDF.',
    multi: false, accept: '.html,.htm',
    options: `
      <div class="modal-options">
        <div>
          <label>Or enter URL</label>
          <input type="url" id="htmlUrl" placeholder="https://example.com"/>
        </div>
        <div>
          <label>Page format</label>
          <select id="htmlFormat">
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Converting HTML to PDF...',
    process: async (files, opts) => convertHTMLtoPDF(files, opts)
  },
  scan2pdf: {
    icon: '📷', title: 'Scan to PDF', desc: 'Use your device camera to scan documents to PDF.',
    multi: false, accept: 'image/*',
    options: `<div style="text-align:center;padding:8px 0;color:var(--text2);font-size:0.9rem;">📷 Upload a photo taken with your camera or device scanner.</div>`,
    processLabel: 'Processing scan...',
    process: async (files, opts) => convertJPGtoPDF(files, { pageSize: 'A4', orientation: 'portrait' })
  },
  edit: {
    icon: '✏️', title: 'Edit PDF', desc: 'Add text, images, and annotations to your PDF.',
    multi: false, accept: '.pdf', options: null,
    processLabel: 'Loading PDF editor...',
    process: async (files) => editPDF(files[0])
  },
  watermark: {
    icon: '💧', title: 'Watermark PDF', desc: 'Add text or image watermarks to PDF pages.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Watermark text</label>
          <input type="text" id="wmText" placeholder="e.g. CONFIDENTIAL"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label>Opacity (%)</label>
            <input type="range" id="wmOpacity" min="5" max="100" value="30"/>
          </div>
          <div>
            <label>Rotation (°)</label>
            <input type="number" id="wmRotation" value="45"/>
          </div>
        </div>
        <div>
          <label>Color</label>
          <input type="color" id="wmColor" value="#cccccc"/>
        </div>
      </div>`,
    processLabel: 'Adding watermark...',
    process: async (files, opts) => watermarkPDF(files[0], opts)
  },
  redact: {
    icon: '⬛', title: 'Redact PDF', desc: 'Permanently black out sensitive content.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Text to redact (one per line)</label>
          <textarea id="redactText" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:0.9rem;" placeholder="Enter words or phrases to redact..."></textarea>
        </div>
      </div>`,
    processLabel: 'Redacting content...',
    process: async (files, opts) => redactPDF(files[0], opts)
  },
  compare: {
    icon: '🔍', title: 'Compare PDF', desc: 'Highlight differences between two PDF documents.',
    multi: true, accept: '.pdf', options: null,
    processLabel: 'Comparing PDFs...',
    process: async (files) => comparePDFs(files)
  },
  forms: {
    icon: '📋', title: 'PDF Forms', desc: 'Create fillable PDF forms or fill existing ones.',
    multi: false, accept: '.pdf', options: null,
    processLabel: 'Loading form editor...',
    process: async (files) => handleForms(files[0])
  },
  protect: {
    icon: '🔐', title: 'Protect PDF', desc: 'Encrypt your PDF with a password.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Open password</label>
          <input type="password" id="protectPass" placeholder="Password to open PDF"/>
        </div>
        <div>
          <label>Owner password (optional)</label>
          <input type="password" id="protectOwner" placeholder="Password for full permissions"/>
        </div>
        <div>
          <label>Permissions</label>
          <select id="protectPerms">
            <option value="all">Allow all</option>
            <option value="noprint">Prevent printing</option>
            <option value="nocopy">Prevent copying</option>
            <option value="readonly">Read only</option>
          </select>
        </div>
      </div>`,
    processLabel: 'Encrypting PDF...',
    process: async (files, opts) => protectPDF(files[0], opts)
  },
  unlock: {
    icon: '🔓', title: 'Unlock PDF', desc: 'Remove password protection from your PDF.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>PDF Password</label>
          <input type="password" id="unlockPass" placeholder="Enter current password"/>
        </div>
      </div>`,
    processLabel: 'Unlocking PDF...',
    process: async (files, opts) => unlockPDF(files[0], opts)
  },
  summarize: {
    icon: '🤖', title: 'AI PDF Summarizer', desc: 'Get an intelligent summary of your PDF using AI.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Summary style</label>
          <select id="summaryStyle">
            <option value="bullets">Bullet points</option>
            <option value="paragraph">Paragraph</option>
            <option value="executive">Executive summary</option>
            <option value="qa">Q&A format</option>
          </select>
        </div>
        <div>
          <label>Length</label>
          <select id="summaryLength">
            <option value="brief">Brief (3-5 points)</option>
            <option value="medium" selected>Medium (5-10 points)</option>
            <option value="detailed">Detailed (full analysis)</option>
          </select>
        </div>
      </div>`,
    processLabel: 'AI is reading your PDF...',
    process: async (files, opts) => aiSummarize(files[0], opts)
  },
  translate: {
    icon: '🌍', title: 'AI PDF Translator', desc: 'Translate your PDF to 50+ languages with AI.',
    multi: false, accept: '.pdf',
    options: `
      <div class="modal-options">
        <div>
          <label>Target language</label>
          <select id="translateLang">
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Italian">Italian</option>
            <option value="Portuguese">Portuguese</option>
            <option value="Dutch">Dutch</option>
            <option value="Russian">Russian</option>
            <option value="Japanese">Japanese</option>
            <option value="Chinese (Simplified)">Chinese (Simplified)</option>
            <option value="Arabic">Arabic</option>
            <option value="Hindi">Hindi</option>
            <option value="Korean">Korean</option>
            <option value="Turkish">Turkish</option>
            <option value="Polish">Polish</option>
            <option value="Swedish">Swedish</option>
          </select>
        </div>
        <div>
          <label>Translation quality</label>
          <select id="translateQuality">
            <option value="standard">Standard</option>
            <option value="professional">Professional (slower)</option>
          </select>
        </div>
      </div>`,
    processLabel: 'AI is translating your PDF...',
    process: async (files, opts) => aiTranslate(files[0], opts)
  }
};
