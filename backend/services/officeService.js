const libre = require('libreoffice-convert');
const fs = require('fs');
const path = require('path');
const envConfig = require('../config/envConfig');
const { verifyVisualFidelity } = require('../utils/visualVerification');

const uploadDir = envConfig.uploadDir;

// Automatic Native Rendering Engine Discovery for Windows/Linux
const possiblePaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice'
];
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        process.env.SOFFICE_PATH = p;
        console.log(`Native Rendering Engine discovered at: ${p}`);
        break;
    }
}

const officeService = {
    convertOfficeToPdf(file, inputType) {
        return new Promise((resolve, reject) => {
            const enterPath = file.path;
            const extend = '.pdf';
            
            try {
                const fileBuf = fs.readFileSync(enterPath);
                
                libre.convert(fileBuf, extend, undefined, (err, done) => {
                    if (err) {
                        console.error(`Native Rendering Engine not found or failed for ${inputType}:`, err);
                        // STRICT ELIMINATION: Never rebuild documents using HTML, Markdown, Canvas, jsPDF, Mammoth, or custom renderers.
                        const errorMsg = "Universal High-Fidelity Document Conversion Engine: Native rendering engine (LibreOffice/Word/Gotenberg) is required for pixel-perfect layout preservation. Custom reconstruction is strictly disabled to prevent layout distortion. Please install LibreOffice or configure Gotenberg.";
                        const custErr = new Error(errorMsg);
                        custErr.status = 500;
                        return reject(custErr);
                    }
                    
                    try {
                        // Perform automated Visual Verification
                        verifyVisualFidelity(enterPath, done);
                        
                        const outputPath = path.join(uploadDir, `converted-${Date.now()}.pdf`);
                        fs.writeFileSync(outputPath, done);
                        resolve(outputPath);
                    } catch (innerErr) {
                        innerErr.status = 500;
                        reject(innerErr);
                    }
                });
            } catch (e) {
                e.status = 500;
                reject(e);
            }
        });
    },

    async convertPdfToOffice(file, outputType) {
        const errorMsg = "Universal High-Fidelity Document Conversion Engine: Native Office rendering engine (UNO API / Aspose / PDFium) is required for pixel-perfect structural export. Custom paragraph reconstruction is strictly disabled to prevent layout distortion.";
        const custErr = new Error(errorMsg);
        custErr.status = 500;
        throw custErr;
    }
};

module.exports = officeService;
