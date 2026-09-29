export interface CallOllamaParams {
  host?: string;
  model?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

export async function callOllama({
  host = 'http://localhost:11434',
  model = 'llama3',
  messages,
}: CallOllamaParams): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const cleanHost = host.replace(/\/$/, '');
    const response = await fetch(`${cleanHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Ollama Error (${response.status}): ${err}` };
    }

    const data = await response.json();
    const content = data.message?.content;

    if (!content) {
      return { success: false, error: 'Empty response from Ollama' };
    }

    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not connect to Ollama at ' + host };
  }
}
