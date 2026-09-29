export interface CallAnthropicParams {
  apiKey: string;
  model?: string;
  system?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

export async function callAnthropic({
  apiKey,
  model = 'claude-3-5-sonnet-20241022',
  system,
  messages,
}: CallAnthropicParams): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const formattedMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    let systemPrompt = system || '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        formattedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    const payload: any = {
      model,
      max_tokens: 2048,
      messages: formattedMessages,
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Anthropic Error (${response.status}): ${err}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { success: false, error: 'Empty response from Anthropic' };
    }

    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to call Anthropic' };
  }
}
