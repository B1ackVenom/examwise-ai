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
  Lock,
  Mail,
  User,
  Building2,
  Zap,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, signup, profiles } = useRole();
  const { theme, setTheme } = useTheme();
  const { success } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

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

  const executeLogin = (email: string, pass: string) => {
    setError('');
    const res = login(email, pass);
    if (!res.success || !res.user) {
      setError(res.error || 'Authentication failed. Please verify credentials.');
      return;
    }
    success(`Welcome back, ${res.user.name}`);
    navigate(res.user.role === 'teacher' ? '/teacher/overview' : '/student/overview', {
      replace: true,
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(loginEmail, loginPassword);
  };

  const handleInstantSignIn = (roleId: string, email: string, pass: string) => {
    setLoadingRole(roleId);
    setTimeout(() => {
      executeLogin(email, pass);
      setLoadingRole(null);
    }, 200);
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
    success(`Workspace created for ${res.user.name}`);
    navigate(res.user.role === 'teacher' ? '/teacher/overview' : '/student/overview', {
      replace: true,
    });
  };

  const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'tokyo-night', label: 'Tokyo Night', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'dracula', label: 'Dracula', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="relative min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col justify-between overflow-hidden selection:bg-[hsl(var(--primary)/0.3)] selection:text-[hsl(var(--foreground))]">
      {/* Dynamic Ambient Glow Mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[hsl(var(--primary)/0.18)] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px]" />
        {/* Subtle grid texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-indigo-600 text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.25)] ring-1 ring-white/20">
            <GraduationCap className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full ring-2 ring-[hsl(var(--background))]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg tracking-tight text-[hsl(var(--foreground))]">
                ExamWise<span className="text-[hsl(var(--primary))]">.AI</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v2.0 PRO
              </span>
            </div>
            <span className="block text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
              Zero-Hallucination Academic OS
            </span>
          </div>
        </div>

        {/* Theme Switcher */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm backdrop-blur-md"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md font-semibold'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/0.5)]'
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Sassy Pitch & 1-Click Instant Demo Portals */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.25)] text-xs font-mono font-medium text-[hsl(var(--accent-text))]">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Deterministic NLP + Generative AI</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[hsl(var(--foreground))] font-display leading-[1.1]">
                Academic Rigour,{' '}
                <span className="bg-gradient-to-r from-[hsl(var(--primary))] via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  Uncompromised.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
                Tired of arbitrary grading, spreadsheet arithmetic mistakes, and hallucinated MCQs? ExamWise AI enforces university syllabus partition rules, vector-space semantic grading, and tamper-evident mark audit trails.
              </p>
            </div>

            {/* Instant 1-Click Test Drive Section */}
            <div className="p-5 rounded-2xl bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] backdrop-blur-xl shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono text-[hsl(var(--foreground))]">
                    1-Click Instant Demo Portals
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready to test
                </span>
              </div>

              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Explore role-isolated consoles with zero sign-up friction:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Teacher Quick Button */}
                <button
                  type="button"
                  onClick={() => handleInstantSignIn('user-tch-01', 'teacher@examwise.edu', 'password123')}
                  disabled={loadingRole !== null}
                  className="group relative p-3.5 rounded-xl border border-[hsl(var(--primary)/0.3)] bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-[hsl(var(--card))] hover:border-[hsl(var(--primary))] hover:shadow-lg hover:shadow-[hsl(var(--primary)/0.15)] text-left transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--accent-text))]">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-text))] transition-colors">
                          Dr. Elena Mercer
                        </div>
                        <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                          Faculty Examiner
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                    <span>teacher@examwise.edu</span>
                    <span className="text-[hsl(var(--accent-text))] font-bold group-hover:underline">Launch →</span>
                  </div>
                </button>

                {/* Student Quick Button */}
                <button
                  type="button"
                  onClick={() => handleInstantSignIn('user-std-01', 'student@examwise.edu', 'password123')}
                  disabled={loadingRole !== null}
                  className="group relative p-3.5 rounded-xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-[hsl(var(--card))] hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/15 text-left transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[hsl(var(--foreground))] group-hover:text-teal-400 transition-colors">
                          Alex Morgan
                        </div>
                        <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                          Student Scholar
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                    <span>student@examwise.edu</span>
                    <span className="text-teal-400 font-bold group-hover:underline">Launch →</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-[hsl(var(--secondary)/0.4)] border border-[hsl(var(--border))]">
                <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--foreground))]">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dual NLP Grading</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                  Cosine similarity vector space + LLM rubric reasoning.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[hsl(var(--secondary)/0.4)] border border-[hsl(var(--border))]">
                <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--foreground))]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero-MCQ Rigor</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                  Mid/End-Term papers with strict module mark bounds.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek Glassmorphic Form Card */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl bg-[hsl(var(--card)/0.85)] border border-[hsl(var(--border))] backdrop-blur-2xl p-6 sm:p-10 shadow-2xl ring-1 ring-white/5">
              
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    mode === 'login'
                      ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md border border-[hsl(var(--border))] ring-1 ring-black/5'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    mode === 'signup'
                      ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md border border-[hsl(var(--border))] ring-1 ring-black/5'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Login Mode */}
              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[hsl(var(--foreground))] font-display">
                      Welcome to your Workspace
                    </h2>
                    <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      Enter your institutional credentials or test-drive using the 1-click portals.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="login-email"
                        className="block text-xs font-bold tracking-wide uppercase font-mono text-[hsl(var(--foreground))] mb-1.5"
                      >
                        Institutional Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                        <input
                          id="login-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="e.g. teacher@examwise.edu"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-3 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.5)] focus:outline-hidden focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="login-password"
                          className="block text-xs font-bold tracking-wide uppercase font-mono text-[hsl(var(--foreground))]"
                        >
                          Password
                        </label>
                        <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
                          Default: password123
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-10 pr-11 py-3 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.5)] focus:outline-hidden focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-indigo-600 hover:from-[hsl(var(--primary))] hover:to-indigo-500 text-[hsl(var(--primary-foreground))] text-sm font-bold tracking-wide shadow-lg shadow-[hsl(var(--primary)/0.25)] hover:shadow-[hsl(var(--primary)/0.4)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Launch Workspace</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </form>
              ) : (
                /* Signup Mode */
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[hsl(var(--foreground))] font-display">
                      Create Your Profile
                    </h2>
                    <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      Choose your academic discipline and role. Workspaces are tailored specifically to your function.
                    </p>
                  </div>

                  {/* Role Cards */}
                  <div>
                    <span className="block text-xs font-bold tracking-wide uppercase font-mono text-[hsl(var(--foreground))] mb-2">
                      Academic Designation *
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSignupRole('student')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          signupRole === 'student'
                            ? 'border-teal-400 bg-teal-500/10 text-teal-400 shadow-sm ring-1 ring-teal-500/20'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>Student Scholar</span>
                        </div>
                        <div className="text-[11px] opacity-80 mt-1">
                          Cornell notes & practice assessments
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSignupRole('teacher')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          signupRole === 'teacher'
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--accent-text))] shadow-sm ring-1 ring-[hsl(var(--primary)/0.2)]'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Faculty Examiner</span>
                        </div>
                        <div className="text-[11px] opacity-80 mt-1">
                          Curriculum authoring & dual-engine grading
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-name"
                        className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                      >
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                        <input
                          id="signup-name"
                          type="text"
                          required
                          placeholder="e.g. Prof. Alan Turing"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                      >
                        Institutional Email *
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                        <input
                          id="signup-email"
                          type="email"
                          required
                          placeholder="you@university.edu"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password & Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                      >
                        Password * (min 4 chars)
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={4}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
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
                        {signupRole === 'teacher' ? 'Academic Title' : 'Current Standing'}
                      </label>
                      <input
                        id="signup-role-label"
                        type="text"
                        placeholder={signupRole === 'teacher' ? 'Associate Professor' : 'Undergraduate Senior'}
                        value={signupRoleLabel}
                        onChange={(e) => setSignupRoleLabel(e.target.value)}
                        className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>
                  </div>

                  {/* Department & Institution */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-department"
                        className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1"
                      >
                        Department
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                        <input
                          id="signup-department"
                          type="text"
                          placeholder="Computer Science & Eng"
                          value={signupDepartment}
                          onChange={(e) => setSignupDepartment(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
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
                        placeholder="ExamWise Institute of Tech"
                        value={signupInstitution}
                        onChange={(e) => setSignupInstitution(e.target.value)}
                        className="w-full px-3 py-2 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--input))] rounded-xl text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-1 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-indigo-600 hover:from-[hsl(var(--primary))] hover:to-indigo-500 text-[hsl(var(--primary-foreground))] text-sm font-bold tracking-wide shadow-lg shadow-[hsl(var(--primary)/0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Profile & Launch Workspace</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sassy, Professional Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border)/0.5)]">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Status: All Engines Operational · 54/54 Verifications Passed</span>
        </div>
        <div className="font-mono text-[11px]">
          ExamWise AI · Built for Educational Rigor & Algorithmic Fairness
        </div>
      </footer>
    </div>
  );
};
