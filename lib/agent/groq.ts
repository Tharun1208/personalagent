import { consumeSSE } from './sse';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | any[];
}

/**
 * Fast, currently-available Groq LPU models.
 * Ordered by latency: 8b-instant first for snappy chat.
 */
const GROQ_MODELS = {
  fast: 'llama-3.1-8b-instant',
  balanced: 'llama-3.3-70b-versatile',
  reasoning: 'openai/gpt-oss-120b',
} as const;

const DEFAULT_MODEL = GROQ_MODELS.fast;

/** Generous enough for a full answer; streaming keeps perceived latency low. */
const REQUEST_TIMEOUT_MS = 30_000;

export interface CallGroqParams {
  apiKey?: string;
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** When provided, tokens are streamed to the caller as they arrive. */
  onToken?: (chunk: string) => void;
}

function isReasoningModel(model: string): boolean {
  return model.includes('gpt-oss') || model.includes('deepseek-r1') || model.includes('qwen3');
}

export async function callGroqAI({
  apiKey,
  messages,
  model = DEFAULT_MODEL,
  temperature = 0.6,
  maxTokens = 2048,
  onToken,
}: CallGroqParams): Promise<{ content: string; success: boolean; error?: string; model?: string }> {
  const key = apiKey || process.env.GROQ_API_KEY;

  if (!key) {
    return {
      success: false,
      content: '',
      error: 'No Groq API key provided. Please set GROQ_API_KEY in .env.local or in Application Settings.',
    };
  }

  // Only retry with a different model when the requested one is unavailable.
  const modelsToTry = Array.from(
    new Set(
      [model, DEFAULT_MODEL, GROQ_MODELS.balanced].filter(
        (m): m is string => Boolean(m && m.trim()),
      ),
    ),
  );

  let lastError = '';

  for (const targetModel of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const sanitizedMessages = messages.map((m) => {
        if (Array.isArray(m.content)) {
          const textPart = m.content.find((p: any) => p.type === 'text');
          return { role: m.role, content: textPart?.text || JSON.stringify(m.content) };
        }
        return m;
      });

      const wantsStream = Boolean(onToken);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          messages: sanitizedMessages,
          temperature,
          max_tokens: maxTokens,
          stream: wantsStream,
          // Reasoning models burn seconds on hidden tokens; keep it shallow.
          ...(isReasoningModel(targetModel) ? { reasoning_effort: 'low' } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        lastError = `Groq ${targetModel} (${response.status}): ${errText.slice(0, 200)}`;
        // Bad key / rate limit / server error — a different model won't help.
        if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
          break;
        }
        continue;
      }

      if (wantsStream && response.body) {
        let full = '';
        await consumeSSE(response.body, (data) => {
          const delta = data?.choices?.[0]?.delta;
          const chunk = delta?.content;
          if (typeof chunk === 'string' && chunk.length > 0) {
            full += chunk;
            onToken!(chunk);
          }
        });
        if (full.trim()) {
          return { success: true, content: full.trim(), model: targetModel };
        }
        lastError = `Groq ${targetModel} returned an empty stream`;
        continue;
      }

      const data = await response.json();
      const choiceMsg = data?.choices?.[0]?.message;
      let reply = choiceMsg?.content || '';

      // Reasoning-only output (e.g. gpt-oss hit its token cap before answering)
      if (!reply && choiceMsg?.reasoning) {
        reply = choiceMsg.reasoning;
      }

      if (reply && reply.trim().length > 0) {
        return { success: true, content: reply.trim(), model: targetModel };
      }
      lastError = `Groq ${targetModel} returned an empty response`;
    } catch (err: any) {
      lastError = err?.name === 'AbortError' ? 'Groq request timed out' : err?.message || 'Groq request failed';
      console.warn(`Groq model ${targetModel} error:`, lastError);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    success: false,
    content: '',
    error: lastError || 'Failed to generate response using Groq API models.',
  };
}
