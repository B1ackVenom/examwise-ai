import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectNotebook, NotebookPage, NotebookStickyNote } from '../../types';
import { notebookService } from '../../services/notebookService';
import { MermaidContentRenderer } from './MermaidRenderer';
import { PomodoroTimer } from '../shared/PomodoroTimer';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Printer,
  Sparkles,
  Award,
  Calendar,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Pin,
  Type,
  ListOrdered,
  Tag,
  Share2,
  X,
} from 'lucide-react';

interface NotebookDetailViewProps {
  notebook: SubjectNotebook;
  onBack: () => void;
  onUpdate: () => void;
}

export const NotebookDetailView: React.FC<NotebookDetailViewProps> = ({
  notebook,
  onBack,
  onUpdate,
}) => {
  const { success, error } = useToast();

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'notes' | 'sticky' | 'units'>('notes');
  const [isFontHandwritten, setIsFontHandwritten] = useState(false);

  // New Page Modal State
  const [isAddPageOpen, setIsAddPageOpen] = useState(false);
  const [isDeletePageConfirmOpen, setIsDeletePageConfirmOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageUnit, setNewPageUnit] = useState(notebook.units[0] || '');
  const [newPageCue, setNewPageCue] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [newPageSummary, setNewPageSummary] = useState('');
  const [newPageTags, setNewPageTags] = useState('');

  // New Sticky Note State
  const [newStickyText, setNewStickyText] = useState('');
  const [newStickyColor, setNewStickyColor] = useState<NotebookStickyNote['color']>('yellow');

  const currentPage: NotebookPage | undefined = notebook.pages[activePageIndex];

  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim() || !newPageContent.trim()) {
      error('Please provide both page title and lecture note content.');
      return;
    }

    const cuePoints = newPageCue
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = newPageTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    notebookService.addPageToNotebook(notebook.id, {
      title: newPageTitle.trim(),
      unitOrChapter: newPageUnit,
      cuePoints,
      mainContent: newPageContent,
      summary: newPageSummary.trim(),
      tags,
    });

    success('Ruled notebook page added successfully.');
    setIsAddPageOpen(false);
    setNewPageTitle('');
    setNewPageCue('');
    setNewPageContent('');
    setNewPageSummary('');
    setNewPageTags('');
    onUpdate();
    setActivePageIndex(notebook.pages.length);
  };

  const handleConfirmDeleteCurrentPage = () => {
    if (!currentPage) return;
    notebookService.deletePageFromNotebook(notebook.id, currentPage.id);
    success('Page deleted from notebook.');
    setActivePageIndex(Math.max(0, activePageIndex - 1));
    onUpdate();
  };

  const handleAddSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim()) return;

    notebookService.addStickyNote(notebook.id, newStickyText.trim(), newStickyColor);
    success('Sticky note pinned to notebook board!');
    setNewStickyText('');
    onUpdate();
  };

  const handleDeleteSticky = (stickyId: string) => {
    notebookService.deleteStickyNote(notebook.id, stickyId);
    onUpdate();
  };

  const handlePrint = () => {
    window.print();
  };

  const stickyBgClasses: Record<NotebookStickyNote['color'], string> = {
    yellow: 'bg-amber-100 text-amber-950 border-amber-300 shadow-amber-200/40',
    pink: 'bg-rose-100 text-rose-950 border-rose-300 shadow-rose-200/40',
    cyan: 'bg-cyan-100 text-cyan-950 border-cyan-300 shadow-cyan-200/40',
    lime: 'bg-emerald-100 text-emerald-950 border-emerald-300 shadow-emerald-200/40',
    lavender: 'bg-purple-100 text-purple-950 border-purple-300 shadow-purple-200/40',
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Binder Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] transition-colors cursor-pointer"
            title="Back to all subject notebooks"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--accent-text))] border border-[hsl(var(--primary)/0.3)]">
                {notebook.subjectCode}
              </span>
              <span className="text-[hsl(var(--muted-foreground))]">·</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {notebook.semester} · {notebook.instructor}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
              {notebook.subjectTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print/Export Study Sheet */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Print or save as study guide PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Study Guide</span>
          </button>

          {/* Handwriting / Clean Font Toggle */}
          <button
            onClick={() => setIsFontHandwritten(!isFontHandwritten)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isFontHandwritten
                ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
            }`}
            title="Toggle authentic handwritten note style"
          >
            <Type className="w-3.5 h-3.5" />
            <span>{isFontHandwritten ? 'Script Ink Style' : 'Clean Print Style'}</span>
          </button>

          {/* Add Page Button */}
          <button
            onClick={() => setIsAddPageOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Write New Page</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Notebook Paper Binder on Left (2/3) + Study Sidebar on Right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Real-Life Ruled Notebook Paper Canvas (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Pagination & Page Title Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-xs">
            <div className="flex items-center gap-2">
              <button
                disabled={activePageIndex === 0}
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono font-semibold text-[hsl(var(--foreground))]">
                Page {notebook.pages.length === 0 ? 0 : activePageIndex + 1} of {notebook.pages.length}
              </span>

              <button
                disabled={activePageIndex >= notebook.pages.length - 1}
                onClick={() =>
                  setActivePageIndex((prev) => Math.min(notebook.pages.length - 1, prev + 1))
                }
                className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {currentPage && (
              <div className="flex items-center gap-2 truncate">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                  {currentPage.unitOrChapter} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                <button
                  onClick={() => setIsDeletePageConfirmOpen(true)}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:text-rose-500 transition-colors cursor-pointer"
                  title="Delete this page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* REAL-LIFE RULED PAPER BINDER CONTAINER */}
          {notebook.pages.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--accent-text))] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
                  This notebook is fresh & unwritten
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
                  Click below to write your first Cornell-style ruled lecture page, record theorems, and track key exam questions.
                </p>
              </div>
              <button
                onClick={() => setIsAddPageOpen(true)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Write First Notebook Page</span>
              </button>
            </div>
          ) : currentPage ? (
            <div
              className={`relative rounded-2xl shadow-xl overflow-hidden border border-slate-300/80 dark:border-slate-700 transition-all ${
                isFontHandwritten ? 'font-serif' : 'font-sans'
              }`}
              style={{
                // Ruled Paper Aesthetic: faint horizontal lines + cream/white paper tone
                backgroundColor: '#FAF9F6',
                color: '#1a1f2c',
                backgroundImage:
                  'linear-gradient(#FAF9F6 0px, transparent 1px), linear-gradient(to right, transparent 65px, #f43f5e 65px, #f43f5e 66px, transparent 66px)',
                backgroundSize: '100% 28px, 100% 100%',
                lineHeight: '28px',
              }}
            >
              {/* Left Spiral Perforations / Binder Rings Effect */}
              <div className="absolute top-0 bottom-0 left-0 w-8 flex flex-col justify-around py-4 z-10 pointer-events-none">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 rounded-full bg-slate-300/80 shadow-inner border border-slate-400/60 ml-2"
                  />
                ))}
              </div>

              {/* Main Paper Content Container (Offset by red margin line at 65px) */}
              <div className="pl-20 pr-6 py-6 space-y-6">
                {/* Page Header Strip with dynamically synced system date */}
                <div className="border-b-2 border-slate-300 pb-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span className="font-bold uppercase tracking-wider text-indigo-700">
                      {notebook.subjectCode} · {currentPage.unitOrChapter}
                    </span>
                    <span>Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1 font-display tracking-tight">
                    {currentPage.title}
                  </h2>
                </div>

                {/* Cornell Note Layout: 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[380px]">
                  {/* Left: Cue Column (Recall keywords, formulas, questions) */}
                  <div className="md:col-span-4 border-r border-slate-300/80 pr-4 space-y-3">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-600">
                      Cue Triggers & Keywords
                    </div>
                    <ul className="space-y-2 text-xs text-slate-800">
                      {currentPage.cuePoints.map((cue, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span className="font-semibold">{cue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right: Main Ruled Lecture Notes with Mermaid Diagram Support */}
                  <div className="md:col-span-8 space-y-3">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Lecture Notes & Visual Models
                    </div>
                    <div className="text-xs text-slate-900 leading-relaxed font-normal">
                      <MermaidContentRenderer content={currentPage.mainContent} />
                    </div>
                  </div>
                </div>

                {/* Bottom: Cornell Summary Box */}
                {currentPage.summary && (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs space-y-1">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Page Summary & Exam Takeaway</span>
                    </div>
                    <p className="text-slate-800 italic leading-snug">{currentPage.summary}</p>
                  </div>
                )}

                {/* Tags Footer */}
                {currentPage.tags && currentPage.tags.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentPage.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Study Sidebar (Pomodoro Timer + Sticky Notes Board + Units) (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Pomodoro Focus Sprint Widget */}
          <PomodoroTimer subjectName={notebook.subjectTitle} />

          {/* Sticky Notes & Flashcards Board */}
          <div className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider font-mono">
                  Sticky Recall Board ({notebook.stickyNotes.length})
                </h3>
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Drag & Recall</span>
            </div>

            {/* Quick Add Sticky Note Form */}
            <form onSubmit={handleAddSticky} className="space-y-2">
              <input
                type="text"
                aria-label="Sticky note text"
                value={newStickyText}
                onChange={(e) => setNewStickyText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
              />

              <div className="flex items-center justify-between">
                {/* Color swatches */}
                <div className="flex items-center gap-1.5">
                  {(['yellow', 'pink', 'cyan', 'lime', 'lavender'] as NotebookStickyNote['color'][]).map(
                    (col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewStickyColor(col)}
                        className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                          newStickyColor === col
                            ? 'scale-125 ring-1 ring-offset-1 ring-[hsl(var(--ring))]'
                            : 'opacity-70 hover:opacity-100'
                        } ${
                          col === 'yellow'
                            ? 'bg-amber-300'
                            : col === 'pink'
                            ? 'bg-rose-300'
                            : col === 'cyan'
                            ? 'bg-cyan-300'
                            : col === 'lime'
                            ? 'bg-emerald-300'
                            : 'bg-purple-300'
                        }`}
                        title={col}
                      />
                    )
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!newStickyText.trim()}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Pin Note</span>
                </button>
              </div>
            </form>

            {/* Sticky Notes Cards Grid */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {notebook.stickyNotes.map((sn) => (
                <div
                  key={sn.id}
                  className={`p-3 rounded-xl border shadow-sm space-y-1 relative group transition-transform hover:scale-[1.02] ${
                    stickyBgClasses[sn.color] || stickyBgClasses.yellow
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-snug">{sn.text}</p>
                    <button
                      onClick={() => handleDeleteSticky(sn.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-700 transition-opacity p-0.5 cursor-pointer shrink-0"
                      title="Delete sticky"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono text-right">
                    {sn.createdAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Syllabus Units Outline */}
          <div className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-500" />
                <h3 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider font-mono">
                  Syllabus Units ({notebook.units.length})
                </h3>
              </div>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold font-mono">
                {notebook.progressPercent}% Target
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-[hsl(var(--foreground))]">
              {notebook.units.map((unit, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                    <span className="truncate">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Page Modal */}
      <AnimatePresence>
        {isAddPageOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPageOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.16 }}
              className="relative w-full max-w-2xl bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--background)/0.5)]">
                <h2 className="text-base font-bold text-[hsl(var(--foreground))] font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[hsl(var(--accent-text))]" />
                  Write New Ruled Notebook Page
                </h2>
                <button
                  onClick={() => setIsAddPageOpen(false)}
                  className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddPage} className="p-6 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[hsl(var(--foreground))] mb-1">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[hsl(var(--foreground))] mb-1">
                      Related Unit
                    </label>
                    <select
                      value={newPageUnit}
                      onChange={(e) => setNewPageUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="">General</option>
                      {notebook.units.map((u, i) => (
                        <option key={i} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[hsl(var(--foreground))] mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={newPageTags}
                      onChange={(e) => setNewPageTags(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] font-mono"
                    />
                  </div>
                </div>

                {/* Cornell Cue Column Triggers */}
                <div>
                  <label className="block font-semibold text-[hsl(var(--foreground))] mb-1">
                    Cornell Cue Column Triggers (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={newPageCue}
                    onChange={(e) => setNewPageCue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] font-mono text-[11px]"
                  />
                </div>

                {/* Main Lecture Notes Content */}
                <div>
                  <label className="block font-semibold text-[hsl(var(--foreground))] mb-1">
                    Lecture Notes & Derivations *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={newPageContent}
                    onChange={(e) => setNewPageContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] font-mono text-[11px]"
                  />
                </div>

                {/* Cornell Summary */}
                <div>
                  <label className="block font-semibold text-[hsl(var(--foreground))] mb-1">
                    Cornell Page Summary (Key Exam Takeaway)
                  </label>
                  <input
                    type="text"
                    value={newPageSummary}
                    onChange={(e) => setNewPageSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPageOpen(false)}
                    className="px-4 py-2 font-semibold rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save to Notebook</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        isOpen={isDeletePageConfirmOpen}
        onClose={() => setIsDeletePageConfirmOpen(false)}
        onConfirm={handleConfirmDeleteCurrentPage}
        title="Delete Notebook Page"
        message={`Delete page "${currentPage?.title || ''}" from this notebook?`}
        confirmLabel="Delete Page"
        variant="danger"
      />
    </div>
  );
};
