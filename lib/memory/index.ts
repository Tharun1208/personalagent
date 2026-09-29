import { db } from '@/lib/db';
import { Memory, MemoryType } from '@/types';

// Stopwords for semantic scoring
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Compute term frequency
function getTf(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

// Compute cosine similarity between two token vectors
function computeCosineSimilarity(queryTokens: string[], docTokens: string[]): number {
  if (!queryTokens.length || !docTokens.length) return 0;

  const qTf = getTf(queryTokens);
  const dTf = getTf(docTokens);

  let dotProduct = 0;
  for (const [term, qCount] of qTf.entries()) {
    if (dTf.has(term)) {
      dotProduct += qCount * dTf.get(term)!;
    }
  }

  const qMag = Math.sqrt([...qTf.values()].reduce((sum, v) => sum + v * v, 0));
  const dMag = Math.sqrt([...dTf.values()].reduce((sum, v) => sum + v * v, 0));

  if (qMag === 0 || dMag === 0) return 0;
  return dotProduct / (qMag * dMag);
}

// Auto-classify memory type based on content
export function classifyMemoryType(text: string): { type: MemoryType; category: string; tags: string[] } {
  const lower = text.toLowerCase();

  // Important dates
  if (
    lower.includes('deadline') ||
    lower.includes('submit') ||
    lower.includes('october') ||
    lower.includes('november') ||
    lower.includes('december') ||
    lower.includes('january') ||
    lower.includes('february') ||
    lower.includes('march') ||
    lower.includes('april') ||
    lower.includes('may') ||
    lower.includes('june') ||
    lower.includes('july') ||
    lower.includes('august') ||
    lower.includes('september') ||
    /\b(202\d|\d{1,2}\/\d{1,2}|\d{1,2}(st|nd|rd|th))\b/.test(lower)
  ) {
    return {
      type: 'important_date',
      category: 'Deadlines & Dates',
      tags: extractTags(text, ['deadline', 'date', 'schedule']),
    };
  }

  // Preferences
  if (
    lower.includes('prefer') ||
    lower.includes('like') ||
    lower.includes('favorite') ||
    lower.includes('always use') ||
    lower.includes('usually use') ||
    lower.includes('style') ||
    lower.includes('dark mode') ||
    lower.includes('simple ui')
  ) {
    return {
      type: 'preference',
      category: 'Preferences',
      tags: extractTags(text, ['preference', 'style', 'habit']),
    };
  }

  // Instructions / Workflows
  if (
    lower.includes('whenever') ||
    lower.includes('always remember to') ||
    lower.includes('make sure to') ||
    lower.includes('rule') ||
    lower.includes('instruction')
  ) {
    return {
      type: 'instruction',
      category: 'Instructions',
      tags: extractTags(text, ['instruction', 'rule', 'workflow']),
    };
  }

  // Projects
  if (
    lower.includes('project') ||
    lower.includes('videovault') ||
    lower.includes('portfolio') ||
    lower.includes('app') ||
    lower.includes('stack') ||
    lower.includes('repo')
  ) {
    return {
      type: 'project',
      category: 'Projects',
      tags: extractTags(text, ['project', 'tech-stack', 'code']),
    };
  }

  // Goals
  if (lower.includes('goal') || lower.includes('aim') || lower.includes('target') || lower.includes('achieve')) {
    return {
      type: 'goal',
      category: 'Goals',
      tags: extractTags(text, ['goal', 'target', 'aspiration']),
    };
  }

  // Default to personal
  return {
    type: 'personal',
    category: 'Personal Info',
    tags: extractTags(text, ['personal', 'profile']),
  };
}

function extractTags(text: string, baseTags: string[]): string[] {
  const words = tokenize(text);
  const relevant = words.filter((w) => w.length > 3).slice(0, 4);
  return Array.from(new Set([...baseTags, ...relevant]));
}

export const memoryEngine = {
  // Extract explicit memory trigger from user prompt
  detectExplicitMemoryInstruction(text: string): {
    action: 'save' | 'forget' | 'list' | 'dont_remember' | 'none';
    extractedContent?: string;
    topic?: string;
  } {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 0. Don't remember triggers
    if (
      lower === "don't remember this" ||
      lower === 'do not remember this' ||
      lower === "don't remember that" ||
      lower === 'do not remember that' ||
      lower === "don't save this" ||
      lower === 'do not save this' ||
      lower === "don't remember"
    ) {
      return { action: 'dont_remember' };
    }

    // 1. Forget triggers
    if (
      lower === 'forget that' ||
      lower === 'forget this' ||
      lower.startsWith('forget that ') ||
      lower.startsWith('forget my memory about ') ||
      lower.startsWith('delete my memory about ') ||
      lower.startsWith('delete memory ') ||
      lower.startsWith('forget ')
    ) {
      const topic = lower
        .replace(/^forget that\s*/, '')
        .replace(/^forget my memory about\s*/, '')
        .replace(/^delete my memory about\s*/, '')
        .replace(/^delete memory\s*/, '')
        .replace(/^forget\s*/, '')
        .trim();

      return {
        action: 'forget',
        topic: topic || 'that',
      };
    }

    // 2. List / Identity queries trigger
    if (
      lower.includes('what do you remember about me') ||
      lower.includes('what do you know about me') ||
      lower.includes('do you remember me') ||
      lower.includes('why did you not remember me') ||
      lower.includes('why do you not remember me') ||
      lower.includes('who am i') ||
      lower.includes('show my memories') ||
      lower.includes('list my memories') ||
      lower.includes('what memories do you have') ||
      lower === 'what do you remember?' ||
      lower === 'what do you remember'
    ) {
      return {
        action: 'list',
      };
    }

    // Check if this is actually a reminder intent with time triggers
    const isReminderPattern =
      lower.startsWith('remind') ||
      lower.startsWith('remeber') ||
      lower.startsWith('rember') ||
      lower.includes('remember me at') ||
      lower.includes('remeber me at') ||
      lower.includes('remind me at') ||
      lower.includes('reminder at') ||
      /\b(?:at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}(?::\d{2})?\s*(?:am|pm)|in\s+\d+\s*(?:min|hour|hr|day|sec)|after\s+\d+|every\s+(?:day|sunday|monday|week)|tomorrow\s+at)\b/i.test(lower);

    if (isReminderPattern) {
      return { action: 'none' };
    }

    // 3. Save memory triggers (explicit & natural personal facts)
    const saveRegexes = [
      /^(?:please\s+)?remember\s+that\s+(.+)$/i,
      /^(?:please\s+)?remeber\s+that\s+(.+)$/i,
      /^(?:please\s+)?remember\s+this:\s*(.+)$/i,
      /^(?:please\s+)?remeber\s+this:\s*(.+)$/i,
      /^(?:please\s+)?remember\s+(.+)$/i,
      /^(?:please\s+)?remeber\s+(.+)$/i,
      /^(?:please\s+)?save\s+this\s+(?:to\s+memory\s*)?:?\s*(.+)$/i,
      /^(?:please\s+)?save\s+to\s+memory:?\s*(.+)$/i,
      /^(?:please\s+)?note\s+down\s+that\s+(.+)$/i,
      /^(?:please\s+)?keep\s+in\s+mind\s+that\s+(.+)$/i,
      /^(?:my\s+name\s+is\s+|i\s+am\s+called\s+)(.+)$/i,
      /^(?:i\s+live\s+in\s+)(.+)$/i,
      /^(?:i\s+work\s+as\s+a\s+|i\s+work\s+as\s+|i\s+work\s+at\s+|i\s+am\s+a\s+)(.+)$/i,
      /^(?:my\s+favorite\s+.+\s+is\s+.+)$/i,
      /^(?:i\s+prefer\s+)(.+)$/i,
      /^(?:i\s+usually\s+use\s+)(.+)$/i,
    ];

    for (const regex of saveRegexes) {
      const match = trimmed.match(regex);
      if (match && match[1] && match[1].trim().length > 3) {
        return {
          action: 'save',
          extractedContent: trimmed,
        };
      }
    }

    return { action: 'none' };
  },

  // Search memories with semantic relevance scoring
  search(userId: string, query: string, limit = 5): { memory: Memory; score: number }[] {
    const allMemories = db.getMemories(userId);
    if (!allMemories.length) return [];

    const queryTokens = tokenize(query);
    if (!queryTokens.length) {
      return allMemories.slice(0, limit).map((m) => ({ memory: m, score: 1.0 }));
    }

    const scored = allMemories.map((memory) => {
      const docTokens = tokenize(`${memory.content} ${memory.category || ''} ${memory.tags.join(' ')}`);

      // 1. Exact substring match boost
      let score = 0;
      if (memory.content.toLowerCase().includes(query.toLowerCase())) {
        score += 0.5;
      }

      // 2. Cosine similarity
      const cosine = computeCosineSimilarity(queryTokens, docTokens);
      score += cosine * 0.5;

      // 3. Pinned boost
      if (memory.pinned) {
        score += 0.1;
      }

      return { memory, score };
    });

    return scored
      .filter((item) => item.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  // Save new explicit memory
  save(userId: string, content: string, sourceMessageId?: string, projectId?: string): Memory {
    const { type, category, tags } = classifyMemoryType(content);
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      content: content.trim(),
      type,
      category,
      tags,
      confidence: 0.98,
      sourceMessageId,
      projectId,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return db.saveMemory(memory);
  },

  // Forget topic
  forget(userId: string, topic: string): number {
    return db.forgetMemoriesByTopic(topic, userId);
  },
};
