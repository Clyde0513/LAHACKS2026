import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callOpenAI } from './_lib/openai.js';
import type { LessonCard } from '../src/types.js';

const SYSTEM =
  'You are an expert educator. Create focused deep-dive sub-cards that unpack one concept in greater depth. ' +
  'Progress from accessible to nuanced across the cards. Always return valid JSON matching the exact schema.';

function buildPrompt(card: LessonCard): string {
  return `A learner wants to dive deeper into this concept from their lesson:

Title: "${card.title}"
Explanation: "${card.explanation}"
Module: "${card.moduleTitle}"

Generate EXACTLY 3 focused sub-cards that go deeper on "${card.title}".
- Card 1: clarify a common misconception or add an important nuance
- Card 2: reveal the "why it works" mechanism or underlying principle
- Card 3: show a real-world application or edge case

Return ONLY this JSON:
{
  "cards": [
    {
      "id": "d1",
      "moduleId": "${card.moduleId}",
      "moduleTitle": "${card.moduleTitle}",
      "moduleIcon": "${card.moduleIcon}",
      "title": "Sub-concept title (3–6 words)",
      "explanation": "2–3 sentence explanation going deeper on this specific angle.",
      "analogy": "A vivid analogy making this click. Start with 'Think of it like...'",
      "imageKeyword": "2–4 concrete photographic keywords unique to this sub-card",
      "keyTerms": [
        { "term": "Term", "definition": "One-sentence plain-language definition." }
      ],
      "quizQuestion": "A question testing this deeper understanding.",
      "quizOptions": ["Option A", "Option B", "Option C", "Option D"],
      "quizCorrectIndex": 0,
      "quizExplanation": "1–2 sentences explaining why the correct answer is right."
    }
  ]
}

Rules:
- Exactly 3 sub-cards
- keyTerms: 1–3 items per card
- quizOptions: exactly 4 items
- quizCorrectIndex: 0–3, vary across cards
- Explanations under 70 words
- Analogies under 50 words
- imageKeyword: unique per card, concrete and photographic, differs from parent card keyword`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { card } = req.body as { card?: LessonCard };
  if (!card?.title) { res.status(400).json({ error: 'card is required' }); return; }

  try {
    const result = await callOpenAI<{ cards: LessonCard[] }>([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildPrompt(card) },
    ]);
    res.json(result);
  } catch (err) {
    console.error('[deep-dive]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
