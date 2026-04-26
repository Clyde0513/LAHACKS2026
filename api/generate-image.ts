import type { VercelRequest, VercelResponse } from '@vercel/node';

interface DalleResponse {
  data?: Array<{ url?: string }>;
  error?: { message?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { keyword } = req.body as { keyword?: string };
  if (!keyword) { res.status(400).json({ error: 'keyword is required' }); return; }

  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(500).json({ error: 'OPENAI_API_KEY not configured' }); return; }

  const prompt =
    `Cinematic educational illustration: ${keyword}. ` +
    `Dramatic lighting, vivid colors, ultra-sharp detail, dark moody background. ` +
    `No text, no labels, no UI elements. Clean composition suitable for a course card banner. ` +
    `Style: high-quality digital art or photorealism.`;

  try {
    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    const data = (await dalleRes.json()) as DalleResponse;

    if (!dalleRes.ok) {
      res.status(500).json({ error: data.error?.message ?? `DALL-E error ${dalleRes.status}` });
      return;
    }

    const url = data.data?.[0]?.url;
    if (!url) { res.status(500).json({ error: 'No image URL returned from DALL-E' }); return; }

    res.json({ url });
  } catch (err) {
    console.error('[generate-image]', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
