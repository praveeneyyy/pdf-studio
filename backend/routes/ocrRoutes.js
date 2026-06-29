const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const ocrController = require('../controllers/ocrController');

const router = express.Router();

// Routes mounted at /api/ocr
router.post('/ocr', upload.single('image'), ocrController.performOcr);

module.exports = router;
