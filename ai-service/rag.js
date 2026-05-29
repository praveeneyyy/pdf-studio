/**
 * RAG Helper Engine for PDF Tools
 * Implements chunking, embeddings, local TF-IDF vector database, and cosine similarity search.
 */

// Text chunking with overlap (word-aware windowing)
function chunkText(text, chunkSize = 800, overlap = 150) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const chunks = [];
    let currentWords = [];
    let currentLen = 0;
    
    for (const word of words) {
        currentWords.push(word);
        currentLen += word.length + 1;
        if (currentLen >= chunkSize) {
            chunks.push(currentWords.join(' '));
            const overlapCount = Math.floor(currentWords.length * (overlap / chunkSize));
            currentWords = currentWords.slice(-Math.max(1, overlapCount));
            currentLen = currentWords.join(' ').length;
        }
    }
    if (currentWords.length > 0) {
        chunks.push(currentWords.join(' '));
    }
    return chunks.filter(c => c.trim().length > 10); // filter out tiny artifacts
}

// Minimal in-memory TF-IDF Vector Database
class SimpleVectorStore {
    constructor() {
        this.vocabulary = [];
        this.idf = {};
        this.chunkVectors = [];
    }

    build(chunks) {
        const tokenizedChunks = chunks.map(c => this.tokenize(c));
        const allTokens = tokenizedChunks.flat();
        this.vocabulary = Array.from(new Set(allTokens));

        const numDocs = chunks.length;
        this.vocabulary.forEach(term => {
            const docCount = tokenizedChunks.filter(c => c.includes(term)).length;
            this.idf[term] = Math.log(numDocs / (1 + docCount)) + 1;
        });

        this.chunkVectors = chunks.map((chunk, idx) => {
            const tokens = tokenizedChunks[idx];
            const vector = this.vectorize(tokens);
            return { chunk, vector };
        });
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(t => t.length > 1);
    }

    vectorize(tokens) {
        const tf = {};
        tokens.forEach(t => tf[t] = (tf[t] || 0) + 1);

        const vector = this.vocabulary.map(term => {
            const freq = tf[term] || 0;
            return freq * (this.idf[term] || 0);
        });

        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (magnitude === 0) return vector;
        return vector.map(val => val / magnitude);
    }

    search(queryText, topK = 3) {
        const queryTokens = this.tokenize(queryText);
        const queryVector = this.vectorize(queryTokens);

        const results = this.chunkVectors.map(({ chunk, vector }) => {
            const score = vector.reduce((sum, val, idx) => sum + val * queryVector[idx], 0);
            return { chunk, score };
        });

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK).map(r => r.chunk);
    }
}

// Cosine similarity helper
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Hybrid RAG Engine (Gemini Embeddings with Local TF-IDF Fallback)
class RAGEngine {
    constructor(ai) {
        this.ai = ai;
        this.useGeminiEmbeddings = true;
        this.chunks = [];
        this.geminiVectors = [];
        this.localStore = new SimpleVectorStore();
    }

    async index(text) {
        this.chunks = chunkText(text);
        if (this.chunks.length === 0) return;

        if (!this.ai) {
            this.useGeminiEmbeddings = false;
            this.localStore.build(this.chunks);
            return;
        }

        // Test if API key has embedding capabilities
        try {
            const response = await this.ai.models.embedContent({
                model: 'text-embedding-004',
                contents: this.chunks[0]
            });
            if (response && response.embedding && response.embedding.values) {
                console.log('[ai-service RAG] Gemini Embeddings supported. Indexing...');
                this.useGeminiEmbeddings = true;
            } else {
                throw new Error('Unsupported response structure.');
            }
        } catch (err) {
            console.warn('[ai-service RAG] Gemini Embeddings API not supported or restricted (falling back to local TF-IDF):', err.message);
            this.useGeminiEmbeddings = false;
        }

        if (this.useGeminiEmbeddings) {
            try {
                this.geminiVectors = [];
                for (const chunk of this.chunks) {
                    const response = await this.ai.models.embedContent({
                        model: 'text-embedding-004',
                        contents: chunk
                    });
                    this.geminiVectors.push({
                        chunk,
                        vector: response.embedding.values
                    });
                }
            } catch (err) {
                console.error('[ai-service RAG] Batch embedding error. Swapping to local TF-IDF:', err);
                this.useGeminiEmbeddings = false;
                this.localStore.build(this.chunks);
            }
        } else {
            this.localStore.build(this.chunks);
        }
    }

    async retrieve(query, topK = 3) {
        if (this.chunks.length === 0) return [];

        if (this.useGeminiEmbeddings && this.geminiVectors.length > 0) {
            try {
                const response = await this.ai.models.embedContent({
                    model: 'text-embedding-004',
                    contents: query
                });
                const queryVector = response.embedding.values;

                const results = this.geminiVectors.map(({ chunk, vector }) => {
                    const score = cosineSimilarity(vector, queryVector);
                    return { chunk, score };
                });

                results.sort((a, b) => b.score - a.score);
                return results.slice(0, topK).map(r => r.chunk);
            } catch (err) {
                console.warn('[ai-service RAG] Query embedding failed. Using local TF-IDF search:', err.message);
                if (this.localStore.chunkVectors.length === 0) {
                    this.localStore.build(this.chunks);
                }
                return this.localStore.search(query, topK);
            }
        } else {
            return this.localStore.search(query, topK);
        }
    }
}

module.exports = {
    chunkText,
    RAGEngine
};
