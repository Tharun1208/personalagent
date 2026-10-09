import jsPDF from 'jspdf';
import { Goal } from '@/types';

export interface StandaloneNote {
  id: string;
  title: string;
  content: string;
  category?: string;
  goalId?: string;
  goalTitle?: string;
  createdAt: string;
  updatedAt: string;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

const CATEGORY_NAMES: Record<string, string> = {
  career: 'Career & Work',
  health: 'Health & Fitness',
  finance: 'Financial Wealth',
  learning: 'Learning & Skills',
  personal: 'Personal Growth',
  general: 'General Strategy',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function createWordHtmlDoc(title: string, bodyContent: string): Blob {
  const html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${title}</title>
<style>
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1f2937;
    line-height: 1.6;
    padding: 30px;
    background-color: #ffffff;
  }
  h1 {
    color: #1e3a8a;
    font-size: 24pt;
    margin-bottom: 6px;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 8px;
  }
  h2 {
    color: #1e40af;
    font-size: 16pt;
    margin-top: 20px;
    margin-bottom: 6px;
  }
  p.meta {
    color: #6b7280;
    font-size: 10pt;
    font-style: italic;
    margin-bottom: 20px;
  }
  .content {
    font-size: 11pt;
    white-space: pre-wrap;
    line-height: 1.7;
    color: #111827;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
  }
  th, td {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: left;
    font-size: 10pt;
  }
  th {
    background-color: #f3f4f6;
    color: #1e3a8a;
    font-weight: bold;
  }
  .milestone-done {
    color: #059669;
    font-weight: bold;
  }
  .milestone-pending {
    color: #6b7280;
  }
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 25px 0;
  }
</style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

  return new Blob(['\ufeff' + html], {
    type: 'application/msword;charset=utf-8',
  });
}

// ==========================================
// DOCX EXPORT: STANDALONE NOTE
// ==========================================
export async function exportNoteToDocx(note: { title: string; content: string; category?: string; createdAt?: string }): Promise<void> {
  const categoryLabel = CATEGORY_NAMES[note.category || 'general'] || note.category || 'Strategic Note';
  const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  const bodyContent = `
    <h1>${note.title || 'Strategic Note'}</h1>
    <p class="meta">Category: ${categoryLabel} &nbsp;|&nbsp; Date: ${createdDate} &nbsp;|&nbsp; Assistance OS</p>
    <hr/>
    <div class="content">${(note.content || 'Empty note content.').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  `;

  const blob = createWordHtmlDoc(note.title || 'Note', bodyContent);
  downloadBlob(blob, `${sanitizeFilename(note.title || 'Note')}.docx`);
}

// ==========================================
// PDF EXPORT: STANDALONE NOTE
// ==========================================
export function exportNoteToPdf(note: { title: string; content: string; category?: string; createdAt?: string }): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const categoryLabel = CATEGORY_NAMES[note.category || 'general'] || note.category || 'Strategic Note';
  const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleString() : new Date().toLocaleString();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner Bar
  doc.setFillColor(78, 130, 238);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  const titleLines = doc.splitTextToSize(note.title || 'Strategic Note', pageWidth - 30);
  doc.text(titleLines, 15, y);
  y += titleLines.length * 7 + 2;

  // Meta Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Category: ${categoryLabel}  |  Created: ${createdDate}`, 15, y);
  y += 6;

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);

  if (note.content && note.content.trim()) {
    const lines = doc.splitTextToSize(note.content, pageWidth - 30);
    for (let i = 0; i < lines.length; i++) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines[i], 15, y);
      y += 5.5;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No content in this note.', 15, y);
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Exported from Assistance OS  *  ${new Date().toLocaleDateString()}`, 15, 290);

  doc.save(`${sanitizeFilename(note.title || 'Note')}.pdf`);
}

// ==========================================
// DOCX EXPORT: ALL NOTES BUNDLE
// ==========================================
export async function exportAllNotesToDocx(notes: StandaloneNote[]): Promise<void> {
  const notesHtml = notes.map((note, idx) => {
    const categoryLabel = CATEGORY_NAMES[note.category || 'general'] || note.category || 'Strategic Note';
    const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleDateString() : '';
    return `
      <h2>${idx + 1}. ${note.title || 'Untitled Note'}</h2>
      <p class="meta">Category: ${categoryLabel} &nbsp;|&nbsp; Date: ${createdDate}</p>
      <div class="content">${(note.content || 'Empty note.').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <hr/>
    `;
  }).join('');

  const bodyContent = `
    <h1>Executive Notes & Knowledge Base</h1>
    <p class="meta">Total Notes: ${notes.length} &nbsp;|&nbsp; Generated on ${new Date().toLocaleDateString()} &nbsp;|&nbsp; Assistance OS</p>
    <hr/>
    ${notesHtml}
  `;

  const blob = createWordHtmlDoc('Assistance Notes Portfolio', bodyContent);
  downloadBlob(blob, `Assistance_Notes_Portfolio_${new Date().toISOString().split('T')[0]}.docx`);
}

// ==========================================
// PDF EXPORT: ALL NOTES BUNDLE
// ==========================================
export function exportAllNotesToPdf(notes: StandaloneNote[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner Bar
  doc.setFillColor(78, 130, 238);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  doc.text('Executive Notes & Knowledge Base', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Notes: ${notes.length}  |  Generated on ${new Date().toLocaleString()}`, 15, y);
  y += 10;

  notes.forEach((note, index) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    const categoryLabel = CATEGORY_NAMES[note.category || 'general'] || note.category || 'Strategic Note';
    const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleDateString() : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 58, 138);
    const titleLines = doc.splitTextToSize(`${index + 1}. ${note.title || 'Untitled Note'}`, pageWidth - 30);
    doc.text(titleLines, 15, y);
    y += titleLines.length * 6 + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Category: ${categoryLabel}  |  Date: ${createdDate}`, 15, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    if (note.content && note.content.trim()) {
      const lines = doc.splitTextToSize(note.content, pageWidth - 30);
      for (let i = 0; i < lines.length; i++) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines[i], 15, y);
        y += 5;
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('Empty note content.', 15, y);
      y += 5;
    }

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, pageWidth - 15, y);
    y += 7;
  });

  doc.save(`Assistance_Notes_Portfolio_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ==========================================
