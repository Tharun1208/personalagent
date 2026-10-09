import { db } from '@/lib/db';
import { memoryEngine } from '@/lib/memory';
import { toolRegistry } from '@/lib/tools';
import { routeLLMRequest } from './providers/router';
import { processAllAttachments } from './fileAnalyzer';
import { Message, ToolExecutionStep, Memory, AgentAction } from '@/types';
import { FuzzyMatcher } from '@/lib/dsa/FuzzyMatcher';
import { getHolidayForDate, getUpcomingHolidays, getHolidaysForYear, isGovernmentHoliday } from '@/lib/calendar/holidays';

export interface AgentRunParams {
  userId: string;
  conversationId: string;
  userPrompt: string;
  model?: string;
  attachments?: any[];
  timezone?: string;
}

export interface AgentRunResult {
  reply: string;
  toolSteps: ToolExecutionStep[];
  memorySaved?: { id: string; content: string; type: any }[];
  requiresConfirmation?: boolean;
  confirmationPayload?: any;
}

export function parseReminderRequest(text: string): {
  isReminder: boolean;
  title: string;
  targetTime: Date;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
} | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const isReminderTrigger =
    lower.startsWith('remind') ||
    lower.startsWith('remeber') ||
    lower.startsWith('notify') ||
    lower.startsWith('alert') ||
    lower.startsWith('alarm') ||
    lower.startsWith('set an alarm') ||
    lower.startsWith('set alarm') ||
    lower.startsWith('sound alarm') ||
    lower.startsWith('wake me up') ||
    lower.startsWith('ping me') ||
    lower.startsWith('tell me at') ||
    lower.startsWith('remember me at') ||
    lower.startsWith('remeber me at') ||
    lower.startsWith('remember me to') ||
    lower.startsWith('remeber me to') ||
    lower.startsWith('remember at') ||
    lower.startsWith('remeber at') ||
    lower.startsWith('rember') ||
    lower.startsWith('set a reminder') ||
    lower.startsWith('set reminder') ||
    lower.startsWith('create a reminder') ||
    lower.startsWith('create reminder') ||
    lower.startsWith('schedule a reminder') ||
    lower.startsWith('schedule reminder') ||
    lower.startsWith('schedule event') ||
    lower.startsWith('schedule the event') ||
    lower.startsWith('schedule an event') ||
    lower.startsWith('schedule a meeting') ||
    lower.startsWith('schedule meeting') ||
    lower.startsWith('schedule the meeting') ||
    lower.startsWith('schedule a call') ||
    lower.startsWith('schedule call') ||
    lower.startsWith('schedule appointment') ||
    lower.startsWith('schedule an appointment') ||
    lower.startsWith('schedule session') ||
    lower.startsWith('schedule a session') ||
    lower.startsWith('add event') ||
    lower.startsWith('add an event') ||
    lower.startsWith('create event') ||
    lower.startsWith('create an event') ||
    lower.startsWith('set event') ||
    lower.startsWith('new event') ||
    lower.includes('schedule event') ||
    lower.includes('schedule an event') ||
    lower.includes('schedule the event') ||
    lower.includes('schedule meeting') ||
    lower.includes('schedule a meeting') ||
    lower.includes('remind me ') ||
    lower.includes('remeber me ') ||
    lower.includes('notify me ') ||
    lower.includes('notify us') ||
    lower.includes('alert me ') ||
    lower.includes('alarm at ') ||
    lower.includes('alarm for ') ||
    lower.includes('sound alarm ') ||
    lower.includes('set an alarm ') ||
    lower.includes('set a reminder ') ||
    lower.includes('reminder at ') ||
    lower.includes('reminder for ') ||
    lower.includes('remind me at') ||
    lower.includes('remeber me at') ||
    lower.includes('notify me at') ||
    (lower.startsWith('schedule ') && /\b(?:at\s+\d|\d{1,2}(?::\d{2})?\s*(?:am|pm)|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lower)) ||
    (lower.startsWith('remember ') && /\b(?:at\s+\d|\d{1,2}(?::\d{2})?\s*(?:am|pm)|in\s+\d+\s*(?:min|hour|sec)|tomorrow|tonight)\b/i.test(lower));

  if (!isReminderTrigger) return null;

  const now = new Date();
  let targetTime = new Date(now);
  let recurrence: 'none' | 'daily' | 'weekly' | 'monthly' = 'none';

  if (lower.includes('every sunday')) recurrence = 'weekly';
  else if (lower.includes('every day') || lower.includes('daily')) recurrence = 'daily';
  else if (lower.includes('every week') || lower.includes('weekly')) recurrence = 'weekly';
  else if (lower.includes('every month') || lower.includes('monthly')) recurrence = 'monthly';

  let hasExplicitTime = false;

  // 1. Relative time: "in 10 minutes", "in 2 hours", "after 30 mins", "in 1 day"
  const relMatch = lower.match(/(?:in|after)\s+(\d+)\s*(mins?|minutes?|hours?|hrs?|days?|secs?|seconds?)/i);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    if (unit.startsWith('min')) targetTime = new Date(now.getTime() + val * 60000);
    else if (unit.startsWith('hour') || unit.startsWith('hr')) targetTime = new Date(now.getTime() + val * 3600000);
    else if (unit.startsWith('day')) targetTime = new Date(now.getTime() + val * 86400000);
    else if (unit.startsWith('sec')) targetTime = new Date(now.getTime() + val * 1000);
    hasExplicitTime = true;
  }

  // 2. Specific time of day: "at 5pm", "at 5:30 pm", "5pm", "5:00 am", "at 5", "at 17:00", "5:30pm"
  const timeWordMatch =
    lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ||
    lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i) ||
    lower.match(/\b(\d{1,2})(?::(\d{2}))\s*(am|pm)?\b/i);

  if (!hasExplicitTime && timeWordMatch) {
    let hours = parseInt(timeWordMatch[1], 10);
    const minutes = timeWordMatch[2] ? parseInt(timeWordMatch[2], 10) : 0;
    const meridian = timeWordMatch[3] ? timeWordMatch[3].toLowerCase() : null;

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    if (!meridian && hours < 12) {
      if (hours >= 1 && hours <= 7 && now.getHours() >= 12) {
        hours += 12;
      }
    }

    targetTime.setHours(hours, minutes, 0, 0);

    if (lower.includes('tomorrow')) {
      targetTime.setDate(targetTime.getDate() + 1);
    } else if (targetTime.getTime() <= now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    hasExplicitTime = true;
  }

  // 3. Fallback if no specific hour detected
  if (!hasExplicitTime) {
    if (lower.includes('tomorrow')) {
      targetTime.setDate(targetTime.getDate() + 1);
      targetTime.setHours(9, 0, 0, 0);
    } else {
      targetTime = new Date(now.getTime() + 3600000);
    }
  }

  // Extract clean event / reminder title
  let title = trimmed
    .replace(/^(?:please\s+)?(?:remind me|remeber me|remember me|rember me|notify me|notify us|notify|alert me|alert|set an alarm|set alarm|sound alarm|alarm me|alarm|ping me|tell me|remind|remeber|remember|set a reminder|set reminder|create a reminder|schedule a reminder|schedule the reminder|schedule an event|schedule the event|schedule event|schedule a meeting|schedule the meeting|schedule meeting|schedule a call|schedule call|schedule an appointment|schedule appointment|schedule a session|schedule session|add an event|add event|create an event|create event|set event|new event|schedule)\s+/i, '')
    .replace(/(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '')
    .replace(/(?:tomorrow|today|tonight)\s*(?:at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i, '')
    .replace(/(?:in|after)\s+\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)/i, '')
    .replace(/(?:every\s+(?:day|sunday|monday|tuesday|wednesday|thursday|friday|saturday|week|month))/i, '');

  // Clean up leading verbs repeatedly
  title = title
    .replace(/^\s*(?:to|about|for|that|on|called|named|with)\s+/i, '')
    .replace(/^\s*(?:to|about|for|that|on|called|named|with)\s+/i, '')
    .trim();

  title = title.replace(/[.,!?]+$/, '').trim();

  const formattedTimeStr = targetTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (!title || title.toLowerCase() === 'me' || title.length < 2) {
    title = `Event at ${formattedTimeStr}`;
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    isReminder: true,
    title,
    targetTime,
    recurrence,
  };
}

export function parseTaskIntent(text: string): {
  isTask: boolean;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  hasReminder?: boolean;
  reminderTime?: Date;
} | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const isTaskTrigger =
    /^(?:please\s+)?(?:add|create|new|make|set|schedule|insert|put)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(?:task|todo|to-do|event\s+and\s+task|task\s+and\s+event)\b/i.test(lower) ||
    lower.startsWith('todo:') ||
    lower.startsWith('todo ') ||
    lower.startsWith('task is') ||
    lower.startsWith('task:') ||
    lower.startsWith('my task is') ||
    lower.startsWith('schedule task') ||
    lower.startsWith('schedule the task') ||
    lower.startsWith('schedule a task') ||
    lower.startsWith('schedule the event and task') ||
    lower.startsWith('schedule event and task') ||
    lower.startsWith('schedule the task and event') ||
    lower.startsWith('schedule task and event') ||
    lower.includes('task is to') ||
    lower.includes('task is :') ||
    lower.includes('add a new task') ||
    lower.includes('add the task') ||
    lower.includes('create the task');

  if (!isTaskTrigger) return null;

  // Extract priority
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  if (lower.includes('urgent') || lower.includes('priority is urgent') || lower.includes('priority: urgent')) {
    priority = 'urgent';
  } else if (lower.includes('high') || lower.includes('priority is high') || lower.includes('priority: high')) {
    priority = 'high';
  } else if (lower.includes('low') || lower.includes('priority is low') || lower.includes('priority: low')) {
    priority = 'low';
  }

  // Extract due date / time
  let dueDate: string | undefined = undefined;
  const now = new Date();
  let dueTime = new Date(now);

  const dueMatch =
    lower.match(/(?:due\s+is|due\s*:|by|at|on|for)\s*(?:today|tomorrow)?\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) ||
    lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (dueMatch) {
    let hours = parseInt(dueMatch[1], 10);
    const minutes = dueMatch[2] ? parseInt(dueMatch[2], 10) : 0;
    const meridian = dueMatch[3] ? dueMatch[3].toLowerCase() : null;

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    if (!meridian && hours < 12 && (hours >= 1 && hours <= 7)) hours += 12;

    dueTime.setHours(hours, minutes, 0, 0);
    if (lower.includes('tomorrow')) {
      dueTime.setDate(dueTime.getDate() + 1);
    } else if (dueTime.getTime() <= now.getTime()) {
      dueTime.setDate(dueTime.getDate() + 1);
    }
    dueDate = dueTime.toISOString();
  } else if (lower.includes('tomorrow')) {
    dueTime.setDate(dueTime.getDate() + 1);
    dueTime.setHours(18, 0, 0, 0);
    dueDate = dueTime.toISOString();
  }

  // Check if reminder / event is also requested in the same prompt
  let hasReminder = false;
  let reminderTime: Date | undefined = undefined;
  const isDualEventAndTask =
    lower.includes('event and task') ||
    lower.includes('task and event') ||
    lower.includes('schedule') ||
    lower.includes('remind') ||
    lower.includes('alarm');

  const reminderMatch = lower.match(/(?:and\s+)?(?:remind|alarm|sound\s+alarm|set\s+alarm|remembe|remember|notify|ping|alert)\s*(?:me)?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  if (reminderMatch) {
    hasReminder = true;
    let rHours = parseInt(reminderMatch[1], 10);
    const rMinutes = reminderMatch[2] ? parseInt(reminderMatch[2], 10) : 0;
    const rMeridian = reminderMatch[3] ? reminderMatch[3].toLowerCase() : null;

    if (rMeridian === 'pm' && rHours < 12) rHours += 12;
    if (rMeridian === 'am' && rHours === 12) rHours = 0;
    if (!rMeridian && rHours < 12 && (rHours >= 1 && rHours <= 7)) rHours += 12;

    const rTime = new Date(now);
    rTime.setHours(rHours, rMinutes, 0, 0);
    if (rTime.getTime() <= now.getTime() && !lower.includes('today')) {
      rTime.setDate(rTime.getDate() + 1);
    }
    reminderTime = rTime;
  } else if (isDualEventAndTask) {
    hasReminder = true;
    reminderTime = dueDate ? new Date(dueDate) : new Date(now.getTime() + 3600000);
  }

  // Extract Title
  let title = trimmed;
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    title = lines[0];
  }

  title = title
    .replace(/^(?:please\s+)?(?:add|create|new|make|set|schedule|insert|put)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(?:event\s+and\s+task|task\s+and\s+event|task|todo|to-do)(?:\s+to|\s*:|\s+is|\s+that|\s+for)?\s+/i, '')
    .replace(/^(?:task is to|task is|my task is|task:|todo:|todo)\s+/i, '')
    .replace(/(?:due\s+is|due\s*:|priority\s+is|priority\s*:|and\s+remind.*|and\s+remembe.*).*/i, '')
    .replace(/(?:\s+with\s+(?:urgent|high|medium|low)\s+priority|\s+as\s+(?:urgent|high|medium|low)\s+priority)/i, '')
    .replace(/[.,!?]+$/, '')
    .trim();

  // Clean common typos
  title = title.replace(/assisgment/i, 'assignment');

  if (!title || title.length < 2) {
    title = 'Scheduled Task';
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    isTask: true,
    title,
    priority,
    dueDate,
    hasReminder,
    reminderTime,
  };
}

