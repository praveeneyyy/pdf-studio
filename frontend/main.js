let currentTool = null;
let uploadedFiles = [];
const API_BASE = 'http://localhost:3000/api'; // Pointing to API Gateway

// Markdown Rendering Helper with offline fallback
const renderMarkdown = (text) => {
  if (!text) return '';
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(text);
  }
  // Local regex-based fallback for standard markdown elements
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/^[*-] (.*?)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>')
    .replace(/\n/g, '<br>');
};

const homeView = document.getElementById('home-view');
const toolView = document.getElementById('tool-view');
const logo = document.getElementById('sidebar-logo');
const backHomeBtn = document.getElementById('back-home');

const navAllTools = document.getElementById('nav-all-tools');
const navAiTools = document.getElementById('nav-ai-tools');
const navPdfTools = document.getElementById('nav-pdf-tools');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const actionPanel = document.getElementById('action-panel');
const actionBtn = document.getElementById('action-btn');
const inputOptions = document.getElementById('input-options');
const inputLabel = document.getElementById('input-label');
const customInput = document.getElementById('custom-input');
const loadingSpinner = document.getElementById('loading-spinner');
const toolTitle = document.getElementById('tool-title');
const toolDesc = document.getElementById('tool-desc');
const resultBox = document.getElementById('result-box');

// Gemini Side Panel elements
const geminiSidePanel = document.getElementById('gemini-side-panel');
const geminiResultContent = document.getElementById('gemini-result-content');
const copyResultBtn = document.getElementById('copy-result-btn');

// Side Chat elements
const sideChatInputArea = document.getElementById('side-chat-input-area');
const sideChatInput = document.getElementById('side-chat-input');
const sideChatSend = document.getElementById('side-chat-send');
const geminiOptionsContainer = document.getElementById('gemini-options-container');

const allToolLinks = document.querySelectorAll('a[data-tool]');

// Initialize Lucide Icons
if (window.lucide) {
  lucide.createIcons();
}

// Go Home Logic
const goHome = () => {
  currentTool = null;
  homeView.classList.add('active');
  toolView.classList.remove('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  
  // Coordinate Top Navbar Links
  document.querySelectorAll('.navbar-link').forEach(l => l.classList.remove('active'));
  if (navAllTools) navAllTools.classList.add('active');
  
  // Hide Side Panel
  if (geminiSidePanel) geminiSidePanel.style.display = 'none';
  
  window.history.pushState(null, '', '/');
};

if (logo) logo.addEventListener('click', goHome);
if (backHomeBtn) backHomeBtn.addEventListener('click', goHome);
if (navAllTools) {
  navAllTools.addEventListener('click', (e) => {
    e.preventDefault();
    goHome();
  });
}

// Setup Navigation
allToolLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    const toolId = link.getAttribute('data-tool');
    
    if (toolId && toolId !== 'null') {
      e.preventDefault();
      document.activeElement.blur();
      
      currentTool = toolId;
      homeView.classList.remove('active');
      toolView.classList.add('active');
      
      // Update sidebar active link highlights
      document.querySelectorAll('.nav-link').forEach(l => {
        if (l.getAttribute('data-tool') === toolId) {
          l.classList.add('active');
        } else {
          l.classList.remove('active');
        }
      });
      
      // Update top navbar active link highlights
      document.querySelectorAll('.navbar-link').forEach(l => l.classList.remove('active'));
      if (['summarize', 'chat'].includes(toolId)) {
        if (navAiTools) navAiTools.classList.add('active');
      } else {
        if (navPdfTools) navPdfTools.classList.add('active');
      }
      
      updateToolUI();
    }
  });
});

