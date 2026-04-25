import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callOpenAI } from './_lib/openai.js';
import type { RecapData, Roadmap, QuizResponse } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { roadmap, responses } = req.body as {
    roadmap?: Roadmap;
    responses?: QuizResponse[];
  };

  if (!roadmap?.topic) {
    res.status(400).json({ error: 'roadmap is required' });
    return;
  }

  const rs = responses ?? [];
  const quizSummary = rs.length
    ? `The learner answered ${rs.length} checkpoint questions. ` +
      `They got ${rs.filter((r) => r.isCorrect).length} correct. ` +
      `Confidence breakdown — low: ${rs.filter((r) => r.confidence === 'low').length}, ` +
      `medium: ${rs.filter((r) => r.confidence === 'medium').length}, ` +
      `high: ${rs.filter((r) => r.confidence === 'high').length}. ` +
      `Missed questions: ${rs.filter((r) => !r.isCorrect).map((r) => r.question).join('; ') || 'none'}.`
    : 'No checkpoint quizzes were completed during this lesson.';

  const prompt = `You are an expert educational coach. A learner just completed a lesson on "${roadmap.topic}" (${roadmap.difficulty} level, ${roadmap.totalDuration}).

Modules covered: ${roadmap.modules.map((m) => m.title).join(', ')}.

Quiz performance: ${quizSummary}

Generate a personalized lesson recap. Return a JSON object with exactly this shape — no extra keys:
{
  "takeaways": ["5 concise, concrete things the learner now understands (1 sentence each)"],
  "strengths": ["2–3 topic areas or concepts they demonstrated confidence in"],
  "weakSpots": ["1–3 areas where performance or confidence was lower — or empty array if all good"],
  "relatedTopics": [
    { "topic": "Topic Name", "reason": "1-sentence reason why this is a great next step", "emoji": "single emoji" }
  ]
}
Include exactly 5 takeaways, 2–3 strengths, 0–3 weakSpots, and 3–4 relatedTopics.
Be encouraging, specific, and pedagogically sound.`;

  try {
    const recap = await callOpenAI<RecapData>([
      { role: 'system', content: 'You are an expert educational coach. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ]);
    res.json(recap);
  } catch (err) {
    console.error('[generate-recap]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
