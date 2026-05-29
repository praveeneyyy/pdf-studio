const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
// const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js'); 
// (Skipping pdf to jpg true render for MVP if canvas fails, we will mock for now unless we have binaries)

const app = express();
const port = 3002;

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

app.post('/api/compress', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        // MVP: Just re-save to drop unreferenced objects
        const pdf = await PDFDocument.load(fs.readFileSync(req.file.path));
        const bytes = await pdf.save({ useObjectStreams: false });
        
        const out = path.join(uploadDir, `compressed-${Date.now()}.pdf`);
        fs.writeFileSync(out, bytes);
        cleanup([req.file]);
        res.download(out, 'compressed.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Compress error');
    }
});

app.post('/api/jpg-to-pdf', upload.array('images', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).send('No files');
        const pdfDoc = await PDFDocument.create();
        
        for (const file of req.files) {
            const imgBytes = fs.readFileSync(file.path);
            let image;
            if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
                image = await pdfDoc.embedJpg(imgBytes);
            } else if (file.mimetype === 'image/png') {
                image = await pdfDoc.embedPng(imgBytes);
            } else {
                continue; // Skip unsupported
            }
            
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }
        
        const bytes = await pdfDoc.save();
        const out = path.join(uploadDir, `converted-${Date.now()}.pdf`);
        fs.writeFileSync(out, bytes);
        cleanup(req.files);
        res.download(out, 'converted.pdf', () => cleanup([{path: out}]));
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Convert error');
    }
});

app.post('/api/pdf-to-jpg', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        res.status(501).send('PDF to JPG handled by frontend.');
        cleanup([req.file]);
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        res.status(500).send('Convert error');
    }
});

app.listen(port, () => console.log(`Conversion Service listening at http://localhost:${port}`));
