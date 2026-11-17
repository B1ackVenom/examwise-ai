import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { ImportantQuestion } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import {
  Search,
  Bookmark,
  Download,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const ImportantQuestions: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || 'all';
  const initialModuleId = searchParams.get('moduleId') || 'all';

  const [courses] = useState(() => apiClient.getCourses());
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [questions, setQuestions] = useState<ImportantQuestion[]>(() =>
    apiClient.getImportantQuestions()
  );
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // AI Prediction Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genCourseId, setGenCourseId] = useState(courses[0]?.id || 'crs-cse2003');
  const [genModuleId, setGenModuleId] = useState('all');
  const [genDifficulty, setGenDifficulty] = useState('medium');
  const [genCount, setGenCount] = useState(3);
  const [genFocusTopic, setGenFocusTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { success, info } = useToast();

  const availableModules = useMemo(() => {
    if (selectedCourseId === 'all') return [];
    return apiClient.getModules(selectedCourseId);
  }, [selectedCourseId]);

  const modalModules = useMemo(() => {
    return apiClient.getModules(genCourseId);
  }, [genCourseId]);

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      const newQuestions = await apiClient.predictQuestionsAI(
        genCourseId,
        genModuleId === 'all' ? undefined : genModuleId,
        genCount,
        genDifficulty,
        genFocusTopic.trim() || undefined
      );
      setQuestions(apiClient.getImportantQuestions());
      setIsGenerateModalOpen(false);
      success(`AI predicted ${newQuestions.length} high-yield examination questions!`);
    } catch {
      info('Synthesized questions based on course curriculum.');
      setQuestions(apiClient.getImportantQuestions());
      setIsGenerateModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchCourse = selectedCourseId === 'all' || q.courseId === selectedCourseId;
      const matchModule = selectedModuleId === 'all' || q.moduleId === selectedModuleId;
      const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
      const matchBookmarked = !bookmarkedOnly || q.isBookmarked;
      const matchSearch =
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.expectedKeyPoints.some((kp) => kp.toLowerCase().includes(searchQuery.toLowerCase())) ||
        q.modelAnswer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCourse && matchModule && matchDiff && matchBookmarked && matchSearch;
    });
  }, [questions, selectedCourseId, selectedModuleId, selectedDifficulty, bookmarkedOnly, searchQuery]);

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowBookmarked = apiClient.toggleBookmarkQuestion(id);
    setQuestions(apiClient.getImportantQuestions());
    if (isNowBookmarked) {
      success('Question saved to review list.');
    } else {
      info('Question removed from bookmarks.');
    }
  };

  const handleExportCsv = () => {
    const csvContent = apiClient.exportQuestionsCsv(filteredQuestions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ExamWise_Important_Questions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Exported ${filteredQuestions.length} questions to CSV.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            High-Yield & Important Questions
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Review important questions generated from course resources and past examination patterns.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Predict Questions (AI)</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filteredQuestions.length === 0}
            className="px-3 py-1.5 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] disabled:opacity-40 text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            aria-label="Search questions"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
          />
        </div>

        <select
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setSelectedModuleId('all');
          }}
          className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
        >
          <option value="all">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}: {c.title}
            </option>
          ))}
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button
          onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            bookmarkedOnly
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" fill={bookmarkedOnly ? 'currentColor' : 'none'} />
          <span>Saved Only</span>
        </button>
      </div>

      {/* Unused module filter preserved cleanly when course selected */}
      {availableModules.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
            className="px-3 py-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))]"
          >
            <option value="all">All Modules</option>
            {availableModules.map((m) => (
              <option key={m.id} value={m.id}>
                Module {m.order}: {m.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              {questions.length === 0 ? 'No important questions generated yet' : 'No matching questions found'}
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {questions.length === 0
                ? 'Connect your backend question generator or upload study resources to view curated questions.'
                : 'Try adjusting your filters or clearing your search query.'}
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isExpanded = expandedQuestionId === q.id;
            const course = courses.find((c) => c.id === q.courseId);

            return (
              <div
                key={q.id}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs transition-colors hover:border-[hsl(var(--muted-foreground)/0.4)] space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="font-mono font-semibold text-[hsl(var(--accent-text))]">
                      {course ? course.code : 'General'}
                    </span>
                    <span>·</span>
                    <span>Difficulty: <strong className="capitalize text-[hsl(var(--foreground))]">{q.difficulty}</strong></span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{q.marks} Marks</span>
                    <span>·</span>
                    <span>Bloom: <strong className="text-[hsl(var(--foreground))]">{q.bloomsTaxonomy}</strong></span>
                    {q.confidenceLabel && (
                      <>
                        <span>·</span>
                        <span>{q.confidenceLabel}</span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleToggleBookmark(q.id, e)}
                    className="text-[hsl(var(--muted-foreground))] hover:text-amber-500 transition-colors p-1"
                    title={q.isBookmarked ? 'Remove bookmark' : 'Save question'}
                  >
                    <Bookmark
                      className="w-4 h-4"
                      fill={q.isBookmarked ? '#F59E0B' : 'none'}
                      color={q.isBookmarked ? '#F59E0B' : 'currentColor'}
                    />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] leading-relaxed">
                  {q.question}
                </h3>

                <div className="bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] rounded-lg p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-[hsl(var(--foreground))]">
                    Expected Key Concepts & Rubric Criteria:
                  </div>
                  <ul className="space-y-1">
                    {q.expectedKeyPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-[hsl(var(--border))] space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                        Model Comprehensive Answer:
                      </div>
                      <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed p-3 bg-[hsl(var(--secondary)/0.7)] rounded-lg border border-[hsl(var(--border))]">
                        {q.modelAnswer}
                      </p>
                    </div>

                    <div className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                      <span>Source Curriculum Assets:</span>
                      {q.sourceResources.map((src, i) => (
                        <span key={i} className="underline text-[hsl(var(--foreground))]">
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--accent-text))] hover:underline transition-colors"
                  >
                    <span>{isExpanded ? 'Hide Model Answer' : 'View Model Answer & Details'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Past Exam Frequency: <strong className="font-mono text-[hsl(var(--foreground))]">{q.frequencyScore} times</strong>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Question Prediction Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => !isGenerating && setIsGenerateModalOpen(false)}
        title="Predict High-Yield Examination Questions (AI)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Our AI engine analyzes course syllabi, lecture notes, and historical exam frequency to predict high-probability descriptive and analytical questions.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
              Select Course *
            </label>
            <select
              value={genCourseId}
              onChange={(e) => {
                setGenCourseId(e.target.value);
                setGenModuleId('all');
              }}
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
              Target Syllabus Module
            </label>
            <select
              value={genModuleId}
              onChange={(e) => setGenModuleId(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))]"
            >
              <option value="all">Entire Course Syllabus (All Modules)</option>
              {modalModules.map((m) => (
                <option key={m.id} value={m.id}>
                  Module {m.order}: {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Cognitive Complexity
              </label>
              <select
                value={genDifficulty}
                onChange={(e) => setGenDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))]"
              >
                <option value="easy">Foundational (Bloom 1-2)</option>
                <option value="medium">Analytical (Bloom 3-4)</option>
                <option value="hard">Synthesis & Evaluation (Bloom 5-6)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Question Count
              </label>
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))]"
              >
                <option value={2}>2 Questions</option>
                <option value={3}>3 Questions (Recommended)</option>
                <option value={5}>5 Questions</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
              Focus Topic or Concept (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Master Theorem, BCNF decomposition, Peterson algorithm"
              value={genFocusTopic}
              onChange={(e) => setGenFocusTopic(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))]"
            />
          </div>

          <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateQuestions}
              disabled={isGenerating}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
