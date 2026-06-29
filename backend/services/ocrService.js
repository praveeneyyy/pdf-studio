const Tesseract = require('tesseract.js');

const ocrService = {
    async performOcr(file) {
        // Tesseract.js performs high-fidelity OCR on an image file
        const result = await Tesseract.recognize(file.path, 'eng', {
            logger: m => console.log(`[OCR Service] ${m.status}: ${Math.round(m.progress * 100)}%`)
        });
        
        return result.data.text;
    }
};

module.exports = ocrService;
