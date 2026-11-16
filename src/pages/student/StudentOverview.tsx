import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { notebookService } from '../../services/notebookService';
import { useRole } from '../../context/RoleContext';
import { StatCard } from '../../components/ui/StatCard';
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const StudentOverview: React.FC = () => {
  const { user } = useRole();
  const [courses] = useState(() => apiClient.getCourses());
  const [exams] = useState(() => apiClient.getExams());
  const [papers] = useState(() => apiClient.getPracticePapers());
  const [notebooks] = useState(() => notebookService.getNotebooks());

  const upcomingExams = exams.filter((e) => e.status !== 'completed');
  const allAttempts = papers.flatMap((p) =>
    (p.attempts || []).map((a) => ({
      paperTitle: p.title,
      percentage: a.percentage,
      completedAt: a.completedAt,
    }))
  );

  const performanceTrend = allAttempts
    .slice()
    .reverse()
    .map((att, index) => ({
      label: `#${index + 1}`,
      score: att.percentage,
    }));

  const avgPracticeScore =
    allAttempts.length > 0
      ? `${Math.round(allAttempts.reduce((sum, a) => sum + a.percentage, 0) / allAttempts.length)}%`
      : '—';

  const avgProgress =
    courses.length > 0
      ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
      : notebooks.length > 0
      ? Math.round(notebooks.reduce((sum, n) => sum + n.progressPercent, 0) / notebooks.length)
      : 0;

  const totalModules = courses.reduce((sum, c) => sum + c.modulesCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Welcome Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Student Preparation Hub
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {user?.name} · {user?.department}
            {user?.semester ? ` · ${user.semester}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/student/practice"
            className="px-3.5 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Practice Papers</span>
          </Link>
          <Link
            to="/student/questions"
            className="px-3.5 py-2 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors"
          >
            High-Yield Questions
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Subject Notebooks"
          value={notebooks.length}
          subtext={courses.length > 0 ? `${courses.length} courses · ${totalModules} modules` : 'Digital binders'}
          icon={BookOpen}
        />
        <StatCard
          label="Syllabus Coverage"
          value={`${avgProgress}%`}
          subtext={notebooks.length > 0 || courses.length > 0 ? 'Computed from active subjects' : 'No subjects added yet'}
          icon={TrendingUp}
        />
        <StatCard
          label="Upcoming Exams"
          value={upcomingExams.length}
          subtext={upcomingExams[0] ? `Next: ${upcomingExams[0].code} (${upcomingExams[0].date})` : 'No scheduled exams'}
          icon={Calendar}
        />
        <StatCard
          label="Practice Average"
          value={avgPracticeScore}
          subtext={allAttempts.length > 0 ? `${allAttempts.length} completed attempts` : 'No attempts recorded'}
          icon={Award}
        />
      </div>

      {/* Performance Over Time Chart & Revision Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                Practice Score Trajectory
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Recorded assessment percentage across completed practice attempts
              </p>
            </div>
          </div>

          {performanceTrend.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-[hsl(var(--border))] rounded-lg p-6 space-y-2">
              <TrendingUp className="w-7 h-7 text-[hsl(var(--muted-foreground))]" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                No practice attempts recorded yet
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-xs">
                Complete a practice paper to view your score progression chart here.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" name="Score %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revision Areas Column */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Recommended Revision Areas
              </h2>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              Generated from completed practice assessments and question bank records.
            </p>

            <div className="p-6 rounded-lg border border-dashed border-[hsl(var(--border))] text-center space-y-1.5">
              <div className="text-xs font-medium text-[hsl(var(--foreground))]">
                No revision alerts yet
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Weak topics will appear once practice attempts or backend diagnostics are available.
              </p>
            </div>
          </div>

          <Link
            to="/student/questions"
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors"
          >
            <span>Open Question Bank</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Subject Notebooks & Upcoming Examinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))] font-display">
                My Subject Notebooks
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Personal subject binders & Cornell lecture notes
              </p>
            </div>
            <Link
              to="/student/courses"
              className="text-xs text-[hsl(var(--accent-text))] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Open Shelf</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {notebooks.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-[hsl(var(--border))] space-y-2">
              <BookOpen className="w-7 h-7 text-[hsl(var(--muted-foreground))] mx-auto" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                No subject notebooks created yet
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Create your first subject notebook to organize units, lecture notes, and sticky recall cards.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {notebooks.slice(0, 3).map((nb) => (
                <Link
                  key={nb.id}
                  to="/student/courses"
                  className="relative rounded-xl p-3.5 pl-5 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] hover:border-[hsl(var(--ring))] transition-all overflow-hidden flex flex-col justify-between min-h-[120px] group"
                >
                  <div>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--accent-text))]">
                      {nb.subjectCode}
                    </span>
                    <div className="font-display font-bold text-xs mt-1.5 leading-tight text-[hsl(var(--foreground))] line-clamp-2">
                      {nb.subjectTitle}
                    </div>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center justify-between">
                      <span>{nb.pages.length} Pages</span>
                      <span className="font-mono font-bold text-[hsl(var(--foreground))]">{nb.progressPercent}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))]">
            <span>Includes Cornell note layout, ruled pages & sticky notes</span>
            <Link
              to="/student/courses"
              className="text-[hsl(var(--accent-text))] font-semibold hover:underline"
            >
              + Bind New Notebook
            </Link>
          </div>
        </div>

        {/* Upcoming Official Examinations */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Scheduled Examinations
            </h2>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Assessment Schedule</span>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-[hsl(var(--border))] space-y-2">
              <Calendar className="w-7 h-7 text-[hsl(var(--muted-foreground))] mx-auto" />
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                No upcoming examinations scheduled
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Published exams from faculty or your connected backend will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[hsl(var(--accent-text))]">
                        {exam.code}
                      </span>
                      <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                        {exam.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {exam.date}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {exam.durationMinutes} mins
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">Max: {exam.maxMarks} marks</span>
                    </div>
                  </div>

                  <Link
                    to="/student/practice"
                    className="px-3 py-1.5 text-xs font-medium text-[hsl(var(--accent-text))] hover:bg-[hsl(var(--primary)/0.1)] rounded-md border border-[hsl(var(--primary)/0.3)] transition-colors whitespace-nowrap"
                  >
                    Practice
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
