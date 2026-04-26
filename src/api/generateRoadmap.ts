import type { Roadmap } from '../types';

export type Difficulty = 'simplified' | 'beginner' | 'intermediate' | 'advanced';

export async function generateRoadmap(topic: string, difficulty: Difficulty = 'beginner'): Promise<Roadmap> {
  const res = await fetch('/api/generate-topic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, difficulty }),
  });

  const data = await res.json() as Roadmap & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data;
}
