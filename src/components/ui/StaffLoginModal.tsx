import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { UserRole } from '../../types';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (role: UserRole) => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { login, school } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter your Staff Username/Email and Password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const profile = await login(identifier.trim(), password.trim());
      showToast(`Welcome back, ${profile.fullName}!`, 'success');
      onSuccess?.(profile.role);
      onClose();
    } catch (err: any) {
      console.error('Staff login error:', err);
      const msg =
        err.message ||
        'Invalid Staff Username or Password. Please verify your credentials or contact the System Administrator.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (username: string, pass: string) => {
    setIdentifier(username);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff & Employee Portal Login"
      subtitle="Authorized access for Teachers, Administrators, Bursars, and Staff"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs text-slate-700 py-1">
        {/* Header Notice Banner */}
        <div className="p-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Briefcase className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="font-black text-sm text-white leading-tight">
              {school?.name || 'Gracia Learning Centre'}
            </h4>
            <p className="text-[11px] text-blue-200 mt-0.5">
              Institutional ERP & Faculty Portal Gateway
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Staff Username or Official Email:
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. mwalimu.omondi or deputy@glcm.ac.ke"
                required
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-900 focus:border-transparent font-medium bg-slate-50/50 focus:bg-white"
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Staff Password / PIN:
              </label>
              <span className="text-[10px] text-slate-400">Default: Password@2026</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your confidential password"
                required
                className="w-full px-3.5 py-2.5 pl-9 pr-10 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-900 focus:border-transparent font-medium bg-slate-50/50 focus:bg-white"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>



          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            icon={<LogIn className="w-4 h-4" />}
            className="w-full font-bold text-xs py-2.5 shadow-sm"
          >
            Authenticate & Open Portal
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            256-bit Encrypted Session
          </span>
          <span>Forgot PIN? Contact Admin</span>
        </div>
      </div>
    </Modal>
  );
};
