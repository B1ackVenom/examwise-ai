import { ImportantQuestion, PracticePaper } from '../types';

/**
 * Trigger browser file download from Blob content
 */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print HTML content in a clean dedicated iframe
 */
export function printHtmlContent(title: string, bodyHtml: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    alert('Please allow popups for ExamWise to generate printable PDF view.');
    return;
  }

  const fullDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20mm; font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      @page { size: A4; margin: 15mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #1e293b;
      line-height: 1.5;
      background: #f8fafc;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: #fff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .header h1 {
      margin: 0 0 5px 0;
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header h2 {
      margin: 0 0 5px 0;
      font-size: 14pt;
      font-weight: 600;
      color: #334155;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10.5pt;
    }
    .meta-table td {
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
    }
    .instructions {
      background: #f1f5f9;
      border-left: 4px solid #2563eb;
      padding: 10px 15px;
      margin-bottom: 25px;
      font-size: 9.5pt;
    }
    .question-card {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px dashed #cbd5e1;
    }
    .q-header {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 11pt;
      margin-bottom: 8px;
    }
    .q-text {
      font-size: 10.5pt;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    .q-points {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 15px;
      margin-top: 8px;
      font-size: 9.5pt;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 8.5pt;
      font-weight: 600;
      background: #e2e8f0;
    }
    .print-actions {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 100;
    }
    .btn-print {
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(37,99,235,0.3);
    }
    .btn-close {
      background: #64748b;
      color: white;
      border: none;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="print-actions no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>
  <div class="container">
    ${bodyHtml}
  </div>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(fullDoc);
  printWindow.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// High-Yield Important Questions Exporters
// ─────────────────────────────────────────────────────────────────────────────

export function exportQuestionsToDoc(questions: ImportantQuestion[], subjectTitle: string = 'Engineering Curriculum') {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>ExamWise High-Yield Important Questions</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.4; }
    h1 { font-size: 18pt; text-align: center; color: #1e3a8a; margin-bottom: 2px; }
    h2 { font-size: 13pt; text-align: center; color: #475569; margin-top: 0; }
    .date { text-align: right; font-size: 9pt; color: #64748b; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
    th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10pt; }
    td { border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; vertical-align: top; }
    .q-title { font-weight: bold; color: #0f172a; }
    .q-marks { font-weight: bold; color: #1e3a8a; }
    .answer-box { background: #f8fafc; border-left: 3px solid #2563eb; padding: 6px 10px; margin-top: 6px; font-size: 9.5pt; }
  </style>
</head>
<body>
  <h1>EXAMWISE AI · HIGH-YIELD QUESTIONS BLUEPRINT</h1>
  <h2>${subjectTitle}</h2>
  <div class="date">Generated on: ${dateStr} | Total Questions: ${questions.length}</div>
  <hr/>

  ${questions
    .map(
      (q, idx) => `
    <div style="margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
      <p style="margin: 0 0 6px 0;">
        <span class="q-title">Q${idx + 1}. ${q.question}</span>
        <span class="q-marks" style="float: right;">[${q.marks} Marks]</span>
      </p>
      <p style="margin: 0 0 4px 0; font-size: 9.5pt; color: #475569;">
        <strong>Taxonomy:</strong> ${q.bloomsTaxonomy} | 
        <strong>Difficulty:</strong> ${q.difficulty.toUpperCase()} | 
        <strong>Importance:</strong> ${q.importanceRating} (${q.frequencyScore}/5 Frequency)
      </p>
      ${
        q.expectedKeyPoints && q.expectedKeyPoints.length > 0
          ? `<div style="font-size: 9.5pt; margin-top: 4px;"><strong>Expected Marking Points:</strong>
              <ul>${q.expectedKeyPoints.map((pt) => `<li>${pt}</li>`).join('')}</ul>
             </div>`
          : ''
      }
      ${
        q.modelAnswer
          ? `<div class="answer-box"><strong>Model Answer / Solution Guidance:</strong><br/>${q.modelAnswer}</div>`
          : ''
      }
    </div>
  `
    )
    .join('')}
</body>
</html>
`;

  downloadFile(
    `ExamWise_Important_Questions_${new Date().toISOString().split('T')[0]}.doc`,
    docHtml,
    'application/msword'
  );
}

export function exportQuestionsToMarkdown(questions: ImportantQuestion[], subjectTitle: string = 'Engineering Curriculum') {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  let md = `# ExamWise AI · High-Yield Important Questions\n`;
  md += `**Subject:** ${subjectTitle}  \n`;
  md += `**Generated Date:** ${dateStr}  \n`;
  md += `**Total Questions:** ${questions.length}\n\n`;
  md += `---\n\n`;

  questions.forEach((q, idx) => {
    md += `### Q${idx + 1}. ${q.question} [${q.marks} Marks]\n\n`;
    md += `- **Bloom's Taxonomy:** ${q.bloomsTaxonomy}\n`;
    md += `- **Difficulty:** ${q.difficulty.toUpperCase()}\n`;
    md += `- **Importance Rating:** ${q.importanceRating} (${q.frequencyScore}/5 Frequency)\n`;
    if (q.sourceResources && q.sourceResources.length > 0) {
      md += `- **Source Alignment:** ${q.sourceResources.join(', ')}\n`;
    }
    md += `\n`;

    if (q.expectedKeyPoints && q.expectedKeyPoints.length > 0) {
      md += `**Key Points for Full Marks:**\n`;
      q.expectedKeyPoints.forEach((pt) => {
        md += `- ${pt}\n`;
      });
      md += `\n`;
    }

    if (q.modelAnswer) {
      md += `**Model Answer / Conceptual Derivation:**\n> ${q.modelAnswer.replace(/\n/g, '\n> ')}\n\n`;
    }

    md += `---\n\n`;
  });

  downloadFile(
    `ExamWise_Important_Questions_${new Date().toISOString().split('T')[0]}.md`,
    md,
    'text/markdown;charset=utf-8;'
  );
}

export function exportQuestionsToPdf(questions: ImportantQuestion[], subjectTitle: string = 'Engineering Curriculum') {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const bodyHtml = `
    <div class="header">
      <h1>ExamWise AI · Examination Blueprint</h1>
      <h2>High-Yield & Frequently Tested Questions</h2>
      <div style="font-size: 11pt; color: #475569; margin-top: 6px;">
        <strong>Subject:</strong> ${subjectTitle} · <strong>Questions:</strong> ${questions.length} · <strong>Date:</strong> ${dateStr}
      </div>
    </div>

    <div class="instructions">
      <strong>INSTRUCTIONS FOR CANDIDATES:</strong>
      <ol style="margin: 5px 0 0 18px; padding: 0;">
        <li>Questions are synthesized from DYPIU university past examination patterns and syllabus blueprints.</li>
        <li>Review key marking points and Bloom's taxonomy levels to prepare comprehensive answers.</li>
      </ol>
    </div>

    ${questions
      .map(
        (q, idx) => `
      <div class="question-card">
        <div class="q-header">
          <span>Q${idx + 1}. ${q.question}</span>
          <span style="color: #2563eb; white-space: nowrap; margin-left: 12px;">[${q.marks} Marks]</span>
        </div>
        <div style="margin-bottom: 6px;">
          <span class="badge" style="background: #eff6ff; color: #1e40af;">${q.bloomsTaxonomy}</span>
          <span class="badge" style="background: #f1f5f9; color: #334155;">Difficulty: ${q.difficulty}</span>
          <span class="badge" style="background: #fef2f2; color: #991b1b;">Freq: ${q.frequencyScore}/5</span>
        </div>
        ${
          q.expectedKeyPoints && q.expectedKeyPoints.length > 0
            ? `<div class="q-points">
                <strong>Essential Evaluation Breakdown:</strong>
                <ul style="margin: 4px 0 0 16px; padding: 0;">
                  ${q.expectedKeyPoints.map((pt) => `<li>${pt}</li>`).join('')}
                </ul>
               </div>`
            : ''
        }
        ${
          q.modelAnswer
            ? `<div style="margin-top: 8px; font-size: 9.5pt; color: #334155;">
                <strong>Solution Blueprint:</strong> ${q.modelAnswer}
               </div>`
            : ''
        }
      </div>
    `
      )
      .join('')}
  `;

  printHtmlContent(`ExamWise_Questions_${subjectTitle}`, bodyHtml);
}

// ─────────────────────────────────────────────────────────────────────────────
// Practice Exam Papers Exporters (Standard University Paper Format)
// ─────────────────────────────────────────────────────────────────────────────

export function exportPracticePaperToDoc(paper: PracticePaper, courseTitle?: string) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${paper.title}</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; line-height: 1.4; }
    .uni-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
    .uni-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; }
    .exam-name { font-size: 13pt; font-weight: bold; margin-top: 4px; }
    .course-title { font-size: 11pt; font-style: italic; }
    table.meta { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    table.meta td { padding: 4px; border: 1px solid #000; font-size: 10pt; }
    .instructions { font-size: 9.5pt; margin-bottom: 20px; font-style: italic; }
    .q-row { margin-bottom: 14px; }
    .q-num { font-weight: bold; display: inline-block; width: 35px; }
    .q-text { font-size: 11pt; }
    .q-marks { float: right; font-weight: bold; }
  </style>
</head>
<body>
  <div class="uni-header">
    <div class="uni-name">D. Y. PATIL INTERNATIONAL UNIVERSITY, AKURDI, PUNE</div>
    <div class="exam-name">${paper.title.toUpperCase()}</div>
    <div class="course-title">${courseTitle || 'School of Computer Science & Engineering'}</div>
  </div>

  <table class="meta">
    <tr>
      <td><strong>Course Code:</strong> ${paper.courseId.replace('crs-', '').toUpperCase()}</td>
      <td><strong>Total Duration:</strong> ${paper.durationMinutes} Minutes</td>
    </tr>
    <tr>
      <td><strong>Date:</strong> ${dateStr}</td>
      <td><strong>Maximum Marks:</strong> ${paper.totalMarks} Marks</td>
    </tr>
  </table>

  <div class="instructions">
    <strong>Instructions to Candidates:</strong><br/>
    1. All questions are compulsory. Follow module-wise sequence.<br/>
    2. Figures to the right indicate full marks.<br/>
    3. Assume suitable data wherever necessary and state it clearly.
  </div>

  <hr style="border: 0.5px solid #000; margin-bottom: 20px;"/>

  ${paper.questions
    .map(
      (q, idx) => `
    <div class="q-row">
      <span class="q-marks">[${q.marks} Marks]</span>
      <span class="q-num">Q.${q.questionNumber || idx + 1}</span>
      <span class="q-text">${q.questionText}</span>
    </div>
  `
    )
    .join('')}
</body>
</html>
`;

  downloadFile(
    `${paper.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`,
    docHtml,
    'application/msword'
  );
}

export function exportPracticePaperToMarkdown(paper: PracticePaper, courseTitle?: string) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  let md = `# D. Y. Patil International University\n`;
  md += `## ${paper.title}\n\n`;
  md += `| Specification | Detail |\n`;
  md += `|---|---|\n`;
  md += `| **Course** | ${courseTitle || paper.courseId} |\n`;
  md += `| **Duration** | ${paper.durationMinutes} Minutes |\n`;
  md += `| **Maximum Marks** | ${paper.totalMarks} Marks |\n`;
  md += `| **Date** | ${dateStr} |\n\n`;
  md += `### Instructions to Candidates\n`;
  md += `1. All questions are compulsory.\n`;
  md += `2. Figures to the right indicate full marks.\n`;
  md += `3. Assume suitable data if necessary.\n\n`;
  md += `---\n\n`;

  paper.questions.forEach((q, idx) => {
    md += `**Q${q.questionNumber || idx + 1}.** ${q.questionText}  \n`;
    md += `*Marks:* **${q.marks} Marks**\n\n`;
    if (q.correctAnswer) {
      md += `> **Model Answer Guidance:**  \n> ${String(q.correctAnswer).replace(/\n/g, '\n> ')}\n\n`;
    }
  });

  downloadFile(
    `${paper.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`,
    md,
    'text/markdown;charset=utf-8;'
  );
}

export function exportPracticePaperToPdf(paper: PracticePaper, courseTitle?: string) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const bodyHtml = `
    <div class="header">
      <div style="font-size: 11pt; letter-spacing: 1px; color: #475569; font-weight: 700; margin-bottom: 4px;">
        D. Y. PATIL INTERNATIONAL UNIVERSITY, AKURDI, PUNE
      </div>
      <h1>${paper.title}</h1>
      <h2>${courseTitle || 'Department of Computer Science & Engineering'}</h2>
    </div>

    <table class="meta-table">
      <tr>
        <td style="width: 50%;"><strong>Course Code:</strong> ${paper.courseId.replace('crs-', '').toUpperCase()}</td>
        <td style="width: 50%;"><strong>Duration:</strong> ${paper.durationMinutes} Minutes</td>
      </tr>
      <tr>
        <td><strong>Date of Exam:</strong> ${dateStr}</td>
        <td><strong>Maximum Marks:</strong> ${paper.totalMarks} Marks</td>
      </tr>
    </table>

    <div class="instructions">
      <strong>INSTRUCTIONS TO CANDIDATES:</strong>
      <ol style="margin: 4px 0 0 16px; padding: 0;">
        <li>Answer all questions according to module instructions.</li>
        <li>Figures to the right indicate maximum allotted marks.</li>
        <li>Draw neat architectural/flow diagrams wherever applicable.</li>
      </ol>
    </div>

    <div style="margin-top: 25px;">
      ${paper.questions
        .map(
          (q, idx) => `
        <div class="question-card" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
          <div class="q-header" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
            <span><strong>Q.${q.questionNumber || idx + 1}</strong> ${q.questionText}</span>
            <span style="font-weight: 800; color: #1e3a8a; white-space: nowrap; margin-left: 14px;">[${q.marks} Marks]</span>
          </div>
          ${
            q.explanation
              ? `<div style="font-size: 9.5pt; color: #64748b; margin-top: 4px; font-style: italic;">
                  Marking Scheme: ${q.explanation}
                 </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
  `;

  printHtmlContent(`${paper.title}`, bodyHtml);
}
