const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from root .env file if available
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
    tempDir: process.env.TEMP_DIR || path.join(__dirname, '../../temp')
};
