const convertService = require('../services/convertService');
const { cleanup } = require('../utils/fileCleanup');

const convertController = {
    async compress(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const outPath = await convertService.compressPdf(req.file);
            cleanup([req.file]);
            res.download(outPath, 'compressed.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async jpgToPdf(req, res, next) {
        try {
            if (!req.files || req.files.length === 0) {
                const err = new Error('No files provided');
                err.status = 400;
                throw err;
            }
            const outPath = await convertService.jpgToPdf(req.files);
            cleanup(req.files);
            res.download(outPath, 'converted.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async pdfToJpg(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const result = await convertService.pdfToJpg(req.file);
            cleanup([req.file]);
            res.status(result.status).send(result.message);
        } catch (e) {
            next(e);
        }
    }
};

module.exports = convertController;
