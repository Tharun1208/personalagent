import { db } from '@/lib/db';
import { Reminder, Task } from '@/types';

/**
 * Generates an RFC 5545 iCalendar (.ics) export for Google Calendar / Apple Calendar
 */
export function generateIcsCalendar(userId: string): string {
  const reminders = db.getReminders(userId);
  const tasks = db.getTasks(userId);
  const user = db.getUserById(userId);
  const userName = (user?.preferences as any)?.displayName || user?.name || 'Recall User';

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Recall AI//Personal Assistant Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${userName}'s Recall AI Schedule`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Add Reminders
  for (const r of reminders) {
    if (!r.dueDateTime) continue;
    const startStr = formatDate(r.dueDateTime);
    const endStr = formatDate(new Date(new Date(r.dueDateTime).getTime() + 30 * 60000).toISOString());
    const nowStr = formatDate(new Date().toISOString());

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:reminder_${r.id}@assistance.ai`);
    ics.push(`DTSTAMP:${nowStr}`);
    ics.push(`DTSTART:${startStr}`);
    ics.push(`DTEND:${endStr}`);
    ics.push(`SUMMARY:⏰ ${r.title.replace(/[,;]/g, ' ')}`);
    if (r.notes) ics.push(`DESCRIPTION:${r.notes.replace(/\n/g, '\\n')}`);
    ics.push(`STATUS:${r.status === 'dismissed' ? 'CANCELLED' : 'CONFIRMED'}`);
    ics.push('BEGIN:VALARM');
    ics.push('TRIGGER:-PT0M');
    ics.push('ACTION:DISPLAY');
    ics.push(`DESCRIPTION:Alarm: ${r.title.replace(/[,;]/g, ' ')}`);
    ics.push('END:VALARM');
    ics.push('END:VEVENT');
  }

  // Add Tasks with Due Dates
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const startStr = formatDate(t.dueDate);
    const endStr = formatDate(new Date(new Date(t.dueDate).getTime() + 60 * 60000).toISOString());
    const nowStr = formatDate(new Date().toISOString());

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:task_${t.id}@assistance.ai`);
    ics.push(`DTSTAMP:${nowStr}`);
    ics.push(`DTSTART:${startStr}`);
    ics.push(`DTEND:${endStr}`);
    ics.push(`SUMMARY:📋 ${t.title.replace(/[,;]/g, ' ')}`);
    if (t.description) ics.push(`DESCRIPTION:${t.description.replace(/\n/g, '\\n')}`);
    ics.push(`STATUS:${t.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`);
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

/**
 * Creates full cloud JSON backup payload for Google Drive
 */
export function createGoogleDriveBackupPayload(userId: string) {
  const user = db.getUserById(userId);
  const memories = db.getMemories(userId);
  const tasks = db.getTasks(userId);
  const reminders = db.getReminders(userId);
  const goals = db.getGoals(userId);
  const ledger = db.getLedgerEntries(userId);
  const habits = db.getHabits(userId);
  const conversations = db.getConversations(userId);

  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    user: {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      preferences: user?.preferences,
    },
    data: {
      memories,
      tasks,
      reminders,
      goals,
      ledger,
      habits,
      conversations,
    },
  };
}