function updateToolUI() {
  uploadedFiles = [];
  renderFileList();
  actionPanel.style.display = 'none';
  inputOptions.style.display = 'none';
  resultBox.style.display = 'none';
  customInput.value = '';
  
  if (geminiOptionsContainer) {
    if (currentTool === 'summarize') {
      geminiOptionsContainer.style.display = 'flex';
    } else {
      geminiOptionsContainer.style.display = 'none';
    }
  }
  if (sideChatInputArea) {
    sideChatInputArea.style.display = 'none';
  }
  
  // Dynamic Gemini Side Panel Toggling
  const sidePanelTools = ['summarize', 'chat', 'ocr', 'compare'];
  if (geminiSidePanel) {
    if (sidePanelTools.includes(currentTool)) {
      geminiSidePanel.style.display = 'flex';
      if (geminiResultContent) {
        geminiResultContent.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 3rem 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;">
            <i data-lucide="message-square" style="color: var(--text-muted); width: 32px; height: 32px;"></i>
            <p style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">Waiting for document analysis...</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
    } else {
      geminiSidePanel.style.display = 'none';
    }
  }
  
  const toolConfigs = {
    'merge': { title: 'Merge PDF', desc: 'Combine PDFs in the order you want.', btn: 'Merge PDF', multi: true, accept: 'application/pdf' },
    'split': { title: 'Split PDF', desc: 'Separate pages easily.', btn: 'Split PDF', multi: false, inputTitle: 'Page Ranges (e.g. 1-2, 5):', accept: 'application/pdf' },
    'remove-pages': { title: 'Remove Pages', desc: 'Delete specific pages from a PDF.', btn: 'Remove Pages', multi: false, inputTitle: 'Pages to Remove (e.g. 2, 4-6):', accept: 'application/pdf' },
    'rotate': { title: 'Rotate PDF', desc: 'Rotate all pages by degrees.', btn: 'Rotate PDF', multi: false, inputTitle: 'Rotation Degrees (90, 180, 270):', defaultInput: '90', accept: 'application/pdf' },
    'compress': { title: 'Compress PDF', desc: 'Reduce file size.', btn: 'Compress PDF', multi: false, accept: 'application/pdf' },
    'jpg-to-pdf': { title: 'JPG to PDF', desc: 'Convert images to PDF.', btn: 'Convert to PDF', multi: true, accept: 'image/jpeg, image/png' },
    'pdf-to-jpg': { title: 'PDF to JPG', desc: 'Convert PDF pages to images.', btn: 'Convert to JPG', multi: false, accept: 'application/pdf' },
    'ocr': { title: 'OCR PDF', desc: 'Extract text from an image.', btn: 'Extract Text', multi: false, accept: 'image/jpeg, image/png, application/pdf' },
    'summarize': { title: 'AI Summarizer', desc: 'Summarize a PDF document using AI.', btn: 'Summarize PDF', multi: false, accept: 'application/pdf' },
    'chat': { title: 'Chat with PDF', desc: 'Ask questions about your document.', btn: 'Ask Question', multi: false, inputTitle: 'Your Question:', defaultInput: 'What is this document about?', accept: 'application/pdf' },
    'word-to-pdf': { title: 'Word to PDF', desc: 'Convert Word documents to PDF.', btn: 'Convert to PDF', multi: false, accept: '.doc,.docx' },
    'ppt-to-pdf': { title: 'PowerPoint to PDF', desc: 'Convert PPT to PDF.', btn: 'Convert to PDF', multi: false, accept: '.ppt,.pptx' },
    'excel-to-pdf': { title: 'Excel to PDF', desc: 'Convert Excel to PDF.', btn: 'Convert to PDF', multi: false, accept: '.xls,.xlsx' },
    'pdf-to-word': { title: 'PDF to Word', desc: 'Extract text from a PDF to a Word Document.', btn: 'Convert to Word', multi: false, accept: 'application/pdf' },
    'pdf-to-ppt': { title: 'PDF to PowerPoint', desc: 'Convert PDF into a PPT presentation.', btn: 'Convert to PPT', multi: false, accept: 'application/pdf' },
    'pdf-to-excel': { title: 'PDF to Excel', desc: 'Extract tables into an Excel sheet.', btn: 'Convert to Excel', multi: false, accept: 'application/pdf' },
    'forms': { title: 'PDF Forms', desc: 'Extract or fill form fields. JSON data required for filling.', btn: 'Process Form', multi: false, inputTitle: 'JSON Data (leave blank to extract):', defaultInput: '{"field_name": "value"}', accept: 'application/pdf' },
    'compare': { title: 'Compare PDF', desc: 'Find textual differences between two PDFs. Upload exactly 2 files.', btn: 'Compare PDFs', multi: true, accept: 'application/pdf' },
    'watermark': { title: 'Add Watermark', desc: 'Stamp text over your PDF in seconds.', btn: 'Add Watermark', multi: false, inputTitle: 'Watermark Text:', defaultInput: 'CONFIDENTIAL', accept: 'application/pdf' },
    'page-numbers': { title: 'Add Page Numbers', desc: 'Add page numbers into PDFs with ease.', btn: 'Add Page Numbers', multi: false, accept: 'application/pdf' },
    'protect': { title: 'Protect PDF', desc: 'Encrypt your PDF with a password to keep sensitive data safe.', btn: 'Protect PDF', multi: false, inputTitle: 'Set Password:', defaultInput: '', accept: 'application/pdf' },
    'unlock': { title: 'Unlock PDF', desc: 'Remove PDF password security.', btn: 'Unlock PDF', multi: false, inputTitle: 'Enter Password:', defaultInput: '', accept: 'application/pdf' },
    'extract': { title: 'Extract Pages', desc: 'Get a new document containing only the desired pages.', btn: 'Extract Pages', multi: false, inputTitle: 'Pages to Extract (e.g., 1, 3-5):', defaultInput: '1', accept: 'application/pdf' }
  };

  const config = toolConfigs[currentTool];
  if (config) {
    toolTitle.textContent = config.title;
    toolDesc.textContent = config.desc;
    actionBtn.textContent = config.btn;
    fileInput.multiple = config.multi;
    fileInput.accept = config.accept;
    
    if (config.inputTitle) {
        inputOptions.style.display = 'flex';
        inputLabel.textContent = config.inputTitle;
        customInput.placeholder = config.defaultInput || '';
        customInput.value = config.defaultInput || '';
    }

    const dropZoneHelp = document.getElementById('drop-zone-help');
    if (dropZoneHelp) {
      let typeDesc = 'files';
      if (config.accept === 'application/pdf') typeDesc = 'PDF files (.pdf)';
      else if (config.accept === 'image/jpeg, image/png') typeDesc = 'Image files (.jpg, .jpeg, .png)';
      else if (config.accept === 'image/jpeg, image/png, application/pdf') typeDesc = 'Images (.jpg, .jpeg, .png) or PDF files';
      else if (config.accept === '.doc,.docx') typeDesc = 'Word documents (.doc, .docx)';
      else if (config.accept === '.ppt,.pptx') typeDesc = 'PowerPoint presentations (.ppt, .pptx)';
      else if (config.accept === '.xls,.xlsx') typeDesc = 'Excel sheets (.xls, .xlsx)';
      
      dropZoneHelp.textContent = `Drag & drop ${typeDesc} here, or click to browse`;
    }
  }
}

// Drag and Drop Events
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
  const allowedTypes = fileInput.accept.split(',').map(s => s.trim());
  const newFiles = Array.from(files).filter(f => {
    if (fileInput.accept.includes('.')) {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      return fileInput.accept.toLowerCase().includes(ext);
    }
    return allowedTypes.includes(f.type) || allowedTypes.includes('application/pdf');
  });
  
  if (!fileInput.multiple && newFiles.length > 0) {
    uploadedFiles = [newFiles[0]];
  } else {
    uploadedFiles = [...uploadedFiles, ...newFiles];
  }
  
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  
  if (uploadedFiles.length > 0) {
    actionPanel.style.display = 'flex';
    const config = {
        'split': true, 'remove-pages': true, 'rotate': true, 'chat': true, 'forms': true,
        'watermark': true, 'protect': true, 'unlock': true, 'extract': true
    };
    if (config[currentTool]) {
        inputOptions.style.display = 'flex';
    }
  } else {
    actionPanel.style.display = 'none';
    if (sideChatInputArea) sideChatInputArea.style.display = 'none';
    if (geminiResultContent && ['summarize', 'chat'].includes(currentTool)) {
      geminiResultContent.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 3rem 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;">
          <i data-lucide="message-square" style="color: var(--text-muted); width: 32px; height: 32px;"></i>
          <p style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">Waiting for document analysis...</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  uploadedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '<i data-lucide="trash-2"></i>';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      uploadedFiles.splice(index, 1);
      renderFileList();
    };
    
    item.appendChild(name);
    item.appendChild(removeBtn);
    fileList.appendChild(item);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Copy Action
if (copyResultBtn) {
  copyResultBtn.addEventListener('click', () => {
    if (geminiResultContent) {
      const textToCopy = geminiResultContent.innerText;
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Copied analysis to clipboard!');
      });
    }
  });
}

