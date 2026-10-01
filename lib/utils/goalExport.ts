import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';
import { Goal } from '@/types';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

const CATEGORY_NAMES: Record<string, string> = {
  career: 'Career & Work',
  health: 'Health & Fitness',
  finance: 'Financial Wealth',
  learning: 'Learning & Skills',
  personal: 'Personal Growth',
};

// ==========================================
// DOCX EXPORT: SINGLE GOAL & STRATEGIC NOTE
// ==========================================
export async function exportGoalToDocx(goal: Goal): Promise<void> {
  const categoryLabel = CATEGORY_NAMES[goal.category] || goal.category || 'Strategic Goal';
  const completedCount = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalCount = goal.milestones?.length || 0;

  const milestoneRows = (goal.milestones || []).map(
    (m, idx) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: m.completed ? ' COMPLETED ' : ' PENDING ',
                    bold: true,
                    color: m.completed ? '10B981' : '6B7280',
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 90, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${idx + 1}. ${m.title}`,
                    strike: m.completed,
                    color: m.completed ? '6B7280' : '111827',
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: goal.title,
                bold: true,
                size: 32,
                color: '1E3A8A',
              }),
            ],
          }),

          // Subtitle / Category
          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new TextRun({
                text: `Category: ${categoryLabel}  |  Status: ${goal.status?.toUpperCase() || 'ACTIVE'}  |  Progress: ${goal.progress || 0}%`,
                italics: true,
                color: '4B5563',
                size: 20,
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Target Date: ', bold: true, size: 20 }),
                          new TextRun({
                            text: goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'None',
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Milestones: ', bold: true, size: 20 }),
                          new TextRun({
                            text: `${completedCount} of ${totalCount} done`,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Created: ', bold: true, size: 20 }),
                          new TextRun({
                            text: new Date(goal.createdAt).toLocaleDateString(),
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Objective Overview / Description
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: 'Objective Description & Intent',
                bold: true,
                size: 24,
                color: '1E3A8A',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: goal.description || 'No description provided.',
                size: 22,
                color: '374151',
              }),
            ],
          }),

          // Key Milestones
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: 'Key Results & Milestones',
                bold: true,
                size: 24,
                color: '1E3A8A',
              }),
            ],
          }),
          ...(milestoneRows.length > 0
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: milestoneRows,
                }),
              ]
            : [
                new Paragraph({
                  children: [new TextRun({ text: 'No milestones defined.', italics: true, size: 20 })],
                }),
              ]),

          // Strategic Notes & Action Plan
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: 'Strategic Notes, Reflections & Action Plan',
                bold: true,
                size: 24,
                color: '1E3A8A',
              }),
            ],
          }),
          ...(goal.notes && goal.notes.trim().length > 0
            ? goal.notes.split('\n').map(
                (line) =>
                  new Paragraph({
                    spacing: { after: 100 },
                    children: [
                      new TextRun({
                        text: line || ' ',
                        size: 22,
                        color: '1F2937',
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'No strategic notes saved yet.',
                      italics: true,
                      size: 20,
                      color: '9CA3AF',
                    }),
                  ],
                }),
              ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${sanitizeFilename(goal.title)}_Goal_Notes.docx`);
}

