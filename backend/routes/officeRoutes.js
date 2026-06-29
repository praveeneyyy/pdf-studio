const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const officeController = require('../controllers/officeController');

const router = express.Router();

// Routes mounted at /api/office
router.post('/word-to-pdf', upload.single('document'), officeController.wordToPdf);
router.post('/ppt-to-pdf', upload.single('document'), officeController.pptToPdf);
router.post('/excel-to-pdf', upload.single('document'), officeController.excelToPdf);

router.post('/pdf-to-word', upload.single('pdf'), officeController.pdfToWord);
router.post('/pdf-to-ppt', upload.single('pdf'), officeController.pdfToPpt);
router.post('/pdf-to-excel', upload.single('pdf'), officeController.pdfToExcel);

module.exports = router;
