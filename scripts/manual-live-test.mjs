import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data, ok: res.ok };
}

async function runLiveManualTest() {
  console.log('='.repeat(65));
  console.log('🧪 RUNNING LIVE MANUAL END-TO-END SERVER TESTS');
  console.log('='.repeat(65));

  let token = '';
  let createdTaskId = '';
  let passed = 0;
  let failed = 0;

  async function step(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [${name}] PASSED`);
      passed++;
    } catch (err) {
      console.log(`  ❌ [${name}] FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Root page health check
  await step('1. Web Page & HTML Shell (GET /)', async () => {
    const res = await request('/');
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (typeof res.data !== 'string' || !res.data.includes('html')) {
      throw new Error('Response did not return valid HTML content');
    }
  });

  // 2. Guest Authentication
  await step('2. Authentication Flow (POST /api/auth/guest)', async () => {
    const res = await request('/api/auth/guest', { method: 'POST' });
    if (![200, 201].includes(res.status)) throw new Error(`Expected 200/201, got ${res.status}`);
    if (!res.data.token) throw new Error('No auth token returned');
    token = res.data.token;
    console.log(`     ↳ Authenticated as: ${res.data.user?.name} (${res.data.user?.email})`);
  });

  // 3. Task Creation
  await step('3. Task Management - Create (POST /api/tasks)', async () => {
    const res = await request('/api/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Complete System Architecture Review',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    if (![200, 201].includes(res.status)) throw new Error(`Expected 200/201, got ${res.status}`);
    if (!res.data.task?.id) throw new Error('Task was not created');
    createdTaskId = res.data.task.id;
    console.log(`     ↳ Created Task ID: ${createdTaskId} | "${res.data.task.title}"`);
  });

  // 4. Tasks Query
  await step('4. Task Management - List & Verify (GET /api/tasks)', async () => {
    const res = await request('/api/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const found = res.data.tasks?.some((t) => t.id === createdTaskId);
    if (!found) throw new Error('Created task was not found in task list');
    console.log(`     ↳ Found ${res.data.tasks.length} task(s) in database`);
  });

  // 5. Task Status Toggle / Update
  await step('5. Task Management - Toggle / Update (PATCH /api/tasks/:id)', async () => {
    const res = await request(`/api/tasks/${createdTaskId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { status: 'completed' },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.task?.status !== 'completed') {
      throw new Error(`Expected task status 'completed', got ${res.data.task?.status}`);
    }
    console.log(`     ↳ Task status updated to: completed`);
  });

  // 6. Ledger & Expense Tracker
  let createdLedgerId = '';
  await step('6. Money Ledger - Create Due (POST /api/ledger)', async () => {
    const res = await request('/api/ledger', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        personName: 'Dave Cooper',
        amount: 450,
        type: 'give',
        description: 'Team Lunch Split',
      },
    });
    if (![200, 201].includes(res.status)) throw new Error(`Expected 200/201, got ${res.status}`);
    createdLedgerId = res.data.entry?.id;
    console.log(`     ↳ Created Ledger ID: ${createdLedgerId} | ₹${res.data.entry?.amount} (give)`);
  });

  // 7. Ledger Query & DSA Balance Check
  await step('7. Money Ledger - List & Balance (GET /api/ledger)', async () => {
    const res = await request('/api/ledger', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const entries = res.data.ledger || res.data.entries;
    if (!Array.isArray(entries)) throw new Error('Entries array not returned');
    console.log(`     ↳ Found ${entries.length} ledger entry/entries`);
  });

  // 8. Settings & Full JSON Data Export
  await step('8. Backup & Data Export (POST /api/settings)', async () => {
    const res = await request('/api/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { action: 'export' },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.export) throw new Error('Export payload missing in response');
    const exportKeys = Object.keys(res.data.export);
    console.log(`     ↳ Exported datasets: ${exportKeys.join(', ')}`);
  });

  // 9. Task Cleanup / Deletion
  await step('9. Task Management - Delete (DELETE /api/tasks/:id)', async () => {
    const res = await request(`/api/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    console.log(`     ↳ Task ${createdTaskId} successfully deleted`);
  });

  console.log('\n' + '='.repeat(65));
  console.log(`📊 LIVE SERVER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(65) + '\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveManualTest().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
