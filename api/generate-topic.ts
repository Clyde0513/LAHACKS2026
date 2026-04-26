import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callOpenAI } from './_lib/openai.js';
import { supabaseAdmin } from './_lib/supabase.js';
import type { Roadmap } from '../src/types.js';

type Difficulty = 'simplified' | 'beginner' | 'intermediate' | 'advanced';

const DIFF_META: Record<Difficulty, { label: string; style: string; moduleCount: string }> = {
  simplified:   { label: 'Simplified',   style: 'very simplified, ELI5-style — no jargon, maximum analogies', moduleCount: '3–4' },
  beginner:     { label: 'Beginner',     style: 'beginner-friendly — light jargon with explanations',          moduleCount: '4–5' },
  intermediate: { label: 'Intermediate', style: 'intermediate — assumes basic familiarity, goes deeper',        moduleCount: '5–6' },
  advanced:     { label: 'Advanced',     style: 'advanced — technical depth, nuance, edge cases, tradeoffs',   moduleCount: '6–8' },
};

const SYSTEM =
  'You are an expert educator who creates engaging lesson roadmaps at any difficulty level. ' +
  'Always return valid JSON matching the exact schema requested.';

function buildPrompt(topic: string, difficulty: Difficulty): string {
  const meta = DIFF_META[difficulty];
  return `Create a ${meta.style} lesson roadmap for: "${topic}".

Return ONLY a JSON object with this exact structure:
{
  "topic": "Topic Name (properly cased)",
  "difficulty": "${meta.label}",
  "totalDuration": "X–Y min",
  "tagline": "One compelling sentence about why this topic is fascinating",
  "objectives": [
    "You will understand ...",
    "You will be able to ...",
    "You will know ..."
  ],
  "modules": [
    {
      "id": "1",
      "title": "Module Title",
      "description": "1-2 sentence description of what this module covers.",
      "icon": "single emoji representing the module",
      "duration": "X min"
    }
  ]
}

Rules:
- modules array must have ${meta.moduleCount} items
- objectives array must have exactly 3 items
- Icons must be single emojis
- totalDuration should reflect the sum of module durations
- Difficulty "${meta.label}": ${meta.style}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { topic, difficulty = 'beginner', simplified } = req.body as {
    topic?: string;
    difficulty?: Difficulty;
    simplified?: boolean; // backwards-compat
  };

  if (!topic?.trim()) {
    res.status(400).json({ error: 'topic is required' });
    return;
  }

  // Map legacy `simplified: true` to the simplified difficulty level
  const resolvedDifficulty: Difficulty = simplified ? 'simplified' : (difficulty ?? 'beginner');

  try {
    const roadmap = await callOpenAI<Roadmap>([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildPrompt(topic.trim(), resolvedDifficulty) },
    ]);

    if (supabaseAdmin) {
      supabaseAdmin
        .from('topics')
        .insert({ topic: roadmap.topic, difficulty: roadmap.difficulty, roadmap_json: roadmap })
        .then(({ error }) => {
          if (error) console.error('[DB] topics insert:', error.message);
        });
    }

    res.json(roadmap);
  } catch (err) {
    console.error('[generate-topic]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
