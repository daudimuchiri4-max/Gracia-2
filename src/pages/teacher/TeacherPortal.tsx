import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { assessmentService, attendanceService } from '../../services/assessmentAndAttendanceService';
import { academicService } from '../../services/academicService';
import { Student, Subject, GradeLevel, CBCRating, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StaffLoginModal } from '../../components/ui/StaffLoginModal';
import { Html5Qrcode } from 'html5-qrcode';
import {
  CalendarCheck,
  Award,
  Users,
  Save,
  CheckCircle,
  Clock,
  LogIn,
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  QrCode,
  Scan,
  Camera,
  CheckCircle2,
} from 'lucide-react';

export const TeacherPortal: React.FC = () => {
  const { school, user, login, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'MARKS'>('ATTENDANCE');
  const [selectedClass, setSelectedClass] = useState<GradeLevel>('Grade 6');
  const [selectedStream, setSelectedStream] = useState('East');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ id: string; time: number } | null>(null);

  const playWelcomeSound = (studentName: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
        setTimeout(() => {
          try {
            if (audioCtx.state !== 'closed') {
              audioCtx.close();
            }
          } catch (err) {}
        }, 500);
      }
    } catch (e) {
      // Audio context fallback
    }

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any ongoing speech
        const firstName = studentName.trim().split(' ')[0];
        const utterance = new SpeechSynthesisUtterance(`Welcome to Gracia Learning Centre, ${firstName}`);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.onerror = () => {};
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      // Speech synthesis fallback
    }
  };

  // Direct Teacher Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isStaffLoginModalOpen, setIsStaffLoginModalOpen] = useState(false);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'SICK'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Marks state
  const [markMap, setMarkMap] = useState<Record<string, { score: number; comment: string }>>({});
  const [savingMarks, setSavingMarks] = useState(false);

  const isTeacherAuthenticated =
    user &&
    (user.role === 'TEACHER' ||
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'HEADTEACHER' ||
      user.role === 'DEPUTY_HEADTEACHER' ||
      user.role === 'ACCOUNTANT' ||
      user.role === 'RECEPTIONIST');

  useEffect(() => {
    if (!school?.id || !isTeacherAuthenticated) return;
    loadTeacherData();
  }, [school?.id, selectedClass, selectedStream, isTeacherAuthenticated]);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const [stdList, subList] = await Promise.all([
        studentService.getStudents(school!.id, { classLevel: selectedClass, stream: selectedStream }),
        academicService.getSubjects(school!.id),
      ]);
      setStudents(stdList);
      setSubjects(subList);
      if (subList.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subList[0].id);
      }

      const initialAtt: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'SICK'> = {};
      const initialMarks: Record<string, { score: number; comment: string }> = {};
      stdList.forEach((s) => {
        initialAtt[s.id] = 'PRESENT';
        initialMarks[s.id] = { score: 80, comment: 'Good participation' };
      });
      setAttendanceMap(initialAtt);
      setMarkMap(initialMarks);
    } catch (e: any) {
      showToast('Error loading teacher portal: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your staff username/email and password.');
      return;
    }
    setLoggingIn(true);
    setLoginError(null);
    try {
      const profile = await login(loginIdentifier.trim(), loginPassword.trim());
      
      // Enforce roles & permissions: Only teachers and authorized school staff are permitted
      const staffRoles: UserRole[] = [
        'TEACHER',
        'SCHOOL_ADMIN',
        'HEADTEACHER',
        'DEPUTY_HEADTEACHER',
        'ACCOUNTANT',
        'RECEPTIONIST',
        'NURSE',
        'LIBRARIAN',
        'SUPER_ADMIN',
      ];

      if (!profile || !staffRoles.includes(profile.role)) {
        await logout();
        throw new Error('Access denied: This portal is restricted to teachers and authorized school staff. Parents and students must use their respective portals.');
      }

      showToast('Successfully logged into Teacher Portal!', 'success');
    } catch (err: any) {
      const msg = err.message || 'Invalid username or password given by admin.';
      setLoginError(msg);
      showToast(msg, 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      await attendanceService.saveAttendance(school!.id, {
        date: attendanceDate,
        classLevel: selectedClass,
        stream: selectedStream,
        recordedBy: user?.fullName || 'Class Facilitator',
        entries: students.map((s) => ({
          studentId: s.id,
          studentName: s.fullName,
          admissionNumber: s.admissionNumber,
          status: attendanceMap[s.id] || 'PRESENT',
        })),
      });
      showToast('Attendance roll submitted to school records!', 'success');
    } catch (e: any) {
      showToast('Error saving attendance: ' + e.message, 'error');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveMarks = async () => {
    setSavingMarks(true);
    try {
      const sub = subjects.find((s) => s.id === selectedSubjectId);
      for (const std of students) {
        const m = markMap[std.id] || { score: 75, comment: '' };
        await assessmentService.saveResult(school!.id, {
          assessmentId: `ass_${selectedClass}_${selectedSubjectId}`,
          studentId: std.id,
          studentName: std.fullName,
          admissionNumber: std.admissionNumber,
          classLevel: std.currentClass,
          stream: std.stream,
          subjectName: sub?.name || 'Mathematics',
          score: m.score,
          maxScore: 100,
          teacherComment: m.comment,
        });
      }
      showToast('CBC competency evaluation saved!', 'success');
    } catch (e: any) {
      showToast('Error saving marks: ' + e.message, 'error');
    } finally {
      setSavingMarks(false);
    }
  };

  // If not authenticated as teacher/staff, display login gate
  if (!isTeacherAuthenticated) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-blue-900/10 text-blue-900 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Teacher Portal Login</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Enter the staff login credentials (username/email and password) provided by your school administrator.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleTeacherLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Staff Username or Official Email:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. catherine.mutua or cmutua@glcm.ac.ke"
                  required
                  className="w-full px-3.5 py-3 pl-10 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-900 focus:border-transparent font-medium bg-slate-50/50 focus:bg-white"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Staff Password:</label>
                <span className="text-[10px] text-slate-400 font-medium">Default: Password@2026</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your assigned password"
                  required
                  className="w-full px-3.5 py-3 pl-10 pr-10 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-900 focus:border-transparent font-medium bg-slate-50/50 focus:bg-white"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>



            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loggingIn}
              icon={<LogIn className="w-4 h-4" />}
              className="w-full font-bold text-xs py-3 shadow-md"
            >
              Sign In to Teacher Portal
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure Institutional Authentication
            </span>
            <span>Need logins? Contact Admin</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200 mb-3 border border-white/15">
            <span>Teacher & CBC Facilitator Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.fullName || 'Teacher'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-blue-100/90 max-w-xl">
            Quick roll call register, continuous assessment recording, and CBC formative grading matrix.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/30 bg-white/10 hover:bg-white/20 font-bold"
            icon={<LogOut className="w-4 h-4 text-white" />}
            onClick={async () => {
              await logout();
              showToast('Logged out of Teacher Portal successfully.', 'info');
            }}
          >
            Sign Out / Switch Teacher
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'ATTENDANCE'
              ? 'border-blue-900 text-blue-900 font-bold'
              : 'border-transparent text-slate-500'
          }`}
        >
          Daily Roll Call Attendance
        </button>
        <button
          onClick={() => setActiveTab('MARKS')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'MARKS' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          Enter CBC Subject Scores
        </button>
      </div>

      {/* Selector Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Class Level</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as GradeLevel)}
              className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 mt-0.5"
            >
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
              ].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Stream</label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 mt-0.5"
            >
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Alpha">Alpha</option>
            </select>
          </div>

          {activeTab === 'MARKS' && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block">Subject Area</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 mt-0.5"
              >
                {subjects.map((sb) => (
                  <option key={sb.id} value={sb.id}>
                    {sb.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'ATTENDANCE' && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-900 border-blue-200 bg-blue-50/70 hover:bg-blue-100 font-bold"
              icon={<QrCode className="w-4 h-4 text-blue-900" />}
              onClick={() => setIsQrScannerOpen(true)}
            >
              Scan Student ID / QR
            </Button>
          )}
          {activeTab === 'ATTENDANCE' ? (
            <Button
              variant="primary"
              size="sm"
              loading={savingAttendance}
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveAttendance}
            >
              Submit Attendance
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={savingMarks}
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveMarks}
            >
              Save Marks & Ratings
            </Button>
          )}
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student roster...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No students registered in this class.</div>
        ) : activeTab === 'ATTENDANCE' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Learner Name</th>
                  <th className="p-3.5">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((std) => {
                  const curr = attendanceMap[std.id] || 'PRESENT';
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{std.admissionNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{std.fullName}</td>
                      <td className="p-3.5">
                        <div className="flex gap-2">
                          {(['PRESENT', 'ABSENT', 'LATE', 'SICK'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => setAttendanceMap((p) => ({ ...p, [std.id]: st }))}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                curr === st
                                  ? st === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : st === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Learner Name</th>
                  <th className="p-3.5 w-32">Score (/100)</th>
                  <th className="p-3.5">CBC Rating</th>
                  <th className="p-3.5">Facilitator Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((std) => {
                  const m = markMap[std.id] || { score: 80, comment: '' };
                  const rating: CBCRating =
                    m.score >= 80 ? 'EE' : m.score >= 60 ? 'ME' : m.score >= 40 ? 'AE' : 'BE';
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{std.admissionNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{std.fullName}</td>
                      <td className="p-3.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={m.score}
                          onChange={(e) =>
                            setMarkMap((p) => ({
                              ...p,
                              [std.id]: { ...m, score: Number(e.target.value) },
                            }))
                          }
                          className="w-20 px-3 py-1.5 border border-slate-200 rounded-xl font-bold"
                        />
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            rating === 'EE'
                              ? 'success'
                              : rating === 'ME'
                              ? 'primary'
                              : rating === 'AE'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {rating}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <input
                          type="text"
                          value={m.comment}
                          onChange={(e) =>
                            setMarkMap((p) => ({
                              ...p,
                              [std.id]: { ...m, comment: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        students={students}
        onScanSuccess={(code) => {
          const trimmed = code.trim().toLowerCase();
          const found = students.find(
            (s) =>
              s.admissionNumber.toLowerCase() === trimmed ||
              s.id.toLowerCase() === trimmed ||
              s.fullName.toLowerCase().includes(trimmed)
          );
          if (found) {
            const now = Date.now();
            if (lastScanned && lastScanned.id === found.id && now - lastScanned.time < 5000) {
              // Ignore rapid duplicate scan of same student
              return;
            }

            if (attendanceMap[found.id] === 'PRESENT') {
              showToast(`ℹ️ ${found.fullName} (${found.admissionNumber}) is already checked in!`, 'info');
              setLastScanned({ id: found.id, time: now });
              return;
            }

            setAttendanceMap((p) => ({ ...p, [found.id]: 'PRESENT' }));
            setLastScanned({ id: found.id, time: now });
            playWelcomeSound(found.fullName);
            showToast(`🎉 Welcome! ${found.fullName} (${found.admissionNumber}) checked in successfully!`, 'success');
          } else {
            showToast(`QR Scanned "${code}": Student not found in current roster.`, 'warning');
          }
        }}
      />
    </div>
  );
};

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onScanSuccess: (code: string) => void;
}

const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  students,
  onScanSuccess,
}) => {
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    const scannerId = 'teacher-real-qr-reader-box';
    if (isOpen) {
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode(scannerId);
          html5QrCode
            .start(
              { facingMode: 'environment' },
              {
                fps: 10,
                qrbox: { width: 220, height: 220 },
              },
              (decodedText) => {
                onScanSuccess(decodedText);
              },
              () => {}
            )
            .catch((err) => {
              console.warn('Camera start warning:', err);
            });
        } catch (e) {
          console.warn('QR Scanner error:', e);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode
              .stop()
              .then(() => html5QrCode?.clear())
              .catch(() => {});
          } else {
            try {
              html5QrCode.clear();
            } catch (e) {}
          }
        }
      };
    }
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900/10 text-blue-900 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Student ID QR Scanner</h3>
              <p className="text-xs text-slate-500">Scan student ID card QR code via camera for instant roll call</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <p className="text-xs text-blue-900 font-medium">
              Point your device camera at student ID QR code or click a student below to instantly mark attendance.
            </p>
          </div>

          {/* Real Camera Viewfinder Container */}
          <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[220px] relative flex items-center justify-center">
            <div id="teacher-real-qr-reader-box" className="w-full" />
          </div>

          {/* Roster students tap-to-simulate */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              Roster Students (Click to Simulate / Fallback):
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {students.map((std) => (
                <div
                  key={std.id}
                  onClick={() => onScanSuccess(std.admissionNumber)}
                  className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{std.fullName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{std.admissionNumber}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-900 text-white text-[10px] font-bold rounded-lg shadow-2xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Scan QR
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done Scanning
          </Button>
        </div>
      </div>
    </div>
  );
};
