export type UserRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'HEADTEACHER'
  | 'DEPUTY_HEADTEACHER'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'LIBRARIAN'
  | 'TRANSPORT_MANAGER'
  | 'NURSE'
  | 'PARENT'
  | 'STUDENT'
  | 'STOREKEEPER'
  | 'RECEPTIONIST';

export interface UserProfile {
  id: string;
  email: string;
  username?: string; // e.g. "mwalimu.omondi", "catherine.mutua", "accounts", "admin"
  passwordHash?: string; // stored hashed password or auth token
  plainPasswordForAdmin?: string; // for admin viewing/printing login credentials slips
  fullName: string;
  phone?: string;
  role: UserRole;
  schoolId: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLogin?: string;
  mustChangePassword?: boolean;
  studentId?: string; // If student
  parentId?: string; // If parent
  staffId?: string; // If teacher/staff
}

export interface TermDatesConfig {
  term1Start?: string;
  term1End?: string;
  term2Start?: string;
  term2End?: string;
  term3Start?: string;
  term3End?: string;
}

export interface PaymentSettingsConfig {
  mpesaPaybill?: string;
  mpesaAccountNumber?: string;
  mpesaTill?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  invoiceDueDays?: number;
  taxRegistrationNumber?: string;
}

export interface CBCGradingConfig {
  eeMinScore: number; // Exceeding (80 - 100)
  meMinScore: number; // Meeting (50 - 79)
  aeMinScore: number; // Approaching (30 - 49)
  beMinScore: number; // Below (0 - 29)
  eeRemark?: string;
  meRemark?: string;
  aeRemark?: string;
  beRemark?: string;
}

export interface SystemPreferencesConfig {
  enableSmsAlerts?: boolean;
  enableEmailAlerts?: boolean;
  smsSenderId?: string;
  autoFeeReminderDays?: number;
  allowOnlineAdmissions?: boolean;
  enableDailyAttendanceSms?: boolean;
  allowParentReportCardDownload?: boolean;
  inactivityTimeoutMinutes?: number; // Minimum 5 minutes auto-logout
  enableGoogleAuth?: boolean;
}

export interface School {
  id: string;
  name: string;
  code: string;
  motto: string;
  logoUrl?: string;
  bannerUrl?: string;
  address: string;
  county?: string;
  phone: string;
  email: string;
  website?: string;
  currency: string; // e.g. 'KES'
  currencySymbol: string; // e.g. 'KSh'
  academicYear: string; // e.g. '2026'
  currentTerm: 'Term 1' | 'Term 2' | 'Term 3';
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  levels: SchoolLevelConfig[];
  primaryColor?: string;
  accentColor?: string;
  termDates?: TermDatesConfig;
  paymentSettings?: PaymentSettingsConfig;
  cbcGradingSettings?: CBCGradingConfig;
  systemPreferences?: SystemPreferencesConfig;
  subscription?: SchoolSubscriptionConfig;
  createdAt: string;
  updatedAt: string;
}

export type GradeLevel =
  | 'Playgroup'
  | 'PP1'
  | 'PP2'
  | 'Grade 1'
  | 'Grade 2'
  | 'Grade 3'
  | 'Grade 4'
  | 'Grade 5'
  | 'Grade 6'
  | 'Grade 7'
  | 'Grade 8'
  | 'Grade 9';

export interface SchoolLevelConfig {
  id: string;
  name: GradeLevel;
  category: 'Early Years' | 'Lower Primary' | 'Upper Primary' | 'Junior School';
  ageRange: string;
  order: number;
}

export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string; // e.g. "Grade 4"
  level: GradeLevel;
  streams: string[]; // e.g. ["East", "West", "North"]
  classTeacherId?: string;
  classTeacherName?: string;
  capacity?: number;
  createdAt: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  code: string; // e.g. "ENG-4", "MATH-6", "AGR-7"
  name: string; // e.g. "Mathematics", "English Language", "Integrated Science", "Creative Arts", "Agriculture"
  category: 'CBC Core' | 'CBC Optional' | 'Activity Area' | 'Pre-Primary Area';
  levels: GradeLevel[];
  strands?: string[];
}

export interface CBCStrand {
  id: string;
  subjectId: string;
  name: string;
  subStrands: string[];
  competencies: string[];
}

export type CBCRating = 'EE' | 'ME' | 'AE' | 'BE'; // Exceeding, Meeting, Approaching, Below Expectations

