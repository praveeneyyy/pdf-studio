const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const { RAGEngine } = require('./rag');

const app = express();
const port = 3004;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const cleanup = (files) => {
    files.forEach(f => {
        if(fs.existsSync(f.path || f)) fs.unlinkSync(f.path || f);
    });
};

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    try {
        process.loadEnvFile(envPath);
    } catch (e) {
        console.error('Failed to load env file:', e);
    }
}

console.log(process.env.GEMINI_API_KEY);

const apiKey = process.env.GEMINI_API_KEY;
let ai;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

app.post('/api/summarize', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        
        let options = [];
        if (req.body.options) {
            try {
                options = JSON.parse(req.body.options);
            } catch (err) {
                options = req.body.options.split(',').map(s => s.trim());
            }
        } else {
            options = ['bullet_summary', 'key_points', 'title_generation'];
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new pdfParse.PDFParse({ data: dataBuffer });
        let text = '';
        try {
            const data = await parser.getText();
            text = data.text;
        } finally {
            await parser.destroy();
        }
        
        if (!ai) {
            cleanup([req.file]);
            return res.status(200).json({ 
                title: options.includes('title_generation') ? "Mocked Document Title" : null,
                summary: options.includes('bullet_summary') ? [
                    "This is a mocked bullet point summary.",
                    "No GEMINI_API_KEY was found in the environment.",
                    "Extracted text starts with: " + text.substring(0, 100) + "..."
                ] : null,
                key_points: options.includes('key_points') ? [
                    "Mock Key Point 1: Gemini API keys can be set up in your .env.local file.",
                    "Mock Key Point 2: The RAG engine falls back to local TF-IDF processing when embedding fails."
                ] : null,
                flashcards: options.includes('flashcards') ? [
                    { question: "What is RAG?", answer: "Retrieval-Augmented Generation, combining documents with LLM prompting." },
                    { question: "What is the fallback vectorizer?", answer: "Local TF-IDF vector database." }
                ] : null,
                quiz: options.includes('quiz') ? [
                    { question: "Which library is used to parse PDFs?", options: ["pdf-parse", "marked", "express", "jszip"], correctAnswerIndex: 0 },
                    { question: "What is the default port for AI Service?", options: ["3000", "3004", "5173", "8080"], correctAnswerIndex: 1 }
                ] : null
            });
        }

        const rag = new RAGEngine(ai);
        await rag.index(text);
        const retrievedChunks = await rag.retrieve("Provide a high-level summary of the main points, core topics, and key findings of the document.", 5);
        const context = retrievedChunks.join('\n\n');
        
        let prompt = `Analyze the document based on the following key context:

Context:
${context}

Instructions:
You must return a structured JSON response matching the schema. Only generate content for options that are present in the requested list: [${options.join(', ')}]. If an option is not requested, return null or an empty list/array for that property.

Specifically:
- If 'title_generation' is requested: generate a concise, professional title for the document in the 'title' property.
- If 'bullet_summary' is requested: generate a list of 3-5 high-level summary bullet points in the 'summary' property.
- If 'key_points' is requested: generate 3-5 core takeaways or critical findings in the 'key_points' property.
- If 'flashcards' is requested: generate 3-5 study Q&A cards in the 'flashcards' property. Each card must be an object with 'question' and 'answer' strings.
- If 'quiz' is requested: generate a 3-question multiple choice quiz in the 'quiz' property. Each quiz item must have a 'question' string, 'options' array containing exactly 4 choices, and a 'correctAnswerIndex' integer (0-based index of the correct option).`;

        const schema = {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                summary: { type: 'ARRAY', items: { type: 'STRING' } },
                key_points: { type: 'ARRAY', items: { type: 'STRING' } },
                flashcards: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            question: { type: 'STRING' },
                            answer: { type: 'STRING' }
                        },
                        required: ['question', 'answer']
                    }
                },
                quiz: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            question: { type: 'STRING' },
                            options: { type: 'ARRAY', items: { type: 'STRING' } },
                            correctAnswerIndex: { type: 'INTEGER' }
                        },
                        required: ['question', 'options', 'correctAnswerIndex']
                    }
                }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        });
        
        let resultJson;
        try {
            resultJson = JSON.parse(response.text);
        } catch (err) {
            console.error('Failed to parse Gemini response as JSON:', response.text);
            resultJson = { summary: [response.text] };
        }

        cleanup([req.file]);
        res.json(resultJson);
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        res.status(500).send('Summarize error');
    }
});

app.post('/api/chat', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file');
        const question = req.body.question || "What is this document about?";
        
        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new pdfParse.PDFParse({ data: dataBuffer });
        let text = '';
        try {
            const data = await parser.getText();
            text = data.text;
        } finally {
            await parser.destroy();
        }
        
        if (!ai) {
            cleanup([req.file]);
            return res.status(200).json({ 
                answer: "This is a mocked answer because no GEMINI_API_KEY was provided. You asked: " + question
            });
        }

        const rag = new RAGEngine(ai);
        await rag.index(text);
        const retrievedChunks = await rag.retrieve(question, 3);
        const context = retrievedChunks.join('\n\n');
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Answer the user's question based strictly on the retrieved context from the PDF document.\n\nContext:\n${context}\n\nQuestion: ${question}` 
        });
        
        cleanup([req.file]);
        res.json({ answer: response.text });
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        res.status(500).send('Chat error');
    }
});

// Diff library for text comparison
const Diff = require('diff');

app.post('/api/compare', upload.array('pdfs', 2), async (req, res) => {
    try {
        if (!req.files || req.files.length !== 2) return res.status(400).send('Must upload exactly 2 PDFs');
        
        const dataBuffer1 = fs.readFileSync(req.files[0].path);
        const parser1 = new pdfParse.PDFParse({ data: dataBuffer1 });
        let text1 = '';
        try {
            const data1 = await parser1.getText();
            text1 = data1.text;
        } finally {
            await parser1.destroy();
        }
        
        const dataBuffer2 = fs.readFileSync(req.files[1].path);
        const parser2 = new pdfParse.PDFParse({ data: dataBuffer2 });
        let text2 = '';
        try {
            const data2 = await parser2.getText();
            text2 = data2.text;
        } finally {
            await parser2.destroy();
        }
        
        // Compute line-by-line diff
        const differences = Diff.diffLines(text1, text2);
        
        let diffResult = '--- DOCUMENT COMPARISON ---\n\n';
        differences.forEach((part) => {
            const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
            if (part.added || part.removed) {
               diffResult += prefix + part.value;
            }
        });
        
        if (diffResult === '--- DOCUMENT COMPARISON ---\n\n') diffResult += 'No differences found.';
        
        cleanup(req.files);
        res.json({ text: diffResult });
    } catch (e) {
        if (typeof req !== "undefined" && typeof cleanup === "function") {
            if (req.file) cleanup([req.file]);
            if (req.files) cleanup(req.files);
        }
        console.error(e);
        res.status(500).send('Compare error');
    }
});

app.listen(port, () => console.log(`AI Service listening at http://localhost:${port}`));
