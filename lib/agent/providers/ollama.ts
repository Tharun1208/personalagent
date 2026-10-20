export interface CallOllamaParams {
  host?: string;
  model?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

const REQUEST_TIMEOUT_MS = 20_000;

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      return { success: false, error: `Ollama Error (${response.status}): ${err.slice(0, 200)}` };
    }

    const data = await response.json();
    const content = data.message?.content;

    if (!content) {
      return { success: false, error: 'Empty response from Ollama' };
    }

    return { success: true, content };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.name === 'TimeoutError'
          ? 'Ollama request timed out'
          : err.message || 'Could not connect to Ollama at ' + host,
    };
  }
}
