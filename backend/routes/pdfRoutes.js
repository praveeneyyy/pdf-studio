const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const pdfController = require('../controllers/pdfController');

const router = express.Router();

// Routes mounted at /api/pdf (matching original proxy structure)
router.post('/merge', upload.array('pdfs', 50), pdfController.merge);
router.post('/split', upload.single('pdf'), pdfController.split);
router.post('/remove-pages', upload.single('pdf'), pdfController.removePages);
router.post('/rotate', upload.single('pdf'), pdfController.rotate);
router.post('/pdf-forms', upload.single('pdf'), pdfController.pdfForms);
router.post('/watermark', upload.single('pdf'), pdfController.watermark);
router.post('/page-numbers', upload.single('pdf'), pdfController.pageNumbers);
router.post('/protect', upload.single('pdf'), pdfController.protect);
router.post('/unlock', upload.single('pdf'), pdfController.unlock);
router.post('/extract', upload.single('pdf'), pdfController.extract);

module.exports = router;
