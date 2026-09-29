import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { callGroqAI } from '@/lib/agent/groq';
import { SubTask } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const task = db.getTaskById(id, user.id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const apiKey = user.preferences?.apiKey || process.env.GROQ_API_KEY;

  const prompt = `Break down the following task into 3 to 5 clear, actionable, concise subtasks.
Task Title: "${task.title}"
${task.description ? `Description: "${task.description}"` : ''}

Respond ONLY with a JSON array of strings representing the subtask titles, with no extra text or markdown code fences. Example: ["Step 1", "Step 2", "Step 3"]`;

  let subtaskTitles: string[] = [];

  if (apiKey) {
    const res = await callGroqAI({
      apiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    if (res.success && res.content) {
      try {
        const clean = res.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          subtaskTitles = parsed.map((s: any) => String(s).trim()).filter(Boolean);
        }
      } catch {
        subtaskTitles = res.content
          .split(/\r?\n/)
          .map((l) => l.replace(/^[-*\d.]+\s*/, '').trim())
          .filter((l) => l.length > 2)
          .slice(0, 5);
      }
    }
  }

  if (subtaskTitles.length === 0) {
    // Intelligent default fallback
    subtaskTitles = [
      `Review requirements & resources for ${task.title}`,
      `Outline execution steps and drafts`,
      `Complete implementation & review work`,
      `Final validation and submission`,
    ];
  }

  const subtasks: SubTask[] = subtaskTitles.map((title, idx) => ({
    id: `sub_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
    title,
    completed: false,
  }));

  const updatedTask = db.setTaskSubtasks(id, user.id, subtasks);

  return NextResponse.json({ task: updatedTask, subtasks });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { subtaskId } = await req.json();

  if (!subtaskId) return NextResponse.json({ error: 'subtaskId is required' }, { status: 400 });

  const updated = db.toggleSubTask(id, subtaskId, user.id);
  if (!updated) return NextResponse.json({ error: 'Task or Subtask not found' }, { status: 404 });

  return NextResponse.json({ task: updated });
}
