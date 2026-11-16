import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from '../../context/RoleContext';
import {
  LayoutDashboard,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  BarChart3,
  BookOpen,
  HelpCircle,
  TrendingUp,
  FolderArchive,
  Search,
  Settings,
  Sparkles,
  Sliders,
  ChevronUp,
  ChevronDown,
  UserCheck,
} from 'lucide-react';

interface FloatingDockProps {
  onOpenCommandPalette: () => void;
  onOpenProfileModal?: () => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  onOpenCommandPalette,
  onOpenProfileModal,
}) => {
  const { role } = useRole();
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const teacherDockItems = [
    { to: '/teacher/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/teacher/evaluation', label: 'Evaluation Workbench', icon: FileCheck2 },
    { to: '/teacher/marksheets', label: 'Marksheet Audit', icon: FileSpreadsheet },
    { to: '/teacher/exam-builder', label: 'Exam Builder', icon: FileText },
    { to: '/teacher/results', label: 'Results & Reports', icon: BarChart3 },
    { to: '/teacher/courses', label: 'Modules & Curriculum', icon: BookOpen },
    { to: '/teacher/rubrics', label: 'Standardized Rubrics', icon: Sliders },
  ];

  const studentDockItems = [
    { to: '/student/overview', label: 'Study Hub', icon: LayoutDashboard },
    { to: '/student/courses', label: 'Subject Notebooks', icon: BookOpen },
    { to: '/student/practice', label: 'Practice Papers', icon: FileText },
    { to: '/student/questions', label: 'High-Yield Questions', icon: HelpCircle },
    { to: '/student/resources', label: 'Learning Notes', icon: FolderArchive },
    { to: '/student/analytics', label: 'Performance Analytics', icon: TrendingUp },
  ];

  const dockItems = role === 'teacher' ? teacherDockItems : studentDockItems;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setIsMinimized(false)}
          className="px-3.5 py-2.5 rounded-full bg-[hsl(var(--card)/0.95)] text-[hsl(var(--foreground))] backdrop-blur-md border border-[hsl(var(--border))] shadow-lg hover:border-[hsl(var(--ring)/0.5)] transition-colors flex items-center gap-2 group cursor-pointer"
          title="Expand Quick Dock"
        >
          <Sparkles className="w-4 h-4 text-[hsl(var(--accent-text))]" />
          <span className="text-xs font-semibold pr-1">Quick Dock</span>
          <ChevronUp className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] pointer-events-auto">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="relative flex items-center gap-1.5 p-1.5 md:p-2 rounded-2xl bg-[hsl(var(--card)/0.94)] backdrop-blur-md border border-[hsl(var(--border))] shadow-xl"
      >
        {dockItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={item.to}
              className="relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <NavLink
                to={item.to}
                className={({ isActive: linkActive }) =>
                  `relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl transition-colors duration-150 ${
                    linkActive
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />

                {isActive && (
                  <motion.div
                    layoutId="activeDockDot"
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[hsl(var(--ring))]"
                  />
                )}
              </NavLink>

              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: -4, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] text-[11px] font-medium whitespace-nowrap shadow-lg pointer-events-none z-50 border border-[hsl(var(--border))] font-display"
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="w-[1px] h-6 bg-[hsl(var(--border))] mx-1" />

        {/* Command Palette Button */}
        <div
          className="relative"
          onMouseEnter={() => setHoveredIndex(99)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
            title="Open Command Launcher (⌘K)"
          >
            <Search className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {hoveredIndex === 99 && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: -4, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] text-[11px] font-medium whitespace-nowrap shadow-lg pointer-events-none z-50 border border-[hsl(var(--border))] font-mono"
              >
                ⌘K Quick Search
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Manage Profiles Trigger */}
        {onOpenProfileModal && (
          <div
            className="relative"
            onMouseEnter={() => setHoveredIndex(101)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <button
              onClick={onOpenProfileModal}
              className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
              title="Manage profiles"
            >
              <UserCheck className="w-5 h-5 text-[hsl(var(--accent-text))]" />
            </button>

            <AnimatePresence>
              {hoveredIndex === 101 && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: -4, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] text-[11px] font-medium whitespace-nowrap shadow-lg pointer-events-none z-50 border border-[hsl(var(--border))] font-display"
                >
                  Manage Profiles
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Settings */}
        <div
          className="relative"
          onMouseEnter={() => setHoveredIndex(100)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl transition-colors ${
                isActive
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
              }`
            }
          >
            <Settings className="w-5 h-5" />
          </NavLink>

          <AnimatePresence>
            {hoveredIndex === 100 && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: -4, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] text-[11px] font-medium whitespace-nowrap shadow-lg pointer-events-none z-50 border border-[hsl(var(--border))] font-display"
              >
                Settings
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimize Button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors ml-0.5 cursor-pointer"
          title="Minimize dock"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </div>
  );
};
