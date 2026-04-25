import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callOpenAI } from './_lib/openai.js';
import type { LessonCard } from '../src/types.js';

const SYSTEM =
  'You are an expert educator. Create clear, engaging, beginner-friendly lesson content. ' +
  'Always return valid JSON matching the exact schema. Never use technical jargon without explaining it. ' +
  'Analogies should be vivid and relatable to everyday life.';

function buildExamplePrompt(card: LessonCard): string {
  return `Generate a different, fresh analogy for this concept: "${card.title}".
The current analogy is: "${card.analogy}"
Give a completely different one — different domain, different angle.
Return ONLY: { "analogy": "Think of it like..." }`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { card } = req.body as { card?: LessonCard };
  if (!card?.title) { res.status(400).json({ error: 'card is required' }); return; }
  try {
    const result = await callOpenAI<{ analogy: string }>([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildExamplePrompt(card) },
    ]);
    res.json(result);
  } catch (err) {
    console.error('[another-example]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
