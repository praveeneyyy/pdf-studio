# AllinPDF - Universal High-Fidelity Document Conversion Engine & PDF Tools Platform

Welcome to **AllinPDF**, a professional, enterprise-grade PDF tools platform engineered to deliver **100% visual fidelity** for document conversion, OCR, and advanced PDF manipulations. 

---

## 🌟 Architectural Philosophy: 100% Visual Fidelity

AllinPDF strictly implements a **native rendering engine philosophy**. Rather than relying on inaccurate Javascript document rebuilders (such as Mammoth, SheetJS html export, or canvas re-draws), AllinPDF communicates directly with native rendering binaries (such as LibreOffice and Gotenberg). This guarantees that every exported file looks **identical** to the original—preserving exact layouts, fonts, margins, tables, merged cells, shapes, charts, watermarks, and pagination.

---

## 🚀 Production Architecture

The backend has been consolidated from a multi-process microservice structure into a **Unified Express Monolith** following a clean, layered architectural pattern:

```text
pdf_tools/
│
├── backend/
│      ├── routes/          # Express route definitions (/api/pdf, /api/conversion, /api/ocr, /api/office)
│      ├── controllers/     # Request validation, response handling, and automated file cleanup
│      ├── services/        # Business logic for PDF manipulation, OCR, and Office conversions
│      ├── middleware/      # Rate limiting, large file streaming upload limits, error handling
│      ├── utils/           # Automated visual verification QA gate & robust file sweeps
│      ├── config/          # Centralized environment configuration
│      └── server.js        # Main Express server entry point with production hardening
│
├── frontend/               # Premium Vite SPA frontend
│
├── package.json            # Root package.json for unified backend installation and startup
├── render.yaml             # Render Infrastructure-as-Code configuration
├── netlify.toml            # Netlify deployment configuration with SPA routing rules
└── .env.example            # Template environment configuration
```

---

## 📦 Getting Started & Local Development

### 1. Prerequisites
- **Node.js**: v18, v20, v22, or higher.
- **LibreOffice** (Optional but recommended for local Word/Excel/PPT conversions): Installed at standard system paths (e.g., `C:\Program Files\LibreOffice\program\soffice.exe` or `/usr/bin/soffice`).

### 2. Installation
Simply install all backend dependencies from the root directory:

```bash
npm install
```

To install and build the frontend:
```bash
npm run build:frontend
```

### 3. Running Locally
Start the unified Express server:

```bash
npm start
```
The server will run on `http://localhost:3000` (or your configured `PORT`).

---

## 🌍 Production Deployment Guide

### Backend: Deploying to Render
AllinPDF comes fully configured for immediate deployment to **Render** as a single, production-ready Web Service.

1. Connect your GitHub repository to Render.
2. Render will automatically detect the `render.yaml` blueprint in the root directory.
3. It will configure:
   - **Runtime**: Node 22
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
   - **Persistent Disk**: A 10GB persistent volume mounted at `/opt/render/project/src/uploads` to handle large file streaming up to 500MB without ephemeral storage loss.

### Frontend: Deploying to Netlify
The Vite frontend is configured for seamless deployment to **Netlify** via `netlify.toml`.

1. Connect your repository to Netlify.
2. Netlify will automatically apply the following settings:
   - **Base Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. Add the following Environment Variable in your Netlify dashboard:
   - `VITE_API_URL`: Set this to your deployed Render backend URL (e.g., `https://pdf-tools-backend.onrender.com`).
4. Netlify will automatically handle SPA redirect routing (`/* -> /index.html`).

---

## 🔐 Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://allinpdf-tools.netlify.app
API_URL=http://localhost:3000
UPLOAD_DIR=uploads
TEMP_DIR=temp
```

For the frontend, create `frontend/.env` (copy from `frontend/.env.example`):
```env
VITE_API_URL=https://pdf-tools-backend.onrender.com
```

---

## 🛡️ Production Security & Performance Optimization

- **Helmet & Security Headers**: Secures HTTP response headers while explicitly permitting cross-origin file downloads (`crossOriginResourcePolicy: "cross-origin"`).
- **Compression**: gzip compression enabled for faster payload delivery.
- **Morgan Request Logging**: Configured in `combined` mode for complete request traceability.
- **Global Rate Limiting**: `express-rate-limit` shields endpoints against DDoS attacks and abuse (1000 requests per 15 minutes per IP).
- **Large File Streaming**: Multer configured with up to 500MB file size limits and automated post-request temporary file sweeps.
- **Graceful Shutdown**: Traps `SIGINT` and `SIGTERM` signals to close active HTTP connections and clean up resources gracefully.

---

## ❓ Troubleshooting

### 1. "Native rendering engine is required for pixel-perfect layout preservation"
This error occurs if you attempt to convert an Office document (`.docx`, `.xlsx`, `.pptx`) but LibreOffice is not installed on the host machine. 
- **Solution**: Install LibreOffice locally, or utilize Gotenberg / a Dockerized LibreOffice runtime in your cloud environment.

### 2. Frontend CORS Errors
- **Solution**: Ensure `VITE_API_URL` is correctly configured in your frontend environment variables without a trailing slash (e.g., `https://my-backend.onrender.com`). The backend CORS configuration is built to accept requests seamlessly across Netlify and custom domains.