export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  assessmentNumber?: string; // KNEC Assessment Number (formerly UPI)
  kemisNumber?: string; // MoE KEMIS Number (formerly NEMIS)
  upiNumber?: string; // Backwards compatibility alias
  nemisNumber?: string; // Backwards compatibility alias
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  birthCertNumber?: string;
  nationality: string;
  residentialAddress?: string;
  religion?: string;
  photoUrl?: string;
  admissionDate: string;
  currentClass: GradeLevel;
  stream: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED' | 'SUSPENDED';
  previousSchool?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentRelationship?: 'Father' | 'Mother' | 'Guardian';
  emergencyContact?: string;
  emergencyPhone?: string;
  allergies?: string;
  medicalConditions?: string;
  bloodGroup?: string;
  specialNeeds?: string;
  isBoarder?: boolean;
  transportRouteId?: string;
  transportRouteName?: string;
  totalBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  schoolId: string;
  fullName: string;
  email: string;
  phone: string;
  idNumber?: string;
  occupation?: string;
  address?: string;
  childrenIds: string[];
  createdAt: string;
}

export interface Staff {
  id: string;
  schoolId: string;
  staffId: string; // e.g. "STF-014"
  tscNumber?: string; // Kenyan Teachers Service Commission Number
  fullName: string;
  email: string;
  phone: string;
  gender: 'MALE' | 'FEMALE';
  role: UserRole;
  department: 'Languages' | 'Sciences' | 'Mathematics' | 'Humanities' | 'Creative Arts' | 'Administration' | 'Operations' | 'Support';
  designation: string; // e.g. "Senior Teacher", "Head of Science", "Accountant"
  assignedClasses?: string[]; // e.g. ["Grade 6 East", "Grade 7 West"]
  assignedSubjects?: string[]; // e.g. ["Mathematics", "Science"]
  joinDate: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED' | 'SUSPENDED';
  photoUrl?: string;
  salary?: number;
  qualifications?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  date: string; // YYYY-MM-DD
  classLevel: GradeLevel;
  stream: string;
  recordedBy: string; // teacher name/ID
  timestamp: string;
  entries: {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK';
    remarks?: string;
  }[];
}

export interface Assessment {
  id: string;
  schoolId: string;
  title: string; // e.g. "Term 1 Opener CAT", "Mid-Term Assessment", "End Term CBC Evaluation"
  type: 'CAT' | 'MID_TERM' | 'END_TERM' | 'CBC_PRACTICAL' | 'PROJECT';
  academicYear: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  classLevel: GradeLevel;
  stream?: string;
  subjectId: string;
  subjectName: string;
  maxScore: number;
  date: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classLevel: GradeLevel;
  stream: string;
  subjectName: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string; // e.g. A, B+, B, C, etc.
  cbcRating: CBCRating; // EE, ME, AE, BE
  strandFeedback?: {
    strand: string;
    rating: CBCRating;
    comment: string;
  }[];
  teacherComment?: string;
  updatedAt: string;
}

