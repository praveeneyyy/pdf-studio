const rateLimit = require('express-rate-limit');

// Configure API rate limiting to protect endpoints against DDoS and abuse in production
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes.'
    }
});

module.exports = limiter;
