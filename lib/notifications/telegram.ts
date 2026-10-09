export interface SendTelegramAlertParams {
  botToken?: string;
  chatId?: string;
  title: string;
  message: string;
  type?: 'reminder' | 'task_deadline' | 'morning_briefing';
}

export async function sendTelegramAlert({
  botToken,
  chatId,
  title,
  message,
  type = 'reminder',
}: SendTelegramAlertParams): Promise<{ success: boolean; error?: string }> {
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !targetChatId) {
    return { success: false, error: 'Telegram credentials not configured.' };
  }

  try {
    const icon = type === 'reminder' ? '' : type === 'morning_briefing' ? '' : '';
    const text = `${icon} *Recall AI Alert: ${title}*\n\n${message}`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Telegram HTTP ${res.status}: ${err}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to dispatch Telegram message' };
  }
}
