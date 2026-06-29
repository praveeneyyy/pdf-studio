const { PDFDocument, degrees, rgb } = require('pdf-lib');
const createQpdf = require('@neslinesli93/qpdf-wasm').default;
const fs = require('fs');
const path = require('path');
const envConfig = require('../config/envConfig');

const uploadDir = envConfig.uploadDir;

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

const pdfService = {
    async mergePdfs(files) {
        const qpdf = await createQpdf();
        const inputFiles = [];
        for (let i = 0; i < files.length; i++) {
            const filename = `/input${i}.pdf`;
            qpdf.FS.writeFile(filename, fs.readFileSync(files[i].path));
            inputFiles.push(filename);
        }
        qpdf.callMain(['--empty', '--pages', ...inputFiles, '--', '/output.pdf']);
        const mergedBytes = qpdf.FS.readFile('/output.pdf');
        const out = path.join(uploadDir, `merged-${Date.now()}.pdf`);
        fs.writeFileSync(out, mergedBytes);
        return out;
    },

    async splitPdf(file, rangesStr) {
        const ranges = rangesStr ? rangesStr.replace(/\s+/g, '') : '1'; 
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(file.path);
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--empty', '--pages', '/input.pdf', ranges, '--', '/output.pdf']);
        const splitBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `split-${Date.now()}.pdf`);
        fs.writeFileSync(out, splitBytes);
        return out;
    },

    async removePages(file, ranges) {
        const pdf = await PDFDocument.load(fs.readFileSync(file.path), { ignoreEncryption: true });
        const totalPages = pdf.getPageCount();
        let toRemove = parseRanges(ranges, totalPages);
        
        const keepIndices = [];
        for (let i = 0; i < totalPages; i++) {
            if (!toRemove.includes(i)) keepIndices.push(i + 1);
        }
        const keepRange = keepIndices.join(',') || '1';
        
        const qpdf = await createQpdf();
        qpdf.FS.writeFile('/input.pdf', fs.readFileSync(file.path));
        qpdf.callMain(['--empty', '--pages', '/input.pdf', keepRange, '--', '/output.pdf']);
        const outBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `removed-${Date.now()}.pdf`);
        fs.writeFileSync(out, outBytes);
        return out;
    },

    async rotatePdf(file, degreeStr) {
        const rotation = parseInt(degreeStr || '90');
        const qpdf = await createQpdf();
        qpdf.FS.writeFile('/input.pdf', fs.readFileSync(file.path));
        qpdf.callMain(['--rotate=+' + rotation, '/input.pdf', '/output.pdf']);
        const rotatedBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `rotated-${Date.now()}.pdf`);
        fs.writeFileSync(out, rotatedBytes);
        return out;
    },

    async handlePdfForms(file, action, dataStr) {
        const pdfBytes = fs.readFileSync(file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        
        if (action === 'fill' && dataStr) {
            const data = JSON.parse(dataStr);
            for (const [key, value] of Object.entries(data)) {
                try {
                    const field = form.getTextField(key);
                    if (field) field.setText(value);
                } catch (err) {}
            }
            form.flatten();
            const bytes = await pdfDoc.save({ useObjectStreams: true });
            const out = path.join(uploadDir, `filled-${Date.now()}.pdf`);
            fs.writeFileSync(out, bytes);
            return { type: 'download', path: out };
        } else {
            const fields = form.getFields();
            const fieldNames = fields.map(f => f.getName());
            return { type: 'json', data: { message: "Form extracted", fields: fieldNames } };
        }
    },

    async watermarkPdf(file, textStr) {
        const text = textStr || 'CONFIDENTIAL';
        const pdfBytes = fs.readFileSync(file.path);
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
        return out;
    },

    async addPageNumbers(file) {
        const pdfBytes = fs.readFileSync(file.path);
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
        return out;
    },

    async protectPdf(file, passwordStr) {
        const password = passwordStr || 'password';
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(file.path);
        
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--encrypt', password, password, '256', '--', '/input.pdf', '/output.pdf']);
        
        const encryptedBytes = qpdf.FS.readFile('/output.pdf');
        const out = path.join(uploadDir, `protected-${Date.now()}.pdf`);
        fs.writeFileSync(out, encryptedBytes);
        return out;
    },

    async unlockPdf(file, passwordStr) {
        const password = passwordStr || '';
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(file.path);
        
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--password=' + password, '--decrypt', '/input.pdf', '/output.pdf']);
        
        const decryptedBytes = qpdf.FS.readFile('/output.pdf');
        const out = path.join(uploadDir, `unlocked-${Date.now()}.pdf`);
        fs.writeFileSync(out, decryptedBytes);
        return out;
    },

    async extractPages(file, rangesStr) {
        const ranges = rangesStr ? rangesStr.replace(/\s+/g, '') : '1'; 
        const qpdf = await createQpdf();
        const pdfBytes = fs.readFileSync(file.path);
        qpdf.FS.writeFile('/input.pdf', pdfBytes);
        qpdf.callMain(['--empty', '--pages', '/input.pdf', ranges, '--', '/output.pdf']);
        const extractedBytes = qpdf.FS.readFile('/output.pdf');
        
        const out = path.join(uploadDir, `extracted-${Date.now()}.pdf`);
        fs.writeFileSync(out, extractedBytes);
        return out;
    }
};

module.exports = pdfService;
