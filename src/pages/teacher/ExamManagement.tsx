import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { Exam, ExamStatus } from '../../types';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  Search,
  Plus,
  FileCheck2,
  Calendar,
  Clock,
  Trash2,
  FileText,
} from 'lucide-react';

export const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>(() => apiClient.getExams());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  const { info } = useToast();

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || e.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteExam = () => {
    if (!examToDelete) return;
    apiClient.deleteExam(examToDelete.id);
    setExams(apiClient.getExams());
    setExamToDelete(null);
    info(`Exam "${examToDelete.title}" deleted.`);
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'published':
        return <span className="text-teal-600 dark:text-teal-400 font-medium">Published</span>;
      case 'evaluation_in_progress':
        return <span className="text-amber-600 dark:text-amber-400 font-medium">Evaluation in Progress</span>;
      case 'awaiting_approval':
        return <span className="text-[hsl(var(--accent-text))] font-medium">Awaiting Approval</span>;
      case 'completed':
        return <span className="text-[hsl(var(--muted-foreground))] font-medium">Completed</span>;
      default:
        return <span className="text-[hsl(var(--muted-foreground))] font-medium">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
            Examination Management
          </h1>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Track scheduled test definitions, evaluation workflow status, and cohort submission pipelines.
          </p>
        </div>

        <Link
          to="/teacher/exam-builder"
          className="px-3.5 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Examination</span>
        </Link>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            aria-label="Search examinations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
        >
          <option value="all">All Statuses</option>
          <option value="evaluation_in_progress">Evaluation in Progress</option>
          <option value="awaiting_approval">Awaiting Approval</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Exams Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span>Showing {filteredExams.length} examinations</span>
        </div>

        {filteredExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] text-[hsl(var(--muted-foreground))] font-medium">
                <tr>
                  <th className="p-4">Exam Code & Title</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Max Marks</th>
                  <th className="p-4">Submissions</th>
                  <th className="p-4">Evaluation Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-[hsl(var(--secondary)/0.4)]">
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs font-semibold text-[hsl(var(--accent-text))]">
                          {exam.code}
                        </div>
                        <div className="font-medium text-[hsl(var(--foreground))]">
                          {exam.title}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-[hsl(var(--muted-foreground))]">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[hsl(var(--foreground))]">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{exam.date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                          <Clock className="w-3 h-3" />
                          <span>{exam.durationMinutes} mins</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-semibold tabular-nums text-[hsl(var(--foreground))]">
                      {exam.maxMarks} Marks
                    </td>

                    <td className="p-4 font-mono tabular-nums text-[hsl(var(--foreground))]">
                      <div>{exam.submissionsCount} received</div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {exam.evaluatedCount} evaluated
                      </div>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(exam.status)}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/teacher/evaluation?examId=${exam.id}`}
                          className="px-2.5 py-1 text-xs font-medium text-[hsl(var(--accent-text))] hover:bg-[hsl(var(--primary)/0.1)] rounded border border-[hsl(var(--primary)/0.3)] transition-colors flex items-center gap-1"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Workbench</span>
                        </Link>

                        <button
                          onClick={() => setExamToDelete(exam)}
                          className="p-1 text-[hsl(var(--muted-foreground))] hover:text-rose-500 transition-colors"
                          title="Delete exam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2.5">
            <FileText className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
            <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
              No examinations found
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Create a new examination in the builder to set questions, answer keys, and rubrics.
            </p>
            <div className="pt-1">
              <Link
                to="/teacher/exam-builder"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Examination</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={handleDeleteExam}
        title="Delete Examination"
        message={`Are you sure you want to delete "${examToDelete?.title}"? This will remove all associated question configurations.`}
        confirmLabel="Delete Exam"
        variant="danger"
      />
    </div>
  );
};
