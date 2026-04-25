import type { Request, Response } from 'express';
import { callOpenAI } from '../lib/openai';
import type { UploadAnalysis } from '../../src/types';

export async function analyzeUploadRoute(req: Request, res: Response): Promise<void> {
  const { imageUrl } = req.body as { imageUrl?: string };

  if (!imageUrl?.startsWith('https://')) {
    res.status(400).json({ error: 'imageUrl is required and must be an https URL' });
    return;
  }

  try {
    const analysis = await callOpenAI<UploadAnalysis>([
      {
        role: 'system',
        content:
          'You are an educational AI that creates structured learning content from images. ' +
          'Always respond with valid JSON exactly matching the schema requested. ' +
          'If the image is unclear, extract whatever learning value you can.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'auto' },
          },
          {
            type: 'text',
            text: `Analyze this image and extract educational learning content.
Return JSON with exactly this shape — no extra keys:
{
  "topic": "Concise topic label (3–8 words)",
  "summary": "2–3 sentence plain-English explanation of what this image shows and why it matters educationally",
  "concepts": [
    { "title": "concept name", "explanation": "1–2 sentence beginner-friendly explanation" }
  ],
  "glossary": [
    { "term": "term", "definition": "clear, jargon-free definition" }
  ],
  "quiz": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "why this answer is correct"
    }
  ]
}
Include 3–6 concepts, 4–8 glossary terms, and exactly 3 quiz questions.`,
          },
        ] as Array<{ type: string; [k: string]: unknown }>,
      },
    ]);

    res.json(analysis);
  } catch (err) {
    console.error('[analyze-upload]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
