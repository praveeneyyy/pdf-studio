const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = 3000;

app.use(cors());

// Proxy configuration
const services = {
    '/api/pdf': 'http://localhost:3001',
    '/api/conversion': 'http://localhost:3002',
    '/api/ocr': 'http://localhost:3003',
    '/api/ai': 'http://localhost:3004',
    '/api/office': 'http://localhost:3005'
};

for (const [path, target] of Object.entries(services)) {
    app.use(path, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
            '^/': '/api/' 
        }
    }));
}

app.get('/', (req, res) => {
    res.send('API Gateway is running');
});

app.listen(port, () => {
    console.log(`API Gateway listening at http://localhost:${port}`);
});
