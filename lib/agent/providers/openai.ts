export interface CallOpenAIParams {
  apiKey: string;
  model?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  tools?: any[];
}

export async function callOpenAI({
  apiKey,
  model = 'gpt-4o-mini',
  messages,
}: CallOpenAIParams): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
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
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `OpenAI Error (${response.status}): ${err}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'Empty response from OpenAI' };
    }

    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to call OpenAI' };
  }
}
