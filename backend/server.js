const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const envConfig = require('./config/envConfig');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const pdfRoutes = require('./routes/pdfRoutes');
const convertRoutes = require('./routes/convertRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const officeRoutes = require('./routes/officeRoutes');

const app = express();
const port = envConfig.port;

// Production Hardening & Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow downloads across origins
}));
app.use(compression());
app.use(morgan('combined'));

// CORS Configuration supporting localhost, Netlify, and custom domains
app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins for seamless integration with frontend deployments
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json());

// Global Rate Limiting
app.use('/api', rateLimiter);

// Health Check Endpoint for Render Deployment
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime(), timestamp: new Date() });
});

// Mount modular Express Routers
app.use('/api/pdf', pdfRoutes);
app.use('/api/conversion', convertRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/office', officeRoutes);

// Centralized Error Handling
app.use(errorHandler);

const server = app.listen(port, () => {
    console.log(`🚀 Unified PDF Tools Platform Backend running in ${envConfig.env} mode on port ${port}`);
});

// Graceful Shutdown Handling
const shutdown = () => {
    console.log('\n🛑 SIGINT/SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
