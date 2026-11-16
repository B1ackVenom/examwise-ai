import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectNotebook } from '../../types';
import {
  BookOpen,
  Plus,
  X,
  Trash2,
  Check,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CreateNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    subjectCode: string;
    subjectTitle: string;
    instructor: string;
    semester: string;
    colorTheme: SubjectNotebook['colorTheme'];
    targetGrade: string;
    targetExamDate: string;
    description: string;
    units: string[];
  }) => void;
}

export const CreateNotebookModal: React.FC<CreateNotebookModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const { success, error } = useToast();

  const [subjectTitle, setSubjectTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [instructor, setInstructor] = useState('');
  const [semester, setSemester] = useState('');
  const [colorTheme, setColorTheme] = useState<SubjectNotebook['colorTheme']>('navy');
  const [targetGrade, setTargetGrade] = useState('');
  const [targetExamDate, setTargetExamDate] = useState('');
  const [description, setDescription] = useState('');
  const [units, setUnits] = useState<string[]>(['']);

  const handleAddUnit = () => {
    setUnits((prev) => [...prev, '']);
  };

  const handleUpdateUnit = (index: number, val: string) => {
    setUnits((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveUnit = (index: number) => {
    if (units.length <= 1) {
      error('Keep at least one unit input row or leave it blank.');
      return;
    }
    setUnits((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectTitle.trim() || !subjectCode.trim()) {
      error('Please enter both Subject Name and Subject Code.');
      return;
    }

    onCreate({
      subjectTitle: subjectTitle.trim(),
      subjectCode: subjectCode.trim(),
      instructor: instructor.trim(),
      semester: semester.trim(),
      colorTheme,
      targetGrade: targetGrade.trim(),
      targetExamDate,
      description: description.trim(),
      units: units.map((u) => u.trim()).filter(Boolean),
    });

    success(`Created subject notebook for ${subjectCode.toUpperCase()}.`);
    onClose();
    setSubjectTitle('');
    setSubjectCode('');
    setInstructor('');
    setSemester('');
    setTargetGrade('');
    setTargetExamDate('');
    setDescription('');
    setUnits(['']);
  };

  const themes: {
    id: SubjectNotebook['colorTheme'];
    name: string;
    bgHex: string;
    spineHex: string;
  }[] = [
    { id: 'navy', name: 'Midnight Navy', bgHex: '#0f172a', spineHex: '#312e81' },
    { id: 'emerald', name: 'Forest Emerald', bgHex: '#022c22', spineHex: '#064e3b' },
    { id: 'crimson', name: 'Burgundy Crimson', bgHex: '#4c0519', spineHex: '#881337' },
    { id: 'amethyst', name: 'Royal Amethyst', bgHex: '#3b0764', spineHex: '#581c87' },
    { id: 'amber', name: 'Kraft Amber', bgHex: '#451a03', spineHex: '#78350f' },
    { id: 'slate', name: 'Obsidian Slate', bgHex: '#1e293b', spineHex: '#334155' },
    { id: 'teal', name: 'Deep Teal', bgHex: '#042f2e', spineHex: '#134e4a' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-3xl bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between shrink-0 bg-[hsl(var(--background)/0.5)]">
              <div>
                <h2 className="text-base font-bold text-[hsl(var(--foreground))] font-display flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[hsl(var(--accent-text))]" />
                  Bind a New Subject Notebook
                </h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Create a digital subject notebook with ruled paper, Cornell notes, and unit modules.
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-2">
                  Choose Cover Theme *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {themes.map((t) => {
                    const isSelected = colorTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setColorTheme(t.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[hsl(var(--ring))] ring-2 ring-[hsl(var(--ring)/0.5)] shadow-sm scale-105'
                            : 'border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))] opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: t.bgHex }}
                      >
                        <div
                          className="w-full h-8 rounded-md flex items-center justify-center text-white relative shadow-inner"
                          style={{ backgroundColor: t.spineHex }}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-[10px] font-bold text-white text-center truncate w-full">
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                    Subject Name / Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectTitle}
                    onChange={(e) => setSubjectTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                    Faculty Instructor / Professor
                  </label>
                  <input
                    type="text"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                    Semester / Academic Term
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] cursor-pointer"
                  >
                    <option value="">Select semester</option>
                    <option value="Semester I">Semester I</option>
                    <option value="Semester II">Semester II</option>
                    <option value="Semester III">Semester III</option>
                    <option value="Semester IV">Semester IV</option>
                    <option value="Semester V">Semester V</option>
                    <option value="Semester VI">Semester VI</option>
                    <option value="Semester VII">Semester VII</option>
                    <option value="Semester VIII">Semester VIII</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                    Target Final Grade / Score
                  </label>
                  <input
                    type="text"
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                    Final Examination Date
                  </label>
                  <input
                    type="date"
                    value={targetExamDate}
                    onChange={(e) => setTargetExamDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">
                    Syllabus Units & Chapters ({units.filter((u) => u.trim()).length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddUnit}
                    className="text-xs text-[hsl(var(--accent-text))] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Unit</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {units.map((unit, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-right font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        aria-label={`Unit ${idx + 1} title`}
                        value={unit}
                        onChange={(e) => handleUpdateUnit(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveUnit(idx)}
                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Remove unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                  Notebook Overview / Syllabus Objectives
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>

              <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Bind & Create Notebook</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
