export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | any[];
}

export async function callGroqAI({
  apiKey,
  messages,
  model = 'llama-3.3-70b-versatile',
  temperature = 0.6,
  maxTokens = 2048,
}: {
  apiKey?: string;
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; success: boolean; error?: string }> {
  const key = apiKey || process.env.GROQ_API_KEY;

  if (!key) {
    return {
      success: false,
      content: '',
      error: 'No Groq API key provided. Please set GROQ_API_KEY in .env.local or in Application Settings.',
    };
  }

  // Verified ultra-fast Groq LPU models (200-400ms inference)
  const KNOWN_GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ];

  const preferredModel = (model && KNOWN_GROQ_MODELS.includes(model)) ? model : 'llama-3.3-70b-versatile';
  const modelsToTry = [
    preferredModel,
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
  ];

  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const targetModel of uniqueModels) {
    try {
      // Ensure all message content items are string-safe for standard Groq endpoints
      const sanitizedMessages = messages.map((m) => {
        if (Array.isArray(m.content)) {
          const textPart = m.content.find((p: any) => p.type === 'text');
          return { role: m.role, content: textPart?.text || JSON.stringify(m.content) };
        }
        return m;
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          messages: sanitizedMessages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const choiceMsg = data?.choices?.[0]?.message;
      const reply = choiceMsg?.content || (choiceMsg?.reasoning ? choiceMsg.reasoning : '') || '';

      if (reply && reply.trim().length > 0) {
        return {
          success: true,
          content: reply.trim(),
        };
      }
    } catch (err) {
      console.warn(`Groq model ${targetModel} error, trying fallback...`);
    }
  }

  return {
    success: false,
    content: '',
    error: 'Failed to generate response using Groq API models.',
  };
}
