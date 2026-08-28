import QRCode from 'qrcode';

export interface StudentQrData {
  type: 'STUDENT_ATTENDANCE';
  schoolId: string;
  studentId: string;
  admissionNumber: string;
  fullName: string;
  classLevel: string;
}

export const generateStudentQrCode = async (data: StudentQrData): Promise<string> => {
  try {
    const payload = JSON.stringify(data);
    const url = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000', // Pure Black for maximum contrast and universal optical scanner readability
        light: '#ffffff',
      },
    });
    return url;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
};

export const parseQrAttendancePayload = (text: string): Partial<StudentQrData> & {
  assessmentNumber?: string;
  kemisNumber?: string;
  upiNumber?: string;
  nemisNumber?: string;
} | null => {
  if (!text) return null;
  const clean = text.trim();
  
  // 1. Try parsing as JSON
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') {
      if (
        parsed.studentId ||
        parsed.admissionNumber ||
        parsed.id ||
        parsed.admNo ||
        parsed.admissionNo ||
        parsed.assessmentNumber ||
        parsed.kemisNumber ||
        parsed.asn ||
        parsed.kemis ||
        parsed.upiNumber ||
        parsed.nemisNumber ||
        parsed.upi ||
        parsed.nemis
      ) {
        return {
          studentId: parsed.studentId || parsed.id,
          admissionNumber: parsed.admissionNumber || parsed.admNo || parsed.admissionNo,
          fullName: parsed.fullName || parsed.name,
          classLevel: parsed.classLevel || parsed.class,
          schoolId: parsed.schoolId,
          assessmentNumber: parsed.assessmentNumber || parsed.asn || parsed.upiNumber || parsed.upi,
          kemisNumber: parsed.kemisNumber || parsed.kemis || parsed.nemisNumber || parsed.nemis,
          upiNumber: parsed.assessmentNumber || parsed.asn || parsed.upiNumber || parsed.upi,
          nemisNumber: parsed.kemisNumber || parsed.kemis || parsed.nemisNumber || parsed.nemis,
        };
      }
    }
  } catch {
    // Not valid JSON, continue to string analysis
  }

  // 2. Check if it's a URL with parameters (e.g., https://.../student?id=std-01 or ?adm=GLC/2026/001)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const url = new URL(clean);
      const studentId = url.searchParams.get('studentId') || url.searchParams.get('id') || url.searchParams.get('sid');
      const admissionNumber =
        url.searchParams.get('admissionNumber') ||
        url.searchParams.get('adm') ||
        url.searchParams.get('admNo') ||
        url.searchParams.get('admissionNo');
      const assessmentNumber = url.searchParams.get('assessmentNumber') || url.searchParams.get('asn') || url.searchParams.get('upi') || url.searchParams.get('upiNumber');
      const kemisNumber = url.searchParams.get('kemis') || url.searchParams.get('kemisNumber') || url.searchParams.get('nemis') || url.searchParams.get('nemisNumber');
      if (studentId || admissionNumber || assessmentNumber || kemisNumber) {
        return {
          studentId: studentId || undefined,
          admissionNumber: admissionNumber || undefined,
          assessmentNumber: assessmentNumber || undefined,
          kemisNumber: kemisNumber || undefined,
          upiNumber: assessmentNumber || undefined,
          nemisNumber: kemisNumber || undefined,
        };
      }
    } catch {
      // URL parse failed
    }
  }

  // 3. Raw text string (Admission Number, Assessment Number, KEMIS, UPI, NEMIS, or Student ID)
  return {
    admissionNumber: clean,
    studentId: clean,
    assessmentNumber: clean,
    kemisNumber: clean,
    upiNumber: clean,
    nemisNumber: clean,
  };
};
