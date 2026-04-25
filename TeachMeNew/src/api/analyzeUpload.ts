import type { UploadAnalysis } from '../types';

export async function analyzeUpload(imageUrl: string): Promise<UploadAnalysis> {
  const res = await fetch('/api/analyze-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  const data = await res.json() as UploadAnalysis & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data;
}
