'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Grid, Check, Sparkles } from 'lucide-react';

interface VisualTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (markdownTable: string) => void;
  initialMarkdown?: string;
}

export function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  if (!text) return null;
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  // Line 1 is separator (---)
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    // Pad or trim to match headers length
    while (cells.length < headers.length) cells.push('');
    rows.push(cells.slice(0, headers.length));
  }

  return { headers, rows: rows.length > 0 ? rows : [['', '', '']] };
}

export function generateMarkdownTable(headers: string[], rows: string[][]): string {
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

const PRESET_TEMPLATES = [
  {
    name: 'Task & Status',
    headers: ['Task', 'Owner', 'Status'],
    rows: [
      ['Design review', 'Alex', 'Done'],
      ['Database schema', 'Sam', 'In Progress'],
      ['Testing', 'You', 'Pending'],
    ],
  },
  {
    name: 'Expense Table',
    headers: ['Item / Category', 'Amount (₹)', 'Date'],
    rows: [
      ['Groceries', '1,200', 'Today'],
      ['Internet Bill', '899', 'Monthly'],
      ['Office Supplies', '450', 'Yesterday'],
    ],
  },
  {
    name: 'Comparison',
    headers: ['Feature', 'Option A', 'Option B'],
    rows: [
      ['Speed', 'High', 'Moderate'],
      ['Cost', 'Low', 'High'],
      ['Reliability', '99.9%', '98.5%'],
    ],
  },
];

export default function VisualTableModal({
  isOpen,
  onClose,
  onInsertTable,
  initialMarkdown,
}: VisualTableModalProps) {
  const [headers, setHeaders] = useState<string[]>(() => {
    const parsed = initialMarkdown ? parseMarkdownTable(initialMarkdown) : null;
    return parsed ? parsed.headers : ['Item', 'Description', 'Status'];
  });

  const [rows, setRows] = useState<string[][]>(() => {
    const parsed = initialMarkdown ? parseMarkdownTable(initialMarkdown) : null;
    return parsed
      ? parsed.rows
      : [
          ['Item 1', 'Details for item 1', 'Done'],
          ['Item 2', 'Details for item 2', 'In Progress'],
        ];
  });

  if (!isOpen) return null;

  // Table manipulation helpers
  const handleHeaderChange = (colIdx: number, val: string) => {
    const next = [...headers];
    next[colIdx] = val;
    setHeaders(next);
  };

  const handleCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const next = rows.map((r, rI) => (rI === rowIdx ? [...r] : r));
    next[rowIdx][colIdx] = val;
    setRows(next);
  };

  const addColumn = () => {
    const newColNum = headers.length + 1;
    setHeaders([...headers, `Col ${newColNum}`]);
    setRows(rows.map((r) => [...r, '']));
  };

  const removeColumn = (colIdx: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== colIdx));
    setRows(rows.map((r) => r.filter((_, i) => i !== colIdx)));
  };

  const addRow = () => {
    const emptyRow = headers.map(() => '');
    setRows([...rows, emptyRow]);
  };

  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rowIdx));
  };

  const applyTemplate = (tmpl: (typeof PRESET_TEMPLATES)[0]) => {
    setHeaders([...tmpl.headers]);
    setRows(tmpl.rows.map((r) => [...r]));
  };

  const handleSaveAndInsert = () => {
    const md = generateMarkdownTable(headers, rows);
    onInsertTable(md);
    onClose();
  };

  return (
    <div
      data-modal-backdrop="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 text-slate-900"
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Grid size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Visual Table Builder</h2>
              <p className="text-[11px] text-slate-400">
                Design your table with rows and columns, rendered in true table format
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap pb-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> Presets:
            </span>
            {PRESET_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => applyTemplate(tmpl)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                {tmpl.name}
              </button>
            ))}
          </div>

          {/* Interactive Visual Table Editor */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs bg-white">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200">
                  <th className="w-8 px-2 py-2 text-center text-slate-400 font-normal">#</th>
                  {headers.map((h, colIdx) => (
                    <th key={colIdx} className="px-2 py-2 border-r border-slate-200/80 last:border-r-0 min-w-[120px]">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={h}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          placeholder={`Column ${colIdx + 1}`}
                          className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {headers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(colIdx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            title="Delete Column"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-10 px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={addColumn}
                      className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold transition-colors"
                      title="Add Column"
                    >
                      <Plus size={13} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/50">
                    <td className="w-8 px-2 py-2 text-center text-slate-400 font-mono text-[10px]">
                      {rowIdx + 1}
                    </td>
                    {headers.map((_, colIdx) => (
                      <td key={colIdx} className="px-2 py-1.5 border-r border-slate-100 last:border-r-0">
                        <input
                          type="text"
                          value={row[colIdx] || ''}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          placeholder="Cell value..."
                          className="w-full px-2 py-1 rounded-lg bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                    <td className="w-10 px-2 py-1.5 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(rowIdx)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={addColumn}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Column</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            {headers.length} columns &times; {rows.length} rows
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndInsert}
              className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>Insert Table</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
