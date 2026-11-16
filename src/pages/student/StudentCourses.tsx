import React, { useState } from 'react';
import { SubjectNotebook } from '../../types';
import { notebookService } from '../../services/notebookService';
import { NotebookCard } from '../../components/notebooks/NotebookCard';
import { CreateNotebookModal } from '../../components/notebooks/CreateNotebookModal';
import { NotebookDetailView } from '../../components/notebooks/NotebookDetailView';
import {
  BookOpen,
  Plus,
  Search,
} from 'lucide-react';

export const StudentCourses: React.FC = () => {
  const [notebooks, setNotebooks] = useState<SubjectNotebook[]>(() => notebookService.getNotebooks());
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');

  const handleRefresh = () => {
    setNotebooks(notebookService.getNotebooks());
  };

  const handleCreateNotebook = (data: Parameters<typeof notebookService.createNotebook>[0]) => {
    const created = notebookService.createNotebook(data);
    handleRefresh();
    setActiveNotebookId(created.id);
  };

  const handleDeleteNotebook = (id: string) => {
    notebookService.deleteNotebook(id);
    handleRefresh();
  };

  const activeNotebook = activeNotebookId ? notebookService.getNotebookById(activeNotebookId) : null;

  const uniqueSemesters = Array.from(
    new Set(notebooks.map((n) => n.semester).filter(Boolean))
  );

  const filteredNotebooks = notebooks.filter((nb) => {
    const matchesSearch =
      nb.subjectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nb.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nb.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSem =
      selectedSemester === 'all' || nb.semester.toLowerCase() === selectedSemester.toLowerCase();
    return matchesSearch && matchesSem;
  });

  return (
    <div className="space-y-6">
      {activeNotebook ? (
        <NotebookDetailView
          notebook={activeNotebook}
          onBack={() => setActiveNotebookId(null)}
          onUpdate={handleRefresh}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                  SUBJECT BINDERS
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">·</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {notebooks.length} Active Subject Notebooks
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display mt-0.5">
                My Subject Notebooks & Study Binders
              </h1>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Organize subjects with ruled paper, Cornell lecture notes, cue triggers, and sticky revision tags.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Bind New Subject Notebook</span>
              </button>
            </div>
          </div>

          {/* Search & Semester Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[hsl(var(--muted-foreground))] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search subject notebooks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--secondary)/0.6)] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] cursor-pointer"
              >
                <option value="all">All Semesters</option>
                {uniqueSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notebooks Grid Shelf */}
          {filteredNotebooks.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
              <BookOpen className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto" />
              <div className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {notebooks.length === 0
                  ? 'No subject notebooks yet'
                  : `No notebooks matching "${searchQuery}"`}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Create a subject notebook to begin organizing your syllabus units and notes.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-xs cursor-pointer transition-colors"
              >
                Create Subject Notebook
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotebooks.map((notebook) => (
                <NotebookCard
                  key={notebook.id}
                  notebook={notebook}
                  onOpen={(id) => setActiveNotebookId(id)}
                  onDelete={handleDeleteNotebook}
                />
              ))}
            </div>
          )}

          <CreateNotebookModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateNotebook}
          />
        </div>
      )}
    </div>
  );
};
