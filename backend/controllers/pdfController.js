const pdfService = require('../services/pdfService');
const { cleanup } = require('../utils/fileCleanup');

const pdfController = {
    async merge(req, res, next) {
        try {
            if (!req.files || req.files.length === 0) {
                const err = new Error('No files provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.mergePdfs(req.files);
            cleanup(req.files);
            res.download(outPath, 'merged.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async split(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.splitPdf(req.file, req.body.ranges);
            cleanup([req.file]);
            res.download(outPath, 'split.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async removePages(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            if (!req.body.ranges) {
                const err = new Error('No ranges provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.removePages(req.file, req.body.ranges);
            cleanup([req.file]);
            res.download(outPath, 'removed.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async rotate(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.rotatePdf(req.file, req.body.degrees);
            cleanup([req.file]);
            res.download(outPath, 'rotated.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async pdfForms(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const result = await pdfService.handlePdfForms(req.file, req.body.action, req.body.data);
            cleanup([req.file]);
            if (result.type === 'download') {
                res.download(result.path, 'filled.pdf', () => cleanup([{ path: result.path }]));
            } else {
                res.json(result.data);
            }
        } catch (e) {
            next(e);
        }
    },

    async watermark(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.watermarkPdf(req.file, req.body.text);
            cleanup([req.file]);
            res.download(outPath, 'watermarked.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async pageNumbers(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.addPageNumbers(req.file);
            cleanup([req.file]);
            res.download(outPath, 'numbered.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async protect(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.protectPdf(req.file, req.body.password);
            cleanup([req.file]);
            res.download(outPath, 'protected.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async unlock(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.unlockPdf(req.file, req.body.password);
            cleanup([req.file]);
            res.download(outPath, 'unlocked.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    },

    async extract(req, res, next) {
        try {
            if (!req.file) {
                const err = new Error('No file provided');
                err.status = 400;
                throw err;
            }
            if (!req.body.ranges) {
                const err = new Error('No ranges provided');
                err.status = 400;
                throw err;
            }
            const outPath = await pdfService.extractPages(req.file, req.body.ranges);
            cleanup([req.file]);
            res.download(outPath, 'extracted.pdf', () => cleanup([{ path: outPath }]));
        } catch (e) {
            next(e);
        }
    }
};

module.exports = pdfController;
