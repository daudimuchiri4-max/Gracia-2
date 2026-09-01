import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { UserRole } from '../../types';
import { printerService } from '../../services/printerService';
import { PrinterManagerModal } from '../ui/PrinterManagerModal';
import {
  School as SchoolIcon,
  Bell,
  Sparkles,
  Globe,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Menu,
  Printer,
} from 'lucide-react';

interface TopNavbarProps {
  onToggleSidebar?: () => void;
  onNavigatePublic?: () => void;
  currentView?: string;
  onNavigate?: (view: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleSidebar,
  onNavigatePublic,
  onNavigate,
}) => {
  const { user, school, activeRole, setActiveRole, logout } = useAuth();
  const { showToast } = useToast();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  const printerConfig = printerService.getConfig();

  const availableRoles: { role: UserRole; label: string }[] = [
    { role: 'SCHOOL_ADMIN', label: 'School Admin / Principal' },
    { role: 'TEACHER', label: 'Teacher / Facilitator' },
    { role: 'PARENT', label: 'Parent Portal' },
    { role: 'STUDENT', label: 'Student Portal' },
    { role: 'ACCOUNTANT', label: 'Bursar / Accountant' },
    { role: 'CASHIER', label: 'POS Cashier' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left section: Hamburger & School info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          {school?.logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
              <img
                src={school.logoUrl}
                alt={school.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 tracking-wider">
              {school?.code ? school.code.slice(0, 4) : 'GLCM'}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
              {school?.name || 'Gracia Learning Centre'}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>{school?.academicYear || '2026'} • {school?.currentTerm || 'Term 1'}</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="hidden sm:inline text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                {school?.currency || 'KES'} ({school?.currencySymbol || 'KSh'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Physical Printer Hardware Connector Button */}
        <button
          onClick={() => setPrinterModalOpen(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
            printerConfig.isConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
          }`}
          title="Physical Printer & Hardware Settings (ESC/POS Thermal, USB/Bluetooth & A4 Drivers)"
        >
          <Printer className={`w-3.5 h-3.5 ${printerConfig.isConnected ? 'text-emerald-700' : 'text-slate-500'}`} />
          <span className="hidden md:inline">Printer</span>
          <span
            className={`w-2 h-2 rounded-full ${
              printerConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
        </button>

        {/* Public Website View Link */}
        <button
          onClick={onNavigatePublic}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-blue-900" />
          <span className="hidden sm:inline">Public Website</span>
        </button>

        {/* Switch Role Simulator Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-950 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
            <span className="font-semibold hidden sm:inline">Role:</span>
            <span className="font-bold text-blue-900">{activeRole.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Portal Role
              </div>
              {availableRoles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    setActiveRole(r.role);
                    setRoleMenuOpen(false);
                    showToast(`Switched portal view to ${r.label}`, 'info');
                    if (r.role === 'PARENT' && onNavigate) onNavigate('parent-portal');
                    else if (r.role === 'TEACHER' && onNavigate) onNavigate('teacher-portal');
                    else if (r.role === 'STUDENT' && onNavigate) onNavigate('student-portal');
                    else if (r.role === 'CASHIER' && onNavigate) onNavigate('pos');
                    else if (onNavigate) onNavigate('dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                    activeRole === r.role ? 'font-bold text-blue-900 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{r.label}</span>
                  {activeRole === r.role && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User avatar / profile button */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-none">{user?.fullName || 'Administrator'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{user?.email || 'admin@school.ac.ke'}</div>
          </div>
        </div>
      </div>

      <PrinterManagerModal
        isOpen={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
      />
    </header>
  );
};
