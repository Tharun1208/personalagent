/**
 * Removes credentials and secrets from a backup payload before it leaves the
 * server (cloud backups, exported files, etc.).
 */
export function sanitizeBackupPayload(payload: Record<string, any>): Record<string, any> {
  const clone = JSON.parse(JSON.stringify(payload || {}));
  const prefs = clone?.user?.preferences;
  if (prefs) {
    delete prefs.apiKey;
    delete prefs.githubToken;
    delete prefs.telegramBotToken;
    delete prefs.telegramChatId;
    delete prefs.customAlarmUrl;
  }
  return clone;
}
