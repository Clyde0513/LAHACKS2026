import type { Lesson, LessonCard, Roadmap } from '../types';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data;
}

export async function generateLesson(roadmap: Roadmap): Promise<Lesson> {
  return post<Lesson>('/api/generate-lesson', { roadmap });
}

export async function simplifyCard(
  card: LessonCard,
): Promise<Pick<LessonCard, 'explanation' | 'analogy' | 'keyTerms'>> {
  return post('/api/simplify-card', { card });
}

export async function anotherExample(card: LessonCard): Promise<string> {
  const data = await post<{ analogy: string }>('/api/another-example', { card });
  return data.analogy;
}

export async function generateDeepDive(card: LessonCard): Promise<LessonCard[]> {
  const data = await post<{ cards: LessonCard[] }>('/api/deep-dive', { card });
  return data.cards;
}

