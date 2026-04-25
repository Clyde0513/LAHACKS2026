import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { generateTopicRoute } from './routes/generateTopic';
import { generateLessonRoute, simplifyCardRoute, anotherExampleRoute } from './routes/generateLesson';
import { analyzeUploadRoute } from './routes/analyzeUpload';
import { generateRecapRoute } from './routes/generateRecap';
import { saveProgressRoute } from './routes/saveProgress';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
  }),
);
app.use(express.json({ limit: '10mb' }));

// ── API routes ───────────────────────────────────────────────────────────────
app.post('/api/generate-topic',   generateTopicRoute);
app.post('/api/generate-lesson',  generateLessonRoute);
app.post('/api/simplify-card',    simplifyCardRoute);
app.post('/api/another-example',  anotherExampleRoute);
app.post('/api/analyze-upload',   analyzeUploadRoute);
app.post('/api/generate-recap',   generateRecapRoute);
app.post('/api/save-progress',    saveProgressRoute);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
  console.log(`[server] OpenAI key: ${process.env.OPENAI_API_KEY ? '✓ set' : '✗ missing'}`);
  console.log(`[server] Supabase:   ${process.env.SUPABASE_URL ? '✓ set' : '✗ missing'}`);
});
