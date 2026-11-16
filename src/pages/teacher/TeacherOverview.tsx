import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useRole } from '../../context/RoleContext';
import { StatCard } from '../../components/ui/StatCard';
import {
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const TeacherOverview: React.FC = () => {
  const { user } = useRole();
  const [exams] = useState(() => apiClient.getExams());
  const [submissions] = useState(() => apiClient.getSubmissions());
  const [batches] = useState(() => apiClient.getMarksheetBatches());
  const [results] = useState(() => apiClient.getPublishedResults());

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending' || s.status === 'in_review');
  const awaitingApproval = submissions.filter((s) => s.status === 'reviewed' && !s.isTeacherApproved);
  const flaggedCount = batches.reduce((acc, b) => acc + b.flaggedRows, 0);

  const scoreDistribution = useMemo(() => {
    const percentages =
      results.length > 0
        ? results.map((r) => r.percentage)
        : submissions
            .filter((s) => s.totalMaxMarks > 0)
            .map((s) => Math.round((s.totalAwardedMarks / s.totalMaxMarks) * 100));

    if (percentages.length === 0) return [];

    return [
      { range: '< 50%', count: percentages.filter((p) => p < 50).length },
      { range: '50-65%', count: percentages.filter((p) => p >= 50 && p < 65).length },
      { range: '65-80%', count: percentages.filter((p) => p >= 65 && p < 80).length },
      { range: '80-90%', count: percentages.filter((p) => p >= 80 && p < 90).length },
      { range: '90-100%', count: percentages.filter((p) => p >= 90).length },
    ];
  }, [results, submissions]);

  const subtitleParts = [user?.name, user?.department, user?.institution].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Teacher Evaluation & Course Administration
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Faculty Evaluation Workspace'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/teacher/evaluation"
            className="px-3.5 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-2"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Open Evaluation Workbench</span>
          </Link>
          <Link
            to="/teacher/exam-builder"
            className="px-3.5 py-2 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors"
          >
            Create Examination
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Examinations"
          value={exams.filter((e) => e.status !== 'draft').length}
          subtext={`${exams.length} total configured`}
          icon={FileText}
        />
        <StatCard
          label="Submissions Awaiting Review"
          value={pendingSubmissions.length}
          subtext="Requires teacher grading verification"
          badge={pendingSubmissions.length > 0 ? 'Action Needed' : undefined}
          icon={Clock}
        />
        <StatCard
          label="Awaiting Final Approval"
          value={awaitingApproval.length}
          subtext="Pending examiner sign-off"
          icon={ShieldCheck}
        />
        <StatCard
          label="Marksheet Batches"
          value={batches.length}
          subtext={`${flaggedCount} arithmetic discrepancies`}
          icon={FileSpreadsheet}
        />
      </div>

      {/* Main Dual Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions Action Queue (2 cols) */}
        <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                Evaluation Action Queue
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Instructor review and approval required before publishing results.
              </p>
            </div>
            <Link
              to="/teacher/evaluation"
              className="text-xs text-[hsl(var(--accent-text))] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Full Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">
                  <tr>
                    <th className="pb-2.5">Roll Number</th>
                    <th className="pb-2.5">Student Name</th>
                    <th className="pb-2.5">OCR Conf.</th>
                    <th className="pb-2.5">AI Proposed</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {submissions.slice(0, 4).map((sub) => (
                    <tr key={sub.id} className="hover:bg-[hsl(var(--secondary)/0.4)]">
                      <td className="py-3 font-mono font-medium text-[hsl(var(--foreground))]">
                        {sub.studentRoll}
                      </td>
                      <td className="py-3 text-[hsl(var(--foreground))]">
                        {sub.studentName}
                      </td>
                      <td className="py-3 font-mono text-[hsl(var(--muted-foreground))]">
                        {sub.avgOcrConfidence}%
                      </td>
                      <td className="py-3 font-mono font-semibold tabular-nums text-[hsl(var(--accent-text))]">
                        {sub.totalAwardedMarks} / {sub.totalMaxMarks}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-[11px] font-medium ${
                            sub.status === 'approved'
                              ? 'text-teal-600 dark:text-teal-400'
                              : sub.status === 'published'
                              ? 'text-[hsl(var(--accent-text))]'
                              : sub.status === 'in_review'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[hsl(var(--muted-foreground))]'
                          }`}
                        >
                          {sub.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/teacher/evaluation?submissionId=${sub.id}`}
                          className="px-2.5 py-1 text-xs font-medium text-[hsl(var(--accent-text))] hover:bg-[hsl(var(--primary)/0.1)] rounded border border-[hsl(var(--primary)/0.3)] transition-colors"
                        >
                          Evaluate →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-[hsl(var(--border))] rounded-lg space-y-2">
              <FileCheck2 className="w-7 h-7 mx-auto text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                No answer booklet submissions in queue
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Submissions uploaded for your examinations will appear here for evaluation.
              </p>
            </div>
          )}
        </div>

        {/* Quick Operations Strip (1 col) */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Expedited Workflows
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Access key examination tools and marksheet verification.
            </p>

            <div className="space-y-2.5 pt-1">
              <Link
                to="/teacher/evaluation"
                className="p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)] transition-colors flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-text))] transition-colors">
                    Handwritten Answer Booklet Evaluation
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Review OCR text, rubric scoring, and override marks.
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>

              <Link
                to="/teacher/marksheets"
                className="p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)] transition-colors flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-text))] transition-colors">
                    Marksheet Arithmetic Verification
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Extract awarded marks and detect mathematical sum mismatches.
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>

              <Link
                to="/teacher/exam-builder"
                className="p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)] transition-colors flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-text))] transition-colors">
                    Create Examination with Rubrics
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    5-step builder with automated mark-sum validation.
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
            <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Notice on AI Evaluation
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              AI-proposed marks never automatically publish as final scores. Teacher review and explicit approval are mandatory per institutional grading standards.
            </p>
          </div>
        </div>
      </div>

      {/* Cohort Score Distribution Chart */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Cohort Score Distribution
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Marks bracket spread across evaluated answer booklets and results
            </p>
          </div>
          <Link to="/teacher/results" className="text-xs text-[hsl(var(--accent-text))] hover:underline">
            Detailed Grade Reports →
          </Link>
        </div>

        {scoreDistribution.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} vertical={false} />
                <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Evaluated Count" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border))] rounded-lg text-center p-4 space-y-1.5">
            <BarChart3 className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              No evaluated scores recorded yet
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Score brackets will populate automatically once submissions are graded or results are recorded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
