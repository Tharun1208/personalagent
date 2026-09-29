const baseUrl = 'http://localhost:3001';

async function runE2ETests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: [],
  };

  function assert(name, condition, extra = '') {
    results.total++;
    if (condition) {
      results.passed++;
      results.details.push({ name, status: 'PASSED', extra });
      console.log(`✅ [PASSED] ${name} ${extra ? `(${extra})` : ''}`);
    } else {
      results.failed++;
      results.details.push({ name, status: 'FAILED', extra });
      console.error(`❌ [FAILED] ${name} ${extra ? `(${extra})` : ''}`);
    }
  }

  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END (E2E) TEST SUITE');
  console.log('====================================================\n');

  try {
    // TEST 1: Server Accessibility
    const homeRes = await fetch(`${baseUrl}/`);
    assert('Frontend Server Accessibility', homeRes.status === 200, `HTTP ${homeRes.status}`);

    // TEST 2: MongoDB Atlas Health & Connectivity
    const dbStatusRes = await fetch(`${baseUrl}/api/db/status`);
    const dbStatus = await dbStatusRes.json();
    assert(
      'MongoDB Atlas Connection Health',
      dbStatus.connected === true && dbStatus.driver.includes('MongoDB'),
      `Driver: ${dbStatus.driver}, Collections: ${JSON.stringify(dbStatus.collections)}`
    );

    // TEST 3: User Profile & Settings Read/Write
    const userRes = await fetch(`${baseUrl}/api/settings`);
    const userData = await userRes.json();
    assert(
      'User Profile Retrieval',
      Boolean(userData?.user?.name),
      `User: ${userData?.user?.name}`
    );

    const updateName = `Tharun H S (E2E Verified)`;
    const updateRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: updateName }),
    });
    const updateData = await updateRes.json();
    assert(
      'User Profile Update Persistence',
      updateData?.user?.name === updateName,
      `Saved: ${updateData?.user?.name}`
    );

    // Revert name back
    await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tharun H S' }),
    });

    // TEST 4: Task Creation, Retrieval, and Completion
    const taskTitle = `E2E Automated Task - ${Date.now()}`;
    const createTaskRes = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: taskTitle,
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    const createdTask = await createTaskRes.json();
    assert(
      'Task Creation API',
      Boolean(createdTask?.task?.id && createdTask?.task?.title === taskTitle),
      `Task ID: ${createdTask?.task?.id}`
    );

    // Toggle Task status
    const toggleRes = await fetch(`${baseUrl}/api/tasks/${createdTask.task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const toggledTask = await toggleRes.json();
    assert(
      'Task Status Toggle API (Mark Complete)',
      toggledTask?.task?.status === 'completed',
      `Status: ${toggledTask?.task?.status}`
    );

    // Clean up task
    await fetch(`${baseUrl}/api/tasks/${createdTask.task.id}`, { method: 'DELETE' });

    // TEST 5: Reminder & Calendar Event Creation
    const reminderTitle = `E2E Calendar Event - ${Date.now()}`;
    const createRemRes = await fetch(`${baseUrl}/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reminderTitle,
        dueDateTime: new Date(Date.now() + 7200000).toISOString(),
        recurrence: 'daily',
      }),
    });
    const createdRem = await createRemRes.json();
    assert(
      'Calendar Event / Reminder Creation API',
      Boolean(createdRem?.reminder?.id && createdRem?.reminder?.title === reminderTitle),
      `Reminder ID: ${createdRem?.reminder?.id}`
    );

    // Clean up reminder
    await fetch(`${baseUrl}/api/reminders/${createdRem.reminder.id}`, { method: 'DELETE' });

    // TEST 6: AI Chat Pipeline (Natural Language Scheduling & Intent)
    const chatScheduleRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Schedule the event and task: Deploy Q3 Production Release tomorrow at 5pm',
      }),
    });
    const chatScheduleData = await chatScheduleRes.json();
    assert(
      'AI Chat Pipeline (NLP Scheduling)',
      chatScheduleData?.success === true && Boolean(chatScheduleData?.assistantMessage?.content),
      `Response Length: ${chatScheduleData?.assistantMessage?.content?.length} chars`
    );

    // TEST 7: AI Chat General Intelligence (LLM Response)
    const chatGeneralRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is 45 * 12? Explain concisely.',
      }),
    });
    const chatGeneralData = await chatGeneralRes.json();
    assert(
      'AI Chat Pipeline (LLM Reasoning & Calculation)',
      chatGeneralData?.success === true && chatGeneralData?.assistantMessage?.content?.includes('540'),
      `Assistant correctly computed 540`
    );

    // TEST 8: Memory Engine Retrieval
    const memoryRes = await fetch(`${baseUrl}/api/memories`);
    const memoryData = await memoryRes.json();
    assert(
      'Memory Vault Retrieval',
      Array.isArray(memoryData?.memories),
      `Stored Memories: ${memoryData?.memories?.length}`
    );

    // TEST 9: Full Data Export Backup (.JSON)
    const exportRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export' }),
    });
    const exportData = await exportRes.json();
    assert(
      'Data Ownership & JSON Backup Export',
      Boolean(exportData?.export?.user && Array.isArray(exportData?.export?.tasks)),
      `Exported User: ${exportData?.export?.user?.name}`
    );

    console.log('\n====================================================');
    console.log(`📊 E2E TEST SUMMARY: ${results.passed}/${results.total} TESTS PASSED (${results.failed} failed)`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Fatal test runner exception:', err);
  }
}

runE2ETests();