// DOCX EXPORT: SINGLE GOAL & STRATEGIC NOTE
// ==========================================
export async function exportGoalToDocx(goal: Goal): Promise<void> {
  const categoryLabel = CATEGORY_NAMES[goal.category] || goal.category || 'Strategic Goal';
  const targetDate = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Ongoing';
  const completedCount = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalCount = goal.milestones?.length || 0;

  const milestonesHtml = (goal.milestones || []).map((m) => `
    <tr>
      <td style="width: 40px; text-align: center;" class="${m.completed ? 'milestone-done' : 'milestone-pending'}">
        ${m.completed ? '✓ Done' : 'Pending'}
      </td>
      <td>${m.title}</td>
    </tr>
  `).join('');

  const bodyContent = `
    <h1>${goal.title}</h1>
    <p class="meta">Category: ${categoryLabel} &nbsp;|&nbsp; Target: ${targetDate} &nbsp;|&nbsp; Status: ${goal.status?.toUpperCase() || 'ACTIVE'}</p>
    <p><strong>Overall Progress:</strong> ${goal.progress || 0}% (${completedCount}/${totalCount} milestones completed)</p>
    ${goal.description ? `<p><strong>Description:</strong> ${goal.description}</p>` : ''}
    <hr/>
    <h2>Key Results & Milestones</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 100px;">Status</th>
          <th>Milestone / Key Deliverable</th>
        </tr>
      </thead>
      <tbody>
        ${milestonesHtml || '<tr><td colspan="2">No milestones added.</td></tr>'}
      </tbody>
    </table>
    ${goal.notes ? `<h2>Strategic Notes & Retrospectives</h2><div class="content">${goal.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
  `;

  const blob = createWordHtmlDoc(goal.title, bodyContent);
  downloadBlob(blob, `${sanitizeFilename(goal.title)}_OKR.docx`);
}

// ==========================================
// PDF EXPORT: SINGLE GOAL & STRATEGIC NOTE
// ==========================================
export function exportGoalToPdf(goal: Goal): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const categoryLabel = CATEGORY_NAMES[goal.category] || goal.category || 'Strategic Goal';
  const targetDate = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Ongoing';
  const completedCount = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalCount = goal.milestones?.length || 0;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner Bar
  doc.setFillColor(78, 130, 238);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  const titleLines = doc.splitTextToSize(goal.title, pageWidth - 30);
  doc.text(titleLines, 15, y);
  y += titleLines.length * 7 + 2;

  // Meta Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Category: ${categoryLabel}  |  Target: ${targetDate}  |  Status: ${goal.status?.toUpperCase() || 'ACTIVE'}  |  Progress: ${goal.progress || 0}%`,
    15,
    y
  );
  y += 6;

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Description
  if (goal.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    const descLines = doc.splitTextToSize(goal.description, pageWidth - 30);
    doc.text(descLines, 15, y);
    y += descLines.length * 5.5 + 4;
  }

  // Milestones Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text(`Key Milestones (${completedCount}/${totalCount})`, 15, y);
  y += 6;

  if (goal.milestones && goal.milestones.length > 0) {
    goal.milestones.forEach((m) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', m.completed ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.setTextColor(m.completed ? 16 : 100, m.completed ? 185 : 116, m.completed ? 129 : 139);
      doc.text(m.completed ? '[✓]' : '[ ]', 18, y);

      doc.setTextColor(30, 41, 59);
      const mLines = doc.splitTextToSize(m.title, pageWidth - 35);
      doc.text(mLines, 26, y);
      y += mLines.length * 5 + 1.5;
    });
  }

  // Notes
  if (goal.notes) {
    y += 4;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text('Strategic Notes & Architecture', 15, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const noteLines = doc.splitTextToSize(goal.notes, pageWidth - 30);
    doc.text(noteLines, 15, y);
    y += noteLines.length * 5 + 4;
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by Assistance OS  *  ${new Date().toLocaleDateString()}`, 15, 290);

  doc.save(`${sanitizeFilename(goal.title)}_OKR.pdf`);
}

// ==========================================
// DOCX EXPORT: ALL GOALS & STRATEGIC OKRS REPORT
// ==========================================
export async function exportAllGoalsToDocx(goals: Goal[]): Promise<void> {
  const goalsHtml = goals.map((goal, idx) => {
    const categoryLabel = CATEGORY_NAMES[goal.category] || goal.category || 'Strategic Goal';
    const completedCount = goal.milestones?.filter((m) => m.completed).length || 0;
    const totalCount = goal.milestones?.length || 0;

    const milestonesHtml = (goal.milestones || []).map((m) => `
      <tr>
        <td style="width: 40px; text-align: center;" class="${m.completed ? 'milestone-done' : 'milestone-pending'}">
          ${m.completed ? '✓' : '—'}
        </td>
        <td>${m.title}</td>
      </tr>
    `).join('');

    return `
      <h2>${idx + 1}. ${goal.title}</h2>
      <p class="meta">Category: ${categoryLabel} &nbsp;|&nbsp; Status: ${goal.status?.toUpperCase() || 'ACTIVE'} &nbsp;|&nbsp; Progress: ${goal.progress || 0}% (${completedCount}/${totalCount} completed)</p>
      ${goal.description ? `<p>${goal.description}</p>` : ''}
      <table>
        ${milestonesHtml || '<tr><td>No milestones listed.</td></tr>'}
      </table>
      ${goal.notes ? `<div class="content">${goal.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
      <hr/>
    `;
  }).join('');

  const bodyContent = `
    <h1>Goals & Strategic OKRs Portfolio Report</h1>
    <p class="meta">Total Objectives: ${goals.length} &nbsp;|&nbsp; Generated on ${new Date().toLocaleDateString()} &nbsp;|&nbsp; Assistance OS</p>
    <hr/>
    ${goalsHtml}
  `;

  const blob = createWordHtmlDoc('Goals and Strategic OKRs Report', bodyContent);
  downloadBlob(blob, `Goals_and_Strategic_OKRs_Report.docx`);
}

