import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { School, SchoolLevelConfig, WebsiteContent } from '../types';
import { cleanForFirestore } from '../utils/firestoreHelper';

export const DEFAULT_LEVELS: SchoolLevelConfig[] = [
  { id: 'lvl-pg', name: 'Playgroup', category: 'Early Years', ageRange: '2 - 3 Yrs', order: 1 },
  { id: 'lvl-pp1', name: 'PP1', category: 'Early Years', ageRange: '4 Yrs', order: 2 },
  { id: 'lvl-pp2', name: 'PP2', category: 'Early Years', ageRange: '5 Yrs', order: 3 },
  { id: 'lvl-g1', name: 'Grade 1', category: 'Lower Primary', ageRange: '6 Yrs', order: 4 },
  { id: 'lvl-g2', name: 'Grade 2', category: 'Lower Primary', ageRange: '7 Yrs', order: 5 },
  { id: 'lvl-g3', name: 'Grade 3', category: 'Lower Primary', ageRange: '8 Yrs', order: 6 },
  { id: 'lvl-g4', name: 'Grade 4', category: 'Upper Primary', ageRange: '9 Yrs', order: 7 },
  { id: 'lvl-g5', name: 'Grade 5', category: 'Upper Primary', ageRange: '10 Yrs', order: 8 },
  { id: 'lvl-g6', name: 'Grade 6', category: 'Upper Primary', ageRange: '11 Yrs', order: 9 },
  { id: 'lvl-g7', name: 'Grade 7', category: 'Junior School', ageRange: '12 Yrs', order: 10 },
  { id: 'lvl-g8', name: 'Grade 8', category: 'Junior School', ageRange: '13 Yrs', order: 11 },
  { id: 'lvl-g9', name: 'Grade 9', category: 'Junior School', ageRange: '14 Yrs', order: 12 },
];

export const DEFAULT_SCHOOL_ID = 'gracia-learning-centre';

