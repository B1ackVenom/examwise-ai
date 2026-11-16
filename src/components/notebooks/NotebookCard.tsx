import React from 'react';
import { motion } from 'motion/react';
import { SubjectNotebook } from '../../types';
import {
  BookOpen,
  Calendar,
  Sparkles,
  Award,
  Clock,
  Bookmark,
  ChevronRight,
  FileText,
  Trash2,
} from 'lucide-react';

interface NotebookCardProps {
  notebook: SubjectNotebook;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
  notebook,
  onOpen,
  onDelete,
}) => {
  // Theme color maps for authentic physical notebook covers
  const themeStyles = {
    navy: {
      cover: 'from-[#1e293b] via-[#0f172a] to-[#020617]',
      spine: 'bg-indigo-950 border-r-2 border-indigo-700/40',
      spineStitch: 'border-indigo-400/30',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      ribbon: 'bg-indigo-500',
      glow: 'shadow-indigo-900/30',
    },
    emerald: {
      cover: 'from-[#064e3b] via-[#022c22] to-[#011e17]',
      spine: 'bg-emerald-950 border-r-2 border-emerald-700/40',
      spineStitch: 'border-emerald-400/30',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      ribbon: 'bg-emerald-500',
      glow: 'shadow-emerald-900/30',
    },
    crimson: {
      cover: 'from-[#881337] via-[#4c0519] to-[#26030c]',
      spine: 'bg-rose-950 border-r-2 border-rose-700/40',
      spineStitch: 'border-rose-400/30',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      ribbon: 'bg-rose-500',
      glow: 'shadow-rose-900/30',
    },
    amethyst: {
      cover: 'from-[#581c87] via-[#3b0764] to-[#200336]',
      spine: 'bg-purple-950 border-r-2 border-purple-700/40',
      spineStitch: 'border-purple-400/30',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      ribbon: 'bg-purple-500',
      glow: 'shadow-purple-900/30',
    },
    amber: {
      cover: 'from-[#78350f] via-[#451a03] to-[#270f02]',
      spine: 'bg-amber-950 border-r-2 border-amber-700/40',
      spineStitch: 'border-amber-400/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      ribbon: 'bg-amber-500',
      glow: 'shadow-amber-900/30',
    },
    slate: {
      cover: 'from-[#334155] via-[#1e293b] to-[#0f172a]',
      spine: 'bg-slate-900 border-r-2 border-slate-600/40',
      spineStitch: 'border-slate-400/30',
      badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      ribbon: 'bg-slate-400',
      glow: 'shadow-slate-900/30',
    },
    teal: {
      cover: 'from-[#134e4a] via-[#042f2e] to-[#021f1e]',
      spine: 'bg-teal-950 border-r-2 border-teal-700/40',
      spineStitch: 'border-teal-400/30',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      ribbon: 'bg-teal-500',
      glow: 'shadow-teal-900/30',
    },
  };

  const style = themeStyles[notebook.colorTheme] || themeStyles.navy;
  const latestSticky = notebook.stickyNotes[0];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
      onClick={() => onOpen(notebook.id)}
      className={`group relative rounded-2xl bg-gradient-to-br ${style.cover} text-white p-5 pl-7 border border-white/10 shadow-md hover:shadow-lg cursor-pointer overflow-hidden flex flex-col justify-between min-h-[310px] select-none`}
    >
      {/* Real-Life Physical Book Spine on Left */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-5 ${style.spine} flex flex-col items-center justify-around py-4 z-10`}
      >
        <div className={`w-2.5 h-1 border-t-2 border-b-2 ${style.spineStitch}`} />
        <div className={`w-2.5 h-1 border-t-2 border-b-2 ${style.spineStitch}`} />
        <div className={`w-2.5 h-1 border-t-2 border-b-2 ${style.spineStitch}`} />
        <div className={`w-2.5 h-1 border-t-2 border-b-2 ${style.spineStitch}`} />
        <div className={`w-2.5 h-1 border-t-2 border-b-2 ${style.spineStitch}`} />
      </div>

      {/* Hanging Bookmark Ribbon */}
      <div
        className={`absolute -top-1 right-8 w-5 h-8 ${style.ribbon} shadow-md rounded-b-sm flex items-end justify-center pb-1 z-10`}
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
        }}
      />

      {/* Upper Zone: Subject Code + Target Grade Badge */}
      <div className="space-y-3 z-0">
        <div className="flex items-center justify-between gap-2 pr-8">
          <span
            className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-md border tracking-wider ${style.badge}`}
          >
            {notebook.subjectCode}
          </span>
          {notebook.targetGrade && (
            <span className="text-[11px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              {notebook.targetGrade}
            </span>
          )}
        </div>

        {/* Embossed Subject Title */}
        <div>
          <h3 className="font-display font-extrabold text-lg text-white leading-tight tracking-tight group-hover:text-amber-200 transition-colors line-clamp-2">
            {notebook.subjectTitle}
          </h3>
          {(notebook.instructor || notebook.semester) && (
            <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
              {notebook.instructor && <span>By {notebook.instructor}</span>}
              {notebook.instructor && notebook.semester && <span>·</span>}
              {notebook.semester && <span className="text-slate-400">{notebook.semester}</span>}
            </p>
          )}
        </div>

        {/* Attached Sticky Note on Cover */}
        {latestSticky && (
          <div className="mt-2 p-2.5 rounded-lg bg-yellow-200 text-slate-900 text-[11px] font-sans shadow-md border-l-4 border-yellow-400 rotate-[-1.5deg] max-w-[92%] transition-transform group-hover:rotate-0">
            <div className="font-bold text-[9px] uppercase tracking-wider text-yellow-800">
              📌 Quick Recall Sticky
            </div>
            <div className="line-clamp-2 text-[10px] mt-0.5 font-medium leading-snug">
              {latestSticky.text}
            </div>
          </div>
        )}
      </div>

      {/* Lower Zone: Pages Count, Progress & Exam Target */}
      <div className="space-y-3 pt-4 border-t border-white/10 z-0">
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-300" />
            <span>{notebook.pages.length} Ruled Pages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-teal-300" />
            <span>{notebook.units.length} Units</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Mastery Progress</span>
            <span className="font-bold text-white">{notebook.progressPercent}%</span>
          </div>
          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${style.ribbon}`}
              style={{ width: `${notebook.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action strip */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-[10px] text-slate-400 font-mono">
            Last: {notebook.lastStudiedAt}
          </span>
          <span className="flex items-center gap-1 text-white font-semibold group-hover:translate-x-1 transition-transform">
            <span>Open Binder</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
