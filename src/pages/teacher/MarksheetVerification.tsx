import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { MarksheetBatch, MarksheetRecord } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useRole } from '../../context/RoleContext';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  Check,
  Info,
} from 'lucide-react';

export const MarksheetVerification: React.FC = () => {
  const { user } = useRole();
  const { success, info } = useToast();

  const [batches, setBatches] = useState<MarksheetBatch[]>(() =>
    apiClient.getMarksheetBatches()
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    batches[0]?.id || ''
  );
  const [examNameInput, setExamNameInput] = useState('');
  const [semesterInput, setSemesterInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMismatchOnly, setFilterMismatchOnly] = useState(false);

  // In-line editing state for a cell
  const [editingCell, setEditingCell] = useState<{
    recordId: string;
    field: 'subject' | 'total';
    subjectIndex?: number;
  } | null>(null);

  const [editValue, setEditValue] = useState<number>(0);

  const currentBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  const filteredRecords = currentBatch
    ? currentBatch.records.filter((rec) => {
        const matchesFilter = !filterMismatchOnly || !rec.arithmeticValid;
        const matchesSearch =
          rec.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.studentRoll.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      })
    : [];

  const handleUpload = (file: { name: string }) => {
    const newBatch = apiClient.uploadMarksheetBatch(
      file.name,
      examNameInput.trim() || file.name.replace(/\.[^/.]+$/, ''),
      semesterInput.trim()
    );
    setBatches(apiClient.getMarksheetBatches());
    setSelectedBatchId(newBatch.id);
    success(`Marksheet batch "${file.name}" queued for backend extraction.`);
  };

  const handleStartEdit = (
    rec: MarksheetRecord,
    field: 'subject' | 'total',
    subjectIndex?: number
  ) => {
    setEditingCell({ recordId: rec.id, field, subjectIndex });
    if (field === 'subject' && subjectIndex !== undefined) {
      setEditValue(rec.subjectMarks[subjectIndex]?.obtained ?? 0);
    } else {
      setEditValue(rec.extractedTotal);
    }
  };

  const handleSaveEdit = (recordId: string) => {
    if (!currentBatch || !editingCell) return;

    if (editingCell.field === 'subject' && editingCell.subjectIndex !== undefined) {
      apiClient.updateMarksheetRecord(
        currentBatch.id,
        recordId,
        editingCell.subjectIndex,
        Number(editValue)
      );
    } else if (editingCell.field === 'total') {
      apiClient.updateExtractedTotal(currentBatch.id, recordId, Number(editValue));
    }

    setBatches(apiClient.getMarksheetBatches());
    setEditingCell(null);
    success('Marksheet cell updated. Arithmetic re-verified.');
  };

  const handleVerifyRecord = (recordId: string) => {
    if (!currentBatch) return;
    apiClient.verifyMarksheetRecord(currentBatch.id, recordId, user?.name || 'Faculty');
    setBatches(apiClient.getMarksheetBatches());
    success('Record verified and signed by instructor.');
  };

  const handleExportCsv = () => {
    if (!currentBatch) {
      info('Upload or select a marksheet batch first.');
      return;
    }
    const csvContent = apiClient.exportMarksheetCsv(currentBatch.id);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentBatch.fileName.replace(/\.[^/.]+$/, '')}_verified.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Exported verified marksheet batch to CSV.`);
  };

  const subjectHeaders = currentBatch?.records[0]?.subjectMarks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Marksheet Extraction & Arithmetic Verification
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Extract pre-awarded marks from official marksheet sheets, validate column arithmetic, and resolve OCR discrepancies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={!currentBatch}
            className="px-3.5 py-2 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Verified CSV</span>
          </button>
        </div>
      </div>

      {/* Critical Distinction Notice Banner */}
      <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>Workflow Boundary:</strong> This interface is specifically designed for extracting already-awarded numerical scores from official marksheets and performing automated column sums to detect mathematical arithmetic errors. To grade handwritten descriptive answers from scanned answer booklets, use the{' '}
          <Link to="/teacher/evaluation" className="underline font-semibold hover:text-[hsl(var(--accent-text))]">
            Answer-Sheet Evaluation Workbench
          </Link>.
        </div>
      </div>

      {/* Upload & Batch Selector Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone (1 col) */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[hsl(var(--accent-text))]" />
            <h2 className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Upload Scanned Marksheet Document
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                Exam Label
              </label>
              <input
                type="text"
                value={examNameInput}
                onChange={(e) => setExamNameInput(e.target.value)}
                className="w-full mt-1 p-1.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                Semester / Term
              </label>
              <input
                type="text"
                value={semesterInput}
                onChange={(e) => setSemesterInput(e.target.value)}
                className="w-full mt-1 p-1.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          </div>

          <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[hsl(var(--border))] rounded-xl cursor-pointer hover:border-[hsl(var(--primary))] transition-colors bg-[hsl(var(--secondary)/0.4)]">
            <FileSpreadsheet className="w-6 h-6 text-[hsl(var(--muted-foreground))] mb-1" />
            <span className="text-xs font-medium text-[hsl(var(--foreground))]">
              Choose Marksheet Document
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              PDF, PNG, or JPG supported
            </span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>

        {/* Batch Summary Metric (2 cols) */}
        {currentBatch ? (
          <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[hsl(var(--accent-text))] font-bold">
                  Batch: {currentBatch.id}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Uploaded {currentBatch.uploadedAt}</span>
              </div>
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
                {currentBatch.fileName}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {[currentBatch.examName, currentBatch.semester].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[hsl(var(--border))] text-xs">
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Extracted Rows:</span>
                <div className="font-mono font-bold text-[hsl(var(--foreground))] text-base">
                  {currentBatch.records.length}
                </div>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Arithmetic Valid:</span>
                <div className="font-mono font-bold text-teal-600 dark:text-teal-400 text-base">
                  {currentBatch.validRows} Records
                </div>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Flagged Mismatches:</span>
                <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-base">
                  {currentBatch.flaggedRows} Record(s)
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-1.5">
            <FileSpreadsheet className="w-7 h-7 text-[hsl(var(--muted-foreground))]" />
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              No marksheet batch uploaded yet
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-sm">
              Upload a marksheet document on the left to queue tabular extraction and arithmetic validation.
            </p>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            aria-label="Search student marksheet records"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
          />
        </div>

        <button
          onClick={() => setFilterMismatchOnly(!filterMismatchOnly)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors self-start sm:self-auto ${
            filterMismatchOnly
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'
              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Show Discrepancies Only ({currentBatch?.flaggedRows || 0})</span>
        </button>
      </div>

      {/* Marksheet Verification Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span>Student Mark Records</span>
          <span>Click any cell to edit extracted score and recalculate arithmetic sum</span>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium bg-[hsl(var(--secondary)/0.5)]">
                <tr>
                  <th className="p-3.5">Roll No.</th>
                  <th className="p-3.5">Student Name</th>
                  {subjectHeaders.map((sub, i) => (
                    <th key={i} className="p-3.5 text-center">
                      {sub.subjectName} ({sub.max})
                    </th>
                  ))}
                  <th className="p-3.5 text-center">Extracted Total</th>
                  <th className="p-3.5 text-center">Calculated Sum</th>
                  <th className="p-3.5 text-center">Validation Status</th>
                  <th className="p-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredRecords.map((rec) => {
                  const isMismatch = !rec.arithmeticValid;
                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors ${
                        isMismatch
                          ? 'bg-rose-500/5 hover:bg-rose-500/10'
                          : 'hover:bg-[hsl(var(--secondary)/0.4)]'
                      }`}
                    >
                      <td className="p-3.5 font-mono font-medium text-[hsl(var(--foreground))]">
                        {rec.studentRoll}
                      </td>

                      <td className="p-3.5 font-medium text-[hsl(var(--foreground))]">
                        <div>{rec.studentName}</div>
                        {isMismatch && rec.warnings[0] && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 max-w-xs">
                            {rec.warnings[0]}
                          </div>
                        )}
                      </td>

                      {rec.subjectMarks.map((subMark, subIdx) => (
                        <td key={subIdx} className="p-3.5 text-center">
                          {editingCell?.recordId === rec.id &&
                          editingCell?.field === 'subject' &&
                          editingCell?.subjectIndex === subIdx ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(Number(e.target.value))}
                                className="w-14 p-1 bg-[hsl(var(--card))] border border-[hsl(var(--ring))] rounded text-center font-mono text-[hsl(var(--foreground))]"
                              />
                              <button
                                onClick={() => handleSaveEdit(rec.id)}
                                className="p-1 text-teal-600 hover:text-teal-700"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(rec, 'subject', subIdx)}
                              className="font-mono text-[hsl(var(--foreground))] hover:text-[hsl(var(--accent-text))] hover:underline cursor-pointer"
                              title="Click to edit"
                            >
                              {subMark.obtained}
                            </button>
                          )}
                        </td>
                      ))}

                      {/* Extracted Total */}
                      <td className="p-3.5 text-center font-mono font-bold tabular-nums">
                        {editingCell?.recordId === rec.id && editingCell?.field === 'total' ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-16 p-1 bg-[hsl(var(--card))] border border-[hsl(var(--ring))] rounded text-center font-mono text-[hsl(var(--foreground))]"
                            />
                            <button
                              onClick={() => handleSaveEdit(rec.id)}
                              className="p-1 text-teal-600 hover:text-teal-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(rec, 'total')}
                            className={`hover:underline cursor-pointer ${
                              isMismatch ? 'text-rose-600 dark:text-rose-400' : 'text-[hsl(var(--foreground))]'
                            }`}
                            title="Click to adjust extracted total"
                          >
                            {rec.extractedTotal}
                          </button>
                        )}
                      </td>

                      {/* Calculated Arithmetic Sum */}
                      <td className="p-3.5 text-center font-mono font-bold tabular-nums text-[hsl(var(--foreground))]">
                        {rec.calculatedTotal}
                      </td>

                      {/* Arithmetic Validation Indicator */}
                      <td className="p-3.5 text-center">
                        {rec.arithmeticValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy
                          </span>
                        )}
                      </td>

                      {/* Manual Verification Action */}
                      <td className="p-3.5 text-right">
                        {rec.status === 'verified' ? (
                          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                            Verified by {rec.verifiedBy || 'Faculty'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVerifyRecord(rec.id)}
                            className="px-2.5 py-1 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded text-xs font-medium transition-colors"
                          >
                            Verify & Sign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-xs text-[hsl(var(--muted-foreground))]">
            {currentBatch
              ? 'No student mark records extracted in this batch yet.'
              : 'Upload a marksheet document above to inspect and verify student records.'}
          </div>
        )}
      </div>
    </div>
  );
};
