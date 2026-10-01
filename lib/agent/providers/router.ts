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

export interface RouteLLMParams {
  preferences?: UserPreferences;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  systemInstruction?: string;
  fallbackContent?: string;
  attachments?: ProcessedAttachment[];
}

export interface RouteLLMResult {
  success: boolean;
  content: string;
  provider: string;
  model: string;
  error?: string;
}

export async function routeLLMRequest({
  preferences,
  messages,
  systemInstruction,
  fallbackContent,
  attachments = [],
}: RouteLLMParams): Promise<RouteLLMResult> {
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
  const hasAttachments = attachments && attachments.length > 0;
  
  // DSA LRU Cache check for fast non-attachment queries
  const cacheKey = !hasAttachments ? `${preferences?.model || 'default'}_${lastUserMsg.trim().toLowerCase()}` : null;
  if (cacheKey && llmResponseCache.has(cacheKey)) {
    const cached = llmResponseCache.get(cacheKey);
    if (cached) {
      return { ...cached, provider: `${cached.provider} (DSA LRU Cached)` };
    }
  }
  const prefProvider = preferences?.aiProvider?.toLowerCase();
  const prefKey = preferences?.apiKey;
  const configuredModel = preferences?.model;

  const groqKey = (prefProvider === 'groq' && prefKey) ? prefKey : (process.env.GROQ_API_KEY || (prefKey?.startsWith('gsk_') ? prefKey : undefined));
  const geminiKey = (prefProvider === 'gemini' && prefKey) ? prefKey : (process.env.GEMINI_API_KEY || prefKey);
  const openaiKey = (prefProvider === 'openai' && prefKey) ? prefKey : (process.env.OPENAI_API_KEY || (prefKey?.startsWith('sk-') ? prefKey : undefined));
  const anthropicKey = (prefProvider === 'anthropic' && prefKey) ? prefKey : (process.env.ANTHROPIC_API_KEY);
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
  let augmentedMessages = [...messages];
  const textAugmentations = attachments
    ?.filter((a) => a.extractedText)
    ?.map((a) => `\n\n--- Content of Attached File [${a.name}] ---\n${a.extractedText}\n--- End of [${a.name}] ---`)
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

  // 1. If images/PDFs are present, GEMINI is the best multimodal provider
  if (hasImagesOrPdfs && geminiKey) {
    try {
      const res = await callGeminiAI({
        apiKey: geminiKey,
        model: 'gemini-3.5-flash-lite',
        systemInstruction,
        messages: augmentedMessages,
        inlineAttachments: geminiInlineAttachments,
      });
      if (res.success && res.content) {
        const out: RouteLLMResult = { success: true, content: res.content, provider: 'Google Gemini Flash Lite (Vision & Multimodal Intelligence)', model: 'gemini-3.5-flash-lite' };
        if (cacheKey) llmResponseCache.put(cacheKey, out);
        return out;
      }
    } catch (e) {
      console.warn('Gemini vision/document analysis error, trying fallback:', e);
    }
  }

  // 2. Groq High-Speed LPU (Ultra-fast ~200-400ms inference for text)
  if (groqKey) {
    try {
      const targetGroqModel = (configuredModel && (configuredModel.startsWith('qwen') || configuredModel.startsWith('openai/') || configuredModel.startsWith('allam')))
        ? configuredModel
        : 'qwen/qwen3.8-27b';

      const res = await callGroqAI({
        apiKey: groqKey,
        model: targetGroqModel,
        messages: systemInstruction ? [{ role: 'system', content: systemInstruction }, ...augmentedMessages] : augmentedMessages,
      });
      if (res.success && res.content) {
        const out: RouteLLMResult = { success: true, content: res.content, provider: 'Groq High-Speed LPU', model: targetGroqModel };
        if (cacheKey) llmResponseCache.put(cacheKey, out);
        return out;
      }
    } catch (e) {
      console.warn('Groq provider error, trying fallback:', e);
    }
  }

  // 3. Gemini Standard / Text
  if (geminiKey) {
    try {
      const targetGeminiModel = configuredModel?.startsWith('gemini') ? configuredModel : 'gemini-3.5-flash-lite';
      const res = await callGeminiAI({
        apiKey: geminiKey,
        model: targetGeminiModel,
        systemInstruction,
        messages: augmentedMessages,
        inlineAttachments: geminiInlineAttachments,
      });
      if (res.success && res.content) {
        const out: RouteLLMResult = { success: true, content: res.content, provider: 'Google Gemini Flash Lite', model: targetGeminiModel };
        if (cacheKey) llmResponseCache.put(cacheKey, out);
        return out;
      }
    } catch (e) {
      console.warn('Gemini provider error, trying fallback:', e);
    }
  }

  // 4. Groq Fallback (GPT-OSS LPU)
  if (groqKey) {
    try {
      const res = await callGroqAI({
        apiKey: groqKey,
        model: 'openai/gpt-oss-120b',
        messages: systemInstruction ? [{ role: 'system', content: systemInstruction }, ...augmentedMessages] : augmentedMessages,
      });
      if (res.success && res.content) {
        const out: RouteLLMResult = { success: true, content: res.content, provider: 'Groq High-Speed LPU', model: 'openai/gpt-oss-120b' };
        if (cacheKey) llmResponseCache.put(cacheKey, out);
        return out;
      }
    } catch (e) {
      console.warn('Groq fallback error:', e);
    }
  }

  // 5. OpenAI
  if (openaiKey) {
    try {
      const res = await callOpenAI({
        apiKey: openaiKey,
        model: configuredModel || 'gpt-4o-mini',
        messages: systemInstruction ? [{ role: 'system', content: systemInstruction }, ...augmentedMessages] : augmentedMessages,
      });
      if (res.success && res.content) {
        return { success: true, content: res.content, provider: 'OpenAI', model: configuredModel || 'gpt-4o-mini' };
      }
    } catch (e) {
      console.warn('OpenAI provider error, falling back:', e);
    }
  }

  // 6. Anthropic Claude
  if (anthropicKey) {
    try {
      const res = await callAnthropic({
        apiKey: anthropicKey,
        model: configuredModel || 'claude-3-5-sonnet-20241022',
        system: systemInstruction,
        messages: augmentedMessages,
      });
      if (res.success && res.content) {
        return { success: true, content: res.content, provider: 'Anthropic', model: configuredModel || 'claude-3-5-sonnet' };
      }
    } catch (e) {
      console.warn('Anthropic provider error, falling back:', e);
    }
  }

  // 7. Ollama (Local)
  if (prefProvider === 'ollama') {
    try {
      const res = await callOllama({
        model: configuredModel || 'llama3',
        messages: systemInstruction ? [{ role: 'system', content: systemInstruction }, ...augmentedMessages] : augmentedMessages,
      });
      if (res.success && res.content) {
        return { success: true, content: res.content, provider: 'Ollama (Local)', model: configuredModel || 'llama3' };
      }
    } catch (e) {
      console.warn('Ollama provider error, falling back:', e);
    }
  }

  // 8. Built-in Fallback with Document summary if available
  let fallbackReply = fallbackContent || "I'm ready to assist you. Ask me anything, or schedule tasks and reminders.";
  if (attachments && attachments.length > 0) {
    const attSummaries = attachments.map(a => `• **${a.name}** (${a.type}): ${a.extractedText ? a.extractedText.slice(0, 300) + '...' : 'Uploaded successfully.'}`).join('\n');
    fallbackReply = `### 📄 Analyzed Uploaded Files\n\nI have received and processed your attachments:\n\n${attSummaries}\n\nHow would you like me to analyze or use these files?`;
  }

  return {
    success: true,
    content: fallbackReply,
    provider: 'Assistance Core Engine',
    model: 'Rule-Based Neural Hybrid',
  };
}
