import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callOpenAI } from './_lib/openai.js';
import type { LessonCard } from '../src/types.js';

const SYSTEM =
  'You are an expert educator. Create clear, engaging, beginner-friendly lesson content. ' +
  'Always return valid JSON matching the exact schema. Never use technical jargon without explaining it. ' +
  'Analogies should be vivid and relatable to everyday life.';

function buildSimplifyPrompt(card: LessonCard): string {
  return `Rewrite this lesson card in a much simpler way — as if explaining to a 10-year-old.
Keep the same JSON structure but make the explanation, analogy and key term definitions much simpler.

Original card:
${JSON.stringify({ title: card.title, explanation: card.explanation, analogy: card.analogy, keyTerms: card.keyTerms })}

Return ONLY a JSON object with these fields:
{
  "explanation": "simpler explanation",
  "analogy": "simpler analogy starting with Think of it like...",
  "keyTerms": [{ "term": "...", "definition": "simpler definition" }]
}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { card } = req.body as { card?: LessonCard };
  if (!card?.title) { res.status(400).json({ error: 'card is required' }); return; }
  try {
    const result = await callOpenAI<Pick<LessonCard, 'explanation' | 'analogy' | 'keyTerms'>>([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildSimplifyPrompt(card) },
    ]);
    res.json(result);
  } catch (err) {
    console.error('[simplify-card]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
