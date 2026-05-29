# 📄 PDF Studio — Minimalist PDF Tools & Gemini AI Workspace

PDF Studio is a sleek, modern, self-hosted suite of PDF utilities and document intelligence tools. Styled with a minimalist, warm orange-accented palette, it combines essential offline PDF processing (merging, splitting, protecting, converting) with an interactive **Gemini AI Studio** for summarizing, chatting, studying, and querying documents.

---

## 🌟 Key Features

### 1. 🤖 Gemini AI Studio
Turn documents into active conversations. Process documents using local Retrieval-Augmented Generation (RAG) and Gemini 2.5:
*   **Immediate Analysis**: Generate professional document titles, concise bullet-point summaries, and key takeaways instantly.
*   **Conversational Chat**: Q&A dialog thread right next to your PDF. Ask follow-up questions and get detailed, structured context-aware replies.
*   **Study Flashcards**: Dynamically generated interactive 3D study flashcards (click to flip).
*   **AI Quiz Generation**: Generates multiple-choice quiz questions with instant visual correctness feedback.
*   **Semantic Search**: Query specific phrases and retrieve page references and exact source text segments.

### 2. 🛠️ PDF Manipulation Utilities
*   **Merge & Split**: Combine multiple PDFs in custom orders, or split pages into separate files.
*   **Page Manager**: Extract specific ranges or delete pages from any PDF.
*   **Rotate Pages**: Multi-page rotation (90, 180, 270 degrees).
*   **Page Numbers & Watermarks**: Inject page numbers or stamp custom watermark text across files.
*   **Forms Processor**: Extract form fields, or fill out fillable forms dynamically.

### 3. 🔒 Document Security
*   **Protect PDF**: Encrypt documents with strong passwords.
*   **Unlock PDF**: Clear security settings and permissions.

### 4. 🔄 File Converters
*   **Convert to PDF**: Convert JPG, PNG, Word (`.docx`), PowerPoint (`.pptx`), and Excel (`.xlsx`) files.
*   **Convert from PDF**: Convert PDFs back into JPG image packages, Word files, PowerPoint presentations, or Excel sheets.
*   **OCR Text Extractor**: Convert images or non-selectable scanned PDFs into searchable, selectable digital text.

---

## 📐 Architecture

PDF Studio is designed as a modular, container-ready **microservices architecture** managed via a unified API Gateway:

```
                      +-------------------+
                      |   Vite Frontend   | (Port 5173)
                      +---------+---------+
                                |
                                v
                      +---------+---------+
                      |    API Gateway    | (Port 3000)
                      +----+----+----+----+
                           |    |    |
      +--------------------+    |    +--------------------+
      |                         |                         |
      v                         v                         v
+-----+-------+           +-----+-------+           +-----+-------+
| PDF Service | (Port 3001| | Conv-Service| (Port 3002| | OCR Service | (Port 3003)
+-------------+           +-------------+           +-------------+
      |                         |                         |
      +--------------------+    |    +--------------------+
                           |    |    |
                           v    v    v
                      +----+----+----+----+
                      |    AI Service     | (Port 3004) <-- TF-IDF / Gemini
                      +----+----+----+----+
                                |
                                v
                      +---------+---------+
                      |  Office Service   | (Port 3005)
                      +-------------------+
```

---

## 🚀 Quick Start

### 📋 Prerequisites
*   Node.js (v18 or higher recommended)
*   npm or yarn

### 🔧 Setup Instructions

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/pdf-studio.git
    cd pdf-studio
    ```

2.  **Environment Configuration**:
    Create a `.env.local` file in the root workspace folder and add your Gemini API Key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    *Note: If no API key is specified, the application operates in mock mode for AI components to support testing.*

3.  **Install dependencies**:
    Install dependencies across the services by running:
    ```bash
    npm install
    ```

4.  **Run Application**:
    Start the multi-service orchestra script:
    ```bash
    node start.js
    ```
    This script launches the gateway, all 5 microservices, and compiles/serves the frontend on Vite.

5.  **Access the Dashboard**:
    Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## 🛠️ Technology Stack

*   **Frontend**: HTML5, Vanilla JavaScript, CSS3 Design Tokens, Lucide Icons, [marked.js](https://marked.js.org/) (Markdown parser), [PDF.js](https://mozilla.github.io/pdf.js/) (client rendering), [JSZip](https://stuk.github.io/jszip/) (batch zip generation).
*   **Backend Services**: Node.js, Express, Multer, `http-proxy-middleware`.
*   **Document Parsers**: `pdf-parse`, `diff` (comparators).
*   **AI Engine**: `@google/genai` (Gemini SDK), RAGEngine (word-aware overlap chunking, cosine vector similarity, local TF-IDF database fallback).

---

## 📄 License
This project is open-source and licensed under the MIT License.
