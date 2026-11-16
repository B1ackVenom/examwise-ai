import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from '../../context/RoleContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { UserProfile } from '../../types';
import {
  User,
  GraduationCap,
  Sparkles,
  Plus,
  Check,
  X,
  Trash2,
  Layers,
  Lock,
  LogOut,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profiles, user, selectProfile, createProfile, deleteProfile, logout } = useRole();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);

  // New Profile Form State (locked to current workspace role)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newSemester, setNewSemester] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newAccentColor, setNewAccentColor] = useState('#1f60f0');

  if (!user) return null;

  const teacherProfiles = profiles.filter((p) => p.role === 'teacher');
  const studentProfiles = profiles.filter((p) => p.role === 'student');

  const handleSelectSameRoleProfile = (profile: UserProfile) => {
    if (profile.role !== user.role) {
      info('Sign out to log in with a different role account.');
      return;
    }
    selectProfile(profile.id);
    onClose();
    success(`Switched active profile to ${profile.name}`);
  };

  const handleConfirmDelete = () => {
    if (!profileToDelete) return;
    const deletingCurrent = profileToDelete.id === user.id;
    const deletedName = profileToDelete.name;
    deleteProfile(profileToDelete.id);
    setProfileToDelete(null);
    info(`Removed profile for ${deletedName}.`);
    if (deletingCurrent) {
      onClose();
      navigate('/login', { replace: true });
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      error('Full name, email, and password are required.');
      return;
    }
    if (profiles.some((p) => p.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      error('An account with this email already exists.');
      return;
    }

    const created = createProfile({
      name: newName.trim(),
      role: user.role,
      email: newEmail.trim(),
      password: newPassword,
      department: newDepartment.trim() || 'General',
      institution: newInstitution.trim() || 'Academic Institution',
      roleLabel: newRoleLabel.trim() || (user.role === 'teacher' ? 'Faculty' : 'Student'),
      semester: user.role === 'student' ? newSemester.trim() : undefined,
      specialization: newSpecialization.trim() || undefined,
      accentColor: newAccentColor,
      avatar: '',
    });

    success(`Profile created for ${created.name}`);
    setActiveTab('manage');
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewDepartment('');
    setNewInstitution('');
    setNewRoleLabel('');
    setNewSemester('');
    setNewSpecialization('');
    onClose();
  };

  const accentColors = [
    { label: 'Cobalt', hex: '#1f60f0' },
    { label: 'Indigo', hex: '#4f46e5' },
    { label: 'Dracula Purple', hex: '#bd93f9' },
    { label: 'Emerald', hex: '#0d9488' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Rose', hex: '#e11d48' },
  ];

  const renderProfileRow = (p: UserProfile) => {
    const isCurrent = p.id === user.id;
    const isSameRole = p.role === user.role;

    return (
      <div
        key={p.id}
        onClick={() => isSameRole && handleSelectSameRoleProfile(p)}
        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
          isSameRole ? 'cursor-pointer' : 'cursor-default opacity-85'
        } ${
          isCurrent
            ? 'border-[hsl(var(--ring))] bg-[hsl(var(--primary)/0.08)] ring-1 ring-[hsl(var(--ring))]'
            : isSameRole
            ? 'border-[hsl(var(--border))] hover:border-[hsl(var(--ring)/0.5)] hover:bg-[hsl(var(--secondary)/0.5)]'
            : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)]'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[hsl(var(--border))] flex items-center justify-center font-bold text-white text-sm"
            style={{ backgroundColor: p.accentColor || (p.role === 'teacher' ? '#1f60f0' : '#0d9488') }}
          >
            {p.name.charAt(0).toUpperCase()}
          </div>

          <div className="truncate text-left">
            <div className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2 truncate">
              <span>{p.name}</span>
              <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                {p.email}
              </span>
            </div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
              {p.roleLabel} · {p.department}
            </div>
            {p.specialization && (
              <div className="text-[10px] text-[hsl(var(--accent-text))] truncate">
                {p.specialization}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCurrent ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Active</span>
            </span>
          ) : isSameRole ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSameRoleProfile(p);
              }}
              className="px-3 py-1 text-xs rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              Use Profile
            </button>
          ) : (
            <span
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[10px] font-mono"
              title="Sign out to log into another role workspace"
            >
              <Lock className="w-3 h-3" />
              <span>Other Role</span>
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setProfileToDelete(p);
            }}
            className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title={`Remove profile ${p.name}`}
            aria-label={`Remove profile ${p.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
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
              className="relative w-full max-w-2xl bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between shrink-0 bg-[hsl(var(--background)/0.5)]">
                <div>
                  <h2 className="text-base font-bold text-[hsl(var(--foreground))] font-display flex items-center gap-2">
                    <User className="w-5 h-5 text-[hsl(var(--accent-text))]" />
                    Manage Profiles
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Create or remove registered profiles. To log into another role, sign out first.
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-3 shrink-0 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('manage')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      activeTab === 'manage'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Saved Profiles ({profiles.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      activeTab === 'create'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New {user.role === 'teacher' ? 'Faculty' : 'Student'} Profile</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                    navigate('/login', { replace: true });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-rose-500 hover:bg-rose-500/10 border border-[hsl(var(--border))] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {activeTab === 'manage' ? (
                  <div className="space-y-6">
                    {/* Faculty Profiles */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-mono flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[hsl(var(--accent-text))]" />
                        Faculty Profiles ({teacherProfiles.length})
                      </div>
                      {teacherProfiles.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] text-center">
                          No faculty profiles saved.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {teacherProfiles.map(renderProfileRow)}
                        </div>
                      )}
                    </div>

                    {/* Student Profiles */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-mono flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-500" />
                        Student Profiles ({studentProfiles.length})
                      </div>
                      {studentProfiles.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] text-center">
                          No student profiles saved.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {studentProfiles.map(renderProfileRow)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateProfile} className="space-y-4">
                    <div className="p-3 rounded-lg bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                      Creating a new <strong className="text-[hsl(var(--foreground))] capitalize">{user.role}</strong> profile for your current workspace. Sign out to register an account for a different role.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={4}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                          {user.role === 'teacher' ? 'Academic Title' : 'Program Standing'}
                        </label>
                        <input
                          type="text"
                          value={newRoleLabel}
                          onChange={(e) => setNewRoleLabel(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={newDepartment}
                          onChange={(e) => setNewDepartment(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={newInstitution}
                          onChange={(e) => setNewInstitution(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {user.role === 'student' && (
                        <div>
                          <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                            Semester
                          </label>
                          <input
                            type="text"
                            value={newSemester}
                            onChange={(e) => setNewSemester(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                          />
                        </div>
                      )}
                      <div className={user.role === 'teacher' ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">
                          Specialization / Focus
                        </label>
                        <input
                          type="text"
                          value={newSpecialization}
                          onChange={(e) => setNewSpecialization(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                        Avatar Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        {accentColors.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setNewAccentColor(c.hex)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                              newAccentColor === c.hex
                                ? 'scale-110 ring-2 ring-offset-2 ring-[hsl(var(--ring))]'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          >
                            {newAccentColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('manage')}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create & Activate Profile</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!profileToDelete}
        onClose={() => setProfileToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Profile"
        message={
          profileToDelete?.id === user.id
            ? `Remove your active profile (${profileToDelete?.name})? You will be signed out and returned to the login screen.`
            : `Remove profile for ${profileToDelete?.name} (${profileToDelete?.email})? This cannot be undone.`
        }
        confirmLabel="Remove Profile"
        variant="danger"
      />
    </>
  );
};
