import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { notebookService } from '../../services/notebookService';
import { StatCard } from '../../components/ui/StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const StudentAnalytics: React.FC = () => {
  const [papers] = useState(() => apiClient.getPracticePapers());
  const [notebooks] = useState(() => notebookService.getNotebooks());

  const recentAttempts = papers.flatMap((paper) =>
    (paper.attempts || []).map((att) => ({
      id: att.id,
      title: paper.title,
      date: att.completedAt.split('T')[0],
      score: att.score,
      total: att.totalMarks,
      percentage: att.percentage,
      topicBreakdown: att.topicBreakdown || [],
    }))
  );

  const avgScore =
    recentAttempts.length > 0
      ? `${Math.round(recentAttempts.reduce((sum, a) => sum + a.percentage, 0) / recentAttempts.length)}%`
      : '—';

  const topicChartData =
    recentAttempts[0]?.topicBreakdown.map((item) => ({
      topic: item.topic,
      mastery: item.total > 0 ? Math.round((item.score / item.total) * 100) : 0,
    })) || [];

  const masteredNotebooks = notebooks.filter((n) => n.progressPercent >= 75).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Performance & Revision Analytics
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Learning diagnostic computed from completed practice attempts and active subject notebooks.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Practice Average"
          value={avgScore}
          subtext={recentAttempts.length > 0 ? `Across ${recentAttempts.length} attempts` : 'No attempts yet'}
          icon={Award}
        />
        <StatCard
          label="Active Notebooks"
          value={notebooks.length}
          subtext={`${masteredNotebooks} at ≥75% mastery`}
          icon={BookOpen}
        />
        <StatCard
          label="Completed Attempts"
          value={recentAttempts.length}
          subtext="Recorded sessions"
          icon={CheckCircle2}
        />
        <StatCard
          label="Available Papers"
          value={papers.length}
          subtext="Ready for practice"
          icon={TrendingUp}
        />
      </div>

      {/* Charts & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Latest Attempt Breakdown
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Per-question accuracy from your most recent practice submission
            </p>
          </div>

          {topicChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-[hsl(var(--border))] rounded-lg p-6 space-y-2">
              <TrendingUp className="w-7 h-7 text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                No analytics data yet
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-xs">
                Submit a practice paper to view your topic-level accuracy breakdown here.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topicChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} unit="%" />
                  <YAxis dataKey="topic" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={110} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(val: unknown) => [`${val}%`, 'Score']}
                  />
                  <Bar
                    dataKey="mastery"
                    fill="hsl(var(--chart-1))"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Revision Guidance
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              Targeted action items populate automatically as practice data is recorded.
            </p>

            <div className="p-6 rounded-lg border border-dashed border-[hsl(var(--border))] text-center space-y-1.5">
              <div className="text-xs font-medium text-[hsl(var(--foreground))]">
                No prioritized flags
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Attempt practice papers or review bookmarked questions to generate revision priorities.
              </p>
            </div>
          </div>

          <Link
            to="/student/questions"
            className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium transition-colors"
          >
            <span>Open Question Bank</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Attempt History Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Practice Attempt History
          </h2>
          <Link to="/student/practice" className="text-xs text-[hsl(var(--accent-text))] hover:underline">
            Practice Papers →
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))] border border-dashed border-[hsl(var(--border))] rounded-lg">
            No practice attempts recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium">
                <tr>
                  <th className="pb-2.5">Paper / Assessment</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5 text-right">Score</th>
                  <th className="pb-2.5 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {recentAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-[hsl(var(--secondary)/0.4)]">
                    <td className="py-3 font-medium text-[hsl(var(--foreground))]">
                      {att.title}
                    </td>
                    <td className="py-3 text-[hsl(var(--muted-foreground))] font-mono">{att.date}</td>
                    <td className="py-3 text-right font-mono font-semibold tabular-nums text-[hsl(var(--foreground))]">
                      {att.score} / {att.total}
                    </td>
                    <td className="py-3 text-right font-mono font-bold tabular-nums">
                      <span className={att.percentage >= 80 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}>
                        {att.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