export const DEFAULT_SCHOOL: School = {
  id: DEFAULT_SCHOOL_ID,
  name: 'Gracia Learning Centre',
  code: 'GLC',
  motto: 'Nurturing Potential, Inspiring Excellence',
  address: 'Kasarani Mwiki, Nairobi, Kenya',
  county: 'Nairobi',
  phone: '+254 722 000 123',
  email: 'admissions@gracialearningcentre.ac.ke',
  website: 'https://gracialearningcentre.ac.ke',
  currency: 'KES',
  currencySymbol: 'KSh',
  academicYear: '2026',
  currentTerm: 'Term 1',
  status: 'ACTIVE',
  levels: DEFAULT_LEVELS,
  primaryColor: '#1e3a8a', // Deep royal navy
  accentColor: '#059669', // Emerald green
  logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=200&q=80',
  termDates: {
    term1Start: '2026-01-05',
    term1End: '2026-04-03',
    term2Start: '2026-04-27',
    term2End: '2026-07-31',
    term3Start: '2026-08-24',
    term3End: '2026-10-30',
  },
  paymentSettings: {
    mpesaPaybill: '522123',
    mpesaAccountNumber: 'GLC-STUDENT-ADM',
    mpesaTill: '982341',
    bankName: 'Equity Bank Kenya',
    bankAccountName: 'Gracia Learning Centre Collection A/C',
    bankAccountNumber: '0180293847192',
    bankBranch: 'Kasarani Branch',
    invoiceDueDays: 14,
    taxRegistrationNumber: 'P051829304M',
  },
  cbcGradingSettings: {
    eeMinScore: 80,
    meMinScore: 50,
    aeMinScore: 30,
    beMinScore: 0,
    eeRemark: 'Exceeding Expectations - Outstanding Mastery & Innovation',
    meRemark: 'Meeting Expectations - Proficient in Key Competencies',
    aeRemark: 'Approaching Expectations - Developing Competence, Needs Practice',
    beRemark: 'Below Expectations - Requires Targeted Teacher Support',
  },
  systemPreferences: {
    enableSmsAlerts: true,
    enableEmailAlerts: true,
    smsSenderId: 'GRACIA-LC',
    autoFeeReminderDays: 7,
    allowOnlineAdmissions: true,
    enableDailyAttendanceSms: true,
    allowParentReportCardDownload: true,
    inactivityTimeoutMinutes: 5,
    enableGoogleAuth: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  id: 'cms-main',
  schoolId: DEFAULT_SCHOOL_ID,
  heroTitle: 'Inspiring Young Minds, Building Future Leaders',
  heroSubtitle: 'A Premier Kenyan Primary & Junior School in Kasarani Mwiki, Nairobi from Playgroup to Grade 9, excelling in CBC Competency Curriculum, Holistic Talent, Coding & Character.',
  heroBannerUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
  logoUrl: '',
  heroOverlayOpacity: 20,
  heroOverlayStyle: 'clear-glass',
  heroSlides: [
    {
      id: 'slide-1',
      title: 'Inspiring Young Minds, Building Future Leaders',
      subtitle: 'A Premier Kenyan Primary & Junior School in Kasarani Mwiki, Nairobi from Playgroup to Grade 9, excelling in CBC Competency Curriculum, Holistic Talent, Coding & Character.',
      imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
      badgeText: 'Leading CBC Competency-Based Education in Kasarani Mwiki',
      buttonText: 'Enroll Your Child (2026 Intake)',
      buttonLink: 'admission',
      order: 1,
      isActive: true,
      overlayOpacity: 20,
    },
    {
      id: 'slide-2',
      title: 'State-of-the-Art Science Labs & Coding Studios',
      subtitle: 'Hands-on experiential learning where young scientists and tech innovators build robotics, automated agriculture, and digital solutions.',
      imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=80',
      badgeText: 'Junior School STEAM & Robotics Hub',
      buttonText: 'Explore Facilities & Labs',
      buttonLink: 'facilities',
      order: 2,
      isActive: true,
      overlayOpacity: 20,
    },
    {
      id: 'slide-3',
      title: 'Nurturing Talent in Arts, Music & Olympic Swimming',
      subtitle: 'Dedicated coaches and certified music tutors developing champion athletes, ballet performers, and musical virtuosos.',
      imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1600&q=80',
      badgeText: 'Holistic Co-Curricular & Sports Excellence',
      buttonText: 'View Co-Curricular Programs',
      buttonLink: 'gallery',
      order: 3,
      isActive: true,
      overlayOpacity: 20,
    },
  ],
  typography: {
    heroTitle: {
      fontSize: '5xl',
      fontWeight: 'black',
      fontStyle: 'normal',
      textAlign: 'left',
      fontFamily: 'sans',
      textColor: '#ffffff',
    },
    heroSubtitle: {
      fontSize: 'lg',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      fontFamily: 'sans',
      textColor: '#cbd5e1',
    },
    heroBadge: {
      fontSize: 'sm',
      fontWeight: 'semibold',
      fontStyle: 'normal',
      textAlign: 'left',
      textColor: '#93c5fd',
    },
  },
  aboutIntro: 'Founded with a dedication to academic excellence and moral grounding, Gracia Learning Centre provides an inspiring and supportive environment in Kasarani Mwiki, Nairobi where every learner from Early Years (Playgroup) through Junior School (Grade 9) thrives through personalized attention, practical CBC science and ICT labs, creative arts, and sports.',
  mission: 'To provide a stimulating, inclusive, and values-centered educational experience that empowers every learner with 21st-century CBC competencies, curiosity, moral integrity, and leadership.',
  vision: 'To be the leading model institution in Nairobi and Kenya for transformative competency-based basic education and youth character development.',
  coreValues: ['Integrity & Discipline', 'Academic Excellence', 'Innovation & Inquiry', 'Empathy & Inclusivity', 'Environmental Stewardship'],
  principalMessage: 'Welcome to Gracia Learning Centre, Kasarani Mwiki. Our commitment is simple yet profound: nurturing the unique potential of every child. With our dedicated TSC-certified faculty, modern CBC learning resources, and rich co-curricular programs, we prepare our learners not just for examinations, but for life.',
  principalName: 'Mr. David M. Mwangi, M.Ed',
  principalPhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
  stats: {
    studentsCount: 680,
    teachersCount: 42,
    graduatesCount: 1450,
    yearsOfExcellence: 18,
  },
  facilities: [
    {
      title: 'Modern CBC Science & Discovery Labs',
      description: 'Equipped Integrated Science, Agriculture, and Digital workstations with hands-on apparatus for practical investigations.',
      imageUrl: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Sports Field & Athletics Grounds',
      description: 'Spacious playing grounds for football, athletics, volleyball, netball, and early childhood motor skills development.',
      imageUrl: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'CBC Library & Digital Learning Pods',
      description: 'Curated curriculum readers, reference books, digital audiobooks, and quiet study stations for junior school learners.',
      imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Creative Arts, Music & Performance Room',
      description: 'Traditional percussion, keyboards, drama props, and art materials supporting holistic talent and cultural showcase.',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    },
  ],
  newsPosts: [
    {
      id: 'news-01',
      title: 'Gracia Learning Centre Ranked Top in Regional CBC Science and Talent Fair',
      date: '2026-02-10',
      summary: 'Our Junior School learners clinched 1st position with their innovative agricultural smart irrigation project.',
      content: 'The adjudicators praised our learners for their poise, scientific reasoning, and practical application of CBC learning outcomes.',
      imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'news-02',
      title: 'Admissions Open for Playgroup to Grade 9 for Academic Year 2026',
      date: '2026-01-15',
      summary: 'Limited vacancies available across Early Years, Primary, and Junior School. Apply online today.',
      content: 'Prospective parents are invited for personalized school visits and learner assessments every weekday.',
      imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80',
    },
  ],
  gallery: [
    { id: 'gal-01', caption: 'Early Years Playgroup Outdoor Learning', category: 'Early Years', imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
    { id: 'gal-02', caption: 'Grade 6 Practical Science Experiments', category: 'Academics', imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80' },
    { id: 'gal-03', caption: 'Inter-House Athletics and Sports Competitions', category: 'Sports', imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80' },
    { id: 'gal-04', caption: 'Music Recital and Cultural Festival', category: 'Arts', imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80' },
  ],
  faqs: [
    {
      question: 'What curriculum does Gracia Learning Centre offer?',
      answer: 'We offer the official Kenya Competency-Based Curriculum (CBC) from Playgroup (Early Childhood) through Grade 9 (Junior Secondary School).',
    },
    {
      question: 'How do you handle Junior School (Grades 7, 8, and 9)?',
      answer: 'Our Junior Secondary School offers dedicated teachers, fully equipped science apparatus, computer labs, home science, and career pathway mentoring.',
    },
    {
      question: 'Are school transport and hot meals provided?',
      answer: 'Yes, we provide reliable and secure school transport routes covering Kasarani, Mwiki, Sunton, Hunters, Clay City, and surrounding estates, as well as fresh, chef-prepared hot lunch and mid-morning snacks.',
    },
    {
      question: 'How do parents monitor their child\'s progress?',
      answer: 'Parents receive dedicated Parent Portal credentials where you can track live attendance roll-call, view term invoices and pay via Lipa na M-Pesa, view CBC rubric evaluations, and download termly report cards.',
    },
  ],
  announcementTag: '2026 INTAKE',
  announcementText: 'Admissions Open for Playgroup to Grade 9 (Junior School) • CBC Competency Curriculum',
  contactPhone: '+254 722 000 123',
  contactEmail: 'admissions@gracialearningcentre.ac.ke',
  contactAddress: 'Kasarani Mwiki, Nairobi, Kenya',
  mpesaPaybill: '522522',
  bankDetails: 'Equity Bank Kenya • Kasarani Branch • Acc: 0180293847192',
  updatedAt: new Date().toISOString(),
};

export const schoolService = {
  async getSchool(schoolId: string = DEFAULT_SCHOOL_ID): Promise<School | null> {
    try {
      const docRef = doc(db, 'schools', schoolId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as School;
        try {
          localStorage.setItem(`school_${schoolId}`, JSON.stringify(data));
        } catch {
          // ignore storage error
        }
        return data;
      }
      // Check local cache
      const cached = localStorage.getItem(`school_${schoolId}`);
      if (cached) {
        return JSON.parse(cached) as School;
      }
      if (schoolId === DEFAULT_SCHOOL_ID) return DEFAULT_SCHOOL;
      return null;
    } catch (err) {
      console.error('Error fetching school from firestore:', err);
      const cached = localStorage.getItem(`school_${schoolId}`);
      if (cached) {
        return JSON.parse(cached) as School;
      }
      if (schoolId === DEFAULT_SCHOOL_ID) return DEFAULT_SCHOOL;
      return null;
    }
  },

  async getAllSchools(): Promise<School[]> {
    try {
      const snap = await getDocs(collection(db, 'schools'));
      return snap.docs.map((d) => d.data() as School);
    } catch (err) {
      console.error('Error fetching all schools:', err);
      return [];
    }
  },

  async updateSchool(schoolId: string, updates: Partial<School>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId);
    const cleanedUpdates = cleanForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    try {
      await setDoc(docRef, cleanedUpdates, { merge: true });
    } catch (err) {
      console.warn('Firestore setDoc failed for school, updating local cache:', err);
    }

    try {
      const existing = localStorage.getItem(`school_${schoolId}`);
      const prev = existing ? JSON.parse(existing) : DEFAULT_SCHOOL;
      const merged = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(`school_${schoolId}`, JSON.stringify(merged));
      
      // Dispatch live update event so AuthContext and all components update immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('school_data_updated', { detail: merged }));
      }
    } catch (e) {
      console.warn('Local storage update failed for school:', e);
    }
  },

  async createSchool(school: School): Promise<void> {
    const docRef = doc(db, 'schools', school.id);
    await setDoc(docRef, school);
  },

  async ensureDefaultSchool(): Promise<School> {
    const existing = await this.getSchool(DEFAULT_SCHOOL_ID);
    if (existing) return existing;
    await this.createSchool(DEFAULT_SCHOOL);
    return DEFAULT_SCHOOL;
  },

  async seedRealisticSchoolData(schoolId: string = DEFAULT_SCHOOL_ID): Promise<void> {
    const now = new Date().toISOString();

    // 1. Ensure School Document
    await setDoc(doc(db, 'schools', schoolId), {
      ...DEFAULT_SCHOOL,
      id: schoolId,
      updatedAt: now,
    });

    // 2. Classes & Streams
    const classes = [
      { id: 'cls-pg', name: 'Playgroup', level: 'Playgroup', streams: ['Sunflowers', 'Butterflies'], capacity: 25 },
      { id: 'cls-pp1', name: 'PP1', level: 'PP1', streams: ['Red', 'Blue'], capacity: 30 },
      { id: 'cls-pp2', name: 'PP2', level: 'PP2', streams: ['Stars', 'Diamonds'], capacity: 30 },
      { id: 'cls-g1', name: 'Grade 1', level: 'Grade 1', streams: ['East', 'West'], capacity: 35 },
      { id: 'cls-g2', name: 'Grade 2', level: 'Grade 2', streams: ['East', 'West'], capacity: 35 },
      { id: 'cls-g3', name: 'Grade 3', level: 'Grade 3', streams: ['East', 'West'], capacity: 35 },
      { id: 'cls-g4', name: 'Grade 4', level: 'Grade 4', streams: ['East', 'West', 'North'], capacity: 35 },
      { id: 'cls-g5', name: 'Grade 5', level: 'Grade 5', streams: ['East', 'West'], capacity: 35 },
      { id: 'cls-g6', name: 'Grade 6', level: 'Grade 6', streams: ['East', 'West', 'Central'], capacity: 35 },
      { id: 'cls-g7', name: 'Grade 7', level: 'Grade 7', streams: ['Alpha', 'Beta'], capacity: 40 },
      { id: 'cls-g8', name: 'Grade 8', level: 'Grade 8', streams: ['Alpha', 'Beta'], capacity: 40 },
      { id: 'cls-g9', name: 'Grade 9', level: 'Grade 9', streams: ['Alpha', 'Beta'], capacity: 40 },
    ];

    for (const c of classes) {
      await setDoc(doc(db, 'schools', schoolId, 'classes', c.id), {
        ...c,
        schoolId,
        createdAt: now,
      });
    }

    // 3. CBC Learning Areas / Subjects
    const subjects = [
      { id: 'sb-math', code: 'MATH', name: 'Mathematics', category: 'CBC Core', levels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-eng', code: 'ENG', name: 'English Language', category: 'CBC Core', levels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-kisw', code: 'KISW', name: 'Kiswahili / KSL', category: 'CBC Core', levels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-sci', code: 'INT-SCI', name: 'Integrated Science & Tech', category: 'CBC Core', levels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-agr', code: 'AGR-NUT', name: 'Agriculture & Nutrition', category: 'CBC Core', levels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-cre', code: 'CRE', name: 'Christian Religious Education', category: 'CBC Core', levels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-arts', code: 'CRT-ARTS', name: 'Creative Arts & Sports', category: 'CBC Core', levels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-soc', code: 'SOC-ST', name: 'Social Studies & Citizenship', category: 'CBC Core', levels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sb-pre-lang', code: 'EY-LANG', name: 'Language Activities', category: 'Pre-Primary Area', levels: ['Playgroup', 'PP1', 'PP2'] },
      { id: 'sb-pre-math', code: 'EY-MATH', name: 'Mathematical Activities', category: 'Pre-Primary Area', levels: ['Playgroup', 'PP1', 'PP2'] },
      { id: 'sb-pre-env', code: 'EY-ENV', name: 'Environmental Activities', category: 'Pre-Primary Area', levels: ['Playgroup', 'PP1', 'PP2'] },
    ];

    for (const s of subjects) {
      await setDoc(doc(db, 'schools', schoolId, 'subjects', s.id), {
        ...s,
        schoolId,
      });
    }

    // 4. Staff / Teachers
    const staffList = [
      {
        id: 'stf-01',
        staffId: 'GLC-T-01',
        tscNumber: 'TSC/748291',
        fullName: 'Grace Wanjiku Mwangi',
        email: 'grace.mwangi@gracialearningcentre.ac.ke',
        phone: '+254 722 111 222',
        gender: 'FEMALE',
        role: 'HEADTEACHER',
        department: 'Administration',
        designation: 'Principal & Headteacher',
        assignedClasses: ['Grade 6 East', 'Grade 9 Alpha'],
        assignedSubjects: ['Social Studies & Citizenship'],
        joinDate: '2020-01-06',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'stf-02',
        staffId: 'GLC-T-02',
        tscNumber: 'TSC/892019',
        fullName: 'David Ochieng Otieno',
        email: 'david.otieno@gracialearningcentre.ac.ke',
        phone: '+254 733 222 333',
        gender: 'MALE',
        role: 'DEPUTY_HEADTEACHER',
        department: 'Sciences',
        designation: 'Deputy Headteacher (Academics)',
        assignedClasses: ['Grade 6 East', 'Grade 7 Alpha', 'Grade 8 Alpha'],
        assignedSubjects: ['Integrated Science & Tech', 'Mathematics'],
        joinDate: '2021-05-12',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'stf-03',
        staffId: 'GLC-T-03',
        tscNumber: 'TSC/910283',
        fullName: 'Faith Chebet Korir',
        email: 'faith.chebet@gracialearningcentre.ac.ke',
        phone: '+254 711 444 555',
        gender: 'FEMALE',
        role: 'TEACHER',
        department: 'Languages',
        designation: 'Senior Teacher & CBC Lead',
        assignedClasses: ['Grade 4 East', 'Grade 5 East', 'Grade 6 East'],
        assignedSubjects: ['English Language', 'Creative Arts & Sports'],
        joinDate: '2022-01-10',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'stf-04',
        staffId: 'GLC-T-04',
        tscNumber: 'TSC/638192',
        fullName: 'Peter Ndung\'u Kariuki',
        email: 'peter.kariuki@gracialearningcentre.ac.ke',
        phone: '+254 720 555 666',
        gender: 'MALE',
        role: 'TEACHER',
        department: 'Mathematics',
        designation: 'Class Teacher Grade 6 East',
        assignedClasses: ['Grade 6 East', 'Grade 6 West'],
        assignedSubjects: ['Mathematics', 'Agriculture & Nutrition'],
        joinDate: '2023-01-09',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'stf-05',
        staffId: 'GLC-A-01',
        fullName: 'Sarah Amina Hassan',
        email: 'sarah.hassan@gracialearningcentre.ac.ke',
        phone: '+254 724 666 777',
        gender: 'FEMALE',
        role: 'ACCOUNTANT',
        department: 'Administration',
        designation: 'Senior Bursar & Finance Manager',
        joinDate: '2020-08-15',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'stf-06',
        staffId: 'GLC-P-01',
        fullName: 'John Mutua Kilonzo',
        email: 'pos@gracialearningcentre.ac.ke',
        phone: '+254 718 777 888',
        gender: 'MALE',
        role: 'CASHIER',
        department: 'Operations',
        designation: 'Uniform & Stationery Store Cashier',
        joinDate: '2022-03-01',
        status: 'ACTIVE',
        createdAt: now,
      },
    ];

    for (const st of staffList) {
      await setDoc(doc(db, 'schools', schoolId, 'staff', st.id), {
        ...st,
        schoolId,
      });
    }

    // 5. Parents
    const parents = [
      {
        id: 'par-01',
        schoolId,
        fullName: 'Dr. Joseph Kamau Njoroge',
        email: 'joseph.kamau@gmail.com',
        phone: '+254 722 345 678',
        idNumber: '24918231',
        occupation: 'Medical Doctor',
        address: 'Kasarani Mwiki, Nairobi',
        childrenIds: ['std-01', 'std-02'],
        createdAt: now,
      },
      {
        id: 'par-02',
        schoolId,
        fullName: 'Mercy Akinyi Omondi',
        email: 'mercy.omondi@kenyaairways.com',
        phone: '+254 733 987 654',
        idNumber: '28192019',
        occupation: 'Aviation Logistics Manager',
        address: 'Sunton Estate, Kasarani',
        childrenIds: ['std-03'],
        createdAt: now,
      },
      {
        id: 'par-03',
        schoolId,
        fullName: 'Eng. Dennis Kipchumba Rono',
        email: 'dennis.rono@geothermal.co.ke',
        phone: '+254 712 555 999',
        idNumber: '31092812',
        occupation: 'Civil Engineer',
        address: 'Hunters Phase 2, Kasarani Mwiki',
        childrenIds: ['std-04'],
        createdAt: now,
      },
    ];

    for (const p of parents) {
      await setDoc(doc(db, 'schools', schoolId, 'parents', p.id), p);
    }

    // 6. Students across different classes
    const students = [
      {
        id: 'std-01',
        schoolId,
        admissionNumber: 'GLC/2026/001',
        upiNumber: 'UPI-9201928',
        nemisNumber: 'NEMIS-2026-001',
        firstName: 'Brian',
        middleName: 'Mwangi',
        lastName: 'Kamau',
        fullName: 'Brian Mwangi Kamau',
        gender: 'MALE',
        dateOfBirth: '2014-04-12',
        birthCertNumber: 'BC-9201928',
        nationality: 'Kenyan',
        religion: 'Christian',
        admissionDate: '2026-01-05',
        currentClass: 'Grade 6',
        stream: 'East',
        status: 'ACTIVE',
        previousSchool: 'Kasarani Primary School',
        residentialAddress: 'Kasarani Mwiki, Nairobi',
        parentId: 'par-01',
        parentName: 'Dr. Joseph Kamau Njoroge',
        parentPhone: '+254 722 345 678',
        parentEmail: 'joseph.kamau@gmail.com',
        parentRelationship: 'Father',
        emergencyContact: 'Mary Kamau (Mother)',
        emergencyPhone: '+254 721 999 111',
        bloodGroup: 'O+',
        allergies: 'Peanuts',
        isBoarder: false,
        transportRouteId: 'rt-01',
        transportRouteName: 'Route 1: Kasarani - Sunton - Mwiki',
        totalBalance: 12500,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'std-02',
        schoolId,
        admissionNumber: 'GLC/2026/002',
        upiNumber: 'UPI-1102938',
        nemisNumber: 'NEMIS-2026-002',
        firstName: 'Jane',
        middleName: 'Wambui',
        lastName: 'Kamau',
        fullName: 'Jane Wambui Kamau',
        gender: 'FEMALE',
        dateOfBirth: '2020-08-19',
        birthCertNumber: 'BC-1102938',
        nationality: 'Kenyan',
        religion: 'Christian',
        admissionDate: '2026-01-05',
        currentClass: 'PP2',
        stream: 'Stars',
        status: 'ACTIVE',
        residentialAddress: 'Kasarani Mwiki, Nairobi',
        parentId: 'par-01',
        parentName: 'Dr. Joseph Kamau Njoroge',
        parentPhone: '+254 722 345 678',
        parentEmail: 'joseph.kamau@gmail.com',
        parentRelationship: 'Father',
        bloodGroup: 'O+',
        isBoarder: false,
        totalBalance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'std-03',
        schoolId,
        admissionNumber: 'GLC/2026/003',
        upiNumber: 'UPI-8839201',
        nemisNumber: 'NEMIS-2026-003',
        firstName: 'Trevor',
        middleName: 'Otieno',
        lastName: 'Omondi',
        fullName: 'Trevor Otieno Omondi',
        gender: 'MALE',
        dateOfBirth: '2013-11-03',
        birthCertNumber: 'BC-8839201',
        nationality: 'Kenyan',
        religion: 'Christian',
        admissionDate: '2026-01-05',
        currentClass: 'Grade 7',
        stream: 'Alpha',
        status: 'ACTIVE',
        residentialAddress: 'Sunton Estate, Kasarani',
        parentId: 'par-02',
        parentName: 'Mercy Akinyi Omondi',
        parentPhone: '+254 733 987 654',
        parentEmail: 'mercy.omondi@kenyaairways.com',
        parentRelationship: 'Mother',
        bloodGroup: 'A+',
        specialNeeds: 'Wears corrective eyeglasses',
        isBoarder: false,
        totalBalance: 24000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'std-04',
        schoolId,
        admissionNumber: 'GLC/2026/004',
        upiNumber: 'UPI-7728192',
        nemisNumber: 'NEMIS-2026-004',
        firstName: 'Chelsea',
        middleName: 'Cherop',
        lastName: 'Rono',
        fullName: 'Chelsea Cherop Rono',
        gender: 'FEMALE',
        dateOfBirth: '2016-02-14',
        birthCertNumber: 'BC-7728192',
        nationality: 'Kenyan',
        religion: 'Christian',
        admissionDate: '2026-01-05',
        currentClass: 'Grade 4',
        stream: 'East',
        status: 'ACTIVE',
        residentialAddress: 'Hunters Phase 2, Kasarani Mwiki',
        parentId: 'par-03',
        parentName: 'Eng. Dennis Kipchumba Rono',
        parentPhone: '+254 712 555 999',
        parentEmail: 'dennis.rono@geothermal.co.ke',
        parentRelationship: 'Father',
        bloodGroup: 'B+',
        isBoarder: false,
        totalBalance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'std-05',
        schoolId,
        admissionNumber: 'GLC/2026/005',
        upiNumber: 'UPI-9948201',
        nemisNumber: 'NEMIS-2026-005',
        firstName: 'Liam',
        middleName: 'Zawadi',
        lastName: 'Mutiso',
        fullName: 'Liam Zawadi Mutiso',
        gender: 'MALE',
        dateOfBirth: '2022-05-10',
        birthCertNumber: 'BC-9948201',
        nationality: 'Kenyan',
        admissionDate: '2026-01-05',
        currentClass: 'Playgroup',
        stream: 'Sunflowers',
        status: 'ACTIVE',
        residentialAddress: 'Clay City, Kasarani Mwiki',
        parentId: 'par-01',
        parentName: 'Dr. Joseph Kamau Njoroge',
        parentPhone: '+254 722 345 678',
        parentEmail: 'joseph.kamau@gmail.com',
        parentRelationship: 'Father',
        bloodGroup: 'O+',
        isBoarder: false,
        totalBalance: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const std of students) {
      await setDoc(doc(db, 'schools', schoolId, 'students', std.id), std);
    }

    // 7. Fee Structures
    const feeStructures = [
      {
        id: 'fs-g6-2026-t1',
        schoolId,
        academicYear: '2026',
        term: 'Term 1',
        classLevel: 'Grade 6',
        items: [
          { name: 'Tuition Fee', amount: 35000 },
          { name: 'CBC Learning Materials & Tech Fee', amount: 6500 },
          { name: 'Nutritious Lunch Program', amount: 12000 },
          { name: 'Activity, Swimming & Sports', amount: 4500 },
          { name: 'Continuous Assessment & Examination', amount: 2000 },
        ],
        totalAmount: 60000,
        createdAt: now,
      },
      {
        id: 'fs-g7-2026-t1',
        schoolId,
        academicYear: '2026',
        term: 'Term 1',
        classLevel: 'Grade 7',
        items: [
          { name: 'Tuition Fee', amount: 42000 },
          { name: 'Science Lab & Practical Materials', amount: 8000 },
          { name: 'Lunch Program', amount: 12000 },
          { name: 'ICT & Robotics Program', amount: 5000 },
          { name: 'Activity & Clubs', amount: 4000 },
        ],
        totalAmount: 71000,
        createdAt: now,
      },
    ];

    for (const fs of feeStructures) {
      await setDoc(doc(db, 'schools', schoolId, 'feeStructures', fs.id), fs);
    }

    // 8. Invoices and Payments for Brian Kamau
    const invoiceBrian = {
      id: 'inv-2026-001',
      invoiceNumber: 'INV/2026/001',
      schoolId,
      studentId: 'std-01',
      studentName: 'Brian Mwangi Kamau',
      admissionNumber: 'GLCM/2026/001',
      classLevel: 'Grade 6',
      stream: 'East',
      academicYear: '2026',
      term: 'Term 1',
      items: [
        { description: 'Term 1 Tuition Fee', amount: 35000 },
        { description: 'CBC Learning Materials', amount: 6500 },
        { description: 'Lunch Program (Term 1)', amount: 12000 },
        { description: 'Activity & Swimming', amount: 4500 },
        { description: 'Assessment Fee', amount: 2000 },
      ],
      totalAmount: 60000,
      paidAmount: 47500,
      balance: 12500,
      dueDate: '2026-02-15',
      status: 'PARTIALLY_PAID',
      createdAt: '2026-01-05T08:00:00.000Z',
    };
    await setDoc(doc(db, 'schools', schoolId, 'invoices', invoiceBrian.id), invoiceBrian);

    const paymentBrian = {
      id: 'pay-2026-001',
      receiptNumber: 'REC/2026/0049',
      schoolId,
      invoiceId: 'inv-2026-001',
      studentId: 'std-01',
      studentName: 'Brian Mwangi Kamau',
      admissionNumber: 'GLCM/2026/001',
      parentName: 'Dr. Joseph Kamau Njoroge',
      parentPhone: '+254 722 345 678',
      amount: 47500,
      paymentDate: '2026-01-08',
      paymentMethod: 'MPESA',
      transactionReference: 'QK78923KLJ',
      cashierName: 'Sarah Amina Hassan',
      cashierId: 'stf-05',
      notes: 'Term 1 partial school fees paid via Lipa na M-Pesa Till',
      createdAt: '2026-01-08T10:14:20.000Z',
    };
    await setDoc(doc(db, 'schools', schoolId, 'payments', paymentBrian.id), paymentBrian);

    // 9. Assessments & CBC Results
    const assessmentMidTerm = {
      id: 'ass-2026-t1-mid',
      schoolId,
      title: 'Term 1 CBC Mid-Term Evaluation',
      type: 'MID_TERM',
      academicYear: '2026',
      term: 'Term 1',
      classLevel: 'Grade 6',
      stream: 'East',
      subjectId: 'sb-math',
      subjectName: 'Mathematics',
      maxScore: 100,
      date: '2026-02-18',
      status: 'PUBLISHED',
      createdAt: now,
    };
    await setDoc(doc(db, 'schools', schoolId, 'assessments', assessmentMidTerm.id), assessmentMidTerm);

    const resultBrianMath = {
      id: 'res-brian-math',
      assessmentId: 'ass-2026-t1-mid',
      schoolId,
      studentId: 'std-01',
      studentName: 'Brian Mwangi Kamau',
      admissionNumber: 'GLCM/2026/001',
      classLevel: 'Grade 6',
      stream: 'East',
      subjectName: 'Mathematics',
      score: 86,
      maxScore: 100,
      percentage: 86,
      grade: 'A',
      cbcRating: 'EE', // Exceeding Expectations
      strandFeedback: [
        { strand: 'Numbers & Operations', rating: 'EE', comment: 'Exceptional speed in prime factorization and decimals' },
        { strand: 'Algebra & Patterns', rating: 'ME', comment: 'Meets expectations in forming linear equations' },
        { strand: 'Measurement & Geometry', rating: 'EE', comment: 'Accurate angle calculation and perimeter synthesis' },
      ],
      teacherComment: 'Brian demonstrates deep mathematical reasoning and helps peers in group work.',
      updatedAt: now,
    };
    await setDoc(doc(db, 'schools', schoolId, 'results', resultBrianMath.id), resultBrianMath);

    // 10. POS & Inventory
    const posProducts = [
      {
        id: 'prod-01',
        schoolId,
        sku: 'UNIF-SWTR-30',
        barcode: '616110029301',
        name: 'School Knit Sweater (Size 30) - Navy/Emerald',
        category: 'Uniform',
        sellingPrice: 1800,
        costPrice: 1200,
        currentStock: 45,
        lowStockThreshold: 10,
        unit: 'pcs',
        createdAt: now,
      },
      {
        id: 'prod-02',
        schoolId,
        sku: 'BK-CBC-G6-MATH',
        barcode: '978996612345',
        name: 'CBC Grade 6 Mathematics Learner\'s Workbook (KLB)',
        category: 'Books',
        sellingPrice: 750,
        costPrice: 550,
        currentStock: 62,
        lowStockThreshold: 15,
        unit: 'pcs',
        createdAt: now,
      },
      {
        id: 'prod-03',
        schoolId,
        sku: 'STAT-EXB-200',
        barcode: '616220038472',
        name: 'A4 Ruled Exercise Book (200 Pages - Gracia Learning Centre Crest)',
        category: 'Stationery',
        sellingPrice: 160,
        costPrice: 110,
        currentStock: 180,
        lowStockThreshold: 30,
        unit: 'pcs',
        createdAt: now,
      },
      {
        id: 'prod-04',
        schoolId,
        sku: 'SPRT-PE-G6',
        barcode: '616440019283',
        name: 'Complete PE Sports Kit & Tracksuit (Medium)',
        category: 'Sports Gear',
        sellingPrice: 2600,
        costPrice: 1900,
        currentStock: 8,
        lowStockThreshold: 12,
        unit: 'sets',
        createdAt: now,
      },
    ];

    for (const pr of posProducts) {
      await setDoc(doc(db, 'schools', schoolId, 'products', pr.id), pr);
    }

    // 11. Library Books
    const libraryBooks = [
      {
        id: 'lib-01',
        schoolId,
        isbn: '978-9966-25-102-1',
        title: 'The River and the Source',
        author: 'Margaret A. Ogola',
        publisher: 'Focus Publishers',
        category: 'Novel',
        classLevel: 'Grade 8',
        totalCopies: 25,
        availableCopies: 21,
        shelfLocation: 'Literature Shelf A-2',
        createdAt: now,
      },
      {
        id: 'lib-02',
        schoolId,
        isbn: '978-9966-46-880-9',
        title: 'Spotlight CBC Integrated Science Grade 6',
        author: 'E. Barasa & J. Ouma',
        publisher: 'Spotlight Publishers',
        category: 'CBC Textbook',
        classLevel: 'Grade 6',
        totalCopies: 40,
        availableCopies: 38,
        shelfLocation: 'Science Bay 4',
        createdAt: now,
      },
    ];

    for (const b of libraryBooks) {
      await setDoc(doc(db, 'schools', schoolId, 'libraryBooks', b.id), b);
    }

    // 12. Transport Routes
    const routes = [
      {
        id: 'rt-01',
        schoolId,
        routeName: 'Route 1: Kasarani - Sunton - Mwiki',
        vehicleNumber: 'KBZ 842X (Isuzu 33-Seater)',
        driverName: 'Mr. Moses Ndung\'u',
        driverPhone: '+254 722 888 999',
        vehicleCapacity: 33,
        stops: [
          { name: 'Kasarani Seasons Stage', pickupTime: '06:45 AM', dropoffTime: '04:15 PM', fareTerm: 6000 },
          { name: 'Sunton Stage', pickupTime: '07:05 AM', dropoffTime: '04:30 PM', fareTerm: 7000 },
          { name: 'Mwiki Police Post Stage', pickupTime: '07:20 AM', dropoffTime: '04:45 PM', fareTerm: 8000 },
        ],
        activeStudentsCount: 26,
      },
      {
        id: 'rt-02',
        schoolId,
        routeName: 'Route 2: Hunters - Clay City - School Gate',
        vehicleNumber: 'KDA 319M (Toyota Coaster 29-Seater)',
        driverName: 'Mr. Hassan Juma',
        driverPhone: '+254 733 444 111',
        vehicleCapacity: 29,
        stops: [
          { name: 'Hunters Phase 1 Stage', pickupTime: '06:50 AM', dropoffTime: '04:10 PM', fareTerm: 6000 },
          { name: 'Clay Works / Clay City', pickupTime: '07:10 AM', dropoffTime: '04:25 PM', fareTerm: 6500 },
          { name: 'School Main Gate, Mwiki', pickupTime: '07:25 AM', dropoffTime: '04:40 PM', fareTerm: 7000 },
        ],
        activeStudentsCount: 22,
      },
    ];

    for (const r of routes) {
      await setDoc(doc(db, 'schools', schoolId, 'routes', r.id), r);
    }

    // 13. Events and Announcements
    const announcements = [
      {
        id: 'ann-01',
        schoolId,
        title: 'CBC Junior School STEM & Robotics Fair 2026',
        content: 'We are pleased to invite all Grade 4 through Grade 9 parents to our annual STEM & Innovation Showcase on Friday, March 27th. Learners will present their functional agriculture, solar tech, and software projects.',
        priority: 'HIGH',
        targetRoles: ['PARENT', 'TEACHER', 'STUDENT'],
        publishedBy: 'Grace Wanjiku Mwangi (Headteacher)',
        isPublicOnWebsite: true,
        createdAt: now,
      },
      {
        id: 'ann-02',
        schoolId,
        title: 'Mid-Term Break & Parent-Teacher Consultations',
        content: 'Mid-term break begins on Wednesday, February 25th at 1:00 PM. Parent consultation meetings will take place virtually and in person across respective classrooms on Thursday.',
        priority: 'MEDIUM',
        targetRoles: ['PARENT', 'TEACHER'],
        publishedBy: 'David Ochieng Otieno (Deputy Headteacher)',
        isPublicOnWebsite: true,
        createdAt: now,
      },
    ];

    for (const a of announcements) {
      await setDoc(doc(db, 'schools', schoolId, 'announcements', a.id), a);
    }

    // 14. Website CMS Content
    const websiteContent: WebsiteContent = {
      id: 'cms-main',
      schoolId,
      heroTitle: 'Inspiring Young Minds, Building Future Leaders',
      heroSubtitle: 'A Premier Kenyan Primary & Junior School in Kasarani Mwiki, Nairobi from Playgroup to Grade 9, excelling in CBC Competency Curriculum, Holistic Talent, Coding & Character.',
      heroBannerUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
      aboutIntro: 'Founded with a dedication to academic excellence and moral grounding, Gracia Learning Centre in Kasarani Mwiki, Nairobi provides a world-class environment where each learner from Early Years through Junior School (Grade 9) thrives through personalized attention, modern science labs, Olympic swimming, and creative arts.',
      mission: 'To provide a stimulating, inclusive, and values-centered educational experience that empowers every learner with 21st-century competencies, curiosity, and integrity.',
      vision: 'To be Nairobi\'s model institution of transformative competency-based basic education and youth character formation.',
      coreValues: ['Integrity & Discipline', 'Academic Excellence', 'Innovation & Inquiry', 'Empathy & Inclusivity', 'Environmental Stewardship'],
      principalMessage: 'Welcome to Gracia Learning Centre, Kasarani Mwiki. Our commitment is simple yet profound: nurturing the unique spark in every boy and girl. With our state-of-the-art CBC practical labs, passionate TSC-certified faculty, and rich co-curricular programs, we prepare our learners not just for examinations, but for life.',
      principalName: 'Mrs. Grace Wanjiku Mwangi, M.Ed',
      principalPhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      stats: {
        studentsCount: 680,
        teachersCount: 42,
        graduatesCount: 1450,
        yearsOfExcellence: 18,
      },
      facilities: [
        {
          title: 'Modern Science & Tech Discovery Labs',
          description: 'Fully equipped CBC Integrated Science, Robotics, and Computer laboratories with interactive smartboards and individual learner workstations.',
          imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
        },
        {
          title: 'Heated Semi-Olympic Swimming Pool',
          description: 'Supervised aquatic facility with certified lifesaving instructors, offering weekly swimming for all levels from PP1 through Grade 9.',
          imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
        },
        {
          title: 'Rich Multimedia & CBC Library',
          description: 'Over 12,000 curated titles, digital e-readers, research stations, and dedicated storytelling pods for Early Years learners.',
          imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
        },
        {
          title: 'Creative Arts & Music Auditorium',
          description: 'Acoustic musical instruments including piano, violins, brass, traditional African percussions, and ballet dance studio.',
          imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        },
      ],
      newsPosts: [
        {
          id: 'news-01',
          title: 'Gracia Learning Centre Ranked Top in County CBC Talent Gala',
          date: '2026-02-10',
          summary: 'Our Junior School choir and robotics club clinched 1st position at the Kenya National Music and Science Fair qualifiers.',
          content: 'The adjudicators praised our learners for their poise, original musical arrangements, and the automated smart greenhouse project developed by our Grade 7 & 8 agriculture club.',
          imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'news-02',
          title: 'Admissions Open for Playgroup to Grade 9 for Academic Year 2026',
          date: '2026-01-15',
          summary: 'Limited vacancies available across Early Years, Primary, and Junior School. Apply online today to secure an assessment slot.',
          content: 'Prospective parents are invited for personalized school tours every Tuesday and Thursday between 9:00 AM and 1:00 PM.',
          imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80',
        },
      ],
      gallery: [
        { id: 'gal-01', caption: 'Early Years Playgroup Outdoor Sensory Park', category: 'Early Years', imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
        { id: 'gal-02', caption: 'Grade 6 Science Practical Lab Experiments', category: 'Academics', imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80' },
        { id: 'gal-03', caption: 'Inter-House Athletics & Sports Day Competitions', category: 'Sports', imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80' },
        { id: 'gal-04', caption: 'Music & Drama Recital in the Main Auditorium', category: 'Arts', imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80' },
      ],
      faqs: [
        {
          question: 'What curriculum does Gracia Learning Centre offer?',
          answer: 'We deliver the official Kenya Competency Based Curriculum (CBC / CBE) enriched with STEAM, ICT & Coding, French, and specialized sports coaching from Playgroup through Grade 9.',
        },
        {
          question: 'How do you handle Junior School (Grades 7, 8, and 9)?',
          answer: 'Our Junior School boasts specialized science laboratories, home science & nutrition rooms, computer coding studios, and an experienced faculty with subject-matter masteries.',
        },
        {
          question: 'Are school transport and hot meals provided?',
          answer: 'Yes. We operate safe and secure school transport routes covering Kasarani, Mwiki, Sunton, Hunters, Clay City, and neighbouring communities. We also serve hot, chef-prepared balanced lunches and healthy 10 o\'clock snacks.',
        },
        {
          question: 'How do parents monitor their child\'s progress?',
          answer: 'Parents receive dedicated Parent Portal credentials where you can track live attendance roll-call, view term invoices and pay via Lipa na M-Pesa, view CBC rubric evaluations, and download termly report cards.',
        },
      ],
      updatedAt: now,
    };

    await setDoc(doc(db, 'schools', schoolId, 'websiteCMS', 'main'), websiteContent);
  },
};
