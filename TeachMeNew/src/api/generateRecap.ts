import type { RecapData, Roadmap, QuizResponse } from '../types';

export async function generateRecap(
  roadmap: Roadmap,
  responses: QuizResponse[],
): Promise<RecapData> {
  const res = await fetch('/api/generate-recap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roadmap, responses }),
  });
  const data = await res.json() as RecapData & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data;
}

