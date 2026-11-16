import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import {
  Search,
  Key,
  Sliders,
  Plus,
} from 'lucide-react';

export const RubricsAnswerKeys: React.FC = () => {
  const exams = apiClient.getExams();
  const [searchQuery, setSearchQuery] = useState('');

  // Collect rubrics from exam questions
  const questionsWithRubric = exams.flatMap((e) =>
    e.questions.map((q) => ({
      ...q,
      examCode: e.code,
      examTitle: e.title,
    }))
  );

  const filteredRubrics = questionsWithRubric.filter(
    (item) =>
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.examCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rubric.some((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Marking Rubrics & Standardized Answer Keys
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Standardized evaluation matrices, partial-credit schemas, and model answer guidelines across courses.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          aria-label="Search marking rubrics and answer keys"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
        />
      </div>

      {/* Rubrics Grid */}
      {filteredRubrics.length > 0 ? (
        <div className="space-y-4">
          {filteredRubrics.map((item) => (
            <div
              key={item.id}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--border))] pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-[hsl(var(--accent-text))]">
                    {item.examCode}
                  </span>
                  <span className="text-[hsl(var(--muted-foreground))]">·</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">
                    Question {item.questionNumber}
                  </span>
                  <span className="text-[hsl(var(--muted-foreground))]">·</span>
                  <span className="font-mono tabular-nums text-[hsl(var(--muted-foreground))]">{item.maxMarks} Max Marks</span>
                </div>
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{item.examTitle}</span>
              </div>

              <div className="text-xs font-medium text-[hsl(var(--foreground))]">
                {item.text}
              </div>

              {/* Answer Key Guidelines */}
              <div className="p-3 rounded-lg bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.25)] text-xs space-y-1.5">
                <div className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[hsl(var(--accent-text))]" />
                  Benchmark Expected Answer Key:
                </div>
                <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {item.answerKey.expectedAnswer || 'No model answer recorded.'}
                </p>
                {item.answerKey.keyConcepts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-[hsl(var(--accent-text))] font-medium">Core Concepts:</span>
                    {item.answerKey.keyConcepts.map((kc, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] px-1.5 py-0.5 rounded border border-[hsl(var(--border))] font-mono"
                      >
                        {kc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Criteria Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                  Evaluation Criteria Matrix:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {item.rubric.map((crit) => (
                    <div
                      key={crit.id}
                      className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-[hsl(var(--foreground))]">
                        <span>{crit.name || 'Criterion'}</span>
                        <span className="font-mono text-[hsl(var(--accent-text))]">
                          {crit.maxMarks} M
                        </span>
                      </div>
                      {crit.partialCreditRule && (
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                          Rule: {crit.partialCreditRule}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center space-y-2.5">
          <Sliders className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
          <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
            No rubrics or answer keys configured yet
          </div>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
            Create an examination with questions, benchmark answers, and rubric criteria to manage them here.
          </p>
          <div className="pt-1">
            <Link
              to="/teacher/exam-builder"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Open Exam Builder</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
