import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { ExamQuestion, RubricCriterion } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Key,
  Sliders,
} from 'lucide-react';

export const ExamBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { success, warning } = useToast();
  const courses = apiClient.getCourses();

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Details (blank initial state — no pre-filled mock values)
  const [examDetails, setExamDetails] = useState({
    title: '',
    code: '',
    courseId: courses[0]?.id || '',
    selectedModules: [] as number[],
    date: new Date().toISOString().split('T')[0],
    durationMinutes: 120,
    maxMarks: 100,
    passingMarks: 40,
  });

  // Step 2-4: Questions, Answer Keys & Rubrics
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  const selectedCourseModules = examDetails.courseId
    ? apiClient.getModules(examDetails.courseId)
    : [];

  // Validation
  const sumOfQuestionMarks = questions.reduce((acc, q) => acc + q.maxMarks, 0);
  const isMarksValid = questions.length > 0 && sumOfQuestionMarks === examDetails.maxMarks;
  const marksDifference = examDetails.maxMarks - sumOfQuestionMarks;

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    const newQ: ExamQuestion = {
      id: `eq-new-${Date.now().toString(36)}`,
      examId: '',
      questionNumber: nextNum,
      text: '',
      type: 'descriptive',
      maxMarks: 10,
      isRequired: true,
      answerKey: {
        expectedAnswer: '',
        keyConcepts: [],
        acceptableAlternatives: [],
        guidanceNotes: '',
      },
      rubric: [
        {
          id: `rc-${Date.now().toString(36)}-1`,
          name: '',
          maxMarks: 10,
          partialCreditRule: '',
          description: '',
        },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = questions
      .filter((_, i) => i !== idx)
      .map((q, i) => ({
        ...q,
        questionNumber: i + 1,
      }));
    setQuestions(updated);
  };

  const handleUpdateQuestion = (idx: number, patch: Partial<ExamQuestion>) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], ...patch };
    setQuestions(updated);
  };

  const handleSaveExam = (status: 'draft' | 'published') => {
    if (!examDetails.title.trim() || !examDetails.code.trim()) {
      warning('Please enter an examination title and exam code in Step 1.');
      setCurrentStep(1);
      return;
    }

    if (questions.length === 0) {
      warning('Add at least one question before saving the examination.');
      setCurrentStep(2);
      return;
    }

    if (status === 'published' && !isMarksValid) {
      warning(
        `Marks sum mismatch: Total questions sum to ${sumOfQuestionMarks} marks, but exam configured maximum is ${examDetails.maxMarks}. Adjust questions or max marks before publishing.`
      );
      return;
    }

    const created = apiClient.createExam({
      ...examDetails,
      title: examDetails.title.trim(),
      code: examDetails.code.trim(),
      status,
      questions,
    });

    success(
      status === 'published'
        ? `Examination "${created.title}" successfully configured and published!`
        : `Examination saved as Draft.`
    );
    navigate('/teacher/exams');
  };

  const stepLabels = [
    '1. Exam Details',
    '2. Questions',
    '3. Answer Keys',
    '4. Marking Rubrics',
    '5. Review & Validate',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Examination Builder
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Define questions, expected answer keys, and multi-criteria evaluation rubrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tabular-nums text-[hsl(var(--muted-foreground))]">
            Marks:{' '}
            <strong className={isMarksValid ? 'text-teal-600 dark:text-teal-400' : 'text-rose-500'}>
              {sumOfQuestionMarks} / {examDetails.maxMarks}
            </strong>
          </span>
        </div>
      </div>

      {/* Step Navigator Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[hsl(var(--border))]">
        {stepLabels.map((lbl, idx) => {
          const stepNum = idx + 1;
          const isCurrent = currentStep === stepNum;
          const isDone = currentStep > stepNum;
          return (
            <button
              key={idx}
              onClick={() => setCurrentStep(stepNum)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                isCurrent
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                  : isDone
                  ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {isDone && <Check className="w-3 h-3 text-teal-500" />}
              <span>{lbl}</span>
            </button>
          );
        })}
      </div>

      {/* Step 1: Examination Details */}
      {currentStep === 1 && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Step 1: Examination Metadata & Target Scope
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Examination Title *
              </label>
              <input
                type="text"
                value={examDetails.title}
                onChange={(e) => setExamDetails({ ...examDetails, title: e.target.value })}
                className="w-full mt-1 p-2.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Course Identifier
              </label>
              {courses.length > 0 ? (
                <select
                  value={examDetails.courseId}
                  onChange={(e) => setExamDetails({ ...examDetails, courseId: e.target.value, selectedModules: [] })}
                  className="w-full mt-1 p-2.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 p-2.5 bg-[hsl(var(--secondary)/0.4)] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                  <span>No courses created yet</span>
                  <Link to="/teacher/courses" className="text-[hsl(var(--accent-text))] hover:underline font-medium">
                    Create Course
                  </Link>
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Exam Code *
              </label>
              <input
                type="text"
                value={examDetails.code}
                onChange={(e) => setExamDetails({ ...examDetails, code: e.target.value })}
                className="w-full mt-1 p-2.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Scheduled Date
              </label>
              <input
                type="date"
                value={examDetails.date}
                onChange={(e) => setExamDetails({ ...examDetails, date: e.target.value })}
                className="w-full mt-1 p-2.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Duration (Minutes)
              </label>
              <input
                type="number"
                value={examDetails.durationMinutes}
                onChange={(e) => setExamDetails({ ...examDetails, durationMinutes: Number(e.target.value) })}
                className="w-full mt-1 p-2.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="font-semibold text-[hsl(var(--foreground))]">
                Configured Maximum Marks *
              </label>
              <input
                type="number"
                value={examDetails.maxMarks}
                onChange={(e) => setExamDetails({ ...examDetails, maxMarks: Number(e.target.value) })}
                className="w-full mt-1 p-2.5 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))] font-mono"
              />
            </div>
          </div>

          {selectedCourseModules.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-2">
                Syllabus Units Tested:
              </label>
              <div className="flex flex-wrap gap-4 text-xs text-[hsl(var(--foreground))]">
                {selectedCourseModules.map((mod) => {
                  const isSelected = examDetails.selectedModules.includes(mod.order);
                  return (
                    <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const newModules = isSelected
                            ? examDetails.selectedModules.filter((m) => m !== mod.order)
                            : [...examDetails.selectedModules, mod.order].sort((a, b) => a - b);
                          setExamDetails({ ...examDetails, selectedModules: newModules });
                        }}
                        className="rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))] focus:ring-0"
                      />
                      <span>Module {mod.order}: {mod.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Questions Configuration */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Step 2: Questions & Mark Allocations ({questions.length} Questions)
            </h2>
            <button
              onClick={handleAddQuestion}
              className="px-3 py-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold font-mono text-[hsl(var(--accent-text))]">
                      Question {q.questionNumber}
                    </span>
                    <div className="flex items-center gap-3">
                      <select
                        value={q.type}
                        onChange={(e) => handleUpdateQuestion(idx, { type: e.target.value as ExamQuestion['type'] })}
                        className="p-1.5 bg-[hsl(var(--secondary))] border border-[hsl(var(--input))] rounded text-[hsl(var(--foreground))] capitalize focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      >
                        <option value="descriptive">Descriptive</option>
                        <option value="analytical">Analytical</option>
                        <option value="short">Short Answer</option>
                      </select>

                      <div className="flex items-center gap-1.5">
                        <label className="text-[hsl(var(--muted-foreground))]">Marks:</label>
                        <input
                          type="number"
                          value={q.maxMarks}
                          onChange={(e) => handleUpdateQuestion(idx, { maxMarks: Number(e.target.value) })}
                          className="w-16 p-1.5 bg-[hsl(var(--secondary))] border border-[hsl(var(--input))] rounded text-right font-mono text-[hsl(var(--foreground))]"
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-rose-500"
                        title="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    aria-label={`Question ${q.questionNumber} statement`}
                    value={q.text}
                    onChange={(e) => handleUpdateQuestion(idx, { text: e.target.value })}
                    className="w-full p-3 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl space-y-2.5">
              <FileText className="w-7 h-7 mx-auto text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                No questions added yet
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Click "Add Question" to define questions and mark weights for this examination.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Answer Keys Configuration */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Step 3: Benchmark Answer Keys & Key Concepts
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Provide model solutions, core conceptual milestones, and acceptable alternative approaches.
          </p>

          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[hsl(var(--accent-text))]">
                      Question {q.questionNumber} ({q.maxMarks} Marks)
                    </span>
                    <span className="text-[hsl(var(--muted-foreground))] line-clamp-1 max-w-md">{q.text}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="font-semibold text-[hsl(var(--foreground))]">
                      Model Expected Answer:
                    </label>
                    <textarea
                      rows={3}
                      value={q.answerKey.expectedAnswer}
                      onChange={(e) =>
                        handleUpdateQuestion(idx, {
                          answerKey: { ...q.answerKey, expectedAnswer: e.target.value },
                        })
                      }
                      className="w-full p-2.5 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold text-[hsl(var(--foreground))]">
                        Key Concepts (comma-separated):
                      </label>
                      <input
                        type="text"
                        value={q.answerKey.keyConcepts.join(', ')}
                        onChange={(e) =>
                          handleUpdateQuestion(idx, {
                            answerKey: {
                              ...q.answerKey,
                              keyConcepts: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                            },
                          })
                        }
                        className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[hsl(var(--foreground))]">
                        Acceptable Alternatives (comma-separated):
                      </label>
                      <input
                        type="text"
                        value={q.answerKey.acceptableAlternatives.join(', ')}
                        onChange={(e) =>
                          handleUpdateQuestion(idx, {
                            answerKey: {
                              ...q.answerKey,
                              acceptableAlternatives: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                            },
                          })
                        }
                        className="w-full mt-1 p-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-lg text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl space-y-2">
              <Key className="w-7 h-7 mx-auto text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Add questions in Step 2 first
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Answer keys are configured per question once questions have been created.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Marking Rubrics */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Step 4: Objective Marking Rubrics & Partial-Credit Rules
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Configure step-wise scoring criteria and partial credit guidance for each question.
          </p>

          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[hsl(var(--accent-text))]">
                      Question {q.questionNumber}: Rubric Criteria ({q.maxMarks} Marks Total)
                    </span>
                    <button
                      onClick={() => {
                        const newCriterion: RubricCriterion = {
                          id: `rc-${Date.now().toString(36)}`,
                          name: '',
                          maxMarks: 0,
                          partialCreditRule: '',
                          description: '',
                        };
                        handleUpdateQuestion(qIdx, { rubric: [...q.rubric, newCriterion] });
                      }}
                      className="text-xs text-[hsl(var(--accent-text))] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3 h-3" /> Add Criterion
                    </button>
                  </div>

                  <div className="space-y-2">
                    {q.rubric.map((crit, cIdx) => (
                      <div
                        key={crit.id}
                        className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] grid grid-cols-1 md:grid-cols-4 gap-2 text-xs items-center"
                      >
                        <div className="md:col-span-1">
                          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Criterion Name</label>
                          <input
                            type="text"
                            value={crit.name}
                            onChange={(e) => {
                              const newRubric = [...q.rubric];
                              newRubric[cIdx] = { ...newRubric[cIdx], name: e.target.value };
                              handleUpdateQuestion(qIdx, { rubric: newRubric });
                            }}
                            className="w-full mt-0.5 p-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded text-[hsl(var(--foreground))]"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Max Marks</label>
                          <input
                            type="number"
                            value={crit.maxMarks}
                            onChange={(e) => {
                              const newRubric = [...q.rubric];
                              newRubric[cIdx] = { ...newRubric[cIdx], maxMarks: Number(e.target.value) };
                              handleUpdateQuestion(qIdx, { rubric: newRubric });
                            }}
                            className="w-full mt-0.5 p-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded font-mono text-[hsl(var(--foreground))]"
                          />
                        </div>

                        <div className="md:col-span-2 flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Partial Credit Rule</label>
                            <input
                              type="text"
                              value={crit.partialCreditRule}
                              onChange={(e) => {
                                const newRubric = [...q.rubric];
                                newRubric[cIdx] = { ...newRubric[cIdx], partialCreditRule: e.target.value };
                                handleUpdateQuestion(qIdx, { rubric: newRubric });
                              }}
                              className="w-full mt-0.5 p-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded text-[hsl(var(--foreground))]"
                            />
                          </div>
                          {q.rubric.length > 1 && (
                            <button
                              onClick={() => {
                                const newRubric = q.rubric.filter((_, i) => i !== cIdx);
                                handleUpdateQuestion(qIdx, { rubric: newRubric });
                              }}
                              className="mt-4 p-1.5 text-[hsl(var(--muted-foreground))] hover:text-rose-500"
                              title="Remove criterion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl space-y-2">
              <Sliders className="w-7 h-7 mx-auto text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Add questions in Step 2 first
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Marking rubrics are attached per question once questions exist.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Review & Validate Marks Sum */}
      {currentStep === 5 && (
        <div className="space-y-5">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Step 5: Mathematical Verification & Final Publication
            </h2>

            {/* Arithmetic Validation Box */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                isMarksValid
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
              }`}
            >
              {isMarksValid ? (
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-sm">
                  {questions.length === 0
                    ? 'No Questions Configured Yet'
                    : isMarksValid
                    ? 'Mark-Total Arithmetic Verified: Sum Equals Configured Maximum'
                    : 'Arithmetic Mismatch Detected: Marks Do Not Match Maximum'}
                </div>
                <p className="leading-relaxed">
                  Configured Exam Maximum: <strong className="font-mono">{examDetails.maxMarks} marks</strong>. Sum of individual question allocations: <strong className="font-mono">{sumOfQuestionMarks} marks</strong> across {questions.length} questions.
                </p>
                {questions.length > 0 && !isMarksValid && (
                  <p className="font-semibold text-rose-700 dark:text-rose-300">
                    Discrepancy: {marksDifference > 0 ? `+${marksDifference} marks unallocated` : `${marksDifference} marks over-allocated`}. Please adjust before publishing.
                  </p>
                )}
              </div>
            </div>

            {/* Paper Preview Summary */}
            <div className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3 bg-[hsl(var(--secondary)/0.25)]">
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Examination Specification Preview:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                <div>Title: <strong className="text-[hsl(var(--foreground))] block">{examDetails.title || '—'}</strong></div>
                <div>Code: <strong className="text-[hsl(var(--foreground))] block font-mono">{examDetails.code || '—'}</strong></div>
                <div>Duration: <strong className="text-[hsl(var(--foreground))] block">{examDetails.durationMinutes} mins</strong></div>
                <div>Questions: <strong className="text-[hsl(var(--foreground))] block font-mono">{questions.length}</strong></div>
              </div>

              {questions.length > 0 && (
                <div className="pt-2 divide-y divide-[hsl(var(--border))] text-xs">
                  {questions.map((q) => (
                    <div key={q.id} className="py-2.5 flex items-start justify-between gap-4">
                      <div>
                        <span className="font-mono font-semibold text-[hsl(var(--accent-text))] mr-2">
                          Q{q.questionNumber}.
                        </span>
                        <span className="text-[hsl(var(--foreground))]">{q.text || 'Untitled question'}</span>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                          Rubric: {q.rubric.length} criteria defined
                          {q.answerKey.keyConcepts.length > 0 && ` · Expected: ${q.answerKey.keyConcepts.join(', ')}`}
                        </div>
                      </div>
                      <span className="font-mono font-semibold tabular-nums text-[hsl(var(--foreground))] shrink-0">
                        {q.maxMarks} Marks
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <div className="flex items-center gap-2">
          {currentStep === 5 ? (
            <>
              <button
                type="button"
                onClick={() => handleSaveExam('draft')}
                className="px-4 py-2 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveExam('published')}
                disabled={!isMarksValid}
                className="px-5 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors disabled:opacity-40"
              >
                Publish Examination
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
