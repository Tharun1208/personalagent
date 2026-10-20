'use client';

import { useState } from 'react';
import { Check, X, CalendarClock, Flag, Bell, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

interface Props {
  toolName: string;
  action: string;
  payload: Record<string, any>;
}

/**
 * Editable confirmation card for agent drafts (currently task creation).
 * The user can adjust every field before anything is written to the database.
 */
export default function TaskConfirmationCard({ toolName, action, payload }: Props) {
  const { confirmAction } = useApp() as any;

  const [title, setTitle] = useState<string>(payload.title || '');
  const [priority, setPriority] = useState<string>(payload.priority || 'medium');
  const [dueDate, setDueDate] = useState<string>(toLocalInput(payload.dueDate));
  const [reminderAt, setReminderAt] = useState<string>(toLocalInput(payload.reminderAt));
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<'added' | 'cancelled' | null>(null);

  const handleConfirm = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await confirmAction(
        'TaskTool',
        'createTask',
        {
          title: title.trim(),
          priority,
          dueDate: fromLocalInput(dueDate),
        },
        true,
      );

      if (reminderAt) {
        await confirmAction(
          'ReminderTool',
          'createReminder',
          {
            title: title.trim(),
            dueDateTime: fromLocalInput(reminderAt),
            priority: priority === 'urgent' ? 'high' : priority,
          },
          true,
        );
      }

      setResolved('added');
    } catch {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await confirmAction(toolName, action, payload, false);
    } finally {
      setResolved('cancelled');
      setBusy(false);
    }
  };

  if (resolved) {
    return (
      <div className={`mt-3 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
        resolved === 'added'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}>
        {resolved === 'added' ? <Check size={16} /> : <X size={16} />}
        <span className="font-medium">
          {resolved === 'added' ? 'Task added to your list.' : 'Task draft discarded.'}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-blue-200/70 bg-gradient-to-b from-blue-50/70 to-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-blue-700">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
          <Sparkles size={13} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">Confirm new task</span>
      </div>

      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        placeholder="Task title"
      />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Flag size={11} /> Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <CalendarClock size={11} /> Due
          </label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <Bell size={11} /> Reminder (optional)
        </label>
        <input
          type="datetime-local"
          value={reminderAt}
          onChange={(e) => setReminderAt(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Add Task
        </button>
      </div>
    </div>
  );
}
