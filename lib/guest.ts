/**
 * Guest mode removed — single full persistent primary user account with unlimited access.
 */

export const GUEST_EMAIL_DOMAIN = 'assistance.ai';
export const GUEST_EMAILS: string[] = [];
export const GUEST_PROMPT_LIMIT = 999999999;
export const GUEST_SESSION_HOURS = 87600; // 10 years

export const GUEST_PROMPT_COUNT_KEY = 'recall_guest_prompts';
export const GUEST_SESSION_KEY = 'recall_guest_session';

export function isGuestEmail(email?: string | null): boolean {
  return false; // Never restrict any user
}

export function makeGuestEmail(): string {
  return `user@assistance.ai`;
}

export function readGuestPromptCount(): number {
  return 0;
}

export function incrementGuestPromptCount(): number {
  return 0;
}

export function resetGuestPromptCount(): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(GUEST_PROMPT_COUNT_KEY);
    }
  } catch {}
}

export function markGuestSession(): void {}
