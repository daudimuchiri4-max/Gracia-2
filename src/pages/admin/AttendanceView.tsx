import React, { useEffect, useState, useRef } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/assessmentAndAttendanceService';
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
  UserCheck,
  Zap,
  FlipHorizontal,
  Upload,
  Volume2,
  VolumeX,
  RefreshCw,
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
  studentName: string;
  admissionNumber: string;
  classLevel: string;
  timestamp: string;
  status: 'PRESENT' | 'LATE';
}

export const AttendanceView: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ROLL_CALL' | 'QR_SCANNER' | 'QR_CARDS'>('ROLL_CALL');

  // Roll-Call State
  const [selectedClass, setSelectedClass] = useState<GradeLevel>('Grade 6');
  const [selectedStream, setSelectedStream] = useState<string>('East');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allSchoolStudents, setAllSchoolStudents] = useState<Student[]>([]);
  const [statusMap, setStatusMap] = useState<
    Record<string, { status: AttendanceRecord['entries'][0]['status']; remarks?: string }>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usbInput, setUsbInput] = useState<string>('');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [scanFeed, setScanFeed] = useState<LiveScanEvent[]>([]);
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [testStudentId, setTestStudentId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Student QR Badges State
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [generatingQrs, setGeneratingQrs] = useState<boolean>(false);

  useEffect(() => {
    if (!school?.id) return;
    loadAllStudents();
  }, [school?.id]);

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
    } catch (e) {
      console.warn('Error loading all students:', e);
    }
  };

  const loadClassStudents = async () => {
    setLoading(true);
    try {
      const list = await studentService.getStudents(school!.id, {
        classLevel: selectedClass,
        stream: selectedStream,
      });
      setStudents(list);

      const existingRecords = await attendanceService.getAttendanceRecords(school!.id, {
        classLevel: selectedClass,
        date: selectedDate,
      });

      const matched = existingRecords.find(
        (r) => r.stream?.toLowerCase() === selectedStream.toLowerCase()
      );

      const initialStatus: Record<
        string,
        { status: AttendanceRecord['entries'][0]['status']; remarks?: string }
      > = {};

      list.forEach((s) => {
        const foundEntry = matched?.entries.find((e) => e.studentId === s.id);
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
    setSaving(true);
    try {
      const entries = students.map((s) => ({
        studentId: s.id,
        studentName: s.fullName,
        admissionNumber: s.admissionNumber,
        status: statusMap[s.id]?.status || 'PRESENT',
        remarks: statusMap[s.id]?.remarks || '',
      }));

      await attendanceService.saveAttendance(school!.id, {
        date: selectedDate,
        classLevel: selectedClass,
        stream: selectedStream,
        recordedBy: user?.fullName || 'Teacher on Duty',
        entries,
      });

      showToast(
        `Attendance for ${selectedClass} (${selectedStream}) saved successfully!`,
        'success'
      );
    } catch (e: any) {
      showToast('Error saving attendance: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Audio Beep Chime
  const playBeep = (success: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if (success) {
        // Dual-tone harmonic chime (E5 -> A5)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc1.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.08); // A5

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

        osc1.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.25);
      } else {
        // Soft low rejection buzz
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {
      // Audio optional
    }
  };

  // Camera & QR Scanner Logic using BarcodeDetector + jsQR
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    stopCamera();
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing ? { ideal: facing } : 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback if specific ideal constraints are unsupported
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      setIsCameraActive(true);

      // Attach stream to video element and start stream playback
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video auto-play handled:', playErr);
        }
      }

      startScanningLoop();
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please grant camera permission in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this system. You can upload a QR image or enter the admission number below.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently busy or in use by another browser tab or app.');
      } else {
        setCameraError('Unable to access device camera. You can also upload a QR photo or enter the admission number below.');
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  const startScanningLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Hardware accelerated BarcodeDetector when available
    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e'],
        });
      } catch {
        barcodeDetector = null;
      }
    }

    let isScanning = true;
    let isProcessingFrame = false;

    const scanFrame = async () => {
      if (!isScanning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !isProcessingFrame) {
        isProcessingFrame = true;
        try {
          let detectedText: string | null = null;

          // 1. Try hardware-accelerated BarcodeDetector first
          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                detectedText = barcodes[0].rawValue;
              }
            } catch {
              // Barcode detector error, fall back to jsQR
            }
          }

          // 2. jsQR software fallback with scaled sampling for high performance
          if (!detectedText && ctx) {
            const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
            const targetWidth = Math.max(240, Math.floor(video.videoWidth * scale));
            const targetHeight = Math.max(240, Math.floor(video.videoHeight * scale));

            if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
              canvas.width = targetWidth;
              canvas.height = targetHeight;
            }

            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (code && code.data) {
              detectedText = code.data;
            }
          }

          if (detectedText) {
            const rawData = detectedText.trim();
            const now = Date.now();
            // Debounce matching same code within 3 seconds
            if (rawData !== lastScanCodeRef.current || now - lastScanTimeRef.current > 3000) {
              lastScanCodeRef.current = rawData;
              lastScanTimeRef.current = now;
              handleProcessScannedCode(rawData);
            }
          }
        } catch (frameErr) {
          // Ignore transient frame read errors
        } finally {
          isProcessingFrame = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
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

    // Match student by ID, admission number, UPI, NEMIS, birth cert, or name
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
      if (parsed?.upiNumber && s.upiNumber && s.upiNumber.toLowerCase() === parsed.upiNumber.toLowerCase()) {
        return true;
      }
      if (parsed?.nemisNumber && s.nemisNumber && s.nemisNumber.toLowerCase() === parsed.nemisNumber.toLowerCase()) {
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
      if (s.upiNumber && s.upiNumber.toLowerCase() === cleanText.toLowerCase()) {
        return true;
      }
      if (s.nemisNumber && s.nemisNumber.toLowerCase() === cleanText.toLowerCase()) {
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
      setLastScannedStudent(matched);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 900);

      // Play success chime
      playBeep(true);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const isLate = now.getHours() > 8; // After 8:00 AM

      setScanFeed((prev) => [
        {
          id: `scan-${Date.now()}`,
          studentName: matched.fullName,
          admissionNumber: matched.admissionNumber,
          classLevel: `${matched.currentClass} ${matched.stream}`,
          timestamp: timeStr,
          status: isLate ? 'LATE' : 'PRESENT',
        },
        ...prev.slice(0, 24),
      ]);

      showToast(`Verified & Logged Present: ${matched.fullName} (${matched.admissionNumber})`, 'success');

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
                remarks: `Scanned at Gate Scanner (${timeStr})`,
              };
            }
            return e;
          });

          await attendanceService.saveAttendance(school.id, {
            date: todayDateStr,
            classLevel: matched.currentClass,
            stream: matched.stream,
            recordedBy: user?.fullName || 'Gate QR Terminal',
            entries: updatedEntries,
          });
        } catch (syncErr) {
          console.warn('Silent attendance auto-sync notification:', syncErr);
        }
      }
    } else {
      playBeep(false);
      showToast(`Scanned Code '${cleanText.slice(0, 30)}' not matched to any active learner.`, 'warning');
    }
  };

  const handleUsbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usbInput.trim()) return;
    handleProcessScannedCode(usbInput);
    setUsbInput('');
  };

  // Image / Photo QR Upload Scan
  const handleImageFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        let detected = false;
        // 1. Try native BarcodeDetector if available
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e'],
            });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
              handleProcessScannedCode(barcodes[0].rawValue);
              detected = true;
            }
          } catch {
            // fall back to jsQR
          }
        }

        // 2. jsQR canvas fallback
        if (!detected) {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (code && code.data) {
              handleProcessScannedCode(code.data);
              detected = true;
            }
          }
        }

        if (!detected) {
          playBeep(false);
          showToast('No QR code detected in the selected image. Please ensure the QR code is clear and in focus.', 'warning');
        }
        setIsProcessingFile(false);
      };
      img.onerror = () => {
        setIsProcessingFile(false);
        showToast('Failed to parse the uploaded image.', 'error');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

  const statusList = Object.values(statusMap) as { status: AttendanceRecord['entries'][0]['status']; remarks?: string }[];
  const presentCount = statusList.filter((v) => v.status === 'PRESENT').length;
  const absentCount = statusList.filter((v) => v.status === 'ABSENT').length;
  const lateCount = statusList.filter((v) => v.status === 'LATE').length;
  const sickCount = statusList.filter((v) => v.status === 'EXCUSED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="font-bold text-sm">Gate Attendance Scanner Station</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Mute Chime Sound' : 'Enable Chime Sound'}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                <Badge variant="primary" size="sm">
                  Optical QR & USB
                </Badge>
              </div>
            </div>

            {/* Video Viewport */}
            <div className={`relative aspect-video w-full bg-black rounded-2xl overflow-hidden border ${scanFlash ? 'border-emerald-400 ring-4 ring-emerald-500/40' : 'border-slate-700'} flex items-center justify-center transition-all duration-200`}>
              {/* Always keep video in DOM so ref is permanently available for stream attachment */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />

              {isCameraActive ? (
                <>
                  {/* Scanner Crosshair Reticle */}
                  <div className="absolute inset-0 border-2 border-blue-500/30 flex items-center justify-center pointer-events-none">
                    <div className={`w-52 h-52 border-2 rounded-2xl relative flex items-center justify-center transition-colors duration-200 ${scanFlash ? 'border-emerald-300 bg-emerald-500/20 shadow-[0_0_20px_#10b981]' : 'border-emerald-400 animate-pulse'}`}>
                      <div className="w-full h-0.5 bg-emerald-400/90 absolute shadow-[0_0_10px_#34d399] animate-bounce" />
                      <div className="absolute top-2 left-2 text-[9px] font-mono text-emerald-300 bg-slate-950/80 px-1.5 py-0.5 rounded">
                        Aim at Student QR / Barcode
                      </div>
                    </div>
                  </div>

                  {/* Camera Toolbar Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      title="Flip Camera (Front/Back)"
                      className="p-2 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl border border-slate-700 text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition-all cursor-pointer"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[11px] font-semibold">{cameraFacing === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-14 h-14 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Camera Scanner Ready</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                      Click below to activate live webcam/phone camera, scan a badge image, or plug in a USB handheld barcode reader.
                    </p>
                  </div>
                  {cameraError && (
                    <div className="text-xs text-amber-300 bg-amber-950/70 p-2.5 rounded-xl border border-amber-800/80 max-w-sm mx-auto text-left flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <span>{cameraError}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Camera className="w-4 h-4" />}
                      onClick={() => startCamera(cameraFacing)}
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

            {/* Quick Test Demo Simulator & Scanner Controls */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isCameraActive && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={stopCamera}
                      className="text-xs font-bold"
                    >
                      Stop Camera
                    </Button>
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
                  <input
                    type="text"
                    placeholder="Scan badge with USB reader or type Admission No..."
                    value={usbInput}
                    onChange={(e) => setUsbInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <Button variant="secondary" size="sm" type="submit">
                    Check In
                  </Button>
                </form>
              </div>

              {/* Instant Test Learner Verification Picker */}
              <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Test QR Verification:
                </span>
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <select
                    value={testStudentId}
                    onChange={(e) => setTestStudentId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  >
                    <option value="">-- Choose Learner to Test --</option>
                    {(allSchoolStudents.length > 0 ? allSchoolStudents : students).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.admissionNumber}) - {s.currentClass}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!testStudentId}
                    onClick={() => handleSimulateTestScan(testStudentId)}
                    className="text-xs whitespace-nowrap bg-blue-900/40 hover:bg-blue-900/80 border-blue-700 text-blue-200"
                  >
                    Simulate Scan
                  </Button>
                </div>
              </div>

              {lastScannedStudent && (
                <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-emerald-500/60 flex items-center gap-3 animate-fadeIn shadow-lg">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Successfully Verified & Logged:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{lastScannedStudent.fullName}</h4>
                    <p className="text-xs text-slate-300">
                      {lastScannedStudent.admissionNumber} • {lastScannedStudent.currentClass}{' '}
                      {lastScannedStudent.stream} Stream • Emergency: {lastScannedStudent.parentPhone || '+254 722 000 000'}
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

              <div className="mt-4 max-h-96 overflow-y-auto space-y-2 pr-1">
                {scanFeed.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                    <Scan className="w-8 h-8 mx-auto text-slate-300" />
                    <p>No learners scanned yet today.</p>
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
              <span>Universal jsQR Optical Decoder & Firestore Gate Sync Active</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRINTABLE ID BADGE CARDS */}
      {activeTab === 'QR_CARDS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value as GradeLevel)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="East">East Stream</option>
                <option value="West">West Stream</option>
                <option value="North">North Stream</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5 text-blue-900" />}
                onClick={handleGenerateClassQrs}
                loading={generatingQrs}
              >
                Generate QR Badges
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print ID Cards
              </Button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
            {students.map((st) => {
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
                      {st.currentClass} • {st.stream} Stream
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

                  <div className="text-[9px] text-slate-400 font-mono">
                    Valid: Academic Year {school?.academicYear || '2026'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STANDARD CLASS REGISTER TABLE */}
      {activeTab === 'ROLL_CALL' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
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
                  <option value="East">East Stream</option>
                  <option value="West">West Stream</option>
                  <option value="North">North Stream</option>
                  <option value="Blue">Blue Stream</option>
                  <option value="Red">Red Stream</option>
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
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAllStatus('PRESENT')}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => setAllStatus('ABSENT')}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 transition-colors"
              >
                Mark All Absent
              </button>
              <Button
                variant="primary"
                size="sm"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSaveAttendance}
                loading={saving}
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
              <div className="p-12 text-center text-slate-400 text-xs">
                No active students enrolled in {selectedClass} ({selectedStream} Stream).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-4 font-mono">Admission No</th>
                      <th className="py-3 px-4 text-center">Roll Call Status</th>
                      <th className="py-3 px-4">Remarks / Excuse Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((st, idx) => {
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
    </div>
  );
};
export default AttendanceView;
