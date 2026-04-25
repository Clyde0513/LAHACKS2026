import type { Request, Response } from 'express';
import { callOpenAI } from '../lib/openai';
import { supabaseAdmin } from '../lib/supabase';
import type { Roadmap } from '../../src/types';

const SYSTEM =
  'You are an expert educator who creates engaging, beginner-friendly lesson roadmaps. ' +
  'Always return valid JSON matching the exact schema requested. ' +
  'Be encouraging and use clear, jargon-free language.';

function buildPrompt(topic: string, simplified: boolean): string {
  return `Create a ${simplified ? 'very simplified, ELI5-style' : 'beginner-friendly'} lesson roadmap for: "${topic}".

Return ONLY a JSON object with this exact structure:
{
  "topic": "Topic Name (properly cased)",
  "difficulty": "${simplified ? 'Simplified' : 'Beginner'}",
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
- modules array must have 4–6 items
- objectives array must have exactly 3 items
- Keep descriptions short and jargon-free
- Icons must be single emojis
- totalDuration should reflect the sum of module durations`;
}

export async function generateTopicRoute(req: Request, res: Response): Promise<void> {
  const { topic, simplified } = req.body as { topic?: string; simplified?: boolean };

  if (!topic?.trim()) {
    res.status(400).json({ error: 'topic is required' });
    return;
  }

  try {
    const roadmap = await callOpenAI<Roadmap>([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildPrompt(topic.trim(), !!simplified) },
    ]);

    // Persist to Supabase (best-effort — don't fail the response if DB write fails)
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
