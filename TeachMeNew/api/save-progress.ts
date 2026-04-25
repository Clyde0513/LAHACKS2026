import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import type { LessonRecord } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { record } = req.body as { record?: LessonRecord };

  if (!record?.topic) {
    res.status(400).json({ error: 'record is required' });
    return;
  }

  if (!supabaseAdmin) {
    res.json({ ok: true, persisted: false });
    return;
  }

  const { error } = await supabaseAdmin.from('user_progress').insert({
    topic: record.topic,
    difficulty: record.difficulty,
    duration_min: null,
    score_pct: record.quizScore,
    correct: null,
    total: null,
    confidence_low: null,
    confidence_medium: null,
    confidence_high: null,
    completed_at: new Date(record.completedAt).toISOString(),
  });

  if (error) {
    console.error('[save-progress]', error.message);
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true, persisted: true });
}
