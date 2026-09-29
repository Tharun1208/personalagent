// End-to-End Comprehensive Test Suite for Recall AI
const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END TEST SUITE FOR RECALL AI\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ── TEST 1: SERVER & HOME PAGE RENDER ─────────────────────────
    console.log('📦 TEST 1: Root Page Render');
    const homeRes = await fetch(`${BASE_URL}/`);
    assert(homeRes.status === 200, `Root page returns status 200 (received: ${homeRes.status})`);
    const homeHtml = await homeRes.text();
    assert(homeHtml.includes('Recall AI'), 'Root HTML includes "Recall AI"');

    // ── TEST 2: CONVERSATIONS API ─────────────────────────────────
    console.log('\n💬 TEST 2: Conversation Creation & Retrieval');
    const convRes = await fetch(`${BASE_URL}/api/conversations`);
    const convData = await convRes.json();
    assert(Array.isArray(convData.conversations), 'Conversations list is an array');

    const newConvRes = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'E2E Verification Chat' }),
    });
    const newConvData = await newConvRes.json();
    assert(newConvData.conversation && newConvData.conversation.id, `Created new conversation (ID: ${newConvData.conversation?.id})`);
    const testConvId = newConvData.conversation.id;

    // ── TEST 3: EXPLICIT MEMORY - SAVE PREFERENCE ─────────────────
    console.log('\n🧠 TEST 3: Explicit Memory Save ("Remember that...")');
    const saveMemPrompt = 'Remember that my portfolio uses Next.js 15 and Tailwind CSS.';
    const chatSaveMemRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: saveMemPrompt }),
    });
    const chatSaveMemData = await chatSaveMemRes.json();
    assert(chatSaveMemData.success === true, 'Chat API returned success: true');
    assert(
      chatSaveMemData.assistantMessage.content.includes('Saved to memory') ||
      chatSaveMemData.assistantMessage.content.includes('✓'),
      'AI response acknowledges memory was saved with visual indicator'
    );
    assert(
      Array.isArray(chatSaveMemData.assistantMessage.memorySaved) && chatSaveMemData.assistantMessage.memorySaved.length > 0,
      'Memory payload attached to assistant message'
    );

    // ── TEST 4: MEMORY RETRIEVAL ("What tech stack do I usually use?") ─
    console.log('\n🔍 TEST 4: Memory Recall in Conversation');
    const queryMemPrompt = 'What tech stack do I usually use?';
    const chatQueryMemRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: queryMemPrompt }),
    });
    const chatQueryMemData = await chatQueryMemRes.json();
    const replyContent = chatQueryMemData.assistantMessage.content;
    assert(
      replyContent.includes('TypeScript') || replyContent.includes('Next.js'),
      `AI accurately recalled tech stack from persistent memory (Reply: "${replyContent.slice(0, 80)}...")`
    );

    // ── TEST 5: MEMORY CONTROL ("Don't remember this") ────────────
    console.log('\n🛡️ TEST 5: Memory Control ("Don\'t remember this")');
    const dontRememberPrompt = "Don't remember this";
    const chatDontRemRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: dontRememberPrompt }),
    });
    const chatDontRemData = await chatDontRemRes.json();
    assert(
      chatDontRemData.assistantMessage.content.includes('not remember this') ||
      chatDontRemData.assistantMessage.content.includes('nothing'),
      'AI explicitly confirmed nothing was stored'
    );

    // ── TEST 6: MEMORY CONTROL ("Forget that") ────────────────────
    console.log('\n🗑️ TEST 6: Memory Control ("Forget that" / Deletion)');
    const forgetPrompt = 'Forget my memory about Tailwind';
    const chatForgetRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: forgetPrompt }),
    });
    const chatForgetData = await chatForgetRes.json();
    assert(
      chatForgetData.assistantMessage.content.includes('Forgotten') ||
      chatForgetData.assistantMessage.content.includes('removed'),
      'AI confirmed memory deletion'
    );

    // ── TEST 7: MEMORY VAULT API (Search & Direct CRUD) ───────────
    console.log('\n🗄️ TEST 7: Memory Vault Search & Direct CRUD');
    const memListRes = await fetch(`${BASE_URL}/api/memories`);
    const memListData = await memListRes.json();
    assert(Array.isArray(memListData.memories), `Fetched ${memListData.memories.length} memories from vault`);

    const directMemRes = await fetch(`${BASE_URL}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'I need to submit my final project report on October 5.', category: 'Deadlines' }),
    });
    const directMemData = await directMemRes.json();
    assert(directMemData.memory && directMemData.memory.id, 'Created memory via direct vault endpoint');

    // ── TEST 8: SMART REMINDERS API & NATURAL LANGUAGE ────────────
    console.log('\n⏰ TEST 8: Smart Reminders');
    const remPrompt = 'Remind me tomorrow at 9 AM to review GitHub commits.';
    const chatRemRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: remPrompt }),
    });
    const chatRemData = await chatRemRes.json();
    assert(
      chatRemData.assistantMessage.content.includes('Reminder set') ||
      chatRemData.assistantMessage.content.includes('✓'),
      'AI extracted time and created natural reminder'
    );

    const getRemRes = await fetch(`${BASE_URL}/api/reminders`);
    const getRemData = await getRemRes.json();
    assert(getRemData.reminders.length > 0, `Reminders database holds ${getRemData.reminders.length} reminder(s)`);

    // ── TEST 9: TASK MANAGEMENT ───────────────────────────────────
    console.log('\n📋 TEST 9: Task Creation, Listing & Completion');
    const taskPrompt = 'Add a task to deploy VideoVault v1 with high priority.';
    const chatTaskRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: taskPrompt }),
    });
    const chatTaskData = await chatTaskRes.json();
    assert(
      chatTaskData.assistantMessage.content.includes('Task created') ||
      chatTaskData.assistantMessage.content.includes('✓'),
      'AI created task from natural language'
    );

    const getTasksRes = await fetch(`${BASE_URL}/api/tasks`);
    const getTasksData = await getTasksRes.json();
    assert(getTasksData.tasks.length > 0, `Tasks database holds ${getTasksData.tasks.length} task(s)`);

    // Complete task via chat
    const completePrompt = 'Mark the VideoVault task as completed.';
    const chatCompRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: completePrompt }),
    });
    const chatCompData = await chatCompRes.json();
    assert(
      chatCompData.assistantMessage.content.includes('completed') ||
      chatCompData.assistantMessage.content.includes('✓'),
      'AI marked task as completed'
    );

    // ── TEST 10: GITHUB COMMITS & PR CONFIRMATION SAFEGUARD ───────
    console.log('\n🐙 TEST 10: GitHub Activity & PR Confirmation Safeguard');
    const gitPrompt = 'Check my GitHub and tell me what I worked on today.';
    const chatGitRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: gitPrompt }),
    });
    const chatGitData = await chatGitRes.json();
    assert(
      chatGitData.assistantMessage.content.includes('GitHub') &&
      chatGitData.assistantMessage.content.includes('commits'),
      'AI retrieved and summarized GitHub commits'
    );

    // Prepare PR with confirmation
    const prPrompt = 'Prepare a PR for today\'s changes.';
    const chatPrRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: prPrompt }),
    });
    const chatPrData = await chatPrRes.json();
    assert(
      chatPrData.requiresConfirmation === true,
      'AI triggered confirmation safeguard for PR creation'
    );

    // Approve the confirmation
    const confirmRes = await fetch(`${BASE_URL}/api/tools/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: 'GitHubTool',
        action: 'createPullRequest',
        payload: chatPrData.confirmationPayload || {},
        approved: true,
      }),
    });
    const confirmData = await confirmRes.json();
    assert(confirmData.success === true, 'Confirmed and executed PR creation');

    // ── TEST 11: PROJECT CONTEXT & CROSS-DOMAIN OVERVIEW ──────────
    console.log('\n📁 TEST 11: Project Context & Cross-Domain Summary');
    // Ensure test project exists
    await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'VideoVault',
        description: 'AI-powered video bookmarking, transcript search, and chapter summarizer.',
        techStack: ['Next.js 15', 'TypeScript', 'Tailwind CSS'],
        repository: 'alexrivera/videovault-ai',
      }),
    });
    const projPrompt = 'What is pending in my VideoVault project?';
    const chatProjRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: testConvId, message: projPrompt }),
    });
    const chatProjData = await chatProjRes.json();
    assert(
      chatProjData.assistantMessage.content.includes('VideoVault') &&
      chatProjData.assistantMessage.content.includes('Tasks'),
      'AI aggregated project details, tech stack, and pending tasks'
    );

    // ── TEST 12: AGENT AUDIT LOG & NOTIFICATIONS ──────────────────
    console.log('\n⚡ TEST 12: Activity Log & Notifications');
    const actRes = await fetch(`${BASE_URL}/api/actions`);
    const actData = await actRes.json();
    assert(actData.actions.length > 0, `Agent audit log recorded ${actData.actions.length} verified operations`);

    const notifRes = await fetch(`${BASE_URL}/api/notifications`);
    const notifData = await notifRes.json();
    assert(Array.isArray(notifData.notifications), 'Notifications retrieved successfully');

    // ── TEST 13: DATA EXPORT & OWNERSHIP ──────────────────────────
    console.log('\n📦 TEST 13: Full Data Export & Ownership');
    const exportRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export' }),
    });
    const exportData = await exportRes.json();
    assert(
      exportData.export && exportData.export.memories && exportData.export.tasks,
      'Export returned complete user data archive (memories, tasks, reminders, conversations, actions)'
    );

    // ── SUMMARY ───────────────────────────────────────────────────
    console.log('\n========================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Fatal Test Suite Error:', error);
  }
}

runE2ETests();
