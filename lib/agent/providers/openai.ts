import { consumeSSE } from '../sse';

export interface CallOpenAIParams {
  apiKey: string;
  model?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  tools?: any[];
  /** When provided, tokens are streamed to the caller as they arrive. */
  onToken?: (chunk: string) => void;
}

const REQUEST_TIMEOUT_MS = 30_000;

export async function callOpenAI({
  apiKey,
  model = 'gpt-4o-mini',
  messages,
  onToken,
}: CallOpenAIParams): Promise<{ success: boolean; content?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const wantsStream = Boolean(onToken);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: wantsStream,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      return { success: false, error: `OpenAI Error (${response.status}): ${err.slice(0, 200)}` };
    }

    if (wantsStream && response.body) {
      let full = '';
      await consumeSSE(response.body, (data) => {
        const chunk = data?.choices?.[0]?.delta?.content;
        if (typeof chunk === 'string' && chunk.length > 0) {
          full += chunk;
          onToken!(chunk);
        }
      });
      if (!full.trim()) {
        return { success: false, error: 'Empty stream from OpenAI' };
      }
      return { success: true, content: full };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'Empty response from OpenAI' };
    }

    return { success: true, content };
  } catch (err: any) {
    return {
      success: false,
      error: err?.name === 'AbortError' ? 'OpenAI request timed out' : err.message || 'Failed to call OpenAI',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