export interface ReportCard {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classLevel: GradeLevel;
  stream: string;
  academicYear: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  attendanceDaysPresent: number;
  attendanceTotalDays: number;
  results: {
    subjectName: string;
    score: number;
    maxScore: number;
    percentage: number;
    grade: string;
    cbcRating: CBCRating;
    teacherComment: string;
  }[];
  totalScore: number;
  averagePercentage: number;
  rank?: number;
  totalStudents?: number;
  overallCBCRating: CBCRating;
  classTeacherComment: string;
  headTeacherComment: string;
  openingDateNextTerm?: string;
  closingDateThisTerm?: string;
  generatedAt: string;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYear: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  classLevel: GradeLevel;
  items: {
    name: string; // e.g. "Tuition Fee", "Activity & Swimming", "CBC Learning Materials", "Lunch Program", "School Transport"
    amount: number;
    isOptional?: boolean;
  }[];
  totalAmount: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-0042"
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classLevel: GradeLevel;
  stream: string;
  academicYear: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  items: {
    description: string;
    amount: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE';
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNumber: string; // e.g. "REC-88492"
  schoolId: string;
  invoiceId?: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classLevel?: GradeLevel;
  stream?: string;
  term?: 'Term 1' | 'Term 2' | 'Term 3' | string;
  academicYear?: string;
  parentName?: string;
  parentPhone?: string;
  amount: number;
  previousBalance?: number; // Fee balance before this payment
  remainingBalance?: number; // Outstanding fee balance remaining after this payment
  paymentDate: string;
  paymentMethod: 'MPESA' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'CARD';
  transactionReference: string; // e.g. "QK8492LKA" (M-Pesa code / Bank slip)
  cashierName: string;
  cashierId: string;
  notes?: string;
  createdAt: string;
}

export interface POSProduct {
  id: string;
  schoolId: string;
  sku: string;
  barcode?: string;
  name: string; // e.g. "Primary School Sweater - Size 28", "CBC Grade 4 Math Workbook", "Exercise Book A4 200pg"
  category: 'Uniform' | 'Books' | 'Stationery' | 'Food/Snack' | 'Merchandise' | 'Sports Gear';
  sellingPrice: number;
  costPrice: number;
  currentStock: number;
  lowStockThreshold: number;
  unit: string; // "pcs", "pairs", "sets"
  createdAt: string;
}

export interface POSSale {
  id: string;
  saleNumber: string; // e.g. "POS-2026-081"
  schoolId: string;
  customerType: 'STUDENT' | 'PARENT' | 'STAFF' | 'WALK_IN';
  studentId?: string;
  studentName?: string;
  customerName?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'CASH' | 'MPESA' | 'CARD';
  paymentReference?: string;
  cashierId: string;
  cashierName: string;
  createdAt: string;
}

export interface LibraryBook {
  id: string;
  schoolId: string;
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  category: 'CBC Textbook' | 'Storybook' | 'Reference' | 'Teacher Guide' | 'Novel';
  classLevel?: GradeLevel;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string; // e.g. "Shelf B-3"
  createdAt: string;
}

export interface LibraryLoan {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  borrowerType: 'STUDENT' | 'STAFF';
  borrowerId: string;
  borrowerName: string;
  admissionOrStaffNumber: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';
  fineAmount?: number;
  isFinePaid?: boolean;
}

export interface TimetableSlot {
  id: string;
  schoolId: string;
  classLevel: GradeLevel;
  stream: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periodNumber: number;
  startTime: string; // "08:20"
  endTime: string; // "09:00"
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  roomName?: string;
}

export interface TransportRoute {
  id: string;
  schoolId: string;
  routeName: string; // e.g. "Route 1: Mwiki Town - Sunton - Hunters"
  vehicleNumber: string; // e.g. "KBZ 412X"
  driverName: string;
  driverPhone: string;
  vehicleCapacity: number;
  stops: {
    name: string;
    pickupTime: string;
    dropoffTime: string;
    fareTerm: number;
  }[];
  activeStudentsCount: number;
}

export interface HealthRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  classLevel: GradeLevel;
  stream: string;
  date: string;
  incidentType: 'Routine Check' | 'First Aid' | 'Fever/Flu' | 'Injury' | 'Allergic Reaction' | 'Hospital Referral';
  symptoms: string;
  treatmentGiven: string;
  nurseOrAttendant: string;
  parentNotified: boolean;
  notes?: string;
}

export interface DisciplineIncident {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  classLevel: GradeLevel;
  stream: string;
  date: string;
  category: 'Disruptive' | 'Late Coming' | 'Uniform Violation' | 'Bullying' | 'Incomplete Homework' | 'Other';
  description: string;
  reportedBy: string;
  actionTaken: string;
  parentNotified: boolean;
  status: 'PENDING' | 'RESOLVED' | 'UNDER_REVIEW';
}

export interface SchoolEvent {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  category: 'Academic' | 'Sports' | 'Holiday' | 'Parent Meeting' | 'Trip' | 'Exam';
  targetAudience: 'All' | 'Parents' | 'Students' | 'Teachers';
  isPublicOnWebsite: boolean;
  location?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  targetRoles: UserRole[];
  publishedBy: string;
  isPublicOnWebsite: boolean;
  createdAt: string;
}

export interface AdmissionApplication {
  id: string;
  schoolId: string;
  applicationNumber: string; // e.g. "APP-2026-003"
  studentFullName: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  birthCertNumber?: string;
  assessmentOrKemis?: string; // Assessment Number or KEMIS Number
  upiOrNemis?: string; // Backwards compatibility alias
  desiredClass: GradeLevel;
  parentFullName: string;
  parentPhone: string;
  parentEmail: string;
  previousSchool?: string;
  residentialAddress: string;
  specialNeedsOrMedical?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ENROLLED';
  reviewNotes?: string;
  createdAt: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  badgeText?: string;
  buttonText?: string;
  buttonLink?: string;
  order: number;
  isActive: boolean;
  overlayOpacity?: number; // 0 to 100, e.g. 20 for clear vibrant photo
  overlayStyle?: 'clear-glass' | 'gradient-scrim' | 'vibrant' | 'minimal';
}

export interface TypographyStyle {
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: 'sans' | 'serif' | 'mono';
  textColor?: string;
}

export interface WebsiteTypographyConfig {
  heroTitle?: TypographyStyle;
  heroSubtitle?: TypographyStyle;
  heroBadge?: TypographyStyle;
  sectionHeadings?: TypographyStyle;
  body?: TypographyStyle;
}

