import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { studentService } from '../../services/studentService';
import { feeService } from '../../services/feeAndPaymentService';
import { attendanceService } from '../../services/assessmentAndAttendanceService';
import { operationsService } from '../../services/operationsService';
import { Student, Invoice, Payment, AttendanceRecord, Announcement, SchoolEvent } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Users,
  DollarSign,
  CalendarCheck,
  Award,
  TrendingUp,
  UserPlus,
  Receipt,
  PlusCircle,
  Megaphone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { school } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!school?.id) return;
    loadDashboardData();
  }, [school?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [stdList, invList, payList, annList, evtList] = await Promise.all([
        studentService.getStudents(school!.id),
        feeService.getInvoices(school!.id),
        feeService.getPayments(school!.id),
        operationsService.getAnnouncements(school!.id),
        operationsService.getEvents(school!.id),
      ]);
      setStudents(stdList);
      setInvoices(invList);
      setPayments(payList);
      setAnnouncements(annList);
      setEvents(evtList);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const boysCount = students.filter((s) => s.gender === 'MALE').length;
  const girlsCount = students.filter((s) => s.gender === 'FEMALE').length;

  const totalBilled = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalCollected);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

  // Grade Breakdown
  const gradeCounts: Record<string, number> = {};
  students.forEach((s) => {
    gradeCounts[s.currentClass] = (gradeCounts[s.currentClass] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 mb-3 border border-white/15">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Academic Year {school?.academicYear || '2026'} • {school?.currentTerm || 'Term 1'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {school?.name || 'Gracia Learning Centre'}
          </h1>
          <p className="mt-2 text-sm text-blue-100/90 leading-relaxed">
            Welcome to the Central Administration & ERP Hub. Manage Playgroup through Grade 9 CBC assessments, student roll-call, term fees, POS sales, and communications in real-time.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => onNavigate('STUDENTS')}
            >
              Add Student
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<Receipt className="w-4 h-4" />}
              onClick={() => onNavigate('FEES')}
            >
              Collect Fees
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<CalendarCheck className="w-4 h-4" />}
              onClick={() => onNavigate('ATTENDANCE')}
            >
              Mark Attendance
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Enrollment"
          value={totalStudents}
          subtitle={`${boysCount} Boys • ${girlsCount} Girls`}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          trend={{ value: '12% YoY', isPositive: true }}
        />
        <StatCard
          title="Fee Collection"
          value={`${school?.currencySymbol || 'KSh'} ${totalCollected.toLocaleString()}`}
          subtitle={`${collectionRate}% of term budget collected`}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
          trend={{ value: `${collectionRate}%`, isPositive: true }}
        />
        <StatCard
          title="Outstanding Balance"
          value={`${school?.currencySymbol || 'KSh'} ${outstandingBalance.toLocaleString()}`}
          subtitle={`${invoices.filter((i) => i.balance > 0).length} unpaid invoices`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="rose"
        />
        <StatCard
          title="Today's Attendance"
          value="96.4%"
          subtitle="4 absent across all streams"
          icon={<CalendarCheck className="w-5 h-5" />}
          color="indigo"
          trend={{ value: '0.8%', isPositive: true }}
        />
      </div>

      {/* Main Grid: Enrollment Breakdown & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Enrollment by Level & Quick CBC Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrollment by Level */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Enrollment by Grade Level</h3>
                <p className="text-xs text-slate-500">Playgroup, Pre-Primary, Primary & Junior School</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('STUDENTS')}>
                View All
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                'Playgroup',
                'PP1',
                'PP2',
                'Grade 1',
                'Grade 2',
                'Grade 3',
                'Grade 4',
                'Grade 5',
                'Grade 6',
                'Grade 7',
                'Grade 8',
                'Grade 9',
              ].map((lvl) => {
                const count = gradeCounts[lvl] || 0;
                return (
                  <div
                    key={lvl}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-blue-300 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-600 line-clamp-1">{lvl}</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-bold text-slate-900">{count}</span>
                      <span className="text-[10px] text-slate-400 font-medium">learners</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Invoices & Payments */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Recent Fee Payments</h3>
                <p className="text-xs text-slate-500">Real-time receipts recorded</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('FEES')}>
                Manage Fees
              </Button>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No payment transactions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Mode & Ref</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.slice(0, 5).map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-semibold text-slate-900">{pay.receiptNumber}</td>
                        <td className="p-3 font-medium text-slate-800">{pay.studentName}</td>
                        <td className="p-3">
                          <span className="font-semibold text-emerald-800">{pay.paymentMethod}</span>
                          {pay.transactionReference && (
                            <span className="text-[10px] text-slate-400 block">{pay.transactionReference}</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {school?.currencySymbol || 'KSh'} {pay.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-500">{new Date(pay.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Announcements & School Events */}
        <div className="space-y-6">
          {/* Announcements Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-slate-900 text-sm">Notice Board</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('COMMUNICATION')}>
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No active notices.</p>
              ) : (
                announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 line-clamp-1">{ann.title}</span>
                      <Badge variant={ann.priority === 'HIGH' ? 'danger' : 'primary'} size="sm">
                        {ann.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ann.content}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">By {ann.publishedBy}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming School Events */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-slate-900 text-sm">Upcoming Events</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('COMMUNICATION')}>
                Calendar
              </Button>
            </div>

            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-950 text-xs">
                  <div className="font-bold">Term 1 STEM & CBC Robotics Fair</div>
                  <p className="text-emerald-800 text-[11px] mt-0.5">Friday, March 27th • Main Auditorium</p>
                </div>
              ) : (
                events.slice(0, 3).map((evt) => (
                  <div key={evt.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{evt.title}</span>
                      <span className="text-[10px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                        {evt.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
