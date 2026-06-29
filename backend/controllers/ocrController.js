const ocrService = require('../services/ocrService');
const { cleanup } = require('../utils/fileCleanup');

const ocrController = {
    async performOcr(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const text = await ocrService.performOcr(req.file);
            cleanup([req.file]);
            res.json({ text });
        } catch (e) {
            next(e);
        }
    }
};

module.exports = ocrController;
