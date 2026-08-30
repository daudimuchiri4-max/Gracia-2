import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/assessmentAndAttendanceService';
import { printerService } from '../../services/printerService';
import { generateStudentQrCode, parseQrAttendancePayload } from '../../utils/qrCodeGenerator';
import { Student, AttendanceRecord, GradeLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  CalendarCheck,
  Save,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  HeartPulse,
  QrCode,
  Camera,
  Scan,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FlipHorizontal,
  Upload,
  Volume2,
  VolumeX,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  Keyboard,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  PhoneCall,
  MessageSquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  Layers,
  BookOpen,
} from 'lucide-react';

const GRADE_LEVELS: GradeLevel[] = [
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
];

interface LiveScanEvent {
  id: string;
  studentId?: string;
  studentName: string;
  admissionNumber: string;
  classLevel: string;
  timestamp: string;
  status: 'PRESENT' | 'LATE';
}

export const AttendanceView: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ROLL_CALL' | 'QR_SCANNER' | 'DAILY_REPORT' | 'QR_CARDS'>('ROLL_CALL');

  // Daily Report State
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportClassFilter, setReportClassFilter] = useState<string>('ALL');
  const [reportStreamFilter, setReportStreamFilter] = useState<string>('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>('ALL');
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('');
  const [reportViewMode, setReportViewMode] = useState<'OVERVIEW' | 'ROSTER' | 'ABSENTEES'>('OVERVIEW');
  const [dailyAttendanceRecords, setDailyAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Roll-Call State
  const [selectedClass, setSelectedClass] = useState<GradeLevel>('Grade 6');
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [rollCallSearch, setRollCallSearch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allSchoolStudents, setAllSchoolStudents] = useState<Student[]>([]);
  const [statusMap, setStatusMap] = useState<
    Record<string, { status: AttendanceRecord['entries'][0]['status']; remarks?: string }>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Badge Filter State
  const [badgeClassFilter, setBadgeClassFilter] = useState<string>('ALL');
  const [badgeStreamFilter, setBadgeStreamFilter] = useState<string>('ALL');
  const [badgeSearch, setBadgeSearch] = useState<string>('');

  // QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usbInput, setUsbInput] = useState<string>('');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [alreadyCheckedInAlert, setAlreadyCheckedInAlert] = useState<{
    student: Student;
    time: string;
    status: 'PRESENT' | 'LATE';
  } | null>(null);
  const [checkedInTodayMap, setCheckedInTodayMap] = useState<
    Record<string, { time: string; status: 'PRESENT' | 'LATE'; studentName: string }>
  >({});
  const [scanFeed, setScanFeed] = useState<LiveScanEvent[]>([]);
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [testStudentId, setTestStudentId] = useState<string>('');
  const [previewBadgeStudent, setPreviewBadgeStudent] = useState<Student | null>(null);
  const [previewBadgeQrUrl, setPreviewBadgeQrUrl] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Pre-initialize and cache SpeechSynthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  // Student QR Badges State
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [generatingQrs, setGeneratingQrs] = useState<boolean>(false);

  useEffect(() => {
    if (!school?.id) return;
    loadAllStudents();
    loadTodayAttendanceCheckIns();
  }, [school?.id]);

  const loadTodayAttendanceCheckIns = async () => {
    if (!school?.id) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecords = await attendanceService.getAttendanceRecords(school.id, {
        date: todayStr,
      });
      const map: Record<string, { time: string; status: 'PRESENT' | 'LATE'; studentName: string }> = {};
      const feed: LiveScanEvent[] = [];

      todayRecords.forEach((rec) => {
        rec.entries.forEach((ent) => {
          if (ent.status === 'PRESENT' || ent.status === 'LATE') {
            const timeMatch = ent.remarks?.match(/\((.*?)\)/);
            const timeVal = timeMatch ? timeMatch[1] : 'Morning Session';
            const checkData = {
              time: timeVal,
              status: ent.status,
              studentName: ent.studentName,
            };
            map[ent.studentId] = checkData;
            if (ent.admissionNumber) {
              map[ent.admissionNumber] = checkData;
              map[ent.admissionNumber.toLowerCase()] = checkData;
            }
            feed.push({
              id: `rec-${ent.studentId}-${Date.now()}`,
              studentId: ent.studentId,
              studentName: ent.studentName,
              admissionNumber: ent.admissionNumber,
              classLevel: `${rec.classLevel} ${rec.stream || ''}`.trim(),
              timestamp: timeVal,
              status: ent.status,
            });
          }
        });
      });

      setCheckedInTodayMap((prev) => ({ ...prev, ...map }));
      if (feed.length > 0) {
        setScanFeed((prev) => {
          const existingIds = new Set(prev.map((p) => p.studentId));
          const newItems = feed.filter((f) => !existingIds.has(f.studentId));
          return [...prev, ...newItems].slice(0, 30);
        });
      }
    } catch (err) {
      console.warn('Silent load of today checkins:', err);
    }
  };

  useEffect(() => {
    if (!school?.id) return;
    loadClassStudents();
  }, [school?.id, selectedClass, selectedStream, selectedDate]);

  useEffect(() => {
    if (students.length > 0 && school?.id) {
      // Auto-generate QR codes for students if missing
      const missing = students.filter((s) => !qrCodeUrls[s.id]);
      if (missing.length > 0) {
        (async () => {
          const newUrls: Record<string, string> = { ...qrCodeUrls };
          for (const st of missing) {
            try {
              const url = await generateStudentQrCode({
                type: 'STUDENT_ATTENDANCE',
                schoolId: school.id,
                studentId: st.id,
                admissionNumber: st.admissionNumber,
                fullName: st.fullName,
                classLevel: `${st.currentClass} ${st.stream}`,
              });
              if (url) newUrls[st.id] = url;
            } catch {
              // Ignore individual generation errors
            }
          }
          setQrCodeUrls(newUrls);
        })();
      }
    }
  }, [students, school?.id]);

  // Query connected cameras when scanner tab is opened
  useEffect(() => {
    if (activeTab === 'QR_SCANNER') {
      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (cameras && cameras.length > 0) {
            setAvailableCameras(cameras);
            if (!selectedCameraId) {
              setSelectedCameraId(cameras[0].id);
            }
          }
        })
        .catch((err) => {
          console.warn('Camera enumeration error (safe fallback):', err);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'QR_SCANNER' && isCameraActive) {
      stopCamera();
    }
  }, [activeTab, isCameraActive]);

  const loadAllStudents = async () => {
    try {
      const all = await studentService.getStudents(school!.id);
      setAllSchoolStudents(all);

      if (all.length > 0) {
        // If current selectedClass has 0 students, pick the first class that has enrolled learners
        const currentCount = all.filter((s) => s.currentClass === selectedClass).length;
        if (currentCount === 0) {
          const firstWithStudents = GRADE_LEVELS.find((g) => all.some((s) => s.currentClass === g));
          if (firstWithStudents) {
            setSelectedClass(firstWithStudents);
          }
        }
      }
    } catch (e) {
      console.warn('Error loading all students:', e);
    }
  };

  const loadClassStudents = async () => {
    setLoading(true);
    try {
      const queryOptions = selectedStream === 'ALL'
        ? { classLevel: selectedClass }
        : { classLevel: selectedClass, stream: selectedStream };

      const list = await studentService.getStudents(school!.id, queryOptions);
      setStudents(list);

      const existingRecords = await attendanceService.getAttendanceRecords(school!.id, {
        classLevel: selectedClass,
        date: selectedDate,
      });

      const matched = selectedStream === 'ALL'
        ? existingRecords[0]
        : existingRecords.find(
            (r) => r.stream?.toLowerCase() === selectedStream.toLowerCase()
          );

      const initialStatus: Record<
        string,
        { status: AttendanceRecord['entries'][0]['status']; remarks?: string }
      > = {};

      list.forEach((s) => {
        const foundEntry =
          matched?.entries.find((e) => e.studentId === s.id) ||
          existingRecords.flatMap((r) => r.entries).find((e) => e.studentId === s.id);

        initialStatus[s.id] = {
          status: foundEntry ? foundEntry.status : 'PRESENT',
          remarks: foundEntry?.remarks || '',
        };
      });

      setStatusMap(initialStatus);
    } catch (e: any) {
      showToast('Error loading attendance list: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const setAllStatus = (status: AttendanceRecord['entries'][0]['status']) => {
    const updated: Record<
      string,
      { status: AttendanceRecord['entries'][0]['status']; remarks?: string }
    > = {};
    students.forEach((s) => {
      updated[s.id] = { status, remarks: statusMap[s.id]?.remarks || '' };
    });
    setStatusMap(updated);
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      showToast('No students to save attendance for.', 'error');
      return;
    }
    setSaving(true);
    try {
      const entries = students.map((s) => ({
        studentId: s.id,
        studentName: s.fullName,
        admissionNumber: s.admissionNumber,
        status: statusMap[s.id]?.status || 'PRESENT',
        remarks: statusMap[s.id]?.remarks || '',
      }));

      const streamToSave = selectedStream === 'ALL' ? (students[0]?.stream || 'Main') : selectedStream;

      await attendanceService.saveAttendance(school!.id, {
        date: selectedDate,
        classLevel: selectedClass,
        stream: streamToSave,
        recordedBy: user?.fullName || 'Teacher on Duty',
        entries,
      });

      // If saving today's roll call, synchronize checkedInTodayMap
      const todayDate = new Date().toISOString().split('T')[0];
      if (selectedDate === todayDate) {
        const newCheckIns: Record<string, { time: string; status: 'PRESENT' | 'LATE'; studentName: string }> = {};
        entries.forEach((ent) => {
          if (ent.status === 'PRESENT' || ent.status === 'LATE') {
            const timeVal = 'Class Roll Call';
            const data = { time: timeVal, status: ent.status, studentName: ent.studentName };
            newCheckIns[ent.studentId] = data;
            if (ent.admissionNumber) {
              newCheckIns[ent.admissionNumber] = data;
              newCheckIns[ent.admissionNumber.toLowerCase()] = data;
            }
          }
        });
        setCheckedInTodayMap((prev) => ({ ...prev, ...newCheckIns }));
      }

      showToast(
        `Attendance for ${selectedClass} (${selectedStream === 'ALL' ? 'All Streams' : selectedStream}) saved successfully!`,
        'success'
      );
    } catch (e: any) {
      showToast('Error saving attendance: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Authentic Supermarket POS & Thermo Scanner Piezo Audio Feedback
  const playBeep = (success: boolean) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      if (success) {
        // Classic Supermarket / Infrared Thermo Scanner Beep
        // 2730 Hz resonant piezo frequency with subtle harmonic overtone (65ms punchy pulse)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        const gain2 = audioCtx.createGain();

        // Primary 2730Hz scanner tone
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2730, now);

        // Instant attack, sustained chirp, snappy release
        gain1.gain.setValueAtTime(0.0001, now);
        gain1.gain.linearRampToValueAtTime(0.28, now + 0.002);
        gain1.gain.setValueAtTime(0.28, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.068);

        // Secondary subtle harmonic overtone for physical piezo realism (5460Hz)
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(5460, now);
        gain2.gain.setValueAtTime(0.0001, now);
        gain2.gain.linearRampToValueAtTime(0.035, now + 0.002);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);

        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc1.start(now);
        osc1.stop(now + 0.07);
        osc2.start(now);
        osc2.stop(now + 0.07);
      } else {
        // Supermarket POS / Thermo Scanner Error Tone (Double low-pulse alert)
        // First low pulse (330Hz, 70ms)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(330, now);
        gain1.gain.setValueAtTime(0.22, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.075);

        // Second lower pulse (260Hz, 85ms) after brief 45ms gap
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(260, now + 0.115);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.22, now + 0.115);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.115);
        osc2.stop(now + 0.21);
      }
    } catch {
      // Audio optional
    }
  };

  // Clear High-Quality Standard English Spoken Announcement
  const speakGreeting = (text: string) => {
    if (!soundEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices();
      // Select premium natural standard English voices (Google Natural, Microsoft, Apple, Commonwealth/US)
      const englishVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Online') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Karen') ||
              v.name.includes('Daniel') ||
              v.name.includes('Serena') ||
              v.name.includes('Arthur') ||
              v.name.includes('Jenny') ||
              v.name.includes('Guy') ||
              v.name.includes('Zira') ||
              v.name.includes('David'))
        ) ||
        voices.find((v) => v.lang === 'en-US') ||
        voices.find((v) => v.lang === 'en-GB') ||
        voices.find((v) => v.lang === 'en-AU') ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (englishVoice) {
        utterance.voice = englishVoice;
        utterance.lang = englishVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate = 1.0;  // Balanced, natural human conversational pace
      utterance.pitch = 1.0; // Clear, natural standard pitch
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis not available:', err);
    }
  };

  // Start Camera Scanner using Html5Qrcode engine with multi-mode fallback
  const startCamera = async (targetCameraId?: string, overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    await stopCamera();

    const facingToUse = overrideFacing || cameraFacing;

    try {
      const readerElem = document.getElementById('gate-qr-reader');
      if (!readerElem) {
        throw new Error('Scanner container element not found');
      }

      // Clear any prior canvas/video remnants
      readerElem.innerHTML = '';

      const html5QrCode = new Html5Qrcode('gate-qr-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 12,
        qrbox: { width: 250, height: 250 },
      };

      const handleScanSuccess = (decodedText: string) => {
        const rawData = decodedText.trim();
        const now = Date.now();
        // Debounce same code within 3 seconds
        if (rawData !== lastScanCodeRef.current || now - lastScanTimeRef.current > 3000) {
          lastScanCodeRef.current = rawData;
          lastScanTimeRef.current = now;
          handleProcessScannedCode(rawData);
        }
      };

      const handleScanError = () => {
        // Continuous frame analysis noise, silently ignore
      };

      // Determine camera constraints
      let cameraConfig: any = targetCameraId ? targetCameraId : { facingMode: facingToUse };

      try {
        await html5QrCode.start(cameraConfig, config, handleScanSuccess, handleScanError);
      } catch (firstErr) {
        console.warn('Initial camera selection failed, trying direct facingMode fallback...', firstErr);
        // Fallback: Try general facingMode constraint or default environment
        cameraConfig = { facingMode: 'environment' };
        try {
          await html5QrCode.start(cameraConfig, config, handleScanSuccess, handleScanError);
        } catch (secondErr) {
          console.warn('Environment facingMode failed, trying any video stream...', secondErr);
          // Ultimate fallback: Try user front camera or default
          cameraConfig = { facingMode: 'user' };
          await html5QrCode.start(cameraConfig, config, handleScanSuccess, handleScanError);
        }
      }

      setIsCameraActive(true);

      // Refresh camera devices list now that permission is granted
      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (cameras && cameras.length > 0) {
            setAvailableCameras(cameras);
          }
        })
        .catch(() => {});
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setIsCameraActive(false);

      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setCameraError('Camera permission was denied. Please allow camera access in your browser site settings or address bar.');
      } else if (err?.name === 'NotFoundError' || err?.message?.includes('No camera')) {
        setCameraError('No camera device detected. You can upload a QR badge photo or use manual admission entry below.');
      } else if (err?.name === 'NotReadableError') {
        setCameraError('Camera is busy in another app or tab. Please close other camera apps and retry.');
      } else {
        setCameraError(err?.message || 'Unable to open camera. Try uploading a QR image or select a learner from the test list below.');
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Silent camera stop catch:', err);
      }
      html5QrCodeRef.current = null;
    }
    const readerElem = document.getElementById('gate-qr-reader');
    if (readerElem) {
      readerElem.innerHTML = '';
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      await stopCamera();
      await startCamera(undefined, nextFacing);
    }
  };

  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (isCameraActive) {
      await stopCamera();
      await startCamera(newCamId);
    }
  };

  const handleProcessScannedCode = async (codeText: string) => {
    const cleanText = codeText.trim();
    if (!cleanText) return;

    const parsed = parseQrAttendancePayload(cleanText);

    // Fetch freshest student list if needed
    let studentPool = allSchoolStudents;
    if (studentPool.length === 0 && school?.id) {
      try {
        studentPool = await studentService.getStudents(school.id);
        setAllSchoolStudents(studentPool);
      } catch {
        studentPool = students;
      }
    }
    if (studentPool.length === 0) {
      studentPool = students;
    }

    const cleanNorm = cleanText.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Match student by ID, admission number, Assessment Number, KEMIS, UPI, NEMIS, birth cert, or name
    const matched = studentPool.find((s) => {
      if (parsed?.studentId && s.id.toLowerCase() === parsed.studentId.toLowerCase()) {
        return true;
      }
      if (parsed?.admissionNumber && s.admissionNumber.toLowerCase() === parsed.admissionNumber.toLowerCase()) {
        return true;
      }
      if (
        parsed?.admissionNumber &&
        s.admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '') ===
          parsed.admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
      ) {
        return true;
      }
      if (
        (parsed?.assessmentNumber || parsed?.upiNumber) &&
        (s.assessmentNumber || s.upiNumber) &&
        (s.assessmentNumber || s.upiNumber)?.toLowerCase() === (parsed.assessmentNumber || parsed.upiNumber)?.toLowerCase()
      ) {
        return true;
      }
      if (
        (parsed?.kemisNumber || parsed?.nemisNumber) &&
        (s.kemisNumber || s.nemisNumber) &&
        (s.kemisNumber || s.nemisNumber)?.toLowerCase() === (parsed.kemisNumber || parsed.nemisNumber)?.toLowerCase()
      ) {
        return true;
      }
      if (s.admissionNumber.toLowerCase() === cleanText.toLowerCase()) {
        return true;
      }
      if (cleanNorm.length > 2 && s.admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanNorm) {
        return true;
      }
      if (s.id.toLowerCase() === cleanText.toLowerCase()) {
        return true;
      }
      if (
        (s.assessmentNumber && s.assessmentNumber.toLowerCase() === cleanText.toLowerCase()) ||
        (s.upiNumber && s.upiNumber.toLowerCase() === cleanText.toLowerCase())
      ) {
        return true;
      }
      if (
        (s.kemisNumber && s.kemisNumber.toLowerCase() === cleanText.toLowerCase()) ||
        (s.nemisNumber && s.nemisNumber.toLowerCase() === cleanText.toLowerCase())
      ) {
        return true;
      }
      if (s.birthCertNumber && s.birthCertNumber.toLowerCase() === cleanText.toLowerCase()) {
        return true;
      }
      if (s.fullName.toLowerCase() === cleanText.toLowerCase()) {
        return true;
      }
      return false;
    });

    if (matched) {
      // Check if student has ALREADY checked in today
      const alreadyChecked =
        checkedInTodayMap[matched.id] ||
        (matched.admissionNumber ? checkedInTodayMap[matched.admissionNumber] : undefined) ||
        (matched.admissionNumber ? checkedInTodayMap[matched.admissionNumber.toLowerCase()] : undefined) ||
        scanFeed.find(
          (f) =>
            f.studentId === matched.id ||
            (matched.admissionNumber && f.admissionNumber?.toLowerCase().trim() === matched.admissionNumber.toLowerCase().trim())
        );

      const firstName = matched.firstName || (matched.fullName ? matched.fullName.trim().split(/\s+/)[0] : 'Learner');

      if (alreadyChecked) {
        const checkedTime =
          alreadyChecked.timestamp || (alreadyChecked as any).time || 'Earlier today';
        setLastScannedStudent(null);
        setAlreadyCheckedInAlert({
          student: matched,
          time: checkedTime,
          status: alreadyChecked.status || 'PRESENT',
        });

        // Warning tone for duplicate scan
        playBeep(false);

        // Voice announcement: "Student already checked in"
        speakGreeting(`${matched.fullName || firstName}, student already checked in.`);

        showToast(`${matched.fullName} (${matched.admissionNumber}): Student already checked in today (${checkedTime}). No duplicate recorded.`, 'warning');
        return;
      }

      // First-time check-in today:
      setAlreadyCheckedInAlert(null);
      setLastScannedStudent(matched);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 900);

      // Play success chime immediately (zero latency)
      playBeep(true);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const isLate = now.getHours() > 8; // After 8:00 AM

      // Speak Clear Standard English Greeting: "Welcome to Gracia Learning Centre, [First Name]!"
      speakGreeting(`Welcome to Gracia Learning Centre, ${firstName}.`);

      // Update in-memory tracking map so subsequent scans immediately know
      const checkInData = {
        time: timeStr,
        status: (isLate ? 'LATE' : 'PRESENT') as 'PRESENT' | 'LATE',
        studentName: matched.fullName,
      };
      setCheckedInTodayMap((prev) => ({
        ...prev,
        [matched.id]: checkInData,
        ...(matched.admissionNumber ? { [matched.admissionNumber]: checkInData, [matched.admissionNumber.toLowerCase()]: checkInData } : {}),
      }));

      setScanFeed((prev) => [
        {
          id: `scan-${Date.now()}`,
          studentId: matched.id,
          studentName: matched.fullName,
          admissionNumber: matched.admissionNumber,
          classLevel: `${matched.currentClass} ${matched.stream}`,
          timestamp: timeStr,
          status: isLate ? 'LATE' : 'PRESENT',
        },
        ...prev.slice(0, 24),
      ]);

      showToast(`Verified & Logged: ${matched.fullName} (${matched.admissionNumber})`, 'success');

      // Auto-sync into today's Firestore attendance record
      if (school?.id) {
        try {
          const todayDateStr = new Date().toISOString().split('T')[0];
          const classStudents = await studentService.getStudents(school.id, {
            classLevel: matched.currentClass,
            stream: matched.stream,
          });

          const existing = await attendanceService.getAttendanceRecords(school.id, {
            classLevel: matched.currentClass,
            date: todayDateStr,
          });

          const matchRec = existing.find((r) => r.stream?.toLowerCase() === matched.stream?.toLowerCase());
          const currentEntries = matchRec?.entries || classStudents.map((cs) => ({
            studentId: cs.id,
            studentName: cs.fullName,
            admissionNumber: cs.admissionNumber,
            status: 'ABSENT' as const,
            remarks: '',
          }));

          const updatedEntries = currentEntries.map((e) => {
            if (e.studentId === matched.id || e.admissionNumber.toLowerCase() === matched.admissionNumber.toLowerCase()) {
              return {
                ...e,
                status: (isLate ? 'LATE' : 'PRESENT') as AttendanceRecord['entries'][0]['status'],
                remarks: `Scanned at Gate Terminal (${timeStr})`,
              };
            }
            return e;
          });

          await attendanceService.saveAttendance(school.id, {
            date: todayDateStr,
            classLevel: matched.currentClass,
            stream: matched.stream,
            recordedBy: user?.fullName || 'Gate QR Scanner Terminal',
            entries: updatedEntries,
          });
        } catch (syncErr) {
          console.warn('Silent attendance auto-sync notification:', syncErr);
        }
      }
    } else {
      setLastScannedStudent(null);
      setAlreadyCheckedInAlert(null);
      playBeep(false);
      speakGreeting('Learner not recognized.');
      showToast(`Scanned Code '${cleanText.slice(0, 30)}' not matched to any registered student.`, 'warning');
    }
  };

  // USB Scanner Barcode Input Handler
  const handleUsbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usbInput.trim()) return;
    handleProcessScannedCode(usbInput);
    setUsbInput('');
  };

  // Image / Photo QR Upload Scan with Html5Qrcode
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      // Create temporary scanner instance for file decode
      const tempScanner = new Html5Qrcode('gate-qr-reader-temp', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
      });

      const decodedText = await tempScanner.scanFile(file, true);
      if (decodedText) {
        handleProcessScannedCode(decodedText);
      } else {
        throw new Error('No QR code detected');
      }
    } catch (err: any) {
      console.warn('File decode error:', err);
      playBeep(false);
      showToast('No QR code detected in the selected image. Ensure the QR code is clear, bright, and in focus.', 'warning');
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  // Quick Simulated Test Scan
  const handleSimulateTestScan = (stId: string) => {
    const target = allSchoolStudents.find((s) => s.id === stId) || students.find((s) => s.id === stId);
    if (!target) return;
    const testPayload = JSON.stringify({
      type: 'STUDENT_ATTENDANCE',
      schoolId: school?.id || '',
      studentId: target.id,
      admissionNumber: target.admissionNumber,
      fullName: target.fullName,
      classLevel: `${target.currentClass} ${target.stream}`,
    });
    handleProcessScannedCode(testPayload);
  };

  // Open On-Screen Badge Preview Modal
  const handleOpenBadgePreview = async (st: Student) => {
    setPreviewBadgeStudent(st);
    try {
      const url = await generateStudentQrCode({
        type: 'STUDENT_ATTENDANCE',
        schoolId: school?.id || '',
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        fullName: st.fullName,
        classLevel: `${st.currentClass} ${st.stream}`,
      });
      setPreviewBadgeQrUrl(url);
    } catch (e) {
      console.error('Failed generating test QR badge:', e);
    }
  };

  // Generate All QR Codes for Printing
  const handleGenerateClassQrs = async () => {
    setGeneratingQrs(true);
    try {
      const urls: Record<string, string> = {};
      for (const st of students) {
        const qrUrl = await generateStudentQrCode({
          type: 'STUDENT_ATTENDANCE',
          schoolId: school!.id,
          studentId: st.id,
          admissionNumber: st.admissionNumber,
          fullName: st.fullName,
          classLevel: `${st.currentClass} ${st.stream}`,
        });
        urls[st.id] = qrUrl;
      }
      setQrCodeUrls(urls);
      showToast(`Generated ${students.length} student QR ID codes!`, 'success');
    } catch (e: any) {
      showToast('Error generating QR codes: ' + e.message, 'error');
    } finally {
      setGeneratingQrs(false);
    }
  };

  // Load Daily Attendance Records when date or tab changes
  const loadDailyAttendanceReport = async (dateStr: string) => {
    if (!school?.id) return;
    setLoadingReport(true);
    try {
      const records = await attendanceService.getAttendanceRecords(school.id, {
        date: dateStr,
      });
      setDailyAttendanceRecords(records);
    } catch (e: any) {
      console.error('Error loading daily attendance report:', e);
      showToast('Error loading attendance records for ' + dateStr, 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (school?.id && (activeTab === 'DAILY_REPORT' || dailyAttendanceRecords.length === 0)) {
      loadDailyAttendanceReport(reportDate);
    }
  }, [school?.id, reportDate, activeTab]);

  // Date Navigation Helpers
  const shiftReportDate = (days: number) => {
    const d = new Date(reportDate);
    d.setDate(d.getDate() + days);
    const newStr = d.toISOString().split('T')[0];
    setReportDate(newStr);
  };

  // Build student status lookup map for reportDate
  const reportStudentStatusMap: Record<
    string,
    {
      status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'SICK' | 'NOT_RECORDED';
      remarks?: string;
      recordedBy?: string;
      checkInTime?: string;
    }
  > = {};

  const isReportDateToday = reportDate === new Date().toISOString().split('T')[0];

  // 1. From saved AttendanceRecord entries for this date
  dailyAttendanceRecords.forEach((rec) => {
    rec.entries.forEach((ent) => {
      const timeMatch = ent.remarks?.match(/\((.*?)\)/);
      const timeVal = timeMatch ? timeMatch[1] : undefined;
      const data = {
        status: ent.status,
        remarks: ent.remarks || '',
        recordedBy: rec.recordedBy,
        checkInTime: timeVal,
      };
      reportStudentStatusMap[ent.studentId] = data;
      if (ent.admissionNumber) {
        reportStudentStatusMap[ent.admissionNumber] = data;
        reportStudentStatusMap[ent.admissionNumber.toLowerCase()] = data;
      }
    });
  });

  // 2. If report is today, also incorporate live gate scans if not in class roll
  if (isReportDateToday) {
    (Object.entries(checkedInTodayMap) as [string, { time: string; status: 'PRESENT' | 'LATE'; studentName: string }][]).forEach(([idOrAdm, check]) => {
      if (!reportStudentStatusMap[idOrAdm] || reportStudentStatusMap[idOrAdm].status === 'NOT_RECORDED') {
        reportStudentStatusMap[idOrAdm] = {
          status: check.status,
          remarks: `Gate Terminal Scan (${check.time})`,
          checkInTime: check.time,
        };
      }
    });
  }

  // Filter students by selected reportClassFilter & reportStreamFilter & Search & Status
  const filteredReportStudents = allSchoolStudents.filter((st) => {
    if (reportClassFilter !== 'ALL' && st.currentClass !== reportClassFilter) return false;
    if (reportStreamFilter !== 'ALL' && st.stream !== reportStreamFilter) return false;

    // Status Filter
    const info = reportStudentStatusMap[st.id] || (st.admissionNumber ? reportStudentStatusMap[st.admissionNumber] : undefined);
    const hasClassRecord = dailyAttendanceRecords.some((r) => r.classLevel === st.currentClass);
    const resolvedStatus = info?.status || (hasClassRecord ? 'ABSENT' : 'NOT_RECORDED');

    if (reportStatusFilter !== 'ALL') {
      if (reportStatusFilter === 'PRESENT' && resolvedStatus !== 'PRESENT') return false;
      if (reportStatusFilter === 'LATE' && resolvedStatus !== 'LATE') return false;
      if (reportStatusFilter === 'ABSENT' && resolvedStatus !== 'ABSENT' && resolvedStatus !== 'NOT_RECORDED') return false;
      if (reportStatusFilter === 'EXCUSED' && resolvedStatus !== 'EXCUSED' && resolvedStatus !== 'SICK') return false;
    }

    // Search query
    if (reportSearchTerm.trim()) {
      const q = reportSearchTerm.toLowerCase();
      const matchName = st.fullName.toLowerCase().includes(q);
      const matchAdm = st.admissionNumber.toLowerCase().includes(q);
      const matchParent = st.parentName?.toLowerCase().includes(q) || st.parentPhone?.includes(q);
      if (!matchName && !matchAdm && !matchParent) return false;
    }
    return true;
  });

  // Total KPIs across filtered scope
  const repTotalEnrolled = allSchoolStudents.filter((st) => {
    if (reportClassFilter !== 'ALL' && st.currentClass !== reportClassFilter) return false;
    if (reportStreamFilter !== 'ALL' && st.stream !== reportStreamFilter) return false;
    return true;
  }).length;

  let repPresent = 0;
  let repLate = 0;
  let repAbsent = 0;
  let repExcused = 0;
  let repBoysEnrolled = 0;
  let repBoysPresent = 0;
  let repGirlsEnrolled = 0;
  let repGirlsPresent = 0;

  allSchoolStudents.forEach((st) => {
    if (reportClassFilter !== 'ALL' && st.currentClass !== reportClassFilter) return;
    if (reportStreamFilter !== 'ALL' && st.stream !== reportStreamFilter) return;

    if (st.gender === 'MALE') repBoysEnrolled++;
    else repGirlsEnrolled++;

    const info = reportStudentStatusMap[st.id] || (st.admissionNumber ? reportStudentStatusMap[st.admissionNumber] : undefined);
    const hasClassRecord = dailyAttendanceRecords.some((r) => r.classLevel === st.currentClass);
    const stat = info?.status || (hasClassRecord ? 'ABSENT' : 'NOT_RECORDED');

    if (stat === 'PRESENT') {
      repPresent++;
      if (st.gender === 'MALE') repBoysPresent++;
      else repGirlsPresent++;
    } else if (stat === 'LATE') {
      repLate++;
      repPresent++; // Late learners are present in school
      if (st.gender === 'MALE') repBoysPresent++;
      else repGirlsPresent++;
    } else if (stat === 'EXCUSED' || stat === 'SICK') {
      repExcused++;
    } else if (stat === 'ABSENT' || stat === 'NOT_RECORDED') {
      repAbsent++;
    }
  });

  const repAttendanceRate = repTotalEnrolled > 0 ? (repPresent / repTotalEnrolled) * 100 : 0;

  // Class-by-Class Breakdown
  const classBreakdowns = GRADE_LEVELS.map((grade) => {
    const classStudents = allSchoolStudents.filter((s) => s.currentClass === grade);
    const streams: string[] = Array.from(new Set<string>(classStudents.map((s) => s.stream || 'East')));

    return streams.map((str: string) => {
      const streamStudents = classStudents.filter((s) => (s.stream || 'East') === str);
      const enrolled = streamStudents.length;
      let present = 0;
      let late = 0;
      let absent = 0;
      let excused = 0;

      streamStudents.forEach((st) => {
        const info = reportStudentStatusMap[st.id] || (st.admissionNumber ? reportStudentStatusMap[st.admissionNumber] : undefined);
        const hasClassRec = dailyAttendanceRecords.some((r) => r.classLevel === grade && r.stream === str);
        const stat = info?.status || (hasClassRec ? 'ABSENT' : 'NOT_RECORDED');

        if (stat === 'PRESENT') present++;
        else if (stat === 'LATE') {
          late++;
          present++;
        } else if (stat === 'EXCUSED' || stat === 'SICK') excused++;
        else absent++;
      });

      const rate = enrolled > 0 ? (present / enrolled) * 100 : 0;
      const rec = dailyAttendanceRecords.find((r) => r.classLevel === grade && r.stream === str);

      return {
        classLevel: grade,
        stream: str,
        enrolled,
        present,
        late,
        absent,
        excused,
        rate,
        recordedBy: rec?.recordedBy || (enrolled === 0 ? '-' : 'Roll Pending / Gate Live'),
      };
    });
  })
    .flat()
    .filter((cb) => cb.enrolled > 0);

  // Absentee and Follow-Up List
  const absenteeList = allSchoolStudents
    .filter((st) => {
      if (reportClassFilter !== 'ALL' && st.currentClass !== reportClassFilter) return false;
      if (reportStreamFilter !== 'ALL' && st.stream !== reportStreamFilter) return false;
      const info = reportStudentStatusMap[st.id] || (st.admissionNumber ? reportStudentStatusMap[st.admissionNumber] : undefined);
      const hasClassRec = dailyAttendanceRecords.some((r) => r.classLevel === st.currentClass);
      const stat = info?.status || (hasClassRec ? 'ABSENT' : 'NOT_RECORDED');
      return stat === 'ABSENT' || stat === 'LATE' || stat === 'EXCUSED' || stat === 'SICK' || stat === 'NOT_RECORDED';
    })
    .map((st) => {
      const info = reportStudentStatusMap[st.id] || (st.admissionNumber ? reportStudentStatusMap[st.admissionNumber] : undefined);
      const hasClassRec = dailyAttendanceRecords.some((r) => r.classLevel === st.currentClass);
      const status = (info?.status || (hasClassRec ? 'ABSENT' : 'ABSENT')) as 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK';
      return {
        admissionNumber: st.admissionNumber,
        studentName: st.fullName,
        classLevel: st.currentClass,
        stream: st.stream || 'East',
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        status,
        remarks: info?.remarks || (status === 'ABSENT' ? 'Unexcused Absence' : ''),
      };
    });

  const handlePrintDailyReport = () => {
    const reportData = {
      date: reportDate,
      academicYear: `${new Date(reportDate).getFullYear()}`,
      term: 'Term 1',
      totalEnrolled: repTotalEnrolled,
      totalPresent: repPresent,
      totalLate: repLate,
      totalAbsent: repAbsent,
      totalExcused: repExcused,
      attendanceRate: repAttendanceRate,
      boysEnrolled: repBoysEnrolled,
      boysPresent: repBoysPresent,
      girlsEnrolled: repGirlsEnrolled,
      girlsPresent: repGirlsPresent,
      classSummaries: classBreakdowns,
      absenteeList: absenteeList,
    };
    printerService.printDailyAttendanceReport(reportData, school);
    showToast(`Generating printable Daily Attendance Diary for ${reportDate}...`, 'info');
  };

  const handleExportDailyCsv = () => {
    const headers = [
      'AdmNo',
      'StudentName',
      'Gender',
      'ClassLevel',
      'Stream',
      'AttendanceStatus',
      'CheckInTime_Remarks',
      'ParentGuardianName',
      'ParentPhone',
      'Date',
    ];

    const rows = filteredReportStudents.map((st) => {
      const info = reportStudentStatusMap[st.id] || (st.admissionNumber ? reportStudentStatusMap[st.admissionNumber] : undefined);
      const hasClassRecord = dailyAttendanceRecords.some((r) => r.classLevel === st.currentClass);
      const status = info?.status || (hasClassRecord ? 'ABSENT' : 'NOT_RECORDED');
      return [
        st.admissionNumber,
        `"${st.fullName}"`,
        st.gender,
        st.currentClass,
        st.stream || '',
        status,
        `"${info?.remarks || info?.checkInTime || ''}"`,
        `"${st.parentName || ''}"`,
        st.parentPhone || '',
        reportDate,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`# Daily Attendance Diary - ${school?.name || 'Gracia School'} (${reportDate})`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Attendance_Diary_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded Daily Attendance Diary (${reportDate}).csv`, 'success');
  };

  const statusList = Object.values(statusMap) as { status: AttendanceRecord['entries'][0]['status']; remarks?: string }[];
  const presentCount = statusList.filter((v) => v.status === 'PRESENT').length;
  const absentCount = statusList.filter((v) => v.status === 'ABSENT').length;
  const lateCount = statusList.filter((v) => v.status === 'LATE').length;
  const sickCount = statusList.filter((v) => v.status === 'EXCUSED').length;

  const classStudentsFromAll = allSchoolStudents.filter((s) => s.currentClass === selectedClass);
  const classStreams = Array.from(
    new Set(classStudentsFromAll.map((s) => s.stream?.trim()).filter(Boolean))
  ) as string[];
  const dynamicStreams = Array.from(new Set([...classStreams, 'East', 'West', 'North', 'Blue', 'Red']));

  const filteredRollCallStudents = students.filter((st) => {
    if (!rollCallSearch.trim()) return true;
    const q = rollCallSearch.toLowerCase().trim();
    return (
      st.fullName?.toLowerCase().includes(q) ||
      st.admissionNumber?.toLowerCase().includes(q) ||
      st.assessmentNumber?.toLowerCase().includes(q) ||
      st.upiNumber?.toLowerCase().includes(q)
    );
  });

  const badgeStudents = allSchoolStudents.filter((st) => {
    if (badgeClassFilter !== 'ALL' && st.currentClass !== badgeClassFilter) return false;
    if (badgeStreamFilter !== 'ALL' && (st.stream || '').toLowerCase() !== badgeStreamFilter.toLowerCase()) return false;
    if (badgeSearch.trim()) {
      const q = badgeSearch.toLowerCase().trim();
      return (
        st.fullName?.toLowerCase().includes(q) ||
        st.admissionNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hidden temporary element for file decode */}
      <div id="gate-qr-reader-temp" className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-900/10 flex items-center justify-center text-blue-900">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Attendance & Gate QR Scanner</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time optical QR scanner, USB barcode check-ins, automated morning gate timeline, and CBC class register.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('ROLL_CALL');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ROLL_CALL'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Class Register
          </button>
          <button
            onClick={() => setActiveTab('QR_SCANNER')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'QR_SCANNER'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Gate QR Scanner
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('DAILY_REPORT');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'DAILY_REPORT'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-800" />
            Daily Diary Report
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('QR_CARDS');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'QR_CARDS'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            ID Badge Cards
          </button>
        </div>
      </div>

      {/* TAB 1: QR CODE SCANNER VIEW */}
      {activeTab === 'QR_SCANNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner Viewport Card */}
          <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="font-bold text-sm">Gate Attendance Scanner Station</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Camera Selector dropdown if multiple webcams available */}
                {availableCameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs"
                  >
                    {availableCameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Mute Chime Sound' : 'Enable Chime Sound'}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                <Badge variant="primary" size="sm">
                  Optical QR & Barcode
                </Badge>
              </div>
            </div>

            {/* Video Viewport / Html5Qrcode Element */}
            <div className={`relative min-h-[340px] w-full bg-slate-950 rounded-2xl overflow-hidden border ${scanFlash ? 'border-emerald-400 ring-4 ring-emerald-500/40' : 'border-slate-800'} flex flex-col items-center justify-center transition-all duration-200`}>
              
              {/* CSS Rules to ensure Html5Qrcode video feeds render full-width on mobile and desktop without black letterboxing */}
              <style>{`
                #gate-qr-reader {
                  border: none !important;
                  width: 100% !important;
                  max-width: 100% !important;
                }
                #gate-qr-reader video {
                  width: 100% !important;
                  height: auto !important;
                  min-height: 280px !important;
                  max-height: 420px !important;
                  object-fit: cover !important;
                  border-radius: 12px !important;
                }
                #gate-qr-reader canvas {
                  display: none !important;
                }
                #gate-qr-reader__scan_region {
                  display: flex !important;
                  justify-content: center !important;
                  align-items: center !important;
                  min-height: 260px !important;
                }
                #gate-qr-reader__scan_region img {
                  display: none !important;
                }
                #gate-qr-reader__dashboard {
                  display: none !important;
                }
                #gate-qr-reader__header_message {
                  display: none !important;
                }
              `}</style>

              {/* Html5Qrcode Scanner Target Div - Always rendered with dimensions */}
              <div
                id="gate-qr-reader"
                className="w-full min-h-[280px] flex items-center justify-center"
              />

              {!isCameraActive && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                  <div className="w-14 h-14 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Camera Scanner Ready</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Click below to activate live webcam/phone camera, scan a badge image, or plug in a USB handheld barcode reader.
                    </p>
                  </div>
                  {cameraError && (
                    <div className="text-xs text-amber-300 bg-amber-950/70 p-3 rounded-xl border border-amber-800/80 max-w-md mx-auto text-left flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div className="space-y-1">
                        <p className="font-semibold">{cameraError}</p>
                        <p className="text-[11px] text-amber-400/80">Tip: You can also use the <strong>Upload QR Photo</strong> button or the <strong>Instant Test Badges</strong> below to test scanning immediately!</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Camera className="w-4 h-4" />}
                      onClick={() => startCamera()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                    >
                      Start Camera Scanner
                    </Button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      {isProcessingFile ? 'Decoding Image...' : 'Upload / Scan QR Image'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileScan}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scanner Controls & USB / Manual Entry Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isCameraActive ? (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={stopCamera}
                        className="text-xs font-bold cursor-pointer"
                      >
                        Stop Camera
                      </Button>
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        title="Flip Camera"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] font-semibold">{cameraFacing === 'environment' ? 'Rear' : 'Front'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-emerald-600 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Start Camera
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    Upload QR Photo
                  </button>
                </div>

                <form onSubmit={handleUsbSubmit} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Scan with USB reader or type Admission No..."
                      value={usbInput}
                      onChange={(e) => setUsbInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    <Keyboard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                  <Button variant="secondary" size="sm" type="submit" className="cursor-pointer">
                    Check In
                  </Button>
                </form>
              </div>

              {/* Instant Test Learner Verification & Badge Generator */}
              <div className="p-3 bg-slate-800/70 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Quick Test QR Verification:
                </span>
                
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                  <select
                    value={testStudentId}
                    onChange={(e) => setTestStudentId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 max-w-[220px]"
                  >
                    <option value="">-- Select Learner --</option>
                    {(allSchoolStudents.length > 0 ? allSchoolStudents : students).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.admissionNumber})
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!testStudentId}
                    onClick={() => handleSimulateTestScan(testStudentId)}
                    className="text-xs whitespace-nowrap bg-blue-900/50 hover:bg-blue-900/90 border-blue-700 text-blue-200 cursor-pointer"
                  >
                    Simulate Scan
                  </Button>

                  {testStudentId && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = (allSchoolStudents.length > 0 ? allSchoolStudents : students).find((s) => s.id === testStudentId);
                        if (target) handleOpenBadgePreview(target);
                      }}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      Show QR on Screen
                    </button>
                  )}
                </div>
              </div>

              {/* Verified Student Banner */}
              {lastScannedStudent && (
                <div className="bg-slate-800/95 p-3.5 rounded-2xl border-2 border-emerald-500/80 flex items-center gap-3.5 animate-fadeIn shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Verified & Logged Present:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{lastScannedStudent.fullName}</h4>
                    <p className="text-xs text-slate-300">
                      Adm No: <strong className="text-amber-400 font-mono">{lastScannedStudent.admissionNumber}</strong> • {lastScannedStudent.currentClass}{' '}
                      {lastScannedStudent.stream} Stream • Guardian: {lastScannedStudent.parentPhone || '+254 722 000 000'}
                    </p>
                  </div>
                </div>
              )}

              {/* Already Checked In Warning Banner */}
              {alreadyCheckedInAlert && (
                <div className="bg-amber-950/50 p-3.5 rounded-2xl border-2 border-amber-500/90 flex items-center gap-3.5 animate-fadeIn shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        Already Checked In Today:
                      </span>
                      <span className="text-[10px] text-amber-300/90 font-mono">
                        Recorded at {alreadyCheckedInAlert.time}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{alreadyCheckedInAlert.student.fullName}</h4>
                    <p className="text-xs text-amber-200/90">
                      Adm No: <strong className="text-white font-mono">{alreadyCheckedInAlert.student.admissionNumber}</strong> • {alreadyCheckedInAlert.student.currentClass}{' '}
                      {alreadyCheckedInAlert.student.stream} Stream • Status: <span className="text-emerald-400 font-bold">{alreadyCheckedInAlert.status}</span>
                    </p>
                    <p className="text-[11px] text-amber-300 mt-0.5 font-medium">
                      ⚠️ Student is already checked in for today. No duplicate scan recorded.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Check-In Timeline Feed */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-900" />
                  <h3 className="font-bold text-sm text-slate-900">Today&apos;s Check-In Feed</h3>
                </div>
                <Badge variant="primary" size="sm">
                  {scanFeed.length} Logged
                </Badge>
              </div>

              <div className="mt-4 max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {scanFeed.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                    <Scan className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600">No learners scanned yet today.</p>
                    <p className="text-[10px]">Scanned student badges will appear here in real-time.</p>
                  </div>
                ) : (
                  scanFeed.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{evt.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {evt.admissionNumber} • {evt.classLevel}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={evt.status === 'LATE' ? 'warning' : 'success'} size="sm">
                          {evt.timestamp}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Html5Qrcode Optical Scanner & Firestore Gate Sync Active</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRINTABLE ID BADGE CARDS */}
      {activeTab === 'QR_CARDS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Class Level
                </label>
                <select
                  value={badgeClassFilter}
                  onChange={(e) => setBadgeClassFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ALL">All Classes ({allSchoolStudents.length})</option>
                  {GRADE_LEVELS.map((g) => {
                    const count = allSchoolStudents.filter((s) => s.currentClass === g).length;
                    return (
                      <option key={g} value={g}>
                        {g} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Stream Filter
                </label>
                <select
                  value={badgeStreamFilter}
                  onChange={(e) => setBadgeStreamFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ALL">All Streams</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="North">North</option>
                  <option value="Blue">Blue</option>
                  <option value="Red">Red</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Search Learner
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Name or Adm No..."
                    value={badgeSearch}
                    onChange={(e) => setBadgeSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-900 w-44"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5 text-blue-900" />}
                onClick={handleGenerateClassQrs}
                loading={generatingQrs}
              >
                Generate Badges ({badgeStudents.length})
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() =>
                  printerService.printTargetElement(
                    'printable-class-qr-cards',
                    `Student_ID_Cards_${badgeClassFilter}_${badgeStreamFilter}`
                  )
                }
              >
                Print Badges
              </Button>
            </div>
          </div>

          {/* Cards Grid */}
          {badgeStudents.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              <QrCode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">No learners found matching the selected badge filter.</p>
              <p className="text-xs text-slate-400 mt-1">Try selecting "All Classes" or clear search keywords.</p>
            </div>
          ) : (
            <div
              id="printable-class-qr-cards"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3"
            >
              {badgeStudents.map((st) => {
                const qrSrc = qrCodeUrls[st.id];

                return (
                  <div
                    key={st.id}
                    className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col items-center text-center space-y-3 print:border-black print:shadow-none"
                  >
                    <div className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">
                      {school?.name || 'Gracia Learning Centre'}
                    </div>

                    <div className="w-14 h-14 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
                      {st.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{st.fullName}</h4>
                      <p className="text-xs font-mono font-bold text-blue-900">{st.admissionNumber}</p>
                      <p className="text-[11px] text-slate-500">
                        {st.currentClass} {st.stream ? `• ${st.stream} Stream` : ''}
                      </p>
                    </div>

                    {qrSrc ? (
                      <div className="w-32 h-32 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
                        <img src={qrSrc} alt="QR Badge" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 p-2">
                        <QrCode className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">Click Generate</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenBadgePreview(st)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        View Badge
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateTestScan(st.id)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Test Scan
                      </button>
                    </div>

                    <div className="text-[9px] text-slate-400 font-mono">
                      Valid: Academic Year {school?.academicYear || '2026'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STANDARD CLASS REGISTER TABLE */}
      {activeTab === 'ROLL_CALL' && (
        <div className="space-y-5">
          {/* Quick Class Level Selector Ribbon */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Select Class Level to Take Attendance:
              </span>
              <span className="text-xs font-bold text-blue-900">
                Total School Enrolled: {allSchoolStudents.length} Learners
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {GRADE_LEVELS.map((lvl) => {
                const count = allSchoolStudents.filter((s) => s.currentClass === lvl).length;
                const isSelected = selectedClass === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedClass(lvl)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{lvl}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                        isSelected
                          ? 'bg-blue-800 text-blue-100'
                          : count > 0
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Class Level
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value as GradeLevel)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-900"
                >
                  {GRADE_LEVELS.map((g) => {
                    const cnt = allSchoolStudents.filter((s) => s.currentClass === g).length;
                    return (
                      <option key={g} value={g}>
                        {g} ({cnt} enrolled)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Stream
                </label>
                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-900"
                >
                  <option value="ALL">All Streams ({classStudentsFromAll.length})</option>
                  {dynamicStreams.map((strm) => {
                    const strmCount = classStudentsFromAll.filter(
                      (s) => (s.stream || '').toLowerCase() === strm.toLowerCase()
                    ).length;
                    return (
                      <option key={strm} value={strm}>
                        {strm} Stream {strmCount > 0 ? `(${strmCount})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Roll Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Search Learner
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or admission no..."
                    value={rollCallSearch}
                    onChange={(e) => setRollCallSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-900 w-52"
                  />
                </div>
              </div>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAllStatus('PRESENT')}
                className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => setAllStatus('ABSENT')}
                className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              >
                Mark All Absent
              </button>
              <Button
                variant="primary"
                size="sm"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSaveAttendance}
                loading={saving}
                className="cursor-pointer"
              >
                Save Attendance Register
              </Button>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800">Present</span>
                <h4 className="text-xl font-black text-emerald-950 mt-0.5">{presentCount}</h4>
              </div>
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>

            <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-800">Absent</span>
                <h4 className="text-xl font-black text-rose-950 mt-0.5">{absentCount}</h4>
              </div>
              <XCircle className="w-7 h-7 text-rose-600" />
            </div>

            <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800">Late</span>
                <h4 className="text-xl font-black text-amber-950 mt-0.5">{lateCount}</h4>
              </div>
              <Clock className="w-7 h-7 text-amber-600" />
            </div>

            <div className="bg-blue-50 border border-blue-200/80 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-800">Excused / Sick</span>
                <h4 className="text-xl font-black text-blue-950 mt-0.5">{sickCount}</h4>
              </div>
              <HeartPulse className="w-7 h-7 text-blue-600" />
            </div>
          </div>

          {/* Register Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto animate-pulse text-slate-300 mb-2" />
                Loading learners list for {selectedClass}...
              </div>
            ) : students.length === 0 ? (
              <div className="p-10 text-center space-y-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">
                    No active students found in {selectedClass} {selectedStream !== 'ALL' ? `(${selectedStream} Stream)` : ''}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    {selectedStream !== 'ALL'
                      ? `There might be students enrolled in other streams of ${selectedClass}. Try switching to All Streams.`
                      : `No learners are currently assigned to ${selectedClass} in the school roster.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {selectedStream !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedStream('ALL')}
                      className="px-4 py-2 bg-blue-900 text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors cursor-pointer"
                    >
                      Show All Streams in {selectedClass}
                    </button>
                  )}
                  {GRADE_LEVELS.filter((g) => allSchoolStudents.some((s) => s.currentClass === g && g !== selectedClass)).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedClass(g)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Switch to {g} ({allSchoolStudents.filter((s) => s.currentClass === g).length} learners)
                    </button>
                  ))}
                </div>
              </div>
            ) : filteredRollCallStudents.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                No learners match your search filter "{rollCallSearch}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-4 font-mono">Admission No</th>
                      <th className="py-3 px-4">Stream</th>
                      <th className="py-3 px-4 text-center">Roll Call Status</th>
                      <th className="py-3 px-4">Remarks / Excuse Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRollCallStudents.map((st, idx) => {
                      const current = statusMap[st.id] || { status: 'PRESENT', remarks: '' };

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{st.fullName}</div>
                            <div className="text-[10px] text-slate-400">
                              Gender: {st.gender || 'N/A'} • Age: {st.age || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-900">
                            {st.admissionNumber}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                              {st.stream || 'Main'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusMap((prev) => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], status: 'PRESENT' },
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  current.status === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusMap((prev) => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], status: 'LATE' },
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  current.status === 'LATE'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusMap((prev) => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], status: 'ABSENT' },
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  current.status === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusMap((prev) => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], status: 'EXCUSED' },
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  current.status === 'EXCUSED'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Excused
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="e.g. Sick, Family emergency..."
                              value={current.remarks || ''}
                              onChange={(e) =>
                                setStatusMap((prev) => ({
                                  ...prev,
                                  [st.id]: { ...prev[st.id], remarks: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-900"
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
        </div>
      )}

      {/* TAB 4: DAILY ATTENDANCE DIARY & ANALYTICS REPORT */}
      {activeTab === 'DAILY_REPORT' && (
        <div className="space-y-6">
          {/* Top Filter & Action Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Date Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => shiftReportDate(-1)}
                    title="Previous Day"
                    className="p-1.5 hover:bg-white hover:text-blue-900 rounded-lg text-slate-600 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 px-2">
                    <Calendar className="w-4 h-4 text-blue-900" />
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => shiftReportDate(1)}
                    title="Next Day"
                    className="p-1.5 hover:bg-white hover:text-blue-900 rounded-lg text-slate-600 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setReportDate(new Date().toISOString().split('T')[0])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    reportDate === new Date().toISOString().split('T')[0]
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>

                <button
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setReportDate(y.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Yesterday
                </button>
              </div>

              {/* Class & Stream Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={reportClassFilter}
                    onChange={(e) => setReportClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-900"
                  >
                    <option value="ALL">All Classes (School-wide)</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={reportStreamFilter}
                  onChange={(e) => setReportStreamFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-900"
                >
                  <option value="ALL">All Streams</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                </select>

                <button
                  onClick={() => loadDailyAttendanceReport(reportDate)}
                  disabled={loadingReport}
                  title="Refresh Attendance Data"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin text-blue-900' : ''}`} />
                </button>
              </div>

              {/* Print & Export Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExportDailyCsv}
                >
                  Export CSV
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={handlePrintDailyReport}
                >
                  Print Official Diary (A4)
                </Button>
              </div>
            </div>

            {/* Sub-view Switcher & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setReportViewMode('OVERVIEW')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    reportViewMode === 'OVERVIEW'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Class Breakdown Matrix
                </button>
                <button
                  onClick={() => setReportViewMode('ROSTER')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    reportViewMode === 'ROSTER'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Student Roll ({filteredReportStudents.length})
                </button>
                <button
                  onClick={() => setReportViewMode('ABSENTEES')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    reportViewMode === 'ABSENTEES'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Absentee Diary & Calls ({absenteeList.length})
                </button>
              </div>

              {reportViewMode !== 'OVERVIEW' && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, adm, phone..."
                      value={reportSearchTerm}
                      onChange={(e) => setReportSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-900 w-48 sm:w-60"
                    />
                  </div>

                  {reportViewMode === 'ROSTER' && (
                    <select
                      value={reportStatusFilter}
                      onChange={(e) => setReportStatusFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-900"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PRESENT">Present Only</option>
                      <option value="LATE">Late Arrivals</option>
                      <option value="ABSENT">Absent</option>
                      <option value="EXCUSED">Excused / Sick</option>
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Roll */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Enrollment</span>
                <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{repTotalEnrolled}</div>
              <div className="text-[11px] text-slate-500 font-medium">
                👦 {repBoysEnrolled} Boys • 👧 {repGirlsEnrolled} Girls
              </div>
            </div>

            {/* Present Learners */}
            <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">Present in School</span>
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-900">{repPresent}</div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  {repAttendanceRate.toFixed(1)}%
                </span>
                <span>Turnout Rate</span>
              </div>
            </div>

            {/* Late Arrivals */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700">Late Check-ins</span>
                <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-900">{repLate}</div>
              <div className="text-[11px] text-amber-700 font-medium">
                Arrived after morning bell
              </div>
            </div>

            {/* Absentees */}
            <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700">Unexcused Absences</span>
                <div className="p-2 bg-rose-50 text-rose-800 rounded-xl">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-900">{repAbsent}</div>
              <div className="text-[11px] text-rose-600 font-medium">
                Requires follow-up call
              </div>
            </div>

            {/* Excused / Sick */}
            <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-xs space-y-2 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Excused / Sick</span>
                <div className="p-2 bg-blue-50 text-blue-800 rounded-xl">
                  <HeartPulse className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-900">{repExcused}</div>
              <div className="text-[11px] text-blue-700 font-medium">
                Approved parent notices
              </div>
            </div>
          </div>

          {/* SUB-VIEW 1: CLASS BREAKDOWN MATRIX */}
          {reportViewMode === 'OVERVIEW' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">CBC Class & Stream Attendance Summary</h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive roll breakdown across all levels for {new Date(reportDate).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{classBreakdowns.length} Active Streams</Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Class Level</th>
                      <th className="py-3 px-4">Stream</th>
                      <th className="py-3 px-4 text-center">Enrolled</th>
                      <th className="py-3 px-4 text-center text-emerald-800">Present</th>
                      <th className="py-3 px-4 text-center text-amber-800">Late</th>
                      <th className="py-3 px-4 text-center text-rose-800">Absent</th>
                      <th className="py-3 px-4 text-center text-blue-800">Excused</th>
                      <th className="py-3 px-4 text-center">Turnout Rate</th>
                      <th className="py-3 px-4">Status / Facilitator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classBreakdowns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500 text-xs">
                          No student records enrolled or registered in this school.
                        </td>
                      </tr>
                    ) : (
                      classBreakdowns.map((cb, idx) => {
                        return (
                          <tr key={`${cb.classLevel}-${cb.stream}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{cb.classLevel}</td>
                            <td className="py-3 px-4 text-slate-600 font-medium">{cb.stream}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">{cb.enrolled}</td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/30">
                              {cb.present}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-amber-700 bg-amber-50/30">
                              {cb.late}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-rose-700 bg-rose-50/30">
                              {cb.absent}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/30">
                              {cb.excused}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-bold text-slate-800 w-10 text-right">
                                  {cb.rate.toFixed(0)}%
                                </span>
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      cb.rate >= 90
                                        ? 'bg-emerald-500'
                                        : cb.rate >= 75
                                        ? 'bg-blue-500'
                                        : cb.rate >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, cb.rate)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {cb.recordedBy}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {classBreakdowns.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <td colSpan={2} className="py-3 px-4 text-left">
                          INSTITUTIONAL TOTAL
                        </td>
                        <td className="py-3 px-4 text-center">{repTotalEnrolled}</td>
                        <td className="py-3 px-4 text-center text-emerald-800">{repPresent}</td>
                        <td className="py-3 px-4 text-center text-amber-800">{repLate}</td>
                        <td className="py-3 px-4 text-center text-rose-800">{repAbsent}</td>
                        <td className="py-3 px-4 text-center text-blue-800">{repExcused}</td>
                        <td className="py-3 px-4 text-center text-emerald-900">
                          {repAttendanceRate.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          Official Daily Diary Ledger
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: FULL STUDENT REGISTER ROSTER */}
          {reportViewMode === 'ROSTER' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Learners Daily Roll Register</h3>
                  <p className="text-xs text-slate-500">
                    Individual learner status, scan timestamps, and remarks for {reportDate}
                  </p>
                </div>
                <Badge variant="neutral">{filteredReportStudents.length} Learners Listed</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Adm No</th>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-4">Class & Stream</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Time / Remarks</th>
                      <th className="py-3 px-4">Parent / Guardian</th>
                      <th className="py-3 px-4 text-right">Direct Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReportStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700 text-xs">No matching student records found</p>
                          <p className="text-[11px] text-slate-400">Try adjusting your class, stream, or search query filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredReportStudents.map((st) => {
                        const info = reportStudentStatusMap[st.id] || (st.admissionNumber ? reportStudentStatusMap[st.admissionNumber] : undefined);
                        const hasClassRec = dailyAttendanceRecords.some((r) => r.classLevel === st.currentClass);
                        const status = info?.status || (hasClassRec ? 'ABSENT' : 'NOT_RECORDED');

                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">{st.admissionNumber}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{st.fullName}</div>
                              <div className="text-[10px] text-slate-400 capitalize">{st.gender.toLowerCase()}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium">
                              {st.currentClass} • {st.stream || 'East'}
                            </td>
                            <td className="py-3 px-4">
                              {status === 'PRESENT' && (
                                <Badge variant="success">Present</Badge>
                              )}
                              {status === 'LATE' && (
                                <Badge variant="warning">Late Arrival</Badge>
                              )}
                              {status === 'ABSENT' && (
                                <Badge variant="danger">Absent</Badge>
                              )}
                              {status === 'EXCUSED' && (
                                <Badge variant="info">Excused</Badge>
                              )}
                              {status === 'SICK' && (
                                <Badge variant="info">Sick Leave</Badge>
                              )}
                              {status === 'NOT_RECORDED' && (
                                <Badge variant="neutral">Not Recorded</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-xs">
                              {info?.checkInTime ? (
                                <span className="font-mono text-slate-800 font-bold">
                                  ⏱ {info.checkInTime}
                                </span>
                              ) : info?.remarks ? (
                                <span>{info.remarks}</span>
                              ) : (
                                <span className="text-slate-400 italic">No notes</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div className="font-medium text-slate-800">{st.parentName || 'Parent / Guardian'}</div>
                              <div className="text-[11px] font-mono text-slate-500">{st.parentPhone || '-'}</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {st.parentPhone && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <a
                                    href={`https://wa.me/${st.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                      `Dear Parent, attendance update for ${st.fullName} (${st.admissionNumber}) at ${school?.name || 'School'}: Status on ${reportDate} is ${status}.`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Send WhatsApp notice"
                                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={`tel:${st.parentPhone}`}
                                    title="Call parent"
                                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: ABSENTEE & FOLLOW-UP DIARY */}
          {reportViewMode === 'ABSENTEES' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Absentee & Disciplinary Follow-Up Roster</h3>
                    <p className="text-xs text-slate-600">
                      Learners requiring parental notification or attendance verification for {reportDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{absenteeList.length} Learners Absent or Late</Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Adm No</th>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Guardian Contact</th>
                      <th className="py-3 px-4 text-center">Urgent Follow-Up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absenteeList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
                          <p className="font-bold text-slate-800 text-sm">No Unexcused Absentees Today!</p>
                          <p className="text-xs text-slate-400">All registered learners are present in school.</p>
                        </td>
                      </tr>
                    ) : (
                      absenteeList.map((abs, i) => (
                        <tr key={`${abs.admissionNumber}-${i}`} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">{abs.admissionNumber}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{abs.studentName}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {abs.classLevel} {abs.stream}
                          </td>
                          <td className="py-3 px-4">
                            {abs.status === 'LATE' && <Badge variant="warning">Late</Badge>}
                            {abs.status === 'ABSENT' && <Badge variant="danger">Absent</Badge>}
                            {abs.status === 'EXCUSED' && <Badge variant="info">Excused</Badge>}
                            {abs.status === 'SICK' && <Badge variant="info">Sick</Badge>}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{abs.remarks || 'No reason provided'}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{abs.parentName || 'Parent / Guardian'}</div>
                            <div className="font-mono text-slate-500 text-[11px]">{abs.parentPhone || 'No phone recorded'}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {abs.parentPhone ? (
                              <div className="flex items-center justify-center gap-2">
                                <a
                                  href={`https://wa.me/${abs.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                    `Dear Parent/Guardian of ${abs.studentName} (${abs.admissionNumber}), our records indicate the student is marked ${abs.status} today (${reportDate}) at ${school?.name || 'our school'}. Please contact us immediately if this is unexpected.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  WhatsApp
                                </a>
                                <a
                                  href={`tel:${abs.parentPhone}`}
                                  className="px-2.5 py-1 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  Call
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No contact</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {previewBadgeStudent && (
        <Modal
          isOpen={!!previewBadgeStudent}
          onClose={() => setPreviewBadgeStudent(null)}
          title="Student QR ID Badge Preview"
          size="md"
        >
          <div className="space-y-5 p-2 text-center">
            <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white p-6 rounded-3xl border-2 border-blue-400/40 shadow-xl space-y-4 max-w-sm mx-auto">
              <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                {school?.name || 'Gracia Learning Centre'}
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-blue-800 text-white border-2 border-blue-400 flex items-center justify-center font-bold text-lg">
                  {previewBadgeStudent.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-base text-white">{previewBadgeStudent.fullName}</h3>
                  <p className="text-xs font-mono text-amber-400 font-bold">{previewBadgeStudent.admissionNumber}</p>
                  <p className="text-[11px] text-blue-200">
                    {previewBadgeStudent.currentClass} • {previewBadgeStudent.stream} Stream
                  </p>
                </div>
              </div>

              {previewBadgeQrUrl && (
                <div className="p-3 bg-white rounded-2xl shadow-inner max-w-[200px] mx-auto border-2 border-slate-900">
                  <img src={previewBadgeQrUrl} alt="QR Code" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="text-[10px] text-blue-300 font-mono">
                Scan with Gate Terminal Camera or Phone Camera
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => {
                  if (previewBadgeStudent) {
                    handleSimulateTestScan(previewBadgeStudent.id);
                    setPreviewBadgeStudent(null);
                  }
                }}
              >
                Scan This Badge Now
              </Button>
              {previewBadgeQrUrl && (
                <a
                  href={previewBadgeQrUrl}
                  download={`QR-${previewBadgeStudent.admissionNumber.replace(/\//g, '-')}.png`}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  Download Image
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AttendanceView;
