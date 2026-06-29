const multer = require('multer');
const fs = require('fs');
const path = require('path');
const envConfig = require('../config/envConfig');

// Ensure upload directory exists
const uploadDir = envConfig.uploadDir;
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

// Configure robust file upload limits (up to 500 MB) for large file streaming
const upload = multer({ 
    storage, 
    limits: { fileSize: 500 * 1024 * 1024 } 
});

module.exports = upload;
