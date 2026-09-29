# 🧠 Recall AI — Personal AI Assistant

> **Production-Ready Personal Intelligence Assistant** with Persistent Memory, Smart Reminders, Task Management, Autonomous Tool Orchestration, and Multi-Provider LLM Integration.

---

## 🌟 Core Differentiators

Recall AI is built as a **chat-first personal assistant** inspired by the elegance of Gemini/ChatGPT, but fundamentally augmented with:
1. **Persistent Personal Memory Engine**: Explicit memory storage (`"Remember that..."`, `"Save this..."`, `"Forget that..."`), automatic semantic categorization, hybrid TF-IDF/cosine relevance retrieval, and full memory management.
2. **Autonomous Tool Orchestration**: Multi-step AI agent that understands user intent, retrieves memory context, executes tools (`Tasks`, `Reminders`, `GitHub`, `Projects`, `Web Search`, `Calendar`, `Email`), and requires user confirmation for `WRITE` / `DESTRUCTIVE` operations.
3. **Smart Natural Language Reminders**: One-time, daily, weekly, and monthly recurring reminders with in-app notification toasts and sound chimes.
4. **Task & Project Management**: Interactive task board, status tracking (`todo`, `in_progress`, `completed`), priorities, and project memory contexts.
5. **Multi-Provider LLM Abstraction**: Configurable model routing for OpenAI (GPT-4o), Google Gemini (Gemini 2.0 Flash/Pro), Anthropic (Claude 3.5 Sonnet), Groq, Local Ollama, and Built-in Recall Core.
6. **Voice Dictation & Text-To-Speech**: Web Speech API microphone input with animated audio visualizer and audio speech synthesis.
7. **Global Command Palette (`Ctrl+K` / `Cmd+K`)**: Instant action launcher and cross-database search.
8. **Data Ownership & Privacy**: Complete JSON export and one-click data wipe.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🏗️ Architecture Overview

```
/app
  ├── (dashboard) / views
  ├── api/
  │    ├── auth/          # Login, Register, Session (JWT)
  │    ├── chat/          # Agent orchestration & streaming
  │    ├── conversations/ # Chat history CRUD
  │    ├── memories/      # Semantic memory CRUD & search
  │    ├── tasks/         # Task management CRUD
  │    ├── reminders/     # Reminder scheduling & triggers
  │    ├── projects/      # Project context CRUD
  │    ├── actions/       # Agent audit & activity log
  │    ├── notifications/ # Real-time notification drawer
  │    └── settings/      # AI providers, export JSON, wipe
  ├── globals.css         # Minimal light / obsidian dark theme tokens
  ├── layout.tsx          # Root provider wrapper
  └── page.tsx            # Main application entry
/components
  ├── chat/               # ChatView, ChatComposer, Voice visualizer
  ├── memory/             # MemoryVaultView, category filters
  ├── tasks/              # TasksView, priority tags, checkmark toggles
  ├── reminders/          # RemindersView, recurrence schedules
  ├── projects/           # ProjectsView, tech stack context
  ├── activity/           # ActivityLogView, audit timeline
  ├── dashboard/          # DashboardView, daily morning brief
  ├── settings/           # SettingsView, AI keys, export/wipe
  ├── common/             # CommandPalette (Cmd+K), NotificationDrawer
  └── layout/             # AppLayout, responsive sidebar
/lib
  ├── agent/              # Agent Orchestrator & Multi-Provider LLM router
  ├── memory/             # Semantic Memory Engine & vector cosine scoring
  ├── tools/              # Modular Tool Registry (Memory, Tasks, Reminders, GitHub, Web)
  ├── auth/               # JWT authentication & session verification
  ├── db/                 # Zero-dependency persistent DB engine & cache
  └── context/            # AppContext state & reactive hooks
/prisma
  └── schema.prisma       # PostgreSQL + pgvector production schema
/types
  └── index.ts            # TypeScript definitions
```

---

## 🧪 Example Conversations to Try

1. **Explicit Memory**:
   - `"Remember that my portfolio uses Next.js 15 and Tailwind CSS."`
   - *"✓ Saved to memory. I'll remember that: 'My portfolio uses Next.js 15 and Tailwind CSS.'"*
2. **Querying Memory**:
   - `"What tech stack do I usually use for my projects?"`
   - *"Based on your stored preferences, you usually prefer TypeScript and Next.js 15."*
3. **Smart Reminders**:
   - `"Remind me tomorrow at 9 AM to submit my project report."`
   - *"✓ Reminder set for tomorrow at 9:00 AM."*
4. **Task Management**:
   - `"Add a task to deploy VideoVault to Vercel production with high priority."`
   - `"Mark the deployment task as completed."`
5. **GitHub & Commit Analysis**:
   - `"Check my GitHub and tell me what I worked on today."`
   - `"Prepare a PR for today's changes in VideoVault."`
6. **Cross-Domain Context & Deadlines**:
   - `"What do I need to finish this week?"`
   - *"Combines pending high-priority tasks, scheduled reminders, and stored deadlines."*
7. **Forgetting Memories**:
   - `"Forget my memory about TypeScript."`
   - *"✓ Forgotten. I have removed 1 memory entry."*

---

## 🔒 Security & Safe Action Execution

- **Tool Permissions**: Every tool action is categorized as `READ`, `WRITE`, or `DESTRUCTIVE`.
- **Confirmation Safeguards**: Sensitive operations (e.g. creating GitHub PRs, sending emails, or deleting projects) automatically present an interactive confirmation card before executing.
- **Audit Log**: Every agent tool call, parameter, result, and timestamp is permanently recorded in the **Agent Activity Log**.
- **Data Export & Wipe**: Users can export all personal data into a structured JSON archive or delete all records at any time in Settings.