// ==========================================
// PDF EXPORT: SINGLE GOAL & STRATEGIC NOTE
// ==========================================
export function exportGoalToPdf(goal: Goal): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const categoryLabel = CATEGORY_NAMES[goal.category] || goal.category || 'Strategic Goal';
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner Bar
  doc.setFillColor(78, 130, 238); // Primary Blue
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  const titleLines = doc.splitTextToSize(goal.title, pageWidth - 30);
  doc.text(titleLines, 15, y);
  y += titleLines.length * 7 + 3;

  // Category & Meta Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Category: ${categoryLabel}  |  Status: ${goal.status?.toUpperCase() || 'ACTIVE'}  |  Progress: ${goal.progress || 0}%`,
    15,
    y
  );
  y += 7;

  // Progress Bar
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, pageWidth - 30, 4, 1.5, 1.5, 'FD');
  if ((goal.progress || 0) > 0) {
    doc.setFillColor(78, 130, 238);
    const fillWidth = Math.max(2, ((pageWidth - 30) * (goal.progress || 0)) / 100);
    doc.roundedRect(15, y, fillWidth, 4, 1.5, 1.5, 'F');
  }
  y += 9;

  // Key Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, pageWidth - 30, 14, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const targetDateStr = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not specified';
  const createdDateStr = new Date(goal.createdAt).toLocaleDateString();
  const completedM = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalM = goal.milestones?.length || 0;

  doc.setFont('helvetica', 'bold');
  doc.text('Target Due Date:', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(targetDateStr, 48, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Milestones Done:', 85, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${completedM} / ${totalM}`, 115, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Created On:', 140, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(createdDateStr, 162, y + 6);
  y += 20;

  // Section: Description
  if (goal.description) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text('Objective Intent & Description', 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(goal.description, pageWidth - 30);
    doc.text(descLines, 15, y);
    y += descLines.length * 5 + 6;
  }

  // Section: Milestones
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text('Key Milestones & Results', 15, y);
  y += 5;

  if (goal.milestones && goal.milestones.length > 0) {
    doc.setFontSize(9.5);
    goal.milestones.forEach((m, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      if (m.completed) {
        doc.setTextColor(16, 185, 129); // Emerald
        doc.setFont('helvetica', 'bold');
        doc.text('[DONE]', 16, y);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
      } else {
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'bold');
        doc.text('[TODO]', 16, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
      }
      const mLines = doc.splitTextToSize(`${idx + 1}. ${m.title}`, pageWidth - 48);
      doc.text(mLines, 32, y);
      y += mLines.length * 4.5 + 2;
    });
    y += 4;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No milestones added for this objective.', 16, y);
    y += 8;
  }

  // Section: Strategic Notes
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text('Strategic Notes, Reflections & Action Plan', 15, y);
  y += 5;

  if (goal.notes && goal.notes.trim().length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const noteLines = doc.splitTextToSize(goal.notes, pageWidth - 30);
    
    // Page break handling for notes
    for (let i = 0; i < noteLines.length; i++) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(noteLines[i], 15, y);
      y += 5;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No notes written yet. You can add notes directly in Recall AI.', 15, y);
  }

  // Footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by Recall AI Strategic OKRs  *  ${new Date().toLocaleString()}`, 15, 290);

  doc.save(`${sanitizeFilename(goal.title)}_Goal_Notes.pdf`);
}

// ==========================================
// DOCX EXPORT: ALL GOALS & STRATEGIC OKRS REPORT
// ==========================================
export async function exportAllGoalsToDocx(goals: Goal[]): Promise<void> {
  const children: any[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'Goals & Strategic OKRs Executive Report',
          bold: true,
          size: 36,
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 100, after: 300 },
      children: [
        new TextRun({
          text: `Total Objectives: ${goals.length}  |  Export Date: ${new Date().toLocaleDateString()}`,
          italics: true,
          color: '6B7280',
          size: 20,
        }),
      ],
    }),
  ];

  goals.forEach((goal, gIdx) => {
    const categoryLabel = CATEGORY_NAMES[goal.category] || goal.category || 'Strategic Goal';
    const completedCount = goal.milestones?.filter((m) => m.completed).length || 0;
    const totalCount = goal.milestones?.length || 0;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: `${gIdx + 1}. ${goal.title}`,
            bold: true,
            size: 26,
            color: '1E3A8A',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: `Category: ${categoryLabel}  |  Status: ${goal.status?.toUpperCase() || 'ACTIVE'}  |  Progress: ${goal.progress || 0}%  |  Milestones: ${completedCount}/${totalCount}`,
            bold: true,
            color: '4B5563',
            size: 19,
          }),
        ],
      })
    );

    if (goal.description) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: 'Description: ', bold: true, size: 20 }),
            new TextRun({ text: goal.description, size: 20, color: '374151' }),
          ],
        })
      );
    }

    if (goal.milestones && goal.milestones.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 50 },
          children: [new TextRun({ text: 'Milestones:', bold: true, size: 20 })],
        })
      );
      goal.milestones.forEach((m, mIdx) => {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: m.completed ? '  [✓] ' : '  [ ] ',
                bold: true,
                color: m.completed ? '10B981' : '6B7280',
                size: 18,
              }),
              new TextRun({
                text: `${m.title}`,
                strike: m.completed,
                color: m.completed ? '6B7280' : '111827',
                size: 19,
              }),
            ],
          })
        );
      });
    }

    if (goal.notes && goal.notes.trim()) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 50 },
          children: [new TextRun({ text: 'Strategic Notes:', bold: true, size: 20, color: '1E3A8A' })],
        }),
        ...goal.notes.split('\n').map(
          (line) =>
            new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({ text: `  ${line}`, size: 20, color: '1F2937' })],
            })
        )
      );
    }

    children.push(
      new Paragraph({
        spacing: { before: 150, after: 200 },
        children: [new TextRun({ text: '--------------------------------------------------', color: 'D1D5DB' })],
      })
    );
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
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

    // Goal Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);

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

    if (goal.description) {
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const descLines = doc.splitTextToSize(`Intent: ${goal.description}`, pageWidth - 30);
      doc.text(descLines, 15, y);
      y += descLines.length * 4.5 + 2;
    }

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

    if (goal.notes && goal.notes.trim()) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 58, 138);
      doc.text('Strategic Notes:', 15, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const noteLines = doc.splitTextToSize(goal.notes, pageWidth - 30);
      for (let i = 0; i < noteLines.length; i++) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(noteLines[i], 15, y);
        y += 4.5;
      }
    }

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 2, pageWidth - 15, y + 2);
    y += 7;
  });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by Recall AI Strategic OKRs  *  ${new Date().toLocaleString()}`, 15, 290);

  doc.save('Goals_and_Strategic_OKRs_Report.pdf');
}

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
