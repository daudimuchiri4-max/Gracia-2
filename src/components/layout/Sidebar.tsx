import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Award,
  FileText,
  DollarSign,
  ShoppingCart,
  Package,
  Library,
  Calendar,
  Bus,
  UserCheck,
  HeartPulse,
  AlertTriangle,
  Megaphone,
  Globe,
  BarChart3,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserSquare2,
  UserPlus,
  BookMarked,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { activeRole, school } = useAuth();

  const navSections = [
    {
      title: 'CORE ERP',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
        { id: 'admissions', label: 'Online Admissions', icon: <UserSquare2 className="w-4 h-4" /> },
        { id: 'parents', label: 'Parents Directory', icon: <UserCheck className="w-4 h-4" /> },
      ],
    },
    {
      title: 'ACADEMICS & CBC',
      items: [
        { id: 'academics', label: 'Classes & Subjects', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'assessments', label: 'CBC Assessments', icon: <Award className="w-4 h-4" /> },
        { id: 'report-cards', label: 'Report Cards', icon: <FileText className="w-4 h-4" /> },
        { id: 'attendance', label: 'Attendance Roll Call', icon: <CalendarCheck className="w-4 h-4" /> },
        { id: 'timetable', label: 'Class Timetable', icon: <Calendar className="w-4 h-4" /> },
      ],
    },
    {
      title: 'FINANCE & COMMERCE',
      items: [
        { id: 'fees', label: 'Fees & Invoicing', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'pos', label: 'School POS Cashier', icon: <ShoppingCart className="w-4 h-4" /> },
        { id: 'inventory', label: 'Stock & Inventory', icon: <Package className="w-4 h-4" /> },
      ],
    },
    {
      title: 'OPERATIONS & SUPPORT',
      items: [
        { id: 'library', label: 'Library Management', icon: <Library className="w-4 h-4" /> },
        { id: 'transport', label: 'School Transport', icon: <Bus className="w-4 h-4" /> },
        { id: 'staff', label: 'Staff & HR', icon: <GraduationCap className="w-4 h-4" /> },
        { id: 'health', label: 'Clinic & Health', icon: <HeartPulse className="w-4 h-4" /> },
        { id: 'discipline', label: 'Discipline Log', icon: <AlertTriangle className="w-4 h-4" /> },
      ],
    },
    {
      title: 'COMMUNICATION & GOVERNANCE',
      items: [
        { id: 'users', label: 'User Accounts & Logins', icon: <UserPlus className="w-4 h-4 text-sky-400" /> },
        { id: 'roles-permissions', label: 'Roles & Permissions', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
        { id: 'communication', label: 'Notices & Events', icon: <Megaphone className="w-4 h-4" /> },
        { id: 'website-cms', label: 'Website CMS & Photos', icon: <Globe className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports Centre', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'settings', label: 'School Settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
    {
      title: 'DEDICATED PORTALS',
      items: [
        { id: 'parent-portal', label: 'Parent Portal View', icon: <BookMarked className="w-4 h-4 text-emerald-600" /> },
        { id: 'teacher-portal', label: 'Teacher Portal View', icon: <GraduationCap className="w-4 h-4 text-blue-600" /> },
        { id: 'student-portal', label: 'Student Portal View', icon: <Award className="w-4 h-4 text-purple-600" /> },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800 shadow-xl`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            {school?.logoUrl ? (
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                <img
                  src={school.logoUrl}
                  alt={school.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md shrink-0 tracking-wider">
                {school?.code ? school.code.slice(0, 4) : 'GLCM'}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-bold text-white text-sm tracking-tight leading-none truncate">
                {school?.name || 'Gracia Learning Centre'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Playgroup — Grade 9</div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar text-xs">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {section.title}
              </div>
              {section.items.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* School Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white line-clamp-1">{school?.code || 'KEA-01'}</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded-md font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Kenya CBC & CBE Compliant</p>
          </div>
        </div>
      </aside>
    </>
  );
};
