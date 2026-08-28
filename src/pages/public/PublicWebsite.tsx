import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { operationsService } from '../../services/operationsService';
import { DEFAULT_CBC_FEE_STRUCTURES } from '../../services/feeAndPaymentService';
import { DEFAULT_WEBSITE_CONTENT, DEFAULT_SCHOOL_ID } from '../../services/schoolService';
import { WebsiteContent, GradeLevel, UserRole, HeroSlide, TypographyStyle, FeeStructure } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AuthModal } from '../../components/ui/AuthModal';
import {
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Calendar,
  Users,
  Award,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Send,
  Building,
  Compass,
  ArrowRight,
  LogIn,
  School as SchoolIcon,
  ShieldCheck,
  LayoutDashboard,
  Edit3,
  DollarSign,
  Printer,
  CreditCard,
  Smartphone,
  Check,
  Download,
} from 'lucide-react';

interface PublicWebsiteProps {
  onEnterPortal: (role?: UserRole) => void;
  onOpenCMS?: () => void;
}

type FeeTierCategory = 'EARLY_YEARS' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR_SECONDARY';

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({ onEnterPortal, onOpenCMS }) => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [content, setContent] = useState<WebsiteContent>(DEFAULT_WEBSITE_CONTENT);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(() =>
    DEFAULT_CBC_FEE_STRUCTURES.map((f) => ({
      ...f,
      schoolId: 'glc-main',
      createdAt: '2026-01-01T00:00:00.000Z',
    }))
  );
  const [selectedFeeCategory, setSelectedFeeCategory] = useState<FeeTierCategory>('LOWER_PRIMARY');
  const [isFeePrintModalOpen, setIsFeePrintModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole>('SCHOOL_ADMIN');

  // Slideshow State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Online Admission Modal
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [appForm, setAppForm] = useState({
    studentFullName: '',
    gender: 'FEMALE' as 'MALE' | 'FEMALE',
    dateOfBirth: '2020-04-15',
    desiredClass: 'Grade 1' as GradeLevel,
    birthCertNumber: '',
    assessmentOrKemis: '',
    upiOrNemis: '',
    parentFullName: '',
    parentPhone: '',
    parentEmail: '',
    residentialAddress: 'Kasarani Mwiki, Nairobi',
    previousSchool: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadContent();

    // Listen to live CMS updates from CMS editor or other windows
    const handleCmsUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<WebsiteContent>;
      if (customEvt.detail) {
        setContent((prev) => ({
          ...prev,
          ...customEvt.detail,
          heroSlides: customEvt.detail.heroSlides || prev.heroSlides,
          facilities: customEvt.detail.facilities || prev.facilities,
          faqs: customEvt.detail.faqs || prev.faqs,
          typography: customEvt.detail.typography || prev.typography,
          logoUrl: customEvt.detail.logoUrl || prev.logoUrl,
        }));
      } else {
        loadContent();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('website_cms_')) {
        loadContent();
      }
    };

    window.addEventListener('website_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('website_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [school?.id, school?.updatedAt, school?.logoUrl]);

  const loadContent = async () => {
    try {
      const sid = school?.id || DEFAULT_SCHOOL_ID;
      const data = await operationsService.getWebsiteContent(sid);
      if (data) {
        setContent({
          ...DEFAULT_WEBSITE_CONTENT,
          ...data,
          heroSlides: data.heroSlides && data.heroSlides.length > 0 ? data.heroSlides : DEFAULT_WEBSITE_CONTENT.heroSlides,
          facilities: data.facilities && data.facilities.length > 0 ? data.facilities : DEFAULT_WEBSITE_CONTENT.facilities,
          faqs: data.faqs && data.faqs.length > 0 ? data.faqs : DEFAULT_WEBSITE_CONTENT.faqs,
          stats: {
            ...DEFAULT_WEBSITE_CONTENT.stats,
            ...(data.stats || {}),
          },
          typography: data.typography || DEFAULT_WEBSITE_CONTENT.typography,
          logoUrl: data.logoUrl || school?.logoUrl || DEFAULT_WEBSITE_CONTENT.logoUrl,
        });
      }
    } catch (e) {
      console.error('Error loading website content:', e);
    }
  };

  const activeSlides: HeroSlide[] =
    content?.heroSlides && content.heroSlides.length > 0
      ? content.heroSlides.filter((s) => s.isActive)
      : [
          {
            id: 'slide-1',
            title: content?.heroTitle || 'Inspiring Young Minds, Building Future Leaders',
            subtitle:
              content?.heroSubtitle ||
              'A Premier Kenyan Primary & Junior School from Playgroup to Grade 9, excelling in CBC Competency Curriculum, Holistic Talent, Coding & Character.',
            imageUrl:
              content?.heroBannerUrl ||
              'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
            badgeText: 'Leading CBC Competency-Based Education in Nairobi',
            buttonText: 'Enroll Your Child (2026 Intake)',
            buttonLink: 'admission',
            order: 1,
            isActive: true,
          },
        ];

  // Auto-advance slideshow timer
  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeSlides.length, isPaused]);

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const currentSlide = activeSlides[currentSlideIndex] || activeSlides[0];

  // Typography Resolvers
  const titleTypo: TypographyStyle = content?.typography?.heroTitle || {
    fontSize: '5xl',
    fontWeight: 'black',
    fontStyle: 'normal',
    textAlign: 'left',
    fontFamily: 'sans',
    textColor: '#ffffff',
  };

  const subtitleTypo: TypographyStyle = content?.typography?.heroSubtitle || {
    fontSize: 'lg',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fontFamily: 'sans',
    textColor: '#cbd5e1',
  };

  const getFontSizeClass = (size?: string) => {
    switch (size) {
      case 'sm':
        return 'text-sm sm:text-base';
      case 'base':
        return 'text-base sm:text-lg';
      case 'lg':
        return 'text-lg sm:text-xl';
      case 'xl':
        return 'text-xl sm:text-2xl';
      case '2xl':
        return 'text-2xl sm:text-3xl';
      case '3xl':
        return 'text-3xl sm:text-4xl';
      case '4xl':
        return 'text-4xl sm:text-5xl';
      case '5xl':
        return 'text-3xl sm:text-5xl lg:text-6xl';
      case '6xl':
        return 'text-4xl sm:text-6xl lg:text-7xl';
      default:
        return 'text-3xl sm:text-5xl';
    }
  };

  const getFontWeightClass = (weight?: string) => {
    switch (weight) {
      case 'normal':
        return 'font-normal';
      case 'medium':
        return 'font-medium';
      case 'semibold':
        return 'font-semibold';
      case 'bold':
        return 'font-bold';
      case 'black':
        return 'font-black';
      default:
        return 'font-extrabold';
    }
  };

  const getFontFamilyClass = (fam?: string) => {
    switch (fam) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      default:
        return 'font-sans';
    }
  };

  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const sid = school?.id || DEFAULT_SCHOOL_ID;
      await operationsService.submitOnlineAdmission(sid, {
        studentFullName: appForm.studentFullName,
        gender: appForm.gender,
        dateOfBirth: appForm.dateOfBirth,
        desiredClass: appForm.desiredClass,
        birthCertNumber: appForm.birthCertNumber,
        assessmentOrKemis: appForm.assessmentOrKemis || appForm.upiOrNemis,
        upiOrNemis: appForm.assessmentOrKemis || appForm.upiOrNemis,
        parentFullName: appForm.parentFullName,
        parentPhone: appForm.parentPhone,
        parentEmail: appForm.parentEmail,
        residentialAddress: appForm.residentialAddress,
        previousSchool: appForm.previousSchool,
      });

      showToast(
        'Online admission application submitted! Our admissions office will contact you.',
        'success'
      );
      setIsAdmissionModalOpen(false);
      setAppForm({
        studentFullName: '',
        gender: 'FEMALE',
        dateOfBirth: '2020-04-15',
        desiredClass: 'Grade 1',
        birthCertNumber: '',
        assessmentOrKemis: '',
        upiOrNemis: '',
        parentFullName: '',
        parentPhone: '',
        parentEmail: '',
        residentialAddress: 'Kasarani Mwiki, Nairobi',
        previousSchool: '',
      });
    } catch (err: any) {
      showToast('Error submitting admission: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const schoolLogoUrl = content?.logoUrl || school?.logoUrl;

  // Filter Fee Structures by Selected Category
  const getCategoryStructures = () => {
    switch (selectedFeeCategory) {
      case 'EARLY_YEARS':
        return feeStructures.filter((f) => ['Playgroup', 'PP1', 'PP2'].includes(f.classLevel));
      case 'LOWER_PRIMARY':
        return feeStructures.filter((f) => ['Grade 1', 'Grade 2', 'Grade 3'].includes(f.classLevel));
      case 'UPPER_PRIMARY':
        return feeStructures.filter((f) => ['Grade 4', 'Grade 5', 'Grade 6'].includes(f.classLevel));
      case 'JUNIOR_SECONDARY':
        return feeStructures.filter((f) => ['Grade 7', 'Grade 8', 'Grade 9'].includes(f.classLevel));
      default:
        return feeStructures;
    }
  };

  const currentCategoryStructures = getCategoryStructures();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800 selection:bg-blue-900 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-blue-900 text-white text-[11px] font-semibold py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
            <span className="bg-amber-400 text-blue-950 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">
              {content.announcementTag || '2026 INTAKE'}
            </span>
            <span className="line-clamp-1 sm:line-clamp-none">
              {content.announcementText || 'Admissions Open for Playgroup to Grade 9 (Junior School) • CBC Competency Curriculum'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-blue-200 shrink-0">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {content.contactPhone || school?.phone || '+254 722 000 123'}
            </span>
            <span className="flex items-center gap-1 hidden md:inline-flex">
              <Mail className="w-3 h-3" /> {content.contactEmail || school?.email || 'admissions@gracialearningcentre.ac.ke'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header with Logo & Section Links */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[64px] sm:h-18 py-2.5 sm:py-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {schoolLogoUrl ? (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                <img
                  src={schoolLogoUrl}
                  alt={school?.name || 'School Crest'}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs tracking-wider shrink-0">
                {school?.code ? school.code.slice(0, 4) : 'GLCM'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-tight truncate">
                {school?.name || 'Gracia Learning Centre'}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                {school?.motto || 'Nurturing Potential, Inspiring Excellence'}
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-blue-900 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('facilities')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-blue-900 transition-colors cursor-pointer"
            >
              Facilities
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('fees')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-blue-900 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" /> Fee Structure
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-blue-900 transition-colors cursor-pointer"
            >
              FAQs
            </button>
          </nav>

          {/* Single Google Login Button / Portal Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAuthModalRole('SCHOOL_ADMIN');
                setIsAuthModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="Sign in with your registered Google Account or credentials"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="truncate max-w-[120px] sm:max-w-none">
                {user && user.email && user.id !== 'demo-admin-id'
                  ? user.fullName || user.email
                  : 'Portal Sign-In'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Slideshow - High Definition Crystal Clear Photo */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative bg-slate-900 text-white py-20 lg:py-32 overflow-hidden min-h-[560px] flex items-center"
      >
        {currentSlide?.imageUrl && (
          <div
            key={currentSlide.id}
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
            style={{ backgroundImage: `url(${currentSlide.imageUrl})` }}
          />
        )}

        {/* Subtle Bottom Scrim for Maximum Photo Visibility and High Contrast Typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

        {activeSlides.length > 1 && (
          <>
            <button
              onClick={handlePrevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer border border-white/25 shadow-xl"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer border border-white/25 shadow-xl"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full z-10">
          {/* Clean Floating Container (No Obstructive Dark Box) */}
          <div
            className={`max-w-3xl space-y-5 ${
              titleTypo.textAlign === 'center'
                ? 'mx-auto text-center'
                : titleTypo.textAlign === 'right'
                ? 'ml-auto text-right'
                : 'mr-auto text-left'
            }`}
          >
            <div
              className={`inline-flex items-center gap-2 bg-slate-900/60 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/30 text-xs font-semibold shadow-lg ${
                titleTypo.textAlign === 'center' ? 'mx-auto' : ''
              }`}
              style={{ color: content?.typography?.heroBadge?.textColor || '#93c5fd' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="drop-shadow-sm">{currentSlide?.badgeText || 'Leading CBC Competency-Based Education in Nairobi'}</span>
            </div>

            <h2
              className={`tracking-tight leading-tight transition-all duration-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] ${getFontSizeClass(
                titleTypo.fontSize
              )} ${getFontWeightClass(titleTypo.fontWeight)} ${getFontFamilyClass(titleTypo.fontFamily)} ${
                titleTypo.fontStyle === 'italic' ? 'italic' : ''
              }`}
              style={{
                color: titleTypo.textColor || '#ffffff',
                textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
              }}
            >
              {currentSlide?.title || 'Inspiring Young Minds, Building Future Leaders'}
            </h2>

            <p
              className={`leading-relaxed max-w-2xl transition-all duration-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] ${getFontSizeClass(
                subtitleTypo.fontSize
              )} ${getFontWeightClass(subtitleTypo.fontWeight)} ${getFontFamilyClass(
                subtitleTypo.fontFamily
              )} ${subtitleTypo.fontStyle === 'italic' ? 'italic' : ''} ${
                titleTypo.textAlign === 'center' ? 'mx-auto' : ''
              }`}
              style={{
                color: subtitleTypo.textColor || '#f1f5f9',
                textShadow: '0 1px 8px rgba(0,0,0,0.85)',
              }}
            >
              {currentSlide?.subtitle ||
                'A Premier Kenyan Primary & Junior School from Playgroup to Grade 9, excelling in CBC Competency Curriculum, Holistic Talent, Coding & Character.'}
            </p>

            <div
              className={`flex flex-wrap gap-3 pt-2 ${
                titleTypo.textAlign === 'center'
                  ? 'justify-center'
                  : titleTypo.textAlign === 'right'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  if (currentSlide?.buttonLink === 'facilities') {
                    document.getElementById('facilities')?.scrollIntoView({ behavior: 'smooth' });
                  } else if (currentSlide?.buttonLink === 'fees') {
                    document.getElementById('fees')?.scrollIntoView({ behavior: 'smooth' });
                  } else if (currentSlide?.buttonLink === 'about') {
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setIsAdmissionModalOpen(true);
                  }
                }}
                icon={<ArrowRight className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl cursor-pointer"
              >
                {currentSlide?.buttonText || 'Enroll Your Child (2026 Intake)'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('fees')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/85 text-white font-bold text-sm border border-white/30 transition-colors inline-flex items-center gap-2 backdrop-blur-xs shadow-xl cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-amber-400" /> View 2026 Fee Structure
              </button>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('facilities')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-3 rounded-xl bg-white/95 hover:bg-white text-slate-900 font-bold text-sm transition-colors inline-flex items-center gap-2 backdrop-blur-xs shadow-xl cursor-pointer border border-white/40"
              >
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Explore Campus</span>
              </button>
            </div>

            {activeSlides.length > 1 && (
              <div
                className={`flex items-center gap-2 pt-4 ${
                  titleTypo.textAlign === 'center'
                    ? 'justify-center'
                    : titleTypo.textAlign === 'right'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                {activeSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlideIndex(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === currentSlideIndex ? 'w-8 bg-emerald-500 shadow-sm' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Highlights / Stats */}
      <section className="py-12 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl font-black text-blue-900 font-mono">
                {content?.stats?.studentsCount || 680}+
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                Enrolled Learners
              </div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-black text-blue-900 font-mono">100%</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                CBC Assessment Pass
              </div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-black text-blue-900 font-mono">
                {content?.stats?.teachersCount || 42}+
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                TSC Teachers
              </div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-black text-blue-900 font-mono">
                {content?.stats?.yearsOfExcellence || 18} Yrs
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                Academic Heritage
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Facilities & Academics */}
      <section id="facilities" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="primary" size="md">
              CAMPUS EXCELLENCE
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              World-Class Facilities for 21st-Century Learning
            </h3>
            <p className="text-xs text-slate-500">
              Modern CBC science discovery laboratories, heated swimming pool, robotics studio, and multimedia library.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(content?.facilities || []).map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between bg-white"
              >
                {f.imageUrl && (
                  <img
                    src={f.imageUrl}
                    alt={f.title}
                    className="h-44 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{f.title}</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW INTERACTIVE FEE STRUCTURE SECTION */}
      <section id="fees" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="primary" size="md">
                2026 OFFICIAL FEE SCHEDULE
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Transparent Kenyan CBC Fee Structure
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                All-inclusive termly fees covering full CBC tuition, continuous assessment portfolios, nutritious hot lunch, digital coding labs, and co-curricular activities.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                icon={<Printer className="w-4 h-4 text-amber-400" />}
                onClick={() => setIsFeePrintModalOpen(true)}
                className="text-white border-slate-700 hover:bg-slate-800 font-bold"
              >
                Print Fee Schedule
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsAdmissionModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                Apply for Admission
              </Button>
            </div>
          </div>

          {/* Grade Tier Category Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 max-w-3xl">
            <button
              onClick={() => setSelectedFeeCategory('EARLY_YEARS')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedFeeCategory === 'EARLY_YEARS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Early Years (PP1 - PP2)
            </button>
            <button
              onClick={() => setSelectedFeeCategory('LOWER_PRIMARY')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedFeeCategory === 'LOWER_PRIMARY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Lower Primary (Grades 1-3)
            </button>
            <button
              onClick={() => setSelectedFeeCategory('UPPER_PRIMARY')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedFeeCategory === 'UPPER_PRIMARY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Upper Primary (Grades 4-6)
            </button>
            <button
              onClick={() => setSelectedFeeCategory('JUNIOR_SECONDARY')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedFeeCategory === 'JUNIOR_SECONDARY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Junior School (Grades 7-9)
            </button>
          </div>

          {/* Cards for the selected Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentCategoryStructures.map((fs) => (
              <div
                key={fs.id}
                className="bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 flex flex-col justify-between shadow-lg hover:border-blue-500/60 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                    <div>
                      <h4 className="text-xl font-black text-white">{fs.classLevel}</h4>
                      <span className="text-[11px] text-blue-300 font-medium">{fs.term} • Academic Year 2026</span>
                    </div>
                    <Badge variant="primary" size="sm">
                      CBC Standard
                    </Badge>
                  </div>

                  <div className="py-2">
                    <span className="text-xs text-slate-400 block font-medium">Total Termly Fee</span>
                    <div className="text-3xl font-black text-amber-400 font-mono mt-0.5">
                      {school?.currencySymbol || 'KSh'} {fs.totalAmount.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">Includes Tuition, Meals & Activities</span>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-2 border-t border-slate-700/60 pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Itemized Cost Breakdown
                    </span>
                    <div className="space-y-2 text-xs">
                      {fs.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {item.name}
                          </span>
                          <span className="font-bold text-white">
                            {school?.currencySymbol || 'KSh'} {item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-700">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-500 font-bold justify-center"
                    onClick={() => setIsAdmissionModalOpen(true)}
                  >
                    Apply for {fs.classLevel}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Channels Advisory Banner */}
          <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <h5 className="font-bold text-sm text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" /> M-Pesa Paybill
              </h5>
              <p className="text-xs text-slate-400">
                Business No: <strong className="text-emerald-400 font-mono text-sm">{content.mpesaPaybill || school?.paymentSettings?.mpesaPaybillNumber || '522522'}</strong>
              </p>
              <p className="text-xs text-slate-400">Account No: <strong>Student Admission No.</strong></p>
            </div>
            <div className="space-y-1">
              <h5 className="font-bold text-sm text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" /> Direct Bank Deposit
              </h5>
              <p className="text-xs text-slate-400">{content.bankDetails || 'Equity Bank Kenya • Nyahururu Branch'}</p>
              <p className="text-xs text-slate-400">Official School Account for Tuition & Fees</p>
            </div>
            <div className="space-y-1">
              <h5 className="font-bold text-sm text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" /> Flexible Term Installments
              </h5>
              <p className="text-xs text-slate-400">Up to 3 flexible monthly installments permitted upon agreement with the finance bursar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional About, Mission & Headteacher Welcome Section */}
      <section id="about" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          {/* Top Intro Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="primary" size="md">
              ABOUT OUR INSTITUTION
            </Badge>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Nurturing Excellence, Character & Future Leadership
            </h3>
            {content?.aboutIntro && (
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
                {content.aboutIntro}
              </p>
            )}
          </div>

          {/* Mission & Vision Cards */}
          {(content?.mission || content?.vision) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.mission && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-lg text-slate-900">Our Mission</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{content.mission}</p>
                </div>
              )}

              {content.vision && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-lg text-slate-900">Our Vision</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{content.vision}</p>
                </div>
              )}
            </div>
          )}

          {/* Headteacher Welcome Card */}
          {content?.principalMessage && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {content.principalPhotoUrl && (
                <div className="flex justify-center">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-md border-4 border-white">
                    <img
                      src={content.principalPhotoUrl}
                      alt={content.principalName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
              <div className={content.principalPhotoUrl ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
                <Badge variant="primary" size="sm">
                  HEADTEACHER&apos;S WELCOME
                </Badge>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Welcome to {school?.name || 'Gracia Learning Centre'}
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  &ldquo;{content.principalMessage}&rdquo;
                </p>
                <div className="pt-2">
                  <div className="font-bold text-slate-900 text-sm">{content.principalName}</div>
                  <div className="text-xs text-slate-500 font-medium">Headteacher & Principal Administrator</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className="py-16 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="primary" size="md">
              FREQUENTLY ASKED QUESTIONS
            </Badge>
            <h3 className="text-2xl font-black text-slate-900">Everything Parents Need to Know</h3>
          </div>

          <div className="space-y-4">
            {(content?.faqs || []).map((faq, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <h4 className="font-bold text-sm text-slate-900">{faq.question}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer with School Logo */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {schoolLogoUrl && (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={schoolLogoUrl}
                  alt={school?.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div>
              <span className="font-black text-sm text-white block">
                {school?.name || 'Gracia Learning Centre'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Registered with the Kenya Ministry of Education • Playgroup to Grade 9 CBC
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <button
              type="button"
              onClick={() => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer font-semibold text-slate-400 transition-colors"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('facilities')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer font-semibold text-slate-400 transition-colors"
            >
              Facilities
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('fees')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer font-semibold text-slate-400 transition-colors"
            >
              Fee Schedule
            </button>
            <button
              type="button"
              onClick={() => setIsAdmissionModalOpen(true)}
              className="hover:text-white cursor-pointer font-semibold text-slate-400 transition-colors"
            >
              Admissions
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer font-semibold text-slate-400 transition-colors"
            >
              FAQs
            </button>
          </div>
        </div>
      </footer>

      {/* Full Fee Structure Printable Schedule Modal */}
      <Modal
        isOpen={isFeePrintModalOpen}
        onClose={() => setIsFeePrintModalOpen(false)}
        title="Official 2026 Academic Fee Structure Schedule"
        subtitle={`${school?.name || 'Gracia Learning Centre'} • Playgroup to Grade 9`}
        maxWidth="3xl"
      >
        <div className="space-y-6 text-slate-800 text-xs p-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div>
              <h4 className="font-black text-slate-900 text-sm">Competency-Based Curriculum (CBC) Fee Schedule</h4>
              <p className="text-slate-500 text-[11px]">Valid for Academic Year 2026 (Terms 1, 2, and 3)</p>
            </div>
            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              Print Schedule
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="p-3">Grade Level</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Key Inclusions</th>
                  <th className="p-3 text-right">Term Fee ({school?.currencySymbol || 'KSh'})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeStructures.map((fs) => (
                  <tr key={fs.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{fs.classLevel}</td>
                    <td className="p-3 text-slate-600">
                      {['Playgroup', 'PP1', 'PP2'].includes(fs.classLevel)
                        ? 'Early Years'
                        : ['Grade 1', 'Grade 2', 'Grade 3'].includes(fs.classLevel)
                        ? 'Lower Primary'
                        : ['Grade 4', 'Grade 5', 'Grade 6'].includes(fs.classLevel)
                        ? 'Upper Primary'
                        : 'Junior School'}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {fs.items.map((i) => i.name).slice(0, 3).join(', ')}...
                    </td>
                    <td className="p-3 font-black text-slate-900 text-right">
                      {fs.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <p><strong>Note:</strong> Optional transport door-to-door service is billed per zone (KSh 8,000 - 15,000/term).</p>
            <p>School uniform starter pack is purchased upon initial admission at the school uniform store.</p>
          </div>
        </div>
      </Modal>

      {/* Online Admission Application Modal */}
      <Modal
        isOpen={isAdmissionModalOpen}
        onClose={() => setIsAdmissionModalOpen(false)}
        title="Online Admission Application (Academic Year 2026)"
        maxWidth="md"
      >
        <form onSubmit={handleAdmissionSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Learner Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Maya Wanjiru Kamau"
              value={appForm.studentFullName}
              onChange={(e) => setAppForm({ ...appForm, studentFullName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Gender</label>
              <select
                value={appForm.gender}
                onChange={(e) => setAppForm({ ...appForm, gender: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Date of Birth *</label>
              <input
                type="date"
                required
                value={appForm.dateOfBirth}
                onChange={(e) => setAppForm({ ...appForm, dateOfBirth: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Birth Certificate No.</label>
              <input
                type="text"
                placeholder="e.g. BC-123456"
                value={appForm.birthCertNumber}
                onChange={(e) => setAppForm({ ...appForm, birthCertNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Assessment Number or KEMIS</label>
              <input
                type="text"
                placeholder="e.g. Assessment No. or KEMIS No."
                value={appForm.upiOrNemis}
                onChange={(e) => setAppForm({ ...appForm, upiOrNemis: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Applying for Class *</label>
            <select
              value={appForm.desiredClass}
              onChange={(e) => setAppForm({ ...appForm, desiredClass: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
            >
              <option value="Playgroup">Playgroup (Age 2-3)</option>
              <option value="PP1">PP1 (Pre-Primary 1)</option>
              <option value="PP2">PP2 (Pre-Primary 2)</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7 (Junior School)</option>
              <option value="Grade 8">Grade 8 (Junior School)</option>
              <option value="Grade 9">Grade 9 (Junior School)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Parent / Guardian Name *</label>
              <input
                type="text"
                required
                value={appForm.parentFullName}
                onChange={(e) => setAppForm({ ...appForm, parentFullName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Parent Phone No. *</label>
              <input
                type="tel"
                required
                placeholder="+254 7..."
                value={appForm.parentPhone}
                onChange={(e) => setAppForm({ ...appForm, parentPhone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Parent Email Address *</label>
              <input
                type="email"
                required
                value={appForm.parentEmail}
                onChange={(e) => setAppForm({ ...appForm, parentEmail: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Residential Area / Estate</label>
              <input
                type="text"
                placeholder="e.g. Kasarani Mwiki"
                value={appForm.residentialAddress}
                onChange={(e) => setAppForm({ ...appForm, residentialAddress: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAdmissionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Google Account & Portal Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole={authModalRole}
        onSuccess={(role) => onEnterPortal(role)}
      />

    </div>
  );
};
