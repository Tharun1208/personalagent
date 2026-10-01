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
}

export async function callGeminiAI({
  apiKey,
  model = 'gemini-3.5-flash-lite',
  systemInstruction,
  messages,
  inlineAttachments = [],
  tools = [],
}: CallGeminiParams): Promise<{ success: boolean; content?: string; error?: string; toolCalls?: any[] }> {
  try {
    const contents: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'system' && !systemInstruction) {
        systemInstruction = msg.content;
      } else {
        const parts: any[] = [{ text: msg.content }];

        // Attach multimodal inline_data to the last user message
        if (i === messages.length - 1 && msg.role === 'user' && inlineAttachments && inlineAttachments.length > 0) {
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

    const payload: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    const candidateModels = Array.from(
      new Set([
        model,
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-flash-latest',
      ].filter(Boolean))
    );

    let lastError = '';

    for (const targetModel of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Gemini model ${targetModel} (${response.status}): ${errText}`;
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text) {
          return { success: true, content: text };
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    return { success: false, error: lastError || 'All Gemini model candidates failed' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to call Gemini AI' };
  }
}
