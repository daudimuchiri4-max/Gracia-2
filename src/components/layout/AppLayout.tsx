import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { UserRole } from '../../types';
import { ActiveView } from '../../App';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AuthModal } from '../ui/AuthModal';
import { SubscriptionStatusBadge } from '../subscription/SubscriptionStatusBadge';
import { SubscriptionRenewalModal } from '../subscription/SubscriptionRenewalModal';
import { subscriptionService, DEFAULT_SUBSCRIPTION_CONFIG } from '../../services/subscriptionService';
import { SchoolSubscriptionConfig } from '../../types';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCheck,
  GraduationCap,
  Award,
  FileText,
  CalendarCheck,
  DollarSign,
  ShoppingCart,
  Package,
  BookOpen,
  Bus,
  HeartPulse,
  Megaphone,
  Globe,
  BarChart2,
  Settings,
  ShieldCheck,
  Sparkles,
  Menu,
  X,
  Building,
  RefreshCw,
  Search,
  School,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  LogOut,
  Clock,
  CreditCard,
} from 'lucide-react';

interface AppLayoutProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onOpenPublicSite: () => void;
  children: React.ReactNode;
}

interface NavSection {
  title: string;
  items: {
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    roles?: UserRole[];
  }[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeView,
  onNavigate,
  onOpenPublicSite,
  children,
}) => {
  const { school, activeRole, switchRole, user, logout, seedDemoData } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<SchoolSubscriptionConfig>(DEFAULT_SUBSCRIPTION_CONFIG);

  useEffect(() => {
    const loadSub = async () => {
      try {
        const config = await subscriptionService.getSubscriptionConfig(school?.id);
        setSubscription(config);
      } catch (e) {
        console.warn('Could not load subscription in AppLayout:', e);
      }
    };
    loadSub();
  }, [school?.id]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      showToast('Sample Kenyan CBC school data successfully initialized in Firestore!', 'success');
    } catch (e: any) {
      showToast('Error seeding sample data: ' + e.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
      onOpenPublicSite();
      showToast('You have been logged out and returned to the Public Website.', 'info');
    } catch (err: any) {
      showToast('Error logging out: ' + err.message, 'error');
    }
  };

  const navSections: NavSection[] = [
    {
      title: 'Core Administration',
      items: [
        { id: 'DASHBOARD', label: 'Overview Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'STUDENTS', label: 'Learners Directory', icon: <Users className="w-4 h-4" /> },
        { id: 'ADMISSIONS', label: 'Online Admissions', icon: <UserPlus className="w-4 h-4" />, badge: 'New' },
        { id: 'PARENTS', label: 'Parents / Guardians', icon: <Users className="w-4 h-4" /> },
        { id: 'STAFF', label: 'Teaching & Staff (TSC)', icon: <UserCheck className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Academics & CBC',
      items: [
        { id: 'ACADEMICS', label: 'Classes & Streams', icon: <GraduationCap className="w-4 h-4" /> },
        { id: 'ASSESSMENTS', label: 'CBC Rubrics & Marks', icon: <Award className="w-4 h-4" /> },
        { id: 'REPORT_CARDS', label: 'Terminal Report Cards', icon: <FileText className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Operations & Finance',
      items: [
        { id: 'ATTENDANCE', label: 'Daily Attendance Roll', icon: <CalendarCheck className="w-4 h-4" /> },
        { id: 'FEES', label: 'Fee Invoicing & Receipts', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'POS', label: 'Canteen & Store POS', icon: <ShoppingCart className="w-4 h-4" /> },
        { id: 'INVENTORY', label: 'Inventory & Assets', icon: <Package className="w-4 h-4" /> },
        { id: 'LIBRARY', label: 'Library & Reader Books', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'TRANSPORT', label: 'Bus Routes & Fleet', icon: <Bus className="w-4 h-4" /> },
        { id: 'HEALTH_DISCIPLINE', label: 'Clinic & Discipline', icon: <HeartPulse className="w-4 h-4" /> },
        { id: 'COMMUNICATION', label: 'Notices & Calendar', icon: <Megaphone className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Website & System',
      items: [
        { id: 'PUBLIC', label: 'Public Website (Live)', icon: <Globe className="w-4 h-4 text-blue-600" />, badge: 'Live' },
        { id: 'WEBSITE_CMS', label: 'Public Website CMS & Hero', icon: <Globe className="w-4 h-4" /> },
        ...(activeRole === 'SUPER_ADMIN'
          ? [
              {
                id: 'SAAS_BILLING' as ActiveView,
                label: 'System Owner Console',
                icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
                badge: 'Owner',
              },
            ]
          : []),
        { id: 'ROLES_PERMISSIONS', label: 'Roles & Permissions', icon: <ShieldCheck className="w-4 h-4 text-emerald-600" /> },
        { id: 'REPORTS', label: 'Analytics & CSV Exports', icon: <BarChart2 className="w-4 h-4" /> },
        { id: 'SETTINGS', label: 'School Settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
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
              <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 tracking-wider">
                {school?.code ? school.code.slice(0, 4) : 'GLC'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  {school?.name || 'Gracia Learning Centre'}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-blue-50 text-blue-900 px-2 py-0.5 rounded-md border border-blue-100 font-mono">
                  {school?.academicYear || '2026'} ({school?.currentTerm || 'Term 1'})
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Primary School ERP • Playgroup to Grade 9 CBC
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* SaaS Monthly Subscription Badge (Restricted strictly to System Owner / Super Admin) */}
          {activeRole === 'SUPER_ADMIN' && (
            <SubscriptionStatusBadge
              subscription={subscription}
              onOpenRenewal={() => setIsRenewalModalOpen(true)}
              isSuperAdmin={true}
            />
          )}

          {/* Public Website button */}
          <Button
            variant="outline"
            size="sm"
            icon={<Globe className="w-3.5 h-3.5 text-blue-900" />}
            onClick={onOpenPublicSite}
            className="text-xs font-bold border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-950 px-2.5"
          >
            <span className="hidden xs:inline">Public</span> Website
          </Button>

          {/* Seed Sample Data Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
            loading={seeding}
            onClick={handleSeed}
            className="text-xs font-semibold hidden sm:inline-flex"
          >
            Load Sample Data
          </Button>

          {/* Role Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wider hidden sm:inline">
              Role:
            </label>
            <select
              value={activeRole}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                switchRole(role);
                if (role === 'TEACHER') onNavigate('TEACHER_PORTAL');
                else if (role === 'PARENT') onNavigate('PARENT_PORTAL');
                else if (role === 'STUDENT') onNavigate('STUDENT_PORTAL');
                else if (role === 'SUPER_ADMIN') onNavigate('SUPER_ADMIN');
                else onNavigate('DASHBOARD');
              }}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer pr-4"
            >
              <option value="ADMIN">Admin ERP</option>
              <option value="TEACHER">Teacher</option>
              <option value="PARENT">Parent</option>
              <option value="STUDENT">Learner</option>
              <option value="SUPER_ADMIN">SaaS Admin</option>
            </select>
          </div>

          {/* User Profile & Google Account Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="Account & Google Sign-In"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden xl:block text-left pr-1">
                <div className="text-xs font-bold text-slate-900 leading-none truncate max-w-[120px]">
                  {user?.fullName || 'Administrator'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                  {user?.email || 'admin@school.ac.ke'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 text-xs">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-xs truncate">{user?.fullName || 'School User'}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                      {activeRole.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> 5m Auto-Logout Active
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700 cursor-pointer"
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
                    <span>Sign In with Google Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenPublicSite();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-blue-900" />
                    <span>View Public Website</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 font-semibold text-rose-700 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out to Public Website</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Sidebar Close */}
          <div className="lg:hidden p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900">ERP Navigation</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Quick Portals Links for easy testing */}
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Portals & Public Site
              </span>
              <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
                <button
                  onClick={() => {
                    onNavigate('TEACHER_PORTAL');
                    setSidebarOpen(false);
                  }}
                  className={`p-1.5 rounded-xl text-center cursor-pointer transition-colors ${
                    activeView === 'TEACHER_PORTAL' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Teacher
                </button>
                <button
                  onClick={() => {
                    onNavigate('PARENT_PORTAL');
                    setSidebarOpen(false);
                  }}
                  className={`p-1.5 rounded-xl text-center cursor-pointer transition-colors ${
                    activeView === 'PARENT_PORTAL' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Parent
                </button>
                <button
                  onClick={() => {
                    onNavigate('STUDENT_PORTAL');
                    setSidebarOpen(false);
                  }}
                  className={`p-1.5 rounded-xl text-center cursor-pointer transition-colors ${
                    activeView === 'STUDENT_PORTAL' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Learner
                </button>
                <button
                  onClick={() => {
                    onOpenPublicSite();
                    setSidebarOpen(false);
                  }}
                  className="p-1.5 rounded-xl text-center cursor-pointer transition-colors bg-blue-50 text-blue-900 hover:bg-blue-100 font-bold border border-blue-200/60"
                  title="View Public Website"
                >
                  Website
                </button>
              </div>
            </div>

            {/* Admin Modules Navigation */}
            {navSections.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                  {sec.title}
                </span>
                <div className="space-y-0.5 pt-1">
                  {sec.items.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'PUBLIC') {
                            onOpenPublicSite();
                          } else {
                            onNavigate(item.id);
                          }
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
            Kenyan CBC Framework • v1.0
          </div>
        </aside>

        {/* Backdrop for Mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <SubscriptionRenewalModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        subscription={subscription}
        onSubscriptionUpdated={(newConfig) => setSubscription(newConfig)}
        schoolName={school?.name || 'Gracia Learning Centre'}
      />
    </div>
  );
};
