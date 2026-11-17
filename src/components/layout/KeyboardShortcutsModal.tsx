import React from 'react';
import { Modal } from '../ui/Modal';
import { Keyboard, Command, Sparkles, Navigation, Layers, BookOpen, FileText, HelpCircle, LayoutDashboard, Sliders } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Quick Actions' | 'Workspace';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], description: 'Open Quick Jump / Command Palette', category: 'Quick Actions' },
  { keys: ['Ctrl', 'D'], description: 'Toggle / Pulse Quick Action Dock', category: 'Quick Actions' },
  { keys: ['Ctrl', '/'], description: 'Open Keyboard Shortcuts Guide', category: 'Quick Actions' },
  { keys: ['Ctrl', 'P'], description: 'Jump to Practice Examination Papers', category: 'Navigation' },
  { keys: ['Ctrl', 'Q'], description: 'Jump to High-Yield Important Questions', category: 'Navigation' },
  { keys: ['Ctrl', 'N'], description: 'Jump to Cornell Subject Notebooks', category: 'Navigation' },
  { keys: ['Ctrl', 'O'], description: 'Jump to Study Hub / Overview', category: 'Navigation' },
  { keys: ['Ctrl', 'H'], description: 'Jump to Learning Resources & Syllabus', category: 'Navigation' },
  { keys: ['Ctrl', 'U'], description: 'Switch Profile & Role Mode (Teacher / Student)', category: 'Workspace' },
  { keys: ['Esc'], description: 'Close current modal or overlay window', category: 'Workspace' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts Cheat Sheet" maxWidth="lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[hsl(var(--accent-text))]" />
            <span>Productivity shortcuts for rapid exam preparation</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[hsl(var(--secondary))]">
            {isMac ? '⌘ macOS Layout' : 'Ctrl Windows/Linux Layout'}
          </span>
        </div>

        {/* Shortcuts List Categorized */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['Quick Actions', 'Navigation', 'Workspace'] as const).map((category) => {
            const items = SHORTCUTS.filter((s) => s.category === category);
            return (
              <div key={category} className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  {category === 'Quick Actions' && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                  {category === 'Navigation' && <Navigation className="w-3.5 h-3.5 text-blue-500" />}
                  {category === 'Workspace' && <Layers className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{category}</span>
                </div>

                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[hsl(var(--secondary)/0.4)] border border-[hsl(var(--border))] text-xs"
                    >
                      <span className="text-[hsl(var(--foreground))]">{item.description}</span>
                      <div className="flex items-center gap-1 ml-3 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[11px] font-mono font-semibold text-[hsl(var(--foreground))] shadow-2xs">
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
