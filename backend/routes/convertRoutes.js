const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const convertController = require('../controllers/convertController');

const router = express.Router();

// Routes mounted at /api/conversion and /api/convert
router.post('/compress', upload.single('pdf'), convertController.compress);
router.post('/jpg-to-pdf', upload.array('images', 50), convertController.jpgToPdf);
router.post('/pdf-to-jpg', upload.single('pdf'), convertController.pdfToJpg);

module.exports = router;
