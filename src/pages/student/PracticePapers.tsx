import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import { PracticePaper, PracticeAttempt } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  exportPracticePaperToDoc,
  exportPracticePaperToMarkdown,
  exportPracticePaperToPdf,
} from '../../utils/exportUtils';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
  Download,
  Printer,
  FileCode,
  Sliders,
  Settings2,
} from 'lucide-react';

export const PracticePapers: React.FC = () => {
  const [courses] = useState(() => apiClient.getCourses());
  const [papers, setPapers] = useState<PracticePaper[]>(() => apiClient.getPracticePapers());
  const [activePaper, setActivePaper] = useState<PracticePaper | null>(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | number>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(45 * 60);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [latestAttempt, setLatestAttempt] = useState<PracticeAttempt | null>(null);

  // AI Generation Modal State with configurable Marks per Q and Max per Module
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genCourseId, setGenCourseId] = useState(courses[0]?.id || 'crs-cse2003');
  const [genExamType, setGenExamType] = useState<'mid_term' | 'end_term'>('mid_term');
  const [genTitle, setGenTitle] = useState('');
  const [genMarksPerQuestion, setGenMarksPerQuestion] = useState<number>(5);
  const [genMaxMarksPerModule, setGenMaxMarksPerModule] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // Export Paper Dropdown State
  const [openExportMenuId, setOpenExportMenuId] = useState<string | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setOpenExportMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const { success } = useToast();

  const handleExportPaperDoc = (paper: PracticePaper) => {
    const course = courses.find((c) => c.id === paper.courseId);
    exportPracticePaperToDoc(paper, course ? `${course.code}: ${course.title}` : undefined);
    setOpenExportMenuId(null);
    success(`Exported "${paper.title}" to Word Document (.doc)`);
  };

  const handleExportPaperMarkdown = (paper: PracticePaper) => {
    const course = courses.find((c) => c.id === paper.courseId);
    exportPracticePaperToMarkdown(paper, course ? `${course.code}: ${course.title}` : undefined);
    setOpenExportMenuId(null);
    success(`Exported "${paper.title}" to Markdown (.md)`);
  };

  const handleExportPaperPdf = (paper: PracticePaper) => {
    const course = courses.find((c) => c.id === paper.courseId);
    exportPracticePaperToPdf(paper, course ? `${course.code}: ${course.title}` : undefined);
    setOpenExportMenuId(null);
    success(`Opening printable university examination paper PDF...`);
  };

  const handleGeneratePaper = async () => {
    setIsGenerating(true);
    try {
      const newPaper = await apiClient.generatePracticePaperAI(
        genCourseId,
        genExamType,
        genTitle.trim() || undefined,
        undefined,
        {
          marksPerQuestion: genMarksPerQuestion,
          maxMarksPerModule: genMaxMarksPerModule,
        }
      );
      if (newPaper) {
        setPapers(apiClient.getPracticePapers());
        setIsGenerateModalOpen(false);
        setGenTitle('');
        success(`New ${genExamType === 'mid_term' ? 'Mid-Term' : 'End-Term'} paper generated (${newPaper.totalMarks}M total, ${genMarksPerQuestion}M/Q)!`);
      }
    } catch {
      setPapers(apiClient.getPracticePapers());
      setIsGenerateModalOpen(false);
      success('Practice paper generated from syllabus blueprint.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTestActive && timeLeftSeconds > 0) {
      timer = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            handleCompleteSubmission();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTestActive, timeLeftSeconds]);

  const handleStartPracticeFlow = (paper: PracticePaper) => {
    setActivePaper(paper);
    setTimeLeftSeconds(paper.durationMinutes * 60);
    setUserAnswers({});
    setActiveQuestionIndex(0);
    setLatestAttempt(null);
    setIsInstructionsOpen(true);
  };

  const handleBeginAssessment = () => {
    setIsInstructionsOpen(false);
    setIsTestActive(true);
    success('Practice session started.');
  };

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleCompleteSubmission = () => {
    if (!activePaper) return;
    setIsTestActive(false);
    const attempt = apiClient.submitPracticeAttempt(activePaper.id, userAnswers);
    if (attempt) {
      setLatestAttempt(attempt);
      setPapers(apiClient.getPracticePapers());
      success(`Assessment submitted. Score: ${attempt.score}/${attempt.totalMarks} (${attempt.percentage}%)`);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = activePaper?.questions[activeQuestionIndex];
  const answeredCount = activePaper ? Object.keys(userAnswers).length : 0;

  return (
    <div className="space-y-6">
      {isTestActive && activePaper && currentQuestion ? (
        <div className="space-y-6">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-mono text-xs text-[hsl(var(--accent-text))] font-semibold">
                Practice Session in Progress
              </span>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">
                {activePaper.title}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-semibold tabular-nums ${
                  timeLeftSeconds < 300
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'
                    : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTimer(timeLeftSeconds)}</span>
              </div>

              <button
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="px-4 py-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                Submit Paper
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-[hsl(var(--foreground))] font-mono">
                    Question {currentQuestion.questionNumber} of {activePaper.questions.length}
                  </span>
                  <span className="text-[hsl(var(--muted-foreground))]">·</span>
                  <span className="text-[hsl(var(--muted-foreground))] capitalize">{currentQuestion.type}</span>
                </div>
                <span className="font-mono text-xs font-semibold text-[hsl(var(--accent-text))] tabular-nums">
                  {currentQuestion.marks} Marks
                </span>
              </div>

              <div className="text-sm font-medium text-[hsl(var(--foreground))] leading-relaxed">
                {currentQuestion.questionText}
              </div>

              {currentQuestion.type === 'mcq' && currentQuestion.options && (
                <div className="space-y-2.5 pt-2">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = userAnswers[currentQuestion.id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion.id, idx)}
                        className={`w-full p-3.5 rounded-lg border text-left text-xs transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))] font-medium'
                            : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.6)] text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[11px] shrink-0 ${
                            isSelected
                              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                              : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type !== 'mcq' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">
                      Your Descriptive / Mathematical Solution:
                    </label>
                    <span className="text-[11px] font-mono text-[hsl(var(--accent-text))]">
                      Max {currentQuestion.marks} Marks
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Type your comprehensive theoretical explanation, mathematical derivation, or solution step-by-step..."
                    value={String(userAnswers[currentQuestion.id] || '')}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full p-3 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))] leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                    <span>Character count: {String(userAnswers[currentQuestion.id] || '').length}</span>
                    <span>University standard structured format</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between">
                <button
                  type="button"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex((prev) => prev - 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] disabled:opacity-40 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {activeQuestionIndex < activePaper.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))]"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSubmitConfirmOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                  >
                    <span>Submit Paper</span>
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
              <div className="text-xs font-semibold text-[hsl(var(--foreground))] flex items-center justify-between">
                <span>Question Navigator</span>
                <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                  {answeredCount}/{activePaper.questions.length} answered
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {activePaper.questions.map((q, idx) => {
                  const isAnswered = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '';
                  const isCurrent = idx === activeQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`h-9 rounded-lg font-mono text-xs font-semibold transition-all flex items-center justify-center ${
                        isCurrent
                          ? 'ring-2 ring-[hsl(var(--ring))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                          : isAnswered
                          ? 'bg-teal-500/15 border border-teal-500/40 text-teal-600 dark:text-teal-400'
                          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[hsl(var(--border))] space-y-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[hsl(var(--primary))]" />
                  <span>Current Question</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-teal-500/20 border border-teal-500/50" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]" />
                  <span>Not Answered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : latestAttempt && activePaper ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
            <div>
              <span className="text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold">
                Attempt Complete · Score Evaluation
              </span>
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))] font-display">
                {activePaper.title}
              </h1>
            </div>

            <button
              onClick={() => {
                setActivePaper(null);
                setLatestAttempt(null);
              }}
              className="px-3.5 py-1.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors"
            >
              Return to Paper List
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 text-center">
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Total Marks Scored</span>
              <div className="text-3xl font-bold font-mono tabular-nums text-[hsl(var(--foreground))] mt-1">
                {latestAttempt.score} <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">/ {latestAttempt.totalMarks}</span>
              </div>
            </div>

            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 text-center">
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Percentage Score</span>
              <div className="text-3xl font-bold font-mono tabular-nums text-teal-600 dark:text-teal-400 mt-1">
                {latestAttempt.percentage}%
              </div>
            </div>

            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 text-center">
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Performance Status</span>
              <div className="text-base font-semibold text-[hsl(var(--foreground))] mt-2">
                {latestAttempt.percentage >= 80 ? 'Mastery Achieved' : 'In Progress'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Detailed Question Analysis & Explanations
            </h2>

            {activePaper.questions.map((q, idx) => {
              const userAnswer = latestAttempt.answers[q.id];
              const isMcq = q.type === 'mcq';
              const isCorrect = isMcq && Number(userAnswer) === Number(q.correctAnswer);

              return (
                <div
                  key={q.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[hsl(var(--foreground))] font-mono">
                      Question {idx + 1}
                    </span>
                    {isMcq ? (
                      <span
                        className={`font-semibold font-mono flex items-center gap-1 ${
                          isCorrect ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {isCorrect ? `+${q.marks} Marks` : `0 / ${q.marks} Marks`}
                      </span>
                    ) : (
                      <span className="font-mono text-[hsl(var(--accent-text))]">
                        Recorded Response
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                    {q.questionText}
                  </p>

                  {isMcq && q.options && (
                    <div className="space-y-1.5 pt-1 text-xs">
                      {q.options.map((opt, oIdx) => {
                        const isUserChoice = Number(userAnswer) === oIdx;
                        const isCorrectChoice = Number(q.correctAnswer) === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border flex items-center justify-between ${
                              isCorrectChoice
                                ? 'bg-teal-500/10 border-teal-500/40 text-teal-900 dark:text-teal-200 font-medium'
                                : isUserChoice
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200'
                                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                            }`}
                          >
                            <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                            {isCorrectChoice && (
                              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                                Correct Answer
                              </span>
                            )}
                            {isUserChoice && !isCorrectChoice && (
                              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                Your Selection
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isMcq && (
                    <div className="space-y-2">
                      <div className="p-3 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] rounded-lg text-xs space-y-1">
                        <div className="font-semibold text-[hsl(var(--foreground))]">
                          Your Submitted Response:
                        </div>
                        <p className="text-[hsl(var(--muted-foreground))] italic">
                          "{String(userAnswer || 'No response recorded.')}"
                        </p>
                      </div>

                      {q.correctAnswer && (
                        <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg text-xs space-y-1">
                          <div className="font-semibold text-teal-700 dark:text-teal-300">
                            Expected Benchmark / Model Answer Key:
                          </div>
                          <p className="text-[hsl(var(--foreground))] leading-relaxed">
                            {String(q.correctAnswer)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-[hsl(var(--secondary)/0.7)] rounded-lg text-xs border border-[hsl(var(--border))]">
                    <span className="font-semibold text-[hsl(var(--accent-text))] block mb-1">
                      Explanation & Underlying Concept:
                    </span>
                    <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
                Practice Papers
              </h1>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Timed examination practice sessions with automated scoring and answer explanations.
              </p>
            </div>

            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Generate AI Practice Paper</span>
            </button>
          </div>

          {papers.length === 0 ? (
            <div className="p-12 text-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl space-y-2">
              <FileText className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                No practice papers available yet
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Connect your backend assessment service to fetch or generate practice papers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {papers.map((paper) => {
                const hasAttempts = paper.attempts && paper.attempts.length > 0;
                const bestScore = hasAttempts
                  ? Math.max(...paper.attempts.map((a) => a.percentage))
                  : null;

                return (
                  <div
                    key={paper.id}
                    className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[hsl(var(--accent-text))]">
                          {paper.courseId.replace('crs-', '').toUpperCase()}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] capitalize">
                          Difficulty: {paper.difficulty}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                        {paper.title}
                      </h3>

                      <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed">
                        {paper.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {paper.durationMinutes} mins
                        </span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{paper.totalMarks} Marks</span>
                        <span>·</span>
                        <span>{paper.questionCount} Questions</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between">
                      <div>
                        {bestScore !== null ? (
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            Best score: <strong className="font-mono text-teal-600 dark:text-teal-400">{bestScore}%</strong>
                          </div>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">Not attempted yet</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Multi-format Export Dropdown for Predicted Paper */}
                        <div className="relative" ref={openExportMenuId === paper.id ? exportDropdownRef : null}>
                          <button
                            type="button"
                            onClick={() => setOpenExportMenuId(openExportMenuId === paper.id ? null : paper.id)}
                            className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            title="Export paper to DOC, PDF, or Markdown"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Export Paper</span>
                            <ChevronDown className="w-3 h-3 opacity-70" />
                          </button>

                          {openExportMenuId === paper.id && (
                            <div className="absolute right-0 bottom-full mb-1 w-52 bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] rounded-xl shadow-xl border border-[hsl(var(--border))] py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                Export Paper As
                              </div>
                              <button
                                onClick={() => handleExportPaperDoc(paper)}
                                className="w-full px-3 py-2 text-left hover:bg-[hsl(var(--secondary))] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <FileText className="w-4 h-4 text-blue-500" />
                                <div>
                                  <div className="font-semibold">Word Document (.doc)</div>
                                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Official question paper format</div>
                                </div>
                              </button>
                              <button
                                onClick={() => handleExportPaperPdf(paper)}
                                className="w-full px-3 py-2 text-left hover:bg-[hsl(var(--secondary))] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4 text-emerald-500" />
                                <div>
                                  <div className="font-semibold">Printable Exam (PDF)</div>
                                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">University exam paper layout</div>
                                </div>
                              </button>
                              <button
                                onClick={() => handleExportPaperMarkdown(paper)}
                                className="w-full px-3 py-2 text-left hover:bg-[hsl(var(--secondary))] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <FileCode className="w-4 h-4 text-purple-500" />
                                <div>
                                  <div className="font-semibold">Markdown (.md)</div>
                                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Raw text with questions & answers</div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleStartPracticeFlow(paper)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{hasAttempts ? 'Retake Paper' : 'Start Practice Paper'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        title="Examination Instructions"
        description={activePaper?.title}
      >
        <div className="space-y-4 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          <div className="p-3 bg-[hsl(var(--secondary)/0.6)] rounded-lg space-y-1.5 border border-[hsl(var(--border))]">
            <div className="font-semibold text-[hsl(var(--foreground))]">Session Details:</div>
            <div className="grid grid-cols-2 gap-2 text-[hsl(var(--muted-foreground))]">
              <div>Duration: <strong className="text-[hsl(var(--foreground))]">{activePaper?.durationMinutes} Minutes</strong></div>
              <div>Total Marks: <strong className="text-[hsl(var(--foreground))] font-mono">{activePaper?.totalMarks}</strong></div>
              <div>Questions: <strong className="text-[hsl(var(--foreground))]">{activePaper?.questionCount}</strong></div>
              <div>Format: <strong className="text-[hsl(var(--foreground))]">Descriptive (Zero-MCQ Standard)</strong></div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--foreground))]">Rules & Environment:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Once you click <strong>"Begin Practice Session"</strong>, the timer starts immediately.</li>
              <li>You may navigate freely between questions using the Question Navigator palette.</li>
              <li>Your selections are preserved as you navigate between questions.</li>
            </ul>
          </div>

          <div className="pt-3 flex items-center justify-between gap-2 border-t border-[hsl(var(--border))]">
            {activePaper && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportPaperPdf(activePaper)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Print official question paper"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Paper</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPaperDoc(activePaper)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Export to Word"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>DOC</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsInstructionsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBeginAssessment}
                className="px-4 py-1.5 rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] font-medium transition-colors"
              >
                Begin Practice Session
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleCompleteSubmission}
        title="Confirm Paper Submission"
        message={`You have answered ${answeredCount} of ${activePaper?.questions.length || 0} questions. Are you ready to submit for scoring?`}
        confirmLabel="Submit & View Score"
        variant="primary"
      />

      {/* AI Practice Paper Generation Modal with Marks per Q & Max per Module */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => !isGenerating && setIsGenerateModalOpen(false)}
        title="Generate AI Practice Examination Paper"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Constructs a university-pattern practice paper adhering strictly to official syllabus blueprints, zero MCQs, and module mark limits.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
              Target Course *
            </label>
            <select
              value={genCourseId}
              onChange={(e) => setGenCourseId(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))]"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
              Examination Format (Zero-MCQ University Standard) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setGenExamType('mid_term');
                  setGenMaxMarksPerModule(12);
                }}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  genExamType === 'mid_term'
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--primary)/0.3)]'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <div className="text-xs font-bold">Mid-Term Paper</div>
                <div className="text-[11px] font-mono opacity-80 mt-1">20–25 Marks · 60 Mins</div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-1">Modules 1 & 2 Focus</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGenExamType('end_term');
                  setGenMaxMarksPerModule(10);
                }}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  genExamType === 'end_term'
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--primary)/0.3)]'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <div className="text-xs font-bold">End-Term Comprehensive</div>
                <div className="text-[11px] font-mono opacity-80 mt-1">50 Marks · 120 Mins</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">All 5 Modules Cap</div>
              </button>
            </div>
          </div>

          {/* User Choosable Marks Per Question & Max Marks Per Module */}
          <div className="p-3.5 rounded-xl bg-[hsl(var(--secondary)/0.3)] border border-[hsl(var(--border))] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))]">
              <Sliders className="w-3.5 h-3.5 text-[hsl(var(--accent-text))]" />
              <span>Marking Blueprint Customization</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Marks per Question */}
              <div>
                <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  Marks per Question: <strong className="text-[hsl(var(--foreground))] font-mono">{genMarksPerQuestion} Marks</strong>
                </label>
                <div className="flex items-center gap-1.5">
                  {[5, 6, 10].map((marks) => (
                    <button
                      key={marks}
                      type="button"
                      onClick={() => setGenMarksPerQuestion(marks)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                        genMarksPerQuestion === marks
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.8)]'
                      }`}
                    >
                      {marks}M
                    </button>
                  ))}
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={genMarksPerQuestion}
                    onChange={(e) => setGenMarksPerQuestion(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs font-mono text-center text-[hsl(var(--foreground))]"
                    placeholder="Custom"
                    title="Custom marks per question"
                  />
                </div>
              </div>

              {/* Max Marks per Module */}
              <div>
                <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  Max Cap per Module: <strong className="text-[hsl(var(--foreground))] font-mono">{genMaxMarksPerModule} Marks</strong>
                </label>
                <div className="flex items-center gap-1.5">
                  {[10, 12, 15].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setGenMaxMarksPerModule(cap)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                        genMaxMarksPerModule === cap
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.8)]'
                      }`}
                    >
                      {cap}M
                    </button>
                  ))}
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={genMaxMarksPerModule}
                    onChange={(e) => setGenMaxMarksPerModule(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs font-mono text-center text-[hsl(var(--foreground))]"
                    placeholder="Custom"
                    title="Custom max marks per module"
                  />
                </div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[hsl(var(--secondary)/0.5)] text-[11px] text-[hsl(var(--muted-foreground))] flex items-center justify-between">
              <span>
                Blueprint: {genExamType === 'mid_term' ? '2 Modules' : '5 Modules'} · {genMarksPerQuestion}M/Q · Max {genMaxMarksPerModule}M/Module
              </span>
              <span className="font-mono font-bold text-[hsl(var(--foreground))]">
                Target: {genExamType === 'mid_term' ? 2 * genMaxMarksPerModule : 5 * genMaxMarksPerModule} Marks
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
              Custom Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. CSE2003 DBMS Comprehensive Mid-Term Simulation"
              value={genTitle}
              onChange={(e) => setGenTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))]"
            />
          </div>

          <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={isGenerating}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGeneratePaper}
              disabled={isGenerating}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Exam Paper...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Paper</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
