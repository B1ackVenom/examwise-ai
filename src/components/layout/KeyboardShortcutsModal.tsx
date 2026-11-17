import React from 'react';
import { Modal } from '../ui/Modal';
import { useRole } from '../../context/RoleContext';
import { Keyboard, Command, Sparkles, Navigation, Layers, BookOpen, FileText, HelpCircle, LayoutDashboard, Sliders, GraduationCap } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Quick Actions' | 'Student Navigation' | 'Faculty Navigation' | 'Workspace';
}

const ALL_SHORTCUTS: ShortcutItem[] = [
  // Quick Actions
  { keys: ['Ctrl', 'K'], description: 'Open Quick Jump / Command Palette', category: 'Quick Actions' },
  { keys: ['Ctrl', 'D'], description: 'Toggle / Minimize Quick Dock', category: 'Quick Actions' },
  { keys: ['Ctrl', '/'], description: 'Open Keyboard Shortcuts Guide', category: 'Quick Actions' },
  { keys: ['?'], description: 'Instant Cheat Sheet (anywhere outside inputs)', category: 'Quick Actions' },

  // Student Navigation
  { keys: ['Ctrl', 'O'], description: 'Study Hub / Overview', category: 'Student Navigation' },
  { keys: ['Ctrl', 'P'], description: 'Practice Examination Papers', category: 'Student Navigation' },
  { keys: ['Ctrl', 'Q'], description: 'High-Yield Question Bank', category: 'Student Navigation' },
  { keys: ['Ctrl', 'N'], description: 'Cornell Subject Notebooks', category: 'Student Navigation' },
  { keys: ['Ctrl', 'H'], description: 'Learning Resources & Syllabi', category: 'Student Navigation' },
  { keys: ['Ctrl', 'A'], description: 'Performance & Revision Analytics', category: 'Student Navigation' },

  // Faculty Navigation
  { keys: ['Ctrl', 'O'], description: 'Faculty Overview Console', category: 'Faculty Navigation' },
  { keys: ['Ctrl', 'E'], description: 'Answer-Sheet Evaluation Workbench', category: 'Faculty Navigation' },
  { keys: ['Ctrl', 'M'], description: 'Marksheet Arithmetic Audit', category: 'Faculty Navigation' },
  { keys: ['Ctrl', 'B'], description: 'Exam Paper Builder & Rubrics', category: 'Faculty Navigation' },
  { keys: ['Ctrl', 'R'], description: 'Official Cohort Results & Reports', category: 'Faculty Navigation' },
  { keys: ['Ctrl', 'C'], description: 'Curriculum & Course Management', category: 'Faculty Navigation' },

  // Workspace
  { keys: ['Ctrl', 'U'], description: 'Switch User Profile / Role Mode', category: 'Workspace' },
  { keys: ['Esc'], description: 'Close current modal or overlay window', category: 'Workspace' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { role } = useRole();
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const relevantCategories: Array<'Quick Actions' | 'Student Navigation' | 'Faculty Navigation' | 'Workspace'> =
    role === 'teacher'
      ? ['Quick Actions', 'Faculty Navigation', 'Workspace', 'Student Navigation']
      : ['Quick Actions', 'Student Navigation', 'Workspace', 'Faculty Navigation'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts Cheat Sheet" maxWidth="lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[hsl(var(--accent-text))]" />
            <span>Productivity shortcuts for rapid exam preparation & evaluation</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[hsl(var(--secondary))]">
            {isMac ? '⌘ macOS Layout' : 'Ctrl Windows/Linux Layout'}
          </span>
        </div>

        {/* Shortcuts List Categorized */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relevantCategories.map((category) => {
            const items = ALL_SHORTCUTS.filter((s) => s.category === category);
            const isCurrentRoleCategory =
              (role === 'teacher' && category === 'Faculty Navigation') ||
              (role === 'student' && category === 'Student Navigation');

            return (
              <div
                key={category}
                className={`space-y-2 p-2.5 rounded-xl transition-all ${
                  isCurrentRoleCategory
                    ? 'bg-[hsl(var(--primary)/0.06)] border border-[hsl(var(--primary)/0.25)]'
                    : 'bg-[hsl(var(--secondary)/0.3)] border border-[hsl(var(--border))]'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {category === 'Quick Actions' && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    {category === 'Student Navigation' && <BookOpen className="w-3.5 h-3.5 text-teal-500" />}
                    {category === 'Faculty Navigation' && <GraduationCap className="w-3.5 h-3.5 text-blue-500" />}
                    {category === 'Workspace' && <Layers className="w-3.5 h-3.5 text-purple-500" />}
                    <span>{category}</span>
                  </div>
                  {isCurrentRoleCategory && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                      Active Role
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-xs"
                    >
                      <span className="text-[hsl(var(--foreground))] text-[11px]">{item.description}</span>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[10px] font-mono font-semibold text-[hsl(var(--foreground))] shadow-2xs">
                              {k === 'Ctrl' && isMac ? '⌘' : k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] font-mono text-[10px]">?</kbd> anywhere to open this sheet.</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--accent))] transition-colors font-medium cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
};
