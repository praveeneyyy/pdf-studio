const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Setup multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Routes

app.get('/', (req, res) => {
    res.send('PDF Tools API is running');
});

// MERGE PDF
app.post('/api/merge', upload.array('pdfs', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdfBytes = fs.readFileSync(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(uploadDir, `merged-${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        // Clean up uploaded files
        req.files.forEach(file => fs.unlinkSync(file.path));

        res.download(outputPath, 'merged.pdf', () => {
            // Clean up merged file after download
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        });

    } catch (error) {
        console.error('Error merging PDFs:', error);
        res.status(500).send('An error occurred while merging the PDFs.');
    }
});

// SPLIT PDF
app.post('/api/split', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const ranges = req.body.ranges; // e.g., "1-2,4" or just splitting all pages if empty
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdf = await PDFDocument.load(pdfBytes);
        
        // For simplicity in MVP, we will extract the specified ranges into a new PDF
        // Or if no ranges, split into multiple PDFs (we will just return a zip in the future)
        // For MVP, let's extract the first page if no range is given, or specific ranges.
        
        const splitPdf = await PDFDocument.create();
        let indicesToExtract = [];

        if (ranges) {
            const parts = ranges.split(',');
            parts.forEach(part => {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    for (let i = start; i <= end; i++) {
                        indicesToExtract.push(i - 1); // 0-indexed
                    }
                } else {
                    indicesToExtract.push(Number(part) - 1);
                }
            });
        } else {
            // Default extract first page
            indicesToExtract = [0];
        }

        // Filter valid indices
        const validIndices = indicesToExtract.filter(i => i >= 0 && i < pdf.getPageCount());

        if (validIndices.length === 0) {
             return res.status(400).send('Invalid page ranges.');
        }

        const copiedPages = await splitPdf.copyPages(pdf, validIndices);
        copiedPages.forEach((page) => splitPdf.addPage(page));

        const splitPdfBytes = await splitPdf.save();
        const outputPath = path.join(uploadDir, `split-${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, splitPdfBytes);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.download(outputPath, 'split.pdf', () => {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        });

    } catch (error) {
        console.error('Error splitting PDF:', error);
        res.status(500).send('An error occurred while splitting the PDF.');
    }
});

// COMPRESS PDF (Mock/Simple using pdf-lib resave)
app.post('/api/compress', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const pdfBytes = fs.readFileSync(req.file.path);
        const pdf = await PDFDocument.load(pdfBytes);
        
        // Re-saving using pdf-lib can sometimes optimize structure
        const compressedPdfBytes = await pdf.save({ useObjectStreams: false });
        
        const outputPath = path.join(uploadDir, `compressed-${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, compressedPdfBytes);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.download(outputPath, 'compressed.pdf', () => {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        });

    } catch (error) {
        console.error('Error compressing PDF:', error);
        res.status(500).send('An error occurred while compressing the PDF.');
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