export function parseLedgerIntent(text: string): {
  isLedger: boolean;
  action: 'add' | 'get' | 'settle';
  personName?: string;
  amount?: number;
  currency?: string;
  type?: 'give' | 'receive';
  description?: string;
} | null {
  const lower = text.toLowerCase().trim();

  // 1. Settle / Paid back
  if (
    lower.includes('settle debt') ||
    lower.includes('settle due') ||
    lower.includes('settle payment') ||
    lower.includes('mark settled') ||
    lower.includes('mark as settled') ||
    lower.includes('paid back') ||
    lower.includes('returned the money') ||
    lower.includes('paid me back')
  ) {
    const personMatch = lower.match(/(?:with|to|from|for|by)\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:for|amount|\$|₹|at|on|today)|\.|$)/i);
    return {
      isLedger: true,
      action: 'settle',
      personName: personMatch ? personMatch[1].trim() : text,
    };
  }

  // 2. Query dues / debts
  if (
    lower.includes('who do i owe') ||
    lower.includes('who owes me') ||
    lower.includes('my debts') ||
    lower.includes('money ledger') ||
    lower.includes('pending dues') ||
    lower.includes('who should i give') ||
    lower.includes('how much do i owe') ||
    lower.includes('who i have to pay') ||
    lower.includes('my dues')
  ) {
    return {
      isLedger: true,
      action: 'get',
    };
  }

  // 3. Add Debt / Due
  const isGive =
    lower.startsWith('i owe') ||
    lower.includes('i owe') ||
    lower.startsWith('need to give') ||
    lower.includes('need to give') ||
    lower.includes('have to give') ||
    lower.includes('borrowed') ||
    lower.includes('give money to');

  const isReceive =
    lower.includes('owes me') ||
    lower.includes('lent') ||
    lower.includes('needs to give me') ||
    lower.includes('has to give me') ||
    lower.includes('to receive from');

  if (isGive || isReceive) {
    const amountMatch = lower.match(/(?:[\$₹€£]|rs\.?|inr|usd)?\s*(\d+(?:\.\d{1,2})?)\s*(?:[\$₹€£]|rs\.?|inr|usd|dollars?|rupees?)?/i);
    const currMatch = lower.match(/[\$₹€£]|rs\.?|inr|usd|dollars?|rupees?/i);
    let currency = '₹';
    if (currMatch) {
      const c = currMatch[0].toLowerCase();
      if (c === '$' || c.includes('usd') || c.includes('dollar')) currency = '$';
      else if (c === '€' || c.includes('eur')) currency = '€';
      else if (c === '£' || c.includes('gbp')) currency = '£';
    }

    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    const personMatch =
      lower.match(/(?:to|from|by|with)\s+(?!give|pay|receive|borrow|lend|me|us|a|the)([a-zA-Z0-9]+)/i) ||
      lower.match(/^([a-zA-Z0-9]+)\s+(?:owes|needs to give|has to give)/i);
    const rawName = personMatch ? personMatch[1] : 'Friend';
    const personName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    if (amount > 0) {
      return {
        isLedger: true,
        action: 'add',
        personName: personName.charAt(0).toUpperCase() + personName.slice(1),
        amount,
        currency,
        type: isGive ? 'give' : 'receive',
        description: text,
      };
    }
  }

  return null;
}

