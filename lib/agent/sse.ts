/** Minimal SSE line reader shared by the streaming LLM providers. */
export async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onData: (payload: any) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line || line.startsWith(':')) continue;
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        try {
          onData(JSON.parse(payload));
        } catch {
          // Ignore malformed keep-alive fragments.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
