<div align="center">
  <img src="frontend/public/logo.svg" alt="uniPDF Logo" width="120" />

  # 📄 uniPDF

  **A sleek, modern, self-hosted suite of minimalist PDF tools.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
  [![Vite](https://img.shields.io/badge/Vite-Frontend-purple.svg)](https://vitejs.dev/)
  
  [Features](#-key-features) • [Architecture](#-architecture) • [Installation](#-quick-start) • [Tech Stack](#-technology-stack)
</div>

---

## 🌟 Key Features

uniPDF combines essential offline PDF processing into a unified, privacy-first workspace. 

### 🛠️ PDF Manipulation
* **Merge & Split**: Combine multiple PDFs in custom orders, or split pages into separate files.
* **Page Manager**: Extract specific ranges or delete pages from any PDF.
* **Rotate Pages**: Multi-page rotation (90°, 180°, 270°).
* **Page Numbers & Watermarks**: Inject page numbers or stamp custom watermark text across files.
* **Forms Processor**: Extract form fields, or fill out fillable forms dynamically.

### 🔒 Document Security
* **Protect PDF**: Encrypt documents with strong passwords.
* **Unlock PDF**: Clear security settings and permissions.

### 🔄 File Converters
* **Convert to PDF**: Convert JPG, PNG, Word (`.docx`), PowerPoint (`.pptx`), and Excel (`.xlsx`) files.
* **Convert from PDF**: Convert PDFs back into JPG image packages, Word files, PowerPoint presentations, or Excel sheets.
* **OCR Text Extractor**: Convert images or non-selectable scanned PDFs into searchable, selectable digital text.

---

## 📐 Architecture

uniPDF is designed as a modular, container-ready **microservices architecture** managed via a unified API Gateway. This ensures high availability and clean separation of concerns.

```text
                      +-------------------+
                      |   Vite Frontend   | (Port 5173)
                      +---------+---------+
                                |
                                v
                      +---------+---------+
                      |    API Gateway    | (Port 3000)
                      +----+----+----+----+
                           |    |    |    \
      +--------------------+    |    |     +--------------------+
      |                         |    |                          |
      v                         v    v                          v
+-----+-------+     +-----+-------+  +-----+-------+     +-----+-------+
| PDF Service |     | Conv-Service|  | OCR Service |     |Office Service|
| (Port 3001) |     | (Port 3002) |  | (Port 3003) |     | (Port 3005) |
+-------------+     +-------------+  +-------------+     +-------------+
```

---

## 🚀 Quick Start

### 📋 Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **yarn**
* **LibreOffice**: *Required for pixel-perfect Office document conversions (Word/Excel/PPT to PDF).*

### 🔧 Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/unipdf.git
   cd unipdf
   ```

2. **Install Dependencies**:
   Install dependencies across all microservices using the provided setup script:
   ```powershell
   # Windows (PowerShell)
   ./setup.ps1
   ```

3. **Run the Application**:
   Start the multi-service orchestra script, which automatically boots the gateway, all 4 microservices, and compiles/serves the frontend via Vite:
   ```bash
   node start.js
   ```

4. **Access the Dashboard**:
   Open [http://localhost:5173/](http://localhost:5173/) in your web browser and start managing your PDFs!

---

## 🛠️ Technology Stack

**Frontend**
* HTML5, Vanilla JavaScript, CSS3 Design Tokens
* [Lucide Icons](https://lucide.dev/)
* [marked.js](https://marked.js.org/) (Markdown parser)
* [PDF.js](https://mozilla.github.io/pdf.js/) (Client-side rendering)
* [JSZip](https://stuk.github.io/jszip/) (Batch zip generation)

**Backend Services**
* Node.js, Express, Multer
* `http-proxy-middleware` for Gateway routing
* `pdf-parse`, `diff` (Comparators)
* `libreoffice-convert` (High-Fidelity rendering)

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/unipdf/issues).

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