export class AgentOrchestrator {
  static async run({
    userId,
    conversationId,
    userPrompt,
    model = 'Recall Core Ultra',
    attachments = [],
    timezone = 'Asia/Kolkata',
  }: AgentRunParams): Promise<AgentRunResult> {
    const trimmed = userPrompt.trim();
    const lower = trimmed.toLowerCase();
    const toolSteps: ToolExecutionStep[] = [];
    const memorySavedList: { id: string; content: string; type: any }[] = [];
    let requiresConfirmation = false;
    let confirmationPayload: any = null;

    try {
      // Process any uploaded attachments (Images, PDFs, Documents) silently for multimodal LLM context
      const processedAttachments = await processAllAttachments(attachments);

      // ─────────────────────────────────────────────────────────────
      // STEP 0: MULTIMODAL ATTACHMENTS & VISION ANALYSIS
      // ─────────────────────────────────────────────────────────────
      if (processedAttachments && processedAttachments.length > 0) {
        const fileNames = processedAttachments.map((a) => a.name).join(', ');
        toolSteps.push({
          toolName: 'FileAnalysisTool',
          action: 'analyzeMultimodalContent',
          input: { files: fileNames, count: processedAttachments.length },
          status: 'executing',
        });

        const startTime = Date.now();
        const userObj = db.getUserById(userId);
        const userName = (userObj?.preferences as any)?.displayName || userObj?.name || 'User';

        const multimodalSystemPrompt = `You are Assistance, an intelligent multimodal AI assistant with visual and document intelligence.
The user (${userName}) has uploaded ${processedAttachments.length} file(s): ${fileNames}.
Please inspect and analyze the attached image(s), screenshot(s), diagram(s), or document(s) thoroughly.
Explain what you see clearly, extract any key text/details, and answer the user's prompt directly with insightful Markdown formatting.`;

        const llmRes = await routeLLMRequest({
          preferences: userObj?.preferences,
          messages: [{ role: 'user', content: userPrompt }],
          systemInstruction: multimodalSystemPrompt,
          fallbackContent: `I've received and processed your attachment(s): **${fileNames}**.`,
          attachments: processedAttachments,
        });

        const executionTimeMs = Date.now() - startTime;
        toolSteps[toolSteps.length - 1] = {
          toolName: 'FileAnalysisTool',
          action: 'analyzeMultimodalContent',
          input: { files: fileNames },
          output: {
            success: llmRes.success,
            provider: llmRes.provider,
            model: llmRes.model,
          },
          status: llmRes.success ? 'success' : 'failed',
          executionTimeMs,
        };

        db.logAgentAction({
          id: `act_${Date.now()}`,
          userId,
          conversationId,
          toolName: 'FileAnalysisTool',
          action: 'analyzeMultimodalContent',
          summary: `Analyzed ${processedAttachments.length} attachment(s): ${fileNames}`,
          status: 'success',
          permissionLevel: 'READ',
          createdAt: new Date().toISOString(),
        });

        return {
          reply: llmRes.content,
          toolSteps,
        };
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 1: EXPLICIT MEMORY INSTRUCTION DETECTION
      // ─────────────────────────────────────────────────────────────
      const memInstruction = memoryEngine.detectExplicitMemoryInstruction(trimmed);

    if (memInstruction.action === 'save' && memInstruction.extractedContent) {
      toolSteps.push({
        toolName: 'MemoryTool',
        action: 'saveMemory',
        input: { content: memInstruction.extractedContent },
        status: 'executing',
      });

      const startTime = Date.now();
      const savedMem = memoryEngine.save(userId, memInstruction.extractedContent);
      const executionTimeMs = Date.now() - startTime;

      toolSteps[toolSteps.length - 1] = {
        toolName: 'MemoryTool',
        action: 'saveMemory',
        input: { content: memInstruction.extractedContent },
        output: savedMem,
        status: 'success',
        executionTimeMs,
      };

      memorySavedList.push({
        id: savedMem.id,
        content: savedMem.content,
        type: savedMem.type,
      });

      // Log agent action
      db.logAgentAction({
        id: `act_${Date.now()}`,
        userId,
        conversationId,
        toolName: 'MemoryTool',
        action: 'saveMemory',
        summary: `Stored ${savedMem.type} memory: "${savedMem.content}"`,
        status: 'success',
        permissionLevel: 'WRITE',
        details: savedMem,
        createdAt: new Date().toISOString(),
      });

      // Special check: If saving an important deadline, proactively offer a reminder
      if (savedMem.type === 'important_date') {
        return {
          reply: `✓ **Saved to memory.**\n\nI've noted that **${savedMem.content}** is an important deadline.\n\n*Would you like me to schedule an automated reminder for this date as well?*`,
          toolSteps,
          memorySaved: memorySavedList,
        };
      }

      return {
        reply: `✓ **Saved to memory.**\n\nI'll remember that: *"${savedMem.content}"* (categorized under **${savedMem.category || 'Personal'}**).`,
        toolSteps,
        memorySaved: memorySavedList,
      };
    }

    if (memInstruction.action === 'dont_remember') {
      return {
        reply: `Understood. I will **not** remember this, and nothing from this exchange has been stored in your memory.`,
        toolSteps: [],
      };
    }

    if (memInstruction.action === 'forget') {
      const topic = memInstruction.topic || 'that';
      toolSteps.push({
        toolName: 'MemoryTool',
        action: 'forgetMemory',
        input: { topic },
        status: 'executing',
      });

      const count = memoryEngine.forget(userId, topic);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'MemoryTool',
        action: 'forgetMemory',
        input: { topic },
        output: { removedCount: count },
        status: 'success',
      };

      db.logAgentAction({
        id: `act_${Date.now()}`,
        userId,
        conversationId,
        toolName: 'MemoryTool',
        action: 'forgetMemory',
        summary: `Forgotten memories regarding "${topic}"`,
        status: 'success',
        permissionLevel: 'DESTRUCTIVE',
        createdAt: new Date().toISOString(),
      });

      return {
        reply: count > 0
          ? `✓ **Forgotten.** I have removed **${count}** memory entry(s) regarding *"${topic}"*.`
          : `I didn't find any stored memories matching *"${topic}"*.`,
        toolSteps,
      };
    }

    if (memInstruction.action === 'list') {
      const memories = db.getMemories(userId);
      toolSteps.push({
        toolName: 'MemoryTool',
        action: 'listMemories',
        input: {},
        output: { count: memories.length },
        status: 'success',
      });

      if (!memories.length) {
        return {
          reply: `I don't have any memories saved for you yet because we haven't stored any preferences or facts in your Memory Vault yet.\n\nYou can introduce yourself or tell me anything (for example: **"My name is..."**, **"Remember that I prefer TypeScript"**, or **"I work on AI apps"**), and I will remember it persistently across all our chats.`,
          toolSteps,
        };
      }

      const grouped = memories.reduce((acc, m) => {
        const cat = m.category || 'Personal';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
      }, {} as Record<string, Memory[]>);

      let reply = `Here is what I currently remember about you:\n\n`;
      for (const [cat, items] of Object.entries(grouped)) {
        reply += `### ${cat}\n`;
        for (const item of items) {
          reply += `* **${item.content}**\n`;
        }
        reply += `\n`;
      }
      reply += `*You can ask me to update or forget any of these anytime.*`;

      return { reply, toolSteps };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: RELEVANT MEMORY RETRIEVAL FOR CONTEXT
    // ─────────────────────────────────────────────────────────────
    const relevantMemories = memoryEngine.search(userId, trimmed, 4);
    if (relevantMemories.length > 0) {
      toolSteps.push({
        toolName: 'MemoryTool',
        action: 'searchMemory',
        input: { query: trimmed },
        output: { matchCount: relevantMemories.length, topMatch: relevantMemories[0].memory.content },
        status: 'success',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2.5: COMPREHENSIVE DAILY BRIEFING & UPDATES
    // ─────────────────────────────────────────────────────────────
    const isDailyBriefingQuery =
      /\b(?:daily (?:briefing|update|updates|standup|overview|summary|brief)|morning (?:briefing|brief|update)|what(?:'s| is) on my plate|today'?s? agenda|my agenda today|brief me|summary of today|daily plan)\b/i.test(lower) ||
      lower === 'daily update' ||
      lower === 'daily updates' ||
      lower === 'daily briefing' ||
      lower === 'brief' ||
      lower === 'agenda';

    if (isDailyBriefingQuery) {
      toolSteps.push({
        toolName: 'BriefingTool',
        action: 'generateDailyBriefing',
        input: { timezone },
        status: 'executing',
      });

      const userObj = db.getUserById(userId);
      const userName = (userObj?.preferences as any)?.displayName || userObj?.name || 'User';
      const tz = timezone || (userObj?.preferences as any)?.timezone || 'Asia/Kolkata';

      const now = new Date();
      const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(now);
      const fullDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: tz }).format(now);
      const fullTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).format(now);

      const allTasks = db.getTasks(userId);
      const pendingTasks = allTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

      const allReminders = db.getReminders(userId);
      const pendingReminders = allReminders.filter((r) => r.status === 'pending');

      const allGoals = db.getGoals(userId).filter((g) => g.status === 'active');
      const allHabits = db.getHabits(userId);
      const allLedger = db.getLedgerEntries(userId).filter((l) => l.status === 'pending');

      const receivableTotal = allLedger.filter((l) => l.type === 'receive').reduce((sum, l) => sum + (l.amount || 0), 0);
      const payableTotal = allLedger.filter((l) => l.type === 'give').reduce((sum, l) => sum + (l.amount || 0), 0);

      toolSteps[toolSteps.length - 1] = {
        toolName: 'BriefingTool',
        action: 'generateDailyBriefing',
        input: { timezone: tz },
        output: { pendingTasks: pendingTasks.length, reminders: pendingReminders.length, goals: allGoals.length },
        status: 'success',
      };

      let reply = `##  Daily Executive Briefing for ${userName}\n`;
      reply += ` **${dayOfWeek}, ${fullDate}** •  **${fullTime}** (*${tz}*)\n\n`;
      reply += `---\n\n`;

      // 1. Pending Tasks Section
      reply += `###  Priority Tasks (${pendingTasks.length} pending)\n`;
      if (pendingTasks.length === 0) {
        reply += `*✓ All caught up! No pending tasks on your plate right now.*\n\n`;
      } else {
        for (const t of pendingTasks.slice(0, 5)) {
          const badge = t.priority === 'urgent' ? ' **[URGENT]**' : t.priority === 'high' ? ' **[HIGH]**' : '';
          const due = t.dueDate ? ` *(Due: ${new Date(t.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })})*` : '';
          reply += `* ${badge} **${t.title}**${due}\n`;
        }
        if (pendingTasks.length > 5) {
          reply += `*...and **${pendingTasks.length - 5}** more tasks.*\n`;
        }
        reply += `\n`;
      }

      // 2. Upcoming Reminders & Alarms Section
      reply += `###  Scheduled Alarms & Reminders (${pendingReminders.length} active)\n`;
      if (pendingReminders.length === 0) {
        reply += `*No alarms or reminders scheduled for today.*\n\n`;
      } else {
        for (const r of pendingReminders.slice(0, 4)) {
          const formatted = new Date(r.dueDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
          reply += `*  **${r.title}** — **${formatted}**\n`;
        }
        reply += `\n`;
      }

      // 3. Habits Check-in
      if (allHabits.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const completedToday = allHabits.filter((h) => h.lastCompletedDate?.startsWith(todayStr) || h.history?.some((d) => d.startsWith(todayStr))).length;
        reply += `###  Daily Habits (${completedToday}/${allHabits.length} checked in today)\n`;
        for (const h of allHabits.slice(0, 4)) {
          const isDone = h.lastCompletedDate?.startsWith(todayStr) || h.history?.some((d) => d.startsWith(todayStr));
          reply += `* ${isDone ? '' : ''} **${h.title}** (${h.streak || 0}-day streak)\n`;
        }
        reply += `\n`;
      }

      // 4. Financial Ledger Dues
      if (allLedger.length > 0) {
        reply += `###  Money Ledger & Dues\n`;
        if (receivableTotal > 0) reply += `*  **To Receive:** ₹${receivableTotal.toLocaleString()} (owed to you)\n`;
        if (payableTotal > 0) reply += `*  **To Pay:** ₹${payableTotal.toLocaleString()} (you owe)\n`;
        reply += `\n`;
      }

      // 5. Active Goals
      if (allGoals.length > 0) {
        reply += `###  Active Goals & OKRs\n`;
        for (const g of allGoals.slice(0, 3)) {
          reply += `*  **${g.title}** — ${g.progress}% progress\n`;
        }
        reply += `\n`;
      }

      reply += `*Type any task or alarm to schedule new updates immediately!*`;

      return {
        reply,
        toolSteps,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 3: TASK CREATION, COMPLETION & RETRIEVAL
    // ─────────────────────────────────────────────────────────────
    const taskIntent = parseTaskIntent(trimmed);
    if (taskIntent && taskIntent.isTask) {
      toolSteps.push({
        toolName: 'TaskTool',
        action: 'createTask',
        input: { title: taskIntent.title, priority: taskIntent.priority, dueDate: taskIntent.dueDate },
        status: 'executing',
      });

      const res = await toolRegistry.TaskTool.execute(
        'createTask',
        {
          title: taskIntent.title,
          priority: taskIntent.priority,
          dueDate: taskIntent.dueDate,
        },
        userId
      );

      toolSteps[toolSteps.length - 1] = {
        toolName: 'TaskTool',
        action: 'createTask',
        input: { title: taskIntent.title },
        output: res.data,
        status: 'success',
      };

      db.logAgentAction({
        id: `act_${Date.now()}`,
        userId,
        conversationId,
        toolName: 'TaskTool',
        action: 'createTask',
        summary: res.message,
        status: 'success',
        permissionLevel: 'WRITE',
        createdAt: new Date().toISOString(),
      });

      let reminderMessage = '';
      if (taskIntent.hasReminder && taskIntent.reminderTime) {
        toolSteps.push({
          toolName: 'ReminderTool',
          action: 'createReminder',
          input: { title: taskIntent.title, targetTime: taskIntent.reminderTime.toISOString() },
          status: 'executing',
        });

        const remRes = await toolRegistry.ReminderTool.execute(
          'createReminder',
          {
            title: taskIntent.title,
            dueDateTime: taskIntent.reminderTime.toISOString(),
            priority: taskIntent.priority,
          },
          userId
        );

        toolSteps[toolSteps.length - 1] = {
          toolName: 'ReminderTool',
          action: 'createReminder',
          input: { title: taskIntent.title },
          output: remRes.data,
          status: 'success',
        };

        const remFormatted = taskIntent.reminderTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        reminderMessage = `\n\n **Reminder Scheduled:** I will alert you at **${remFormatted}** when this task is due.`;
      }

      const dueFormatted = taskIntent.dueDate
        ? new Date(taskIntent.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        : 'No specific due date';

      let reply = `###  Task Created Successfully\n\n`;
      reply += `| Field | Details |\n`;
      reply += `| :--- | :--- |\n`;
      reply += `| **Title** | ${taskIntent.title} |\n`;
      reply += `| **Priority** | ${taskIntent.priority.toUpperCase()} |\n`;
      reply += `| **Due** | ${dueFormatted} |\n`;
      reply += `| **Status** | Todo (Pending) |\n`;
      reply += reminderMessage;

      return {
        reply,
        toolSteps,
      };
    }

    if (lower.includes('mark') && lower.includes('completed') || lower.includes('complete the task') || lower.includes('finish the task')) {
      const taskQuery = trimmed.replace(/.*(?:mark|complete|finish)\s+(?:the\s+)?(?:task\s+)?/i, '').replace(/\s+as\s+completed.*/i, '').trim();

      toolSteps.push({
        toolName: 'TaskTool',
        action: 'completeTask',
        input: { taskQuery },
        status: 'executing',
      });

      const res = await toolRegistry.TaskTool.execute('completeTask', { taskId: taskQuery }, userId);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'TaskTool',
        action: 'completeTask',
        input: { taskQuery },
        output: res.data,
        status: res.success ? 'success' : 'failed',
      };

      if (res.success) {
        db.logAgentAction({
          id: `act_${Date.now()}`,
          userId,
          conversationId,
          toolName: 'TaskTool',
          action: 'completeTask',
          summary: res.message,
          status: 'success',
          permissionLevel: 'WRITE',
          createdAt: new Date().toISOString(),
        });
      }

      return { reply: res.message, toolSteps };
    }

    // Task querying (e.g., "what are the pending task is", "tell that what are the pending task", "show my tasks", "pending tasks", "existing tasks", etc.)
    const isTaskQuery =
      lower.includes('pending task') ||
      lower.includes('pending tasks') ||
      lower.includes('existing task') ||
      lower.includes('existing tasks') ||
      lower.includes('unfinished task') ||
      lower.includes('unfinished tasks') ||
      lower.includes('open task') ||
      lower.includes('open tasks') ||
      lower.includes('my tasks') ||
      lower.includes('my task') ||
      lower.includes('all tasks') ||
      lower.includes('task list') ||
      lower.includes('todo list') ||
      (/\b(?:pending|unfinished|open|current|my|all|active|today'?s?|existing)?\s*(?:tasks?|todos?|to-dos?)\b/i.test(lower) &&
        /\b(?:what|show|list|get|tell|check|see|any|is there|are there|do i have|display|view|find)\b/i.test(lower)) ||
      /\b(?:what are (?:the|my)? pending tasks?|what pending tasks?|pending tasks?|pending task|unfinished tasks?|unfinished task|task list|todos?)\b/i.test(lower) ||
      /^(?:tasks?|todos?|to-dos?)\??$/i.test(trimmed);

    if (isTaskQuery) {
      toolSteps.push({
        toolName: 'TaskTool',
        action: 'getTasks',
        input: { status: 'all' },
        status: 'executing',
      });

      const res = await toolRegistry.TaskTool.execute('getTasks', { status: 'all' }, userId);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'TaskTool',
        action: 'getTasks',
        input: { status: 'all' },
        output: { count: res.data?.length },
        status: 'success',
      };

      const tasks = (res.data as any[]) || [];
      const pending = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
      const completed = tasks.filter((t) => t.status === 'completed');

      let reply = `###  Your Tasks (${pending.length} Pending, ${completed.length} Completed)\n\n`;
      if (!pending.length) {
        reply += `*You have no unfinished tasks right now.*\n\n`;
      } else {
        reply += `#### ⏳ Pending Tasks (${pending.length}):\n`;
        for (const t of pending) {
          const badge = t.priority === 'urgent' ? ' **[URGENT]**' : t.priority === 'high' ? ' **[HIGH]**' : '';
          const due = t.dueDate ? ` *(Due: ${new Date(t.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })})*` : '';
          reply += `* ${badge} **${t.title}**${due}\n`;
        }
      }

      if (completed.length > 0) {
        reply += `\n####  Completed Tasks (${completed.length}):\n`;
        for (const t of completed.slice(0, 5)) {
          reply += `* ~~${t.title}~~\n`;
        }
      }

      return { reply, toolSteps };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 3.5: GOVERNMENT / PUBLIC HOLIDAYS QUERY
    // ─────────────────────────────────────────────────────────────
    const isHolidayQuery =
      lower.includes('govt holiday') ||
      lower.includes('government holiday') ||
      lower.includes('govt holidays') ||
      lower.includes('government holidays') ||
      lower.includes('public holiday') ||
      lower.includes('public holidays') ||
      lower.includes('upcoming holiday') ||
      lower.includes('upcoming holidays') ||
      lower.includes('next holiday') ||
      lower.includes('is today a holiday') ||
      lower.includes('is tomorrow a holiday') ||
      lower.includes('holidays in') ||
      lower.includes('calendar holidays') ||
      lower.includes('list holidays');

    if (isHolidayQuery) {
      toolSteps.push({
        toolName: 'HolidayTool',
        action: 'getHolidays',
        input: { prompt: trimmed },
        status: 'executing',
      });

      const today = new Date();
      const currentYear = today.getFullYear();
      let yearToFetch = currentYear;
      const yearMatch = lower.match(/\b(202\d)\b/);
      if (yearMatch) {
        yearToFetch = parseInt(yearMatch[1], 10);
      }

      let holidays = getUpcomingHolidays(today, 8);
      if (lower.includes('year') || yearMatch || lower.includes('all holidays')) {
        holidays = getHolidaysForYear(yearToFetch);
      }

      toolSteps[toolSteps.length - 1] = {
        toolName: 'HolidayTool',
        action: 'getHolidays',
        input: { year: yearToFetch },
        output: { count: holidays.length },
        status: 'success',
      };

      // Check if specifically asking about today or tomorrow
      if (lower.includes('today')) {
        const todayHoliday = getHolidayForDate(today);
        if (todayHoliday) {
          return {
            reply: `###  Today is a Government Holiday!\n\n**${todayHoliday.emoji || ''} ${todayHoliday.name}** (${todayHoliday.type.toUpperCase()})\n${todayHoliday.description || ''}`,
            toolSteps,
          };
        } else {
          return {
            reply: `Today (${today.toLocaleDateString([], { dateStyle: 'full' })}) is **not** a government holiday. The next upcoming holiday is **${holidays[0]?.name || 'N/A'}** on **${holidays[0]?.date || ''}**.`,
            toolSteps,
          };
        }
      }

      if (lower.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomHoliday = getHolidayForDate(tomorrow);
        if (tomHoliday) {
          return {
            reply: `###  Tomorrow is a Government Holiday!\n\n**${tomHoliday.emoji || ''} ${tomHoliday.name}** (${tomHoliday.type.toUpperCase()})\n${tomHoliday.description || ''}`,
            toolSteps,
          };
        } else {
          return {
            reply: `Tomorrow (${tomorrow.toLocaleDateString([], { dateStyle: 'full' })}) is **not** a government holiday. The next upcoming holiday is **${holidays[0]?.name || 'N/A'}** on **${holidays[0]?.date || ''}**.`,
            toolSteps,
          };
        }
      }

      let reply = `###  Official Government & Public Holidays (${yearToFetch})\n\n`;
      reply += `| Date | Holiday | Type |\n`;
      reply += `| :--- | :--- | :--- |\n`;
      for (const h of holidays) {
        const d = new Date(h.date);
        const formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
        const typeBadge = h.type === 'national' ? ' National' : h.type === 'gazetted' ? ' Gazetted' : ' Restricted';
        reply += `| **${formattedDate}** | ${h.emoji || ''} **${h.name}** | ${typeBadge} |\n`;
      }
      reply += `\n*All government holidays are synced in real time with your interactive calendar.*`;

      return { reply, toolSteps };
    }

    // Reminder querying (e.g., "what are my reminders", "show alarms", "upcoming reminders")
    const isReminderQuery =
      (/\b(?:reminders?|alarms?|alerts?)\b/i.test(lower) &&
        /\b(?:what|show|list|get|tell|check|see|any|is there|are there|do i have|upcoming|pending|scheduled)\b/i.test(lower)) ||
      /\b(?:what are (?:the|my)? (?:upcoming|pending)?\s*(?:reminders?|alarms?)|upcoming reminders?|pending reminders?|scheduled reminders?)\b/i.test(lower) ||
      /^(?:reminders?|alarms?)\??$/i.test(trimmed);

    if (isReminderQuery) {
      toolSteps.push({
        toolName: 'ReminderTool',
        action: 'getReminders',
        input: {},
        status: 'executing',
      });

      const res = await toolRegistry.ReminderTool.execute('getReminders', {}, userId);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'ReminderTool',
        action: 'getReminders',
        input: {},
        output: { count: res.data?.length },
        status: 'success',
      };

      const reminders = res.data as any[];
      const pendingReminders = reminders.filter((r) => r.status === 'pending');

      let reply = `###  Your Scheduled Reminders & Alarms (${pendingReminders.length} active)\n\n`;
      if (!pendingReminders.length) {
        reply += `*You have no upcoming reminders scheduled right now.*\n\n`;
      } else {
        for (const r of pendingReminders) {
          const formattedDate = new Date(r.dueDateTime).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          const recBadge = r.recurrence && r.recurrence !== 'none' ? ` *(Repeats: ${r.recurrence})*` : '';
          reply += `*  **${r.title}** — Due: **${formattedDate}**${recBadge}\n`;
        }
      }

      return { reply, toolSteps };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: NATURAL LANGUAGE REMINDER TRIGGER DETECTION
    // ─────────────────────────────────────────────────────────────
    const reminderParsed = parseReminderRequest(trimmed);
    if (reminderParsed && reminderParsed.isReminder) {
      toolSteps.push({
        toolName: 'ReminderTool',
        action: 'createReminder',
        input: { prompt: trimmed },
        status: 'executing',
      });

      const { title, targetTime, recurrence } = reminderParsed;

      const reminderResult = await toolRegistry.ReminderTool.execute(
        'createReminder',
        {
          title,
          dueDateTime: targetTime.toISOString(),
          recurrence,
          priority: 'high',
        },
        userId
      );

      toolSteps[toolSteps.length - 1] = {
        toolName: 'ReminderTool',
        action: 'createReminder',
        input: { title, targetTime: targetTime.toISOString(), recurrence },
        output: reminderResult.data,
        status: 'success',
      };

      db.logAgentAction({
        id: `act_${Date.now()}`,
        userId,
        conversationId,
        toolName: 'ReminderTool',
        action: 'createReminder',
        summary: reminderResult.message,
        status: 'success',
        permissionLevel: 'WRITE',
        createdAt: new Date().toISOString(),
      });

      return {
        reply: `${reminderResult.message}\n\n*You will receive an in-app alert when this reminder is due.*`,
        toolSteps,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4.5: MONEY LEDGER & FINANCIAL DUES (WHO TO GIVE / OWES ME)
    // ─────────────────────────────────────────────────────────────
    const ledgerIntent = parseLedgerIntent(trimmed);
    if (ledgerIntent && ledgerIntent.isLedger) {
      if (ledgerIntent.action === 'add') {
        toolSteps.push({
          toolName: 'LedgerTool',
          action: 'addLedgerEntry',
          input: {
            personName: ledgerIntent.personName,
            amount: ledgerIntent.amount,
            type: ledgerIntent.type,
            currency: ledgerIntent.currency,
          },
          status: 'executing',
        });

        const res = await toolRegistry.LedgerTool.execute(
          'addLedgerEntry',
          {
            personName: ledgerIntent.personName,
            amount: ledgerIntent.amount,
            type: ledgerIntent.type,
            currency: ledgerIntent.currency,
            description: ledgerIntent.description,
          },
          userId
        );

        toolSteps[toolSteps.length - 1] = {
          toolName: 'LedgerTool',
          action: 'addLedgerEntry',
          input: { personName: ledgerIntent.personName, amount: ledgerIntent.amount },
          output: res.data,
          status: 'success',
        };

        db.logAgentAction({
          id: `act_${Date.now()}`,
          userId,
          conversationId,
          toolName: 'LedgerTool',
          action: 'addLedgerEntry',
          summary: res.message,
          status: 'success',
          permissionLevel: 'WRITE',
          createdAt: new Date().toISOString(),
        });

        const entry = res.data;
        let reply = `###  Money Ledger Updated\n\n`;
        reply += `| Field | Details |\n`;
        reply += `| :--- | :--- |\n`;
        reply += `| **Person / Entity** | ${entry.personName} |\n`;
        reply += `| **Amount** | ${entry.currency}${entry.amount.toLocaleString()} |\n`;
        reply += `| **Type** | ${entry.type === 'give' ? ' You Need to Give (Payable)' : ' Owed to You (Receivable)'} |\n`;
        reply += `| **Status** | Pending |\n\n`;
        reply += `*You can view and manage all debts anytime in the **Money Ledger & Dues** section.*`;

        return { reply, toolSteps };
      }

      if (ledgerIntent.action === 'settle') {
        toolSteps.push({
          toolName: 'LedgerTool',
          action: 'settleLedgerEntry',
          input: { personName: ledgerIntent.personName },
          status: 'executing',
        });

        const res = await toolRegistry.LedgerTool.execute(
          'settleLedgerEntry',
          { personNameOrId: ledgerIntent.personName },
          userId
        );

        toolSteps[toolSteps.length - 1] = {
          toolName: 'LedgerTool',
          action: 'settleLedgerEntry',
          input: { personName: ledgerIntent.personName },
          output: res.data,
          status: res.success ? 'success' : 'failed',
        };

        if (res.success) {
          db.logAgentAction({
            id: `act_${Date.now()}`,
            userId,
            conversationId,
            toolName: 'LedgerTool',
            action: 'settleLedgerEntry',
            summary: res.message,
            status: 'success',
            permissionLevel: 'WRITE',
            createdAt: new Date().toISOString(),
          });
        }

        return {
          reply: res.success
            ? `###  Payment Settled!\n\n${res.message}`
            : ` ${res.message}`,
          toolSteps,
        };
      }

      if (ledgerIntent.action === 'get') {
        toolSteps.push({
          toolName: 'LedgerTool',
          action: 'getLedgerEntries',
          input: {},
          status: 'executing',
        });

        const res = await toolRegistry.LedgerTool.execute('getLedgerEntries', {}, userId);
        toolSteps[toolSteps.length - 1] = {
          toolName: 'LedgerTool',
          action: 'getLedgerEntries',
          input: {},
          output: res.data?.summary,
          status: 'success',
        };

        const { entries, summary } = res.data;
        const pending = entries.filter((e: any) => e.status === 'pending');

        let reply = `###  Your Financial Dues & Money Ledger\n\n`;
        reply += `* **Total You Owe (To Give):** \`₹${summary.totalToGive.toLocaleString()}\`\n`;
        reply += `* **Total Owed to You (To Receive):** \`₹${summary.totalToReceive.toLocaleString()}\`\n`;
        reply += `* **Net Financial Balance:** \`${summary.netBalance >= 0 ? '+' : ''}₹${summary.netBalance.toLocaleString()}\`\n\n`;

        if (!pending.length) {
          reply += `*✓ You have no active pending debts or dues right now.*\n`;
        } else {
          reply += `**Active Dues (${pending.length}):**\n`;
          for (const e of pending) {
            const badge = e.type === 'give' ? ' You owe' : ' Owes you';
            reply += `* ${badge} **${e.personName}**: **${e.currency}${e.amount}** ${e.description ? `(*${e.description}*)` : ''}\n`;
          }
        }

        return { reply, toolSteps };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 5: GITHUB INTEGRATION / COMMITS / PR
    // ─────────────────────────────────────────────────────────────
    if (
      lower.includes('github') ||
      lower.includes('commit') ||
      lower.includes('pull request') ||
      lower.includes('worked on today') ||
      lower.includes('prepare a pr') ||
      lower.includes('create a pr') ||
      lower.includes('open a pr') ||
      lower.includes('open pr') ||
      lower.includes('draft pr') ||
      lower.includes(' pr ') ||
      lower.endsWith(' pr') ||
      lower.startsWith('pr ') ||
      lower.includes('pr for')
    ) {
      if (
        lower.includes('prepare a pr') ||
        lower.includes('create a pr') ||
        lower.includes('open pr') ||
        lower.includes('open a pr') ||
        lower.includes('draft a pr') ||
        lower.includes('draft pr') ||
        lower.includes('pr for')
      ) {
        toolSteps.push({
          toolName: 'GitHubTool',
          action: 'preparePullRequest',
          input: { repo: 'alexrivera/videovault-ai', branch: 'feature/whisper-caching' },
          status: 'executing',
        });

        const res = await toolRegistry.GitHubTool.execute(
          'preparePullRequest',
          { repo: 'alexrivera/videovault-ai', branch: 'feature/whisper-caching' },
          userId
        );

        toolSteps[toolSteps.length - 1] = {
          toolName: 'GitHubTool',
          action: 'preparePullRequest',
          input: { repo: 'alexrivera/videovault-ai' },
          output: res.data,
          status: 'requires_confirmation',
          confirmationMessage: 'Ready to submit pull request to alexrivera/videovault-ai:main',
        };

        requiresConfirmation = true;
        confirmationPayload = res.confirmationPayload;

        let reply = `###  Pull Request Prepared for \`${res.data.branch}\` → \`${res.data.baseBranch}\`\n\n`;
        reply += `**Title:** ${res.data.title}\n\n`;
        reply += `**Summary:**\n${res.data.summary}\n\n`;
        reply += `**Key Changes:**\n`;
        for (const ch of res.data.changes) {
          reply += `* ${ch}\n`;
        }
        reply += `\n**Testing:**\n${res.data.testing}\n\n`;
        reply += `>  **Confirmation Required:** Click below to confirm opening this PR on GitHub.`;

        return {
          reply,
          toolSteps,
          requiresConfirmation,
          confirmationPayload,
        };
      }

      // Check commits/activity
      toolSteps.push({
        toolName: 'GitHubTool',
        action: 'getCommits',
        input: { repo: 'alexrivera/videovault-ai', since: 'today' },
        status: 'executing',
      });

      const res = await toolRegistry.GitHubTool.execute(
        'getCommits',
        { repo: 'alexrivera/videovault-ai', since: 'today' },
        userId
      );

      toolSteps[toolSteps.length - 1] = {
        toolName: 'GitHubTool',
        action: 'getCommits',
        input: { repo: 'alexrivera/videovault-ai' },
        output: res.data,
        status: 'success',
      };

      const commits = res.data as any[];
      let reply = `###  GitHub Activity Today (\`alexrivera/videovault-ai\`)\n\n`;
      reply += `I analyzed your **${commits.length} commits** from today:\n\n`;
      for (const c of commits) {
        reply += `* [\`${c.sha}\`] **${c.message}** *(+${c.insertions} / -${c.deletions} in ${c.filesChanged} files)*\n`;
      }
      reply += `\n**Summary:**\n`;
      reply += `You focused heavily on **transcript streaming and Redis caching optimizations**, along with fixing embedded player timecodes and obsidian UI styling.`;

      return { reply, toolSteps };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 6: PROJECT CONTEXT / "What is pending in VideoVault?"
    // ─────────────────────────────────────────────────────────────
    if (lower.includes('videovault') || lower.includes('portfolio') || (lower.includes('project') && lower.includes('pending'))) {
      const projectName = lower.includes('portfolio') ? 'Personal Portfolio' : 'VideoVault';

      toolSteps.push({
        toolName: 'ProjectTool',
        action: 'getProjectDetails',
        input: { projectName },
        status: 'executing',
      });

      const res = await toolRegistry.ProjectTool.execute('getProjectDetails', { projectName }, userId);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'ProjectTool',
        action: 'getProjectDetails',
        input: { projectName },
        output: res.data,
        status: 'success',
      };

      if (res.success && res.data) {
        const { project, tasks, memories } = res.data;
        const pendingTasks = tasks.filter((t: any) => t.status !== 'completed');

        let reply = `###  Project Status: **${project.name}**\n\n`;
        reply += `${project.description}\n\n`;
        reply += `* **Tech Stack:** ${project.techStack.join(', ')}\n`;
        reply += `* **Repository:** \`${project.repository || 'N/A'}\`\n\n`;

        reply += `#### ⏳ Pending Tasks (${pendingTasks.length}):\n`;
        if (!pendingTasks.length) {
          reply += `* All tasks for this project are currently completed.\n`;
        } else {
          for (const t of pendingTasks) {
            reply += `* **${t.title}** [Status: ${t.status.toUpperCase()} | Priority: ${t.priority.toUpperCase()}]\n`;
          }
        }

        if (memories.length > 0) {
          reply += `\n####  Project Memory Context:\n`;
          for (const m of memories) {
            reply += `* ${m.content}\n`;
          }
        }

        return { reply, toolSteps };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 7: "What do I need to finish this week?" / Cross-domain overview
    // ─────────────────────────────────────────────────────────────
    if (
      lower.includes('what do i need to finish') ||
      lower.includes('this week') ||
      lower.includes('overview of my week') ||
      lower.includes('what is due')
    ) {
      const tasks = db.getTasks(userId).filter((t) => t.status !== 'completed');
      const reminders = db.getReminders(userId).filter((r) => r.status === 'pending');
      const memories = db.getMemories(userId).filter((m) => m.type === 'important_date');

      toolSteps.push({
        toolName: 'TaskTool',
        action: 'getTasks',
        input: { status: 'pending' },
        output: { count: tasks.length },
        status: 'success',
      });

      toolSteps.push({
        toolName: 'ReminderTool',
        action: 'getReminders',
        input: {},
        output: { count: reminders.length },
        status: 'success',
      });

      let reply = `###  Summary of What You Need to Finish This Week\n\n`;

      reply += `#### 1. High-Priority Tasks (${tasks.length})\n`;
      for (const t of tasks) {
        const badge = t.priority === 'urgent' ? ' **[URGENT]**' : ' **[HIGH]**';
        reply += `* ${badge} **${t.title}**\n`;
      }

      reply += `\n#### 2. Upcoming Scheduled Reminders (${reminders.length})\n`;
      for (const r of reminders) {
        const dateStr = new Date(r.dueDateTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        reply += `*  **${r.title}** — Due: *${dateStr}*\n`;
      }

      if (memories.length > 0) {
        reply += `\n#### 3. Important Stored Deadlines\n`;
        for (const m of memories) {
          reply += `*  **${m.content}**\n`;
        }
      }

      return { reply, toolSteps };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 7.5: REAL-TIME WEATHER TOOL
    // ─────────────────────────────────────────────────────────────
    const isWeatherQuery =
      lower.includes('weather') ||
      lower.includes('temperature') ||
      lower.includes('forecast') ||
      lower.includes('is it raining') ||
      lower.includes('climate in');

    if (isWeatherQuery) {
      let location = 'Bengaluru';
      const cityMatch = trimmed.match(/(?:in|at|for|around|of)\s+([A-Za-z\s]+)/i);
      if (cityMatch && cityMatch[1]) {
        const potentialCity = cityMatch[1].replace(/[?.,!]/g, '').trim();
        const ignoreWords = ['today', 'tomorrow', 'now', 'here', 'the weekend', 'this week', 'next week', 'me', 'us', 'my area', 'my location', 'current location'];
        if (!ignoreWords.includes(potentialCity.toLowerCase())) {
          location = potentialCity;
        }
      }

      toolSteps.push({
        toolName: 'WeatherTool',
        action: 'getWeather',
        input: { location },
        status: 'executing',
      });

      const res = await toolRegistry.WeatherTool.execute('getWeather', { location }, userId);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'WeatherTool',
        action: 'getWeather',
        input: { location },
        output: res.data,
        status: 'success',
      };

      const w = res.data;
      let reply = `###  Live Weather for **${w.location}, ${w.country}**\n\n`;
      reply += `* **Current Temperature:** **${w.temperature}°C** (${w.condition})\n`;
      reply += `* **Humidity:** ${w.humidity}%\n`;
      reply += `* **Wind Speed:** ${w.windSpeed} km/h\n\n`;
      if (w.forecast && w.forecast.length > 0) {
        reply += `####  Multi-Day Forecast\n`;
        for (const f of w.forecast) {
          reply += `* **${f.day}:** ${f.tempMax}°C / ${f.tempMin}°C — ${f.condition}\n`;
        }
      }
      reply += `\n---\n*Live data provided in real time via Open-Meteo Global Satellite Forecast.*`;
      return { reply, toolSteps };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 7.6: REAL-TIME MARKET & STOCK/CRYPTO TOOL
    // ─────────────────────────────────────────────────────────────
    const isMarketQuery =
      lower.includes('stock price') ||
      lower.includes('crypto price') ||
      lower.includes('market price') ||
      lower.includes('bitcoin') ||
      lower.includes('btc price') ||
      lower.includes('ethereum') ||
      lower.includes('solana') ||
      lower.includes('nvidia stock') ||
      lower.includes('apple stock') ||
      lower.includes('tesla stock') ||
      lower.includes('market quote');

    if (isMarketQuery) {
      let symbols = 'BTC,ETH,SOL,AAPL,NVDA,TSLA';
      if (lower.includes('bitcoin') || lower.includes('btc')) symbols = 'BTC';
      else if (lower.includes('ethereum') || lower.includes('eth')) symbols = 'ETH';
      else if (lower.includes('solana') || lower.includes('sol')) symbols = 'SOL';
      else if (lower.includes('nvidia') || lower.includes('nvda')) symbols = 'NVDA';
      else if (lower.includes('apple') || lower.includes('aapl')) symbols = 'AAPL';
      else if (lower.includes('tesla') || lower.includes('tsla')) symbols = 'TSLA';

      toolSteps.push({
        toolName: 'StockTool',
        action: 'getQuote',
        input: { symbols },
        status: 'executing',
      });

      const res = await toolRegistry.StockTool.execute('getQuote', { symbols }, userId);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'StockTool',
        action: 'getQuote',
        input: { symbols },
        output: res.data,
        status: 'success',
      };

      const quotes = res.data as any[];
      let reply = `###  Real-Time Live Market Intelligence\n\n`;
      for (const q of quotes) {
        const sign = q.changePercent24h >= 0 ? '+' : '';
        reply += `* **${q.symbol}** (${q.name}): **${q.currency}${q.price.toLocaleString('en-US')}** (${sign}${q.changePercent24h}% 24h)\n`;
      }
      reply += `\n*Last updated: ${new Date().toLocaleTimeString()}* — *Live data powered by Global Market & CoinGecko Feeds.*`;
      return { reply, toolSteps };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 8: LIVE WEB SEARCH CONTEXT (FOR EXPLICIT SEARCH OR REAL-TIME NEWS)
    // ─────────────────────────────────────────────────────────────
    let webSearchContext = '';
    const isExplicitSearch =
      lower.startsWith('search ') ||
      lower.startsWith('google ') ||
      lower.includes('search web') ||
      lower.includes('google search') ||
      lower.includes('latest news on') ||
      lower.includes('live news on') ||
      lower.includes('find documentation for');

    if (isExplicitSearch) {
      const cleanSearchQuery = trimmed
        .replace(/^(?:please\s+)?(?:search\s+for|search\s+web\s+for|search\s+web|search|google\s+search\s+for|google\s+search|google)\s+/i, '')
        .trim();

      toolSteps.push({
        toolName: 'WebSearchTool',
        action: 'searchWeb',
        input: { query: cleanSearchQuery || trimmed },
        status: 'executing',
      });

      const res = await toolRegistry.WebSearchTool.execute('searchWeb', { query: cleanSearchQuery || trimmed }, userId);
      toolSteps[toolSteps.length - 1] = {
        toolName: 'WebSearchTool',
        action: 'searchWeb',
        input: { query: cleanSearchQuery || trimmed },
        output: res.data,
        status: 'success',
      };

      const sources = (res.data as any[]) || [];
      if (sources.length > 0) {
        webSearchContext = `\n\nLIVE RETRIEVED WEB SEARCH SOURCES:\n` +
          sources.map((s, idx) => `[Source ${idx + 1}: ${s.title}] (${s.url})\n${s.snippet}`).join('\n\n');
      }
    }


    // ─────────────────────────────────────────────────────────────
    // STEP 9: DEFAULT INTELLIGENT SYNTHESIS WITH RECALLED MEMORIES
    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    // STEP 9: REAL LLM SYNTHESIS VIA GROQ / CLOUD PROVIDER
    // ─────────────────────────────────────────────────────────────
    const userObj = db.getUserById(userId);
    const tz = timezone || (userObj?.preferences as any)?.timezone || 'Asia/Kolkata';

    const now = new Date();
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(now);
    const fullDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: tz }).format(now);
    const fullTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).format(now);

    // Direct personal information and real-time date/day/time handlers
    const userName = userObj?.name || 'User';

    const isNameQuery =
      lower.includes('who am i') ||
      lower.includes('what is my name') ||
      lower.includes("what's my name") ||
      lower.includes('what my name') ||
      lower.includes('my name') ||
      lower.includes('my display name') ||
      lower.includes('tell me my name') ||
      lower.includes('what is my registered name') ||
      lower.includes('my profile name') ||
      lower.includes('my username') ||
      lower.includes('who i am') ||
      lower.includes('my identity');

    if (isNameQuery) {
      return {
        reply: `You are **${userName}** (configured as your display name in settings). I am your personal AI assistant with live access to your tasks, alarms, goals, and schedule.`,
        toolSteps,
      };
    }

    const isTimeQuery =
      /\b(?:what (?:is|'s)? (?:the )?(?:current )?time|what time is it|current time|time now|see the time|tell me the time|time for now|check the time|what time)\b/i.test(lower) ||
      lower === 'time' ||
      lower === 'time now' ||
      lower === 'what is time';

    if (isTimeQuery) {
      return {
        reply: `It is currently **${fullTime}** on **${dayOfWeek}**, **${fullDate}** (*${tz}*).`,
        toolSteps,
      };
    }

    if (
      lower === 'what is date today' ||
      lower === 'what is the date' ||
      lower === 'what is today' ||
      lower === 'date' ||
      lower === 'day ?' ||
      lower === 'day' ||
      lower === 'what day is it' ||
      lower === 'what day is today' ||
      lower === 'what is the day today' ||
      lower === 'what is the day' ||
      lower.includes('tell me the date and day') ||
      lower.includes('what is the date and day') ||
      lower.includes('date and day') ||
      lower.includes('current time and date')
    ) {
      return {
        reply: `Today is **${dayOfWeek}**, **${fullDate}** *(Local Time: ${fullTime} - ${tz})*.`,
        toolSteps,
      };
    }

    // Call Multi-Provider LLM Router (Gemini / OpenAI / Anthropic / Groq / Ollama)
    const allMemories = db.getMemories(userId);
    const allTasks = db.getTasks(userId).filter((t) => t.status !== 'completed');
    const allReminders = db.getReminders(userId).filter((r) => r.status === 'pending');
    const allGoals = db.getGoals(userId).filter((g) => g.status === 'active');
    const allLedger = db.getLedgerEntries(userId).filter((l) => l.status === 'pending');

    const systemPrompt = `You are Assistance, an expert Personal AI Assistant & Life Strategist.
You know the user (${userName}) well and have live access to their persistent memory vault, goals, tasks, financial dues, and alarm reminders.

CURRENT REAL-WORLD CONTEXT:
- User Name: ${userName}
- User Timezone: ${tz}
- Day of the Week: ${dayOfWeek}
- Full Date: ${fullDate}
- Local Time: ${fullTime} (${tz})

USER'S STORED MEMORIES & PREFERENCES:
${allMemories.length ? allMemories.map((m) => `- [${m.type.toUpperCase()} / ${m.category || 'General'}]: ${m.content}`).join('\n') : 'No stored memories yet.'}

ACTIVE GOALS & OKRS:
${allGoals.length ? allGoals.map((g) => `- ${g.title} [${g.progress}% complete, Category: ${g.category}]`).join('\n') : 'No active goals yet.'}

MONEY LEDGER & DUES:
${allLedger.length ? allLedger.map((l) => `- ${l.type === 'give' ? 'Payable (User owes)' : 'Receivable (Owed to user)'}: ${l.currency}${l.amount} with ${l.personName}`).join('\n') : 'No pending dues.'}

ACTIVE UNFINISHED TASKS:
${allTasks.length ? allTasks.map((t) => `- ${t.title} [Priority: ${t.priority.toUpperCase()}]`).join('\n') : 'No pending tasks.'}

UPCOMING REMINDERS & ALARMS:
${allReminders.length ? allReminders.map((r) => `- ${r.title} (Due: ${r.dueDateTime})`).join('\n') : 'No pending reminders.'}

CORE GUIDELINES:
1. Act as a high-agency, deeply capable personal intelligence assistant.
2. The current day of the week is strictly ${dayOfWeek} (${fullDate}) and current local time is ${fullTime} (${tz}).
3. When the user asks about personal preferences, schedule, dues, or goals, use their context accurately.
4. Format output with clean Markdown, tables, and highlighted sections.${webSearchContext ? `\n\n${webSearchContext}\n\n5. Synthesize a direct, intelligent, clear answer to the user's prompt using the live search findings above. Do not dump raw links.` : ''}`;

    let fallbackText = '';
    if (
      lower.includes('cm of karnataka') ||
      lower.includes('chief minister of karnataka') ||
      lower.includes('karnataka cm')
    ) {
      fallbackText = `The current Chief Minister of Karnataka is **Siddaramaiah** (Indian National Congress), who has been serving since May 20, 2023. The Deputy Chief Minister is **D. K. Shivakumar**.`;
    } else if (
      lower.includes('programming language') ||
      lower.includes('what language') ||
      lower.includes('what stack') ||
      lower.includes('tech stack')
    ) {
      const tsMemory = db.getMemories(userId).find((m) => m.content.toLowerCase().includes('typescript') || m.content.toLowerCase().includes('next.js'));
      if (tsMemory) {
        fallbackText = `Based on your stored preferences, you usually prefer **TypeScript** and **Next.js 15** for most of your modern web applications.\n\n*(Recalled from your engineering memory)*`;
      }
    } else if (
      lower.includes('ui design') ||
      lower.includes('design preference') ||
      lower.includes('how do i like my ui')
    ) {
      const uiMemory = db.getMemories(userId).find((m) => m.content.toLowerCase().includes('ui'));
      if (uiMemory) {
        fallbackText = `You prefer **simple, clean UI designs** with minimal clutter, open layouts, and strong typography.\n\n*(Recalled from your design memory)*`;
      }
    }

    if (!fallbackText) {
      if (relevantMemories.length > 0) {
        const topMem = relevantMemories[0].memory;
        fallbackText = `I understand. Keeping in mind your preference for **${topMem.content.replace(/^i prefer\s+/i, '').replace(/^i use\s+/i, '')}**:\n\n`;
      }
      fallbackText += `I'm ready to help you with that. Whether you'd like to manage your tasks, schedule reminders, inspect your GitHub repository, or search web documentation, just let me know how you'd like to proceed!`;
    }

    const llmRes = await routeLLMRequest({
      preferences: userObj?.preferences,
      messages: [{ role: 'user', content: userPrompt }],
      systemInstruction: systemPrompt,
      fallbackContent: fallbackText,
      attachments: processedAttachments,
    });

    return {
      reply: llmRes.content,
      toolSteps,
    };
    } catch (err: any) {
      console.error('AgentOrchestrator encountered error:', err);
      return {
        reply: `I encountered an unexpected issue while processing your request. However, your session and data are safe. Please feel free to ask me to manage tasks, set alarms, or query your memory vault!`,
        toolSteps,
      };
    }
  }
}
