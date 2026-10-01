'use client';

import React from 'react';
import {
  Activity,
  Brain,
  CheckSquare,
  Clock,
  FolderGit2,
  GitPullRequest,
  Globe,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

export default function ActivityLogView() {
  const { agentActions } = useApp();

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'MemoryTool':
        return <Brain size={14} className="text-(--brand-emerald)" />;
      case 'TaskTool':
        return <CheckSquare size={14} className="text-(--brand-amber)" />;
      case 'ReminderTool':
        return <Clock size={14} className="text-(--brand-rose)" />;
      case 'ProjectTool':
        return <FolderGit2 size={14} className="text-blue-500" />;
      case 'GitHubTool':
        return <GitPullRequest size={14} className="text-purple-500" />;
      case 'WebSearchTool':
        return <Globe size={14} className="text-cyan-500" />;
      default:
        return <Activity size={14} className="text-(--brand-indigo)" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-(--bg-primary)">
      {/* Top Header */}
      <div className="h-14 px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Activity size={18} />
          </div>
          <div>
            <h1 className="app-page-title">Agent Activity Log</h1>
            <p className="app-page-subtitle">
              Audit timeline of all autonomous tool operations, memory indexing, and actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-(--text-muted)">
          <ShieldCheck size={14} className="text-(--brand-emerald)" />
          <span>Audit verification active</span>
        </div>
      </div>

      {/* Activity Timeline Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full custom-scrollbar">
        {agentActions.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Activity size={32} className="mx-auto text-(--text-muted) opacity-40" />
            <div className="text-sm font-medium text-(--text-primary)">No actions logged yet</div>
            <p className="text-xs text-(--text-muted)">
              When the assistant executes tools, schedules reminders, or remembers facts, they will appear here.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-(--border-subtle) ml-4 pl-6 space-y-6 pb-12">
            {agentActions.map((act) => (
              <div key={act.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-(--bg-card) border border-(--border-medium) flex items-center justify-center shadow-2xs">
                  {getToolIcon(act.toolName)}
                </div>

                <div className="p-4 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-(--border-medium) shadow-2xs transition-all space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-(--text-primary)">
                        {act.toolName} → {act.action}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-(--bg-secondary) border border-(--border-subtle) text-(--text-muted)">
                        {act.permissionLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-(--text-muted)">
                      {act.status === 'success' ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      ) : act.status === 'cancelled' ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <AlertTriangle size={12} /> Cancelled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                      <span>•</span>
                      <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <p className="text-xs text-(--text-secondary) leading-relaxed">
                    {act.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
