import type { Request, Response } from 'express';
import { callOpenAI } from '../lib/openai';
import type { Lesson, LessonCard, Roadmap } from '../../src/types';

const SYSTEM =
  'You are an expert educator. Create clear, engaging, beginner-friendly lesson content. ' +
  'Always return valid JSON matching the exact schema. Never use technical jargon without explaining it. ' +
  'Analogies should be vivid and relatable to everyday life.';

function buildLessonPrompt(roadmap: Roadmap): string {
  const moduleList = roadmap.modules
    .map((m) => `  - id:"${m.id}" title:"${m.title}" (${m.description})`)
    .join('\n');

  return `Create a complete lesson for the topic: "${roadmap.topic}" (${roadmap.difficulty} level).

The lesson has these modules:
${moduleList}

Generate EXACTLY 2 lesson cards per module (${roadmap.modules.length * 2} cards total).
Each card covers one focused concept within that module.

Return ONLY this JSON structure:
{
  "topic": "${roadmap.topic}",
  "cards": [
    {
      "id": "1",
      "moduleId": "1",
      "moduleTitle": "Module Title",
      "moduleIcon": "single emoji for the module",
      "title": "Concept Title (concise, 3-6 words)",
      "explanation": "2-3 sentence clear explanation a beginner can grasp immediately.",
      "analogy": "A vivid real-world analogy that makes this concept click. Start with 'Think of it like...'",
      "keyTerms": [
        { "term": "Term", "definition": "Plain-language definition in one sentence." }
      ],
      "quizQuestion": "A multiple-choice question testing understanding of this card.",
      "quizOptions": ["Option A", "Option B", "Option C", "Option D"],
      "quizCorrectIndex": 0,
      "quizExplanation": "1-2 sentences explaining why the correct answer is right."
    }
  ]
}

Rules:
- keyTerms: 2-4 items per card
- quizOptions: exactly 4 items
- quizCorrectIndex: 0-3 (index of the correct option in quizOptions)
- Vary the quizCorrectIndex — don't always use 0
- Keep explanations under 60 words
- Keep analogies under 50 words`;
}

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

function buildExamplePrompt(card: LessonCard): string {
  return `Generate a different, fresh analogy for this concept: "${card.title}".
The current analogy is: "${card.analogy}"
Give a completely different one — different domain, different angle.
Return ONLY: { "analogy": "Think of it like..." }`;
}

export async function generateLessonRoute(req: Request, res: Response): Promise<void> {
  const { roadmap } = req.body as { roadmap?: Roadmap };
  if (!roadmap?.topic) {
    res.status(400).json({ error: 'roadmap is required' });
    return;
  }
  try {
    const lesson = await callOpenAI<Lesson>([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildLessonPrompt(roadmap) },
    ]);
    res.json(lesson);
  } catch (err) {
    console.error('[generate-lesson]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function simplifyCardRoute(req: Request, res: Response): Promise<void> {
  const { card } = req.body as { card?: LessonCard };
  if (!card?.title) {
    res.status(400).json({ error: 'card is required' });
    return;
  }
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

export async function anotherExampleRoute(req: Request, res: Response): Promise<void> {
  const { card } = req.body as { card?: LessonCard };
  if (!card?.title) {
    res.status(400).json({ error: 'card is required' });
    return;
  }
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
