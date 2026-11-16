import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types';
import {
  GraduationCap,
  ShieldCheck,
  BookOpen,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, signup, profiles } = useRole();
  const { theme, setTheme } = useTheme();
  const { success } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupRole, setSignupRole] = useState<UserRole>('student');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDepartment, setSignupDepartment] = useState('');
  const [signupInstitution, setSignupInstitution] = useState('');
  const [signupRoleLabel, setSignupRoleLabel] = useState('');
  const [signupSemester, setSignupSemester] = useState('');
  const [signupSpecialization, setSignupSpecialization] = useState('');

  const mockQuickAccounts = profiles.filter(
    (p) => p.id === 'user-tch-01' || p.id === 'user-std-01'
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = login(loginEmail, loginPassword);
    if (!res.success || !res.user) {
      setError(res.error || 'Authentication failed.');
      return;
    }
    success(`Signed in as ${res.user.name}`);
    navigate(res.user.role === 'teacher' ? '/teacher/overview' : '/student/overview', {
      replace: true,
    });
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = signup({
      name: signupName,
      email: signupEmail,
      password: signupPassword,
      role: signupRole,
      department: signupDepartment,
      institution: signupInstitution,
      roleLabel: signupRoleLabel,
      semester: signupRole === 'student' ? signupSemester : undefined,
      specialization: signupSpecialization,
    });
    if (!res.success || !res.user) {
      setError(res.error || 'Registration failed.');
      return;
    }
    success(`Account created for ${res.user.name}`);
    navigate(res.user.role === 'teacher' ? '/teacher/overview' : '/student/overview', {
      replace: true,
    });
  };

  const handleQuickFill = (email: string, password: string) => {
    setMode('login');
    setError('');
    setLoginEmail(email);
    setLoginPassword(password);
  };

  const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'tokyo-night', label: 'Tokyo Night', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'dracula', label: 'Dracula', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-[hsl(var(--primary-foreground))] shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-bold text-base tracking-tight text-[hsl(var(--foreground))]">
              ExamWise AI
            </span>
            <span className="block text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
              Academic Preparation & Evaluation
            </span>
          </div>
        </div>

        {/* Theme Switcher */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]"
          role="group"
          aria-label="Theme selection"
        >
          {themes.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs border border-[hsl(var(--border))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Auth Grid */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Platform Overview & Quick Seed Accounts */}
          <div className="lg:col-span-5 space-y-6 pt-2">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-xs font-mono text-[hsl(var(--accent-text))]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Role-Isolated Workspaces</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] font-display leading-tight">
                Sign in to your ExamWise academic workspace
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Students access dedicated subject notebooks, learning resources, and timed practice assessments. Faculty access curriculum setup, exam authoring, OCR booklet grading, and marksheet verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--foreground))]">
                  <BookOpen className="w-4 h-4 text-teal-500" />
                  <span>Student Hub</span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Redirects strictly to student study notebooks, practice tests, and analytics.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--foreground))]">
                  <ShieldCheck className="w-4 h-4 text-[hsl(var(--accent-text))]" />
                  <span>Faculty Console</span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Redirects strictly to exam creation, evaluation workbench, and grade publishing.
                </p>
              </div>
            </div>

            {/* Provided 1 Student + 1 Teacher Mock Accounts */}
            {mockQuickAccounts.length > 0 && (
              <div className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider font-mono text-[hsl(var(--muted-foreground))]">
                    Default Accounts
                  </span>
                  <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
                    Click to fill
                  </span>
                </div>
                <div className="space-y-2">
                  {mockQuickAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleQuickFill(acc.email, acc.password || 'password123')}
                      className="w-full p-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] text-left transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                            {acc.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                              acc.role === 'teacher'
                                ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--accent-text))] border-[hsl(var(--primary)/0.3)]'
                                : 'bg-teal-500/10 text-teal-500 border-teal-500/30'
                            }`}
                          >
                            {acc.role}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                          {acc.email} · {acc.password || 'password123'}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Auth Card */}
          <div className="lg:col-span-7 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  mode === 'login'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs border border-[hsl(var(--border))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  mode === 'signup'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs border border-[hsl(var(--border))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))] font-display">
                    Account Log In
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Enter your registered email and password to open your workspace.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5"
                  >
                    Email Address *
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5"
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In to Workspace</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))] font-display">
                    Create Profile Account
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Register a new student or faculty account. Your workspace is locked to your chosen role.
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <span className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                    Account Role *
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSignupRole('student')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        signupRole === 'student'
                          ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        <span>Student</span>
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Study notebooks & practice
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupRole('teacher')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        signupRole === 'teacher'
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--accent-text))]'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Faculty / Teacher</span>
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Exams & OCR evaluation
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                    >
                      Email Address *
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                    >
                      Password * (min 4 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={4}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-9 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="signup-role-label"
                      className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                    >
                      {signupRole === 'teacher' ? 'Academic Title' : 'Program / Standing'}
                    </label>
                    <input
                      id="signup-role-label"
                      type="text"
                      value={signupRoleLabel}
                      onChange={(e) => setSignupRoleLabel(e.target.value)}
                      className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="signup-department"
                      className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                    >
                      Department
                    </label>
                    <input
                      id="signup-department"
                      type="text"
                      value={signupDepartment}
                      onChange={(e) => setSignupDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="signup-institution"
                      className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                    >
                      Institution
                    </label>
                    <input
                      id="signup-institution"
                      type="text"
                      value={signupInstitution}
                      onChange={(e) => setSignupInstitution(e.target.value)}
                      className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {signupRole === 'student' && (
                    <div>
                      <label
                        htmlFor="signup-semester"
                        className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                      >
                        Current Semester
                      </label>
                      <input
                        id="signup-semester"
                        type="text"
                        value={signupSemester}
                        onChange={(e) => setSignupSemester(e.target.value)}
                        className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>
                  )}
                  <div className={signupRole === 'teacher' ? 'sm:col-span-2' : ''}>
                    <label
                      htmlFor="signup-specialization"
                      className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                    >
                      {signupRole === 'teacher' ? 'Research / Subject Area' : 'Study Track'}
                    </label>
                    <input
                      id="signup-specialization"
                      type="text"
                      value={signupSpecialization}
                      onChange={(e) => setSignupSpecialization(e.target.value)}
                      className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.6)] border border-[hsl(var(--input))] rounded-lg text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Enter Workspace</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
        ExamWise AI · Academic Preparation & Evaluation Platform
      </footer>
    </div>
  );
};
