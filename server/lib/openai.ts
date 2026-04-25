/**
 * Server-side OpenAI helper.
 * OPENAI_API_KEY lives only here — never sent to the browser.
 */

interface OAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; [k: string]: unknown }>;
}

interface OAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function callOpenAI<T = unknown>(
  messages: OAIMessage[],
  { jsonMode = true, temperature = 0.7 } = {},
): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set on the server');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
  });

  const data = (await res.json()) as OAIResponse;

  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI error ${res.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  if (jsonMode) {
    try {
      return JSON.parse(content) as T;
    } catch {
      throw new Error('Could not parse OpenAI JSON response');
    }
  }

  return content as T;
}
