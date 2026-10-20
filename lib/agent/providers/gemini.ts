import { consumeSSE } from '../sse';

export interface GeminiMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface CallGeminiParams {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  inlineAttachments?: { mimeType: string; data: string }[];
  tools?: any[];
  /** When provided, tokens are streamed to the caller as they arrive. */
  onToken?: (chunk: string) => void;
}

/** Currently available Gemini models, fastest first. */
const GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];
const DEFAULT_MODEL = GEMINI_MODELS[0];
const REQUEST_TIMEOUT_MS = 30_000;

export async function callGeminiAI({
  apiKey,
  model = DEFAULT_MODEL,
  systemInstruction,
  messages,
  inlineAttachments = [],
  onToken,
}: CallGeminiParams): Promise<{ success: boolean; content?: string; error?: string; toolCalls?: any[] }> {
  try {
    const contents: any[] = [];
    let resolvedSystemInstruction = systemInstruction;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'system' && !resolvedSystemInstruction) {
        resolvedSystemInstruction = msg.content;
      } else {
        const parts: any[] = [{ text: msg.content }];

        // Attach multimodal inline_data to the last user message
        if (
          i === messages.length - 1 &&
          msg.role === 'user' &&
          inlineAttachments &&
          inlineAttachments.length > 0
        ) {
          for (const att of inlineAttachments) {
            if (att.data && att.mimeType) {
              parts.unshift({
                inline_data: {
                  mime_type: att.mimeType,
                  data: att.data,
                },
              });
            }
          }
        }

        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    const generationConfig: any = {
      temperature: 0.7,
      maxOutputTokens: 2048,
    };

    // Disable hidden "thinking" tokens where supported — they add seconds of
    // latency before the first visible token.
    if (!model.includes('lite') && model.includes('2.5-flash')) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const payload: any = {
      contents,
      generationConfig,
    };

    if (resolvedSystemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: resolvedSystemInstruction }],
      };
    }

    const candidateModels = Array.from(
      new Set([model, DEFAULT_MODEL, ...GEMINI_MODELS].filter(Boolean)),
    );

    let lastError = '';
    const wantsStream = Boolean(onToken);

    for (const targetModel of candidateModels) {
      try {
        const endpoint = wantsStream ? 'streamGenerateContent' : 'generateContent';
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:${endpoint}` +
          (wantsStream ? '?alt=sse&key=' : '?key=') +
          apiKey;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          lastError = `Gemini model ${targetModel} (${response.status}): ${errText.slice(0, 200)}`;
          // Auth/quota/server failures will not be fixed by another model.
          if (response.status === 400 && /API key/i.test(errText)) break;
          if (response.status === 401 || response.status === 403 || response.status === 429) break;
          continue;
        }

        if (wantsStream && response.body) {
          let full = '';
          await consumeSSE(response.body, (data) => {
            const parts = data?.candidates?.[0]?.content?.parts;
            if (!Array.isArray(parts)) return;
            for (const part of parts) {
              if (typeof part?.text === 'string' && part.text.length > 0) {
                full += part.text;
                onToken!(part.text);
              }
            }
          });
          if (full.trim()) {
            return { success: true, content: full };
          }
          lastError = `Gemini ${targetModel} returned an empty stream`;
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.map((p: any) => p?.text || '').join('') || '';

        if (text) {
          return { success: true, content: text };
        }
        lastError = `Gemini ${targetModel} returned no candidates`;
      } catch (e: any) {
        lastError = e?.name === 'TimeoutError' ? 'Gemini request timed out' : e.message;
      }
    }

    return { success: false, error: lastError || 'All Gemini model candidates failed' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to call Gemini AI' };
  }
}
