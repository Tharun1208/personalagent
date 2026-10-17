'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownNoteRendererProps {
  content: string;
  className?: string;
  onCheckboxToggle?: (lineIndex: number, newChecked: boolean) => void;
}

/**
 * Normalizes text so that bullet symbols (•) and parenthesized numbers (1))
 * are converted to standard markdown list syntax for flawless rendering.
 */
function normalizeMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(\s*)•\s+/gm, '$1- ')
    .replace(/^(\s*)(\d+)\)\s+/gm, '$1$2. ');
}

export default function MarkdownNoteRenderer({
  content,
  className = '',
  onCheckboxToggle,
}: MarkdownNoteRendererProps) {
  const normalized = normalizeMarkdown(content);

  return (
    <div className={`prose prose-slate max-w-none text-slate-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="min-w-full border-collapse text-xs sm:text-sm text-left" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100/90 border-b border-slate-200 font-bold text-slate-900" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3.5 py-2.5 font-bold text-slate-900 border-r border-slate-200/80 last:border-r-0 text-xs tracking-tight whitespace-nowrap" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-slate-100 bg-white" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-slate-50/70 transition-colors" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3.5 py-2.5 text-slate-700 border-r border-slate-100 last:border-r-0 text-xs sm:text-sm align-top" {...props} />
          ),
          ul: ({ node, className: ulClass, ...props }) => {
            const isTaskList = ulClass?.includes('contains-task-list');
            return (
              <ul
                className={
                  isTaskList
                    ? 'space-y-1.5 my-2 list-none pl-0'
                    : 'list-disc list-outside pl-5 space-y-1 my-2 text-slate-800'
                }
                {...props}
              />
            );
          },
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-5 space-y-1 my-2 text-slate-800 font-medium" {...props} />
          ),
          li: ({ node, className: liClass, children, ...props }) => {
            const isTask = liClass?.includes('task-list-item');
            return (
              <li
                className={
                  isTask
                    ? 'flex items-start gap-2 list-none my-1'
                    : 'leading-relaxed my-0.5'
                }
                {...props}
              >
                {children}
              </li>
            );
          },
          input: ({ node, type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={Boolean(checked)}
                  readOnly
                  className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-default"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          p: ({ node, ...props }) => (
            <p className="my-1.5 leading-relaxed text-inherit" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-slate-900" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-slate-700" {...props} />
          ),
          code: ({ node, className: codeClass, children, ...props }) => (
            <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-xs" {...props}>
              {children}
            </code>
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-slate-300 pl-3 my-2 italic text-slate-600" {...props} />
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
