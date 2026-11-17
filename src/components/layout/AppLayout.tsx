import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { TopNavigation } from './TopNavigation';
import { FloatingDock } from './FloatingDock';
import { CommandPalette } from './CommandPalette';
import { ProfileModal } from './ProfileModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

export const AppLayout: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      // ? Cheat sheet shortcut (when not typing in an input)
      if (!isInput && e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();

        // Ctrl + K: Command Palette
        if (key === 'k') {
          e.preventDefault();
          setIsCommandPaletteOpen((prev) => !prev);
        }
        // Ctrl + D: Toggle / Pulse Quick Dock
        else if (key === 'd') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('examwise:toggle-dock'));
        }
        // Ctrl + /: Shortcuts Help
        else if (e.key === '/') {
          e.preventDefault();
          setIsShortcutsModalOpen((prev) => !prev);
        }
        // Ctrl + P: Jump to Practice Papers
        else if (key === 'p') {
          e.preventDefault();
          navigate('/student/practice');
        }
        // Ctrl + Q: Jump to High-Yield Questions
        else if (key === 'q') {
          e.preventDefault();
          navigate('/student/questions');
        }
        // Ctrl + N: Jump to Subject Notebooks
        else if (key === 'n') {
          e.preventDefault();
          navigate('/student/courses');
        }
        // Ctrl + O: Jump to Overview / Hub
        else if (key === 'o') {
          e.preventDefault();
          navigate('/student/overview');
        }
        // Ctrl + U: Switch Profile Modal
        else if (key === 'u') {
          e.preventDefault();
          setIsProfileModalOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col transition-colors duration-200 selection:bg-[hsl(var(--primary)/0.2)] selection:text-[hsl(var(--accent-text))]">
      {/* Top Modern SaaS Navigation Center */}
      <TopNavigation
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Panoramic Workspace Area (Full width, No vertical sidebar) */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modern Floating Dynamic Island Action Dock */}
      <FloatingDock
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Quick Jump / Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Profile Switcher & Creator Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
