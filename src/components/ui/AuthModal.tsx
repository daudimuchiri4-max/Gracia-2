import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { UserRole } from '../../types';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  LogOut,
  LogIn,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Users,
  BookMarked,
  DollarSign,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  onSuccess?: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'SCHOOL_ADMIN',
  onSuccess,
}) => {
  const { user, loginWithGoogle, login, logout, activeRole, switchRole } = useAuth();
  const { showToast } = useToast();

  const [authMode, setAuthMode] = useState<'GOOGLE' | 'EMAIL'>('GOOGLE');
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const profile = await loginWithGoogle();
      showToast(`Welcome, ${profile.fullName}! Signed in with Google.`, 'success');
      if (selectedRole && profile.role !== selectedRole && profile.role !== 'SUPER_ADMIN') {
        switchRole(selectedRole);
      }
      onSuccess?.(profile.role || selectedRole);
      onClose();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      let msg = err.message || 'Google sign-in failed. Please try again.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Google sign-in popup was closed before completing.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by browser. Please allow popups for this site.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection issue. Please check your internet connection.';
      }
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const profile = await login(email.trim(), password);
      showToast(`Welcome back, ${profile.fullName}!`, 'success');
      if (selectedRole && profile.role !== selectedRole) {
        switchRole(selectedRole);
      }
      onSuccess?.(profile.role || selectedRole);
      onClose();
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      let msg = err.message || 'Invalid credentials. Please verify your email and password.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = email.includes('@gmail.com')
          ? 'Invalid credentials. Because this is a Gmail address, please switch to the "Google Account (Instant)" tab above and click "Sign in with Google".'
          : 'Invalid email or password. Please check your credentials, or sign in using your Google account.';
      }
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      showToast('You have been signed out successfully.', 'info');
    } catch (err: any) {
      showToast('Error signing out: ' + err.message, 'error');
    }
  };

  const isAlreadyLoggedIn = user && user.email && user.id !== 'demo-admin-id';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure System Portal Access"
      subtitle="Sign in with your official Google Account or portal credentials"
      maxWidth="md"
    >
      <div className="space-y-5 text-xs text-slate-700 py-1">
        {/* If user is already authenticated with Google / Real account */}
        {isAlreadyLoggedIn ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-12 h-12 rounded-full border-2 border-emerald-400 object-cover shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {user.fullName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-sm truncate">{user.fullName}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Active Google Session
                  </span>
                </div>
                <p className="text-slate-600 text-xs truncate mt-0.5">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-800 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authorized Role: <strong>{user.role.replace('_', ' ')}</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<LogOut className="w-3.5 h-3.5" />}
                onClick={handleSignOut}
                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                Sign Out
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => {
                  onSuccess?.(user.role);
                  onClose();
                }}
                className="text-xs font-bold"
              >
                Continue to {user.role === 'PARENT' ? 'Parent Portal' : user.role === 'TEACHER' ? 'Teacher Portal' : 'Admin ERP'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Role / Destination Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                Select Your Portal Role:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { role: 'SCHOOL_ADMIN' as UserRole, label: 'Admin / Bursar', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                  { role: 'TEACHER' as UserRole, label: 'Teacher Portal', icon: <GraduationCap className="w-3.5 h-3.5" /> },
                  { role: 'PARENT' as UserRole, label: 'Parent Portal', icon: <Users className="w-3.5 h-3.5" /> },
                  { role: 'STUDENT' as UserRole, label: 'Learner Portal', icon: <BookMarked className="w-3.5 h-3.5" /> },
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedRole(item.role)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedRole === item.role
                        ? 'border-blue-900 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={selectedRole === item.role ? 'text-blue-900' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      {selectedRole === item.role && (
                        <span className="w-2 h-2 rounded-full bg-blue-900" />
                      )}
                    </div>
                    <span className="text-[11px] leading-tight font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auth Mode Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('GOOGLE');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  authMode === 'GOOGLE'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Google Account (Instant)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('EMAIL');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'EMAIL'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email & Password</span>
              </button>
            </div>

            {/* Error message banner */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed font-medium">{errorMessage}</p>
                </div>
                {authMode === 'EMAIL' && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('GOOGLE');
                        setErrorMessage(null);
                      }}
                      className="px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-100/60 text-rose-900 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Switch to Google Sign-In &rarr;</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Google Login Tab */}
            {authMode === 'GOOGLE' && (
              <div className="space-y-4 pt-1">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Google Workspace & Gmail Sign-In</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Use your registered Google account to sign into the system securely.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-slate-400 rounded-xl font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>{loading ? 'Authenticating with Google...' : 'Sign in with Google'}</span>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Protected by Firebase Authentication & 256-bit SSL</span>
                  </div>
                </div>
              </div>
            )}

            {/* Email / Password Login Tab */}
            {authMode === 'EMAIL' && (
              <form onSubmit={handleEmailSignIn} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Username or Email Address:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. mwalimu.omondi or deputy@glcm.ac.ke"
                      required
                      className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-900 focus:border-transparent font-medium"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  {email.toLowerCase().endsWith('@gmail.com') && (
                    <p className="mt-1 text-[11px] text-blue-800 bg-blue-50 border border-blue-200/80 rounded-lg p-2 flex items-center justify-between">
                      <span>💡 For Gmail accounts, use 1-click Google Sign-In:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('GOOGLE');
                          setErrorMessage(null);
                        }}
                        className="font-bold underline ml-1 cursor-pointer text-blue-900"
                      >
                        Use Google Login
                      </button>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Password:
                    </label>
                    <span className="text-[10px] text-slate-400">Default: Password@2026</span>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your assigned password"
                      required
                      className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-900 focus:border-transparent font-medium"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Quick Staff Demo Credential Selector */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Quick Demo Credentials (Click to fill):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Admin', user: 'daudi.muchiri', role: 'SUPER_ADMIN' as UserRole },
                      { name: 'Teacher', user: 'catherine.mutua', role: 'TEACHER' as UserRole },
                      { name: 'Deputy Head', user: 'deputy.omondi', role: 'DEPUTY_HEADTEACHER' as UserRole },
                      { name: 'Accounts', user: 'accounts.patrick', role: 'ACCOUNTANT' as UserRole },
                      { name: 'Reception', user: 'reception.faith', role: 'RECEPTIONIST' as UserRole },
                    ].map((item) => (
                      <button
                        key={item.user}
                        type="button"
                        onClick={() => {
                          setEmail(item.user);
                          setPassword('Password@2026');
                          setSelectedRole(item.role);
                        }}
                        className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        {item.name} (@{item.user})
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  icon={<LogIn className="w-4 h-4" />}
                  className="w-full font-bold text-xs"
                >
                  Sign In to Portal
                </Button>
              </form>
            )}

            {/* Protected security note */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Google Authentication & 256-bit SSL</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
