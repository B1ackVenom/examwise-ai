import React, { useState, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { PublishedStudentResult } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Download,
  Search,
  BarChart3,
  CheckCircle2,
  Award,
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

export const ResultsReporting: React.FC = () => {
  const { success, info } = useToast();
  const [results, setResults] = useState<PublishedStudentResult[]>(() =>
    apiClient.getPublishedResults()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.publicationStatus === statusFilter;
      const matchSearch =
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.studentRoll.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [results, statusFilter, searchQuery]);

  const scoreDistributionData = useMemo(() => {
    if (results.length === 0) return [];
    return [
      { range: '90-100% (O)', count: results.filter((r) => r.percentage >= 90).length },
      { range: '80-89% (A+)', count: results.filter((r) => r.percentage >= 80 && r.percentage < 90).length },
      { range: '70-79% (A)', count: results.filter((r) => r.percentage >= 70 && r.percentage < 80).length },
      { range: '60-69% (B+)', count: results.filter((r) => r.percentage >= 60 && r.percentage < 70).length },
      { range: '< 60%', count: results.filter((r) => r.percentage < 60).length },
    ];
  }, [results]);

  const handlePublishResult = (resultId: string) => {
    const updated = apiClient.publishResult(resultId);
    if (updated) {
      setResults(apiClient.getPublishedResults());
      success(`Result for ${updated.studentName} officially published.`);
    }
  };

  const handleExportCsv = () => {
    if (filteredResults.length === 0) {
      info('No results available to export.');
      return;
    }
    const csvContent = apiClient.exportResultsCsv(filteredResults);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ExamWise_Cohort_Results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Exported ${filteredResults.length} student results to CSV.`);
  };

  const avgPercentage =
    results.length > 0
      ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Official Results & Performance Reports
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Publish finalized semester marks, view cohort percentile distributions, and export official grade sheets.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredResults.length === 0}
          className="px-3.5 py-2 border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Results (CSV)</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Evaluated Candidates</span>
          <div className="text-2xl font-bold font-mono text-[hsl(var(--foreground))] mt-2">
            {results.length} Students
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Recorded assessments</div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Cohort Mean Score</span>
          <div className="text-2xl font-bold font-mono text-[hsl(var(--accent-text))] mt-2">
            {results.length > 0 ? `${avgPercentage}%` : '—'}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Passing threshold: 40%</div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Publication Status</span>
          <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-2">
            {results.filter((r) => r.publicationStatus === 'published').length} / {results.length}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Released to Student Portal</div>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Outstanding (O Grade)</span>
          <div className="text-2xl font-bold font-mono text-[hsl(var(--foreground))] mt-2">
            {results.filter((r) => r.grade.startsWith('O')).length} Candidates
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Score ≥ 90%</div>
        </div>
      </div>

      {/* Cohort Grade Distribution Chart */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          Cohort Grade Band Frequencies
        </h2>

        {scoreDistributionData.length > 0 ? (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistributionData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
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
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Students Count" barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border))] rounded-lg text-center p-4 space-y-1.5">
            <BarChart3 className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              No grade distribution available yet
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Grade bands will render here once student examination results are recorded.
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
            aria-label="Search student results"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
          >
            <option value="all">All Release States</option>
            <option value="published">Published</option>
            <option value="draft">Draft / Unpublished</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span>Displaying {filteredResults.length} Candidate Results</span>
        </div>

        {filteredResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] text-[hsl(var(--muted-foreground))] font-medium">
                <tr>
                  <th className="p-4">Roll Number</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Course</th>
                  <th className="p-4 text-center">Marks Awarded</th>
                  <th className="p-4 text-center">Percentage</th>
                  <th className="p-4 text-center">Grade</th>
                  <th className="p-4 text-center">Faculty Approval</th>
                  <th className="p-4 text-center">Publication Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredResults.map((res) => (
                  <tr key={res.id} className="hover:bg-[hsl(var(--secondary)/0.4)]">
                    <td className="p-4 font-mono font-medium text-[hsl(var(--foreground))]">
                      {res.studentRoll}
                    </td>
                    <td className="p-4 font-medium text-[hsl(var(--foreground))]">
                      {res.studentName}
                    </td>
                    <td className="p-4 font-mono text-[hsl(var(--muted-foreground))]">
                      {res.courseCode}
                    </td>
                    <td className="p-4 text-center font-mono font-bold tabular-nums text-[hsl(var(--foreground))]">
                      {res.totalMarks} / {res.maxMarks}
                    </td>
                    <td className="p-4 text-center font-mono font-bold tabular-nums text-[hsl(var(--accent-text))]">
                      {res.percentage}%
                    </td>
                    <td className="p-4 text-center font-medium text-[hsl(var(--foreground))]">
                      {res.grade}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-[11px] font-semibold ${
                          res.publicationStatus === 'published'
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {res.publicationStatus === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {res.publicationStatus === 'draft' ? (
                        <button
                          onClick={() => handlePublishResult(res.id)}
                          className="px-2.5 py-1 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded text-xs font-medium transition-colors"
                        >
                          Publish
                        </button>
                      ) : (
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                          {res.publishedDate}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <Award className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              No candidate results recorded yet
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Approved examination evaluations will appear here for publication and CSV export.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