// Action execution
actionBtn.addEventListener('click', async () => {
  if (uploadedFiles.length === 0) return;

  actionBtn.style.display = 'none';
  loadingSpinner.style.display = 'block';
  resultBox.style.display = 'none';

  if (geminiResultContent) {
    geminiResultContent.innerHTML = `
      <div style="display:flex; justify-content:center; padding: 2.5rem 0;">
        <div class="spinner"></div>
      </div>
    `;
  }

  // Client-side execution for PDF to JPG to avoid missing native binaries on server
  if (currentTool === 'pdf-to-jpg') {
      try {
          const file = uploadedFiles[0];
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const zip = new JSZip();
          
          for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              const renderContext = { canvasContext: ctx, viewport: viewport };
              await page.render(renderContext).promise;
              
              const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
              zip.file(`page-${i}.jpg`, blob);
          }
          
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = window.URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          
          let baseName = 'result';
          const dotIndex = file.name.lastIndexOf('.');
          baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
          
          a.download = `${baseName}.zip`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          
          uploadedFiles = [];
          renderFileList();
      } catch (err) {
          console.error(err);
          alert('An error occurred during frontend conversion: ' + err.message);
      } finally {
          actionBtn.style.display = 'block';
          loadingSpinner.style.display = 'none';
      }
      return;
  }

  const formData = new FormData();
  let endpoint = '';

  const routes = {
      'merge': '/pdf/merge',
      'split': '/pdf/split',
      'remove-pages': '/pdf/remove-pages',
      'rotate': '/pdf/rotate',
      'compress': '/conversion/compress',
      'jpg-to-pdf': '/conversion/jpg-to-pdf',
      'pdf-to-jpg': '/conversion/pdf-to-jpg',
      'ocr': '/ocr/ocr',
      'summarize': '/ai/summarize',
      'chat': '/ai/chat',
      'word-to-pdf': '/office/word-to-pdf',
      'ppt-to-pdf': '/office/ppt-to-pdf',
      'excel-to-pdf': '/office/excel-to-pdf',
      'pdf-to-word': '/office/pdf-to-word',
      'pdf-to-ppt': '/office/pdf-to-ppt',
      'pdf-to-excel': '/office/pdf-to-excel',
      'forms': '/pdf/pdf-forms',
      'compare': '/ai/compare',
      'watermark': '/pdf/watermark',
      'page-numbers': '/pdf/page-numbers',
      'protect': '/pdf/protect',
      'unlock': '/pdf/unlock',
      'extract': '/pdf/extract'
  };

  endpoint = routes[currentTool];

  if (fileInput.multiple && currentTool !== 'compare') {
    uploadedFiles.forEach(f => {
        if(currentTool === 'jpg-to-pdf') formData.append('images', f);
        else formData.append('pdfs', f);
    });
  } else if (currentTool === 'compare') {
    uploadedFiles.forEach(f => formData.append('pdfs', f));
  } else {
    if(currentTool === 'ocr') formData.append('image', uploadedFiles[0]);
    else if(['word-to-pdf', 'ppt-to-pdf', 'excel-to-pdf'].includes(currentTool)) formData.append('document', uploadedFiles[0]);
    else formData.append('pdf', uploadedFiles[0]);
    
    if (['split', 'remove-pages', 'extract'].includes(currentTool)) formData.append('ranges', customInput.value);
    if (currentTool === 'rotate') formData.append('degrees', customInput.value);
    if (currentTool === 'chat') formData.append('question', customInput.value);
    if (currentTool === 'watermark') formData.append('text', customInput.value);
    if (currentTool === 'protect' || currentTool === 'unlock') formData.append('password', customInput.value);
    if (currentTool === 'forms' && customInput.value.trim() && customInput.value.trim() !== '{"field_name": "value"}') {
        formData.append('action', 'fill');
        formData.append('data', customInput.value);
    }
    
    if (currentTool === 'summarize') {
      const selectedOpts = [];
      if (document.getElementById('opt-bullet-summary')?.checked) selectedOpts.push('bullet_summary');
      if (document.getElementById('opt-key-points')?.checked) selectedOpts.push('key_points');
      if (document.getElementById('opt-title-gen')?.checked) selectedOpts.push('title_generation');
      if (document.getElementById('opt-flashcards')?.checked) selectedOpts.push('flashcards');
      if (document.getElementById('opt-quiz')?.checked) selectedOpts.push('quiz');
      
      formData.append('options', JSON.stringify(selectedOpts));
    }
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
        throw new Error('API request failed: ' + await response.text());
    }

    const sidePanelTools = ['summarize', 'chat', 'ocr', 'compare'];
    const expectsJson = sidePanelTools.includes(currentTool) || (currentTool === 'forms' && !formData.has('action'));

    if (expectsJson) {
        const data = await response.json();
        
        if (sidePanelTools.includes(currentTool)) {
            if (geminiResultContent) {
                geminiResultContent.innerHTML = '';
                
                if (currentTool === 'summarize' && (data.title || data.summary || data.key_points || data.flashcards || data.quiz)) {
                    const bubble = document.createElement('div');
                    bubble.className = 'chat-message gemini';
                    bubble.innerHTML = `<div class="analysis-text">${renderAnalysisJSON(data)}</div>`;
                    geminiResultContent.appendChild(bubble);
                    
                    if (sideChatInputArea) sideChatInputArea.style.display = 'flex';
                } else {
                    const outputText = data.text || data.summary || data.answer;
                    const bubble = document.createElement('div');
                    bubble.className = 'chat-message gemini';
                    bubble.innerHTML = `<div class="analysis-text">${renderMarkdown(outputText)}</div>`;
                    geminiResultContent.appendChild(bubble);
                    
                    if (currentTool === 'chat' && sideChatInputArea) {
                        sideChatInputArea.style.display = 'flex';
                    }
                }
                
                if (window.lucide) lucide.createIcons();
                geminiResultContent.scrollTop = geminiResultContent.scrollHeight;
            }
        } else {
            resultBox.style.display = 'block';
            if (currentTool === 'forms' && !formData.has('action')) {
                resultBox.textContent = "Extracted Form Fields:\n" + JSON.stringify(data.fields, null, 2);
            } else {
                const outputText = data.text || data.summary || data.answer;
                resultBox.textContent = outputText;
            }
        }
    } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = '.pdf';
        if (currentTool === 'pdf-to-jpg') ext = '.zip';
        else if (currentTool === 'pdf-to-word') ext = '.docx';
        else if (currentTool === 'pdf-to-ppt') ext = '.pptx';
        else if (currentTool === 'pdf-to-excel') ext = '.xlsx';
        
        let baseName = 'result';
        if (uploadedFiles.length > 0) {
            const originalName = uploadedFiles[0].name;
            const dotIndex = originalName.lastIndexOf('.');
            baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
        }
        
        a.download = `${baseName}${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        uploadedFiles = [];
        renderFileList();
    }
  } catch (error) {
    console.error(error);
    if (sidePanelTools.includes(currentTool) && geminiResultContent) {
        geminiResultContent.innerHTML = `<div style="color:var(--accent); font-weight:500; text-align:center; padding:1.5rem 0;">Error: ${error.message}</div>`;
    } else {
        alert('An error occurred during processing: ' + error.message);
    }
  } finally {
    actionBtn.style.display = 'block';
    loadingSpinner.style.display = 'none';
  }
});

// Structured JSON Render Helper for Gemini analysis
function renderAnalysisJSON(data) {
  let html = '';
  
  if (data.title) {
    html += `<h2 style="font-size: 1.25rem; font-weight: 700; color: var(--accent); margin-bottom: 1rem; border-bottom: 1.5px solid var(--border); padding-bottom: 0.5rem;">${data.title}</h2>`;
  }
  
  if (data.summary) {
    html += `<h3 style="font-size: 1rem; margin-top: 1.25rem; margin-bottom: 0.5rem; color: var(--text-primary); font-weight: 600;">Executive Summary</h3>`;
    if (Array.isArray(data.summary)) {
      html += `<ul style="margin-left: 1.25rem; margin-bottom: 1.25rem; list-style-type: disc;">`;
      data.summary.forEach(pt => {
        html += `<li style="margin-bottom: 0.4rem; font-size: 0.85rem; color: var(--text-secondary);">${pt}</li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.6;">${data.summary}</p>`;
    }
  }
  
  if (data.key_points) {
    html += `<h3 style="font-size: 1rem; margin-top: 1.25rem; margin-bottom: 0.5rem; color: var(--text-primary); font-weight: 600;">Key Takeaways</h3>`;
    if (Array.isArray(data.key_points)) {
      html += `<ul style="margin-left: 1.25rem; margin-bottom: 1.25rem; list-style-type: circle;">`;
      data.key_points.forEach(pt => {
        html += `<li style="margin-bottom: 0.4rem; font-size: 0.85rem; color: var(--text-secondary);">${pt}</li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.6;">${data.key_points}</p>`;
    }
  }
  
  if (data.flashcards && Array.isArray(data.flashcards) && data.flashcards.length > 0) {
    html += `<h3 style="font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.25rem; color: var(--text-primary); font-weight: 600;">AI Study Flashcards</h3>`;
    html += `<p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.75rem;">Click a card to reveal the answer.</p>`;
    html += `<div class="flashcards-container">`;
    data.flashcards.forEach((card, idx) => {
      html += `
        <div class="flashcard" onclick="this.classList.toggle('flipped')">
          <div class="flashcard-inner">
            <div class="flashcard-front">
              <span>Question ${idx + 1}</span>
              <p>${card.question}</p>
            </div>
            <div class="flashcard-back">
              <span>Answer</span>
              <p>${card.answer}</p>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  if (data.quiz && Array.isArray(data.quiz) && data.quiz.length > 0) {
    html += `<h3 style="font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary); font-weight: 600;">AI Quiz Challenge</h3>`;
    html += `<div class="quiz-container">`;
    data.quiz.forEach((item, qIdx) => {
      html += `
        <div class="quiz-item">
          <div class="quiz-question">${qIdx + 1}. ${item.question}</div>
          <div class="quiz-options">
      `;
      item.options.forEach((opt, oIdx) => {
        html += `
          <button class="quiz-option" onclick="handleQuizClick(this, ${oIdx}, ${item.correctAnswerIndex})">
            ${opt}
          </button>
        `;
      });
      html += `
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  return html;
}

// Global click handler for quiz questions (so it can be triggered from inline onclick)
window.handleQuizClick = (btn, selectedIdx, correctIdx) => {
  const container = btn.closest('.quiz-options');
  if (!container) return;
  const buttons = container.querySelectorAll('.quiz-option');
  
  // Disable all options for this question
  buttons.forEach(b => b.disabled = true);
  
  if (selectedIdx === correctIdx) {
    btn.classList.add('correct');
  } else {
    btn.classList.add('incorrect');
    buttons[correctIdx].classList.add('correct');
  }
};

// Conversational Side Panel Q&A
async function sendSideChatMessage() {
  if (!sideChatInput || !geminiResultContent) return;
  const question = sideChatInput.value.trim();
  if (!question || uploadedFiles.length === 0) return;
  
  sideChatInput.value = '';
  
  // Append User message bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-message user';
  userBubble.textContent = question;
  geminiResultContent.appendChild(userBubble);
  
  // Append Loading spinner bubble
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'chat-message gemini';
  loadingBubble.innerHTML = `
    <div style="display:flex; align-items:center; gap: 0.5rem;">
      <div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
      <span style="font-size: 0.8rem; color: var(--text-muted);">Thinking...</span>
    </div>
  `;
  geminiResultContent.appendChild(loadingBubble);
  geminiResultContent.scrollTop = geminiResultContent.scrollHeight;
  
  const formData = new FormData();
  formData.append('pdf', uploadedFiles[0]);
  
  // Build dynamic prompt if semantic search is active
  const semanticSearchActive = document.getElementById('opt-semantic-search')?.checked;
  let queryText = question;
  if (semanticSearchActive && currentTool === 'summarize') {
    queryText = `Search the document and find references/quotes for: "${question}". List the matching sections with page numbers if available.`;
  }
  formData.append('question', queryText);
  
  try {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const data = await response.json();
    const reply = data.text || data.summary || data.answer;
    
    loadingBubble.remove();
    
    const replyBubble = document.createElement('div');
    replyBubble.className = 'chat-message gemini';
    replyBubble.innerHTML = `<div class="analysis-text">${renderMarkdown(reply)}</div>`;
    geminiResultContent.appendChild(replyBubble);
  } catch (err) {
    console.error(err);
    loadingBubble.remove();
    
    const errorBubble = document.createElement('div');
    errorBubble.className = 'chat-message gemini';
    errorBubble.style.borderColor = 'var(--accent)';
    errorBubble.innerHTML = `<div style="color:var(--accent); font-weight:500;">Error: ${err.message}</div>`;
    geminiResultContent.appendChild(errorBubble);
  }
  
  geminiResultContent.scrollTop = geminiResultContent.scrollHeight;
}

// Side Chat event listeners
if (sideChatSend) {
  sideChatSend.addEventListener('click', sendSideChatMessage);
}
if (sideChatInput) {
  sideChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendSideChatMessage();
    }
  });
}
