import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { UserRole } from './types';
import { AppLayout } from './components/layout/AppLayout';
import { InactivityManager } from './components/ui/InactivityManager';

// Public Website
import { PublicWebsite } from './pages/public/PublicWebsite';

// Portals
import { ParentPortal } from './pages/parent/ParentPortal';
import { TeacherPortal } from './pages/teacher/TeacherPortal';
import { StudentPortal } from './pages/student/StudentPortal';

// Admin ERP Pages
import { Dashboard } from './pages/admin/Dashboard';
import { StudentsView } from './pages/admin/StudentsView';
import { AdmissionsView } from './pages/admin/AdmissionsView';
import { ParentsView } from './pages/admin/ParentsView';
import { StaffView } from './pages/admin/StaffView';
import { AcademicsView } from './pages/admin/AcademicsView';
import { AssessmentsView } from './pages/admin/AssessmentsView';
import { ReportCardsView } from './pages/admin/ReportCardsView';
import { AttendanceView } from './pages/admin/AttendanceView';
import { FeesView } from './pages/admin/FeesView';
import { POSView } from './pages/admin/POSView';
import { InventoryView } from './pages/admin/InventoryView';
import { LibraryView } from './pages/admin/LibraryView';
import { TransportView } from './pages/admin/TransportView';
import { HealthDisciplineView } from './pages/admin/HealthDisciplineView';
import { CommunicationView } from './pages/admin/CommunicationView';
import { WebsiteCMSView } from './pages/admin/WebsiteCMSView';
import { RolesPermissionsView } from './pages/admin/RolesPermissionsView';
import { UsersView } from './pages/admin/UsersView';
import { ReportsView } from './pages/admin/ReportsView';
import { SettingsView } from './pages/admin/SettingsView';
import { SystemOwnerConsole } from './pages/admin/SystemOwnerConsole';
import { SubscriptionLockScreen } from './components/subscription/SubscriptionLockScreen';
import { subscriptionService, DEFAULT_SUBSCRIPTION_CONFIG } from './services/subscriptionService';
import { SchoolSubscriptionConfig } from './types';

export type ActiveView =
  | 'PUBLIC'
  | 'DASHBOARD'
  | 'STUDENTS'
  | 'ADMISSIONS'
  | 'PARENTS'
  | 'STAFF'
  | 'USERS'
  | 'ACADEMICS'
  | 'ASSESSMENTS'
  | 'REPORT_CARDS'
  | 'ATTENDANCE'
  | 'FEES'
  | 'POS'
  | 'INVENTORY'
  | 'LIBRARY'
  | 'TRANSPORT'
  | 'HEALTH_DISCIPLINE'
  | 'COMMUNICATION'
  | 'WEBSITE_CMS'
  | 'ROLES_PERMISSIONS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'SAAS_BILLING'
  | 'TEACHER_PORTAL'
  | 'PARENT_PORTAL'
  | 'STUDENT_PORTAL';

const normalizeView = (v: string): ActiveView => {
  const map: Record<string, ActiveView> = {
    dashboard: 'DASHBOARD',
    admin: 'DASHBOARD',
    students: 'STUDENTS',
    student: 'STUDENTS',
    admissions: 'ADMISSIONS',
    admission: 'ADMISSIONS',
    parents: 'PARENTS',
    parent: 'PARENTS',
    staff: 'STAFF',
    users: 'USERS',
    user: 'USERS',
    'user-accounts': 'USERS',
    user_accounts: 'USERS',
    accounts: 'USERS',
    'users-management': 'USERS',
    academics: 'ACADEMICS',
    academic: 'ACADEMICS',
    assessments: 'ASSESSMENTS',
    assessment: 'ASSESSMENTS',
    'report-cards': 'REPORT_CARDS',
    report_cards: 'REPORT_CARDS',
    reportcards: 'REPORT_CARDS',
    attendance: 'ATTENDANCE',
    fees: 'FEES',
    fee: 'FEES',
    pos: 'POS',
    canteen: 'POS',
    inventory: 'INVENTORY',
    library: 'LIBRARY',
    transport: 'TRANSPORT',
    health: 'HEALTH_DISCIPLINE',
    discipline: 'HEALTH_DISCIPLINE',
    health_discipline: 'HEALTH_DISCIPLINE',
    'health-discipline': 'HEALTH_DISCIPLINE',
    communication: 'COMMUNICATION',
    website_cms: 'WEBSITE_CMS',
    'website-cms': 'WEBSITE_CMS',
    cms: 'WEBSITE_CMS',
    roles_permissions: 'ROLES_PERMISSIONS',
    'roles-permissions': 'ROLES_PERMISSIONS',
    reports: 'REPORTS',
    settings: 'SETTINGS',
    'saas-billing': 'SAAS_BILLING',
    saas_billing: 'SAAS_BILLING',
    billing: 'SAAS_BILLING',
    subscription: 'SAAS_BILLING',
    'teacher-portal': 'TEACHER_PORTAL',
    'parent-portal': 'PARENT_PORTAL',
    'student-portal': 'STUDENT_PORTAL',
    teacher_portal: 'TEACHER_PORTAL',
    parent_portal: 'PARENT_PORTAL',
    student_portal: 'STUDENT_PORTAL',
    teacher: 'TEACHER_PORTAL',
    teachers: 'TEACHER_PORTAL',
    learner: 'STUDENT_PORTAL',
    learners: 'STUDENT_PORTAL',
    public: 'PUBLIC',
  };

  const key = v.toLowerCase().trim();
  if (map[key]) return map[key];
  return (v.toUpperCase() as ActiveView) || 'DASHBOARD';
};

