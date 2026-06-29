const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = 3000;

app.use(cors());

// Proxy configuration
const services = {
    '/api/pdf': 'http://127.0.0.1:3001',
    '/api/conversion': 'http://127.0.0.1:3002',
    '/api/ocr': 'http://127.0.0.1:3003',
    '/api/office': 'http://127.0.0.1:3005'
};

for (const [servicePath, target] of Object.entries(services)) {
    app.use(servicePath, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path.startsWith(servicePath)) {
                return path.replace(servicePath, '/api');
            } else if (!path.startsWith('/api')) {
                return '/api' + path;
            }
            return path;
        }
    }));
}

app.get('/', (req, res) => {
    res.send('API Gateway is running');
});

app.listen(port, () => {
    console.log(`API Gateway listening at http://localhost:${port}`);
});
