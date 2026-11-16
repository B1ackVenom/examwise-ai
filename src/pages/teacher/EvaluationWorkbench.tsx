import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { Submission } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useRole } from '../../context/RoleContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  FileCheck2,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  History,
  ShieldCheck,
  Send,
  Check,
  Sparkles,
} from 'lucide-react';

export const EvaluationWorkbench: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSubId = searchParams.get('submissionId');

  const { user } = useRole();
  const { success, warning, info } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>(() => apiClient.getSubmissions());
  const [selectedSubId, setSelectedSubId] = useState<string | null>(
    requestedSubId || submissions[0]?.id || null
  );

  // Active question inside the selected submission
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number>(1);

  // Scanned page viewer state
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Center panel OCR editing state
  const [isEditingOcr, setIsEditingOcr] = useState<boolean>(false);
  const [editedOcrText, setEditedOcrText] = useState<string>('');

  // Right panel grading state for active question
  const [teacherMarksInput, setTeacherMarksInput] = useState<number>(0);
  const [overrideReasonInput, setOverrideReasonInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});

  // Mobile / Tablet Tab state
  const [activeMobileTab, setActiveMobileTab] = useState<'document' | 'extracted' | 'grading' | 'audit'>('grading');

  // Confirmation modals
  const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Queue filter
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'in_review' | 'approved' | 'published'>('all');
  const [queueSearch, setQueueSearch] = useState<string>('');

  const reviewerName = user?.name || 'Faculty';

  const currentSubmission = useMemo(() => {
    return submissions.find((s) => s.id === selectedSubId) || null;
  }, [submissions, selectedSubId]);

  const currentExam = useMemo(() => {
    return currentSubmission ? apiClient.getExamById(currentSubmission.examId) : undefined;
  }, [currentSubmission]);

  const currentQuestionEval = useMemo(() => {
    if (!currentSubmission) return null;
    return (
      currentSubmission.questionsEvaluation.find(
        (q) => q.questionNumber === activeQuestionNumber
      ) || currentSubmission.questionsEvaluation[0] || null
    );
  }, [currentSubmission, activeQuestionNumber]);

  const currentExamQuestion = useMemo(() => {
    if (!currentExam || !currentQuestionEval) return undefined;
    return currentExam.questions.find((q) => q.questionNumber === currentQuestionEval.questionNumber);
  }, [currentExam, currentQuestionEval]);

  // Sync state whenever active question or submission changes
  React.useEffect(() => {
    if (currentQuestionEval) {
      setTeacherMarksInput(currentQuestionEval.teacherFinalMarks ?? currentQuestionEval.aiProposedMarks);
      setOverrideReasonInput(currentQuestionEval.overrideReason || '');
      setFeedbackInput(currentQuestionEval.feedbackComments || '');
      setEditedOcrText(currentQuestionEval.teacherCorrectedText || currentQuestionEval.ocrExtractedText);
      setCriterionScores(currentQuestionEval.criterionMarks || {});
      setIsEditingOcr(false);
    }
  }, [currentQuestionEval]);

  // Handle saving question evaluation
  const handleSaveQuestionDraft = () => {
    if (!currentSubmission || !currentQuestionEval) return;

    const isDifferentFromAi = teacherMarksInput !== currentQuestionEval.aiProposedMarks;

    if (isDifferentFromAi && !overrideReasonInput.trim()) {
      warning('Please provide an override reason whenever teacher marks differ from the AI proposal.');
      return;
    }

    if (isDifferentFromAi) {
      apiClient.overrideMarks(
        currentSubmission.id,
        currentQuestionEval.questionNumber,
        Number(teacherMarksInput),
        overrideReasonInput,
        reviewerName
      );
    }

    apiClient.updateQuestionEvaluation(currentSubmission.id, currentQuestionEval.questionNumber, {
      teacherFinalMarks: Number(teacherMarksInput),
      feedbackComments: feedbackInput,
      criterionMarks: criterionScores,
      isOverridden: isDifferentFromAi,
      overrideReason: overrideReasonInput,
    });

    setSubmissions(apiClient.getSubmissions());
    success(`Question ${currentQuestionEval.questionNumber} evaluation saved.`);
  };

  const handleMarkQuestionReviewed = () => {
    if (!currentSubmission || !currentQuestionEval) return;
    handleSaveQuestionDraft();
    apiClient.markQuestionReviewed(currentSubmission.id, currentQuestionEval.questionNumber, reviewerName);
    setSubmissions(apiClient.getSubmissions());
    info(`Question ${currentQuestionEval.questionNumber} marked as reviewed.`);

    // Advance to next question if available
    const nextQ = currentSubmission.questionsEvaluation.find(
      (q) => q.questionNumber === activeQuestionNumber + 1
    );
    if (nextQ) {
      setActiveQuestionNumber(nextQ.questionNumber);
    }
  };

  const handleSaveOcrCorrection = () => {
    if (!currentSubmission || !currentQuestionEval) return;
    apiClient.updateOcrText(currentSubmission.id, currentQuestionEval.questionNumber, editedOcrText, reviewerName);
    setSubmissions(apiClient.getSubmissions());
    setIsEditingOcr(false);
    success('OCR text correction logged to audit history.');
  };

  const handleApproveSubmission = () => {
    if (!currentSubmission) return;
    apiClient.approveSubmission(currentSubmission.id, reviewerName);
    setSubmissions(apiClient.getSubmissions());
    success(`Submission for ${currentSubmission.studentName} approved with final score of ${currentSubmission.totalAwardedMarks}/${currentSubmission.totalMaxMarks}.`);
  };

  const handlePublishSubmission = () => {
    if (!currentSubmission) return;
    apiClient.publishSubmission(currentSubmission.id);
    setSubmissions(apiClient.getSubmissions());
    success(`Official examination result released to student portal for ${currentSubmission.studentName}.`);
  };

  // Queue filtered items
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchFilter = queueFilter === 'all' || s.status === queueFilter;
      const matchSearch =
        s.studentName.toLowerCase().includes(queueSearch.toLowerCase()) ||
        s.studentRoll.toLowerCase().includes(queueSearch.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [submissions, queueFilter, queueSearch]);

  const currentPage = currentSubmission?.pages[currentPageIndex];

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Status Ribbon */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            {currentExam?.code && (
              <>
                <span className="font-mono font-bold text-[hsl(var(--accent-text))]">
                  {currentExam.code}
                </span>
                <span className="text-[hsl(var(--muted-foreground))]">·</span>
              </>
            )}
            <span className="text-[hsl(var(--muted-foreground))] font-medium">Evaluation Workbench</span>
            <span className="text-[hsl(var(--muted-foreground))]">·</span>
            <span className="font-mono text-[hsl(var(--foreground))] font-semibold">
              {currentSubmission ? `${currentSubmission.studentName} (${currentSubmission.studentRoll})` : 'Queue'}
            </span>
          </div>
          <h1 className="text-base md:text-lg font-bold text-[hsl(var(--foreground))] font-display">
            {currentExam?.title || 'Answer-Sheet Evaluation Workbench'}
          </h1>
        </div>

        {/* Global Evaluation Workflow Actions */}
        {currentSubmission && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-3 py-1.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <span>Audit Trail ({currentSubmission.auditEvents.length})</span>
            </button>

            <button
              onClick={() => setIsApproveModalOpen(true)}
              disabled={currentSubmission.isTeacherApproved}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentSubmission.isTeacherApproved
                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{currentSubmission.isTeacherApproved ? 'Approved by Faculty' : 'Approve Evaluation'}</span>
            </button>

            <button
              onClick={() => setIsPublishModalOpen(true)}
              disabled={!currentSubmission.isTeacherApproved || currentSubmission.isPublished}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentSubmission.isPublished
                  ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--accent-text))] border border-[hsl(var(--primary)/0.3)]'
                  : currentSubmission.isTeacherApproved
                  ? 'bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-xs'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{currentSubmission.isPublished ? 'Published to Student' : 'Publish Result'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Submission Queue Strip */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[hsl(var(--foreground))]">
              Answer Booklet Queue:
            </span>
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'in_review', 'approved', 'published'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setQueueFilter(st)}
                  className={`px-2 py-0.5 rounded text-[11px] capitalize font-medium transition-colors ${
                    queueFilter === st
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              aria-label="Search submissions by student name or roll number"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>
        </div>

        {/* Queue Items Row */}
        {filteredSubmissions.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            {filteredSubmissions.map((sub) => {
              const isSelected = sub.id === selectedSubId;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubId(sub.id);
                    setActiveQuestionNumber(1);
                    setCurrentPageIndex(0);
                    setSearchParams({ submissionId: sub.id });
                  }}
                  className={`p-2.5 rounded-lg border text-left shrink-0 transition-all ${
                    isSelected
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] ring-1 ring-[hsl(var(--ring))]'
                      : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono font-semibold text-[hsl(var(--foreground))]">
                      {sub.studentRoll}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        sub.status === 'approved'
                          ? 'text-teal-600 dark:text-teal-400'
                          : sub.status === 'published'
                          ? 'text-[hsl(var(--accent-text))]'
                          : sub.status === 'in_review'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">
                    {sub.studentName}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                    <span>OCR: {sub.avgOcrConfidence}%</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums font-semibold text-[hsl(var(--foreground))]">
                      {sub.totalAwardedMarks}/{sub.totalMaxMarks} M
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
            No answer booklet submissions match the current queue filter.
          </div>
        )}
      </div>

      {/* Empty State when no submission selected */}
      {!currentSubmission && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center space-y-2.5">
          <FileCheck2 className="w-9 h-9 mx-auto text-[hsl(var(--muted-foreground))]" />
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            No Answer Booklet Submissions Available
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
            Uploaded handwritten answer booklets from your examinations will appear in the queue above for OCR verification, rubric scoring, and faculty approval.
          </p>
          <div className="pt-2">
            <Link
              to="/teacher/exams"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-medium"
            >
              Manage Examinations
            </Link>
          </div>
        </div>
      )}

      {/* Mobile Tab Selector (Stacked on small screens) */}
      {currentSubmission && currentQuestionEval && (
        <div className="lg:hidden flex items-center gap-1 p-1 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-xs">
          <button
            onClick={() => setActiveMobileTab('document')}
            className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors ${
              activeMobileTab === 'document' ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs' : 'text-[hsl(var(--muted-foreground))]'
            }`}
          >
            Scanned Booklet
          </button>
          <button
            onClick={() => setActiveMobileTab('extracted')}
            className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors ${
              activeMobileTab === 'extracted' ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs' : 'text-[hsl(var(--muted-foreground))]'
            }`}
          >
            Extracted Text
          </button>
          <button
            onClick={() => setActiveMobileTab('grading')}
            className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors ${
              activeMobileTab === 'grading' ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs' : 'text-[hsl(var(--muted-foreground))]'
            }`}
          >
            Grading & Rubric
          </button>
        </div>
      )}

      {/* 3-Panel Main Workbench */}
      {currentSubmission && currentQuestionEval && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* PANEL 1 (Left): Scanned Document Booklet Preview (4 cols on lg) */}
          <div
            className={`lg:col-span-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs flex flex-col h-[750px] ${
              activeMobileTab !== 'document' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Document Controls Top Bar */}
            <div className="p-3 border-b border-[hsl(var(--border))] flex items-center justify-between text-xs bg-[hsl(var(--secondary)/0.5)]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  Scanned Booklet
                </span>
                {currentSubmission.pages.length > 0 && (
                  <span className="font-mono text-[hsl(var(--muted-foreground))] text-[11px]">
                    Pg {currentPageIndex + 1} of {currentSubmission.pages.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(75, prev - 15))}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))] w-10 text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(150, prev + 15))}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Viewport */}
            <div className="flex-1 overflow-auto p-4 bg-[hsl(var(--background))] flex items-center justify-center">
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="w-[320px] sm:w-[380px] min-h-[520px] bg-[#FFFDF9] dark:bg-[hsl(var(--secondary))] border border-amber-900/15 dark:border-[hsl(var(--border))] rounded-lg shadow-lg p-6 text-slate-800 dark:text-[hsl(var(--foreground))] transition-transform font-serif relative"
              >
                <div className="border-b border-amber-900/20 dark:border-[hsl(var(--border))] pb-2 mb-4 flex items-center justify-between text-[10px] text-slate-500 dark:text-[hsl(var(--muted-foreground))] uppercase tracking-widest font-sans">
                  <span className="font-semibold text-slate-600 dark:text-[hsl(var(--muted-foreground))]">
                    {currentExam?.code || 'Answer Sheet'} · {currentSubmission.studentRoll}
                  </span>
                  <span className="font-mono">Page {currentPageIndex + 1}</span>
                </div>

                {currentPage?.imageUrl ? (
                  <img
                    src={currentPage.imageUrl}
                    alt={`Scanned booklet page ${currentPage.pageNumber}`}
                    className="w-full rounded border border-[hsl(var(--border))]"
                  />
                ) : (
                  <div className="space-y-4 text-xs leading-relaxed font-sans">
                    <div className="text-[11px] font-bold text-[hsl(var(--accent-text))] bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.3)] p-1.5 rounded-md inline-block">
                      {currentPage?.label || `Question ${activeQuestionNumber} Region`}
                    </div>
                    <p className="text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap font-mono leading-relaxed">
                      {currentQuestionEval.teacherCorrectedText || currentQuestionEval.ocrExtractedText || 'No scanned page preview attached.'}
                    </p>
                  </div>
                )}

                <div className="pt-4 mt-6 border-t border-slate-200 dark:border-[hsl(var(--border))] flex items-center justify-between text-[10px] text-slate-400 dark:text-[hsl(var(--muted-foreground))] font-sans">
                  <span>Candidate: {currentSubmission.studentRoll}</span>
                  <span className="font-mono text-[hsl(var(--accent-text))] font-semibold">
                    OCR Confidence: {currentQuestionEval.ocrConfidence}%
                  </span>
                </div>
              </div>
            </div>

            {/* Page Thumbnails Ribbon */}
            {currentSubmission.pages.length > 0 && (
              <div className="p-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {currentSubmission.pages.map((p, idx) => {
                    const isPageActive = idx === currentPageIndex;
                    return (
                      <button
                        key={p.pageNumber}
                        onClick={() => setCurrentPageIndex(idx)}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                          isPageActive
                            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                            : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                        }`}
                      >
                        P{p.pageNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPageIndex === 0}
                    onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1 rounded text-[hsl(var(--muted-foreground))] disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPageIndex >= currentSubmission.pages.length - 1}
                    onClick={() =>
                      setCurrentPageIndex((prev) =>
                        Math.min(currentSubmission.pages.length - 1, prev + 1)
                      )
                    }
                    className="p-1 rounded text-[hsl(var(--muted-foreground))] disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PANEL 2 (Center): Extracted Answers & OCR Correction (4 cols on lg) */}
          <div
            className={`lg:col-span-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs flex flex-col h-[750px] ${
              activeMobileTab !== 'extracted' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Question Selector Tabs */}
            <div className="p-3 border-b border-[hsl(var(--border))] flex items-center justify-between text-xs bg-[hsl(var(--secondary)/0.5)]">
              <div className="flex items-center gap-1 overflow-x-auto">
                {currentSubmission.questionsEvaluation.map((q) => {
                  const isActive = q.questionNumber === activeQuestionNumber;
                  return (
                    <button
                      key={q.questionNumber}
                      onClick={() => {
                        setActiveQuestionNumber(q.questionNumber);
                        setIsEditingOcr(false);
                      }}
                      className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold transition-all flex items-center gap-1 ${
                        isActive
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                          : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      <span>Q{q.questionNumber}</span>
                      {q.isReviewed && <Check className="w-3 h-3 text-teal-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))] shrink-0">
                <span>OCR:</span>
                <span className="font-mono font-semibold text-[hsl(var(--foreground))]">
                  {currentQuestionEval.ocrConfidence}%
                </span>
              </div>
            </div>

            {/* Extracted Answer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Question Segmentation & Detection
                  </span>
                  {currentQuestionEval.isOcrEdited && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Teacher-Corrected Text
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] space-y-1">
                  <div className="font-semibold text-[hsl(var(--accent-text))]">
                    Question {currentQuestionEval.questionNumber} (Max: {currentQuestionEval.maxMarks} Marks)
                  </div>
                  {currentExamQuestion?.text && (
                    <p className="leading-relaxed">{currentExamQuestion.text}</p>
                  )}
                </div>
              </div>

              {/* Extracted Answer Text Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))]">
                    {isEditingOcr ? 'Edit OCR Recognized Text:' : 'Detected Student Answer Text:'}
                  </label>
                  {!isEditingOcr ? (
                    <button
                      onClick={() => setIsEditingOcr(true)}
                      className="text-xs text-[hsl(var(--accent-text))] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Correct OCR Errors</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsEditingOcr(false)}
                        className="px-2 py-0.5 text-xs rounded border border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveOcrCorrection}
                        className="px-2.5 py-0.5 text-xs rounded bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium"
                      >
                        Save Correction
                      </button>
                    </div>
                  )}
                </div>

                {isEditingOcr ? (
                  <textarea
                    rows={14}
                    value={editedOcrText}
                    onChange={(e) => setEditedOcrText(e.target.value)}
                    className="w-full p-3 bg-[hsl(var(--card))] border border-[hsl(var(--ring))] rounded-lg text-xs font-mono leading-relaxed text-[hsl(var(--foreground))] focus:outline-hidden"
                  />
                ) : (
                  <div className="p-3.5 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] rounded-lg text-xs leading-relaxed text-[hsl(var(--foreground))] font-mono whitespace-pre-wrap">
                    {currentQuestionEval.teacherCorrectedText || currentQuestionEval.ocrExtractedText}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status bar for Panel 2 */}
            <div className="p-3 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))] flex items-center justify-between bg-[hsl(var(--secondary)/0.5)]">
              <span>Segmented Page: {currentPageIndex + 1}</span>
              <span>OCR Status: Ready</span>
            </div>
          </div>

          {/* PANEL 3 (Right): Grading, Rubric & Teacher Override (4 cols on lg) */}
          <div
            className={`lg:col-span-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs flex flex-col h-[750px] ${
              activeMobileTab !== 'grading' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Header */}
            <div className="p-3 border-b border-[hsl(var(--border))] flex items-center justify-between text-xs bg-[hsl(var(--secondary)/0.5)]">
              <span className="font-semibold text-[hsl(var(--foreground))]">
                Grading & Rubric Criteria
              </span>
              <div className="font-mono text-xs font-semibold tabular-nums text-[hsl(var(--accent-text))]">
                Running Total: {currentSubmission.totalAwardedMarks} / {currentSubmission.totalMaxMarks} M
              </div>
            </div>

            {/* Scrollable Grading Controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* AI Proposed Mark Notice Card */}
              <div className="p-3.5 rounded-lg bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.25)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--accent-text))]" />
                    AI-Proposed Grade (Suggestion Only)
                  </span>
                  <span className="font-mono font-bold text-sm text-[hsl(var(--accent-text))] tabular-nums">
                    {currentQuestionEval.aiProposedMarks} / {currentQuestionEval.maxMarks} M
                  </span>
                </div>
                {currentQuestionEval.aiExplanation && (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {currentQuestionEval.aiExplanation}
                  </p>
                )}
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] pt-1">
                  *AI proposals do not become final published marks without instructor confirmation.
                </div>
              </div>

              {/* Step-wise Rubric Criteria Allocation */}
              {Object.keys(currentQuestionEval.criterionMarks).length > 0 && (
                <div className="space-y-2.5">
                  <div className="font-semibold text-[hsl(var(--foreground))] flex items-center justify-between">
                    <span>Rubric Scoring Breakdown:</span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-normal">Award partial marks</span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(currentQuestionEval.criterionMarks).map(([critId, score]) => {
                      const rubricMeta = currentExamQuestion?.rubric.find((r) => r.id === critId);
                      return (
                        <div
                          key={critId}
                          className="p-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="font-medium text-[hsl(var(--foreground))]">
                              {rubricMeta?.name || critId}
                            </div>
                            {rubricMeta?.partialCreditRule && (
                              <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                                {rubricMeta.partialCreditRule}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={rubricMeta?.maxMarks ?? currentQuestionEval.maxMarks}
                              value={criterionScores[critId] ?? score}
                              onChange={(e) => {
                                const newScores = {
                                  ...criterionScores,
                                  [critId]: Number(e.target.value),
                                };
                                setCriterionScores(newScores);
                                const sum = Object.values(newScores).reduce((a, b) => a + b, 0);
                                setTeacherMarksInput(sum);
                              }}
                              className="w-16 p-1 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded text-right font-mono font-semibold text-[hsl(var(--foreground))]"
                            />
                            <span className="text-[hsl(var(--muted-foreground))] font-mono text-[11px]">Marks</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Teacher Final Marks Input & Override */}
              <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[hsl(var(--foreground))]">
                    Teacher Final Awarded Marks:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={currentQuestionEval.maxMarks}
                      value={teacherMarksInput}
                      onChange={(e) => setTeacherMarksInput(Number(e.target.value))}
                      className="w-20 p-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded text-right font-mono text-sm font-bold text-[hsl(var(--foreground))]"
                    />
                    <span className="font-mono text-[hsl(var(--muted-foreground))] text-xs">/ {currentQuestionEval.maxMarks}</span>
                  </div>
                </div>

                {/* Override Reason Required if Marks Differ */}
                {teacherMarksInput !== currentQuestionEval.aiProposedMarks && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-semibold text-[11px]">
                      <span>Override Log (Mandatory Justification):</span>
                      <span className="font-mono">
                        Δ {teacherMarksInput - currentQuestionEval.aiProposedMarks > 0 ? '+' : ''}
                        {(teacherMarksInput - currentQuestionEval.aiProposedMarks).toFixed(1)} M
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      aria-label="Override reason justification"
                      value={overrideReasonInput}
                      onChange={(e) => setOverrideReasonInput(e.target.value)}
                      className="w-full p-2 bg-[hsl(var(--card))] border border-amber-500/50 rounded text-xs text-[hsl(var(--foreground))] focus:outline-hidden"
                    />
                  </div>
                )}

                {/* Qualitative Feedback */}
                <div className="space-y-1">
                  <label className="font-semibold text-[hsl(var(--foreground))]">
                    Feedback & Comments for Student:
                  </label>
                  <textarea
                    rows={3}
                    aria-label="Feedback and comments for student"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="w-full p-2.5 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Ribbon for Panel 3 */}
            <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSaveQuestionDraft}
                className="px-3 py-1.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={handleMarkQuestionReviewed}
                className="px-4 py-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Question Reviewed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Approve Evaluation */}
      <ConfirmDialog
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleApproveSubmission}
        title="Confirm Teacher Final Mark Approval"
        message={`Confirm final approval for ${currentSubmission?.studentName} (${currentSubmission?.studentRoll}) with total awarded marks of ${currentSubmission?.totalAwardedMarks}/${currentSubmission?.totalMaxMarks}. This records your faculty signature in the evaluation audit log.`}
        confirmLabel="Approve Marks"
        variant="success"
      />

      {/* Confirmation Modal: Publish Results */}
      <ConfirmDialog
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublishSubmission}
        title="Publish Examination Result to Student"
        message={`Are you ready to officially publish these approved results for ${currentSubmission?.studentName}? The student will immediately be able to view their grade, marked booklet, and rubric feedback.`}
        confirmLabel="Publish to Student Portal"
        variant="primary"
      />

      {/* Audit Trail Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Evaluation Audit Trail & Event History"
        description={`${currentSubmission?.studentName} · Roll: ${currentSubmission?.studentRoll}`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            Chronological record of OCR extraction, AI grading suggestions, teacher overrides, and approval timestamps.
          </div>

          <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))] text-xs">
            {currentSubmission?.auditEvents.map((ev) => (
              <div key={ev.id} className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[hsl(var(--foreground))] capitalize">
                    {ev.action.replace('_', ' ')}
                    {ev.questionNumber ? ` · Question ${ev.questionNumber}` : ''}
                  </span>
                  <span className="font-mono text-[hsl(var(--muted-foreground))] text-[11px]">{ev.timestamp}</span>
                </div>
                <div className="text-[hsl(var(--muted-foreground))]">
                  By: <strong className="text-[hsl(var(--foreground))]">{ev.user}</strong>
                </div>
                {ev.previousValue && ev.newValue && (
                  <div className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                    Changed: <span className="line-through">{ev.previousValue}</span> → <strong className="text-[hsl(var(--accent-text))]">{ev.newValue}</strong>
                  </div>
                )}
                {ev.reason && (
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))] italic">
                    Reason: "{ev.reason}"
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsAuditModalOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
