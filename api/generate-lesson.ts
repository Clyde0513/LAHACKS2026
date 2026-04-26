import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callOpenAI } from './_lib/openai.js';
import type { Lesson, Roadmap } from '../src/types.js';

const SYSTEM =
  'You are an expert educator. Create clear, engaging lesson content calibrated precisely to the requested difficulty level. ' +
  'Always return valid JSON matching the exact schema. Never use technical jargon without explaining it at beginner/simplified level. ' +
  'At advanced level, embrace depth, nuance, and technical precision. ' +
  'Analogies should be vivid and relatable to everyday life.';

const DIFF_INSTRUCTIONS: Record<string, string> = {
  Simplified:   'Use ELI5 style. No jargon. Maximum analogies. Very short explanations.',
  Beginner:     'Beginner-friendly. Light jargon with inline explanations. Clear and encouraging.',
  Intermediate: 'Assume basic familiarity. Go deeper. Introduce technical terms with context.',
  Advanced:     'Full technical depth. Cover edge cases, tradeoffs, implementation nuances. No hand-holding.',
};

function diffInstruction(difficulty: string): string {
  return DIFF_INSTRUCTIONS[difficulty] ?? DIFF_INSTRUCTIONS['Beginner'];
}

function buildLessonPrompt(roadmap: Roadmap): string {
  const moduleList = roadmap.modules
    .map((m) => `  - id:"${m.id}" title:"${m.title}" (${m.description})`)
    .join('\n');

  return `Create a complete lesson for the topic: "${roadmap.topic}" at ${roadmap.difficulty} difficulty level.

Difficulty style: ${diffInstruction(roadmap.difficulty)}

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
      "imageKeyword": "2-4 specific, concrete, photographic keywords for THIS card's concept — must differ from other cards (e.g. 'glowing quantum particles', 'circuit board closeup', 'superposition wave diagram'). Use nouns + adjectives, avoid generic words like 'technology' or 'science'",
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
- Keep analogies under 50 words
- imageKeyword: 2-4 words, concrete and photographic, UNIQUE per card — no two cards should share the same keyword. Think of a real photograph that would appear on a magazine cover for this specific concept.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { roadmap } = req.body as { roadmap?: Roadmap };
  if (!roadmap?.topic) { res.status(400).json({ error: 'roadmap is required' }); return; }
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
