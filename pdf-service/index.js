const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument, degrees } = require('pdf-lib');
const createQpdf = require('@neslinesli93/qpdf-wasm').default;
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper to cleanup
const cleanup = (files) => {
    files.forEach(f => {
        if(fs.existsSync(f.path || f)) fs.unlinkSync(f.path || f);
    });
};

app.post('/api/merge', upload.array('pdfs', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).send('No files');
        const qpdf = await createQpdf();
        const inputFiles = [];
        for (let i = 0; i < req.files.length; i++) {
            const filename = `/input${i}.pdf`;
            qpdf.FS.writeFile(filename, fs.readFileSync(req.files[i].path));
            inputFiles.push(filename);
        }
        qpdf.callMain(['--empty', '--pages', ...inputFiles, '--', '/output.pdf']);
        const mergedBytes = qpdf.FS.readFile('/output.pdf');
        const out = path.join(uploadDir, `merged-${Date.now()}.pdf`);
        fs.writeFileSync(out, mergedBytes);
        cleanup(req.files);
        res.download(out, 'merged.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Merge error');
    }
});

app.post('/api/split', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const ranges = req.body.ranges ? req.body.ranges.replace(/\s+/g, '') : '1'; 
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(req.file.path);
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--empty', '--pages', '/input.pdf', ranges, '--', '/output.pdf']);
        const splitBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `split-${Date.now()}.pdf`);
        fs.writeFileSync(out, splitBytes);
        cleanup([req.file]);
        res.download(out, 'split.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Split error');
    }
});

app.post('/api/remove-pages', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const ranges = req.body.ranges; // e.g. "1, 3-5"
        if(!ranges) return res.status(400).send('No ranges provided');
        
        const pdf = await PDFDocument.load(fs.readFileSync(req.file.path), { ignoreEncryption: true });
        const totalPages = pdf.getPageCount();
        let toRemove = parseRanges(ranges, totalPages);
        
        const keepIndices = [];
        for (let i = 0; i < totalPages; i++) {
            if (!toRemove.includes(i)) keepIndices.push(i + 1);
        }
        const keepRange = keepIndices.join(',') || '1';
        
        const qpdf = await createQpdf();
        qpdf.FS.writeFile('/input.pdf', fs.readFileSync(req.file.path));
        qpdf.callMain(['--empty', '--pages', '/input.pdf', keepRange, '--', '/output.pdf']);
        const outBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `removed-${Date.now()}.pdf`);
        fs.writeFileSync(out, outBytes);
        cleanup([req.file]);
        res.download(out, 'removed.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Remove error');
    }
});

app.post('/api/rotate', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const degreeStr = req.body.degrees || '90';
        const rotation = parseInt(degreeStr);
        
        const qpdf = await createQpdf();
        qpdf.FS.writeFile('/input.pdf', fs.readFileSync(req.file.path));
        qpdf.callMain(['--rotate=+' + rotation, '/input.pdf', '/output.pdf']);
        const rotatedBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `rotated-${Date.now()}.pdf`);
        fs.writeFileSync(out, rotatedBytes);
        cleanup([req.file]);
        res.download(out, 'rotated.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Rotate error');
    }
});

function parseRanges(ranges, max) {
    let indices = [];
    ranges.split(',').forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) indices.push(i - 1);
        } else {
            indices.push(Number(part) - 1);
        }
    });
    return indices;
}

app.post('/api/pdf-forms', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        
        if (req.body.action === 'fill' && req.body.data) {
            const data = JSON.parse(req.body.data);
            for (const [key, value] of Object.entries(data)) {
                try {
                    const field = form.getTextField(key);
                    if(field) field.setText(value);
                } catch(err) {}
            }
            form.flatten();
            const bytes = await pdfDoc.save({ useObjectStreams: true });
            const out = path.join(uploadDir, `filled-${Date.now()}.pdf`);
            fs.writeFileSync(out, bytes);
            cleanup([req.file]);
            res.download(out, 'filled.pdf', () => cleanup([{path: out}]));
        } else {
            const fields = form.getFields();
            const fieldNames = fields.map(f => f.getName());
            cleanup([req.file]);
            res.json({ message: "Form extracted", fields: fieldNames });
        }
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        res.status(500).send('Form error');
    }
});

const { rgb } = require('pdf-lib');

app.post('/api/watermark', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const text = req.body.text || 'CONFIDENTIAL';
        
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        
        pages.forEach((page) => {
            const { width, height } = page.getSize();
            page.drawText(text, {
                x: width / 2 - 100,
                y: height / 2,
                size: 50,
                color: rgb(0.95, 0.1, 0.1),
                opacity: 0.5,
                rotate: degrees(45)
            });
        });
        
        const bytes = await pdfDoc.save({ useObjectStreams: true });
        const out = path.join(uploadDir, `watermark-${Date.now()}.pdf`);
        fs.writeFileSync(out, bytes);
        cleanup([req.file]);
        res.download(out, 'watermarked.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Watermark error');
    }
});

app.post('/api/page-numbers', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        
        pages.forEach((page, idx) => {
            const { width } = page.getSize();
            page.drawText(`Page ${idx + 1} of ${pages.length}`, {
                x: width / 2 - 30,
                y: 20,
                size: 12,
                color: rgb(0, 0, 0)
            });
        });
        
        const bytes = await pdfDoc.save({ useObjectStreams: true });
        const out = path.join(uploadDir, `numbered-${Date.now()}.pdf`);
        fs.writeFileSync(out, bytes);
        cleanup([req.file]);
        res.download(out, 'numbered.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Page numbers error');
    }
});

app.post('/api/protect', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const password = req.body.password || 'password';
        
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(req.file.path);
        
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--encrypt', password, password, '256', '--', '/input.pdf', '/output.pdf']);
        
        const encryptedBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `protected-${Date.now()}.pdf`);
        fs.writeFileSync(out, encryptedBytes);
        cleanup([req.file]);
        res.download(out, 'protected.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        res.status(500).send('Protect error');
    }
});

app.post('/api/unlock', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const password = req.body.password || '';
        
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(req.file.path);
        
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--password=' + password, '--decrypt', '/input.pdf', '/output.pdf']);
        
        const decryptedBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `unlocked-${Date.now()}.pdf`);
        fs.writeFileSync(out, decryptedBytes);
        cleanup([req.file]);
        res.download(out, 'unlocked.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Unlock error (Ensure password is correct)');
    }
});

app.post('/api/extract', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const ranges = req.body.ranges ? req.body.ranges.replace(/\s+/g, '') : '1'; 
        if(!req.body.ranges) return res.status(400).send('No ranges provided');
        
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(req.file.path);
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--empty', '--pages', '/input.pdf', ranges, '--', '/output.pdf']);
        const extractedBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `extracted-${Date.now()}.pdf`);
        fs.writeFileSync(out, extractedBytes);
        cleanup([req.file]);
        res.download(out, 'extracted.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Extract error');
    }
});

app.listen(port, () => console.log(`PDF Service listening at http://localhost:${port}`));