export interface WebsiteContent {
  id: string;
  schoolId: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBannerUrl?: string;
  heroSlides?: HeroSlide[];
  heroOverlayOpacity?: number;
  heroOverlayStyle?: 'clear-glass' | 'gradient-scrim' | 'vibrant' | 'minimal';
  typography?: WebsiteTypographyConfig;
  logoUrl?: string;
  aboutIntro: string;
  mission: string;
  vision: string;
  coreValues: string[];
  principalMessage: string;
  principalName: string;
  principalPhotoUrl?: string;
  stats: {
    studentsCount: number;
    teachersCount: number;
    graduatesCount: number;
    yearsOfExcellence: number;
  };
  facilities: {
    title: string;
    description: string;
    imageUrl?: string;
  }[];
  newsPosts: {
    id: string;
    title: string;
    date: string;
    summary: string;
    content: string;
    imageUrl?: string;
  }[];
  gallery: {
    id: string;
    caption: string;
    category: string;
    imageUrl: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  announcementText?: string;
  announcementTag?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  mpesaPaybill?: string;
  bankDetails?: string;
  updatedAt: string;
}

export type PermissionKey =
  | 'STUDENTS_VIEW'
  | 'STUDENTS_MANAGE'
  | 'ADMISSIONS_MANAGE'
  | 'PARENTS_MANAGE'
  | 'STAFF_MANAGE'
  | 'ACADEMICS_MANAGE'
  | 'ASSESSMENTS_RECORD'
  | 'ASSESSMENTS_MANAGE'
  | 'REPORT_CARDS_GENERATE'
  | 'ATTENDANCE_RECORD'
  | 'ATTENDANCE_VIEW'
  | 'FEES_MANAGE'
  | 'FEES_COLLECT'
  | 'POS_CASHIER'
  | 'POS_PRODUCTS_MANAGE'
  | 'INVENTORY_MANAGE'
  | 'LIBRARY_MANAGE'
  | 'TRANSPORT_MANAGE'
  | 'HEALTH_CLINIC_MANAGE'
  | 'DISCIPLINE_MANAGE'
  | 'COMMUNICATION_MANAGE'
  | 'WEBSITE_CMS_MANAGE'
  | 'REPORTS_VIEW'
  | 'SETTINGS_MANAGE'
  | 'ROLES_PERMISSIONS_MANAGE'
  | 'SUPER_ADMIN_MANAGE';

export interface RoleDefinition {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  description: string;
  category: 'ADMINISTRATIVE' | 'ACADEMIC' | 'FINANCE' | 'OPERATIONS' | 'SUPPORT' | 'PORTAL' | 'CUSTOM';
  isSystem: boolean;
  permissions: PermissionKey[];
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  schoolId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. "CREATE_STUDENT", "RECORD_PAYMENT", "SUBMIT_CBC_ASSESSMENT"
  module: 'STUDENTS' | 'FINANCE' | 'ACADEMICS' | 'ATTENDANCE' | 'POS' | 'INVENTORY' | 'AUTH' | 'SETTINGS' | 'ROLES' | 'SUBSCRIPTION';
  details: string;
  timestamp: string;
}

// SaaS Monthly Subscription & Client Billing
export type SubscriptionStatus = 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'LOCKED' | 'TRIAL';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SubscriptionPaymentMethod = 'MPESA_STK' | 'MPESA_MANUAL' | 'BANK_TRANSFER' | 'CASH';

export interface DeveloperPayoutConfig {
  vendorName: string; // e.g. "Lead Developer / SaaS Tech Solutions"
  mpesaType: 'TILL' | 'PAYBILL' | 'PHONE';
  mpesaNumber: string; // Till / Paybill number e.g. "8829102"
  accountNumber?: string; // Account reference e.g. "SCH-GLCM"
  contactPhone: string; // e.g. "+254 700 123 456"
  contactEmail: string; // e.g. "billing@edtechsolutions.co.ke"
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface SchoolSubscriptionConfig {
  planName: string; // e.g. "CBC Pro School ERP (Monthly)"
  billingCycle: BillingCycle; // 'MONTHLY'
  monthlyAmount: number; // e.g. 7500 (KES per month)
  currency: string; // 'KES'
  currencySymbol: string; // 'KSh'
  status: SubscriptionStatus;
  startDate: string; // ISO string
  nextDueDate: string; // ISO string (e.g. 2026-09-27)
  gracePeriodDays: number; // e.g. 5 days after due date
  autoLockOnOverdue: boolean; // lock system after grace period
  licenseKey: string; // e.g. "LIC-2026-GLCM-M08-A9F21"
  payoutConfig: DeveloperPayoutConfig;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastPaymentRef?: string;
  lockedReason?: string;
}

export interface SubscriptionInvoice {
  id: string;
  schoolId: string;
  invoiceNumber: string; // e.g. "INV-SAAS-2026-08"
  billingPeriod: string; // e.g. "August 2026"
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  paymentMethod?: SubscriptionPaymentMethod;
  paymentReference?: string; // M-Pesa code e.g. "QHX829910K"
  paidAt?: string;
  notes?: string;
}

