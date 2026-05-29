const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3003;

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

app.post('/api/ocr', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        
        // Tesseract.js can perform OCR on an image file
        const result = await Tesseract.recognize(req.file.path, 'eng', {
            logger: m => console.log(m)
        });
        
        cleanup([req.file]);
        res.json({ text: result.data.text });
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        res.status(500).send('OCR error');
    }
});

app.listen(port, () => console.log(`OCR Service listening at http://localhost:${port}`));
