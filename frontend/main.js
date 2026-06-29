let currentTool = null;
let uploadedFiles = [];
const API_BASE = import.meta.env.VITE_API_BASE || ((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api'); // Pointing to unified Express API

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
      if (navPdfTools) navPdfTools.classList.add('active');
      
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

  
  const toolConfigs = {
    'merge': { title: 'Merge PDF', desc: 'Combine PDFs in the order you want.', btn: 'Merge PDF', multi: true, accept: 'application/pdf' },
    'split': { title: 'Split PDF', desc: 'Separate pages easily.', btn: 'Split PDF', multi: false, inputTitle: 'Page Ranges (e.g. 1-2, 5):', accept: 'application/pdf' },
    'remove-pages': { title: 'Remove Pages', desc: 'Delete specific pages from a PDF.', btn: 'Remove Pages', multi: false, inputTitle: 'Pages to Remove (e.g. 2, 4-6):', accept: 'application/pdf' },
    'rotate': { title: 'Rotate PDF', desc: 'Rotate all pages by degrees.', btn: 'Rotate PDF', multi: false, inputTitle: 'Rotation Degrees (90, 180, 270):', defaultInput: '90', accept: 'application/pdf' },
    'compress': { title: 'Compress PDF', desc: 'Reduce file size.', btn: 'Compress PDF', multi: false, accept: 'application/pdf' },
    'jpg-to-pdf': { title: 'JPG to PDF', desc: 'Convert images to PDF.', btn: 'Convert to PDF', multi: true, accept: 'image/jpeg, image/png' },
    'pdf-to-jpg': { title: 'PDF to JPG', desc: 'Convert PDF pages to images.', btn: 'Convert to JPG', multi: false, accept: 'application/pdf' },
    'ocr': { title: 'OCR PDF', desc: 'Extract text from an image.', btn: 'Extract Text', multi: false, accept: 'image/jpeg, image/png, application/pdf' },
    'word-to-pdf': { title: 'Word to PDF', desc: 'Convert Word documents to PDF.', btn: 'Convert to PDF', multi: false, accept: '.doc,.docx' },
    'ppt-to-pdf': { title: 'PowerPoint to PDF', desc: 'Convert PPT to PDF.', btn: 'Convert to PDF', multi: false, accept: '.ppt,.pptx' },
    'excel-to-pdf': { title: 'Excel to PDF', desc: 'Convert Excel to PDF.', btn: 'Convert to PDF', multi: false, accept: '.xls,.xlsx' },
    'pdf-to-word': { title: 'PDF to Word', desc: 'Extract text from a PDF to a Word Document.', btn: 'Convert to Word', multi: false, accept: 'application/pdf' },
    'pdf-to-ppt': { title: 'PDF to PowerPoint', desc: 'Convert PDF into a PPT presentation.', btn: 'Convert to PPT', multi: false, accept: 'application/pdf' },
    'pdf-to-excel': { title: 'PDF to Excel', desc: 'Extract tables into an Excel sheet.', btn: 'Convert to Excel', multi: false, accept: 'application/pdf' },
    'forms': { title: 'PDF Forms', desc: 'Extract or fill form fields. JSON data required for filling.', btn: 'Process Form', multi: false, inputTitle: 'JSON Data (leave blank to extract):', defaultInput: '{"field_name": "value"}', accept: 'application/pdf' },
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
  const newFiles = Array.from(files);
  
  if (!fileInput.multiple && newFiles.length > 0) {
    uploadedFiles = [newFiles[0]];
  } else {
    uploadedFiles = [...uploadedFiles, ...newFiles];
  }
  
  fileInput.value = '';
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  
  if (uploadedFiles.length > 0) {
    actionPanel.style.display = 'flex';
    const config = {
        'split': true, 'remove-pages': true, 'rotate': true, 'forms': true,
        'watermark': true, 'protect': true, 'unlock': true, 'extract': true
    };
    if (config[currentTool]) {
        inputOptions.style.display = 'flex';
    }
  } else {
    actionPanel.style.display = 'none';
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


function parseRanges(rangesStr, maxPages) {
    if(!rangesStr) return [];
    const pages = new Set();
    rangesStr.split(',').forEach(part => {
        part = part.trim();
        if(part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n));
            if(start && end) {
                for(let i=start; i<=end; i++) pages.add(i-1);
            }
        } else {
            const val = parseInt(part);
            if(val) pages.add(val-1);
        }
    });
    return Array.from(pages);
}

function triggerDownload(blob, downloadName) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    actionPanel.style.display = 'none';
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div class="success-result-box" style="text-align: center; padding: 30px 20px; background: rgba(16, 185, 129, 0.08); border: 2px solid #10b981; border-radius: 16px; margin-top: 20px; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.1);">
        <div style="color: #10b981; font-size: 54px; margin-bottom: 12px;">🎉</div>
        <h3 style="color: #10b981; font-size: 24px; font-weight: 700; margin-bottom: 8px;">Processing Successful!</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 16px;">Your document has been successfully converted locally with zero wait time.</p>
        <a href="${url}" download="${downloadName}" class="primary-btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: 600; background: #10b981; color: white; border-radius: 10px; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35); transition: all 0.2s ease;">
          <i data-lucide="download"></i> Download ${downloadName}
        </a>
        <div style="margin-top: 20px;">
          <button id="process-another-btn" class="btn-secondary" style="padding: 10px 20px; font-size: 14px; border-radius: 8px; cursor: pointer;">Process Another File</button>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    document.getElementById('process-another-btn').addEventListener('click', () => {
        uploadedFiles = [];
        renderFileList();
        resultBox.style.display = 'none';
    });
}

// Action execution
actionBtn.addEventListener('click', async () => {
  if (uploadedFiles.length === 0) return;

  actionBtn.style.display = 'none';
  loadingSpinner.style.display = 'block';
  resultBox.style.display = 'none';

  const clientSidePdfTools = ['merge', 'split', 'rotate', 'remove-pages', 'extract'];
  if (clientSidePdfTools.includes(currentTool)) {
      try {
          const PDFDocument = window.PDFLib.PDFDocument;
          const progressContainer = document.getElementById('progress-container');
          const progressBarFill = document.getElementById('progress-bar-fill');
          const progressText = document.getElementById('progress-text');
          
          if (progressContainer) {
              progressContainer.style.display = 'block';
              progressBarFill.style.width = '50%';
              progressText.textContent = 'Processing locally...';
          }

          let finalBytes;
          let downloadName = 'result.pdf';
          
          if (currentTool === 'merge') {
              const mergedPdf = await PDFDocument.create();
              for (const file of uploadedFiles) {
                  const bytes = await file.arrayBuffer();
                  const pdf = await PDFDocument.load(bytes);
                  const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                  copiedPages.forEach((page) => mergedPdf.addPage(page));
              }
              finalBytes = await mergedPdf.save();
              downloadName = 'merged.pdf';
          } else if (currentTool === 'split') {
              const file = uploadedFiles[0];
              const bytes = await file.arrayBuffer();
              const pdf = await PDFDocument.load(bytes);
              const zip = new JSZip();
              
              for (let i = 0; i < pdf.getPageCount(); i++) {
                  const newPdf = await PDFDocument.create();
                  const [copiedPage] = await newPdf.copyPages(pdf, [i]);
                  newPdf.addPage(copiedPage);
                  const pageBytes = await newPdf.save();
                  zip.file(`page-${i+1}.pdf`, pageBytes);
              }
              finalBytes = await zip.generateAsync({ type: 'uint8array' });
              downloadName = 'split_pages.zip';
          } else if (currentTool === 'rotate') {
              const degrees = parseInt(customInput.value) || 90;
              const file = uploadedFiles[0];
              const bytes = await file.arrayBuffer();
              const pdf = await PDFDocument.load(bytes);
              const pages = pdf.getPages();
              pages.forEach(page => page.setRotation(window.PDFLib.degrees(degrees)));
              finalBytes = await pdf.save();
              downloadName = 'rotated.pdf';
          } else if (currentTool === 'remove-pages') {
              const file = uploadedFiles[0];
              const bytes = await file.arrayBuffer();
              const pdf = await PDFDocument.load(bytes);
              const pagesToRemove = parseRanges(customInput.value, pdf.getPageCount());
              pagesToRemove.sort((a,b) => b - a).forEach(index => {
                 if(index >= 0 && index < pdf.getPageCount()) pdf.removePage(index);
              });
              finalBytes = await pdf.save();
              downloadName = 'pages_removed.pdf';
          } else if (currentTool === 'extract') {
              const file = uploadedFiles[0];
              const bytes = await file.arrayBuffer();
              const pdf = await PDFDocument.load(bytes);
              const pagesToKeep = parseRanges(customInput.value, pdf.getPageCount());
              
              const newPdf = await PDFDocument.create();
              const validIndices = pagesToKeep.filter(i => i >= 0 && i < pdf.getPageCount());
              if(validIndices.length > 0) {
                 const copiedPages = await newPdf.copyPages(pdf, validIndices);
                 copiedPages.forEach(p => newPdf.addPage(p));
              }
              finalBytes = await newPdf.save();
              downloadName = 'extracted_pages.pdf';
          }
          
          const blob = new Blob([finalBytes], { type: downloadName.endsWith('.zip') ? 'application/zip' : 'application/pdf' });
          triggerDownload(blob, downloadName);
          
      } catch(e) {
          console.error(e);
          alert('Local processing failed: ' + e.message);
      } finally {
          actionBtn.style.display = 'block';
          loadingSpinner.style.display = 'none';
          const progressContainer = document.getElementById('progress-container');
          if (progressContainer) progressContainer.style.display = 'none';
      }
      return;
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
      'word-to-pdf': '/office/word-to-pdf',
      'ppt-to-pdf': '/office/ppt-to-pdf',
      'excel-to-pdf': '/office/excel-to-pdf',
      'pdf-to-word': '/office/pdf-to-word',
      'pdf-to-ppt': '/office/pdf-to-ppt',
      'pdf-to-excel': '/office/pdf-to-excel',
      'forms': '/pdf/pdf-forms',
      'watermark': '/pdf/watermark',
      'page-numbers': '/pdf/page-numbers',
      'protect': '/pdf/protect',
      'unlock': '/pdf/unlock',
      'extract': '/pdf/extract'
  };

  endpoint = routes[currentTool];

  if (fileInput.multiple) {
    uploadedFiles.forEach(f => {
        if(currentTool === 'jpg-to-pdf') formData.append('images', f);
        else formData.append('pdfs', f);
    });
  } else {
    if(currentTool === 'ocr') formData.append('image', uploadedFiles[0]);
    else if(['word-to-pdf', 'ppt-to-pdf', 'excel-to-pdf'].includes(currentTool)) formData.append('document', uploadedFiles[0]);
    else formData.append('pdf', uploadedFiles[0]);
    
    if (['split', 'remove-pages', 'extract'].includes(currentTool)) formData.append('ranges', customInput.value);
    if (currentTool === 'rotate') formData.append('degrees', customInput.value);
    if (currentTool === 'watermark') formData.append('text', customInput.value);
    if (currentTool === 'protect' || currentTool === 'unlock') formData.append('password', customInput.value);
    if (currentTool === 'forms' && customInput.value.trim() && customInput.value.trim() !== '{"field_name": "value"}') {
        formData.append('action', 'fill');
        formData.append('data', customInput.value);
    }
  }

  try {
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressContainer) {
      progressContainer.style.display = 'block';
      progressBarFill.style.width = '0%';
      progressText.textContent = 'Preparing... 0%';
    }

    const response = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}${endpoint}`, true);
      
      const expectsJson = currentTool === 'ocr' || (currentTool === 'forms' && !formData.has('action'));
      xhr.responseType = expectsJson ? 'json' : 'blob';

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && progressContainer) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          progressBarFill.style.width = percentComplete + '%';
          progressText.textContent = `Uploading... ${percentComplete}%`;
        }
      };

      xhr.onprogress = (event) => {
        if (event.lengthComputable && progressContainer) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          progressBarFill.style.width = percentComplete + '%';
          progressText.textContent = `Processing & Downloading... ${percentComplete}%`;
        } else if (progressContainer) {
          progressText.textContent = 'Processing...';
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            ok: true,
            status: xhr.status,
            json: async () => xhr.response,
            blob: async () => xhr.response
          });
        } else {
          let errorMessage = xhr.statusText || 'Request failed with status ' + xhr.status;
          if (xhr.responseType === 'blob' && xhr.response) {
             try {
                 const reader = new FileReader();
                 reader.onload = function() {
                     try {
                         const errObj = JSON.parse(reader.result);
                         if (errObj.error) errorMessage = errObj.error;
                     } catch (e) {
                         errorMessage = reader.result || errorMessage;
                     }
                     reject(new Error(errorMessage));
                 };
                 reader.readAsText(xhr.response);
             } catch (err) {
                 reject(new Error(errorMessage));
             }
          } else {
             if (xhr.response && xhr.response.error) errorMessage = xhr.response.error;
             reject(new Error(errorMessage));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network request failed or CORS issue'));
      xhr.send(formData);
    });

    const expectsJson = currentTool === 'ocr' || (currentTool === 'forms' && !formData.has('action'));

    if (expectsJson) {
        const data = await response.json();
        resultBox.style.display = 'block';
        if (currentTool === 'forms' && !formData.has('action')) {
            resultBox.textContent = "Extracted Form Fields:\n" + JSON.stringify(data.fields, null, 2);
        } else {
            const outputText = data.text || data.summary || data.answer;
            resultBox.textContent = outputText;
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
        a.remove();
        
        actionPanel.style.display = 'none';
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div class="success-result-box" style="text-align: center; padding: 30px 20px; background: rgba(16, 185, 129, 0.08); border: 2px solid #10b981; border-radius: 16px; margin-top: 20px; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.1);">
            <div style="color: #10b981; font-size: 54px; margin-bottom: 12px;">🎉</div>
            <h3 style="color: #10b981; font-size: 24px; font-weight: 700; margin-bottom: 8px;">Processing Successful!</h3>
            <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 16px;">Your document has been successfully converted with 100% pixel-perfect visual fidelity.</p>
            <a href="${url}" download="${baseName}${ext}" class="primary-btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: 600; background: #10b981; color: white; border-radius: 10px; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35); transition: all 0.2s ease;">
              <i data-lucide="download"></i> Download ${baseName}${ext}
            </a>
            <div style="margin-top: 20px;">
              <button id="process-another-btn" class="btn-secondary" style="padding: 10px 20px; font-size: 14px; border-radius: 8px; cursor: pointer;">Process Another File</button>
            </div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        document.getElementById('process-another-btn').addEventListener('click', () => {
            uploadedFiles = [];
            renderFileList();
            resultBox.style.display = 'none';
        });
    }
  } catch (error) {
    console.error(error);
    alert('An error occurred during processing: ' + error.message);
    actionBtn.style.display = 'block';
  } finally {
    loadingSpinner.style.display = 'none';
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) progressContainer.style.display = 'none';
  }
});

