import type { Roadmap } from '../types';

export async function generateRoadmap(topic: string, simplified = false): Promise<Roadmap> {
  const res = await fetch('/api/generate-topic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, simplified }),
  });

  const data = await res.json() as Roadmap & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data;
}
