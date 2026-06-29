const { cleanup } = require('../utils/fileCleanup');

/**
 * Centralized error handling middleware
 * Guarantees temporary files are swept and clean JSON responses are returned
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[Error Handler] ${err.message}`, err.stack);

    // Ensure temporary uploaded files are swept if an error occurs
    if (req.file) cleanup([req.file]);
    if (req.files) cleanup(req.files);

    const statusCode = err.status || 500;
    const errorMessage = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: errorMessage
    });
};

module.exports = errorHandler;
