const express = require('express');
const cors = require('cors');
const multer = require('multer');
const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3005;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const cleanup = (files) => {
    files.forEach(f => {
        if(fs.existsSync(f.path || f)) fs.unlinkSync(f.path || f);
    });
};

const { PDFDocument, rgb } = require('pdf-lib');
const mammoth = require('mammoth');

const convertToPdf = (req, res, inputType) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    
    const enterPath = req.file.path;
    const extend = '.pdf';
    
    try {
        const file = fs.readFileSync(enterPath);
        
        libre.convert(file, extend, undefined, async (err, done) => {
            if (err) {
                console.log(`LibreOffice not found or failed. Attempting fallback...`);
                
                // Fallback purely for Word documents to extract plain text
                if (inputType === 'word') {
                    try {
                        const result = await mammoth.extractRawText({path: enterPath});
                        const text = result.value || 'No text could be extracted.';
                        
                        const pdfDoc = await PDFDocument.create();
                        let page = pdfDoc.addPage();
                        const { height } = page.getSize();
                        
                        const lines = text.split('\n');
                        let y = height - 50;
                        for (const line of lines) {
                            if (y < 50) {
                                page = pdfDoc.addPage();
                                y = height - 50;
                            }
                            if (line.trim()) {
                                // Basic sanitization for standard fonts
                                const safeLine = line.replace(/[^\x20-\x7E]/g, '');
                                page.drawText(safeLine.substring(0, 80), { x: 50, y, size: 12, color: rgb(0,0,0) });
                                y -= 20;
                            }
                        }
                        
                        const pdfBytes = await pdfDoc.save();
                        const outputPath = path.join(uploadDir, `fallback-${Date.now()}.pdf`);
                        fs.writeFileSync(outputPath, pdfBytes);
                        
                        cleanup([req.file]);
                        return res.download(outputPath, 'converted.pdf', () => cleanup([{path: outputPath}]));
                        
                    } catch (fallbackErr) {
                        console.error(fallbackErr);
                        cleanup([req.file]);
                        return res.status(501).send('Conversion Failed. LibreOffice is missing and plain-text fallback failed.');
                    }
                }
                
                cleanup([req.file]);
                return res.status(501).send(`Conversion Failed. This tool requires LibreOffice to be installed and added to the system PATH. Endpoint structure is ready, but binary is missing.`);
            }
            
            const outputPath = path.join(uploadDir, `converted-${Date.now()}.pdf`);
            fs.writeFileSync(outputPath, done);
            cleanup([req.file]);
            
            res.download(outputPath, 'converted.pdf', () => {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            });
        });
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        cleanup([req.file]);
        res.status(500).send('Internal Server Error during conversion.');
    }
};

app.post('/api/word-to-pdf', upload.single('document'), (req, res) => {
    convertToPdf(req, res, 'word');
});

app.post('/api/ppt-to-pdf', upload.single('document'), (req, res) => {
    convertToPdf(req, res, 'ppt');
});

app.post('/api/excel-to-pdf', upload.single('document'), (req, res) => {
    convertToPdf(req, res, 'excel');
});

const pdfParse = require('pdf-parse');
const docx = require('docx');

app.post('/api/pdf-to-word', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');
        
        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new pdfParse.PDFParse({ data: dataBuffer });
        let text = '';
        try {
            const data = await parser.getText();
            text = data.text;
        } finally {
            await parser.destroy();
        }
        
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: text.split('\n').map(line => 
                    new docx.Paragraph({
                        children: [new docx.TextRun(line)]
                    })
                )
            }]
        });
        
        const b64string = await docx.Packer.toBase64String(doc);
        const out = path.join(uploadDir, `converted-${Date.now()}.docx`);
        fs.writeFileSync(out, Buffer.from(b64string, 'base64'));
        
        cleanup([req.file]);
        res.download(out, 'converted.docx', () => {
            if (fs.existsSync(out)) fs.unlinkSync(out);
        });
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        res.status(500).send('PDF to Word Error');
    }
});

app.post('/api/pdf-to-ppt', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');
        // Mocking PPT conversion as it requires enterprise libraries
        res.status(501).send('PDF to PowerPoint requires an enterprise conversion engine (e.g. CloudConvert API). Endpoint is structurally ready.');
        cleanup([req.file]);
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('PDF to PPT Error');
    }
});

app.post('/api/pdf-to-excel', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');
        // Mocking Excel conversion as it requires tabular extraction heuristics
        res.status(501).send('PDF to Excel requires an enterprise tabular extraction engine (e.g. Adobe PDF API). Endpoint is structurally ready.');
        cleanup([req.file]);
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('PDF to Excel Error');
    }
});

app.listen(port, () => console.log(`Office Service listening at http://localhost:${port}`));
