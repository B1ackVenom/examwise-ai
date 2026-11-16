import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import { notebookService } from '../services/notebookService';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  User,
  Shield,
  Server,
  Cpu,
  Trash2,
  CheckCircle2,
  Sliders,
  LogOut,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { role, user, logout } = useRole();
  const { theme, setTheme } = useTheme();
  const { info, success } = useToast();
  const navigate = useNavigate();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  if (!user) return null;

  const handleClearStorage = () => {
    apiClient.clearLocalData();
    notebookService.clearAllNotebooks();
    success('Local browser cache cleared.');
  };

  const handleSignOut = () => {
    logout();
    info('Signed out of ExamWise AI.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-[hsl(var(--border))]">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] font-display">
          Settings & Architecture Configuration
        </h1>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          User profile details, appearance settings, and backend service configuration.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
            <User className="w-4 h-4 text-[hsl(var(--accent-text))]" />
            Active Account Profile
          </h2>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:border-rose-500/40 hover:bg-rose-500/10 text-xs font-medium text-[hsl(var(--foreground))] hover:text-rose-500 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Full Name</span>
            <div className="font-semibold text-[hsl(var(--foreground))] mt-1">
              {user.name}
            </div>
          </div>
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Email</span>
            <div className="font-mono text-[hsl(var(--foreground))] mt-1">
              {user.email}
            </div>
          </div>
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Department / School</span>
            <div className="font-medium text-[hsl(var(--foreground))] mt-1">
              {user.department}
            </div>
          </div>
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Workspace Role</span>
            <div className="mt-1 capitalize font-semibold text-[hsl(var(--accent-text))]">
              {role} ({user.roleLabel})
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Theme Settings */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[hsl(var(--accent-text))]" />
          Theme & Aesthetic Palettes
        </h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Select your preferred workspace theme across dark and light palettes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            onClick={() => setTheme('tokyo-night')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
              theme === 'tokyo-night'
                ? 'border-[hsl(var(--ring))] bg-[hsl(var(--secondary))] ring-1 ring-[hsl(var(--ring))]'
                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#3672f3]" />
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  Tokyo Night
                </span>
              </div>
              {theme === 'tokyo-night' && <CheckCircle2 className="w-4 h-4 text-[#3672f3]" />}
            </div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Deep obsidian slate surfaces with cobalt blue accents.
            </div>
          </button>

          <button
            onClick={() => setTheme('dracula')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
              theme === 'dracula'
                ? 'border-[#bd93f9] bg-[hsl(var(--secondary))] ring-1 ring-[#bd93f9]'
                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#bd93f9]" />
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  Dracula
                </span>
              </div>
              {theme === 'dracula' && <CheckCircle2 className="w-4 h-4 text-[#bd93f9]" />}
            </div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Classic gothic palette with purple and cyan highlights.
            </div>
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
              theme === 'light'
                ? 'border-[#1f60f0] bg-[hsl(var(--secondary))] ring-1 ring-[#1f60f0]'
                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.5)]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#1f60f0]" />
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  Nordic Clean Light
                </span>
              </div>
              {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-[#1f60f0]" />}
            </div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Crisp daylight surfaces with high-contrast slate text and cobalt accents.
            </div>
          </button>
        </div>
      </div>

      {/* Backend Integration Specification */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Server className="w-4 h-4 text-[hsl(var(--accent-text))]" />
            Backend Integration Target
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            ExamWise AI uses a typed client service layer ready to connect to your backend API.
          </p>
        </div>

        <div className="space-y-3 pt-1 text-xs">
          <div className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                <span>API Integration Gateway</span>
                <span className="text-[10px] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.2 rounded font-mono">
                  Target Endpoint: /api/v1
                </span>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Handles authentication, role-based access control, course rosters, and marksheet audit exports.
              </p>
            </div>
            <span className="font-mono text-[11px] text-[hsl(var(--accent-text))] font-semibold shrink-0">
              Contract Ready
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[hsl(var(--accent-text))]" />
                <span>Exam Preparation Service</span>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Ingests syllabi and lecture notes to synthesize question banks, practice papers, and revision pathways.
              </p>
            </div>
            <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))] shrink-0">
              Client Ready
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-teal-500" />
                <span>Answer Evaluation & OCR Service</span>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Processes scanned handwritten booklets, segments question answers, and submits proposals to the evaluation workbench.
              </p>
            </div>
            <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))] shrink-0">
              Client Ready
            </span>
          </div>
        </div>
      </div>

      {/* Local Cache Maintenance */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          Local Workspace Storage
        </h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Clear locally stored courses, exams, notebooks, and practice attempts in browser storage while keeping your user profiles intact.
        </p>

        <button
          onClick={() => setConfirmClearOpen(true)}
          className="px-4 py-2 border border-[hsl(var(--border))] hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Local Workspace Data</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleClearStorage}
        title="Clear Local Workspace Data"
        message="This will remove locally saved courses, notebooks, resources, exams, and submissions from browser storage. Your login profiles will remain intact."
        confirmLabel="Clear Data"
        variant="danger"
      />
    </div>
  );
};
