import type { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import type { LessonRecord } from '../../src/types';

export async function saveProgressRoute(req: Request, res: Response): Promise<void> {
  const { record } = req.body as { record?: LessonRecord };

  if (!record?.topic) {
    res.status(400).json({ error: 'record is required' });
    return;
  }

  if (!supabaseAdmin) {
    // Supabase not configured — silently succeed so the app still works
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
