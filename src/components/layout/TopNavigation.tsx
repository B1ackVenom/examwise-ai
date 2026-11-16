import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from '../../context/RoleContext';
import { useTheme, Theme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import {
  GraduationCap,
  Sparkles,
  LayoutDashboard,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  BarChart3,
  BookOpen,
  FolderArchive,
  HelpCircle,
  TrendingUp,
  Settings,
  Search,
  ChevronDown,
  Check,
  Sliders,
  BookMarked,
  Layers,
  LogOut,
} from 'lucide-react';

interface TopNavigationProps {
  onOpenCommandPalette: () => void;
  onOpenProfileModal: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onOpenCommandPalette,
  onOpenProfileModal,
}) => {
  const { role, user, logout } = useRole();
  const { theme, setTheme, cycleTheme } = useTheme();
  const { info, success } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    info('Signed out of ExamWise AI.');
    navigate('/login', { replace: true });
  };

  const teacherNavItems = [
    { to: '/teacher/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/teacher/evaluation', label: 'Evaluation Workbench', icon: FileCheck2 },
    { to: '/teacher/marksheets', label: 'Marksheet Audit', icon: FileSpreadsheet },
    { to: '/teacher/exam-builder', label: 'Exam Builder', icon: FileText },
    { to: '/teacher/exams', label: 'Scheduled Exams', icon: BookMarked },
    { to: '/teacher/results', label: 'Results & Reports', icon: BarChart3 },
    { to: '/teacher/courses', label: 'Curriculum & Modules', icon: BookOpen },
    { to: '/teacher/rubrics', label: 'Rubrics & Keys', icon: Sliders },
  ];

  const studentNavItems = [
    { to: '/student/overview', label: 'Study Hub', icon: LayoutDashboard },
    { to: '/student/courses', label: 'Subject Notebooks', icon: BookOpen },
    { to: '/student/practice', label: 'Practice Papers', icon: FileText },
    { to: '/student/questions', label: 'High-Yield Questions', icon: HelpCircle },
    { to: '/student/resources', label: 'Learning Resources', icon: FolderArchive },
    { to: '/student/analytics', label: 'Performance Analytics', icon: TrendingUp },
  ];

  const navItems = role === 'teacher' ? teacherNavItems : studentNavItems;

  const themes: { id: Theme; name: string; subtitle: string; dotColor: string }[] = [
    {
      id: 'tokyo-night',
      name: 'Tokyo Night',
      subtitle: 'Electric indigo & obsidian slate',
      dotColor: 'bg-[#7aa2f7]',
    },
    {
      id: 'dracula',
      name: 'Dracula',
      subtitle: 'Classic gothic purple & pink',
      dotColor: 'bg-[#bd93f9]',
    },
    {
      id: 'light',
      name: 'Nordic Clean Light',
      subtitle: 'Harmonious slate & cobalt',
      dotColor: 'bg-[#4f46e5]',
    },
  ];

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-[hsl(var(--card)/0.94)] border-b border-[hsl(var(--border))] transition-colors duration-200 shadow-xs">
      {/* Upper Control Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <NavLink
            to={role === 'teacher' ? '/teacher/overview' : '/student/overview'}
            className="flex items-center gap-2.5 group"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105 ${
                role === 'teacher'
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'bg-teal-600 text-white'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base md:text-lg tracking-tight text-[hsl(var(--foreground))] flex items-center gap-1.5">
                ExamWise <span className="text-[hsl(var(--accent-text))] font-mono text-sm">AI</span>
              </span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono -mt-1 hidden sm:inline">
                {role === 'teacher' ? 'Faculty Evaluation Console' : 'Student Study Hub'}
              </span>
            </div>
          </NavLink>
        </div>

        {/* Center: Read-Only Workspace Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-[hsl(var(--secondary)/0.7)] border border-[hsl(var(--border))] text-xs font-medium text-[hsl(var(--foreground))]">
          {role === 'teacher' ? (
            <>
              <GraduationCap className="w-3.5 h-3.5 text-[hsl(var(--accent-text))]" />
              <span>Faculty Workspace</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span>Student Workspace</span>
            </>
          )}
        </div>

        {/* Right: Quick Search + Theme Menu + Profile + Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary)/0.8)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-colors cursor-pointer font-mono"
            title="Press ⌘K or Ctrl+K to search"
          >
            <Search className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="hidden md:inline text-[11px]">Quick Jump</span>
            <kbd className="hidden lg:inline px-1 py-0.2 rounded bg-[hsl(var(--card))] text-[10px] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]">
              ⌘K
            </kbd>
          </button>

          {/* Theme Dropdown Selector */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary)/0.8)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-colors cursor-pointer"
              title="Select theme palette"
            >
              {theme === 'tokyo-night' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3672f3] inline-block" />
                  <span className="hidden sm:inline font-mono text-[11px]">Tokyo Night</span>
                </>
              ) : theme === 'dracula' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#bd93f9] inline-block" />
                  <span className="hidden sm:inline font-mono text-[11px]">Dracula</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1f60f0] inline-block" />
                  <span className="hidden sm:inline font-mono text-[11px]">Clean Light</span>
                </>
              )}
              <ChevronDown className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
            </button>

            <AnimatePresence>
              {isThemeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 z-50 w-64 p-2 rounded-xl bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] border border-[hsl(var(--border))] shadow-xl space-y-1"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                    Color Theme Palette
                  </div>

                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setIsThemeMenuOpen(false);
                        success(`Applied ${t.name} theme`);
                      }}
                      className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                        theme === t.id
                          ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--accent-text))] font-semibold'
                          : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/0.6)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${t.dotColor}`} />
                        <div>
                          <div className="text-xs">{t.name}</div>
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">
                            {t.subtitle}
                          </div>
                        </div>
                      </div>
                      {theme === t.id && <Check className="w-4 h-4 text-[hsl(var(--accent-text))]" />}
                    </button>
                  ))}

                  <div className="pt-1.5 px-2 text-[10px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] flex items-center justify-between">
                    <span>1-Click Toggle:</span>
                    <button
                      onClick={cycleTheme}
                      className="text-[hsl(var(--accent-text))] hover:underline cursor-pointer font-mono"
                    >
                      Cycle Next ↻
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive User Avatar & Manage Profiles Trigger */}
          <button
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-xl border-l border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.7)] transition-colors cursor-pointer group text-left"
            title="Manage profiles"
          >
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: user.accentColor || (role === 'teacher' ? '#1f60f0' : '#0d9488') }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:flex flex-col text-left truncate max-w-[140px]">
              <span className="text-xs font-bold text-[hsl(var(--foreground))] leading-tight truncate group-hover:text-[hsl(var(--accent-text))]">
                {user.name}
              </span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono truncate">
                {user.roleLabel}
              </span>
            </div>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Lower Navigation Strip */}
      <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background)/0.7)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar scroll-smooth">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive: linkActive }) =>
                    `relative px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors shrink-0 group ${
                      linkActive
                        ? 'text-[hsl(var(--foreground))] font-semibold bg-[hsl(var(--secondary)/0.6)]'
                        : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/0.5)]'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>

                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-[hsl(var(--primary))] rounded-full"
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    />
                  )}
                </NavLink>
              );
            })}

            {/* Global Settings Nav Link */}
            <div className="ml-auto pl-2 shrink-0">
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-[hsl(var(--foreground))] font-semibold bg-[hsl(var(--secondary)/0.6)]'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`
                }
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Settings</span>
              </NavLink>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
