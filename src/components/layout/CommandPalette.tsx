import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from '../../context/RoleContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  BarChart3,
  BookOpen,
  FolderArchive,
  HelpCircle,
  TrendingUp,
  Settings,
  Moon,
  Sun,
  GraduationCap,
  Sparkles,
  LogOut,
  X,
  ArrowRight,
  Sliders,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { role, logout } = useRole();
  const { theme, setTheme } = useTheme();
  const { info, success } = useToast();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const teacherCommands = [
    {
      id: 'faculty-overview',
      title: 'Faculty Overview',
      subtitle: 'Grading queue & exam performance summary',
      category: 'Faculty Console',
      icon: GraduationCap,
      action: () => {
        navigate('/teacher/overview');
        onClose();
      },
    },
    {
      id: 'faculty-evaluation',
      title: 'Answer-Sheet Evaluation Workbench',
      subtitle: 'Review OCR segmentation, proposed marks & manual overrides',
      category: 'Faculty Console',
      icon: FileCheck2,
      action: () => {
        navigate('/teacher/evaluation');
        onClose();
      },
    },
    {
      id: 'faculty-marksheets',
      title: 'Marksheet Verification',
      subtitle: 'OCR extraction & arithmetic sum audit',
      category: 'Faculty Console',
      icon: FileSpreadsheet,
      action: () => {
        navigate('/teacher/marksheets');
        onClose();
      },
    },
    {
      id: 'faculty-exam-builder',
      title: 'Exam Builder & Rubrics',
      subtitle: 'Design exam question papers, marking keys and rubrics',
      category: 'Faculty Console',
      icon: FileText,
      action: () => {
        navigate('/teacher/exam-builder');
        onClose();
      },
    },
    {
      id: 'faculty-results',
      title: 'Results & Reports',
      subtitle: 'Grade distribution, publish results and CSV export',
      category: 'Faculty Console',
      icon: BarChart3,
      action: () => {
        navigate('/teacher/results');
        onClose();
      },
    },
    {
      id: 'faculty-courses',
      title: 'Curriculum & Modules',
      subtitle: 'Manage courses, syllabus units and learning resources',
      category: 'Faculty Console',
      icon: BookOpen,
      action: () => {
        navigate('/teacher/courses');
        onClose();
      },
    },
    {
      id: 'faculty-rubrics',
      title: 'Standardized Rubrics',
      subtitle: 'Grading matrices and marking guidelines',
      category: 'Faculty Console',
      icon: Sliders,
      action: () => {
        navigate('/teacher/rubrics');
        onClose();
      },
    },
  ];

  const studentCommands = [
    {
      id: 'student-overview',
      title: 'Student Study Hub',
      subtitle: 'Exam countdown, course progress and recommendations',
      category: 'Student Hub',
      icon: Sparkles,
      action: () => {
        navigate('/student/overview');
        onClose();
      },
    },
    {
      id: 'student-courses',
      title: 'Subject Notebooks & Binders',
      subtitle: 'Subject covers, Cornell ruled notes, units & sticky recall tags',
      category: 'Student Hub',
      icon: BookOpen,
      action: () => {
        navigate('/student/courses');
        onClose();
      },
    },
    {
      id: 'student-practice',
      title: 'Practice Papers',
      subtitle: 'Timed practice tests with answer keys',
      category: 'Student Hub',
      icon: FileText,
      action: () => {
        navigate('/student/practice');
        onClose();
      },
    },
    {
      id: 'student-questions',
      title: 'High-Yield Questions',
      subtitle: 'Frequently tested questions grouped by module with model answers',
      category: 'Student Hub',
      icon: HelpCircle,
      action: () => {
        navigate('/student/questions');
        onClose();
      },
    },
    {
      id: 'student-resources',
      title: 'Learning Resources & Syllabi',
      subtitle: 'Course documents, lecture notes & previous papers',
      category: 'Student Hub',
      icon: FolderArchive,
      action: () => {
        navigate('/student/resources');
        onClose();
      },
    },
    {
      id: 'student-analytics',
      title: 'Performance & Revision Analytics',
      subtitle: 'Topic diagnostic, weak areas and readiness summary',
      category: 'Student Hub',
      icon: TrendingUp,
      action: () => {
        navigate('/student/analytics');
        onClose();
      },
    },
  ];

  const sharedCommands = [
    {
      id: 'theme-tokyo-night',
      title: 'Switch to Tokyo Night Theme',
      subtitle: 'Dark theme with cobalt and slate accents',
      category: 'Theme & Aesthetics',
      icon: Moon,
      action: () => {
        setTheme('tokyo-night');
        success('Applied Tokyo Night theme');
        onClose();
      },
    },
    {
      id: 'theme-dracula',
      title: 'Switch to Dracula Theme',
      subtitle: 'Dark palette with purple and cyan accents',
      category: 'Theme & Aesthetics',
      icon: Moon,
      action: () => {
        setTheme('dracula');
        success('Applied Dracula theme');
        onClose();
      },
    },
    {
      id: 'theme-light',
      title: 'Switch to Nordic Clean Light Theme',
      subtitle: 'High-contrast daylight palette with clean slate tones',
      category: 'Theme & Aesthetics',
      icon: Sun,
      action: () => {
        setTheme('light');
        success('Applied Clean Light theme');
        onClose();
      },
    },
    {
      id: 'sys-settings',
      title: 'Settings & Architecture',
      subtitle: 'Profile details, appearance and API endpoint targets',
      category: 'System',
      icon: Settings,
      action: () => {
        navigate('/settings');
        onClose();
      },
    },
    {
      id: 'sys-logout',
      title: 'Sign Out',
      subtitle: 'End current session and return to login screen',
      category: 'System',
      icon: LogOut,
      action: () => {
        logout();
        info('Signed out of ExamWise AI.');
        onClose();
        navigate('/login', { replace: true });
      },
    },
  ];

  const allCommands = [
    ...(role === 'teacher' ? teacherCommands : studentCommands),
    ...sharedCommands,
  ];

  const filteredCommands = allCommands.filter((cmd) => {
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(lower) ||
      cmd.subtitle.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCommands.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-2xl bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[hsl(var(--border))]">
              <Search className="w-5 h-5 text-[hsl(var(--muted-foreground))] shrink-0" />
              <input
                type="text"
                aria-label="Filter navigation commands"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                autoFocus
                className="w-full bg-transparent text-sm md:text-base text-[hsl(var(--foreground))] focus:outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                title="Close palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  No commands matching &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                          : 'text-[hsl(var(--foreground)/0.85)] hover:bg-[hsl(var(--secondary)/0.5)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate text-left">
                          <div className="text-xs md:text-sm font-semibold truncate">{cmd.title}</div>
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                            {cmd.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          {cmd.category}
                        </span>
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--accent-text))]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 bg-[hsl(var(--background)/0.6)] border-t border-[hsl(var(--border))] flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Active Theme:</span>
                <span className="font-semibold text-[hsl(var(--foreground))] capitalize">{theme}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
