/**
 * Shared guest-mode helpers.
 * Guest users get a real DB user record (so all data stays isolated per user id),
 * but their session expires after 24h and data can be garbage-collected later.
 */

export const GUEST_EMAIL_DOMAIN = 'guest.assistance.ai';
export const GUEST_EMAILS = ['guest@assistance.ai', 'alex@example.com'];
export const GUEST_PROMPT_LIMIT = 5;
export const GUEST_SESSION_HOURS = 24;

/** localStorage key for the guest prompt counter */
export const GUEST_PROMPT_COUNT_KEY = 'recall_guest_prompts';
/** localStorage key marking that the guest session was started */
export const GUEST_SESSION_KEY = 'recall_guest_session';

export function isGuestEmail(email?: string | null): boolean {
  if (!email) return true;
  return GUEST_EMAILS.includes(email) || email.endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

export function makeGuestEmail(): string {
  return `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@${GUEST_EMAIL_DOMAIN}`;
}

export function readGuestPromptCount(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(GUEST_PROMPT_COUNT_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function incrementGuestPromptCount(): number {
  const next = readGuestPromptCount() + 1;
  try {
    window.localStorage.setItem(GUEST_PROMPT_COUNT_KEY, String(next));
  } catch {}
  return next;
}

export function resetGuestPromptCount(): void {
  try {
    window.localStorage.removeItem(GUEST_PROMPT_COUNT_KEY);
  } catch {}
}

export function markGuestSession(): void {
  try {
    window.localStorage.setItem(GUEST_SESSION_KEY, new Date().toISOString());
  } catch {}
}