const getInitialView = (): ActiveView => {
  if (typeof window === 'undefined') return 'PUBLIC';
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0] || '';
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0] || '';
  const route = path || hash;
  if (!route || route === '' || route === 'public' || route === 'home') {
    return 'PUBLIC';
  }
  return normalizeView(route);
};

const MainAppContent: React.FC = () => {
  const { activeRole, switchRole, school } = useAuth();
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<ActiveView>(() => getInitialView());
  const [subscription, setSubscription] = useState<SchoolSubscriptionConfig>(DEFAULT_SUBSCRIPTION_CONFIG);

  React.useEffect(() => {
    const handlePopState = () => {
      const current = getInitialView();
      setActiveView(current);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    const loadSub = async () => {
      try {
        const config = await subscriptionService.getSubscriptionConfig(school?.id);
        setSubscription(config);
      } catch (e) {
        console.warn('Could not load subscription in App.tsx:', e);
      }
    };
    loadSub();
  }, [school?.id]);

  const health = subscriptionService.getSubscriptionHealth(subscription);

  const handleNavigate = (view: string) => {
    const normalized = normalizeView(view);
    setActiveView(normalized);
    try {
      const slug = normalized.toLowerCase().replace(/_/g, '-');
      if (slug === 'public') {
        window.history.pushState({ view: normalized }, '', '/');
      } else {
        window.history.pushState({ view: normalized }, '', `/${slug}`);
      }
    } catch {}
  };

  // If role changes, switch appropriate view
  const handleRoleChange = (role: UserRole) => {
    switchRole(role);
    if (role === 'TEACHER') handleNavigate('TEACHER_PORTAL');
    else if (role === 'PARENT') handleNavigate('PARENT_PORTAL');
    else if (role === 'STUDENT') handleNavigate('STUDENT_PORTAL');
    else handleNavigate('DASHBOARD');
  };

  // If user wants public website
  if (activeView === 'PUBLIC') {
    return (
      <PublicWebsite
        onEnterPortal={(targetRole) => {
          if (targetRole) {
            handleRoleChange(targetRole);
          } else {
            setActiveView('DASHBOARD');
          }
        }}
        onOpenCMS={() => setActiveView('WEBSITE_CMS')}
      />
    );
  }

  // Render Admin ERP or Portals inside AppLayout
  const renderViewContent = () => {
    switch (activeView) {
      case 'DASHBOARD':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'STUDENTS':
        return <StudentsView />;
      case 'ADMISSIONS':
        return <AdmissionsView />;
      case 'PARENTS':
        return <ParentsView />;
      case 'STAFF':
        return <StaffView />;
      case 'ACADEMICS':
        return <AcademicsView />;
      case 'ASSESSMENTS':
        return <AssessmentsView />;
      case 'REPORT_CARDS':
        return <ReportCardsView />;
      case 'ATTENDANCE':
        return <AttendanceView />;
      case 'FEES':
        return <FeesView />;
      case 'POS':
        return <POSView />;
      case 'INVENTORY':
        return <InventoryView />;
      case 'LIBRARY':
        return <LibraryView />;
      case 'TRANSPORT':
        return <TransportView />;
      case 'HEALTH_DISCIPLINE':
        return <HealthDisciplineView />;
      case 'COMMUNICATION':
        return <CommunicationView />;
      case 'WEBSITE_CMS':
        return <WebsiteCMSView onOpenPublicSite={() => setActiveView('PUBLIC')} />;
      case 'ROLES_PERMISSIONS':
        return <RolesPermissionsView />;
      case 'USERS':
        return <UsersView />;
      case 'REPORTS':
        return <ReportsView />;
      case 'SETTINGS':
        return <SettingsView />;
      case 'SAAS_BILLING':
        if (activeRole !== 'SUPER_ADMIN') {
          return <Dashboard onNavigate={handleNavigate} />;
        }
        return <SystemOwnerConsole />;
      case 'TEACHER_PORTAL':
        return <TeacherPortal />;
      case 'PARENT_PORTAL':
        return <ParentPortal />;
      case 'STUDENT_PORTAL':
        return <StudentPortal />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // If subscription is locked (expired past grace period), render lock screen
  if (health.isLocked && activeView !== 'PUBLIC' && activeRole !== 'SUPER_ADMIN') {
    return (
      <SubscriptionLockScreen
        subscription={subscription}
        schoolName={school?.name || 'Gracia Learning Centre'}
        onSubscriptionUpdated={(newConfig) => setSubscription(newConfig)}
        onOpenPublicSite={() => setActiveView('PUBLIC')}
        onOpenSystemOwnerConsole={() => {
          switchRole('SUPER_ADMIN');
          setActiveView('SAAS_BILLING');
        }}
      />
    );
  }

  return (
    <>
      <AppLayout
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenPublicSite={() => setActiveView('PUBLIC')}
      >
        {renderViewContent()}
      </AppLayout>

      <InactivityManager
        isActive={activeView !== 'PUBLIC'}
        onLogoutToPublic={() => setActiveView('PUBLIC')}
      />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
