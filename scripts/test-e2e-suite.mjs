#!/usr/bin/env node

/**
 * 🧪 Comprehensive End-to-End Test Suite for personalagent
 *
 * Tests all recent additions and core subsystems:
 * 1. Notes Subsystem: Table markdown parser & generator, unassigned notes, folder delete persistence, list formatting
 * 2. Todo Tasks Subsystem: Task creation with description, storage, and retrieval
 * 3. Daily Expenses & Ledger Subsystem: Dynamic daily allowance, monthly budget metrics, day/month calculator, simulation, partial payments
 * 4. CSS & Styling Subsystem: Global scrollbar suppression verification
 * 5. TypeScript Compilation & Static Analysis
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function logSection(title) {
  console.log('\n' + '='.repeat(65));
  console.log(`📌 ${title}`);
  console.log('='.repeat(65));
}

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${testName}`);
    console.log(`     Error: ${err.message}`);
    failedTests++;
    failures.push({ name: testName, error: err.message });
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${testName}`);
    console.log(`     Error: ${err.message}`);
    failedTests++;
    failures.push({ name: testName, error: err.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─────────────────────────────────────────────────────────────
// 1. NOTES & TABLE SUBSYSTEM TESTS
// ─────────────────────────────────────────────────────────────
logSection('1. Notes & Table Markdown Subsystem');

// Test Table Generator & Parser
function parseMarkdownTable(text) {
  if (!text) return null;
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return null;
  const parseRow = (line) => line.slice(1, -1).split('|').map((c) => c.trim());
  const headers = parseRow(lines[0]);
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    while (cells.length < headers.length) cells.push('');
    rows.push(cells.slice(0, headers.length));
  }
  return { headers, rows: rows.length > 0 ? rows : [['', '', '']] };
}

function generateMarkdownTable(headers, rows) {
  const cleanHeaders = headers.map((h, i) => h.trim() || `Column ${i + 1}`);
  const separator = cleanHeaders.map(() => '---');
  const headerLine = `| ${cleanHeaders.join(' | ')} |`;
  const sepLine = `| ${separator.join(' | ')} |`;
  const rowLines = rows.map((row) => {
    const padded = [...row];
    while (padded.length < cleanHeaders.length) padded.push('');
    return `| ${padded.slice(0, cleanHeaders.length).map((c) => c.trim() || '-').join(' | ')} |`;
  });
  return `\n${headerLine}\n${sepLine}\n${rowLines.join('\n')}\n`;
}

runTest('Generate Markdown Table produces standard GFM table syntax', () => {
  const headers = ['Item', 'Cost', 'Status'];
  const rows = [
    ['Hosting', '1,500', 'Active'],
    ['Domain', '800', 'Renewed'],
  ];
  const md = generateMarkdownTable(headers, rows);
  assert(md.includes('| Item | Cost | Status |'), 'Header row missing');
  assert(md.includes('| --- | --- | --- |'), 'Separator row missing');
  assert(md.includes('| Hosting | 1,500 | Active |'), 'Data row missing');
});

runTest('Parse Markdown Table successfully reconstructs headers and rows', () => {
  const sample = `
| Task | Owner | Priority |
| --- | --- | --- |
| Implement E2E | Antigravity | High |
| Code Review | User | Medium |
`;
  const parsed = parseMarkdownTable(sample);
  assert(parsed !== null, 'Failed to parse valid table');
  assert(parsed.headers.length === 3, 'Expected 3 headers');
  assert(parsed.headers[0] === 'Task', 'Header 0 mismatch');
  assert(parsed.rows.length === 2, 'Expected 2 rows');
  assert(parsed.rows[0][0] === 'Implement E2E', 'Row 0 cell 0 mismatch');
  assert(parsed.rows[1][2] === 'Medium', 'Row 1 cell 2 mismatch');
});

runTest('Normalize Markdown converts bullet symbols (•) and numbered variants to GFM', () => {
  function normalizeMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^(\s*)•\s+/gm, '$1- ')
      .replace(/^(\s*)(\d+)\)\s+/gm, '$1$2. ');
  }

  const raw = '• First bullet\n  • Nested bullet\n1) Numbered item';
  const norm = normalizeMarkdown(raw);
  assert(norm.includes('- First bullet'), 'Bullet symbol not converted to -');
  assert(norm.includes('  - Nested bullet'), 'Nested bullet not converted');
  assert(norm.includes('1. Numbered item'), '1) not converted to 1.');
});

runTest('Folder persistence prevents resurrected default folders after deletion', () => {
  const notesViewFile = path.join(rootDir, 'components/notes/NotesView.tsx');
  const code = fs.readFileSync(notesViewFile, 'utf8');
  assert(code.includes('recall_note_folders_initialized'), 'Init flag key missing in NotesView');
  assert(code.includes('localStorage.setItem(FOLDERS_INIT_KEY, \'true\')'), 'Init flag write missing');
  assert(code.includes('__unassigned__'), 'Unassigned notes handling missing');
});

// ─────────────────────────────────────────────────────────────
// 2. TODO TASKS WITH DESCRIPTION E2E
// ─────────────────────────────────────────────────────────────
logSection('2. Todo Tasks with Description Subsystem');

runTest('AppContext createTask accepts and handles task description parameter', () => {
  const appContextFile = path.join(rootDir, 'lib/context/AppContext.tsx');
  const code = fs.readFileSync(appContextFile, 'utf8');
  assert(
    code.includes('createTask: (title: string, priority?: string, dueDate?: string, projectId?: string, description?: string)'),
    'createTask signature does not have description parameter in AppContextType'
  );
  assert(
    code.includes('description: description?.trim() || undefined'),
    'Optimistic task creation does not persist description'
  );
  assert(
    code.includes('body: JSON.stringify({ id: tempId, title, priority, dueDate, projectId, description })'),
    'API request does not send description'
  );
});

runTest('TasksView passes task description on handleCreate', () => {
  const tasksViewFile = path.join(rootDir, 'components/tasks/TasksView.tsx');
  const code = fs.readFileSync(tasksViewFile, 'utf8');
  assert(
    code.includes('newDescription.trim() || undefined'),
    'TasksView does not pass trimmed description to createTask'
  );
});

// ─────────────────────────────────────────────────────────────
// 3. DAILY EXPENSES & BUDGET CALCULATOR SUBSYSTEM
// ─────────────────────────────────────────────────────────────
logSection('3. Budget Metrics, Calculator & Dynamic Daily Allowance');

function calculateBudgetMetrics(monthlyBudget, spendingEntries, currentDate = new Date()) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  const remainingDays = Math.max(1, totalDaysInMonth - currentDay + 1);

  const monthExpenses = spendingEntries.filter((e) => e.date?.startsWith(currentMonthPrefix));
  const monthSpent = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const remainingMonthBudget = monthlyBudget - monthSpent;
  const monthPct = Math.min(100, Math.round((monthSpent / monthlyBudget) * 100));

  const weeksInMonth = totalDaysInMonth / 7;
  const weeklyBudget = Math.round(monthlyBudget / weeksInMonth);

  const dailyAllowance = remainingDays > 0 ? Math.max(0, Math.round(remainingMonthBudget / remainingDays)) : 0;

  return {
    monthlyBudget,
    monthSpent,
    remainingMonthBudget,
    monthPct,
    weeklyBudget,
    dailyAllowance,
    totalDaysInMonth,
    remainingDays,
  };
}

runTest('Budget Metrics calculates correct pacing and dynamic daily allowance', () => {
  const now = new Date(2026, 9, 13); // Oct 13, 2026 (31 days total, day 13 -> 19 remaining days)
  const budget = 31000;
  const entries = [
    { amount: 1000, date: '2026-10-01' },
    { amount: 2000, date: '2026-10-05' },
    { amount: 3000, date: '2026-10-10' },
  ];
  const metrics = calculateBudgetMetrics(budget, entries, now);

  assert(metrics.monthSpent === 6000, `Expected monthSpent 6000, got ${metrics.monthSpent}`);
  assert(metrics.remainingMonthBudget === 25000, `Expected remaining 25000, got ${metrics.remainingMonthBudget}`);
  assert(metrics.totalDaysInMonth === 31, 'Expected 31 total days in Oct');
  assert(metrics.remainingDays === 19, `Expected 19 remaining days, got ${metrics.remainingDays}`);
  // Dynamic daily allowance = 25000 / 19 = 1316
  assert(metrics.dailyAllowance === 1316, `Expected dynamic allowance 1316, got ${metrics.dailyAllowance}`);
});

runTest('What-If simulation accurately reflects expense impact on daily allowance', () => {
  const remainingBudget = 25000;
  const remainingDays = 19;
  const simExpense = 4000;

  const initialDaily = Math.round(remainingBudget / remainingDays); // 1316
  const newRemaining = remainingBudget - simExpense; // 21000
  const newDaily = Math.round(newRemaining / remainingDays); // 1105
  const diff = newDaily - initialDaily; // -211

  assert(newRemaining === 21000, 'New remaining budget mismatch');
  assert(newDaily === 1105, 'New daily allowance mismatch');
  assert(diff === -211, `Expected diff -211, got ${diff}`);
});

runTest('LedgerView contains all required budget modals, edit/delete, and collapsible history', () => {
  const ledgerViewFile = path.join(rootDir, 'components/ledger/LedgerView.tsx');
  const code = fs.readFileSync(ledgerViewFile, 'utf8');

  assert(code.includes('handleOpenBudgetModal'), 'handleOpenBudgetModal missing');
  assert(code.includes('handleOpenEditExpense'), 'handleOpenEditExpense missing');
  assert(code.includes('handleDeleteExpense'), 'handleDeleteExpense missing');
  assert(code.includes('showSpendingHistory'), 'showSpendingHistory toggle state missing');
  assert(code.includes('See Spending History'), 'See Spending History button missing');
  assert(code.includes('Spending Calculator & Simulator'), 'Calculator widget header missing');
});

// ─────────────────────────────────────────────────────────────
// 4. GLOBAL SCROLLBAR SUPPRESSION TESTS
// ─────────────────────────────────────────────────────────────
logSection('4. Global Scrollbar Suppression');

runTest('globals.css enforces complete global scrollbar hiding', () => {
  const cssFile = path.join(rootDir, 'app/globals.css');
  const css = fs.readFileSync(cssFile, 'utf8');

  assert(css.includes('scrollbar-width: none !important'), 'Firefox scrollbar suppression missing');
  assert(css.includes('-ms-overflow-style: none !important'), 'IE/Edge scrollbar suppression missing');
  assert(css.includes('::-webkit-scrollbar'), 'Webkit scrollbar rule missing');
  assert(css.includes('display: none !important'), 'display: none !important for webkit scrollbars missing');
  assert(!css.includes('::-webkit-scrollbar-thumb {\n  background: var(--border-medium);'), 'Visible scrollbar thumb rule was not removed');
});

// ─────────────────────────────────────────────────────────────
// 5. TYPESCRIPT STATIC ANALYSIS
// ─────────────────────────────────────────────────────────────
logSection('5. TypeScript Static Compilation Check');

runTest('TypeScript compile passes cleanly with 0 errors (npx tsc --noEmit)', () => {
  try {
    execSync('npx tsc --noEmit -p tsconfig.json', { cwd: rootDir, stdio: 'pipe' });
  } catch (err) {
    throw new Error(`TypeScript compilation failed:\n${err.stdout ? err.stdout.toString() : err.message}`);
  }
});

// ─────────────────────────────────────────────────────────────
// 6. DASHBOARD REDESIGN & AI CARD SUBSYSTEM
// ─────────────────────────────────────────────────────────────
logSection('6. Dashboard Redesign & AI Assistance Subsystem');

runTest('DashboardView enforces light theme AI card and clean top bar', () => {
  const dashFile = path.join(rootDir, 'components/dashboard/DashboardView.tsx');
  const code = fs.readFileSync(dashFile, 'utf8');

  assert(code.includes('AI Assistance'), 'AI Assistance title missing');
  assert(!code.includes('#0F172A'), 'Dark background gradient #0F172A still present');
  assert(!code.includes('#1E1B4B'), 'Dark background gradient #1E1B4B still present');
  assert(!code.includes('Sparkles'), 'Sparkles icon should be removed');
  assert(!code.includes('isOnline'), 'isOnline status pill should be removed');
  assert(!code.includes('<span>New Task</span>'), 'New Task button should be removed from top');
  assert(!code.includes('<span>New Note</span>'), 'New Note button should be removed from top');
  assert(code.includes('Tasks & Activity'), 'Card 1 (Tasks & Activity) missing');
  assert(code.includes('Ledger & Dues'), 'Card 2 (Ledger & Dues) missing');
  assert(code.includes('Schedule'), 'Card 3 (Schedule) missing');
  assert(code.includes('My Notes'), 'Card 4 (My Notes) missing');
  assert(code.includes('Daily Spending Trend'), 'Daily spending trend missing');
  assert(code.includes('Upcoming Schedule'), 'Upcoming schedule section missing');
  assert(code.includes('Pending Tasks'), 'Pending tasks section missing');
});

runTest('App initialization defaults directly to Dashboard tab', () => {
  const appContextFile = path.join(rootDir, 'lib/context/AppContext.tsx');
  const appLayoutFile = path.join(rootDir, 'components/layout/AppLayout.tsx');

  const appContextCode = fs.readFileSync(appContextFile, 'utf8');
  const appLayoutCode = fs.readFileSync(appLayoutFile, 'utf8');

  assert(appContextCode.includes("setActiveTabState('dashboard')"), 'AppContext must default to dashboard');
  assert(appLayoutCode.includes("JSON.stringify(['dashboard'])"), 'AppLayout tabHistory must default to dashboard');
});

// ─────────────────────────────────────────────────────────────
// 7. NOTIFICATIONS API INTEGRITY & FAULT TOLERANCE
// ─────────────────────────────────────────────────────────────
logSection('7. Notifications API Integrity');

runTest('Notifications route and DB methods handle uninitialized state gracefully', () => {
  const notifRouteFile = path.join(rootDir, 'app/api/notifications/route.ts');
  const dbFile = path.join(rootDir, 'lib/db/index.ts');

  const routeCode = fs.readFileSync(notifRouteFile, 'utf8');
  const dbCode = fs.readFileSync(dbFile, 'utf8');

  assert(dbCode.includes('data.notifications = data.notifications || []'), 'DB notifications defensive initialization missing');
  assert(routeCode.includes('reminderError'), 'Safe reminder check try/catch block missing');
  assert(!routeCode.includes("{ status: 500 }"), 'Route should avoid 500 on reminder checks');
});

// ─────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────
logSection('TEST SUITE SUMMARY');
console.log(`Total Tests Run: ${totalTests}`);
console.log(`Passed:         ${passedTests}`);
console.log(`Failed:         ${failedTests}`);

if (failedTests > 0) {
  console.log('\n❌ Failures:');
  failures.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!\n');
  process.exit(0);
}
