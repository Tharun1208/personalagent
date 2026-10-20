import { callGroqAI } from '@/lib/agent/groq';
import { callGeminiAI } from './gemini';
import { callOpenAI } from './openai';
import { callAnthropic } from './anthropic';
import { callOllama } from './ollama';
import { UserPreferences } from '@/types';
import { ProcessedAttachment } from '@/lib/agent/fileAnalyzer';
import { LRUCache } from '@/lib/dsa/LRUCache';

// Global DSA LRU Cache: capacity = 150 items, TTL = 10 minutes
const llmResponseCache = new LRUCache<string, RouteLLMResult>(150, 10 * 60 * 1000);

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export interface RouteLLMParams {
  preferences?: UserPreferences;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  systemInstruction?: string;
  fallbackContent?: string;
  attachments?: ProcessedAttachment[];
  /** Receives token deltas as they stream in, enabling sub-second first paint. */
  onToken?: (chunk: string) => void;
}

export interface RouteLLMResult {
  success: boolean;
  content: string;
  provider: string;
  model: string;
  error?: string;
  isOffline?: boolean;
}

export async function routeLLMRequest({
  preferences,
  messages,
  systemInstruction,
  fallbackContent,
  attachments = [],
  onToken,
}: RouteLLMParams): Promise<RouteLLMResult> {
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
  const hasAttachments = attachments && attachments.length > 0;
  const streaming = Boolean(onToken);

  // DSA LRU Cache check for fast non-attachment queries
  const cacheKey = !hasAttachments
    ? `${preferences?.model || 'default'}_${lastUserMsg.trim().toLowerCase()}`
    : null;
  if (cacheKey && llmResponseCache.has(cacheKey)) {
    const cached = llmResponseCache.get(cacheKey);
    if (cached) {
      if (onToken) onToken(cached.content);
      return { ...cached, provider: `${cached.provider} (DSA LRU Cached)` };
    }
  }

  const prefProvider = preferences?.aiProvider?.toLowerCase();
  const prefKey = preferences?.apiKey;
  const configuredModel = preferences?.model;

  const groqKey =
    prefProvider === 'groq' && prefKey
      ? prefKey
      : process.env.GROQ_API_KEY || (prefKey?.startsWith('gsk_') ? prefKey : undefined);
  const geminiKey =
    prefProvider === 'gemini' && prefKey
      ? prefKey
      : process.env.GEMINI_API_KEY || (prefKey && !prefKey.startsWith('gsk_') ? prefKey : undefined);
  const openaiKey =
    prefProvider === 'openai' && prefKey
      ? prefKey
      : process.env.OPENAI_API_KEY || (prefKey?.startsWith('sk-') ? prefKey : undefined);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const hasImagesOrPdfs = attachments?.some((a) => a.isImage || a.isPdf);

  // Prepare Gemini inline attachments
  const geminiInlineAttachments: { mimeType: string; data: string }[] = [];
  if (hasAttachments) {
    for (const att of attachments) {
      if (att.base64Data && (att.isImage || att.isPdf)) {
        geminiInlineAttachments.push({
          mimeType: att.mimeType,
          data: att.base64Data,
        });
      }
    }
  }

  // Augment text messages with extracted text for models without native PDF parsing
  const augmentedMessages = [...messages];
  const textAugmentations = attachments
    ?.filter((a) => a.extractedText)
    ?.map(
      (a) =>
        `\n\n--- Content of Attached File [${a.name}] ---\n${a.extractedText}\n--- End of [${a.name}] ---`,
    )
    ?.join('\n\n');

  if (textAugmentations) {
    const lastIdx = augmentedMessages.length - 1;
    if (lastIdx >= 0 && augmentedMessages[lastIdx].role === 'user') {
      augmentedMessages[lastIdx] = {
        ...augmentedMessages[lastIdx],
        content: augmentedMessages[lastIdx].content + textAugmentations,
      };
    }
  }

  // Choose provider-native model ids only when the user explicitly picked one.
  const isGroqModel =
    !!configuredModel &&
    /^(llama|openai\/|qwen|meta|allam|moonshot|deepseek)/i.test(configuredModel);
  const isGeminiModel = !!configuredModel && /^gemini/i.test(configuredModel);
  const isOpenAIModel = !!configuredModel && /^gpt/i.test(configuredModel);
  const isAnthropicModel = !!configuredModel && /^claude/i.test(configuredModel);

  const groqModel = isGroqModel ? configuredModel! : DEFAULT_GROQ_MODEL;
  const geminiModel = isGeminiModel ? configuredModel! : DEFAULT_GEMINI_MODEL;
  const openaiModel = isOpenAIModel ? configuredModel! : DEFAULT_OPENAI_MODEL;
  const anthropicModel = isAnthropicModel ? configuredModel! : 'claude-3-5-haiku-20241022';

  const finish = (out: RouteLLMResult, cacheable = true): RouteLLMResult => {
    if (cacheKey && cacheable && !streaming) llmResponseCache.put(cacheKey, out);
    return out;
  };

  // 1. Images/PDFs need a multimodal model — Gemini handles both natively.
  if (hasImagesOrPdfs && geminiKey) {
    try {
      const res = await callGeminiAI({
        apiKey: geminiKey,
        model: geminiModel,
        systemInstruction,
        messages: augmentedMessages,
        inlineAttachments: geminiInlineAttachments,
        onToken,
      });
      if (res.success && res.content) {
        return finish(
          {
            success: true,
            content: res.content,
            provider: 'Google Gemini (Vision & Multimodal)',
            model: geminiModel,
          },
          !streaming,
        );
      }
    } catch (e) {
      console.warn('Gemini vision/document analysis error, trying fallback:', e);
    }
  }

  // 2. Groq LPU — fastest text path, streamed by default.
  if (groqKey) {
    try {
      const groqMessages = systemInstruction
        ? [{ role: 'system' as const, content: systemInstruction }, ...augmentedMessages]
        : augmentedMessages;

      const res = await callGroqAI({
        apiKey: groqKey,
        model: groqModel,
        messages: groqMessages,
        onToken,
      });
      if (res.success && res.content) {
        return finish({
          success: true,
          content: res.content,
          provider: 'Groq High-Speed LPU',
          model: res.model || groqModel,
        });
      }
      console.warn('Groq provider failed:', res.error);

      // The configured model may be retired or unavailable on this account.
      // Retry once with the current default before moving to another provider.
      const unavailable = /model_not_found|does not exist|do not have access|not have access|decommission/i.test(
        res.error || '',
      );
      if (unavailable && groqModel !== DEFAULT_GROQ_MODEL) {
        console.warn(`Groq model ${groqModel} unavailable, retrying with ${DEFAULT_GROQ_MODEL}`);
        const retry = await callGroqAI({
          apiKey: groqKey,
          model: DEFAULT_GROQ_MODEL,
          messages: groqMessages,
          onToken,
        });
        if (retry.success && retry.content) {
          return finish({
            success: true,
            content: retry.content,
            provider: 'Groq High-Speed LPU',
            model: retry.model || DEFAULT_GROQ_MODEL,
          });
        }
        console.warn('Groq default model retry failed:', retry.error);
      }
    } catch (e) {
      console.warn('Groq provider error, trying fallback:', e);
    }
  }

  // 3. Gemini (text)
  if (geminiKey) {
    try {
      const res = await callGeminiAI({
        apiKey: geminiKey,
        model: geminiModel,
        systemInstruction,
        messages: augmentedMessages,
        inlineAttachments: geminiInlineAttachments,
        onToken,
      });
      if (res.success && res.content) {
        return finish({
          success: true,
          content: res.content,
          provider: 'Google Gemini',
          model: geminiModel,
        });
      }
      console.warn('Gemini provider failed:', res.error);
    } catch (e) {
      console.warn('Gemini provider error, trying fallback:', e);
    }
  }

  // 4. OpenAI
  if (openaiKey) {
    try {
      const res = await callOpenAI({
        apiKey: openaiKey,
        model: openaiModel,
        messages: systemInstruction
          ? [{ role: 'system', content: systemInstruction }, ...augmentedMessages]
          : augmentedMessages,
        onToken,
      });
      if (res.success && res.content) {
        return finish({
          success: true,
          content: res.content,
          provider: 'OpenAI',
          model: openaiModel,
        });
      }
      console.warn('OpenAI provider failed:', res.error);
    } catch (e) {
      console.warn('OpenAI provider error, falling back:', e);
    }
  }

  // 5. Anthropic Claude (non-streaming — emits the full answer once)
  if (anthropicKey) {
    try {
      const res = await callAnthropic({
        apiKey: anthropicKey,
        model: anthropicModel,
        system: systemInstruction,
        messages: augmentedMessages,
      });
      if (res.success && res.content) {
        if (onToken) onToken(res.content);
        return finish({
          success: true,
          content: res.content,
          provider: 'Anthropic',
          model: anthropicModel,
        });
      }
      console.warn('Anthropic provider failed:', res.error);
    } catch (e) {
      console.warn('Anthropic provider error, falling back:', e);
    }
  }

  // 6. Ollama (local, opt-in only)
  if (prefProvider === 'ollama') {
    try {
      const res = await callOllama({
        model: configuredModel || 'llama3',
        messages: systemInstruction
          ? [{ role: 'system', content: systemInstruction }, ...augmentedMessages]
          : augmentedMessages,
      });
      if (res.success && res.content) {
        if (onToken) onToken(res.content);
        return {
          success: true,
          content: res.content,
          provider: 'Ollama (Local)',
          model: configuredModel || 'llama3',
        };
      }
      console.warn('Ollama provider failed:', res.error);
    } catch (e) {
      console.warn('Ollama provider error, falling back:', e);
    }
  }

  // 7. Built-in fallback with document summary if available
  let fallbackReply =
    fallbackContent || "I'm ready to assist you. Ask me anything, or schedule tasks and reminders.";
  if (attachments && attachments.length > 0) {
    const attSummaries = attachments
      .map((a) => {
        if (a.extractedText && a.extractedText.trim()) {
          const text = a.extractedText.trim();
          const clipped = text.length > 4000 ? `${text.slice(0, 4000)}\n…(truncated)` : text;
          return `#### 📄 ${a.name}\n\n${clipped}`;
        }
        return `• **${a.name}** (${a.type}): uploaded successfully.`;
      })
      .join('\n\n');
    fallbackReply = `### Analyzed Uploaded Files\n\n${attSummaries}\n\n---\n\nI extracted the content above. Ask me anything about it, or tell me what you'd like done with it.`;
  }

  if (onToken) onToken(fallbackReply);

  return {
    success: true,
    content: fallbackReply,
    provider: 'Assistance Core Engine',
    model: 'Rule-Based Neural Hybrid',
    isOffline: true,
  };
}
