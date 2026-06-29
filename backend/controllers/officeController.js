const officeService = require('../services/officeService');
const { cleanup } = require('../utils/fileCleanup');

const officeController = {
    async wordToPdf(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file uploaded.');
                err.status = 400;
                throw err;
            }
            const outPath = await officeService.convertOfficeToPdf(req.file, 'word');
            cleanup([req.file]);
            res.download(outPath, 'converted.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async pptToPdf(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file uploaded.');
                err.status = 400;
                throw err;
            }
            const outPath = await officeService.convertOfficeToPdf(req.file, 'ppt');
            cleanup([req.file]);
            res.download(outPath, 'converted.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async excelToPdf(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file uploaded.');
                err.status = 400;
                throw err;
            }
            const outPath = await officeService.convertOfficeToPdf(req.file, 'excel');
            cleanup([req.file]);
            res.download(outPath, 'converted.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async pdfToWord(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file uploaded.');
                err.status = 400;
                throw err;
            }
            await officeService.convertPdfToOffice(req.file, 'word');
        } catch (e) {
            next(e);
        }
    },

    async pdfToPpt(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file uploaded.');
                err.status = 400;
                throw err;
            }
            await officeService.convertPdfToOffice(req.file, 'ppt');
        } catch (e) {
            next(e);
        }
    },

    async pdfToExcel(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file uploaded.');
                err.status = 400;
                throw err;
            }
            await officeService.convertPdfToOffice(req.file, 'excel');
        } catch (e) {
            next(e);
        }
    }
};

module.exports = officeController;
