import { db } from '../lib/db';
import { auth } from '../lib/auth';
import { getLiveWeather, getLiveMarketQuotes, getLiveNews } from '../lib/tools/realtimeData';
import { executeWebSearch } from '../lib/tools/websearchReal';
import { toolRegistry } from '../lib/tools';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({
      name,
      category,
      passed: true,
      durationMs,
      details: details || 'Success',
    });
    console.log(`  [PASS] ${category} > ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      name,
      category,
      passed: false,
      durationMs,
      details: 'Failed',
      error: err?.message || String(err),
    });
    console.error(`  [FAIL] ${category} > ${name} (${durationMs}ms):`, err?.message || err);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('   STARTING END-TO-END SYSTEM & REAL-TIME TEST SUITE');
  console.log('======================================================\n');

  // Test User for E2E
  const testUserId = `usr_e2e_${Date.now()}`;
  const testUser = {
    id: testUserId,
    email: `e2e_tester_${Date.now()}@recall.ai`,
    name: 'E2E Automated Tester',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date().toISOString(),
    preferences: {
      theme: 'light' as const,
      aiProvider: 'builtin' as const,
      model: 'gemini-2.0-flash',
      voiceEnabled: false,
      voiceAutoRead: false,
      proactiveReminders: true,
      soundEffects: false,
      confirmDestructiveActions: true,
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 1. AUTH & USER LIFECYCLE
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 1. AUTHENTICATION & USER LIFECYCLE ---');

  await runTest('Auth', 'Create and Verify User', async () => {
    const user = db.createUser(
      {
        id: testUserId,
        email: testUser.email,
        name: testUser.name,
        avatar: testUser.avatar,
        createdAt: testUser.createdAt,
        preferences: testUser.preferences,
      },
      'TestPassword123!'
    );
    if (!user || user.id !== testUserId) throw new Error('Failed to create user in DB');
    const token = auth.signToken({ userId: user.id, email: user.email });
    if (!token) throw new Error('Token signing failed');
    const verified = auth.verifyToken(token);
    if (!verified || verified.userId !== testUserId) throw new Error('Token verification failed');
    return `User created (${user.email}), JWT token signed & verified`;
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CONVERSATIONS & CHAT (CREATE -> FETCH -> RENAME -> DELETE)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. CONVERSATIONS & CHAT SYSTEM ---');
  let testConvId = `conv_e2e_${Date.now()}`;

  await runTest('Conversations', 'Create Conversation & Messages', async () => {
    const conv = db.createConversation({
      id: testConvId,
      userId: testUserId,
      title: 'E2E AI Assistant Chat Session',
      pinned: false,
      model: 'gemini-2.0-flash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (!conv) throw new Error('Failed to create conversation');

    // Add user message
    db.createMessage({
      id: `msg_u_${Date.now()}`,
      conversationId: testConvId,
      userId: testUserId,
      role: 'user',
      content: 'What is the current live price of Bitcoin and top tech headlines?',
      createdAt: new Date().toISOString(),
    });

    // Add assistant message
    db.createMessage({
      id: `msg_a_${Date.now()}`,
      conversationId: testConvId,
      userId: 'system',
      role: 'assistant',
      content: 'Bitcoin is currently trading at live market rates with positive momentum.',
      createdAt: new Date().toISOString(),
    });

    return `Conversation created with 2 messages`;
  });

  await runTest('Conversations', 'Fetch Conversation & Message History', async () => {
    const conv = db.getConversationById(testConvId, testUserId);
    if (!conv) throw new Error('Could not retrieve conversation by ID');
    const msgs = db.getMessages(testConvId);
    if (msgs.length !== 2) throw new Error(`Expected 2 messages, got ${msgs.length}`);
    return `Retrieved conversation "${conv.title}" with ${msgs.length} messages`;
  });

  await runTest('Conversations', 'Rename Conversation (Update)', async () => {
    const updated = db.updateConversation(testConvId, testUserId, {
      title: 'Renamed E2E Realtime Session',
    });
    if (!updated || updated.title !== 'Renamed E2E Realtime Session') {
      throw new Error('Conversation rename failed');
    }
    return `Successfully renamed conversation to "${updated.title}"`;
  });

  await runTest('Conversations', 'Delete Conversation & Cascade Messages', async () => {
    const deleted = db.deleteConversation(testConvId, testUserId);
    if (!deleted) throw new Error('Delete conversation returned false');
    const checkConv = db.getConversationById(testConvId, testUserId);
    if (checkConv) throw new Error('Conversation still exists after deletion');
    const checkMsgs = db.getMessages(testConvId);
    if (checkMsgs.length > 0) throw new Error('Messages were not purged on conversation delete');
    return `Conversation and its message history completely purged`;
  });

  // ─────────────────────────────────────────────────────────────
  // 3. TASKS SYSTEM (CREATE -> TOGGLE -> DELETE)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. TASK MANAGEMENT SYSTEM ---');
  let testTaskId = `task_e2e_${Date.now()}`;

  await runTest('Tasks', 'Create Task with Priority & Due Date', async () => {
    const task = db.createTask({
      id: testTaskId,
      userId: testUserId,
      title: 'Verify Real-Time News and Weather Engine',
      description: 'End-to-end verification of live data feeds',
      status: 'todo',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      tags: ['e2e', 'realtime'],
      createdAt: new Date().toISOString(),
    });
    if (!task || task.id !== testTaskId) throw new Error('Task creation failed');
    return `Created High Priority task: "${task.title}"`;
  });

  await runTest('Tasks', 'Toggle Task Status (In-Progress & Complete)', async () => {
    const updated1 = db.updateTask(testTaskId, testUserId, { status: 'in_progress' });
    if (!updated1 || updated1.status !== 'in_progress') throw new Error('Status update to in_progress failed');

    const updated2 = db.updateTask(testTaskId, testUserId, { status: 'completed' });
    if (!updated2 || updated2.status !== 'completed') throw new Error('Status update to completed failed');
    return `Task status transitioned: todo -> in_progress -> completed`;
  });

  await runTest('Tasks', 'Delete Task', async () => {
    const ok = db.deleteTask(testTaskId, testUserId);
    if (!ok) throw new Error('Delete task failed');
    const tasks = db.getTasks(testUserId);
    if (tasks.some((t) => t.id === testTaskId)) throw new Error('Task still found after deletion');
    return `Task cleanly deleted`;
  });

  // ─────────────────────────────────────────────────────────────
  // 4. REMINDERS & ALARMS (CREATE -> UPDATE -> DELETE)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. ALARMS & REMINDERS SYSTEM ---');
  let testReminderId = `rem_e2e_${Date.now()}`;

  await runTest('Reminders', 'Create Reminder Alarm', async () => {
    const rem = db.createReminder({
      id: testReminderId,
      userId: testUserId,
      title: 'Executive KPI Daily Standup',
      dueDateTime: new Date(Date.now() + 3600000).toISOString(),
      recurrence: 'daily',
      priority: 'high',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    if (!rem || rem.id !== testReminderId) throw new Error('Reminder creation failed');
    return `Created reminder alarm for ${new Date(rem.dueDateTime).toLocaleTimeString()}`;
  });

  await runTest('Reminders', 'Update & Snooze Reminder', async () => {
    const snoozedTime = new Date(Date.now() + 7200000).toISOString();
    const updated = db.updateReminder(testReminderId, testUserId, {
      dueDateTime: snoozedTime,
    });
    if (!updated || updated.dueDateTime !== snoozedTime) throw new Error('Reminder snooze update failed');
    return `Reminder rescheduled to ${new Date(updated.dueDateTime).toLocaleTimeString()}`;
  });

  await runTest('Reminders', 'Delete Reminder', async () => {
    const ok = db.deleteReminder(testReminderId, testUserId);
    if (!ok) throw new Error('Delete reminder failed');
    const list = db.getReminders(testUserId);
    if (list.some((r) => r.id === testReminderId)) throw new Error('Reminder still found after deletion');
    return `Reminder deleted successfully`;
  });

  // ─────────────────────────────────────────────────────────────
  // 5. GOALS & OKRS (CREATE -> PROGRESS -> DELETE)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. GOALS & OKR SYSTEM ---');
  let testGoalId = `goal_e2e_${Date.now()}`;

  await runTest('Goals', 'Create OKR Goal with Target Metric', async () => {
    const goal = db.createGoal({
      id: testGoalId,
      userId: testUserId,
      title: 'Ship Recall AI 2.0 with Realtime Intelligence',
      description: '100% test coverage & live news',
      category: 'career',
      targetDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      progress: 0,
      milestones: [
        { id: `m1_${Date.now()}`, title: 'Complete E2E Tests', completed: true },
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    if (!goal || goal.id !== testGoalId) throw new Error('Goal creation failed');
    return `Created Goal: "${goal.title}"`;
  });

  await runTest('Goals', 'Update Goal Progress to 100%', async () => {
    const updated = db.updateGoal(testGoalId, testUserId, { progress: 100, status: 'completed' });
    if (!updated || updated.progress !== 100) throw new Error('Failed to update goal progress');
    return `Goal progress updated to 100%`;
  });

  await runTest('Goals', 'Delete Goal', async () => {
    const ok = db.deleteGoal(testGoalId, testUserId);
    if (!ok) throw new Error('Delete goal failed');
    const goals = db.getGoals(testUserId);
    if (goals.some((g) => g.id === testGoalId)) throw new Error('Goal still found after deletion');
    return `Goal deleted successfully`;
  });

  // ─────────────────────────────────────────────────────────────
  // 6. LEDGER & EXPENSES (CREATE -> DELETE)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. LEDGER & FINANCIAL SYSTEM ---');
  let testLedgerId = `led_e2e_${Date.now()}`;

  await runTest('Ledger', 'Create Expense / Due Entry', async () => {
    const entry = db.createLedgerEntry({
      id: testLedgerId,
      userId: testUserId,
      personName: 'Cloud GPU Provider',
      amount: 4500,
      currency: 'INR',
      type: 'give',
      status: 'pending',
      description: 'Server Hosting & Realtime Inference',
      createdAt: new Date().toISOString(),
    });
    if (!entry || entry.id !== testLedgerId) throw new Error('Ledger creation failed');
    return `Created Ledger Entry: ₹${entry.amount} (${entry.type}) to ${entry.personName}`;
  });

  await runTest('Ledger', 'Delete Ledger Entry', async () => {
    const ok = db.deleteLedgerEntry(testLedgerId, testUserId);
    if (!ok) throw new Error('Delete ledger failed');
    const entries = db.getLedgerEntries(testUserId);
    if (entries.some((l) => l.id === testLedgerId)) throw new Error('Ledger entry still exists after delete');
    return `Ledger entry deleted successfully`;
  });

  // ─────────────────────────────────────────────────────────────
  // 7. REAL-TIME DATA PROVIDERS (LIVE WEATHER, STOCKS, NEWS, SEARCH)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. LIVE REAL-TIME DATA PROVIDERS ---');

  await runTest('Realtime', 'Live Weather API (Multiple Global Cities)', async () => {
    const cities = ['Bangalore', 'London', 'Tokyo', 'New York'];
    const weatherResults = await Promise.all(cities.map((city) => getLiveWeather(city)));
    for (const w of weatherResults) {
      if (!w || typeof w.temperature !== 'number' || !w.condition) {
        throw new Error(`Invalid weather response for ${w?.location}`);
      }
    }
    const sample = weatherResults[0];
    return `Successfully fetched live weather for ${cities.join(', ')} (e.g. ${sample.location}: ${sample.temperature}°C, ${sample.condition})`;
  });

  await runTest('Realtime', 'Live Stocks & Crypto Market Quotes', async () => {
    const quotes = await getLiveMarketQuotes(['BTC', 'ETH', 'SOL', 'AAPL', 'NVDA', 'TSLA']);
    if (!quotes || quotes.length === 0) throw new Error('No market quotes returned');
    const btc = quotes.find((q) => q.symbol === 'BTC');
    if (!btc || btc.price <= 0) throw new Error('BTC live quote invalid');
    return `Retrieved ${quotes.length} live tickers: BTC ($${btc.price}), ETH, SOL, AAPL, NVDA, TSLA`;
  });

  await runTest('Realtime', 'Live Breaking News & Technology Feeds', async () => {
    const news = await getLiveNews('technology');
    if (!news || news.length === 0) throw new Error('No live news items returned');
    const first = news[0];
    return `Retrieved ${news.length} live stories. Top story: "${first.title}" from ${first.source} (${first.timeAgo})`;
  });

  await runTest('Realtime', 'Live News Topic Filtering (Markets & AI)', async () => {
    const marketNews = await getLiveNews('markets');
    if (!marketNews || marketNews.length === 0) throw new Error('No market news returned');
    return `Topic filtering active: ${marketNews.length} articles found for "markets"`;
  });

  await runTest('Realtime', 'Live Web Search (DuckDuckGo + Wikipedia)', async () => {
    const results = await executeWebSearch('Artificial Intelligence developments');
    if (!results || results.length === 0) throw new Error('Web search returned 0 results');
    return `Live Web Search returned ${results.length} verified results (Top source: ${results[0].source})`;
  });

  // ─────────────────────────────────────────────────────────────
  // 8. AUTONOMOUS AI AGENT TOOL ORCHESTRATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 8. AI AGENT TOOL ORCHESTRATION ---');

  await runTest('AITools', 'Execute NewsTool via Agent Interface', async () => {
    const tool = toolRegistry['NewsTool'];
    if (!tool) throw new Error('NewsTool not found in toolRegistry');
    const res = await tool.execute('getNews', { topic: 'technology' }, testUserId);
    if (!res.success || !res.data || res.data.length === 0) throw new Error('NewsTool execution failed');
    return res.message;
  });

  await runTest('AITools', 'Execute WeatherTool via Agent Interface', async () => {
    const tool = toolRegistry['WeatherTool'];
    if (!tool) throw new Error('WeatherTool not found in toolRegistry');
    const res = await tool.execute('getWeather', { location: 'Bangalore' }, testUserId);
    if (!res.success || !res.data) throw new Error('WeatherTool execution failed');
    return res.message;
  });

  await runTest('AITools', 'Execute StockTool via Agent Interface', async () => {
    const tool = toolRegistry['StockTool'];
    if (!tool) throw new Error('StockTool not found in toolRegistry');
    const res = await tool.execute('getQuote', { symbols: 'BTC,ETH,NVDA' }, testUserId);
    if (!res.success || !res.data) throw new Error('StockTool execution failed');
    return res.message;
  });

  await runTest('AITools', 'Execute WebSearchTool via Agent Interface', async () => {
    const tool = toolRegistry['WebSearchTool'];
    if (!tool) throw new Error('WebSearchTool not found in toolRegistry');
    const res = await tool.execute('searchWeb', { query: 'Next.js 15 App Router' }, testUserId);
    if (!res.success || !res.data) throw new Error('WebSearchTool execution failed');
    return res.message;
  });

  await runTest('AITools', 'Execute TaskTool via Agent Interface', async () => {
    const tool = toolRegistry['TaskTool'];
    if (!tool) throw new Error('TaskTool not found in toolRegistry');
    const res = await tool.execute('getTasks', { filter: 'all' }, testUserId);
    if (!res.success) throw new Error('TaskTool execution failed');
    return res.message;
  });

  // Cleanup test user
  db.deleteUser(testUserId);

  // ─────────────────────────────────────────────────────────────
  // FINAL REPORT SUMMARY
  // ─────────────────────────────────────────────────────────────
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log('\n======================================================');
  console.log(`   END-TO-END TEST SUITE SUMMARY: ${passedCount}/${results.length} PASSED`);
  console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    console.error(`⚠️ ${failedCount} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS RATE!\n');
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