// ==========================================
// PDF EXPORT: ALL GOALS & STRATEGIC OKRS REPORT
// ==========================================
export function exportAllGoalsToPdf(goals: Goal[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner Bar
  doc.setFillColor(78, 130, 238);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  doc.text('Goals & Strategic OKRs Portfolio Report', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Objectives: ${goals.length}  |  Generated: ${new Date().toLocaleString()}`, 15, y);
  y += 10;

  goals.forEach((goal, gIdx) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    const categoryLabel = CATEGORY_NAMES[goal.category] || goal.category || 'Strategic Goal';
    const completedCount = goal.milestones?.filter((m) => m.completed).length || 0;
    const totalCount = goal.milestones?.length || 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    const titleLines = doc.splitTextToSize(`${gIdx + 1}. ${goal.title}`, pageWidth - 30);
    doc.text(titleLines, 15, y);
    y += titleLines.length * 5 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Category: ${categoryLabel}  |  Status: ${goal.status?.toUpperCase() || 'ACTIVE'}  |  Progress: ${goal.progress || 0}%  |  Milestones: ${completedCount}/${totalCount}`,
      15,
      y
    );
    y += 5;

    if (goal.milestones && goal.milestones.length > 0) {
      goal.milestones.forEach((m) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        if (m.completed) {
          doc.setTextColor(16, 185, 129);
          doc.setFont('helvetica', 'bold');
          doc.text('[✓]', 18, y);
          doc.setTextColor(100, 116, 139);
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setTextColor(148, 163, 184);
          doc.setFont('helvetica', 'bold');
          doc.text('[ ]', 18, y);
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'normal');
        }
        const mLines = doc.splitTextToSize(m.title, pageWidth - 35);
        doc.text(mLines, 26, y);
        y += mLines.length * 4 + 1.5;
      });
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 2, pageWidth - 15, y + 2);
    y += 7;
  });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by Assistance Strategic OKRs  *  ${new Date().toLocaleString()}`, 15, 290);

  doc.save('Goals_and_Strategic_OKRs_Report.pdf');
}
